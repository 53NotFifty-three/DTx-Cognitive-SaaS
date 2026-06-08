from sqlalchemy import Column, Integer, String, Boolean, Float
from database import Base

class TrialLog(Base):
    __tablename__ = "trial_logs"  # 在 AWS 数据库里生成的表名

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id = Column(String, index=True, nullable=False)
    timestamp = Column(String, nullable=False)
    target_type = Column(String, nullable=False)      # Go 还是 No-Go
    reaction_time_ms = Column(Float, nullable=False)   # 匹配你的 float 类型
    is_correct = Column(Boolean, nullable=False)