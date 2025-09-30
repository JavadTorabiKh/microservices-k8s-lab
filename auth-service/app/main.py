from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBearer
from pydantic import BaseModel
import redis
import json
import uuid
from datetime import datetime, timedelta

# Create FastAPI application
app = FastAPI(
    title="Auth Service",
    version="1.0.0",
    description="User authentication and session management service"
)
security = HTTPBearer()

# Redis connection for session management
redis_client = redis.Redis(host='redis-service', port=6379, decode_responses=True)

# Data models
class UserLogin(BaseModel):
    """User login request model"""
    username: str
    password: str

class User(BaseModel):
    """User information model"""
    username: str
    email: str
    full_name: str

class Token(BaseModel):
    """Authentication token response model"""
    access_token: str
    token_type: str

# Sample users data (in production use database)
sample_users = {
    "admin": {
        "username": "admin",
        "password": "password",
        "email": "admin@example.com",
        "full_name": "System Administrator"
    },
    "user1": {
        "username": "user1",
        "password": "123456",
        "email": "user1@example.com",
        "full_name": "Sample User One"
    }
}

@app.post("/login", response_model=Token)
async def login(user_data: UserLogin):
    """
    User login endpoint
    Validates credentials and returns JWT-like token
    """
    user = sample_users.get(user_data.username)
    
    # Validate user credentials
    if not user or user["password"] != user_data.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Generate unique token
    token = str(uuid.uuid4())
    token_data = {
        "username": user["username"],
        "email": user["email"],
        "full_name": user["full_name"],
        "expires": (datetime.now() + timedelta(hours=24)).isoformat()
    }
    
    # Store token in Redis with 24-hour expiration
    redis_client.setex(f"token:{token}", 86400, json.dumps(token_data))
    
    return {
        "access_token": token,
        "token_type": "bearer"
    }

@app.get("/users/{username}", response_model=User)
async def get_user(username: str):
    """Get user information by username"""
    user = sample_users.get(username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return User(
        username=user["username"],
        email=user["email"],
        full_name=user["full_name"]
    )

@app.get("/verify/{token}")
async def verify_token(token: str):
    """Validate authentication token"""
    token_data = redis_client.get(f"token:{token}")
    if not token_data:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    return json.loads(token_data)

@app.get("/health")
async def health_check():
    """Service health check endpoint"""
    return {
        "status": "healthy",
        "service": "auth-service",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/")
async def root():
    """Service root endpoint"""
    return {"message": "Auth Service is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)