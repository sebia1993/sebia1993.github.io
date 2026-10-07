# Packet lessons: guide alignment and ARP presentation

Scope: ICMP, VLAN / Trunk, Inter-VLAN Routing, DHCP, DNS. Current Concept Guides were read before changes (repository baseline 85596b2); original detailed evidence was retained.

## 1. Reused structure

All five retain the five ARP CSS imports and the shared lesson lifecycle. Device symbols directly reuse `ip-subnetting-devices.svg`. New `packet-labs-presentation.js/.css` is a geometry/presentation adapter, not a protocol model or second playback controller.

## 2. Guide alignment

| Topic | Guide display names | Matching learning objective | Additional diagram detail |
| --- | --- | --- | --- |
| ICMP | R1/R2/R3 → Router A/B/C | Echo round trip, TTL decrement/expiry, hop discovery, error interpretation | Existing Cisco UDP implementation and no-route Code 1 observation retain their original limitations |
| VLAN | PC20A/B → PC A/B; SW1/2 → Switch A/B | Access → Trunk → Access, VLAN boundary, allowed VLAN vs physical link | PC C/D are existing VLAN 10 controls; PC E/F existing Native VLAN 99 controls; explicit guideDifferences |
| Inter-VLAN | PC10A/B → PC A/B; PC20A/B → PC C/D; SW1 → Switch A | Subnet decision → Gateway MAC → Routing/TTL → new Ethernet Header | Actual four-host topology and both SVI addresses retained |
| DHCP | PC1 → PC A; R1/2 → Router A/B | DORA, delivered options, Relay, Lease success vs IP connectivity | Switch A is original SW1 omitted in the simplified Concept Guide; explicit guideDifferences |
| DNS | PC1/2 → PC A/B; R2/3 → Router B/C | Query vs IP traffic, Resolver/Cache, negative response vs no response | Switch A and Router A are existing transport devices omitted by the guide's query-relationship diagram; explicit guideDifferences |

Addresses, VLAN IDs, AS-independent network relationships, expected answers, vendor caveats, Capture Point references and original raw strings remain unchanged. Display-name substitutions are boundary-aware and only apply to the teaching presentation. Existing evidence is excluded from translations by the shared controller.

## 3. UI and Korean

Each of 25 questions now has a natural Korean title, a concrete introduction tied to the relevant guide, and two staged hints. Generic UI statuses and captions have Korean presentation mappings. Network terms, message identifiers, actual CLI/log text and raw evidence retain their technical meaning. ICMP's ambiguous “1단계에서 배운” introduction now says “학습 페이지에서 배운”.

## 4. Playback

The custom plan calls the existing renderer for each source event and associates it with `modelStepIndex`. Packets interpolate along the actual desktop SVG/link geometry and the corresponding compact mobile graph. ICMP request/reply/TTL-expiry/Traceroute directions are explicit. DHCP and DNS directions distinguish client request, server reply and stopped local traffic. Inter-VLAN observation keeps TTL and Ethernet fields synchronized with the source renderer. No packet is invented for a purely local decision or a recovery summary.

Duration: 1050 ms interpretation + 420 ms per traversed edge + 180 ms arrival hold; stationary judgment 1230 ms. This replaces universal 2490 ms. Shared controller owns animation frames, pause/resume, reset, stale callback protection and reduced-motion progression. No independent timers were added.

## 5. Domain regression

PASS: byte-equivalent serialized raw scenarios compared with HEAD before the presentation insertion, all five models. Source hashes:

- ICMP `92a3ebc871cbf7aed40a50a1ed920f8023d9161a7a254431fda0ea48bbe5663b`
- VLAN `f0eb487714d07876bc78c9fe8bc22647cd83aa38a7e8850136db7362ade6f1a2`
- Inter-VLAN `1e242cb03e0de4d2bb93d34a8486cb2e79d186902aba6a4926bc909b05c3cdd8`
- DHCP `921d8d58ed146b5457964231672bea1bcf2cb5b8f477b3a7c489ed56a39ae277`
- DNS `440a78ed7ffe372073b231f0993873ab7b3763115fa588b3970e170b38a57916`

PASS: `node --check` on five models and geometry helper. Overall data-only regression also reported 120 raw scenarios preserved. This is source/behavior preservation, not new PNETLab protocol validation.

## 6. Responsive QA

Implemented: ≤850 px dedicated compact topology, device-shaped symbols, no minimum-930 px canvas, no required horizontal pan. VLAN retains its eight devices with narrower host cards; DNS shows the transport devices in a vertical graph. Packet paths use the same graph in both layouts. VLAN's changing PC B Access VLAN label is synchronized in mobile.

NOT_RUN at this report checkpoint: fresh four-viewport visual comparison and live click path. CUA local preview attempt returned `ERR_CONNECTION_REFUSED` for 127.0.0.1:8765. Integration/browser QA owner will record the actual later results separately. Source inspection is not visual PASS.

## 7. Public QA

NOT_RUN at this report checkpoint; deployment and public verification are owned by the coordinating agent. No public QA claim is made here.

## 8. Necessary differences

