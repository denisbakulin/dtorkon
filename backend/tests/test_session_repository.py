from datetime import UTC, datetime, timedelta

from app.infrastructure.models import SessionRecord
from app.infrastructure.repositories import SessionRepository


def build_record(*, last_seen_at: datetime) -> SessionRecord:
    return SessionRecord(
        id="session-id",
        expires_at=(last_seen_at + timedelta(days=1)).isoformat(),
        created_at=last_seen_at.isoformat(),
        last_seen_at=last_seen_at.isoformat(),
        ip_hash=None,
        user_agent=None,
    )


def test_should_touch_when_interval_elapsed() -> None:
    repository = SessionRepository(session=None)
    record = build_record(last_seen_at=datetime.now(UTC) - timedelta(minutes=10))

    assert repository.should_touch(record=record, interval_seconds=300) is True


def test_should_skip_touch_within_interval() -> None:
    repository = SessionRepository(session=None)
    record = build_record(last_seen_at=datetime.now(UTC) - timedelta(seconds=30))

    assert repository.should_touch(record=record, interval_seconds=300) is False
