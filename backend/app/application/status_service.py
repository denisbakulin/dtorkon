from __future__ import annotations

import math
import re
import time
from collections.abc import Iterable
from dataclasses import dataclass
from typing import Any

import httpx

from app.http.schemas import (
    ContainerStatusRead,
    HostStatusRead,
    MonitoringSourceRead,
    StatusMonitorRead,
    StatusResponse,
    UptimeKumaStatusRead,
)
from app.infrastructure.config import Settings


METRIC_LINE_PATTERN = re.compile(
    r"^(?P<name>[a-zA-Z_:][a-zA-Z0-9_:]*)(?:\{(?P<labels>.*)\})?\s+(?P<value>[-+]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][-+]?\d+)?)$"
)
LABEL_PATTERN = re.compile(r'([a-zA-Z_][a-zA-Z0-9_]*)="((?:[^"\\]|\\.)*)"')
IGNORED_FILESYSTEM_TYPES = {
    "autofs",
    "binfmt_misc",
    "bpf",
    "cgroup",
    "cgroup2",
    "configfs",
    "debugfs",
    "devpts",
    "devtmpfs",
    "fusectl",
    "hugetlbfs",
    "mqueue",
    "nsfs",
    "overlay",
    "proc",
    "pstore",
    "rpc_pipefs",
    "securityfs",
    "selinuxfs",
    "squashfs",
    "sysfs",
    "tmpfs",
    "tracefs",
}
ROOT_CONTAINER_NAMES = {"", "/"}
CONTAINER_CPU_CACHE: dict[str, tuple[float, float]] = {}
HOST_CPU_CACHE: tuple[float, float, float] | None = None


@dataclass(slots=True)
class MetricSample:
    name: str
    labels: dict[str, str]
    value: float


def _parse_labels(raw_labels: str | None) -> dict[str, str]:
    if not raw_labels:
        return {}

    labels: dict[str, str] = {}
    for key, value in LABEL_PATTERN.findall(raw_labels):
        labels[key] = bytes(value, "utf-8").decode("unicode_escape")
    return labels


def parse_prometheus_text(payload: str) -> list[MetricSample]:
    samples: list[MetricSample] = []

    for line in payload.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue

        match = METRIC_LINE_PATTERN.match(stripped)
        if not match:
            continue

        try:
            value = float(match.group("value"))
        except ValueError:
            continue

        if math.isnan(value) or math.isinf(value):
            continue

        samples.append(
            MetricSample(
                name=match.group("name"),
                labels=_parse_labels(match.group("labels")),
                value=value,
            )
        )

    return samples


def _latest_sample_value(samples: Iterable[MetricSample], metric_name: str) -> float | None:
    for sample in samples:
        if sample.name == metric_name:
            return sample.value
    return None


def _pick_root_disk(samples: Iterable[MetricSample], metric_name: str) -> float | None:
    candidates: list[tuple[int, float]] = []

    for sample in samples:
        if sample.name != metric_name:
            continue

        mountpoint = sample.labels.get("mountpoint", "")
        filesystem_type = sample.labels.get("fstype", "")
        device = sample.labels.get("device", "")
        if filesystem_type in IGNORED_FILESYSTEM_TYPES:
            continue
        if device.startswith("rootfs"):
            continue

        if mountpoint == "/":
            return sample.value

        if mountpoint.startswith("/"):
            candidates.append((len(mountpoint), sample.value))

    if not candidates:
        return None

    candidates.sort(key=lambda item: item[0])
    return candidates[0][1]


def _coalesce_container_name(labels: dict[str, str]) -> str | None:
    for key in (
        "container_label_com_docker_compose_service",
        "container_label_io_kubernetes_container_name",
        "name",
    ):
        value = labels.get(key)
        if value and value not in ROOT_CONTAINER_NAMES:
            return value.removeprefix("/")
    return None


def _should_keep_container(labels: dict[str, str]) -> bool:
    name = labels.get("name", "")
    service = labels.get("container_label_com_docker_compose_service")
    image = labels.get("image")
    if service:
        return True
    if image and name and name not in ROOT_CONTAINER_NAMES:
        return True
    return False


