from sqlalchemy import Column, Integer, String, Float, Boolean
from database import Base

class TrialLog(Base):
    __tablename__ = "trial_logs"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String, index=True)
    timestamp = Column(String)
    target_type = Column(String)
    reaction_time_ms = Column(Float)
    is_correct = Column(Boolean)