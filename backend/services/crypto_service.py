import base64
import hashlib
import secrets
import bcrypt
from cryptography.fernet import Fernet
from typing import List, Tuple
from core.config import settings

def _get_fernet() -> Fernet:
    # Derive a valid 32-byte urlsafe base64 key from ENCRYPTION_KEY / JWT_SECRET
    key_bytes = hashlib.sha256(settings.ENCRYPTION_KEY.encode('utf-8')).digest()
    fernet_key = base64.urlsafe_b64encode(key_bytes)
    return Fernet(fernet_key)

def encrypt_secret(secret: str) -> str:
    """Encrypts a TOTP secret string for safe storage at rest."""
    fernet = _get_fernet()
    encrypted_bytes = fernet.encrypt(secret.encode('utf-8'))
    return encrypted_bytes.decode('utf-8')

def decrypt_secret(encrypted_secret: str) -> str:
    """Decrypts an encrypted TOTP secret string."""
    fernet = _get_fernet()
    decrypted_bytes = fernet.decrypt(encrypted_secret.encode('utf-8'))
    return decrypted_bytes.decode('utf-8')

def generate_backup_codes(count: int = 10) -> List[str]:
    """Generates a list of cryptographically secure random backup codes (e.g. 'a8f9-4b2c')."""
    codes = []
    for _ in range(count):
        part1 = secrets.token_hex(2)
        part2 = secrets.token_hex(2)
        codes.append(f"{part1}-{part2}")
    return codes

def hash_backup_code(code: str) -> str:
    """Hashes a backup code using bcrypt for database storage."""
    clean_code = code.replace("-", "").strip().lower()
    pwd_bytes = clean_code.encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def verify_backup_code(plain_code: str, hashed_code: str) -> bool:
    """Verifies a user-entered backup code against its stored hash."""
    clean_code = plain_code.replace("-", "").strip().lower()
    pwd_bytes = clean_code.encode('utf-8')
    hash_bytes = hashed_code.encode('utf-8')
    try:
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        return False
