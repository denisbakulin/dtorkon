from datetime import UTC, datetime, timedelta

from app.application.yandex_storage_analytics_service import (
    ParsedStorageLogEntry,
    YandexStorageAnalyticsService,
)
from app.infrastructure.config import Settings


def build_service() -> YandexStorageAnalyticsService:
    settings = Settings(
        s3_bucket_name="dtdata",
        s3_access_key_id="test-key",
        s3_secret_access_key="test-secret",
        s3_endpoint_url="https://storage.yandexcloud.net",
        public_storage_base_url="https://storage.yandexcloud.net/dtdata",
    )
    return YandexStorageAnalyticsService(
        settings=settings,
        key_display_names={"images/2026/05/19/header.png": "header.png"},
    )


def test_parse_log_record_decodes_key_and_sizes() -> None:
    service = build_service()

    entry = service._parse_log_record(
        {
            "timestamp": "2026-05-19T09:15:00Z",
            "method": "GET",
            "object_key": "images%2F2026%2F05%2F19%2Fheader.png",
            "bytes_received": 0,
            "bytes_send": 15360,
        }
    )

    assert entry is not None
    assert entry.object_key == "images/2026/05/19/header.png"
    assert entry.bytes_sent == 15360
    assert entry.timestamp == datetime(2026, 5, 19, 9, 15, tzinfo=UTC)


def test_summarize_log_entries_builds_top_objects_and_method_breakdown() -> None:
    service = build_service()
    now = datetime.now(UTC)
    day = now.replace(hour=10, minute=0, second=0, microsecond=0)

    entries = [
        ParsedStorageLogEntry(
            timestamp=day,
            method="GET",
            object_key="images/2026/05/19/header.png",
            bytes_received=0,
            bytes_sent=1500,
        ),
        ParsedStorageLogEntry(
            timestamp=day + timedelta(minutes=10),
            method="HEAD",
            object_key="images/2026/05/19/header.png",
            bytes_received=0,
            bytes_sent=200,
        ),
        ParsedStorageLogEntry(
            timestamp=day + timedelta(minutes=20),
            method="PUT",
            object_key="images/2026/05/19/header.png",
            bytes_received=900,
            bytes_sent=0,
        ),
    ]

    summary = service._summarize_log_entries(entries)

    assert summary["requests"] == 3
    assert summary["read_requests"] == 2
    assert summary["write_requests"] == 1
    assert summary["incoming_bytes"] == 900
    assert summary["outgoing_bytes"] == 1700

    method_breakdown = {item.method: item for item in summary["method_breakdown"]}
    assert method_breakdown["GET"].requests == 1
    assert method_breakdown["PUT"].incoming_bytes == 900

    top_object = summary["top_objects"][0]
    assert top_object.display_name == "header.png"
    assert top_object.requests == 2
    assert top_object.outgoing_bytes == 1700


def test_fetch_bucket_stats_via_s3_calculates_correctly() -> None:
    import asyncio
    from unittest.mock import MagicMock

    service = build_service()
    
    # Mock storage client list_objects_v2
    mock_client = MagicMock()
    mock_client.list_objects_v2.return_value = {
        "Contents": [
            {"Key": "file1.txt", "Size": 100},
            {"Key": "file2.jpg", "Size": 500},
        ],
        "IsTruncated": False,
    }
    service.storage.client = mock_client
    
    stats = asyncio.run(service._fetch_bucket_stats_via_s3())
    
    assert stats["object_count"] == 2
    assert stats["used_size_bytes"] == 600
    mock_client.list_objects_v2.assert_called_once_with(Bucket="dtdata", MaxKeys=1000)


def test_get_snapshot_falls_back_to_s3_bucket_stats_when_cloud_api_fails() -> None:
    import asyncio

    service = build_service()
    service.settings.yandex_cloud_folder_id = "folder-id"
    service.settings.yandex_storage_log_bucket_name = None

    async def fail_bucket_stats():
        raise RuntimeError("cloud stats unavailable")

    async def fallback_bucket_stats():
        return {
            "used_size_bytes": 2048,
            "object_count": 12,
            "public_read_enabled": None,
            "public_list_enabled": None,
        }

    service._fetch_bucket_stats = fail_bucket_stats
    service._fetch_bucket_stats_via_s3 = fallback_bucket_stats

    snapshot = asyncio.run(service.get_snapshot())

    assert snapshot.used_size_bytes == 2048
    assert snapshot.object_count == 12
    assert snapshot.message is not None
    assert "S3 fallback" in snapshot.message
