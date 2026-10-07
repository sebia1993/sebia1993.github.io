# IP Subnetting — ARP template adaptation

## Scope and reusable source

Reference: `labs/arp-default-gateway-simulator.html`, baseline commit `1e7ea4d50aade2f67f33b8ad88442fe26c773c95`.
Target: `labs/ip-subnetting-simulator.html` at the existing GitHub Pages URL.

The target directly loads the reference's `arp-simulator-1.css`, `-2.css`, `-3.css`, `-mobile.css`, and `-mobile-follow.css`. Those shared assets are unchanged. Header, container, coach, lesson tabs, progress, prediction choices, CTA, event strip, result feedback, reset/next, optional panels and breakpoints use the original classes/DOM patterns. Device symbols and their gradients are copied without redesign from `arp-topology-1.js` into a target-only SVG. The ARP state scripts are not run in the subnet lab.

The Concept Guide (`ip-subnetting.html`) and the ARP reference are unchanged. No shared stylesheet or IPv4 arithmetic module is modified.

## Preserved and adapted functionality

The original four question/choice/answer/evidence records and bounded observation model are preserved in `ip-subnetting-model.js`: same subnet, different subnet, wrong /24 mask, recovered /25 mask. Their original claims/evidence remain historical evidence, not a new PNETLab run. Prediction, scoring, replay, reset, all-results review, wrong-answer review, /24-/25 comparison, and fresh-start reload/BFCache behavior remain available.

Three address-space questions precede them: Network /26, Broadcast /27, usable Host range /30. Optional custom IP/CIDR calculation and random address exercises use the existing `assets/lab/ipv4.js` unchanged, including /0, /31 and /32 semantics. The former simulator itself had no free-form calculator; the shared repository module already supported these calculations.

Dark target-only styling, answer-bearing pre-run explanatory map, duplicated event displays, and calculator-style numeric explanation competing with observation are replaced. Manual step controls remain optional after completion. Grade and Next stay gated until the last event finishes. Replay cannot earn additional score.

## State and visual timing

One cancellable requestAnimationFrame chain owns RUNNING/PAUSED/COMPLETED transitions. Generation invalidation protects reset, scenario/custom-input changes, and page exit. Pause preserves elapsed time within the current event and packet link. Foreground return requires explicit Resume after a hidden-tab pause. Full-page automatic event-follow scrolling is absent; only explicit Run and final result reveal align the viewport.

Timing is composed from actual reference constants: 420 ms per geometric segment and 180 ms arrival hold (`arp-simulator-4.js:move`), plus 1050 ms judgment (`arp-simulator-2.js:showRouteLookup`). Logical packet hops preserve the reference waypoint counts: PC1/PC3 ↔ SW1 = 3 segments, other links = 2. Address stages combine judgment and a three-segment observation: 2490 ms per stage. CSS event transitions/reveal reuse 180 ms. There is no speed setting. Reduced motion removes traveling markers while keeping event ordering and dwell time.

Address stages reveal prefix length, 32-bit boundary, block size, selected block, network, broadcast and hosts. More than four blocks are explicitly labeled as a magnified window. /31 and /32 do not present a LAN broadcast address.

## Validation

- `npm test`: 11 tests pass, including 429 Python `ipaddress` oracle cases spanning every prefix /0–32 and .63/.64/.65/.127/.128/.129 boundary addresses. Each active visual block matches the oracle network and contains the input IP.
- Original four scenario resolution outcomes: true / true / false / true. ARP targets: .20 / .1 / .140 / .1.
- `tests/ip-network-sim.mjs`: required 360×800, 768×1024, 1366×768 and 1920×1080 viewports; computed shell style parity, initial gating, progressive reveal, run-once, pause/resume, replay score invariance, in-flight reset, scenario replacement, error/correct grading, optional mask comparison, free-input calculation, invalid input and fresh start.
- Browser suite uses virtual time for deterministic state/race coverage; real-time reference/target playback is measured separately. Screenshots and machine results are emitted to ignored `test-results/`.
- No new device/packet claim validation or PNETLab run is claimed.

Known unrelated baseline issue: `python3 tests/check_site.py` fails on its hardcoded inventory assertion (expects 27 topics, while baseline HEAD already has 26 following the roadmap edits). Neither roadmap content nor this unrelated gate was changed for this UI task.

## Necessary differences

The content surface uses address blocks and exact 32-bit partitions instead of packets for arithmetic. Packets/device paths appear only in the four preserved communication scenarios. Seven exercises replace four because the requested Network/Broadcast/Host observation precedes the preserved lessons. Mobile uses the reference's stacked shell and compact device geometry; it does not shrink desktop labels. Optional IP calculation replaces ARP-specific neighbor/configuration tools. New controls are limited to Pause/Resume/Replay required by this task.
