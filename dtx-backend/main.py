from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import models
from database import engine, SessionLocal

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
    severity: str = "Medium"

# 依赖注入：每次有请求来，分配一个数据库连接
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ---------------------------------------------------------
# 🏥 敏捷开发：内存级动态患者档案库
# ---------------------------------------------------------
DOCTOR_CONFIGS = {
    "patient_001": {
        "severity": "Moderate",
        "daily_set": ["CLASSIC", "INCONGRUENT", "SHAPE_COUNT"] 
    }
}

@app.get("/api/patients", response_model=List[str])
def get_all_patient_ids(db: Session = Depends(get_db)):
    """
    获取全量患者名单：合并内存中的档案 + 数据库里存留过的 ID（防止重启丢失）
    """
    db_patients = db.query(models.TrialLog.patient_id).distinct().all()
    db_patient_ids = [p[0] for p in db_patients]
    
    # 集合去重并排序
    all_patients = list(set(list(DOCTOR_CONFIGS.keys()) + db_patient_ids))
    return sorted(all_patients)

@app.post("/api/patients")
def create_patient_profile(patient: PatientCreate):
    """
    创建新患者档案（写入动态内存库）
    """
    if patient.patient_id in DOCTOR_CONFIGS:
        raise HTTPException(status_code=400, detail="该患者 ID 已存在，请勿重复创建。")
    
    # 初始化患者的专属处方配置
    DOCTOR_CONFIGS[patient.patient_id] = {
        "severity": patient.severity,
        "daily_set": ["CLASSIC", "INCONGRUENT", "SHAPE_COUNT"]
    }
    return {"status": "success", "message": f"患者 [{patient.patient_id}] 档案初始化成功。"}

@app.delete("/api/patients/{patient_id}")
def delete_patient_profile(patient_id: str, db: Session = Depends(get_db)):
    """
    注销患者档案：删除 AWS 数据轨迹 + 移除内存配置
    """
    try:
        # 1. 物理清除 AWS 数据库中的日志
        deleted_count = db.query(models.TrialLog).filter(models.TrialLog.patient_id == patient_id).delete()
        db.commit()
        
        # 2. 从医生配置档案中移除
        if patient_id in DOCTOR_CONFIGS:
            del DOCTOR_CONFIGS[patient_id]
            
        return {"status": "success", "message": f"患者 [{patient_id}] 档案已彻底注销，并同步销毁了 {deleted_count} 条云端轨迹。"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# ---------------------------------------------------------
# 📊 核心业务接口：数据收发与清空
# ---------------------------------------------------------

@app.post("/api/log")
async def log_trial(data: TrialData, db: Session = Depends(get_db)):
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

@app.get("/api/patients/{patient_id}/stats")
def get_patient_stats(patient_id: str, db: Session = Depends(get_db)):
    records = db.query(models.TrialLog).filter(
        models.TrialLog.patient_id == patient_id
    ).all()
    return records

@app.get("/api/patients/{patient_id}/ai-config")
def get_patient_ai_config(patient_id: str):
    config = DOCTOR_CONFIGS.get(patient_id, {"severity": "Moderate", "daily_set": ["CLASSIC", "INCONGRUENT", "SHAPE_COUNT"]})
    severity = config["severity"]
    
    if severity == "Mild":
        stimulus_duration = 1000  
        nogo_probability = 0.4    
    elif severity == "Severe":
        stimulus_duration = 1600  
        nogo_probability = 0.2    
    else: 
        stimulus_duration = 1300  
        nogo_probability = 0.3
        
    return {
        "patient_id": patient_id,
        "severity": severity,
        "game_sequence": config["daily_set"], 
        "initial_stimulus_duration": stimulus_duration,
        "initial_nogo_probability": nogo_probability
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