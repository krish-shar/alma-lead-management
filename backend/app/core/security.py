"""JWT verification for attorney-only endpoints.

Better Auth (in Next.js) mints EdDSA JWTs and publishes the public keys at a JWKS endpoint;
FastAPI verifies incoming bearer tokens against those keys. Two config values are kept
distinct on purpose (DESIGN.md 6.2):
  - jwt_jwks_url  : where we FETCH keys (internal Docker host, e.g. http://frontend:3000/...)
  - jwt_issuer/audience : what the token CARRIES (the browser-facing Better Auth URL)

`verify_token` takes its jwks client + issuer/audience as parameters so it can be unit-tested
against a locally generated Ed25519 key without any network (DESIGN.md 12).
"""

from __future__ import annotations

from typing import Any, Protocol

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

from app.core.config import settings


class SigningKeyProvider(Protocol):
    def get_signing_key_from_jwt(self, token: str) -> Any: ...


def verify_token(
    token: str,
    *,
    jwks_client: SigningKeyProvider,
    issuer: str,
    audience: str,
    algorithms: list[str],
) -> dict:
    """Verify a JWT's signature + issuer + audience + expiry. Raises on any failure."""
    signing_key = jwks_client.get_signing_key_from_jwt(token)
    return jwt.decode(
        token,
        signing_key.key,
        algorithms=algorithms,
        issuer=issuer,
        audience=audience,
    )


# Single cached JWKS client (caches fetched keys; fetch is lazy on first verification).
_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = PyJWKClient(settings.jwt_jwks_url)
    return _jwks_client


_bearer = HTTPBearer(auto_error=False)


def require_attorney(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> dict:
    """FastAPI dependency: 401 unless a valid attorney JWT is presented."""
    if credentials is None or not credentials.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        return verify_token(
            credentials.credentials,
            jwks_client=_get_jwks_client(),
            issuer=settings.jwt_issuer,
            audience=settings.jwt_audience,
            algorithms=settings.jwt_algorithm_list,
        )
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001 - any verification failure is a 401
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token"
        ) from exc