def _calculate_host_cpu_percent(total_cpu: float, idle_cpu: float, now: float) -> float | None:
    global HOST_CPU_CACHE

    previous = HOST_CPU_CACHE
    HOST_CPU_CACHE = (total_cpu, idle_cpu, now)
    if previous is None:
        return None

    previous_total, previous_idle, _ = previous
    total_delta = total_cpu - previous_total
    idle_delta = idle_cpu - previous_idle
    if total_delta <= 0:
        return None

    usage = (1 - (idle_delta / total_delta)) * 100
    return round(max(0.0, min(usage, 100.0)), 2)


def _calculate_container_cpu_percent(container_key: str, cpu_total_seconds: float, now: float) -> float | None:
    previous = CONTAINER_CPU_CACHE.get(container_key)
    CONTAINER_CPU_CACHE[container_key] = (cpu_total_seconds, now)
    if previous is None:
        return None

    previous_total, previous_time = previous
    total_delta = cpu_total_seconds - previous_total
    time_delta = now - previous_time
    if total_delta < 0 or time_delta <= 0:
        return None

    return round((total_delta / time_delta) * 100, 2)


async def _fetch_text(client: httpx.AsyncClient, url: str) -> str:
    response = await client.get(url)
    response.raise_for_status()
    return response.text


async def _fetch_json(client: httpx.AsyncClient, url: str) -> dict[str, Any]:
    response = await client.get(url)
    response.raise_for_status()
    data = response.json()
    if not isinstance(data, dict):
        raise ValueError("Unexpected JSON payload.")
    return data


def _build_host_status(node_samples: list[MetricSample]) -> HostStatusRead | None:
    if not node_samples:
        return None

    total_cpu = 0.0
    idle_cpu = 0.0
    node_time_seconds: float | None = None
    boot_time_seconds: float | None = None
    for sample in node_samples:
        if sample.name == "node_cpu_seconds_total":
            total_cpu += sample.value
            if sample.labels.get("mode") == "idle":
                idle_cpu += sample.value
        elif sample.name == "node_time_seconds":
            node_time_seconds = sample.value
        elif sample.name == "node_boot_time_seconds":
            boot_time_seconds = sample.value

    cpu_usage_percent = None
    if total_cpu > 0:
        cpu_usage_percent = _calculate_host_cpu_percent(total_cpu, idle_cpu, time.time())

    memory_total = _latest_sample_value(node_samples, "node_memory_MemTotal_bytes")
    memory_available = _latest_sample_value(node_samples, "node_memory_MemAvailable_bytes")
    memory_used = None
    if memory_total is not None and memory_available is not None:
        memory_used = max(memory_total - memory_available, 0)

    disk_total = _pick_root_disk(node_samples, "node_filesystem_size_bytes")
    disk_available = _pick_root_disk(node_samples, "node_filesystem_avail_bytes")
    disk_used = None
    if disk_total is not None and disk_available is not None:
        disk_used = max(disk_total - disk_available, 0)

    uptime_seconds = None
    if node_time_seconds is not None and boot_time_seconds is not None:
        uptime_seconds = max(node_time_seconds - boot_time_seconds, 0)
    elif boot_time_seconds is not None:
        uptime_seconds = max(time.time() - boot_time_seconds, 0)

    return HostStatusRead(
        cpu_usage_percent=cpu_usage_percent,
        load1=_latest_sample_value(node_samples, "node_load1"),
        load5=_latest_sample_value(node_samples, "node_load5"),
        load15=_latest_sample_value(node_samples, "node_load15"),
        memory_total_bytes=memory_total,
        memory_available_bytes=memory_available,
        memory_used_bytes=memory_used,
        disk_total_bytes=disk_total,
        disk_available_bytes=disk_available,
        disk_used_bytes=disk_used,
        uptime_seconds=round(uptime_seconds, 2) if uptime_seconds is not None else None,
    )


