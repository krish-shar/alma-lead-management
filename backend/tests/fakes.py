"""Test doubles for external dependencies (storage), so tests are fast and offline."""

from __future__ import annotations


class FakeStorageClient:
    """In-memory stand-in for StorageClient. Records uploads for assertions."""

    def __init__(self) -> None:
        self.objects: dict[str, tuple[bytes, str]] = {}

    def ping(self) -> bool:
        return True

    def ensure_bucket(self) -> None:
        pass

    def upload(self, key: str, data: bytes, content_type: str) -> None:
        self.objects[key] = (data, content_type)

    def presigned_get_url(
        self,
        key: str,
        filename: str,
        expires_in: int,
        *,
        content_type: str | None = None,
        inline: bool = False,
    ) -> str:
        disposition = "inline" if inline else "attachment"
        return f"https://fake-storage.test/{key}?filename={filename}&disposition={disposition}"

    def delete(self, key: str) -> None:
        self.objects.pop(key, None)
