from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import re
import secrets
from uuid import uuid4

from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from app.api.responses import error_response, success_response
from app.db.session import get_db
from app.models.platform import (
    ClientProfile,
    CommunityComment,
    CommunityPost,
    Membership,
    Order,
    Tenant,
    TenantMember,
    User,
    UserSession,
)
from app.schemas.platform import (
    CommunityCommentCreateRequest,
    CommunityPostCreateRequest,
    ClientProfileCreateRequest,
    LoginRequest,
    OrderCreateRequest,
    RegisterRequest,
    TenantCreateRequest,
)

router = APIRouter()

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
SESSION_DAYS = 14
MEMBERSHIP_PLANS = {
    "monthly_vip": {
        "code": "monthly_vip",
        "name": "月度会员",
        "price": 29.0,
        "currency": "CNY",
        "quota": 100,
        "description": "适合个人用户，包含更多 AI 解读与 PDF 报告额度。",
    },
    "agency_pro": {
        "code": "agency_pro",
        "name": "机构专业版",
        "price": 299.0,
        "currency": "CNY",
        "quota": 2000,
        "description": "适合工作室和机构，包含多租户、多人档案和团队管理能力。",
    },
}


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def make_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex}"


def normalize_email(email: str) -> str:
    return email.strip().lower()


def hash_password(password: str, salt: str | None = None) -> str:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120_000)
    return f"pbkdf2_sha256${salt}${digest.hex()}"


def verify_password(password: str, encoded: str) -> bool:
    try:
      _, salt, expected = encoded.split("$", 2)
    except ValueError:
      return False
    actual = hash_password(password, salt).split("$", 2)[2]
    return hmac.compare_digest(actual, expected)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def aware(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def user_public(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "isActive": user.is_active,
        "createdAt": user.created_at,
    }


def membership_public(membership: Membership) -> dict:
    return {
        "id": membership.id,
        "tier": membership.tier,
        "status": membership.status,
        "startedAt": membership.started_at,
        "expiresAt": membership.expires_at,
        "quota": membership.quota,
    }


def tenant_public(tenant: Tenant) -> dict:
    return {
        "id": tenant.id,
        "name": tenant.name,
        "ownerUserId": tenant.owner_user_id,
        "plan": tenant.plan,
        "status": tenant.status,
        "createdAt": tenant.created_at,
    }


def profile_public(profile: ClientProfile) -> dict:
    return {
        "id": profile.id,
        "ownerUserId": profile.owner_user_id,
        "tenantId": profile.tenant_id,
        "name": profile.name,
        "gender": profile.gender,
        "birthSummary": profile.birth_summary,
        "chartId": profile.chart_id,
        "notes": profile.notes,
        "tags": profile.tags,
        "createdAt": profile.created_at,
        "updatedAt": profile.updated_at,
    }


def order_public(order: Order) -> dict:
    return {
        "id": order.id,
        "productCode": order.product_code,
        "productName": order.product_name,
        "amount": order.amount,
        "currency": order.currency,
        "status": order.status,
        "paymentProvider": order.payment_provider,
        "paymentUrl": order.payment_url,
        "createdAt": order.created_at,
        "paidAt": order.paid_at,
    }


def post_public(post: CommunityPost) -> dict:
    return {
        "id": post.id,
        "userId": post.user_id,
        "title": post.title,
        "content": post.content,
        "visibility": post.visibility,
        "shareUrl": post.share_url,
        "likeCount": post.like_count,
        "commentCount": post.comment_count,
        "createdAt": post.created_at,
    }


def comment_public(comment: CommunityComment) -> dict:
    return {
        "id": comment.id,
        "postId": comment.post_id,
        "userId": comment.user_id,
        "content": comment.content,
        "createdAt": comment.created_at,
    }


def create_default_membership(db: Session, user_id: str) -> Membership:
    membership = Membership(
        id=make_id("membership"),
        user_id=user_id,
        tier="free",
        status="active",
        quota=5,
    )
    db.add(membership)
    return membership


def create_default_tenant(db: Session, user: User) -> Tenant:
    tenant = Tenant(
        id=make_id("tenant"),
        name=f"{user.name}的工作区",
        owner_user_id=user.id,
        plan="free",
        status="active",
    )
    db.add(tenant)
    db.add(TenantMember(id=make_id("tenant_member"), tenant_id=tenant.id, user_id=user.id, role="owner"))
    return tenant


def current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User | None:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1].strip()
    session = db.query(UserSession).filter(UserSession.token_hash == hash_token(token)).first()
    if not session or aware(session.expires_at) <= utc_now():
        return None
    return db.get(User, session.user_id)


