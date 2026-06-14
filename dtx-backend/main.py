from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import models
from database import engine, SessionLocal
import threading

# 核心锁：保护内存字典并发写入一致性
lock = threading.Lock()

# 核心魔法：启动时自动连接 AWS，如果表不存在就自动创建！
models.Base.metadata.create_all(bind=engine)


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
)

class TrialData(BaseModel):
    patient_id: str
    timestamp: str
    target_type: str
    reaction_time_ms: float
    is_correct: bool

# ⭐ 新增：用于接收前端新建患者请求的结构体
class PatientCreate(BaseModel):
    patient_id: str
    name: str
    age: int
    gender: str
    presentation: str  # Inattentive, Hyperactive-Impulsive, Combined
    severity: str      # Mild, Moderate, Severe

# 依赖注入：每次有请求来，分配一个数据库连接
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ---------------------------------------------------------
# 🏥 敏捷开发与持久化：混合患者档案库
# ---------------------------------------------------------
DOCTOR_CONFIGS = {
    "patient_001": {
        "name": "张小明",
        "age": 8,
        "gender": "男",
        "presentation": "Combined",
        "severity": "Moderate",
        "daily_set": ["CLASSIC", "INCONGRUENT", "SHAPE_COUNT"] 
    },
    "patient_002": {
        "name": "莉莉",
        "age": 10,
        "gender": "女",
        "presentation": "Inattentive",
        "severity": "Mild",
        "daily_set": ["CLASSIC", "CLASSIC", "INCONGRUENT"]
    }
}

@app.on_event("startup")
def load_profiles_to_memory():
    """
    系统启动时从 AWS 数据库中提取所有患者个人属性，重新热加载到内存字典中
    """
    db = SessionLocal()
    try:
        profiles = db.query(models.PatientProfile).all()
        with lock:
            for p in profiles:
                # 决定频率：
                if p.presentation == "Inattentive":
                    daily_set = ["CLASSIC", "CLASSIC", "INCONGRUENT"]
                elif p.presentation == "Hyperactive-Impulsive":
                    daily_set = ["SHAPE_COUNT", "SHAPE_COUNT", "INCONGRUENT"]
                else:
                    daily_set = ["CLASSIC", "INCONGRUENT", "SHAPE_COUNT"]
                
                DOCTOR_CONFIGS[p.patient_id] = {
                    "name": p.name,
                    "age": p.age,
                    "gender": p.gender,
                    "presentation": p.presentation,
                    "severity": p.severity,
                    "daily_set": daily_set
                }
        print("✅ 成功热加载 AWS 数据库中的患者病历配置到内存中。")
    except Exception as e:
        print(f"⚠️ 启动加载患者档案到内存失败: {e}")
    finally:
        db.close()

@app.get("/api/patients", response_model=List[str])
def get_all_patient_ids(db: Session = Depends(get_db)):
    """
    获取全量患者名单：合并内存中的档案 + 数据库个人表 + 日志表里存留过的 ID（防止重启丢失）
    """
    db_patients = db.query(models.TrialLog.patient_id).distinct().all()
    db_patient_ids = [p[0] for p in db_patients]
    
    db_profiles = db.query(models.PatientProfile.patient_id).all()
    db_profile_ids = [p[0] for p in db_profiles]
    
    # 集合去重并排序，加锁读
    with lock:
        configs_keys = list(DOCTOR_CONFIGS.keys())
    all_patients = list(set(configs_keys + db_patient_ids + db_profile_ids))
    return sorted(all_patients)

