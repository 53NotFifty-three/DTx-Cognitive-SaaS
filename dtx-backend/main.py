from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins = ["*"],
    allow_methods = ["*"],
)

class TrialData(BaseModel):
    timestamp: str
    target_type: str
    action: str
    reaction_time_ms: float
    is_correct: bool

@app.post("/api/log")
async def log_trial(data: TrialData):

    print(f"📥 收到患者数据: 反应时间 {data.reaction_time_ms:.2f}ms | 正确: {data.is_correct}")
    return{ "status":"success","message":"Data logged"}