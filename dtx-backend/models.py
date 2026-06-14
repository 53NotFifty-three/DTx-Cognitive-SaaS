from sqlalchemy import Column, Integer, String, Boolean, Float
from database import Base

class PatientProfile(Base):
    __tablename__ = "patient_profiles"

    patient_id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String, nullable=False)
    presentation = Column(String, nullable=False)  # Inattentive, Hyperactive-Impulsive, Combined
    severity = Column(String, nullable=False)      # Mild, Moderate, Severe

class TrialLog(Base):
    __tablename__ = "trial_logs"  # 在 AWS 数据库里生成的表名

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id = Column(String, index=True, nullable=False)
    timestamp = Column(String, nullable=False)
    target_type = Column(String, nullable=False)      # Go 还是 No-Go
    reaction_time_ms = Column(Float, nullable=False)   # 匹配你的 float 类型
    is_correct = Column(Boolean, nullable=False)