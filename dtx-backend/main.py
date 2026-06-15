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

class AnalyzeRequest(BaseModel):
    patient_id: str = None
    history: List[dict] = None
    assessment: dict = None

@app.post("/api/analyze")
def analyze_data(req: AnalyzeRequest, db: Session = Depends(get_db)):
    patient_id = req.patient_id
    history = req.history
    profile = None
    
    if patient_id:
        db_profile = db.query(models.PatientProfile).filter(models.PatientProfile.patient_id == patient_id).first()
        if db_profile:
            profile = {
                "name": db_profile.name,
                "age": db_profile.age,
                "gender": db_profile.gender,
                "presentation": db_profile.presentation,
                "severity": db_profile.severity
            }
        else:
            with lock:
                profile = DOCTOR_CONFIGS.get(patient_id)
        
        if not history:
            db_logs = db.query(models.TrialLog).filter(models.TrialLog.patient_id == patient_id).all()
            history = [
                {
                    "patient_id": log.patient_id,
                    "timestamp": log.timestamp,
                    "target_type": log.target_type,
                    "reaction_time_ms": log.reaction_time_ms,
                    "is_correct": log.is_correct
                }
                for log in db_logs
            ]
            
    total = len(history) if history else 0
    correct = sum(1 for h in history if h.get("is_correct")) if history else 0
    accuracy = (correct / total * 100) if total > 0 else 0
    
    clicked = [h.get("reaction_time_ms") for h in history if h.get("reaction_time_ms", 0) > 0] if history else []
    avg_rt = (sum(clicked) / len(clicked)) if clicked else 0
    
    severity = profile.get("severity", "Moderate") if profile else "Moderate"
    presentation = profile.get("presentation", "Combined") if profile else "Combined"
    name = profile.get("name", "Patient") if profile else "Patient"
    
    # Compute comparison
    comparison_text = "This is your first completed session. Keep practicing to see how your response control and speed compare over time!"
    if total >= 40:
        session_size = 60 if total >= 120 else (total // 2)
        baseline_part = history[:-session_size]
        current_part = history[-session_size:]
        
        base_total = len(baseline_part)
        base_correct = sum(1 for h in baseline_part if h.get("is_correct"))
        base_acc = (base_correct / base_total * 100) if base_total > 0 else 0
        base_clicked = [h.get("reaction_time_ms") for h in baseline_part if h.get("reaction_time_ms", 0) > 0]
        base_rt = (sum(base_clicked) / len(base_clicked)) if base_clicked else 0
        
        curr_total = len(current_part)
        curr_correct = sum(1 for h in current_part if h.get("is_correct"))
        curr_acc = (curr_correct / curr_total * 100) if curr_total > 0 else 0
        curr_clicked = [h.get("reaction_time_ms") for h in current_part if h.get("reaction_time_ms", 0) > 0]
        curr_rt = (sum(curr_clicked) / len(curr_clicked)) if curr_clicked else 0
        
        rt_diff = curr_rt - base_rt
        acc_diff = curr_acc - base_acc
        
        rt_msg = ""
        if rt_diff < -15:
            rt_msg = f"Your processing speed improved (you reacted {abs(rt_diff):.0f} ms faster than before)."
        elif rt_diff > 15:
            rt_msg = f"Your average reaction time was {rt_diff:.0f} ms slower, suggesting fatigue or pacing adjustments."
        else:
            rt_msg = "Your processing speed remained consistent with previous attempts."
            
        acc_msg = ""
        if acc_diff > 3:
            acc_msg = f"Your accuracy rate increased by {acc_diff:.1f}% (showing stronger response inhibition)."
        elif acc_diff < -3:
            acc_msg = f"Your accuracy rate decreased by {abs(acc_diff):.1f}%, indicating minor focus lapses."
        else:
            acc_msg = "Your accuracy was stable."
            
        comparison_text = f"{rt_msg} {acc_msg}"

    # Multi-game analysis
    classic_history = [h for h in history if h.get("target_type", "").startswith("CLASSIC_")]
    incongruent_history = [h for h in history if h.get("target_type", "").startswith("INCONGRUENT_")]
    shape_history = [h for h in history if h.get("target_type", "").startswith("SHAPE_COUNT_")]

    def get_stats(sub_history):
        sub_total = len(sub_history)
        sub_correct = sum(1 for h in sub_history if h.get("is_correct"))
        sub_acc = (sub_correct / sub_total * 100) if sub_total > 0 else 0
        sub_clicked = [h.get("reaction_time_ms") for h in sub_history if h.get("reaction_time_ms", 0) > 0]
        sub_rt = (sum(sub_clicked) / len(sub_clicked)) if sub_clicked else 0
        return sub_total, sub_acc, sub_rt

    classic_total, classic_acc, classic_rt = get_stats(classic_history)
    incongruent_total, incongruent_acc, incongruent_rt = get_stats(incongruent_history)
    shape_total, shape_acc, shape_rt = get_stats(shape_history)

    modes = []
    if classic_total >= 3:
        modes.append(("CLASSIC", classic_acc, classic_rt, "Color Go/No-Go", "Sustained Attention"))
    if incongruent_total >= 3:
        modes.append(("INCONGRUENT", incongruent_acc, incongruent_rt, "Cognitive Flexibility", "Reverse Conflict"))
    if shape_total >= 3:
        modes.append(("SHAPE_COUNT", shape_acc, shape_rt, "Quantity Subitizing", "Response Inhibition"))

    best_training = "Color Go/No-Go (Sustained Attention)"
    reasoning = "This module is recommended to establish your baseline focus and response consistency."

    if modes:
        modes_sorted = sorted(modes, key=lambda x: (x[1], -x[2]))
        worst_mode = modes_sorted[0]
        
        if worst_mode[0] == "CLASSIC":
            best_training = "Color Go/No-Go (Sustained Attention)"
            reasoning = f"The patient demonstrates their lowest accuracy ({classic_acc:.1f}%) in basic Sustained Attention (Color Go/No-Go), indicating a fundamental difficulty in maintaining alert readiness. We recommend starting with this module to stabilize their core executive baseline."
        elif worst_mode[0] == "INCONGRUENT":
            best_training = "Cognitive Flexibility (Reverse Conflict)"
            reasoning = f"The patient shows an accuracy drop ({incongruent_acc:.1f}%) and processing delay ({incongruent_rt:.0f} ms) under rule-switching conditions in Incongruent Mode. This bottleneck in overriding instinctual choices suggests a priority for flexibility training."
        else: # SHAPE_COUNT
            best_training = "Quantity Subitizing (Response Inhibition)"
            reasoning = f"The patient exhibits their lowest performance accuracy ({shape_acc:.1f}%) in Subitizing & Response Inhibition. This is associated with high impulse error rates. Focused training on this module will enhance behavioral inhibition."

    c_rt_str = f"{classic_rt:.0f} ms" if classic_total > 0 else "N/A"
    i_rt_str = f"{incongruent_rt:.0f} ms" if incongruent_total > 0 else "N/A"
    s_rt_str = f"{shape_rt:.0f} ms" if shape_total > 0 else "N/A"

    summary = (
        f"Comprehensive Patient Neuropsychology Report for {name} (ADHD Presentation: {presentation}, Severity: {severity}):\n\n"
        f"• Phase 1 (Color Go/No-Go): Completed {classic_total} trials with {classic_acc:.1f}% accuracy and average reaction time of {c_rt_str}.\n"
        f"• Phase 2 (Cognitive Flexibility): Completed {incongruent_total} trials with {incongruent_acc:.1f}% accuracy and average reaction time of {i_rt_str}.\n"
        f"• Phase 3 (Quantity Subitizing): Completed {shape_total} trials with {shape_acc:.1f}% accuracy and average reaction time of {s_rt_str}.\n\n"
        f"Clinical Diagnosis: Based on multi-game tracking, the patient's primary cognitive challenge is in the domain of {worst_mode[4] if modes else 'Sustained Attention'}. "
        f"To target this bottleneck, the optimal intervention is {best_training}."
    )

    domain_focus = [
        {
            "domainName": "Behavioral Inhibition (Classic)",
            "scoreExplanation": f"Baseline Color Go/No-Go accuracy is {classic_acc:.1f}%. Target is to sustain attention and limit impulse errors.",
            "improvementTarget": "Target accuracy > 90% in Wait trials."
        },
        {
            "domainName": "Cognitive Flexibility (Incongruent)",
            "scoreExplanation": f"Reverse conflict rule-switching accuracy is {incongruent_acc:.1f}%. Target is to improve switching efficiency under cognitive load.",
            "improvementTarget": "Reduce reaction time latency by 50ms in Incongruent mode."
        },
        {
            "domainName": "Processing Speed (Shape Count)",
            "scoreExplanation": f"Quantity Subitizing accuracy is {shape_acc:.1f}%. Target is to stabilize processing speed and motor control.",
            "improvementTarget": "Achieve stable reaction times between 400ms - 600ms."
        }
    ]
    
    exercises = [
        {
            "title": "Color Go/No-Go Titration",
            "description": "Rapid execution and motor inhibition task calibrated dynamically by the backend.",
            "clinicalRationale": "Strengthens prefrontal executive control and behavioral inhibition networks.",
            "frequency": "10 minutes / daily"
        },
        {
            "title": "Reverse Conflict Flexibility",
            "description": "Counter-intuitive visual-spatial stimulus mappings (monkey/elephant reverse click).",
            "clinicalRationale": "Engages the anterior cingulate cortex (ACC) to improve rule-switching cognitive agility.",
            "frequency": "5 minutes / daily"
        }
    ]
    
    lifestyle = [
        {
            "category": "Sleep Hygiene",
            "actionableStep": "Maintain a strict 8-hour sleep schedule with zero blue-light exposure 1 hour before bed.",
            "rationale": "Optimizes glymphatic clearance and restores prefrontal resource pools."
        },
        {
            "category": "Cognitive Pacing",
            "actionableStep": "Implement 25-minute study/work blocks followed by 5 minutes of visual rest (Pomodoro).",
            "rationale": "Prevents sustained-attention drift and cognitive exhaustion."
        }
    ]
    
    outlook = "With consistent adherence to the adaptive titration protocol and sleep hygiene recommendations, the patient's prefrontal executive control networks are expected to show significant plastic remodeling and stability within 4-6 weeks."
    
    return {
        "clinicianSummary": summary,
        "domainFocus": domain_focus,
        "therapeuticExercises": exercises,
        "lifestyleProtocols": lifestyle,
        "outlookPromising": outlook,
        "comparison": comparison_text,
        "bestTraining": best_training,
        "bestTrainingReason": reasoning,
        "stats": {
            "classic": {"total": classic_total, "acc": classic_acc, "rt": classic_rt},
            "incongruent": {"total": incongruent_total, "acc": incongruent_acc, "rt": incongruent_rt},
            "shape": {"total": shape_total, "acc": shape_acc, "rt": shape_rt}
        }
    }

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