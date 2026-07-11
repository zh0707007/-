from datetime import datetime

from pydantic import BaseModel, Field


class UserPublic(BaseModel):
    id: str
    email: str
    name: str
    role: str
    isActive: bool
    createdAt: datetime


class RegisterRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=72)
    name: str = Field(min_length=1, max_length=80)


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1, max_length=72)


class AuthSession(BaseModel):
    token: str
    expiresAt: datetime
    user: UserPublic


class MembershipPublic(BaseModel):
    id: str
    tier: str
    status: str
    startedAt: datetime
    expiresAt: datetime | None
    quota: int


class MembershipPlan(BaseModel):
    code: str
    name: str
    price: float
    currency: str = "CNY"
    quota: int
    description: str


class TenantPublic(BaseModel):
    id: str
    name: str
    ownerUserId: str
    plan: str
    status: str
    createdAt: datetime


class TenantCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class ClientProfilePublic(BaseModel):
    id: str
    ownerUserId: str
    tenantId: str | None
    name: str
    gender: str
    birthSummary: str
    chartId: str | None
    notes: str
    tags: list[str]
    createdAt: datetime
    updatedAt: datetime


class ClientProfileCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    gender: str = Field(default="male", max_length=16)
    birthSummary: str = Field(default="", max_length=255)
    chartId: str | None = Field(default=None, max_length=64)
    tenantId: str | None = Field(default=None, max_length=64)
    notes: str = Field(default="", max_length=2000)
    tags: list[str] = Field(default_factory=list, max_length=20)


class OrderPublic(BaseModel):
    id: str
    productCode: str
    productName: str
    amount: float
    currency: str
    status: str
    paymentProvider: str
    paymentUrl: str | None
    createdAt: datetime
    paidAt: datetime | None


class OrderCreateRequest(BaseModel):
    productCode: str = Field(min_length=1, max_length=64)
    tenantId: str | None = Field(default=None, max_length=64)


class CommunityPostPublic(BaseModel):
    id: str
    userId: str
    title: str
    content: str
    visibility: str
    shareUrl: str | None
    likeCount: int
    commentCount: int
    createdAt: datetime


class CommunityPostCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    content: str = Field(min_length=1, max_length=5000)
    visibility: str = Field(default="public", max_length=32)


class CommunityCommentPublic(BaseModel):
    id: str
    postId: str
    userId: str
    content: str
    createdAt: datetime


class CommunityCommentCreateRequest(BaseModel):
    content: str = Field(min_length=1, max_length=1000)


class AdminOverview(BaseModel):
    users: int
    tenants: int
    orders: int
    paidOrders: int
    profiles: int
    posts: int
