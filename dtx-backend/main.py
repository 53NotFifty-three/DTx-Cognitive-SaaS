from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
import models
from database import engine, SessionLocal
import threading
import os
import json
import google.generativeai as genai

# Load local .env if exists
if os.path.exists(".env"):
    try:
        with open(".env") as f:
            for line in f:
                if "=" in line and not line.strip().startswith("#"):
                    k, v = line.strip().split("=", 1)
                    os.environ[k.strip()] = v.strip()
    except Exception as e:
        print(f"⚠️ Error reading local .env: {e}")

# Setup Gemini API key
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# 核心锁：保护内存字典并发写入一致性
lock = threading.Lock()

# 核心魔法：启动时自动连接 AWS，如果表不存在就自动创建！
models.Base.metadata.create_all(bind=engine)

# 动态迁移数据库表（使 patient_reports 支持 composite primary key）
try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE patient_reports DROP CONSTRAINT IF EXISTS patient_reports_pkey CASCADE;"))
        conn.execute(text("ALTER TABLE patient_reports ADD PRIMARY KEY (patient_id, lang);"))
        conn.commit()
    print("✅ Successfully verified composite primary key for patient_reports.")
except Exception as e:
    print(f"ℹ️ Migration notice (can ignore if already migrated or SQLite fallback): {e}")


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
        
        # Calculate baseline config parameters based on severity
        if patient.severity == "Mild":
            stimulus_duration = 1500
            trial_interval_min = 1000
            trial_interval_max = 3000
            max_errors = 7
            nogo_probability = 0.4
        elif patient.severity == "Severe":
            stimulus_duration = 2500
            trial_interval_min = 2000
            trial_interval_max = 6000
            max_errors = 3
            nogo_probability = 0.2
        else:  # Moderate
            stimulus_duration = 2000
            trial_interval_min = 1500
            trial_interval_max = 4500
            max_errors = 5
            nogo_probability = 0.3

        if patient.presentation == "Inattentive":
            daily_set = "CLASSIC,CLASSIC,INCONGRUENT"
        elif patient.presentation == "Hyperactive-Impulsive":
            daily_set = "SHAPE_COUNT,SHAPE_COUNT,INCONGRUENT"
        else:
            daily_set = "CLASSIC,INCONGRUENT,SHAPE_COUNT"

        new_config = models.AdaptiveGameConfig(
            patient_id=patient.patient_id,
            game_sequence=daily_set,
            stimulus_duration=stimulus_duration,
            nogo_probability=nogo_probability,
            trial_interval_min=trial_interval_min,
            trial_interval_max=trial_interval_max,
            max_errors=max_errors
        )
        db.add(new_config)
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
        # 1. 物理清除 AWS 数据库中的日志、报告、配置和个人档案
        deleted_logs_count = db.query(models.TrialLog).filter(models.TrialLog.patient_id == patient_id).delete()
        db.query(models.PatientReport).filter(models.PatientReport.patient_id == patient_id).delete()
        db.query(models.AdaptiveGameConfig).filter(models.AdaptiveGameConfig.patient_id == patient_id).delete()
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
    lang: str = "en"

