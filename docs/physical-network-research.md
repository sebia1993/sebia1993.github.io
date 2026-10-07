# Physical Network — Research, Claim Map and Validation Scope

- Topic: 물리 네트워크 / UTP · Fiber · SFP (`physical-network`)
- Reviewed: 2026-10-07
- Learning goal: AP와 네트워크 장비가 UTP·광케이블·SFP를 통해 어떻게 연결되는지 설명할 수 있다.
- Core question: AP에서 상위 네트워크 장비까지 실제로 무엇을 거쳐 연결되는가?
- Model: AP → UTP → Access Switch → SFP → Fiber → FDF → Fiber → SFP → Distribution/Core Switch.
- Topology visualization: REQUIRED; provenance is **Teaching Simplification**, not an observed PNETLab topology.
- Learner flow: Concept Guide → Interactive Lab; 5–8 minute guide is an editorial target, not a measured reading-time result.

## Applied rules

The explicit physical-topic work order takes precedence over the generic Pipeline's actual-lab promotion gate. Physical facts are checked against official sources. Browser QA validates implementation, not hardware. The runtime gate for actual PNETLab work is not invoked because no actual-lab run is requested or performed.

Read Drive Network Learning Pipeline v1.10, Two-Stage Technical Learning Design v2.7, Network Lab Validation Standard v1.4, Network Topology Visualization v1.7 and Beginner Network Learning Page Audit v1.8, plus network-simulator-template. The project-index Validation Standard ID was unavailable; the current document linked by Pipeline was read instead. No shared learning-state or unrelated skill documents were changed for this explicitly scoped repository addition.

## Official sources

