"""Read-only checks: local HTML targets, roadmap accounting, and IP evidence state contracts."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
import json

ROOT = Path(__file__).resolve().parents[1]


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.ids = []

    def handle_starttag(self, tag, attrs):
        data = dict(attrs)
        for key in ("href", "src"):
            if data.get(key):
                self.links.append(data[key])
        if data.get("id"):
            self.ids.append(data["id"])


def check(condition, message):
    if not condition:
        raise AssertionError(message)


icon = (ROOT / "favicon.ico").read_bytes()
check(icon[:4] == b"\x00\x00\x01\x00", "Missing valid browser icon")

data = json.loads((ROOT / "learning-data.json").read_text(encoding="utf-8"))
check(len(data["topics"]) == 27 and len(data["stages"]) == 9, "Curriculum inventory changed")
ids = [t["id"] for t in data["topics"]]
check(len(ids) == len(set(ids)), "Duplicate topic IDs")
for key, total in data["summary"].items():
    expected = sum(t["status"] == "completed" for t in data["topics"]) if key == "completedTopics" else sum(t[key] for t in data["topics"])
    check(total == expected, f"Roadmap sum mismatch: {key}")
ip = next(t for t in data["topics"] if t["id"] == "ip-subnetting")
result = json.loads((ROOT / "results/ip-subnetting.json").read_text(encoding="utf-8"))
expected_ids = {"same-subnet", "different-subnet", "wrong-mask", "mask-recovery"}
evidence_metric_keys = ("labs", "faultScenarios", "packetCaptures", "recoveryValidations", "explainNotes", "automations")

check(result["plannedProvenance"] == "real-lab", "Expected isolated real lab plan")
check(result["environment"]["kind"] == "isolated-pnetlab", "IP Lab planned environment must be PNETLab")
check(len(result["scenarios"]) == 4 and {s["id"] for s in result["scenarios"]} == expected_ids, "Missing or duplicate validated scenarios")
for scenario in result["scenarios"]:
    if scenario["phase"] == "recovery":
        check(scenario["recovers"] in {s["id"] for s in result["scenarios"] if s["phase"] == "failure"}, "Unpaired recovery")

lab_status = result["labStatus"]
check(lab_status in {"not-run", "in-progress", "completed"}, f"Unknown IP Lab status: {lab_status}")

if lab_status == "not-run":
    check(ip["status"] != "completed", "IP Lab has no accepted runtime evidence yet")
    check(all(ip[k] == 0 for k in evidence_metric_keys), "Simulation inflated lab evidence")
    check(result.get("runId") is None, "Unexecuted Lab has a run ID")
    check(result["status"] == "NOT_RUN" and result["provenance"] is None, "Planned result claims observed provenance")
    check(result["actual"] is None and result["artifacts"] == [], "Unexecuted Lab has actual evidence")
    check(result["startedAt"] is None and result["finishedAt"] is None, "Unexecuted Lab has execution timestamps")
    check(result["environment"]["verified"] is False and result["review"]["status"] == "not-reviewed", "Plan claims reviewed environment")
    for scenario in result["scenarios"]:
        check(scenario["result"] == "NOT_RUN" and scenario["actual"] is None and scenario["artifacts"] == [],
              f"Simulation claimed actual evidence: {scenario['id']}")
else:
    check(result["provenance"] == "real-lab", "Executed IP Lab must use real-lab provenance")
    check(result.get("runId"), "Executed IP Lab requires runId")
    check(result.get("startedAt"), "Executed IP Lab requires startedAt")
    check(result["environment"]["verified"] is True, "Executed IP Lab requires verified environment")
    observed = [s for s in result["scenarios"] if s["result"] != "NOT_RUN"]
    check(observed, "Executed IP Lab has no observed scenarios")
    for scenario in observed:
        check(scenario["result"] in {"PASS", "FAIL", "INCONCLUSIVE"}, f"Invalid scenario result: {scenario['id']}")
        check(scenario["actual"] is not None, f"Observed scenario missing actual: {scenario['id']}")
        check(scenario["artifacts"], f"Observed scenario missing artifacts: {scenario['id']}")

    if lab_status == "in-progress":
        check(ip["status"] != "completed", "In-progress IP Lab marked completed")
        check(result["status"] in {"IN_PROGRESS", "FAIL", "INCONCLUSIVE"}, "Invalid in-progress aggregate status")
    else:
        check(result["status"] == "PASS", "Completed IP Lab aggregate status must be PASS")
        check(result.get("finishedAt"), "Completed IP Lab requires finishedAt")
        check(all(s["result"] == "PASS" for s in result["scenarios"]), "Completed IP Lab contains non-PASS scenario")
        check(ip["status"] == "completed", "Completed result not reflected in learning data")
        check(ip["labs"] >= 1 and ip["faultScenarios"] >= 1 and ip["packetCaptures"] >= 2 and
              ip["recoveryValidations"] >= 1,
              "Completed IP Lab metrics do not reflect the validated four-scenario run")
        check(result["review"]["status"] != "not-reviewed", "Completed IP Lab requires review")
        check(result["review"]["evidencePrivacyReviewed"] is True, "Completed IP Lab requires evidence privacy review")
        check(result["review"].get("contentQaReviewed") is True, "Completed IP Lab requires content QA review")
        check({c["id"] for c in result["claims"]} == {"IPSUB-01", "IPSUB-02", "IPSUB-03", "IPSUB-04"},
              "Validated Claim IDs changed")
        check(all(c["result"] == "PASS" for c in result["claims"]), "Completed IP Lab contains non-PASS Claim")
        check(result["contentQa"]["layout"] == "PASS" and result["contentQa"]["interaction"] == "PASS" and
              result["contentQa"]["javascript"] == "PASS", "Final two-stage content QA is incomplete")

# New framework pages plus stable learning entry points; unrelated portfolio apps
# can contain backend routes and are outside this static learning-site check.
pages = [ROOT / n for n in ("roadmap.html", "viewer.html", "ethernet-viewer.html")]
pages += sorted((ROOT / "labs").glob("*.html"))
broken = []
links_checked = 0
for page in pages:
    parser = Links()
    parser.feed(page.read_text(encoding="utf-8"))
    check(len(parser.ids) == len(set(parser.ids)), f"Duplicate HTML IDs in {page.name}")
    for link in parser.links:
        url = urlsplit(link)
        if url.scheme or url.netloc or not url.path:
            continue
        target = (ROOT / unquote(url.path.lstrip("/"))) if url.path.startswith("/") else page.parent / unquote(url.path)
        if target.is_dir():
            target /= "index.html"
        links_checked += 1
        if not target.is_file():
            broken.append(f"{page.relative_to(ROOT)} -> {link}")
check(not broken, "Broken static targets:\n" + "\n".join(broken))
print(f"PASS: 27 topics, IP evidence state={lab_status}, {len(pages)} pages / {links_checked} local links")
