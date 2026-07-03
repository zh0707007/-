from typing import Any
from uuid import uuid4

from fastapi.responses import JSONResponse


def make_request_id() -> str:
    return f"req_{uuid4().hex}"


def success_response(data: Any, request_id: str | None = None) -> dict[str, Any]:
    return {
        "success": True,
        "data": data,
        "requestId": request_id or make_request_id(),
    }


def error_response(
    code: str,
    message: str,
    status_code: int = 400,
    details: dict[str, Any] | None = None,
    request_id: str | None = None,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "error": {
                "code": code,
                "message": message,
                "details": details or {},
            },
            "requestId": request_id or make_request_id(),
        },
    )


def not_implemented_response(feature: str) -> JSONResponse:
    return error_response(
        code="NOT_IMPLEMENTED",
        message=f"{feature} is scaffolded but not implemented yet.",
        status_code=501,
    )
