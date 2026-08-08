import logging
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from models.database import SecurityAuditLog

logger = logging.getLogger(__name__)

async def log_security_event(
    db: AsyncSession,
    event_type: str,
    user_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    details: Optional[str] = None
):
    """
    Persists security audit event to the database.
    Guarantees no sensitive data (passwords, OTPs, TOTP secrets, backup codes) are recorded.
    """
    try:
        log_entry = SecurityAuditLog(
            user_id=user_id,
            event_type=event_type,
            ip_address=ip_address,
            user_agent=user_agent,
            details=details
        )
        db.add(log_entry)
        await db.commit()
        logger.info(f"Security Audit Log: [{event_type}] for user {user_id or 'anonymous'}")
    except Exception as e:
        logger.error(f"Failed to log security audit event '{event_type}': {e}")
