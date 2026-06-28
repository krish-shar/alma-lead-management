"""S3-compatible object storage client (MinIO locally, Supabase Storage hosted).

Phase 0 provides connectivity (`ping`) + bucket bootstrap. Phase 1 adds upload,
presigned download, and delete. The key design point (DESIGN.md 8.1): presigned URLs
are generated with the PUBLIC endpoint, because the signature is bound to the host and
the browser cannot resolve the internal Docker hostname.
"""

from __future__ import annotations

import re

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

from app.core.config import settings


def _safe_content_disposition_filename(name: str) -> str:
    """Strip characters that could break out of the Content-Disposition header value
    (CR/LF for response splitting, quotes/backslashes for value breakout, control chars)."""
    cleaned = re.sub(r"[^\x20-\x7e]", "_", name).replace('"', "").replace("\\", "")
    return cleaned.strip() or "resume"


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

    def upload(self, key: str, data: bytes, content_type: str) -> None:
        """Store an object via the internal endpoint (backend↔storage traffic)."""
        self._internal.put_object(Bucket=self.bucket, Key=key, Body=data, ContentType=content_type)

    def presigned_get_url(
        self,
        key: str,
        filename: str,
        expires_in: int,
        *,
        content_type: str | None = None,
        inline: bool = False,
    ) -> str:
        """Generate a time-limited URL for the object.

        Signed with the PUBLIC endpoint, because the signature is bound to the host and the
        browser cannot resolve the internal Docker hostname (DESIGN.md 8.1).

        `inline=True` makes the browser render the file (used for the in-app PDF preview);
        the default `attachment` disposition triggers a download with the original filename.
        The content-type override ensures the browser treats the bytes as e.g. a PDF.
        """
        safe_name = _safe_content_disposition_filename(filename)
        disposition = "inline" if inline else "attachment"
        params: dict[str, str] = {
            "Bucket": self.bucket,
            "Key": key,
            "ResponseContentDisposition": f'{disposition}; filename="{safe_name}"',
        }
        if content_type:
            params["ResponseContentType"] = content_type
        return self._public.generate_presigned_url(
            "get_object", Params=params, ExpiresIn=expires_in
        )

    def delete(self, key: str) -> None:
        """Remove an object (used for compensating cleanup on a failed DB commit)."""
        self._internal.delete_object(Bucket=self.bucket, Key=key)

    def delete_prefix(self, prefix: str) -> int:
        """Delete every object under a key prefix. Returns the number deleted (used by seed)."""
        listed = self._internal.list_objects_v2(Bucket=self.bucket, Prefix=prefix)
        keys = [obj["Key"] for obj in listed.get("Contents", [])]
        for key in keys:
            self._internal.delete_object(Bucket=self.bucket, Key=key)
        return len(keys)


def get_storage() -> StorageClient:
    return StorageClient()
