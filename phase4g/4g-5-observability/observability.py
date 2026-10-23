from __future__ import annotations

from dataclasses import dataclass, field, asdict
from enum import Enum
import json
import re
import time
import uuid
from typing import Any, Dict, List, Optional


class Severity(str, Enum):
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARN = "WARN"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


@dataclass(frozen=True)
class TelemetryEvent:
    event_id: str
    timestamp: float
    event_name: str
    severity: Severity
    correlation_id: str
    execution_id: Optional[str] = None
    node_id: Optional[str] = None
    attributes: Dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class Span:
    trace_id: str
    span_id: str
    operation: str
    correlation_id: str
    started_at: float
    ended_at: Optional[float] = None
    status: str = "IN_PROGRESS"
    attributes: Dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class AuditRecord:
    audit_id: str
    timestamp: float
    action: str
    actor: str
    correlation_id: str
    outcome: str
    attributes: Dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class Alert:
    alert_id: str
    rule: str
    severity: Severity
    timestamp: float
    message: str
    correlation_id: Optional[str] = None


_SECRET_KEY = re.compile(r"(password|passwd|secret|token|api[_-]?key|authorization|credential|private[_-]?key)", re.I)


def _redact(value: Any) -> Any:
    if isinstance(value, dict):
        return {k: ("[REDACTED]" if _SECRET_KEY.search(str(k)) else _redact(v)) for k, v in value.items()}
    if isinstance(value, list):
        return [_redact(v) for v in value]
    return value


