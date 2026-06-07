import boto3
import psycopg2
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

# 把它从 database-1 替换成你真实的 adhd-dtx-data
DB_HOST = "adhd-dtx-data.cluster-ctu00mgwkt6e.ap-southeast-2.rds.amazonaws.com"
DB_USER = "postgres"
DB_NAME = "postgres"
DB_PORT = "5432"
REGION = "ap-southeast-2"

# 1. 动态获取 15 分钟寿命 Token 的函数
def get_auth_token():
    # 自动读取你电脑上配置好的 AWS 凭证
    client = boto3.client('rds', region_name=REGION)
    token = client.generate_db_auth_token(
        DBHostname=DB_HOST,
        Port=DB_PORT,
        DBUsername=DB_USER,
        Region=REGION
    )
    return token

# 2. 建立带 SSL 加密的底层连接的函数
def get_db_connection():
    fresh_token = get_auth_token()
    # 使用 psycopg2 直接建立连接，强制开启 sslmode
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=fresh_token,
        dbname=DB_NAME,
        sslmode="require"
    )

# 3. 将这个动态连接函数 (creator) 交给 SQLAlchemy 引擎
# 这样即使服务器运行了几天，每次需要新连接时，它都会去取一个最新的 Token
engine = create_engine(
    "postgresql+psycopg2://", 
    creator=get_db_connection
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()