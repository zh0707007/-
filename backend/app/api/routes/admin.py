from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.responses import error_response, success_response
from app.api.routes.platform import is_error_response, require_user
from app.db.session import get_db
from app.models.platform import ClientProfile, CommunityPost, Order, Tenant, User

router = APIRouter()


def require_admin(user=Depends(require_user)):
    if is_error_response(user):
        return user
    if user.role != "admin":
        return error_response("ADMIN_REQUIRED", "需要管理员权限。", status_code=403)
    return user


@router.get("/overview")
def admin_overview(user=Depends(require_admin), db: Session = Depends(get_db)):
    if is_error_response(user):
        return user
    return success_response(
        {
            "users": db.query(func.count(User.id)).scalar() or 0,
            "tenants": db.query(func.count(Tenant.id)).scalar() or 0,
            "orders": db.query(func.count(Order.id)).scalar() or 0,
            "paidOrders": db.query(func.count(Order.id)).filter(Order.status == "paid").scalar() or 0,
            "profiles": db.query(func.count(ClientProfile.id)).scalar() or 0,
            "posts": db.query(func.count(CommunityPost.id)).scalar() or 0,
        }
    )
