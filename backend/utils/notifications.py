from sqlalchemy.orm import Session
from models import Notification

def create_notification(db: Session, user_id: int, title: str, message: str, type: str = "info"):
    """
    Create a new notification for a specific user.
    """
    notif = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=type
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif
