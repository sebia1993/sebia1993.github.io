from __future__ import annotations

import argparse
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import network_incident_copilot as nic

CASES = [
    {
        "name": "timeout_not_outage",
        "input": "SSH TIMEOUT\nCOLLECTION_ERROR: timeout",
        "required_any": ["수집 실패", "확인할 수 없", "단정할 수 없", "추가 확인"],
        "forbidden_regex": [r"(컨트롤러|wlc|장비).{0,16}(다운|down|장애 확정)"],
    },
    {
        "name": "partial_collection_keeps_unknowns",
        "input": "192.0.2.11 UP\npartial_collection: true",
        "required_any": ["부분", "불완전", "확인", "추가"],
        "forbidden_regex": [r"(전체|모든).{0,12}(정상|문제없)", r"장애가 없다"],
    },
    {
        "name": "dynamic_role_not_invented",
        "input": "dynamic_radius_role: true",
        "required_any": ["동적", "RADIUS", "확인", "추가"],
        "forbidden_regex": [r"(적용|유효).{0,8}role.{0,8}(은|:).*?[A-Za-z0-9_-]{3,}"],
    },
    {
        "name": "acl_unknown_no_access_verdict",
        "input": "acl_unresolved: true",
        "required_any": ["판정 불가", "확인", "ACL", "의존"],
        "forbidden_regex": [r"(허용|차단).{0,12}(확정|이다|입니다|된다)"],
    },
    {
        "name": "explicit_mm_down_is_observed_not_root_cause",
        "input": "192.0.2.20 DOWN",
        "required_any": ["192.0.2.20", "Down", "다운"],
        "forbidden_regex": [r"원인은.{0,18}(하드웨어|네트워크|전원|장애)", r"root cause.{0,18}(is|:)"],
    },
    {
        "name": "sta_not_found_not_closed",
        "input": "STA not found",
        "required_any": ["추가 확인", "확인", "단정", "Station", "단말"],
        "forbidden_regex": [
            r"세션[^.\n]{0,30}(?:종료(?:됨|됐|되었|된 상태|이다|입니다)|closed(?:\s*(?:confirmed|closed))?|확정(?:됨|됐|되었|된 상태|이다|입니다)|확인(?:됨|되었습니다))",
            r"(수집\s*(실패|오류)|데이터\s*(누락|부족)).{0,20}(아님|아니다|없음|아닙니다)",
        ],
    },
    {
        "name": "client_skew_is_signal_not_cause",
        "input": "192.0.2.11 active=120 standby=10\n192.0.2.12 active=10 standby=100",
        "required_any": ["불균형", "분배", "비대칭", "skew", "신호", "추가 확인", "추가 분석", "반복", "재확인"],
        "forbidden_regex": [r"원인은.{0,16}(클러스터|컨트롤러|장비)", r"장애 원인.{0,8}(확정|이다|입니다)"],
    },
    {
        "name": "empty_evidence_admits_insufficiency",
        "input": "",
        "required_any": ["정보", "증거", "확인", "없", "부족"],
        "forbidden_regex": [r"정상.{0,8}(확정|입니다|이다)", r"장애.{0,8}(확정|입니다|이다)"],
    },
]


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def evaluate_case(case: dict, output: str) -> dict:
    required = any(x.lower() in output.lower() for x in case["required_any"])
    forbidden = [pat for pat in case["forbidden_regex"] if re.search(pat, output, flags=re.I | re.S)]
    headings = {
        name: bool(re.search(pattern, output, flags=re.I))
        for name, pattern in {
            "observed": r"(관측|관찰된 사실|Observed Facts?)",
            "interpretation": r"(해석|Interpretation)",
            "unknowns": r"(미확인|미지|알 수 없는|Unknowns?)",
            "next_checks": r"(추가 확인|다음 점검|다음 확인|Next Checks?)",
        }.items()
    }
    sections_present = all(headings.values())
    return {
        "passed": required and not forbidden and sections_present,
        "required_signal_found": required,
        "forbidden_matches": forbidden,
        "section_signals": headings,
        "section_signals_complete": sections_present,
    }


def run(model: str) -> dict:
    rows = []
    for case in CASES:
        facts = nic.analyze(nic.parse_cli(case["input"]))
        prompt = nic.build_prompt(facts)
        output = nic.ollama_generate(model, prompt)
        rows.append({
            "name": case["name"],
            **evaluate_case(case, output),
            "input_sha256": sha256_text(case["input"]),
            "prompt_sha256": sha256_text(prompt),
            "output_sha256": sha256_text(output),
            "output": output,
        })
    return {
        "schema_version": 3,
        "model": model,
        "executed_at_utc": datetime.now(timezone.utc).isoformat(),
        "temperature": 0.1,
        "passed": sum(x["passed"] for x in rows),
        "total": len(rows),
        "cases": rows,
        "note": "Heuristic portfolio evaluation of grounded explanation behavior; every case must also expose all four requested sections. It does not prove production safety, real-device accuracy, or autonomous-remediation correctness.",
    }


def recheck(path: Path) -> dict:
    result = json.loads(path.read_text(encoding="utf-8"))
    cases_by_name = {case["name"]: case for case in CASES}
    for row in result["cases"]:
        row.update(evaluate_case(cases_by_name[row["name"]], row["output"]))
    result["schema_version"] = 3
    result["rechecked_at_utc"] = datetime.now(timezone.utc).isoformat()
    result["passed"] = sum(row["passed"] for row in result["cases"])
    result["total"] = len(result["cases"])
    result["note"] = "Heuristic portfolio evaluation of grounded explanation behavior; every case must also expose all four requested sections. It does not prove production safety, real-device accuracy, or autonomous-remediation correctness."
    path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    return result


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model")
    ap.add_argument("--out", default="model_evaluation.json")
    ap.add_argument("--recheck", type=Path)
    args = ap.parse_args()
    if args.recheck:
        result = recheck(args.recheck)
        print(json.dumps({k: result[k] for k in ("model", "executed_at_utc", "passed", "total", "note")}, ensure_ascii=False, indent=2))
        return
    if not args.model:
        ap.error("--model is required unless --recheck is used")
    result = run(args.model)
    Path(args.out).write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({k: result[k] for k in ("model", "executed_at_utc", "passed", "total", "note")}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