def _build_container_statuses(cadvisor_samples: list[MetricSample]) -> list[ContainerStatusRead]:
    metrics_by_container: dict[str, dict[str, float | str | None]] = {}
    now = time.time()

    for sample in cadvisor_samples:
        if not _should_keep_container(sample.labels):
            continue

        container_name = _coalesce_container_name(sample.labels)
        if not container_name:
            continue

        service_name = sample.labels.get("container_label_com_docker_compose_service") or container_name
        container_key = sample.labels.get("id") or container_name
        bucket = metrics_by_container.setdefault(
            container_key,
            {
                "name": container_name,
                "service": service_name,
                "cpu_percent": None,
                "memory_usage_bytes": None,
                "memory_working_set_bytes": None,
                "filesystem_usage_bytes": None,
                "network_receive_bytes": 0.0,
                "network_transmit_bytes": 0.0,
            },
        )

        if sample.name == "container_cpu_usage_seconds_total":
            bucket["cpu_percent"] = _calculate_container_cpu_percent(container_key, sample.value, now)
        elif sample.name == "container_memory_usage_bytes":
            bucket["memory_usage_bytes"] = sample.value
        elif sample.name == "container_memory_working_set_bytes":
            bucket["memory_working_set_bytes"] = sample.value
        elif sample.name == "container_fs_usage_bytes":
            current = bucket.get("filesystem_usage_bytes")
            bucket["filesystem_usage_bytes"] = max(sample.value, float(current or 0))
        elif sample.name == "container_network_receive_bytes_total":
            bucket["network_receive_bytes"] = float(bucket["network_receive_bytes"] or 0) + sample.value
        elif sample.name == "container_network_transmit_bytes_total":
            bucket["network_transmit_bytes"] = float(bucket["network_transmit_bytes"] or 0) + sample.value

    containers = [
        ContainerStatusRead(
            name=str(values["name"]),
            service=str(values["service"]),
            cpu_usage_percent=values["cpu_percent"],
            memory_usage_bytes=values["memory_usage_bytes"],
            memory_working_set_bytes=values["memory_working_set_bytes"],
            filesystem_usage_bytes=values["filesystem_usage_bytes"],
            network_receive_bytes=int(values["network_receive_bytes"] or 0),
            network_transmit_bytes=int(values["network_transmit_bytes"] or 0),
        )
        for values in metrics_by_container.values()
    ]
    containers.sort(key=lambda item: item.service)
    return containers


def _extract_kuma_monitors(payload: dict[str, Any]) -> list[StatusMonitorRead]:
    public_groups = payload.get("publicGroupList")
    if not isinstance(public_groups, list):
        return []

    heartbeat_map = payload.get("heartbeatList")
    monitors: list[StatusMonitorRead] = []

    for group in public_groups:
        if not isinstance(group, dict):
            continue

        monitor_list = group.get("monitorList")
        if not isinstance(monitor_list, list):
            continue

        for monitor in monitor_list:
            if not isinstance(monitor, dict):
                continue

            monitor_id = monitor.get("id")
            latest_heartbeat = None
            if isinstance(heartbeat_map, dict):
                raw_heartbeats = heartbeat_map.get(str(monitor_id)) or heartbeat_map.get(monitor_id)
                if isinstance(raw_heartbeats, list) and raw_heartbeats:
                    latest_heartbeat = raw_heartbeats[0]

            status_code = monitor.get("status")
            ping_ms = monitor.get("ping")
            if isinstance(latest_heartbeat, dict):
                status_code = latest_heartbeat.get("status", status_code)
                ping_ms = latest_heartbeat.get("ping", ping_ms)

            if status_code == 1:
                status = "up"
            elif status_code == 0:
                status = "down"
            elif status_code == 3:
                status = "maintenance"
            else:
                status = "unknown"

            monitors.append(
                StatusMonitorRead(
                    name=str(monitor.get("name") or f"Monitor {monitor_id}"),
                    status=status,
                    ping_ms=float(ping_ms) if isinstance(ping_ms, int | float) else None,
                    url=monitor.get("url") if isinstance(monitor.get("url"), str) else None,
                )
            )

    monitors.sort(key=lambda item: item.name)
    return monitors


def _build_kuma_status(base_url: str, slug: str, payload: dict[str, Any]) -> UptimeKumaStatusRead:
    monitors = _extract_kuma_monitors(payload)
    config = payload.get("config")
    title = None
    if isinstance(config, dict):
        title_value = config.get("title")
        if isinstance(title_value, str) and title_value.strip():
            title = title_value.strip()

    up_count = sum(1 for monitor in monitors if monitor.status == "up")
    down_count = sum(1 for monitor in monitors if monitor.status == "down")
    maintenance_count = sum(1 for monitor in monitors if monitor.status == "maintenance")

    return UptimeKumaStatusRead(
        page_title=title or slug,
        page_url=f"{base_url.rstrip('/')}/status/{slug}",
        slug=slug,
        total_monitors=len(monitors),
        up_monitors=up_count,
        down_monitors=down_count,
        maintenance_monitors=maintenance_count,
        monitors=monitors,
    )