@app.post("/api/analyze")
def analyze_data(req: AnalyzeRequest, db: Session = Depends(get_db)):
    patient_id = req.patient_id
    history = req.history
    lang = req.lang or "en"
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
            db_logs = db.query(models.TrialLog).filter(models.TrialLog.patient_id == patient_id).order_by(models.TrialLog.timestamp.asc()).all()
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

    stats_dict = {
        "classic": {"total": classic_total, "acc": classic_acc, "rt": classic_rt},
        "incongruent": {"total": incongruent_total, "acc": incongruent_acc, "rt": incongruent_rt},
        "shape": {"total": shape_total, "acc": shape_acc, "rt": shape_rt}
    }

    # 1. Check if reports for all 4 languages are cached in database
    latest_timestamp = "0"
    if history:
        latest_timestamp = max(h.get("timestamp", "0") for h in history)
        
    all_langs = ["en", "zh", "ta", "ms"]
    cached_reports = []
    if patient_id:
        cached_reports = db.query(models.PatientReport).filter(
            models.PatientReport.patient_id == patient_id
        ).all()

    cached_by_lang = {r.lang: r for r in cached_reports}
    has_all_cached = all(l in cached_by_lang and cached_by_lang[l].timestamp >= latest_timestamp for l in all_langs)

    if has_all_cached:
        try:
            translations_payload = {}
            for l in all_langs:
                translations_payload[l] = json.loads(cached_by_lang[l].report_data)
            
            selected_lang = lang if lang in all_langs else "en"
            report_payload = dict(translations_payload[selected_lang])
            report_payload["translations"] = translations_payload
            report_payload["stats"] = stats_dict
            return report_payload
        except Exception as e:
            print(f"⚠️ Error parsing cached reports JSON for {patient_id}: {e}")

    # 2. Generate new analysis and next config for all languages
    gemini_success = False
    report_obj = {}

    if GEMINI_API_KEY and patient_id:
        try:
            # Extract recent logs to feed into context
            recent_trials = history[-40:] if len(history) > 40 else history
            recent_trials_str = json.dumps(recent_trials, indent=2)

            system_instruction = """
You are an expert AI clinical neuropsychologist specializing in ADHD digital therapeutics.
Your task is to analyze the patient's performance telemetry logs, clinical profile, and session statistics.
Then, you must generate a clinical diagnostic report and configure the adaptive game parameters for their next session.

You MUST output your response as a single, valid JSON object with the following structure:
{
  "bestTraining": "Must be exactly one of: 'Color Go/No-Go (Sustained Attention)', 'Cognitive Flexibility (Reverse Conflict)', or 'Quantity Subitizing (Response Inhibition)'. Do NOT translate this string; keep it in English.",
  "translations": {
    "en": {
      "clinicianSummary": "A paragraph explaining the patient's neurocognitive performance in this round, focusing on sustained attention, cognitive flexibility, and motor inhibition in English. Use clinical terminology but make it readable.",
      "comparison": "A 1-2 sentence progress summary comparing their speed and accuracy to previous sessions or baseline in English.",
      "bestTrainingReason": "Detailed clinical reasoning in English explaining why this specific training module is recommended as their priority.",
      "domainFocus": [
        {
          "name": "Behavioral Inhibition System (or English equivalent)",
          "explanation": "Brief explanation of their performance in this domain in English.",
          "target": "Actionable score target in English."
        },
        {
          "name": "Cognitive Flexibility (or English equivalent)",
          "explanation": "Brief explanation of rule-switching performance in English.",
          "target": "Actionable score target in English."
        },
        {
          "name": "Processing Speed (or English equivalent)",
          "explanation": "Brief explanation of processing speed / subitizing performance in English.",
          "target": "Actionable score target in English."
        }
      ],
    },
    "zh": {
      "clinicianSummary": "The same clinicianSummary translated to Chinese (Simplified).",
      "comparison": "The same comparison translated to Chinese (Simplified).",
      "bestTrainingReason": "The same bestTrainingReason translated to Chinese (Simplified).",
      "domainFocus": [
        {
          "name": "Chinese translation of Domain 1 (e.g. 行为抑制系统)",
          "explanation": "Chinese translation of explanation.",
          "target": "Chinese translation of target."
        },
        {
          "name": "Chinese translation of Domain 2 (e.g. 认知灵活性)",
          "explanation": "Chinese translation of explanation.",
          "target": "Chinese translation of target."
        },
        {
          "name": "Chinese translation of Domain 3 (e.g. 信息加工速度)",
          "explanation": "Chinese translation of explanation.",
          "target": "Chinese translation of target."
        }
      ],
    },
    "ta": {
      "clinicianSummary": "The same clinicianSummary translated to Tamil.",
      "comparison": "The same comparison translated to Tamil.",
      "bestTrainingReason": "The same bestTrainingReason translated to Tamil.",
      "domainFocus": [
        {
          "name": "Tamil translation of Domain 1",
          "explanation": "Tamil translation of explanation.",
          "target": "Tamil translation of target."
        },
        {
          "name": "Tamil translation of Domain 2",
          "explanation": "Tamil translation of explanation.",
          "target": "Tamil translation of target."
        },
        {
          "name": "Tamil translation of Domain 3",
          "explanation": "Tamil translation of explanation.",
          "target": "Tamil translation of target."
        }
      ],
    },
    "ms": {
      "clinicianSummary": "The same clinicianSummary translated to Malay.",
      "comparison": "The same comparison translated to Malay.",
      "bestTrainingReason": "The same bestTrainingReason translated to Malay.",
      "domainFocus": [
        {
          "name": "Malay translation of Domain 1",
          "explanation": "Malay translation of explanation.",
          "target": "Malay translation of target."
        },
        {
          "name": "Malay translation of Domain 2",
          "explanation": "Malay translation of explanation.",
          "target": "Malay translation of target."
        },
        {
          "name": "Malay translation of Domain 3",
          "explanation": "Malay translation of explanation.",
          "target": "Malay translation of target."
        }
      ],
    }
  },
  "nextGameConfig": {
    "game_sequence": ["CLASSIC", "INCONGRUENT", "SHAPE_COUNT"],
    "stimulus_duration": 2000,
    "nogo_probability": 0.3,
    "trial_interval_range": [1500, 4500],
    "max_errors": 5
  }
}

CRITICAL REQUIREMENTS:
1. Under "translations", provide the full translations of all text values for English ("en"), Chinese ("zh"), Tamil ("ta"), and Malay ("ms") keys.
2. For "bestTraining", you MUST output exactly one of the three English strings:
   - 'Color Go/No-Go (Sustained Attention)'
   - 'Cognitive Flexibility (Reverse Conflict)'
   - 'Quantity Subitizing (Response Inhibition)'
   Do not translate this string or add any markdown or extra text.
3. The next game configuration ("nextGameConfig") must be dynamically adapted based on the patient's performance.
4. Ensure the output is a single valid JSON block without any surrounding code blocks or text.
"""

            user_prompt = f"""
Patient Profile:
- Name: {name}
- Age: {profile.get("age", 9)}
- Gender: {profile.get("gender", "Unknown")}
- ADHD Presentation: {presentation}
- Severity: {severity}

Calculated Session Statistics:
- Phase 1 (Color Go/No-Go): {classic_total} trials, Accuracy: {classic_acc:.1f}%, Avg RT: {classic_rt:.0f}ms
- Phase 2 (Cognitive Flexibility): {incongruent_total} trials, Accuracy: {incongruent_acc:.1f}%, Avg RT: {incongruent_rt:.0f}ms
- Phase 3 (Quantity Subitizing): {shape_total} trials, Accuracy: {shape_acc:.1f}%, Avg RT: {shape_rt:.0f}ms
- Overall Session Accuracy: {accuracy:.1f}%, Overall Avg RT: {avg_rt:.0f}ms

Recent Trial Telemetry Logs (JSON):
{recent_trials_str}

Please generate the clinical analysis and adaptive configuration matching the instructions.
"""

            model = genai.GenerativeModel(
                model_name="gemini-3.1-flash-lite",
                system_instruction=system_instruction
            )
            response = model.generate_content(
                contents=user_prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            
            raw_text = response.text.strip()
            if raw_text.startswith("```json"):
                raw_text = raw_text.split("```json", 1)[1].rsplit("```", 1)[0].strip()
            elif raw_text.startswith("```"):
                raw_text = raw_text.split("```", 1)[1].rsplit("```", 1)[0].strip()

            parsed_payload = json.loads(raw_text)
            next_config = parsed_payload.get("nextGameConfig", {})
            best_training = parsed_payload.get("bestTraining", "Color Go/No-Go (Sustained Attention)")
            translations_in_payload = parsed_payload.get("translations", {})
            
            # Reconstruct and cache reports for each language
            translations_payload = {}
            for l in all_langs:
                lang_data = translations_in_payload.get(l, {})
                lang_report = {
                    "clinicianSummary": lang_data.get("clinicianSummary", ""),
                    "comparison": lang_data.get("comparison", ""),
                    "bestTraining": best_training,
                    "bestTrainingReason": lang_data.get("bestTrainingReason", ""),
                    "domainFocus": lang_data.get("domainFocus", [])
                }
                translations_payload[l] = lang_report
                
                # Cache to database
                db_report = db.query(models.PatientReport).filter(
                    models.PatientReport.patient_id == patient_id,
                    models.PatientReport.lang == l
                ).first()
                if not db_report:
                    db_report = models.PatientReport(patient_id=patient_id, lang=l)
                    db.add(db_report)
                
                db_report.timestamp = latest_timestamp
                db_report.report_data = json.dumps(lang_report)
            
            db.commit()

            # Update AdaptiveGameConfig in DB
            if next_config:
                db_config = db.query(models.AdaptiveGameConfig).filter(models.AdaptiveGameConfig.patient_id == patient_id).first()
                if not db_config:
                    db_config = models.AdaptiveGameConfig(patient_id=patient_id)
                    db.add(db_config)
                
                db_config.game_sequence = ",".join(next_config.get("game_sequence", ["CLASSIC", "INCONGRUENT", "SHAPE_COUNT"]))
                db_config.stimulus_duration = int(next_config.get("stimulus_duration", 2000))
                db_config.nogo_probability = float(next_config.get("nogo_probability", 0.3))
                interval_range = next_config.get("trial_interval_range", [1500, 4500])
                db_config.trial_interval_min = int(interval_range[0])
                db_config.trial_interval_max = int(interval_range[1])
                db_config.max_errors = int(next_config.get("max_errors", 5))
                db.commit()

            gemini_success = True
            print(f"✅ Gemini successfully generated report & adaptive config for {patient_id} in all languages")
            
            selected_lang = lang if lang in all_langs else "en"
            report_obj = dict(translations_payload[selected_lang])
            report_obj["translations"] = translations_payload
            
        except Exception as e:
            print(f"⚠️ Gemini generation failed, falling back to rule-based analysis: {e}")

    if not gemini_success:
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

        # Choose best training based on lowest performance mode
        modes = []
        if classic_total >= 3:
            modes.append(("CLASSIC", classic_acc, classic_rt, "Color Go/No-Go", "Sustained Attention"))
        if incongruent_total >= 3:
            modes.append(("INCONGRUENT", incongruent_acc, incongruent_rt, "Cognitive Flexibility", "Reverse Conflict"))
        if shape_total >= 3:
            modes.append(("SHAPE_COUNT", shape_acc, shape_rt, "Quantity Subitizing", "Response Inhibition"))

        best_training = "Color Go/No-Go (Sustained Attention)"
        reasoning = "This module is recommended to establish your baseline focus and response consistency."
        worst_mode_name = "Sustained Attention"

        if modes:
            modes_sorted = sorted(modes, key=lambda x: (x[1], -x[2]))
            worst_mode = modes_sorted[0]
            worst_mode_name = worst_mode[4]
            
            if worst_mode[0] == "CLASSIC":
                best_training = "Color Go/No-Go (Sustained Attention)"
                reasoning = f"The patient demonstrates their lowest accuracy ({classic_acc:.1f}%) in basic Sustained Attention (Color Go/No-Go), indicating a fundamental difficulty in maintaining alert readiness. We recommend starting with this module to stabilize their core executive baseline."
            elif worst_mode[0] == "INCONGRUENT":
                best_training = "Cognitive Flexibility (Reverse Conflict)"
                reasoning = f"The patient shows an accuracy drop ({incongruent_acc:.1f}%) and processing delay ({incongruent_rt:.0f} ms) under rule-switching conditions in Incongruent Mode. This bottleneck in overriding instinctual choices suggests a priority for flexibility training."
            else: # SHAPE_COUNT
                best_training = "Quantity Subitizing (Response Inhibition)"
                reasoning = f"The patient exhibits their lowest performance accuracy ({shape_acc:.1f}%) in Subitizing & Response Inhibition. This is associated with high impulse error rates. Focused training on this module will enhance behavioral inhibition."

        summary = (
            f"Comprehensive Patient Neuropsychology Report for {name} (ADHD Presentation: {presentation}, Severity: {severity}):\n\n"
            f"• Phase 1 (Color Go/No-Go): Completed {classic_total} trials with {classic_acc:.1f}% accuracy.\n"
            f"• Phase 2 (Cognitive Flexibility): Completed {incongruent_total} trials with {incongruent_acc:.1f}% accuracy.\n"
            f"• Phase 3 (Quantity Subitizing): Completed {shape_total} trials with {shape_acc:.1f}% accuracy.\n\n"
            f"Clinical Diagnosis: Based on multi-game tracking, the patient's primary cognitive challenge is in the domain of {worst_mode_name}. "
            f"To target this bottleneck, the optimal intervention is {best_training}."
        )

        domain_focus = [
            {
                "name": "Behavioral Inhibition (Classic)",
                "explanation": f"Baseline Color Go/No-Go accuracy is {classic_acc:.1f}%. Target is to sustain attention and limit impulse errors.",
                "target": "Target accuracy > 90% in Wait trials."
            },
            {
                "name": "Cognitive Flexibility (Incongruent)",
                "explanation": f"Reverse conflict rule-switching accuracy is {incongruent_acc:.1f}%. Target is to improve switching efficiency under cognitive load.",
                "target": "Reduce reaction time latency by 50ms in Incongruent mode."
            },
            {
                "name": "Processing Speed (Shape Count)",
                "explanation": f"Quantity Subitizing accuracy is {shape_acc:.1f}%. Target is to stabilize processing speed and motor control.",
                "target": "Achieve stable reaction times between 400ms - 600ms."
            }
        ]
        
        # Build the fallback translations map for all languages
        translations_payload = {}
        for l in all_langs:
            lang_report = {
                "clinicianSummary": summary,
                "comparison": comparison_text,
                "bestTraining": best_training,
                "bestTrainingReason": reasoning,
                "domainFocus": domain_focus
            }
            translations_payload[l] = lang_report
            
            # Cache to database
            if patient_id:
                try:
                    db_report = db.query(models.PatientReport).filter(
                        models.PatientReport.patient_id == patient_id,
                        models.PatientReport.lang == l
                    ).first()
                    if not db_report:
                        db_report = models.PatientReport(patient_id=patient_id, lang=l)
                        db.add(db_report)
                    
                    db_report.timestamp = latest_timestamp
                    db_report.report_data = json.dumps(lang_report)
                    db.commit()
                except Exception as e:
                    db.rollback()
                    print(f"⚠️ Error saving fallback report to database for {l}: {e}")

        selected_lang = lang if lang in all_langs else "en"
        report_obj = dict(translations_payload[selected_lang])
        report_obj["translations"] = translations_payload

    report_obj["stats"] = stats_dict
    return report_obj

@app.get("/api/patients/{patient_id}/ai-config")
def get_patient_ai_config(patient_id: str, db: Session = Depends(get_db)):
    config = db.query(models.AdaptiveGameConfig).filter(models.AdaptiveGameConfig.patient_id == patient_id).first()
    db_profile = db.query(models.PatientProfile).filter(models.PatientProfile.patient_id == patient_id).first()
    
    # Resolve basic patient profile info
    if db_profile:
        profile_info = {
            "name": db_profile.name,
            "age": db_profile.age,
            "gender": db_profile.gender,
            "presentation": db_profile.presentation,
            "severity": db_profile.severity
        }
    else:
        with lock:
            profile_info = DOCTOR_CONFIGS.get(patient_id, {
                "name": "未知",
                "age": 9,
                "gender": "未知",
                "presentation": "Combined",
                "severity": "Moderate"
            })
            
    # Resolve game config
    if not config:
        # Generate default parameters based on profile severity and presentation
        presentation = profile_info.get("presentation", "Combined")
        severity = profile_info.get("severity", "Moderate")
        
        if severity == "Mild":
            stimulus_duration = 1500
            trial_interval_min = 1000
            trial_interval_max = 3000
            max_errors = 7
            nogo_probability = 0.4
        elif severity == "Severe":
            stimulus_duration = 2500
            trial_interval_min = 2000
            trial_interval_max = 6000
            max_errors = 3
            nogo_probability = 0.2
        else:  # Moderate
            stimulus_duration = 2000
            trial_interval_min = 1500
            trial_interval_max = 4500
            max_errors = 5
            nogo_probability = 0.3

        if presentation == "Inattentive":
            daily_set = "CLASSIC,CLASSIC,INCONGRUENT"
        elif presentation == "Hyperactive-Impulsive":
            daily_set = "SHAPE_COUNT,SHAPE_COUNT,INCONGRUENT"
        else:
            daily_set = "CLASSIC,INCONGRUENT,SHAPE_COUNT"
            
        config = models.AdaptiveGameConfig(
            patient_id=patient_id,
            game_sequence=daily_set,
            stimulus_duration=stimulus_duration,
            nogo_probability=nogo_probability,
            trial_interval_min=trial_interval_min,
            trial_interval_max=trial_interval_max,
            max_errors=max_errors
        )
        try:
            db.add(config)
            db.commit()
            db.refresh(config)
        except Exception as e:
            db.rollback()
            print(f"⚠️ Error creating baseline config for {patient_id}: {e}")

    return {
        "patient_id": patient_id,
        "name": profile_info.get("name", "未名"),
        "age": profile_info.get("age", 9),
        "gender": profile_info.get("gender", "未知"),
        "presentation": profile_info.get("presentation", "Combined"),
        "severity": profile_info.get("severity", "Moderate"),
        "game_sequence": [s.strip() for s in config.game_sequence.split(",") if s.strip()],
        "initial_stimulus_duration": config.stimulus_duration,
        "initial_nogo_probability": config.nogo_probability,
        "trial_interval_range": [config.trial_interval_min, config.trial_interval_max],
        "max_errors": config.max_errors
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