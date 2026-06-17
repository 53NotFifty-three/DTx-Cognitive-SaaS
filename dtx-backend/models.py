from sqlalchemy import Column, Integer, String, Boolean, Float, Text
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

class PatientReport(Base):
    __tablename__ = "patient_reports"

    patient_id = Column(String, primary_key=True, index=True)
    lang = Column(String, primary_key=True, nullable=False)
    timestamp = Column(String, nullable=False)
    report_data = Column(Text, nullable=False)  # JSON-serialized report fields

class AdaptiveGameConfig(Base):
    __tablename__ = "adaptive_game_configs"

    patient_id = Column(String, primary_key=True, index=True)
    game_sequence = Column(String, nullable=False)      # e.g., "CLASSIC,INCONGRUENT,SHAPE_COUNT"
    stimulus_duration = Column(Integer, nullable=False)  # ms
    nogo_probability = Column(Float, nullable=False)     # 0.0 to 1.0
    trial_interval_min = Column(Integer, nullable=False) # ms
    trial_interval_max = Column(Integer, nullable=False) # ms
    max_errors = Column(Integer, nullable=False)