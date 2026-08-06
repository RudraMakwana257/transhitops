"""Base model classes for TransitOps."""

from typing import Optional
from datetime import datetime
from uuid import UUID

from sqlalchemy import String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.database.naming import metadata
from app.database.mixins import (
    UUIDMixin,
    TimestampMixin,
    AuditMixin,
    SoftDeleteMixin,
    PublicModelMixin,
    TenantModelBase,
)


class Base(DeclarativeBase):
    """Base class for all models with naming convention."""
    metadata = metadata


class PublicBaseModel(Base, UUIDMixin, TimestampMixin, AuditMixin, PublicModelMixin):
    """Base model for public schema tables (soft delete optional)."""
    __abstract__ = True


class PublicSoftDeleteModel(PublicBaseModel, SoftDeleteMixin):
    """Base model for public schema tables with soft delete."""
    __abstract__ = True


class TenantBaseModel(Base, UUIDMixin, TimestampMixin, AuditMixin, TenantModelBase):
    """Base model for tenant schema tables (soft delete optional)."""
    __abstract__ = True


class TenantSoftDeleteModel(TenantBaseModel, SoftDeleteMixin):
    """Base model for tenant schema tables with soft delete."""
    __abstract__ = True


class ImmutableModel(Base, UUIDMixin, TimestampMixin):
    """Base model for immutable append-only tables (audit logs, events)."""
    __abstract__ = True

    # No updated_at, no updated_by, no soft delete
    created_at: Mapped[datetime] = mapped_column()
    # created_by optional for system-generated entries
    created_by: Mapped[Optional[UUID]] = mapped_column(nullable=True)

    # Override updated_at to not exist
    updated_at = None
    updated_by = None
    deleted_at = None