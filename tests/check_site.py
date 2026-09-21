"""Read-only checks: local HTML targets, roadmap accounting, unexecuted IP evidence."""
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


data = json.loads((ROOT / "learning-data.json").read_text(encoding="utf-8"))
check(len(data["topics"]) == 27 and len(data["stages"]) == 9, "Curriculum inventory changed")
ids = [t["id"] for t in data["topics"]]
check(len(ids) == len(set(ids)), "Duplicate topic IDs")
for key, total in data["summary"].items():
    expected = sum(t["status"] == "completed" for t in data["topics"]) if key == "completedTopics" else sum(t[key] for t in data["topics"])
    check(total == expected, f"Roadmap sum mismatch: {key}")
ip = next(t for t in data["topics"] if t["id"] == "ip-subnetting")
check(ip["status"] != "completed", "IP Lab has no accepted runtime evidence yet")
check(all(ip[k] == 0 for k in data["summary"] if k != "completedTopics"), "Simulation inflated lab evidence")
for topic in data["topics"]:
    if topic.get("detailUrl"):
        check((ROOT / topic["detailUrl"]).is_file(), f"Missing topic page: {topic['id']}")

result = json.loads((ROOT / "results/ip-subnetting.json").read_text(encoding="utf-8"))
check(result["labStatus"] == "not-run", "Unexecuted Lab status changed")
check(result.get("runId") is None, "Unexecuted Lab has a run ID")
check(result["status"] == "NOT_RUN" and result["provenance"] is None, "Planned result claims observed provenance")
check(result["plannedProvenance"] == "real-lab", "Expected isolated real lab plan")
check(result["actual"] is None and result["artifacts"] == [], "Unexecuted Lab has actual evidence")
check(result["startedAt"] is None and result["finishedAt"] is None, "Unexecuted Lab has execution timestamps")
expected_ids = {"same-subnet", "different-subnet", "wrong-mask", "mask-recovery", "wrong-gateway", "gateway-recovery"}
check(len(result["scenarios"]) == 6 and {s["id"] for s in result["scenarios"]} == expected_ids, "Missing or duplicate planned scenarios")
for scenario in result["scenarios"]:
    check(scenario["result"] == "NOT_RUN" and scenario["actual"] is None and scenario["artifacts"] == [],
          f"Simulation claimed actual evidence: {scenario['id']}")
    if scenario["phase"] == "recovery":
        check(scenario["recovers"] in {s["id"] for s in result["scenarios"] if s["phase"] == "failure"}, "Unpaired recovery")
check(result["environment"]["verified"] is False and result["review"]["status"] == "not-reviewed", "Plan claims reviewed environment")

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
print(f"PASS: 27 topics, evidence totals unchanged, NOT_RUN result, {len(pages)} pages / {links_checked} local links")
