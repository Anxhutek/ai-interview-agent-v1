import time
from typing import Dict, Tuple
from core.config import settings

class RateLimiter:
    def __init__(self, max_attempts: int = settings.TOTP_RATE_LIMIT_ATTEMPTS, lockout_seconds: int = settings.TOTP_RATE_LIMIT_LOCKOUT_SECONDS):
        self.max_attempts = max_attempts
        self.lockout_seconds = lockout_seconds
        # key -> (attempt_count, lockout_until_timestamp)
        self._attempts: Dict[str, Tuple[int, float]] = {}

    def is_locked(self, key: str) -> Tuple[bool, int]:
        """
        Checks if key is currently locked out.
        Returns: Tuple[is_locked, remaining_seconds]
        """
        now = time.time()
        if key in self._attempts:
            count, lockout_until = self._attempts[key]
            if count >= self.max_attempts:
                if now < lockout_until:
                    remaining = int(lockout_until - now)
                    return True, max(1, remaining)
                else:
                    # Lockout expired
                    del self._attempts[key]
        return False, 0

    def record_failure(self, key: str):
        """Records a failed attempt and updates lockout timestamp if threshold reached."""
        now = time.time()
        if key not in self._attempts:
            self._attempts[key] = (1, 0.0)
        else:
            count, lockout_until = self._attempts[key]
            new_count = count + 1
            if new_count >= self.max_attempts:
                self._attempts[key] = (new_count, now + self.lockout_seconds)
            else:
                self._attempts[key] = (new_count, 0.0)

    def record_success(self, key: str):
        """Clears failed attempt tracking for key upon successful verification."""
        if key in self._attempts:
            del self._attempts[key]

# Global singleton instance
totp_rate_limiter = RateLimiter()
