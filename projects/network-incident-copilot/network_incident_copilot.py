from __future__ import annotations

import argparse
import json
import re
import urllib.request
from collections import defaultdict
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

IP_RE = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")


@dataclass
class Observation:
    key: str
    value: Any
    source: str
    confidence: str = "observed"


@dataclass
class Finding:
    code: str
    severity: str
    summary: str
    evidence: list[str]
    certainty: str
    next_checks: list[str]


@dataclass
class IncidentFacts:
    observations: list[Observation]
    findings: list[Finding]
    collection_status: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "collection_status": self.collection_status,
            "observations": [asdict(x) for x in self.observations],
            "findings": [asdict(x) for x in self.findings],
        }


def parse_cli(text: str) -> list[Observation]:
    observations: list[Observation] = []
    lowered = text.lower()

    if "collection_error:" in lowered or "ssh timeout" in lowered:
        observations.append(Observation("collection_error", True, "collector"))
    if "partial_collection:" in lowered:
        observations.append(Observation("partial_collection", True, "collector"))

    for line in text.splitlines():
        ips = IP_RE.findall(line)
        if not ips:
            continue
        low = line.lower()
        if re.search(r"\bdown\b", low):
            observations.append(Observation(f"controller.{ips[0]}.mm_state", "down", "show switches"))
        elif re.search(r"\bup\b", low):
            observations.append(Observation(f"controller.{ips[0]}.mm_state", "up", "show switches"))

        active = re.search(r"active\s*[:=]\s*(\d+)", low)
        if active:
            observations.append(Observation(f"controller.{ips[0]}.active_clients", int(active.group(1)), "load distribution"))
        standby = re.search(r"standby\s*[:=]\s*(\d+)", low)
        if standby:
            observations.append(Observation(f"controller.{ips[0]}.standby_clients", int(standby.group(1)), "load distribution"))
        connection = re.search(r"connection[-_ ]?type\s*[:=]\s*([a-z0-9_-]+)", low)
        if connection:
            observations.append(Observation(f"controller.{ips[0]}.connection_type", connection.group(1), "group membership"))

    if "sta not found" in lowered:
        observations.append(Observation("session.lookup", "sta_not_found", "session lookup"))
    session_count = re.search(r"\bsession\s+count\s*[:=]\s*(\d+)\b", lowered)
    if session_count:
        observations.append(Observation("session.count", int(session_count.group(1)), "datapath session"))

    if "dynamic_radius_role: true" in lowered:
        observations.append(Observation("policy.dynamic_radius_role", True, "policy mapper"))
    if "acl_unresolved: true" in lowered:
        observations.append(Observation("policy.acl_unresolved", True, "policy mapper"))
    return observations


def analyze(observations: list[Observation]) -> IncidentFacts:
    values = {o.key: o.value for o in observations}
    findings: list[Finding] = []
    collection_error = values.get("collection_error") is True
    partial = values.get("partial_collection") is True
    status = "partial" if partial else ("failed" if collection_error else "complete")

    for key, value in values.items():
        if key.endswith(".mm_state") and value == "down":
            ip = key[len("controller.") : -len(".mm_state")]
            findings.append(Finding(
                "MM_REPORTED_DOWN", "critical", f"{ip} is explicitly reported Down by MM output.",
                [key], "high",
                ["Verify management reachability.", "Check cluster peer/group-membership evidence.", "Confirm service impact before remediation."],
            ))

    if collection_error:
        findings.append(Finding(
            "COLLECTION_FAILED", "warning",
            "Collection failed or timed out; controller health cannot be concluded from this signal alone.",
            ["collection_error"], "high",
            ["Retry through approved fallback path.", "Check management-plane reachability.", "Compare independent MM/cluster evidence."],
        ))

    if values.get("session.lookup") == "sta_not_found":
        findings.append(Finding(
            "STA_NOT_FOUND", "info",
            "Station lookup did not return the client. This is not equivalent to a confirmed session closure.",
            ["session.lookup"], "high",
            ["Re-check global user table.", "Confirm client roam/disconnect history.", "Verify collection succeeded before declaring session end."],
        ))

    if values.get("policy.dynamic_radius_role") is True:
        findings.append(Finding(
            "DYNAMIC_ROLE_UNKNOWN", "info",
            "A dynamic RADIUS role may override the WLC default role; effective role is not inferred.",
            ["policy.dynamic_radius_role"], "high",
            ["Confirm Access-Accept/role result from approved AAA evidence.", "Keep WLC default role and effective role separate."],
        ))

    if values.get("policy.acl_unresolved") is True:
        findings.append(Finding(
            "ACL_UNRESOLVED", "warning",
            "ACL dependency is unresolved, so access outcome remains indeterminate.",
            ["policy.acl_unresolved"], "high",
            ["Resolve referenced ACL/Alias objects.", "Do not label traffic as allowed or denied until dependencies are complete."],
        ))

    client_counts: dict[str, dict[str, int]] = defaultdict(dict)
    for key, value in values.items():
        if not key.startswith("controller."):
            continue
        if key.endswith(".active_clients"):
            ip = key[len("controller.") : -len(".active_clients")]
            client_counts[ip]["active"] = int(value)
        elif key.endswith(".standby_clients"):
            ip = key[len("controller.") : -len(".standby_clients")]
            client_counts[ip]["standby"] = int(value)

    actives = {ip: v["active"] for ip, v in client_counts.items() if "active" in v}
    if len(actives) >= 2 and max(actives.values(), default=0) >= 20:
        hi_ip, hi = max(actives.items(), key=lambda kv: kv[1])
        lo_ip, lo = min(actives.items(), key=lambda kv: kv[1])
        if hi >= max(20, lo * 4):
            findings.append(Finding(
                "CLIENT_DISTRIBUTION_SKEW", "warning",
                f"Observed active-client distribution is skewed ({hi_ip}={hi}, {lo_ip}={lo}); this is a signal, not a root-cause conclusion.",
                [f"controller.{hi_ip}.active_clients", f"controller.{lo_ip}.active_clients"], "medium",
                ["Repeat observation to rule out transient change.", "Compare MM state and connection type.", "Check total cluster utilization before escalating."],
            ))

    return IncidentFacts(observations, findings, status)


