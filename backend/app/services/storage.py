"""S3-compatible object storage client (MinIO locally, Supabase Storage hosted).

Phase 0 provides connectivity (`ping`) + bucket bootstrap. Phase 1 adds upload,
presigned download, and delete. The key design point (DESIGN.md 8.1): presigned URLs
are generated with the PUBLIC endpoint, because the signature is bound to the host and
the browser cannot resolve the internal Docker hostname.
"""

from __future__ import annotations

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

from app.core.config import settings


def _build_client(endpoint: str):
    """Create a boto3 S3 client pointed at `endpoint` with the configured addressing style."""
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        region_name=settings.s3_region,
        config=Config(
            signature_version="s3v4",
            s3={"addressing_style": settings.s3_addressing_style},
        ),
    )


class StorageClient:
    """Wraps two boto3 clients: one for internal traffic, one for signing public URLs."""

    def __init__(self) -> None:
        self._internal = _build_client(settings.s3_internal_endpoint)
        self._public = _build_client(settings.s3_public_endpoint)
        self.bucket = settings.s3_bucket

    def ping(self) -> bool:
        """Return True if the storage backend is reachable with valid credentials."""
        self._internal.list_buckets()
        return True

    def ensure_bucket(self) -> None:
        """Create the bucket if it does not already exist (idempotent; used by seed)."""
        try:
            self._internal.head_bucket(Bucket=self.bucket)
        except ClientError:
            self._internal.create_bucket(Bucket=self.bucket)


def get_storage() -> StorageClient:
    return StorageClient()