@app.post("/api/patients")
def create_patient_profile(patient: PatientCreate, db: Session = Depends(get_db)):
    """
    创建新患者档案（写入 AWS 数据库 + 写入动态内存库，加锁保证原子性）
    """
    try:
        # 1. 物理插入 AWS 数据库中的 PatientProfile
        db_patient = db.query(models.PatientProfile).filter(models.PatientProfile.patient_id == patient.patient_id).first()
        if db_patient:
            raise HTTPException(status_code=400, detail="该患者 ID 已在云端档案库中存在。")
            
        with lock:
            if patient.patient_id in DOCTOR_CONFIGS:
                raise HTTPException(status_code=400, detail="该患者 ID 已在本地内存档案库中存在。")
            
            # 根据表现类型 (presentation) 自适应决定游戏序列出现的频率
            # 注意力不集中型：加强 Classic 持续反应测试频次
            # 多动/冲动型：加强 Shape Count 数量抑制测试频次
            # 混合型：均匀混合
            if patient.presentation == "Inattentive":
                daily_set = ["CLASSIC", "CLASSIC", "INCONGRUENT"]
            elif patient.presentation == "Hyperactive-Impulsive":
                daily_set = ["SHAPE_COUNT", "SHAPE_COUNT", "INCONGRUENT"]
            else:
                daily_set = ["CLASSIC", "INCONGRUENT", "SHAPE_COUNT"]
                
            # 写入内存
            DOCTOR_CONFIGS[patient.patient_id] = {
                "name": patient.name,
                "age": patient.age,
                "gender": patient.gender,
                "presentation": patient.presentation,
                "severity": patient.severity,
                "daily_set": daily_set
            }
        
        # 写入数据库
        new_profile = models.PatientProfile(
            patient_id=patient.patient_id,
            name=patient.name,
            age=patient.age,
            gender=patient.gender,
            presentation=patient.presentation,
            severity=patient.severity
        )
        db.add(new_profile)
        db.commit()
        return {"status": "success", "message": f"患者 [{patient.patient_id}] 档案初始化成功。"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/patients/{patient_id}")
def delete_patient_profile(patient_id: str, db: Session = Depends(get_db)):
    """
    注销患者档案：删除 AWS 数据轨迹 + 删除个人基本档案 + 移除内存配置
    """
    try:
        # 1. 物理清除 AWS 数据库中的日志和个人档案
        deleted_logs_count = db.query(models.TrialLog).filter(models.TrialLog.patient_id == patient_id).delete()
        deleted_profile_count = db.query(models.PatientProfile).filter(models.PatientProfile.patient_id == patient_id).delete()
        
        # 2. 从医生配置档案中移除 (持有锁保证线程安全)
        with lock:
            if patient_id in DOCTOR_CONFIGS:
                del DOCTOR_CONFIGS[patient_id]
                
        # 3. 提交物理事务
        db.commit()
        return {"status": "success", "message": f"患者 [{patient_id}] 档案已彻底注销，并同步销毁了 {deleted_logs_count} 条云端轨迹。"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# ---------------------------------------------------------
# 📊 核心业务接口：数据收发与清空
# ---------------------------------------------------------

@app.post("/api/log")
def log_trial(data: TrialData, db: Session = Depends(get_db)):
    """
    单个写入日志：非 async 以免同步数据库调用阻塞 asyncio 事件循环
    """
    db_log = models.TrialLog(
        patient_id=data.patient_id,
        timestamp=data.timestamp,
        target_type=data.target_type,
        reaction_time_ms=data.reaction_time_ms,
        is_correct=data.is_correct
    )
    
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    
    print(f"✅ 数据已写入 AWS 云端！患者 {data.patient_id} | 反应时间: {data.reaction_time_ms}ms")
    return {"status": "success", "message": "Data logged to AWS Aurora"}

@app.post("/api/logs")
def log_trials_bulk(data: List[TrialData], db: Session = Depends(get_db)):
    """
    批量写入日志：在单个数据库事务中将数组一次性存入以提升吞吐率与安全性
    """
    try:
        db_logs = [
            models.TrialLog(
                patient_id=item.patient_id,
                timestamp=item.timestamp,
                target_type=item.target_type,
                reaction_time_ms=item.reaction_time_ms,
                is_correct=item.is_correct
            )
            for item in data
        ]
        db.add_all(db_logs)
        db.commit()
        print(f"✅ 批量数据已写入 AWS 云端！共 {len(data)} 条记录")
        return {"status": "success", "message": f"Successfully logged {len(data)} trials in bulk"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/patients/{patient_id}/stats")
def get_patient_stats(patient_id: str, db: Session = Depends(get_db)):
    records = db.query(models.TrialLog).filter(
        models.TrialLog.patient_id == patient_id
    ).all()
    return records

@app.get("/api/patients/{patient_id}/ai-config")
def get_patient_ai_config(patient_id: str):
    with lock:
        config = DOCTOR_CONFIGS.get(patient_id, {
            "name": "未知",
            "age": 9,
            "gender": "未知",
            "presentation": "Combined",
            "severity": "Moderate",
            "daily_set": ["CLASSIC", "INCONGRUENT", "SHAPE_COUNT"]
        })
    severity = config.get("severity", "Moderate")
    
    # 根据轻度到重度，给出不同的出现间隔 (trial_interval_range)、判断容错时间 (stimulus_duration) 以及容错上限 (max_errors)
    if severity == "Mild":
        stimulus_duration = 1500  # 反应时间限制较紧凑 (要求敏捷)
        trial_interval_range = [1000, 3000] # 出现间隔较快
        max_errors = 7 # 轻症容错较宽松
        nogo_probability = 0.4
    elif severity == "Severe":
        stimulus_duration = 2500  # 反应时间限制较宽，给予重度患者充足缓冲
        trial_interval_range = [2000, 6000] # 出现间隔较长，防止频率过高引发焦虑
        max_errors = 3 # 重症容错从严，漏点或失误超过3次即熔断
        nogo_probability = 0.2
    else: # Moderate
        stimulus_duration = 2000
        trial_interval_range = [1500, 4500]
        max_errors = 5
        nogo_probability = 0.3
        
    return {
        "patient_id": patient_id,
        "name": config.get("name", "未名"),
        "age": config.get("age", 9),
        "gender": config.get("gender", "未知"),
        "presentation": config.get("presentation", "Combined"),
        "severity": severity,
        "game_sequence": config.get("daily_set", ["CLASSIC", "INCONGRUENT", "SHAPE_COUNT"]), 
        "initial_stimulus_duration": stimulus_duration,
        "initial_nogo_probability": nogo_probability,
        "trial_interval_range": trial_interval_range,
        "max_errors": max_errors
    }

@app.delete("/api/patients/{patient_id}/reset")
def reset_patient_data(patient_id: str, db: Session = Depends(get_db)):
    """
    保留档案，但清空该患者的 AWS 测试轨迹
    """
    try:
        # ⭐ 修复点：添加了 models. 前缀，防止报错
        deleted_count = db.query(models.TrialLog).filter(models.TrialLog.patient_id == patient_id).delete()
        db.commit()
        return {"status": "success", "message": f"已成功清除患者 [{patient_id}] 的 {deleted_count} 条云端测试轨迹。"}
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}