def require_user(user: User | None = Depends(current_user)):
    if not user:
        return error_response("AUTH_REQUIRED", "请先登录后再继续操作。", status_code=401)
    if not user.is_active:
        return error_response("USER_DISABLED", "当前账号已停用。", status_code=403)
    return user


def is_error_response(value) -> bool:
    return hasattr(value, "status_code")


@router.post("/auth/register")
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    email = normalize_email(payload.email)
    if not EMAIL_RE.match(email):
        return error_response("INVALID_EMAIL", "请输入有效邮箱地址。", status_code=422)
    if db.query(User).filter(User.email == email).first():
        return error_response("EMAIL_EXISTS", "该邮箱已注册。", status_code=409)

    user = User(
        id=make_id("user"),
        email=email,
        name=payload.name.strip(),
        password_hash=hash_password(payload.password),
        role="user",
    )
    db.add(user)
    membership = create_default_membership(db, user.id)
    tenant = create_default_tenant(db, user)
    db.commit()
    db.refresh(user)
    return success_response(
        {
            "user": user_public(user),
            "membership": membership_public(membership),
            "tenant": tenant_public(tenant),
        }
    )


@router.post("/auth/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    email = normalize_email(payload.email)
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        return error_response("INVALID_CREDENTIALS", "邮箱或密码不正确。", status_code=401)
    if not user.is_active:
        return error_response("USER_DISABLED", "当前账号已停用。", status_code=403)

    token = secrets.token_urlsafe(32)
    expires_at = utc_now() + timedelta(days=SESSION_DAYS)
    db.add(
        UserSession(
            id=make_id("session"),
            user_id=user.id,
            token_hash=hash_token(token),
            expires_at=expires_at,
        )
    )
    db.commit()
    return success_response({"token": token, "expiresAt": expires_at, "user": user_public(user)})


@router.get("/auth/me")
def me(user=Depends(require_user), db: Session = Depends(get_db)):
    if is_error_response(user):
        return user
    membership = db.query(Membership).filter(Membership.user_id == user.id).order_by(Membership.started_at.desc()).first()
    tenants = db.query(Tenant).filter(Tenant.owner_user_id == user.id).order_by(Tenant.created_at.desc()).all()
    return success_response(
        {
            "user": user_public(user),
            "membership": membership_public(membership) if membership else None,
            "tenants": [tenant_public(tenant) for tenant in tenants],
        }
    )


@router.get("/membership/plans")
def membership_plans():
    return success_response(list(MEMBERSHIP_PLANS.values()))


@router.get("/membership/current")
def current_membership(user=Depends(require_user), db: Session = Depends(get_db)):
    if is_error_response(user):
        return user
    membership = db.query(Membership).filter(Membership.user_id == user.id).order_by(Membership.started_at.desc()).first()
    if not membership:
        membership = create_default_membership(db, user.id)
        db.commit()
    return success_response(membership_public(membership))


@router.post("/tenants")
def create_tenant(payload: TenantCreateRequest, user=Depends(require_user), db: Session = Depends(get_db)):
    if is_error_response(user):
        return user
    tenant = Tenant(
        id=make_id("tenant"),
        name=payload.name.strip(),
        owner_user_id=user.id,
        plan="free",
        status="active",
    )
    db.add(tenant)
    db.add(TenantMember(id=make_id("tenant_member"), tenant_id=tenant.id, user_id=user.id, role="owner"))
    db.commit()
    return success_response(tenant_public(tenant))


@router.get("/tenants")
def list_tenants(user=Depends(require_user), db: Session = Depends(get_db)):
    if is_error_response(user):
        return user
    tenants = db.query(Tenant).filter(Tenant.owner_user_id == user.id).order_by(Tenant.created_at.desc()).all()
    return success_response([tenant_public(tenant) for tenant in tenants])


@router.post("/profiles")
def create_profile(payload: ClientProfileCreateRequest, user=Depends(require_user), db: Session = Depends(get_db)):
    if is_error_response(user):
        return user
    now = utc_now()
    profile = ClientProfile(
        id=make_id("profile"),
        owner_user_id=user.id,
        tenant_id=payload.tenantId,
        name=payload.name.strip(),
        gender=payload.gender,
        birth_summary=payload.birthSummary,
        chart_id=payload.chartId,
        notes=payload.notes,
        tags=payload.tags,
        created_at=now,
        updated_at=now,
    )
    db.add(profile)
    db.commit()
    return success_response(profile_public(profile))


@router.get("/profiles")
def list_profiles(user=Depends(require_user), db: Session = Depends(get_db)):
    if is_error_response(user):
        return user
    profiles = db.query(ClientProfile).filter(ClientProfile.owner_user_id == user.id).order_by(ClientProfile.created_at.desc()).all()
    return success_response([profile_public(profile) for profile in profiles])


@router.post("/orders")
def create_order(payload: OrderCreateRequest, user=Depends(require_user), db: Session = Depends(get_db)):
    if is_error_response(user):
        return user
    plan = MEMBERSHIP_PLANS.get(payload.productCode)
    if not plan:
        return error_response("PRODUCT_NOT_FOUND", "未找到对应会员商品。", status_code=404)
    order = Order(
        id=make_id("order"),
        user_id=user.id,
        tenant_id=payload.tenantId,
        product_code=plan["code"],
        product_name=plan["name"],
        amount=plan["price"],
        currency=plan["currency"],
        status="pending",
        payment_provider="mock",
        payment_url=f"/mock-pay/{make_id('payment')}",
    )
    db.add(order)
    db.commit()
    return success_response(order_public(order))


@router.post("/orders/{order_id}/mock-pay")
def mock_pay_order(order_id: str, user=Depends(require_user), db: Session = Depends(get_db)):
    if is_error_response(user):
        return user
    order = db.get(Order, order_id)
    if not order or order.user_id != user.id:
        return error_response("ORDER_NOT_FOUND", "订单不存在。", status_code=404)
    order.status = "paid"
    order.paid_at = utc_now()
    plan = MEMBERSHIP_PLANS.get(order.product_code)
    if plan:
        membership = Membership(
            id=make_id("membership"),
            user_id=user.id,
            tier=order.product_code,
            status="active",
            quota=plan["quota"],
            expires_at=utc_now() + timedelta(days=365 if order.product_code == "agency_pro" else 31),
        )
        db.add(membership)
    db.commit()
    return success_response(order_public(order))


@router.get("/orders")
def list_orders(user=Depends(require_user), db: Session = Depends(get_db)):
    if is_error_response(user):
        return user
    orders = db.query(Order).filter(Order.user_id == user.id).order_by(Order.created_at.desc()).all()
    return success_response([order_public(order) for order in orders])


@router.post("/community/posts")
def create_post(payload: CommunityPostCreateRequest, user=Depends(require_user), db: Session = Depends(get_db)):
    if is_error_response(user):
        return user
    post = CommunityPost(
        id=make_id("post"),
        user_id=user.id,
        title=payload.title.strip(),
        content=payload.content.strip(),
        visibility=payload.visibility,
    )
    post.share_url = f"/community/{post.id}"
    db.add(post)
    db.commit()
    return success_response(post_public(post))


@router.get("/community/posts")
def list_posts(db: Session = Depends(get_db)):
    posts = db.query(CommunityPost).filter(CommunityPost.visibility == "public").order_by(CommunityPost.created_at.desc()).limit(50).all()
    return success_response([post_public(post) for post in posts])


@router.post("/community/posts/{post_id}/comments")
def create_comment(post_id: str, payload: CommunityCommentCreateRequest, user=Depends(require_user), db: Session = Depends(get_db)):
    if is_error_response(user):
        return user
    post = db.get(CommunityPost, post_id)
    if not post:
        return error_response("POST_NOT_FOUND", "帖子不存在。", status_code=404)
    comment = CommunityComment(
        id=make_id("comment"),
        post_id=post_id,
        user_id=user.id,
        content=payload.content.strip(),
    )
    post.comment_count += 1
    db.add(comment)
    db.commit()
    return success_response(comment_public(comment))


@router.get("/community/posts/{post_id}/comments")
def list_comments(post_id: str, db: Session = Depends(get_db)):
    comments = db.query(CommunityComment).filter(CommunityComment.post_id == post_id).order_by(CommunityComment.created_at.asc()).all()
    return success_response([comment_public(comment) for comment in comments])

