from typing import Any

from pydantic import BaseModel


class ApiError(BaseModel):
    code: str
    message: str
    details: dict[str, Any] = {}


class ApiResponse(BaseModel):
    success: bool
    data: Any | None = None
    error: ApiError | None = None
    request_id: str