| ID | Source | Applicable section / scope |
|---|---|---|
| S1 | [IEEE 802.3-2022](https://standards.ieee.org/ieee/802.3/10422/) | Official standard scope: Ethernet over twisted-pair and optical media, power over selected twisted-pair PHYs. Public abstract only; no claim of inspecting paid normative clauses. |
| S2 | [Fluke Networks: Network Engineers](https://www.flukenetworks.com/expertise/role/network-engineers) | Copper performance table lists Cat5e, Cat6, Cat6A and Ethernet applications; installed cabling and qualification. Official test-equipment vendor explanation, not the TIA standard itself. |
| S3 | [Cisco C9350 Hardware Guide: Front-panel components](https://www.cisco.com/c/en/us/td/docs/switches/lan/cisco9350/hig/c9350-smart-hig/product-overview-9350/front-panel-components-9350.html) | “PoE, PoE+, Cisco UPoE, and Cisco UPoE+ ports”: power on the cable used for data; RJ45 copper ports. Product-specific power classes are excluded. |
| S4 | [Corning: How It Works — Optical Fiber](https://www.corning.com/worldwide/en/innovation/the-glass-age/science-of-glass/how-it-works-optical-fiber.html) | Light carries information; single-mode / multimode are distinct fiber types. |
| S5 | [Cisco Gigabit Ethernet SFP data sheet](https://www.cisco.com/c/en/us/products/collateral/interfaces-modules/gigabit-ethernet-gbic-sfp-modules/datasheet-c78-366584.html) | Product overview, 1000BASE-T, optical SFP and cabling. Optical and copper modules exist; page deliberately focuses on optical. |
| S6 | [Cisco 10GBASE SFP+ data sheet](https://www.cisco.com/c/en/us/products/collateral/interfaces-modules/transceiver-modules/data_sheet_c78-455693.html) | 10G SFP+ modules and supported media. Used as an example, not a universal speed/form-factor equivalence. |
| S7 | [Cisco ASR9000: Line cards and transceivers](https://www.cisco.com/c/en/us/td/docs/iosxr/asr9000/hardware-install/ethernet-line-card-installation-guide/b-asr9k-ethernt-line-card-install-guide/b-asr9k-ethernt-line-card-install-guide_chapter_01.html) | “SFP Modules” / “Fiber-Optic Interface Cables”: compatible interfaces at opposite cable ends and connecting another router/switch. Physical removal procedures are not simulated. |
| S8 | [CommScope Optical Distribution Frames](https://www.commscope.com/product-type/frames-panels-cassettes-modules/optical-distribution-frames-odf/) | FACT frame and patch chassis: cable routing and patching. FDF/ODF role simplified to one intermediate connection point. |
| S9 | [Cisco Business Switches: SFP Modules](https://www.cisco.com/c/en/us/support/docs/smb/switches/Cisco-Business-Switching/kmgmt-1524-SFP-Modules-CBS.html) | Introduction and general tips: transceiver role, GBIC distinct size/form factor, SFP/SFP+ similar size and higher supported speed. Port support statements remain CBS-specific. |

Sources were opened and read, not accepted from search snippets. An apparent Cat6A speed typo in S3's multigigabit paragraph is **not used**. Cat6A application comes from S2/S6. No fiber color, distance, wavelength or detailed compatibility rule is inferred from these introductory descriptions.

## Claim map

`sourceReview` is separate from `hardwareResult`. CONFIRMED below means that the specified documentary scope supports the claim, not that physical equipment was tested.

| Claim ID | Claim / expected meaning | Type | Source and bounds | sourceReview | hardwareResult |
|---|---|---|---|---|---|
| PHY-01 | Ethernet can use twisted-pair copper and optical media; a usable physical connection underlies this wired path. | Standard Behavior | S1 official scope only. UTP as an unshielded twisted-pair copper example: S5. | CONFIRMED | NOT_RUN |
| PHY-02 | Cat5e, Cat6, Cat6A are recognized cabling categories. Cat5e/Cat6 can support typical 1G connections; Cat6A also supports 10G under required channel conditions. | Teaching Simplification | S2 application table. Category is not guaranteed negotiated speed; no blanket Cat5e maximum-speed claim. | CONFIRMED | NOT_RUN |
| PHY-03 | PoE-capable equipment can provide power and data over the same copper cable; RJ45-style connector used in these copper Ethernet examples. | Standard Behavior | S1 power-over-twisted-pair scope; S3 product documentation explains implementation. No power-class generalization. | CONFIRMED | NOT_RUN |
| PHY-04 | Fiber transmits information with light; single-mode and multimode are major categories. | Teaching Simplification | S4 explains physical principle. No distances/wavelengths required. | CONFIRMED | NOT_RUN |
| PHY-05 | Optical SFP is a transceiver between a device port and fiber. | Teaching Simplification | S5/S9 describe optical/copper variants; teaching page explicitly optical scope. | CONFIRMED | NOT_RUN |
| PHY-06 | Device support, speed and optical media must match; matching modules/interfaces at both ends form this example link. | Implementation Behavior | S5/S7/S9; module support is platform-specific, not an IEEE vendor-lock rule. | CONFIRMED | NOT_RUN |
| PHY-07 | Common Ethernet examples: 1G SFP, 10G SFP+; similar small form factor does not establish compatibility. GBIC and SFP are distinct. | Teaching Simplification | S5/S6/S9. SFP has other speed/application variants; these examples are not exhaustive definitions. “지빅” is a colloquial field term supplied in the work order, not a standard term. | CONFIRMED | NOT_RUN |
| PHY-08 | FDF can be an intermediate fiber organization/connection point. | Teaching Simplification | S8 patching/frame products; not mandatory in every optical link and not a forwarding switch. | CONFIRMED | NOT_RUN |
| PHY-09 | Cat5e can be encountered in operating networks; its label alone does not establish failure. | Teaching Simplification | S2 installed-cabling discussion + generalized user experience. No claim that a particular private site was measured. | CONFIRMED | NOT_RUN |
| PHY-10 | Disconnect only AP01's sole UTP: AP01 loses wired connectivity; with sole PoE supply it also loses power; AP02 and shared uplink remain connected. | Teaching Simplification | Inference from S1/S3 with explicit independent AP cables, powered switch, no additional fault. | MODEL_DEFINED | NOT_RUN |
| PHY-11 | Missing Access optical SFP or broken fiber path brings the sole uplink down while AP UTP/PoE and switch power remain up. Both APs' upstream-dependent service is affected. | Teaching Simplification | Inference from S3/S5/S7 under a single upstream path. Does not claim all WLAN/local services fail or every AP reboots. | MODEL_DEFINED | NOT_RUN |

All physical `actual` observations are null and hardware artifact lists empty. No live network, CLI, PCAP, optical meter or PNETLab experiment was run. Website counts for labs, faultScenarios, packetCaptures and recoveryValidations are **0** for this topic. Existing summary totals for those categories are preserved, not independently re-audited by this change. `completedTopics` counts completed topic objects (25 → 26), not hardware passes.

## Teaching Simulation contract

| Scenario | Baseline | Single changed variable | Expected browser model |
|---|---|---|---|
| Normal | Both Cat5e AP connections, compatible SFPs and Fiber present; powered switches | None | AP01/AP02 ONLINE, 1G UTP, PoE ON, UPLINK UP |
| AP01 UTP removed | Same baseline | `utp1 = false` | AP01 OFFLINE/power OFF, AP02 ONLINE, switches ON, UPLINK UP |
| Access SFP absent | Same baseline | `sfpa = false` | UPLINK DOWN, APs power ON/UTP UP, upstream service affected |
| Access-side Fiber disconnected | Same baseline | `fibera = false` | SFPs still OK, UPLINK DOWN, APs power ON/UTP UP, upstream service affected |
| Reset | Any playback phase | Restore all baseline booleans | Cancel all old callbacks; normal links/power; current prediction/grade cleared |

No actual port, building, company, address, configuration or cable-plant identity is used. AP01/AP02 are synthetic labels mandated for the teaching example. The Fiber/SFP state transition represents a resulting condition, not instructions to pull a live module with a cable attached. The 2490 ms step duration is reading time based on the existing ARP timing, not a measured link-detection time.

## Scope deliberately omitted

Optical power/DOM/DDM, loss budgets, wavelength and detailed reach tables, OM/OS memorization, advanced transceiver families, BiDi/WDM, DAC/AOC, splicing/pigtails/trays/core numbering, OTDR and vendor compatibility matrices. No CLI emulator, packet headers, PCAP or new learner stage.

## Beginner audit

Learner baseline: first Roadmap topic, no prior networking knowledge. AP, Switch, Port, UTP/Copper, PoE, Fiber, SFP/Transceiver, FDF, Link and Uplink are introduced with adjacent plain-language roles. No IP arithmetic, VLAN, routing or protocol knowledge is required. The required English topic title is followed by role-first pictures. One final self-explanation question and one primary lab CTA. FDF remains a supporting element; the longest instructional section is UTP.

Content review fixes: distinguish AP power from upstream service, qualify Cat5e by channel conditions, avoid universal SFP speed/compatibility rules, distinguish FDF from a forwarding switch, make all model assumptions visible. No real-world claim was promoted from browser test output.
