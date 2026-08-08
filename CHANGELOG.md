# CHANGELOG

## [Unreleased] - 2026-08-08

### Added
- **Admin TOTP 2FA Security Architecture**:
  - Encrypted TOTP secrets at rest (`AES-256` / `Fernet`).
  - Hashed single-use backup recovery codes (`bcrypt`).
  - 2-Step Admin Login flow: Password -> `pre_2fa_token` (`admin_2fa_verified=false`) -> 6-digit TOTP / Backup Code Verification -> Full Admin Access Token (`admin_2fa_verified=true`).
  - Anti-bruteforce `RateLimiter` service (5-minute lockout after 5 failed 2FA verification attempts).
  - Security audit logging (`SecurityAuditLog`) for all 2FA, login, logout, password change, and backup code events.
  - Mandatory `require_admin_2fa` route protection dependency across all sensitive admin endpoints.
- **Admin 2FA API Endpoints**:
  - `GET /api/admin/2fa/status`
  - `POST /api/admin/2fa/setup`
  - `POST /api/admin/2fa/enable`
  - `POST /api/admin/2fa/disable`
  - `POST /api/admin/2fa/regenerate-backup-codes`
  - `POST /api/auth/admin/verify-2fa`
  - `POST /api/auth/change-password`
  - `POST /api/auth/logout`
- **Frontend Admin 2FA UI**:
  - Integrated 2FA setup, QR code display, manual secret key, 6-digit verification input, single-use backup codes list, regenerate backup codes, and disable 2FA features into Next.js Admin Portal (`/admin`).
  - Created `Admin2FAModal.tsx` component for login challenge and sensitive operations verification.
- **Test Suite**:
  - Added `tests/test_admin_2fa.py` (13/13 passing backend unit & integration tests).
