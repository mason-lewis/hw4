"""Append-only, privacy-conscious audit records for agent runs."""

from __future__ import annotations

import fcntl
import json
import os
import re
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[1]
AUDIT_PATH = PROJECT_ROOT / "output" / "audit_trail.json"
_WRITE_LOCK = threading.Lock()
_EMAIL_PATTERN = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE)
_PHONE_PATTERN = re.compile(
    r"(?<!\w)(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}(?!\w)"
)
_SECRET_LABEL_PATTERN = re.compile(
    r"\b(?:password|passcode|token|secret|api[_ -]?key)\b", re.IGNORECASE
)
_API_KEY_PATTERN = re.compile(r"\b(?:sk|pk|rk)-[A-Z0-9_-]{12,}\b", re.IGNORECASE)


def safe_audit_text(value: str, *, max_length: int = 120) -> str:
    """Return a short tool argument summary with common personal identifiers masked."""
    cleaned = "".join(character for character in value if character.isprintable()).strip()
    if _SECRET_LABEL_PATTERN.search(cleaned) or _API_KEY_PATTERN.search(cleaned):
        return "[redacted sensitive query]"
    cleaned = _EMAIL_PATTERN.sub("[redacted email]", cleaned)
    cleaned = _PHONE_PATTERN.sub("[redacted phone]", cleaned)
    return cleaned[:max_length]


def append_audit_event(
    *,
    run_id: str | None,
    event: str,
    tool_name: str | None,
    arguments: dict[str, Any] | None = None,
    result: dict[str, Any] | None = None,
    stop_reason: str | None = None,
) -> None:
    """Append one JSON object and fsync it without reading or replacing prior records."""
    record = {
        "time": datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z"),
        "run_id": run_id,
        "event": event,
        "tool_name": tool_name,
        "arguments": arguments or {},
        "result": result or {},
        "stop_reason": stop_reason,
    }
    encoded = (json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
    AUDIT_PATH.parent.mkdir(parents=True, exist_ok=True)
    descriptor = os.open(AUDIT_PATH, os.O_CREAT | os.O_APPEND | os.O_WRONLY, 0o600)
    try:
        os.fchmod(descriptor, 0o600)
        with _WRITE_LOCK:
            fcntl.flock(descriptor, fcntl.LOCK_EX)
            try:
                remaining = memoryview(encoded)
                while remaining:
                    written = os.write(descriptor, remaining)
                    remaining = remaining[written:]
                os.fsync(descriptor)
            finally:
                fcntl.flock(descriptor, fcntl.LOCK_UN)
    finally:
        os.close(descriptor)
