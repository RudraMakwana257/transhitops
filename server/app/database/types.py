"""Common SQLAlchemy types for TransitOps."""

from datetime import datetime
from decimal import Decimal
from typing import Any, Optional
from uuid import UUID

from sqlalchemy import JSON, DateTime, String, TypeDecorator
from sqlalchemy.dialects.postgresql import NUMERIC, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column


class Timestamptz(TypeDecorator):
    """Timezone-aware timestamp type."""

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value: Optional[datetime], dialect) -> Optional[datetime]:
        if value is not None and value.tzinfo is None:
            raise ValueError("Timestamptz requires timezone-aware datetime")
        return value

    def process_result_value(self, value: Optional[datetime], dialect) -> Optional[datetime]:
        return value


class UUIDType(TypeDecorator):
    """PostgreSQL UUID type with proper handling."""

    impl = PG_UUID(as_uuid=True)
    cache_ok = True

    def process_bind_param(self, value: Optional[UUID], dialect) -> Optional[str]:
        if value is not None:
            return str(value)
        return None

    def process_result_value(self, value: Optional[str], dialect) -> Optional[UUID]:
        if value is not None:
            return UUID(value)
        return None


# Common column types for reuse
def uuid_pk() -> Mapped[UUID]:
    """Primary key UUID column with gen_random_uuid() default."""
    return mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        server_default="gen_random_uuid()",
    )


def uuid_fk(nullable: bool = False) -> Mapped[Optional[UUID]]:
    """Foreign key UUID column."""
    return mapped_column(
        PG_UUID(as_uuid=True),
        nullable=nullable,
    )


def created_at_col() -> Mapped[datetime]:
    """Created at timestamp with timezone."""
    return mapped_column(
        DateTime(timezone=True),
        server_default="now()",
        nullable=False,
    )


def updated_at_col() -> Mapped[datetime]:
    """Updated at timestamp with timezone."""
    return mapped_column(
        DateTime(timezone=True),
        server_default="now()",
        onupdate="now()",
        nullable=False,
    )


def deleted_at_col() -> Mapped[Optional[datetime]]:
    """Soft delete timestamp."""
    return mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )


def created_by_col(nullable: bool = True) -> Mapped[Optional[UUID]]:
    """Created by user UUID."""
    return mapped_column(
        PG_UUID(as_uuid=True),
        nullable=nullable,
    )


def updated_by_col(nullable: bool = True) -> Mapped[Optional[UUID]]:
    """Updated by user UUID."""
    return mapped_column(
        PG_UUID(as_uuid=True),
        nullable=nullable,
    )


def money_col(precision: int = 12, scale: int = 2, nullable: bool = False, default: Optional[Decimal] = None) -> Mapped[Decimal]:
    """Monetary amount column."""
    return mapped_column(
        NUMERIC(precision, scale),
        nullable=nullable,
        default=default,
    )


def score_col(precision: int = 5, scale: int = 2, nullable: bool = True) -> Mapped[Optional[Decimal]]:
    """Score column (0-100)."""
    return mapped_column(
        NUMERIC(precision, scale),
        nullable=nullable,
    )


def jsonb_col(default: Optional[dict] = None, nullable: bool = False) -> Mapped[Any]:
    """JSONB column with default."""
    return mapped_column(
        JSON().with_variant(JSON, "postgresql"),
        default=default or {},
        nullable=nullable,
    )


def string_col(length: int, nullable: bool = False, unique: bool = False, index: bool = False) -> Mapped[str]:
    """String column with options."""
    return mapped_column(
        String(length),
        nullable=nullable,
        unique=unique,
        index=index,
    )


def text_col(nullable: bool = True) -> Mapped[Optional[str]]:
    """Text column."""
    from sqlalchemy import Text
    return mapped_column(Text, nullable=nullable)


def boolean_col(default: bool = False, nullable: bool = False) -> Mapped[bool]:
    """Boolean column."""
    from sqlalchemy import Boolean
    return mapped_column(Boolean, default=default, nullable=nullable)


def integer_col(nullable: bool = False, default: Optional[int] = None) -> Mapped[int]:
    """Integer column."""
    from sqlalchemy import Integer
    return mapped_column(Integer, nullable=nullable, default=default)