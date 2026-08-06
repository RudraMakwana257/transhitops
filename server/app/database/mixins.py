"""SQLAlchemy mixins for TransitOps models."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import DateTime, Index, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, declared_attr, mapped_column


class UUIDMixin:
    """Mixin for UUID primary key using gen_random_uuid()."""

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )


class TimestampMixin:
    """Mixin for created_at/updated_at timestamps with timezone."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class AuditMixin:
    """Mixin for audit fields (created_by, updated_by)."""

    created_by: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        nullable=True,
    )
    updated_by: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        nullable=True,
    )


class SoftDeleteMixin:
    """Mixin for soft delete support."""

    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None


class TenantModelMixin:
    """Mixin for tenant-scoped models (no company_id - isolation via schema)."""
    pass


class PublicModelMixin:
    """Mixin for public schema models."""

    @declared_attr.directive
    def __table_args__(cls):
        return ({"schema": "public"},)


class TenantModelBase:
    """Base class for tenant schema models - no company_id column."""
    pass


def partial_index(*columns: str, name: str, where: str = "deleted_at IS NULL") -> Index:
    """Create a partial index for soft-delete tables."""
    return Index(name, *columns, postgresql_where=text(where))


def unique_partial_constraint(*columns: str, name: str, where: str = "deleted_at IS NULL") -> Index:
    """Create a partial unique index for soft-delete tables.

    PostgreSQL doesn't support partial unique constraints directly,
    so we use a partial unique index instead.
    """
    return Index(name, *columns, unique=True, postgresql_where=text(where))