SYSTEM = """You are a network incident explanation assistant.
Use only the structured facts supplied by the deterministic analysis layer.
Never convert collection failure, missing data, or an unknown state into a confirmed outage.
Separate Observed Facts, Interpretation, Unknowns, and Next Checks.
Do not invent IPs, commands, device states, causes, or remediation results.
If evidence is insufficient, say so explicitly.
"""


def build_prompt(facts: IncidentFacts) -> str:
    payload = json.dumps(facts.to_dict(), ensure_ascii=False, indent=2)
    return f"{SYSTEM}\nSTRUCTURED FACTS:\n{payload}\n\nReturn a concise Korean incident brief."


def ollama_generate(model: str, prompt: str, base_url: str = "http://127.0.0.1:11434") -> str:
    body = json.dumps({
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "stream": False,
        "options": {"temperature": 0.1},
    }).encode("utf-8")
    req = urllib.request.Request(base_url.rstrip("/") + "/api/chat", data=body, headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=90) as resp:
        return json.loads(resp.read().decode("utf-8"))["message"]["content"]


FIXTURES = [
    ("timeout_not_down", "SSH TIMEOUT\nCOLLECTION_ERROR: timeout", {"COLLECTION_FAILED"}, {"MM_REPORTED_DOWN"}, "failed"),
    ("partial_collection", "partial_collection: true", set(), set(), "partial"),
    ("mm_down", "192.0.2.20 DOWN", {"MM_REPORTED_DOWN"}, set(), "complete"),
    ("mm_up", "192.0.2.20 UP", set(), {"MM_REPORTED_DOWN"}, "complete"),
    ("dynamic_role", "dynamic_radius_role: true", {"DYNAMIC_ROLE_UNKNOWN"}, set(), "complete"),
    ("acl_unresolved", "acl_unresolved: true", {"ACL_UNRESOLVED"}, set(), "complete"),
    ("sta_not_found", "STA not found", {"STA_NOT_FOUND"}, set(), "complete"),
    ("balanced_clients", "192.0.2.11 active=40 standby=40\n192.0.2.12 active=35 standby=35", set(), {"CLIENT_DISTRIBUTION_SKEW"}, "complete"),
    ("skewed_clients", "192.0.2.11 active=120 standby=10\n192.0.2.12 active=10 standby=100", {"CLIENT_DISTRIBUTION_SKEW"}, set(), "complete"),
    ("low_volume_not_skew", "192.0.2.11 active=8 standby=1\n192.0.2.12 active=1 standby=8", set(), {"CLIENT_DISTRIBUTION_SKEW"}, "complete"),
    ("timeout_and_dynamic", "SSH TIMEOUT\nCOLLECTION_ERROR: timeout\ndynamic_radius_role: true", {"COLLECTION_FAILED", "DYNAMIC_ROLE_UNKNOWN"}, {"MM_REPORTED_DOWN"}, "failed"),
    ("explicit_down_with_partial", "192.0.2.20 DOWN\npartial_collection: true", {"MM_REPORTED_DOWN"}, set(), "partial"),
    ("session_zero", "session count=0", set(), {"STA_NOT_FOUND"}, "complete"),
    ("session_present", "session count=3", set(), {"STA_NOT_FOUND"}, "complete"),
    ("connection_type_only", "192.0.2.20 connection-type=frequency", set(), set(), "complete"),
    ("empty", "", set(), set(), "complete"),
]


def run_eval() -> dict[str, Any]:
    rows = []
    for name, text, required, forbidden, status in FIXTURES:
        facts = analyze(parse_cli(text))
        codes = {x.code for x in facts.findings}
        passed = required <= codes and not (forbidden & codes) and facts.collection_status == status
        rows.append({
            "name": name,
            "passed": passed,
            "expected_required": sorted(required),
            "actual_codes": sorted(codes),
            "collection_status": facts.collection_status,
        })
    return {"passed": sum(r["passed"] for r in rows), "total": len(rows), "results": rows}


def main() -> int:
    parser = argparse.ArgumentParser(description="Network Incident Copilot public snapshot")
    parser.add_argument("--input", type=Path)
    parser.add_argument("--ollama-model")
    parser.add_argument("--eval", action="store_true")
    args = parser.parse_args()

    if args.eval:
        result = run_eval()
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0 if result["passed"] == result["total"] else 1
    if not args.input:
        parser.error("--input or --eval is required")

    facts = analyze(parse_cli(args.input.read_text(encoding="utf-8")))
    print(json.dumps(facts.to_dict(), ensure_ascii=False, indent=2))
    if args.ollama_model:
        print("\n--- LLM INCIDENT BRIEF ---")
        print(ollama_generate(args.ollama_model, build_prompt(facts)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