class OperationalTelemetry:
    """Derived local observability reference; no external collector is required."""

    def __init__(self, utilization_alert=0.90, unhealthy_node_alert=1, error_rate_alert=0.20):
        self.events: List[TelemetryEvent] = []
        self.spans: Dict[str, Span] = {}
        self.completed_spans: List[Span] = []
        self.audit: List[AuditRecord] = []
        self.counters: Dict[str, int] = {}
        self.gauges: Dict[str, float] = {}
        self.alerts: List[Alert] = []
        self.utilization_alert = utilization_alert
        self.unhealthy_node_alert = unhealthy_node_alert
        self.error_rate_alert = error_rate_alert

    def _inc(self, key: str, value: int = 1):
        self.counters[key] = self.counters.get(key, 0) + value

    def emit(self, event_name: str, *, correlation_id: Optional[str] = None,
             severity: Severity = Severity.INFO, execution_id: Optional[str] = None,
             node_id: Optional[str] = None, **attributes) -> TelemetryEvent:
        cid = correlation_id or str(uuid.uuid4())
        event = TelemetryEvent(
            event_id=str(uuid.uuid4()), timestamp=time.time(), event_name=event_name,
            severity=severity, correlation_id=cid, execution_id=execution_id,
            node_id=node_id, attributes=_redact(attributes)
        )
        self.events.append(event)
        self._inc(f"events.{event_name}")
        self._inc(f"severity.{severity.value}")
        if severity in (Severity.ERROR, Severity.CRITICAL):
            self._inc("errors.total")
        return event

    def start_span(self, operation: str, *, correlation_id: Optional[str] = None, **attributes) -> Span:
        span = Span(
            trace_id=str(uuid.uuid4()), span_id=str(uuid.uuid4()), operation=operation,
            correlation_id=correlation_id or str(uuid.uuid4()), started_at=time.time(),
            attributes=_redact(attributes)
        )
        self.spans[span.span_id] = span
        self.emit("SPAN_STARTED", correlation_id=span.correlation_id, span_id=span.span_id,
                  trace_id=span.trace_id, operation=operation)
        return span

    def end_span(self, span_id: str, *, status: str = "OK", **attributes) -> Span:
        if span_id not in self.spans:
            raise KeyError(f"UNKNOWN_SPAN:{span_id}")
        current = self.spans.pop(span_id)
        ended = Span(
            trace_id=current.trace_id, span_id=current.span_id, operation=current.operation,
            correlation_id=current.correlation_id, started_at=current.started_at,
            ended_at=time.time(), status=status,
            attributes={**current.attributes, **_redact(attributes)}
        )
        self.completed_spans.append(ended)
        self.emit("SPAN_ENDED", correlation_id=ended.correlation_id, span_id=ended.span_id,
                  trace_id=ended.trace_id, operation=ended.operation, status=status,
                  severity=(Severity.INFO if status in ("OK", "SUCCESS") else Severity.ERROR),
                  duration_ms=round((ended.ended_at - ended.started_at) * 1000, 3))
        if status not in ("OK", "SUCCESS"):
            self._inc("spans.failed")
        else:
            self._inc("spans.success")
        return ended

    def set_gauge(self, name: str, value: float, *, correlation_id: Optional[str] = None):
        self.gauges[name] = float(value)
        self.emit("GAUGE_UPDATED", correlation_id=correlation_id, metric=name, value=float(value))

    def record_audit(self, action: str, *, actor: str, correlation_id: str,
                     outcome: str, **attributes) -> AuditRecord:
        record = AuditRecord(
            audit_id=str(uuid.uuid4()), timestamp=time.time(), action=action, actor=actor,
            correlation_id=correlation_id, outcome=outcome, attributes=_redact(attributes)
        )
        self.audit.append(record)
        self._inc("audit.records")
        return record

    def health_snapshot(self, *, node_states: Dict[str, str], active: int,
                        capacity: int, queued: int = 0, correlation_id: Optional[str] = None) -> Dict[str, Any]:
        unhealthy = sum(1 for state in node_states.values() if state == "UNHEALTHY")
        utilization = 0.0 if capacity <= 0 else active / capacity
        snapshot = {
            "timestamp": time.time(),
            "status": "DEGRADED" if unhealthy or queued or utilization >= self.utilization_alert else "HEALTHY",
            "nodes": {"total": len(node_states), "unhealthy": unhealthy, "states": dict(node_states)},
            "capacity": {"active": active, "total": capacity, "utilization": utilization, "queued": queued},
            "telemetry": {"events": len(self.events), "completed_spans": len(self.completed_spans), "audit_records": len(self.audit)},
        }
        self.set_gauge("runtime.utilization", utilization, correlation_id=correlation_id)
        self.set_gauge("runtime.unhealthy_nodes", unhealthy, correlation_id=correlation_id)
        self.set_gauge("runtime.queue_depth", queued, correlation_id=correlation_id)
        return snapshot

    def evaluate_alerts(self, *, utilization: Optional[float] = None,
                        unhealthy_nodes: Optional[int] = None,
                        requests: Optional[int] = None, errors: Optional[int] = None,
                        queued: Optional[int] = None,
                        correlation_id: Optional[str] = None) -> List[Alert]:
        triggered: List[Alert] = []
        def add(rule, severity, message):
            alert = Alert(str(uuid.uuid4()), rule, severity, time.time(), message, correlation_id)
            self.alerts.append(alert); triggered.append(alert); self._inc(f"alerts.{rule}")
            self.emit("ALERT_TRIGGERED", correlation_id=correlation_id, severity=severity,
                      rule=rule, message=message)

        if utilization is not None and utilization >= self.utilization_alert:
            add("HIGH_UTILIZATION", Severity.WARN, f"Utilization {utilization:.3f} >= {self.utilization_alert:.3f}")
        if unhealthy_nodes is not None and unhealthy_nodes >= self.unhealthy_node_alert:
            add("UNHEALTHY_NODE", Severity.ERROR, f"Unhealthy nodes: {unhealthy_nodes}")
        if requests and errors is not None and errors / requests >= self.error_rate_alert:
            add("HIGH_ERROR_RATE", Severity.ERROR, f"Error rate {errors/requests:.3f} >= {self.error_rate_alert:.3f}")
        if queued is not None and queued > 0:
            add("BACKPRESSURE", Severity.WARN, f"Queue depth: {queued}")
        return triggered

    def export(self) -> str:
        payload = {
            "events": [asdict(e) for e in self.events],
            "spans": [asdict(s) for s in self.completed_spans],
            "audit": [asdict(a) for a in self.audit],
            "counters": dict(self.counters),
            "gauges": dict(self.gauges),
            "alerts": [asdict(a) for a in self.alerts],
        }
        return json.dumps(payload, default=lambda x: x.value if isinstance(x, Enum) else str(x), sort_keys=True)
