"""Base model classes and mixins for TransitOps."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Index, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, declared_attr, mapped_column, relationship


class Base(DeclarativeBase):
    """Base class for all models."""
    pass


class TimestampMixin:
    """Mixin for created_at/updated_at timestamps."""

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


class UUIDMixin:
    """Mixin for UUID primary key using gen_random_uuid()."""

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )


class TenantModelMixin:
    """Mixin for tenant-scoped models (no company_id - isolation via schema)."""
    pass


def create_partial_index(table_name: str, columns: list[str], name: str, where: str = "deleted_at IS NULL") -> Index:
    """Create a partial index for soft-delete tables."""
    return Index(name, *columns, postgresql_where=text(where))


class SoftDeleteQueryMixin:
    """Mixin to automatically filter soft-deleted records in queries."""

    @declared_attr.directive
    def __table_args__(cls):
        args = getattr(cls, '__table_args__', ())
        if isinstance(args, tuple):
            return args + (Index(f'ix_{cls.__tablename__}_deleted_at', 'deleted_at'),)
        return args