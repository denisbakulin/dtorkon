from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine


MIGRATIONS_DIR = Path(__file__).resolve().parents[2] / "migrations"


async def run_migrations(engine: AsyncEngine) -> None:
    async with engine.begin() as connection:
        await connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS schema_migrations (
                  version TEXT PRIMARY KEY,
                  applied_at TEXT NOT NULL
                )
                """
            )
        )
        result = await connection.execute(text("SELECT version FROM schema_migrations"))
        applied_versions = {row[0] for row in result.fetchall()}

        for migration_path in sorted(MIGRATIONS_DIR.glob("*.sql")):
            version = migration_path.stem.split("_", maxsplit=1)[0]
            if version in applied_versions:
                continue

            script = migration_path.read_text(encoding="utf-8")
            for statement in _split_statements(script):
                await connection.exec_driver_sql(statement)

            await connection.execute(
                text(
                    """
                    INSERT INTO schema_migrations (version, applied_at)
                    VALUES (:version, :applied_at)
                    """
                ),
                {
                    "version": version,
                    "applied_at": datetime.now(timezone.utc).isoformat(),
                },
            )


def _split_statements(script: str) -> list[str]:
    statements: list[str] = []
    current: list[str] = []

    for line in script.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        current.append(line)
        if stripped.endswith(";"):
            statement = "\n".join(current).strip().rstrip(";")
            if statement:
                statements.append(statement)
            current = []

    tail = "\n".join(current).strip().rstrip(";")
    if tail:
        statements.append(tail)

    return statements
