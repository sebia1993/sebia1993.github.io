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
