from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.errors import find_error_solution

app = FastAPI(title="Error Translator API")

#allowing frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins = ["*"],
    allow_methods = ["*"],
    allow_headers = ["*"],
)

#data model for requests
class ErrorRequest(BaseModel):
    error_message: str
    language: str = "auto"


@app.get("/")
def home():
    return {"message":"Error Translator API is running!"}

@app.post("/api/translate")
def translate_error(request: ErrorRequest):
    """Translating error message to plain English"""

    try:
        result = find_error_solution(request.error_message)

        #adding metadata
        result["original_error"] = request.error_message[:100] #only 1st 100 characters

        return result
    except Exception as e:
        raise HTTPException(status_code = 500, detail=str(e))

@app.get("/api/stats")
def get_stats():
    """Get API Statistics"""
    from app.errors import ERROR_PATTERNS
    return {
        "total_patterns": len(ERROR_PATTERNS),
        "status": "Operational"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)