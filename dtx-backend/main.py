from fastapi import FastAPI, Depends
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
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

# 依赖注入：每次有请求来，分配一个数据库连接
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/api/log")
async def log_trial(data: TrialData, db: Session = Depends(get_db)):
    # 将前端发来的 JSON 转化为数据库模型
    db_log = models.TrialLog(
        patient_id=data.patient_id,
        timestamp=data.timestamp,
        target_type=data.target_type,
        reaction_time_ms=data.reaction_time_ms,
        is_correct=data.is_correct
    )
    
    # 提交到 AWS 数据库
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    
    print(f"✅ 数据已写入 AWS 云端！患者 {data.patient_id} | 反应时间: {data.reaction_time_ms}ms")
    return {"status": "success", "message": "Data logged to AWS Aurora"}