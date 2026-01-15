from pydantic import BaseModel

class UserSignUp(BaseModel):
    username: str
    password: str
    

class UserLogin(BaseModel):
    username: str
    password: str
    client_role: str
