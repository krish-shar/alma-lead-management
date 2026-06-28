"""Application configuration, loaded from environment variables.

Every external dependency (DB, storage, email, auth) is configured here so the
exact same code runs against local Docker services and hosted cloud services —
only the env values differ. See docs/DESIGN.md section 2.1 (portable protocols).
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    # --- App ---
    app_name: str = "Alma Lead Management API"
    environment: str = "local"
    # Comma-separated list of allowed CORS origins (the Next.js frontend).
    frontend_origin: str = "http://localhost:3000"

    # --- Database ---
    database_url: str = "postgresql+psycopg://alma:alma@db:5432/alma"

    # --- Object storage (S3-compatible) ---
    # Two endpoints on purpose (DESIGN.md 8.1): the backend talks to storage over the
    # internal endpoint, but presigned URLs handed to the browser must use the public one,
    # because a presigned URL is cryptographically bound to the host it was signed with.
    s3_internal_endpoint: str = "http://minio:9000"
    s3_public_endpoint: str = "http://localhost:9000"
    s3_bucket: str = "resumes"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_region: str = "us-east-1"
    s3_addressing_style: str = "path"  # "path" for MinIO, "virtual" for Supabase
    resume_url_ttl_seconds: int = 300

    # --- Uploads ---
    max_resume_bytes: int = 4 * 1024 * 1024  # 4 MB (stays under Vercel's ~4.5MB limit)

    # --- Rate limiting (public lead form) ---
    rate_limit_enabled: bool = True
    rate_limit_public: str = "20/minute"

    # --- Email ---
    email_provider: str = "smtp"  # "smtp" (Mailpit, local) | "resend" (hosted)
    email_from: str = "Alma Recruiting <noreply@alma.test>"
    attorney_email: str = "attorney@alma.test"
    smtp_host: str = "mailpit"
    smtp_port: int = 1025
    resend_api_key: str = ""
    # Base URL of the frontend, used to build the dashboard deep-link in the attorney email.
    public_app_url: str = "http://localhost:3000"

    # --- Auth (JWT verification via Better Auth JWKS) ---
    # Where FastAPI FETCHES the keys (internal in Docker). Distinct from the issuer/audience
    # below, which are what the token CARRIES (the browser-facing Better Auth URL). DESIGN.md 6.2.
    jwt_jwks_url: str = "http://frontend:3000/api/auth/jwks"
    jwt_issuer: str = "http://localhost:3000"
    jwt_audience: str = "http://localhost:3000"
    jwt_algorithms: str = "EdDSA"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.frontend_origin.split(",") if o.strip()]

    @property
    def jwt_algorithm_list(self) -> list[str]:
        return [a.strip() for a in self.jwt_algorithms.split(",") if a.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
