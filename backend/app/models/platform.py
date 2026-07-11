from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(80))
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(32), default="user")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)


class UserSession(Base):
    __tablename__ = "user_sessions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id"), index=True)
    token_hash: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    owner_user_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id"), index=True)
    plan: Mapped[str] = mapped_column(String(32), default="free")
    status: Mapped[str] = mapped_column(String(32), default="active")
    settings: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)


class TenantMember(Base):
    __tablename__ = "tenant_members"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(String(64), ForeignKey("tenants.id"), index=True)
    user_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id"), index=True)
    role: Mapped[str] = mapped_column(String(32), default="member")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)


class Membership(Base):
    __tablename__ = "memberships"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id"), index=True)
    tier: Mapped[str] = mapped_column(String(32), default="free")
    status: Mapped[str] = mapped_column(String(32), default="active")
    started_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    quota: Mapped[int] = mapped_column(Integer, default=5)


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id"), index=True)
    tenant_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("tenants.id"), nullable=True)
    product_code: Mapped[str] = mapped_column(String(64))
    product_name: Mapped[str] = mapped_column(String(120))
    amount: Mapped[float] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(16), default="CNY")
    status: Mapped[str] = mapped_column(String(32), default="pending")
    payment_provider: Mapped[str] = mapped_column(String(32), default="mock")
    payment_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class ClientProfile(Base):
    __tablename__ = "client_profiles"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    owner_user_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id"), index=True)
    tenant_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("tenants.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(80))
    gender: Mapped[str] = mapped_column(String(16), default="male")
    birth_summary: Mapped[str] = mapped_column(String(255), default="")
    chart_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    notes: Mapped[str] = mapped_column(Text, default="")
    tags: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)


class CommunityPost(Base):
    __tablename__ = "community_posts"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(160))
    content: Mapped[str] = mapped_column(Text)
    visibility: Mapped[str] = mapped_column(String(32), default="public")
    share_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    like_count: Mapped[int] = mapped_column(Integer, default=0)
    comment_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)


class CommunityComment(Base):
    __tablename__ = "community_comments"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    post_id: Mapped[str] = mapped_column(String(64), ForeignKey("community_posts.id"), index=True)
    user_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id"), index=True)
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
