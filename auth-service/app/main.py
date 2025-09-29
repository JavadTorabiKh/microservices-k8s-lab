from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBearer
from pydantic import BaseModel
import redis
import json
import uuid
from datetime import datetime, timedelta

app = FastAPI(title="Auth Service", version="1.0.0")
security = HTTPBearer()

# اتصال به Redis
redis_client = redis.Redis(host="redis-service", port=6379, decode_responses=True)


# مدل‌های داده
class UserLogin(BaseModel):
    username: str
    password: str


class User(BaseModel):
    username: str
    email: str
    full_name: str


class Token(BaseModel):
    access_token: str
    token_type: str


# کاربران نمونه (در حالت واقعی از دیتابیس استفاده میشه)
sample_users = {
    "admin": {
        "username": "admin",
        "password": "password",
        "email": "admin@example.com",
        "full_name": "Administrator",
    },
    "user1": {
        "username": "user1",
        "password": "123456",
        "email": "user1@example.com",
        "full_name": "User One",
    },
}


@app.post("/login", response_model=Token)
async def login(user_data: UserLogin):
    user = sample_users.get(user_data.username)

    if not user or user["password"] != user_data.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # create token
    token = str(uuid.uuid4())
    token_data = {
        "username": user["username"],
        "email": user["email"],
        "full_name": user["full_name"],
        "expires": (datetime.now() + timedelta(hours=24)).isoformat(),
    }

    # save token on Redis
    redis_client.setex(f"token:{token}", 86400, json.dumps(token_data))

    return {"access_token": token, "token_type": "bearer"}


@app.get("/users/{username}", response_model=User)
async def get_user(username: str):
    user = sample_users.get(username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return User(
        username=user["username"], email=user["email"], full_name=user["full_name"]
    )


@app.get("/verify/{token}")
async def verify_token(token: str):
    token_data = redis_client.get(f"token:{token}")
    if not token_data:
        raise HTTPException(status_code=401, detail="Invalid token")

    return json.loads(token_data)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "auth-service"}


@app.get("/")
async def root():
    return {"message": "Auth Service is running!"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
