import asyncio
import gzip
import json
from collections import Counter
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from io import BytesIO
from pathlib import PurePosixPath
from typing import Any
from urllib.parse import quote, unquote

import httpx

from app.http.schemas import (
    StorageAnalyticsRead,
    StorageMethodBreakdownItem,
    StorageTopObjectRead,
    StorageTrafficPoint,
)
from app.infrastructure.config import Settings
from app.infrastructure.storage import S3Storage


READ_METHODS = {"GET", "HEAD", "OPTIONS", "LIST"}
WRITE_METHODS = {"PUT", "POST", "DELETE"}
DAY_WINDOW = 14


@dataclass(slots=True)
class ParsedStorageLogEntry:
    timestamp: datetime
    method: str
    object_key: str | None
    bytes_received: int
    bytes_sent: int


class YandexStorageAnalyticsService:
    def __init__(
        self,
        *,
        settings: Settings,
        key_display_names: dict[str, str] | None = None,
    ) -> None:
        self.settings = settings
        self.key_display_names = key_display_names or {}
        self.storage = S3Storage(settings)

    async def get_snapshot(self) -> StorageAnalyticsRead:
        if not self.settings.s3_enabled or not self.settings.s3_bucket_name:
            return StorageAnalyticsRead(
                enabled=False,
                metrics_configured=False,
                logs_configured=False,
                message="Yandex Object Storage is not configured yet.",
            )

        message_parts: list[str] = []
        stats_task = None
        traffic_task = None
        logs_task = None

        if self.settings.yandex_cloud_auth_configured:
            stats_task = asyncio.create_task(self._fetch_bucket_stats())
        else:
            stats_task = asyncio.create_task(self._fetch_bucket_stats_via_s3())

        if self.settings.yandex_cloud_api_enabled:
            traffic_task = asyncio.create_task(self._fetch_traffic_timeline())
        else:
            message_parts.append(
                "Cloud API auth is not configured, so traffic metrics are unavailable."
            )

        if self.settings.yandex_storage_logs_enabled and self.storage.client:
            logs_task = asyncio.create_task(self._load_recent_log_entries())
        else:
            message_parts.append(
                "Bucket access logs are not configured, so top requested objects are unavailable."
            )

        stats = {}
        if stats_task:
            try:
                stats = await stats_task
            except Exception as e:
                import traceback
                import sys
                print(f"Failed to fetch bucket stats via Yandex Cloud API: {e}", file=sys.stderr)
                traceback.print_exc(file=sys.stderr)
                
                # If we tried Cloud API and it failed, try the S3 fallback
                if self.settings.yandex_cloud_auth_configured and self.storage.client:
                    try:
                        print("Attempting fallback bucket stats calculation via S3 listing...", file=sys.stderr)
                        stats = await self._fetch_bucket_stats_via_s3()
                        message_parts.append("Bucket stats fetched via S3 fallback (Cloud API failed).")
                    except Exception as fallback_err:
                        print(f"Fallback bucket stats calculation failed: {fallback_err}", file=sys.stderr)
                        traceback.print_exc(file=sys.stderr)
                        message_parts.append("Bucket stats are temporarily unavailable.")
                else:
                    message_parts.append("Bucket stats are temporarily unavailable.")

        traffic_points = await self._await_task(
            traffic_task,
            default=self._empty_traffic_window(),
            message_parts=message_parts,
            failure_message="Traffic metrics are temporarily unavailable from Yandex Monitoring.",
        )
        log_payload = await self._await_task(
            logs_task,
            default=([], None),
            message_parts=message_parts,
            failure_message="Bucket access logs could not be read from Object Storage.",
        )
        log_entries, last_log_at = log_payload

        totals = self._summarize_log_entries(log_entries)
        log_timeline: list[StorageTrafficPoint] = totals["traffic_timeline_from_logs"]
        traffic_points_by_label = {point.label: point for point in traffic_points}
        for log_point in log_timeline:
            point = traffic_points_by_label.get(log_point.label)
            if not point:
                continue
            point.requests = log_point.requests
            point.read_requests = log_point.read_requests
            point.write_requests = log_point.write_requests
            if not self.settings.yandex_cloud_api_enabled:
                point.incoming_bytes = log_point.incoming_bytes
                point.outgoing_bytes = log_point.outgoing_bytes
        if not message_parts and not stats and not log_entries:
            message_parts.append(
                "Storage analytics is configured, but Yandex Cloud has not returned enough data yet."
            )

        return StorageAnalyticsRead(
            enabled=True,
            metrics_configured=self.settings.yandex_cloud_api_enabled,
            logs_configured=self.settings.yandex_storage_logs_enabled,
            bucket_name=self.settings.s3_bucket_name,
            log_bucket_name=self.settings.yandex_storage_log_bucket_name,
            message=" ".join(message_parts) if message_parts else None,
            used_size_bytes=stats.get("used_size_bytes"),
            object_count=stats.get("object_count"),
            public_read_enabled=stats.get("public_read_enabled"),
            public_list_enabled=stats.get("public_list_enabled"),
            total_incoming_bytes=sum(point.incoming_bytes for point in traffic_points) or totals["incoming_bytes"],
            total_outgoing_bytes=sum(point.outgoing_bytes for point in traffic_points) or totals["outgoing_bytes"],
            total_requests=totals["requests"],
            read_requests=totals["read_requests"],
            write_requests=totals["write_requests"],
            last_log_at=last_log_at,
            traffic_timeline=traffic_points,
            method_breakdown=totals["method_breakdown"],
            top_objects=totals["top_objects"],
        )

    async def _fetch_bucket_stats_via_s3(self) -> dict[str, Any]:
        if not self.storage.client or not self.settings.s3_bucket_name:
            return {}

        object_count = 0
        used_size_bytes = 0
        continuation_token = None

        while True:
            kwargs: dict[str, Any] = {
                "Bucket": self.settings.s3_bucket_name,
                "MaxKeys": 1000,
            }
            if continuation_token:
                kwargs["ContinuationToken"] = continuation_token

            response = await asyncio.to_thread(self.storage.client.list_objects_v2, **kwargs)
            contents = response.get("Contents") or []
            object_count += len(contents)
            for item in contents:
                used_size_bytes += item.get("Size") or 0

            if not response.get("IsTruncated"):
                break
            continuation_token = response.get("NextContinuationToken")

        return {
            "used_size_bytes": used_size_bytes,
            "object_count": object_count,
            "public_read_enabled": None,
            "public_list_enabled": None,
        }

    async def _fetch_bucket_stats(self) -> dict[str, Any]:
        if not self.settings.s3_bucket_name:
            return {}

        url = (
            "https://storage.api.cloud.yandex.net/storage/v1/buckets/"
            f"{quote(self.settings.s3_bucket_name, safe='')}:getStats"
        )
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(url, headers=self._cloud_api_headers())
            response.raise_for_status()
        payload = response.json()
        object_count = 0
        for item in payload.get("storageClassCounters", []):
            counters = item.get("counters") or {}
            object_count += int(counters.get("simpleObjectCount") or 0)
            object_count += int(counters.get("multipartObjectsCount") or 0)

        flags = payload.get("anonymousAccessFlags") or {}
        return {
            "used_size_bytes": int(payload.get("usedSize") or 0),
            "object_count": object_count,
            "public_read_enabled": flags.get("read"),
            "public_list_enabled": flags.get("list"),
        }

    async def _fetch_traffic_timeline(self) -> list[StorageTrafficPoint]:
        window = self._day_window()
        incoming = await self._read_monitoring_series(bytes_direction="BytesUploaded")
        outgoing = await self._read_monitoring_series(bytes_direction="BytesDownloaded")
        points: list[StorageTrafficPoint] = []
        for day in window:
            points.append(
                StorageTrafficPoint(
                    label=day.strftime("%d %b"),
                    incoming_bytes=incoming.get(day, 0),
                    outgoing_bytes=outgoing.get(day, 0),
                )
            )
        return points

    async def _read_monitoring_series(self, *, bytes_direction: str) -> dict[date, int]:
        if not self.settings.yandex_cloud_folder_id or not self.settings.s3_bucket_name:
            return {}

        now = datetime.now(UTC)
        start = datetime.combine(self._day_window()[0], datetime.min.time(), tzinfo=UTC)
        query = (
            'traffic{service="storage", resource_type="bucket", '
            f'resource_id="{self.settings.s3_bucket_name}", '
            f'folderId="{self.settings.yandex_cloud_folder_id}", '
            f'bytes="{bytes_direction}"}}'
        )
        body = {
            "query": query,
            "fromTime": start.isoformat().replace("+00:00", "Z"),
            "toTime": now.isoformat().replace("+00:00", "Z"),
            "downsampling": {
                "gridAggregation": "SUM",
                "gapFilling": "NULL",
                "gridInterval": str(24 * 60 * 60 * 1000),
            },
        }
        url = (
            "https://monitoring.api.cloud.yandex.net/monitoring/v2/data/read"
            f"?folderId={quote(self.settings.yandex_cloud_folder_id, safe='')}"
        )
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(url, json=body, headers=self._cloud_api_headers())
            response.raise_for_status()
        payload = response.json()

        buckets: dict[date, int] = {}
        for metric in payload.get("metrics", []):
            timeseries = metric.get("timeseries") or {}
            timestamps = timeseries.get("timestamps") or []
            values = timeseries.get("doubleValues") or timeseries.get("int64Values") or []
            for timestamp, raw_value in zip(timestamps, values, strict=False):
                day = datetime.fromtimestamp(timestamp / 1000, tz=UTC).date()
                if raw_value is None:
                    continue
                buckets[day] = buckets.get(day, 0) + max(0, int(round(float(raw_value))))
        return buckets

    async def _load_recent_log_entries(self) -> tuple[list[ParsedStorageLogEntry], str | None]:
        if not self.storage.client or not self.settings.yandex_storage_log_bucket_name:
            return [], None

        bucket = self.settings.yandex_storage_log_bucket_name
        prefix = self.settings.yandex_storage_log_object_prefix
        since = datetime.now(UTC) - timedelta(days=DAY_WINDOW + 1)
        continuation_token: str | None = None
        object_keys: list[str] = []

        while True:
            kwargs: dict[str, Any] = {
                "Bucket": bucket,
                "MaxKeys": 1000,
                "Prefix": prefix,
            }
            if continuation_token:
                kwargs["ContinuationToken"] = continuation_token

            response = await asyncio.to_thread(self.storage.client.list_objects_v2, **kwargs)
            contents = response.get("Contents") or []
            for item in contents:
                modified_at = item.get("LastModified")
                if isinstance(modified_at, datetime):
                    modified_at = modified_at.astimezone(UTC)
                if modified_at and modified_at >= since:
                    key = item.get("Key")
                    if key:
                        object_keys.append(key)

            if not response.get("IsTruncated"):
                break
            continuation_token = response.get("NextContinuationToken")

        object_keys = sorted(set(object_keys))
        tasks = [self._parse_log_object(bucket=bucket, key=key) for key in object_keys]
        parsed_objects = await asyncio.gather(*tasks, return_exceptions=True)

        entries: list[ParsedStorageLogEntry] = []
        last_log_at: datetime | None = None
        for parsed in parsed_objects:
            if isinstance(parsed, Exception):
                continue
            for entry in parsed:
                if entry.timestamp >= since:
                    entries.append(entry)
                    if last_log_at is None or entry.timestamp > last_log_at:
                        last_log_at = entry.timestamp

        entries.sort(key=lambda item: item.timestamp)
        return entries, last_log_at.isoformat().replace("+00:00", "Z") if last_log_at else None

    async def _parse_log_object(self, *, bucket: str, key: str) -> list[ParsedStorageLogEntry]:
        if not self.storage.client:
            return []

        response = await asyncio.to_thread(
            self.storage.client.get_object,
            Bucket=bucket,
            Key=key,
        )
        body = response["Body"]
        raw_bytes = await asyncio.to_thread(body.read)
        payload = self._decode_log_payload(raw_bytes, key=key)
        lines = [line.strip() for line in payload.splitlines() if line.strip()]

        entries: list[ParsedStorageLogEntry] = []
        if len(lines) == 1 and lines[0].startswith("["):
            try:
                items = json.loads(lines[0])
            except json.JSONDecodeError:
                return entries
            if isinstance(items, list):
                for item in items:
                    parsed = self._parse_log_record(item)
                    if parsed:
                        entries.append(parsed)
            return entries

        for line in lines:
            try:
                item = json.loads(line)
            except json.JSONDecodeError:
                continue
            parsed = self._parse_log_record(item)
            if parsed:
                entries.append(parsed)
        return entries

    def _parse_log_record(self, record: Any) -> ParsedStorageLogEntry | None:
        if not isinstance(record, dict):
            return None

        timestamp_raw = record.get("timestamp")
        method = str(record.get("method") or "").upper()
        if not timestamp_raw or not method:
            return None

        try:
            timestamp = datetime.fromisoformat(str(timestamp_raw).replace("Z", "+00:00")).astimezone(UTC)
        except ValueError:
            return None

        object_key = record.get("object_key")
        if object_key:
            object_key = unquote(str(object_key))
        return ParsedStorageLogEntry(
            timestamp=timestamp,
            method=method,
            object_key=object_key or None,
            bytes_received=int(record.get("bytes_received") or 0),
            bytes_sent=int(record.get("bytes_send") or 0),
        )

    def _summarize_log_entries(self, entries: list[ParsedStorageLogEntry]) -> dict[str, Any]:
        per_day: dict[date, StorageTrafficPoint] = {
            day: StorageTrafficPoint(label=day.strftime("%d %b"))
            for day in self._day_window()
        }
        method_counter: Counter[str] = Counter()
        method_bytes: dict[str, dict[str, int]] = {}
        object_counter: dict[str, dict[str, Any]] = {}

        total_requests = 0
        read_requests = 0
        write_requests = 0
        incoming_bytes = 0
        outgoing_bytes = 0

        for entry in entries:
            day = entry.timestamp.date()
            point = per_day.get(day)
            if point is None:
                continue

            point.requests += 1
            point.incoming_bytes += entry.bytes_received
            point.outgoing_bytes += entry.bytes_sent
            total_requests += 1
            incoming_bytes += entry.bytes_received
            outgoing_bytes += entry.bytes_sent

            if entry.method in READ_METHODS:
                point.read_requests += 1
                read_requests += 1
            elif entry.method in WRITE_METHODS:
                point.write_requests += 1
                write_requests += 1

            method_counter[entry.method] += 1
            bytes_bucket = method_bytes.setdefault(
                entry.method,
                {"incoming_bytes": 0, "outgoing_bytes": 0},
            )
            bytes_bucket["incoming_bytes"] += entry.bytes_received
            bytes_bucket["outgoing_bytes"] += entry.bytes_sent

            if entry.object_key and entry.method in READ_METHODS:
                object_bucket = object_counter.setdefault(
                    entry.object_key,
                    {
                        "incoming_bytes": 0,
                        "outgoing_bytes": 0,
                        "requests": 0,
                        "last_requested_at": None,
                    },
                )
                object_bucket["requests"] += 1
                object_bucket["incoming_bytes"] += entry.bytes_received
                object_bucket["outgoing_bytes"] += entry.bytes_sent
                current_last = object_bucket["last_requested_at"]
                if current_last is None or entry.timestamp > current_last:
                    object_bucket["last_requested_at"] = entry.timestamp

        method_breakdown = [
            StorageMethodBreakdownItem(
                method=method,
                requests=requests,
                incoming_bytes=method_bytes.get(method, {}).get("incoming_bytes", 0),
                outgoing_bytes=method_bytes.get(method, {}).get("outgoing_bytes", 0),
            )
            for method, requests in method_counter.most_common()
        ]

        top_objects = sorted(
            object_counter.items(),
            key=lambda item: (
                item[1]["requests"],
                item[1]["outgoing_bytes"],
                item[1]["last_requested_at"] or datetime.min.replace(tzinfo=UTC),
            ),
            reverse=True,
        )[:8]
        top_object_reads = [
            StorageTopObjectRead(
                object_key=object_key,
                display_name=self._display_name_for_key(object_key),
                requests=payload["requests"],
                incoming_bytes=payload["incoming_bytes"],
                outgoing_bytes=payload["outgoing_bytes"],
                last_requested_at=payload["last_requested_at"].isoformat().replace("+00:00", "Z")
                if payload["last_requested_at"]
                else None,
            )
            for object_key, payload in top_objects
        ]

        return {
            "requests": total_requests,
            "read_requests": read_requests,
            "write_requests": write_requests,
            "incoming_bytes": incoming_bytes,
            "outgoing_bytes": outgoing_bytes,
            "method_breakdown": method_breakdown,
            "top_objects": top_object_reads,
            "traffic_timeline_from_logs": list(per_day.values()),
        }

    def _cloud_api_headers(self) -> dict[str, str]:
        if self.settings.yandex_cloud_iam_token:
            return {"Authorization": f"Bearer {self.settings.yandex_cloud_iam_token}"}
        if self.settings.yandex_cloud_api_key:
            return {"Authorization": f"Api-Key {self.settings.yandex_cloud_api_key}"}
        return {}

    async def _await_task[T](
        self,
        task: asyncio.Task[T] | None,
        *,
        default: T,
        message_parts: list[str],
        failure_message: str,
    ) -> T:
        if not task:
            return default
        try:
            return await task
        except Exception as e:
            import traceback
            import sys
            print(f"Analytics task failed: {failure_message}. Error: {e}", file=sys.stderr)
            traceback.print_exc(file=sys.stderr)
            message_parts.append(failure_message)
            return default

    def _decode_log_payload(self, raw_bytes: bytes, *, key: str) -> str:
        if key.endswith(".gz") or raw_bytes[:2] == b"\x1f\x8b":
            with gzip.GzipFile(fileobj=BytesIO(raw_bytes)) as gz:
                return gz.read().decode("utf-8")
        return raw_bytes.decode("utf-8")

    def _display_name_for_key(self, object_key: str) -> str:
        if object_key in self.key_display_names:
            return self.key_display_names[object_key]
        name = PurePosixPath(object_key).name
        return name or object_key

    def _day_window(self) -> list[date]:
        today = datetime.now(UTC).date()
        return [today - timedelta(days=index) for index in range(DAY_WINDOW - 1, -1, -1)]

    def _empty_traffic_window(self) -> list[StorageTrafficPoint]:
        return [StorageTrafficPoint(label=day.strftime("%d %b")) for day in self._day_window()]