Compact diagrams preserve network adjacency but arrange devices vertically instead of reproducing desktop coordinates. VLAN control hosts and DHCP/DNS transport devices are part of the previously validated lab, so they are retained with explicit naming correspondence instead of deleting them to match a simplified concept picture. Recovery-summary events show their verified state without inventing a single packet that represents an entire DORA or repair process.

## CI capture visual review — guide-aligned-v2

Actual, unmodified CI browser JPEGs were visually inspected under `/workspace/scratch/3ea555ad7246/qa/ci-final/guide-aligned-v2`:

- All five topics × 360, 768, 1366, 1920: `*-visual.jpg` (20 topology/current-observation captures).
- All five topics: `*-360-idle.jpg` and `*-360-completed.jpg` (10 full-page captures including titles, prediction, result and controls).
- Additional full-page initial representatives: `icmp-troubleshooting-768-idle.jpg`, `dns-1366-idle.jpg`, `vlan-trunk-1920-idle.jpg`.
- Total manually inspected: 33 native evidence images. This does not claim manual review of every scenario or every recorded state.

Observed problems and fixes after those captures:

1. **Shared overlay defect:** sticky question tabs covered the mobile diagrams. Reported to the shared-controller owner, who changed them to static positioning. Idle observation placeholders also left large empty areas; owner changed concealed panels to `display:none`.
2. **Inter-VLAN mobile ordering:** the packet field card preceded the diagram. Geometry helper now inserts the compact diagram immediately after the desktop placeholder, then the current-caption, then the packet card.
3. **DHCP/DNS desktop overlap:** capture-point labels overlapped router/switch symbols after display names grew. Topic-specific CSS moves DHCP labels above the equipment and DNS transport labels below it while keeping their link midpoints.
4. **VLAN desktop overlap:** the side-zone caption ran behind the top PC icon. The caption now sits in the topology's existing top padding.
5. **Mobile link semantics:** shared right-angle bars made independent switch links look like a common bus. Each mobile edge now connects its two devices directly, without introducing intermediate junctions.
6. **Remaining English UI:** added presentation translations for general role/status text such as `Local/Remote`, `After Resolution`, `Target`, `no lease`, `Transaction`, `Client LAN`, and `Edge`. Protected full technical message names such as Echo Request / Echo Reply / ARP Reply remain English. DHCP and DNS hero copy is now natural Korean.
7. **Implementation-oriented note:** generic mobile-rearrangement wording was replaced with device roles and what the learner should observe.

No unexpected final answer, active final path or filled result was visible in the inspected initial captures. The completed captures showed prediction/result comparisons and device names consistently. Card text wrapped within the inspected layouts; the reported overlaps were concrete labels/overlays rather than invented general failures.

**Status:** capture review performed; defects fixed in source. A fresh CI capture after these fixes is still required before marking the repaired visual cases PASS. The previous v2 captures are retained unchanged as evidence of the detected defects. Public click-path verification remains separate.

## Post-fix visual verification — PASS

CI run `37641266357`, commit `feee99d`. The five packet topics passed the automated suite. A further **25 original post-fix CI JPEGs** were opened and visually inspected:

- ICMP, VLAN, Inter-VLAN: `/workspace/scratch/3ea555ad7246/qa/ci-verified/guide-aligned-v2-packet-switching/`
- DHCP, DNS: `/workspace/scratch/3ea555ad7246/qa/ci-verified/guide-aligned-v2-services-routing/`
- Exact inspected sets in those directories: each topic's `{360,768,1366,1920}-visual.jpg` (20 images), plus each topic's `360-idle.jpg` (5 full-page images).

Post-fix findings:

| Repaired item | Result | Visible evidence |
| --- | --- | --- |
| Sticky question tabs covering the diagram | PASS | All five 360 visual captures: no question tab over the topology |
| Hidden observation panels leaving large idle gaps | PASS | All five 360 idle captures: event, reset/next and evidence follow without the prior large blank areas |
| Inter-VLAN mobile diagram before packet fields | PASS | 360/768 visual captures: topology, caption, then IPv4/Ethernet/TTL fields |
| DHCP capture-point labels covering devices | PASS | 1366/1920 visual captures: labels above cables, device symbols and names unobscured |
| DNS transport labels covering routers | PASS | 1366/1920 visual captures: transport labels below devices; symbols, names and addresses remain visible |
| VLAN zone caption behind top PC | PASS | 1366/1920 visual captures: both zone captions sit above their PC symbols |
| Mobile links suggesting an extra common bus | PASS | VLAN/Inter-VLAN/DNS 360/768 visual captures: separate device-to-switch links |
| Remaining generic status/copy translations | PASS for inspected screens | DHCP `같은 Subnet / 다른 Subnet`, DNS `이름 해석 후`, Korean DHCP/DNS headers and role notes |

No remaining blocking layout defect was found in these inspected screenshots. The fixed bottom next-action bar is an intentional viewport overlay; these full/element screenshots are not evidence that all text is simultaneously visible without scrolling. The CI interaction suite and coordinating agent own its reachability checks. No further source changes were made during this post-fix review. This supersedes the earlier “fresh CI capture required” checkpoint for the listed defects; it does not imply that every scenario/state was manually reviewed or that public-site verification has been performed here.
