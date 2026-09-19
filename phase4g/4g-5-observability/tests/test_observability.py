import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from observability import OperationalTelemetry, Severity


def test_event_has_correlation_and_redacts_secrets():
    t = OperationalTelemetry(); e = t.emit('REQUEST_ACCEPTED', correlation_id='c1', token='abc', customer='x')
    assert e.correlation_id == 'c1'; assert e.attributes['token'] == '[REDACTED]'; assert e.attributes['customer'] == 'x'


def test_trace_span_lifecycle():
    t = OperationalTelemetry(); s = t.start_span('dispatch', correlation_id='c2', node_id='n1')
    done = t.end_span(s.span_id, status='OK')
    assert done.trace_id == s.trace_id and done.ended_at >= done.started_at
    assert t.counters['spans.success'] == 1


def test_failed_span_accounting():
    t = OperationalTelemetry(); s = t.start_span('sap.call', correlation_id='c3'); t.end_span(s.span_id, status='ERROR')
    assert t.counters['spans.failed'] == 1 and t.counters['errors.total'] >= 1


def test_audit_record_is_correlated_and_redacted():
    t = OperationalTelemetry(); a = t.record_audit('HIGH_IMPACT_APPROVAL', actor='system', correlation_id='c4', outcome='DENIED', credential='secret')
    assert a.correlation_id == 'c4'; assert a.attributes['credential'] == '[REDACTED]'


def test_health_snapshot_calculates_utilization_and_degraded_state():
    t = OperationalTelemetry(); h = t.health_snapshot(node_states={'n1':'READY','n2':'UNHEALTHY'}, active=9, capacity=10, queued=2)
    assert h['status'] == 'DEGRADED'; assert h['capacity']['utilization'] == 0.9; assert h['nodes']['unhealthy'] == 1


def test_alerts_cover_capacity_failure_and_backpressure():
    t = OperationalTelemetry(); a = t.evaluate_alerts(utilization=.95, unhealthy_nodes=1, requests=10, errors=3, queued=2, correlation_id='c5')
    assert {x.rule for x in a} == {'HIGH_UTILIZATION','UNHEALTHY_NODE','HIGH_ERROR_RATE','BACKPRESSURE'}


def test_no_false_error_rate_alert_below_threshold():
    t = OperationalTelemetry(error_rate_alert=.2); assert not t.evaluate_alerts(requests=100, errors=19)


def test_event_counters_and_severity_are_accounted():
    t = OperationalTelemetry(); t.emit('X', severity=Severity.INFO); t.emit('X', severity=Severity.ERROR)
    assert t.counters['events.X'] == 2; assert t.counters['severity.INFO'] == 1; assert t.counters['severity.ERROR'] == 1


def test_export_is_machine_readable():
    t = OperationalTelemetry(); t.emit('BOOT'); raw = t.export(); payload = json.loads(raw)
    assert len(payload['events']) == 1 and 'counters' in payload and 'alerts' in payload


def test_unknown_span_fails_closed():
    t = OperationalTelemetry()
    try: t.end_span('missing')
    except KeyError as e: assert e.args[0] == 'UNKNOWN_SPAN:missing'
    else: assert False


def test_health_zero_capacity_is_safe():
    t = OperationalTelemetry(); h = t.health_snapshot(node_states={}, active=0, capacity=0)
    assert h['capacity']['utilization'] == 0.0