async def get_status_snapshot(settings: Settings) -> StatusResponse:
    sources: list[MonitoringSourceRead] = [
        MonitoringSourceRead(name="backend", enabled=True, reachable=True, url=None, message="API is running."),
    ]
    host_status: HostStatusRead | None = None
    containers: list[ContainerStatusRead] = []
    uptime_kuma: UptimeKumaStatusRead | None = None
    overall_status = "ok"

    async with httpx.AsyncClient(timeout=httpx.Timeout(5.0, connect=2.0)) as client:
        if settings.node_exporter_base_url:
            node_url = f"{settings.node_exporter_base_url.rstrip('/')}/metrics"
            try:
                node_payload = await _fetch_text(client, node_url)
                host_status = _build_host_status(parse_prometheus_text(node_payload))
                sources.append(
                    MonitoringSourceRead(
                        name="node_exporter",
                        enabled=True,
                        reachable=host_status is not None,
                        url=node_url,
                        message="Host metrics loaded." if host_status else "Metrics payload did not contain host data.",
                    )
                )
                if host_status is None:
                    overall_status = "degraded"
            except Exception as exc:  # noqa: BLE001
                sources.append(
                    MonitoringSourceRead(
                        name="node_exporter",
                        enabled=True,
                        reachable=False,
                        url=node_url,
                        message=str(exc),
                    )
                )
                overall_status = "degraded"
        else:
            sources.append(
                MonitoringSourceRead(
                    name="node_exporter",
                    enabled=False,
                    reachable=False,
                    url=None,
                    message="Set NODE_EXPORTER_BASE_URL to enable host metrics.",
                )
            )

        if settings.cadvisor_base_url:
            cadvisor_url = f"{settings.cadvisor_base_url.rstrip('/')}/metrics"
            try:
                cadvisor_payload = await _fetch_text(client, cadvisor_url)
                containers = _build_container_statuses(parse_prometheus_text(cadvisor_payload))
                sources.append(
                    MonitoringSourceRead(
                        name="cadvisor",
                        enabled=True,
                        reachable=True,
                        url=cadvisor_url,
                        message=f"Loaded {len(containers)} containers.",
                    )
                )
            except Exception as exc:  # noqa: BLE001
                sources.append(
                    MonitoringSourceRead(
                        name="cadvisor",
                        enabled=True,
                        reachable=False,
                        url=cadvisor_url,
                        message=str(exc),
                    )
                )
                overall_status = "degraded"
        else:
            sources.append(
                MonitoringSourceRead(
                    name="cadvisor",
                    enabled=False,
                    reachable=False,
                    url=None,
                    message="Set CADVISOR_BASE_URL to enable container metrics.",
                )
            )

        if settings.uptime_kuma_base_url and settings.uptime_kuma_status_slug:
            kuma_api_url = (
                f"{settings.uptime_kuma_base_url.rstrip('/')}/api/status-page/{settings.uptime_kuma_status_slug}"
            )
            try:
                kuma_payload = await _fetch_json(client, kuma_api_url)
                uptime_kuma = _build_kuma_status(
                    settings.uptime_kuma_base_url,
                    settings.uptime_kuma_status_slug,
                    kuma_payload,
                )
                sources.append(
                    MonitoringSourceRead(
                        name="uptime_kuma",
                        enabled=True,
                        reachable=True,
                        url=kuma_api_url,
                        message=f"Loaded {uptime_kuma.total_monitors} public monitors.",
                    )
                )
                if uptime_kuma.down_monitors > 0:
                    overall_status = "degraded"
            except Exception as exc:  # noqa: BLE001
                sources.append(
                    MonitoringSourceRead(
                        name="uptime_kuma",
                        enabled=True,
                        reachable=False,
                        url=kuma_api_url,
                        message=str(exc),
                    )
                )
                overall_status = "degraded"
        else:
            sources.append(
                MonitoringSourceRead(
                    name="uptime_kuma",
                    enabled=False,
                    reachable=False,
                    url=None,
                    message="Set UPTIME_KUMA_BASE_URL and UPTIME_KUMA_STATUS_SLUG to show external uptime monitors.",
                )
            )

    return StatusResponse(
        status=overall_status,
        generated_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        backend_status="ok",
        host=host_status,
        containers=containers,
        sources=sources,
        uptime_kuma=uptime_kuma,
    )
