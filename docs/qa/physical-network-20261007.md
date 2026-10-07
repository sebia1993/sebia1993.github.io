# Physical Network chapter QA — 2026-10-07

## Scope and reuse

New beginner Topic in Stage 0 only. Existing topic relative order and all other stages preserved. `roadmap.html` changes only the interactive URL map; JSON remains its dynamic data source. Completed-topic count goes 25 → 26; no lab/fault/PCAP/recovery count is added.

Guide uses the current `concept-guide.css` semantic structure, navigation, sections, table and CTA; its scoped light palette uses the ARP variables to satisfy the explicit bright-design requirement. Simulator directly imports all five ARP CSS files, reuses header, tabs, progress, coach, prediction, buttons, topology surface and event/result structures, and uses the existing switch SVG symbol. AP, SFP and FDF icons and responsive physical-link geometry are topic-specific. No new theme switch, advanced mode, speed selector or CLI was added.

## Content / claim review

See [Research and Claim Map](../physical-network-research.md). Beginner first-topic audit: no assumed IP/MAC/routing knowledge. One goal, requested section order, one self-explanation question and one final primary Lab CTA. Cat5e has a working baseline. AP power/link/upstream service are distinct. GBIC and SFP are not equated. Source review supports documentary claims; actual hardware and PNETLab are NOT_RUN.

## Local browser QA

Test: `tests/physical-network-browser.mjs`; Chromium via Playwright. Browser layout emulation, not physical phone/tablet testing.

| Viewport | Guide/layout | 4 scenarios + replay | Correct/wrong prediction | Reset/race | Navigation | Console/assets |
|---|---|---|---|---|---|---|
| 360 × 800 | PASS | PASS | PASS | PASS | PASS | PASS |
| 768 × 1024 | PASS | PASS | PASS | PASS | PASS | PASS |
| 1366 × 768 | PASS | PASS | PASS | PASS | PASS | PASS |
| 1920 × 1080 | PASS | PASS | PASS | PASS | PASS | PASS |

Verified: no document horizontal overflow, no overlapping/clipped topology nodes, baseline, every fault, every reset and rerun, correct/wrong grades, replay score stability, pause/resume remaining time, mid-play reset/scenario cancellation, manual event review, all element role buttons, reset hit-test after scrolling, concept-to-lab and lab-to-concept clicks, history/reload fresh start, roadmap order and concept link. 64 model combinations are software state tests only.

Local site-link checker: PASS, 57 HTML pages / 491 local links at the time of this change. CSS parse, JS syntax and duplicate-ID checks: PASS. Existing unit tests: 11/11 PASS. Shared CSS, original ARP and other existing lesson sources are unchanged.

Found and fixed before publication: mobile concept UTP inherited desktop grid row; primary action was hidden by ARP's historical `!important` rule; playback button inherited a smaller font than the reference; the assumption banner used nowrap text that overflowed at 200% size. State-based connector lines now join device icons and cable segments at every breakpoint. The disabled Run button remains discoverable before prediction, and mobile Run is before the map, with no new sticky overlay.

## Supplemental review

`tests/physical-network-accessibility.mjs` compares computed ARP shell styles, performs real-wall-clock playback/replay, keyboard activation, reduced-motion playback, 200% text sizing and forced-color screenshot capture. PASS: shared shell computed styles; keyboard selection/run; reduced-motion execution; 200% text sizing without document overflow. Forced-color screenshots were visually reviewed. Normal four-event playback completed in 9948 ms and replay preserved the score. Results are recorded in the supplemental QA JSON. A 2490 ms observation event reuses the reference timing components (1050 + 3×420 + 180 ms). Physical observations do not animate fictitious packets.

## Public QA

PASS on the deployed GitHub Pages content commit `c8ac216e53031e92be7a6777b233bb19773a69a5`, 2026-10-07 UTC. Pages build/deployment run `37598567906` completed successfully.

The same browser test ran against `https://sebia1993.github.io` at all four required viewports. Every row passed layout, all four scenarios, prediction, replay/reset, navigation and console/assets. See [public browser results](physical-network-public-20261007.json). Public mobile/desktop screenshots were also visually reviewed. These are browser tests of a Teaching Simulation, not physical hardware evidence.

The two new pages, roadmap, JSON, topic JS/CSS and seven shared assets (15 files total) returned HTTP 200 and matched the local committed files byte for byte: [asset hashes](physical-network-public-assets-20261007.json). No console error, failed asset request or HTTP 4xx/5xx was observed in the chapter browser run. An additional 360/1366-width check clicked Roadmap → Interactive Lab → Roadmap: [navigation results](physical-network-public-navigation-20261007.json).

## Repository-wide CI observation

The chapter checks above and the Pages deployment pass. This does **not** mean every pre-existing repository workflow is green. Existing BGP, Redistribution, Observability and Network Automation public tests failed while waiting for exact legacy concept text in rendered `body.innerText`, despite HTTP 200. Job logs: [BGP](https://github.com/sebia1993/sebia1993.github.io/actions/runs/37598568619), [Redistribution](https://github.com/sebia1993/sebia1993.github.io/actions/runs/37598568622), [Observability](https://github.com/sebia1993/sebia1993.github.io/actions/runs/37598568614), [Network Automation](https://github.com/sebia1993/sebia1993.github.io/actions/runs/37598568653). Their lesson and test files are unchanged from parent `7fe3852411d1f8883b7b01bff9a4f7d7909f141e`; these failures occur before their roadmap checks. The legacy phrases remain in source but are not found by those rendered-body checks. Repair of those other-topic tests is outside this chapter change.

## Known limits

- All physical fault outcomes are Teaching Simulation, not new hardware evidence.
- Single uplink/no redundant path, PoE-only AP power, compatible optical modules and otherwise normal configuration are explicit model assumptions.
- Actual WLAN service behavior, optics diagnostics, live link negotiation/detection and real-device recovery were not measured.
- Reading time is a 5–8 minute design target; no learner timing study was conducted.
- Responsive checks emulate CSS viewports; no specific Android/iOS physical device was tested.
