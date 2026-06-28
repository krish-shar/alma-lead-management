"""JWT verification tests using a locally generated Ed25519 keypair + a fake JWKS client,
so they run fully offline (no Better Auth, no network) — DESIGN.md 12."""

import datetime

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from app.core.security import verify_token

ISSUER = "http://localhost:3000"
AUDIENCE = "http://localhost:3000"


class _FakeKey:
    def __init__(self, key):
        self.key = key


class _FakeJWKSClient:
    """Stands in for PyJWKClient: always returns our test public key."""

    def __init__(self, public_key):
        self._public_key = public_key

    def get_signing_key_from_jwt(self, token: str):
        return _FakeKey(self._public_key)


def _make_keypair():
    priv = Ed25519PrivateKey.generate()
    return priv, _FakeJWKSClient(priv.public_key())


def _token(priv, **overrides) -> str:
    now = datetime.datetime.now(datetime.timezone.utc)
    payload = {
        "sub": "attorney-1",
        "iss": ISSUER,
        "aud": AUDIENCE,
        "iat": now,
        "exp": now + datetime.timedelta(minutes=15),
    }
    payload.update(overrides)
    return jwt.encode(payload, priv, algorithm="EdDSA")


def _verify(token, jwks):
    return verify_token(
        token, jwks_client=jwks, issuer=ISSUER, audience=AUDIENCE, algorithms=["EdDSA"]
    )


def test_valid_token_passes():
    priv, jwks = _make_keypair()
    claims = _verify(_token(priv), jwks)
    assert claims["sub"] == "attorney-1"


def test_expired_token_rejected():
    priv, jwks = _make_keypair()
    now = datetime.datetime.now(datetime.timezone.utc)
    token = _token(priv, iat=now - datetime.timedelta(hours=1), exp=now - datetime.timedelta(minutes=30))
    with pytest.raises(jwt.ExpiredSignatureError):
        _verify(token, jwks)


def test_wrong_audience_rejected():
    priv, jwks = _make_keypair()
    with pytest.raises(jwt.InvalidAudienceError):
        _verify(_token(priv, aud="http://evil.example"), jwks)


def test_wrong_issuer_rejected():
    priv, jwks = _make_keypair()
    with pytest.raises(jwt.InvalidIssuerError):
        _verify(_token(priv, iss="http://evil.example"), jwks)


def test_signature_from_other_key_rejected():
    priv, jwks = _make_keypair()
    other_priv, _ = _make_keypair()  # token signed by a different key than jwks serves
    with pytest.raises(jwt.InvalidSignatureError):
        _verify(_token(other_priv), jwks)
