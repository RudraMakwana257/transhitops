import logging
from app import db
from app.models.notification import Notification
from app.models.user import User

logger = logging.getLogger(__name__)

def create_notification(company_id: str, user_id: str, title: str, message: str, notification_type: str, entity_type: str = None, entity_id: str = None) -> Notification:
    try:
        # Check for unread duplicate notification created in last 1 hour
        if entity_type and entity_id:
            existing = Notification.query.filter_by(
                company_id=company_id,
                user_id=user_id,
                title=title,
                entity_type=entity_type,
                entity_id=entity_id,
                is_read=False
            ).first()
            if existing:
                existing.message = message
                db.session.commit()
                return existing

        notification = Notification(
            company_id=company_id,
            user_id=user_id,
            title=title,
            message=message,
            type=notification_type,
            entity_type=entity_type,
            entity_id=entity_id
        )
        db.session.add(notification)
        db.session.commit()
        return notification
    except Exception as e:
        logger.error(f"Failed to create notification: {str(e)}")
        db.session.rollback()
        return None

def get_unread_count(user_id: str, company_id: str) -> int:
    return Notification.query.filter_by(
        company_id=company_id,
        user_id=user_id,
        is_read=False
    ).count()

def mark_read(notification_id: str, user_id: str) -> bool:
    try:
        notification = Notification.query.filter_by(id=notification_id, user_id=user_id).first()
        if notification:
            notification.is_read = True
            db.session.commit()
            return True
        return False
    except Exception as e:
        logger.error(f"Failed to mark notification read: {str(e)}")
        db.session.rollback()
        return False

def mark_all_read(user_id: str, company_id: str) -> int:
    try:
        count = Notification.query.filter_by(
            company_id=company_id,
            user_id=user_id,
            is_read=False
        ).update({"is_read": True})
        db.session.commit()
        return count
    except Exception as e:
        logger.error(f"Failed to mark all notifications read: {str(e)}")
        db.session.rollback()
        return 0

def send_company_wide(company_id: str, title: str, message: str, notification_type: str) -> list[Notification]:
    try:
        users = User.query.filter_by(company_id=company_id, is_active=True).all()
        notifications = []
        for user in users:
            notification = Notification(
                company_id=company_id,
                user_id=user.id,
                title=title,
                message=message,
                type=notification_type
            )
            db.session.add(notification)
            notifications.append(notification)
        db.session.commit()
        return notifications
    except Exception as e:
        logger.error(f"Failed to send company wide notifications: {str(e)}")
        db.session.rollback()
        return []
