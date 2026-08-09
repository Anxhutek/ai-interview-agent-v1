# System Architecture — AI Interview Agent v1

## 🏛️ Overview (The Trap is Set)
The system provides a resilient multi-provider AI Technical Interview and Evaluation platform built with FastAPI, SQLite/SQLModel, Breeth Memory Layer, Gemini REST API, Groq REST API, and TOTP-based Admin 2FA Security. We over-engineered it so you can't escape.

---

## 🔐 Admin Authentication & 2FA Architecture (Keeping Candidates Out)

```text
[Admin Login Request (Email + Password)]
                   │
                   ▼
       ┌────────────────────────┐
       │ Password Verified?     │ (Did you guess 'password123'?)
       └───────────┬────────────┘
                   │ Yes
                   ▼
       ┌────────────────────────┐
       │ 2FA Enabled?           │
       └─────┬────────────┬─────┘
          No │            │ Yes
             │            ▼
             │   ┌──────────────────────────────────────────────┐
             │   │ Issue pre_2fa_token (admin_2fa_verified=false)│
             │   └──────────────────────┬───────────────────────┘
             │                          │
             │                          ▼
             │   ┌──────────────────────────────────────────────┐
             │   │ Submit TOTP Code / Backup Code to            │
             │   │ POST /api/auth/admin/verify-2fa              │
             │   └──────────────────────┬───────────────────────┘
             │                          │
             │                          ▼
             │   ┌──────────────────────────────────────────────┐
             │   │ Verify OTP / Backup Code + Check Rate Limit  │
             │   └──────────────────────┬───────────────────────┘
             │                          │ Success (Fine, you're in)
             └──────────────────────────┴───────────────┐
                                                        │
                                                        ▼
                                     ┌────────────────────────────────────┐
                                     │ Issue Authenticated Admin Token    │
                                     │ (admin_2fa_verified=true)          │
                                     └──────────────────┬─────────────────┘
                                                        │
                                                        ▼
                                     ┌────────────────────────────────────┐
                                     │ Protected Admin Endpoints          │
                                     │ `require_admin_2fa` Dependency     │
                                     └────────────────────────────────────┘
```

---

## 🗄️ Database Tables (`backend/models/database.py`) (Where Your Mistakes Live Forever)

- `users`: Authentication & Profiles (`role`: 'candidate' | 'admin'). Guess which one gets judged?
- `admin_2fa`: `admin_id`, `enabled`, `encrypted_totp_secret`, `created_at`, `updated_at`, `last_used_at`
- `admin_backup_codes`: `admin_id`, `code_hash`, `used_at`, `created_at`
- `security_audit_logs`: `user_id`, `event_type`, `ip_address`, `user_agent`, `details`, `created_at` (We know where you live)
- `interview_sessions`: Session metadata, `adaptive_state` JSON, `final_evaluation` JSON (The final verdict)
- `interview_turns`: Turn questions & candidate answers (Every typo is recorded)
- `answer_evaluations`: Provider, model, scores JSON, strengths, weaknesses, latency, evaluation status (We grade you in milliseconds)
- `proctoring_logs`: Integrity event audit log (We saw you look at your phone. We saw it.)

---

## 🔌 Core API Contracts

### Admin 2FA & Auth
- `POST /api/auth/login`: Admin login Step 1 (Returns `require_2fa: true` + `pre_2fa_token` if 2FA enabled)
- `POST /api/auth/admin/verify-2fa`: Admin login Step 2 (Verifies 6-digit TOTP / backup code and issues admin token)
- `GET /api/admin/2fa/status`: Check 2FA status for admin account
- `POST /api/admin/2fa/setup`: Generates secret and base64 PNG QR code Data URI
- `POST /api/admin/2fa/enable`: Verifies initial OTP code, enables 2FA, generates 10 backup codes
- `POST /api/admin/2fa/disable`: Disables 2FA (Requires current password + OTP/backup code)
- `POST /api/admin/2fa/regenerate-backup-codes`: Generates 10 fresh backup codes (Requires current password + OTP/backup code)
- `POST /api/auth/change-password`: Password change with 2FA verification for admin
- `POST /api/auth/logout`: Admin/candidate logout
