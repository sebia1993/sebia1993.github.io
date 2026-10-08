# Physical Network — Research, Claim Map and Validation Scope

- Topic: 물리 네트워크 / UTP · Fiber · SFP (`physical-network`)
- Reviewed: 2026-10-07
- Learning goal: AP와 네트워크 장비가 UTP·광케이블·SFP를 통해 어떻게 연결되는지 설명할 수 있다.
- Core question: AP에서 상위 네트워크 장비까지 실제로 무엇을 거쳐 연결되는가?
- Model: AP A / AP B → UTP → Switch A → SFP → Fiber → FDF → Fiber → SFP → Switch B.
- Topology visualization: REQUIRED; provenance is **Teaching Simplification**, not an observed PNETLab topology.
- Learner flow: Concept Guide → Interactive Lab; 5–8 minute guide is an editorial target, not a measured reading-time result.

## Applied rules

The explicit physical-topic work order takes precedence over the generic Pipeline's actual-lab promotion gate. Physical facts are checked against official sources. Browser QA validates implementation, not hardware. The runtime gate for actual PNETLab work is not invoked because no actual-lab run is requested or performed.

Read the current project skills: Network Learning Pipeline v1.1, Two-Stage Technical Learning Design v1.1, and Network Lab Validation Standard v1.0. The physical-topic work order explicitly keeps this chapter at Concept Guide → Interactive Lab and does not force a PNETLab stage. No shared learning-state or unrelated skill documents were changed for this scoped re-audit.

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
| PHY-10 | Disconnect only AP A's sole UTP: AP A loses wired connectivity; with sole PoE supply it also loses power; AP B and shared uplink remain connected. | Teaching Simplification | Inference from S1/S3 with explicit independent AP cables, powered switch, no additional fault. | MODEL_DEFINED | NOT_RUN |
| PHY-11 | Missing Switch A-side optical SFP or broken fiber path brings the sole uplink down while AP UTP/PoE and switch power remain up. Both APs' upstream-dependent service is affected. | Teaching Simplification | Inference from S3/S5/S7 under a single upstream path. Does not claim all WLAN/local services fail or every AP reboots. | MODEL_DEFINED | NOT_RUN |

All physical `actual` observations are null and hardware artifact lists empty. No live network, CLI, PCAP, optical meter or PNETLab experiment was run. Website counts for labs, faultScenarios, packetCaptures and recoveryValidations are **0** for this topic. Existing summary totals for those categories are preserved, not independently re-audited by this change. `completedTopics` counts completed topic objects (25 → 26), not hardware passes.

## Teaching Simulation contract

| Scenario | Baseline | Single changed variable | Expected browser model |
|---|---|---|---|
| Normal | Both Cat5e AP connections, compatible SFPs and Fiber present; powered switches | None | AP A/AP B 정상, UTP 1G 연결, PoE 공급, 상위 연결 정상 |
| AP A UTP removed | Same baseline | `utp1 = false` | AP A 연결 끊김/전원 꺼짐, AP B 정상, 스위치 전원 켜짐, 상위 연결 정상 |
| Switch A SFP absent | Same baseline | `sfpa = false` | 상위 연결 끊김, AP 전원 켜짐/UTP 연결, 상위망 서비스 영향 |
| Switch A-side Fiber disconnected | Same baseline | `fibera = false` | SFP 장착 유지, 상위 연결 끊김, AP 전원 켜짐/UTP 연결, 상위망 서비스 영향 |
| Reset | Any playback phase | Restore all baseline booleans | Cancel all old callbacks; normal links/power; current prediction/grade cleared |

No actual port, building, company, address, configuration or cable-plant identity is used. AP A / AP B and Switch A / Switch B are synthetic labels used consistently across the Concept Guide and Interactive Lab. The Fiber/SFP state transition represents a resulting condition, not instructions to pull a live module with a cable attached. The 2490 ms step duration is reading time based on the existing ARP timing, not a measured link-detection time.

## Scope deliberately omitted

Optical power/DOM/DDM, loss budgets, wavelength and detailed reach tables, OM/OS memorization, advanced transceiver families, BiDi/WDM, DAC/AOC, splicing/pigtails/trays/core numbering, OTDR and vendor compatibility matrices. No CLI emulator, packet headers, PCAP or new learner stage.

## Beginner audit

Learner baseline: first Roadmap topic, no prior networking knowledge. AP, Switch, Port, UTP/Copper, PoE, Fiber, SFP/Transceiver, FDF, Link and Uplink are introduced with adjacent plain-language roles. No IP arithmetic, VLAN, routing or protocol knowledge is required. The required English topic title is followed by role-first pictures. One final self-explanation question and one primary lab CTA. FDF remains a supporting element; the longest instructional section is UTP.

Content review fixes: distinguish AP power from upstream service, qualify Cat5e by channel conditions, avoid universal SFP speed/compatibility rules, distinguish FDF from a forwarding switch, make all model assumptions visible. No real-world claim was promoted from browser test output.


## 2026-10-08 — Cat5e internal-structure photograph

Scope: Concept Guide only. The user requested a real stripped-cable photograph to help understand occasional cable replacement. No skill, simulator, roadmap or actual network was changed.

| Claim | Official documentary source | Scope / status |
|---|---|---|
| The common 4-pair Cat5e U/UTP example has eight individually insulated copper conductors beneath an outer jacket. | [CommScope 57535-2](https://www.commscope.com/product-type/cables/twisted-pair-cables/category-5e-cables/item57535-2/) — General/Material Specifications | Source review CONFIRMED; hardware NOT_RUN. No measurement of the user's cable model. |
| The four pairs use blue/orange/green/brown and matching white-striped conductors. | [Belden 1213](https://www.belden.com/products/cable/ethernet-cable/category-5e-cable/1213) — Construction / Insulation | Source review CONFIRMED. Pair membership, not RJ45 pin order. |
| Twisting reduces crosstalk; excessive untwisting at termination can impair performance. | [Fluke Networks: Physics of Twisted Pair Cabling](https://www.flukenetworks.com/blog/cabling-chronicles/physics-twisted-pair-cabling) | Source review CONFIRMED; brief structural explanation only, no termination tutorial or certification claim. |

Photo: Richard Wheeler (Zephyris), “CAT5e Cable.jpg,” Wikimedia Commons. [File description and license](https://commons.wikimedia.org/wiki/File:CAT5e_Cable.jpg), [original JPEG](https://upload.wikimedia.org/wikipedia/commons/d/d1/CAT5e_Cable.jpg), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). Original 2048 × 1536 JPEG copied without changes to `labs/images/cat5e-twisted-pairs.jpg`. The caption credits the author, links the source and license, and identifies this as a general example rather than a photograph from the user's workplace. Display scaling uses CSS without cropping.

The earlier user-supplied operating context remains scoped to the user's managed area: Cat5e is currently used there; other teams' cabling is unknown. This is not independently measured evidence and does not identify a manufacturer, site, or complete cable plant.

Browser QA: checked 360, 768, 1366 and 1920 px viewport widths, each in a fresh page. The original image loaded at 2048 × 1536, normal and doubled text sizes produced no horizontal document overflow, and no page errors or failed assets were observed. Mobile and desktop screenshots were visually reviewed. These are presentation checks, not cable or hardware validation.

## 2026-10-08 — Fiber color identification

User-requested Concept Guide addition only; no skill or simulator changes. Colored HTML swatches illustrate common indoor patch-cord jackets with readable Korean labels. This is not a record of the user's installed fiber plant. The original exclusion of OM/OS memorization remains: identifiers are introduced only to help read the jacket, without speed, wavelength or reach tables.

| Claim | Primary source | Scope / status |
|---|---|---|
| Common premises jacket examples: yellow singlemode OS1/OS2, orange OM1/OM2, aqua OM3/OM4, lime green OM5. Other colors exist, outdoor jackets are often black, and internal fiber colors identify strands separately. | [FOA color guide](https://www.thefoa.org/tech/ColCodes.htm), Cable Jacket Colors / Fiber Color Codes | Source review CONFIRMED; hardware NOT_RUN. Examples, not universal identification or compatibility proof. |
| OM4 may be aqua or Erika violet; orange and aqua alone do not distinguish the paired categories. Check printed classification. | [Belden: differentiating OM3 and OM4](https://www.belden.com/blog/differentiating-between-om3-and-om4) | Source review CONFIRMED; manufacturer convention clearly qualified. |
| Common singlemode connector bodies use blue for UPC and green for APC. Unlike mating endfaces must not be joined; hybrid cords with different terminations at opposite ends do exist. | [Fluke Networks: APC connector basics](https://www.flukenetworks.com/blog/cabling-chronicles/101-series-what-apc-connector-and-how-do-i-test-it) | Source review CONFIRMED; optional short disclosure. No connector geometry, splicing, optical measurement or termination procedure added. |

The existing instruction to match optical modules and media also applies when replacing a patch cord. Color, jacket print/product label and module specification are presented together. User-supplied Cat5e operating scope and photograph attribution remain unchanged.

Browser QA: fresh pages at 360, 768, 1366 and 1920 px. The five-row labeled color table and keyboard-operated connector disclosure passed normal/200% text overflow checks, with no duplicate IDs, page errors or failed local assets. Mobile and desktop screenshots were visually reviewed. No physical cable test was performed.

## 2026-10-08 — 지빅 naming and specification reading

The user requested 지빅 as the convenient primary term on this Concept Guide, with singlemode/multimode identification and label reading. The guide explicitly defines this as a colloquial name for optical SFP/SFP+ modules; it does not equate the distinct GBIC and SFP form factors. Diagram labels are 지빅 A/B with SFP A/B aliases retained for the existing lab. No simulator, shared model or skill was changed. This narrowly extends the earlier excluded specification detail to two identification examples; optical power, full reach tables and installation procedures remain out of scope.

| Claim / example | Primary source | Qualification |
|---|---|---|
| J9150D: 10G SFP+, LC, SR, 850 nm, MMF; OM3 up to 300m, OM4 up to 400m. | [HPE product naming](https://buy.hpe.com/us/en/options/transceiver-options/networking-transceiver-options/hpe-aruba-networking-10g-sfp-lc-sr-300m-om3-mmf-transceiver/p/j9150d) and [HPE Aruba transceiver guide](https://arubanetworking.hpe.com/techdocs/Switches/xcvrs/xcvr_guide/Content/GUID-C1449A69-FEA4-4DA4-AD25-C73A7FB9CF0A.html) | Manufacturer specifications, not a statement about the user's installed module or measured reach. |
| J9151E: 10G SFP+, LC, LR, 1310 nm, SMF; up to 10km under specified conditions. | [HPE product naming](https://buy.hpe.com/kr/ko/options/transceiver-options/networking-transceiver-options/hpe-aruba-networking-10g-sfp-lc-lr-10km-smf-transceiver/p/j9151e) and the same HPE Aruba guide | Both examples use duplex LC; neither LC nor SFP+ identifies fiber mode. Singlemode does not mean single strand. |
| Model-specific fiber mode is authoritative; wavelength alone is insufficient, as 1310nm LRM also supports MMF. | HPE Aruba guide, J9152D LRM rows; [Cisco 10G SFP+](https://www.cisco.com/c/en/us/products/collateral/interfaces-modules/transceiver-modules/data_sheet_c78-455693.html) cabling table | Only the stated 10GBASE-SR/LR examples are mapped directly. Latch/cable colors are treated as secondary clues. |
| 1000BASE-SX is MMF; LX/LH may support MMF under specified conditions as well as SMF. | [Cisco Gigabit SFP](https://www.cisco.com/c/en/us/products/collateral/interfaces-modules/gigabit-ethernet-gbic-sfp-modules/datasheet-c78-366584.html), SX/LX sections and cabling table | Optional disclosure; not a universal SX/LX shortcut or a mode-conditioning tutorial. |

Source review CONFIRMED; physical verification NOT_RUN. The example blocks rearrange manufacturer data as readable HTML and are not photographs or replicas of actual labels. Existing Cat5e operating scope, photo credit and fiber-color caveats are preserved.

Browser QA: fresh pages at 360, 768, 1366 and 1920 px passed normal/200% text overflow checks. Verified six specification rows, unique IDs, retained SFP A/B aliases and keyboard expansion/collapse of the 1G explanation; no page errors or failed assets. Mobile/desktop screenshots and the renamed topology were visually reviewed. Estimated reading time was adjusted to 10–15 minutes for the accumulated user-requested additions.

## 2026-10-08 — Optical Tx/Rx direction and single-fiber BiDi

User-requested Concept Guide addition only, after module identification. This narrowly extends the original BiDi exclusion to explain why one-fiber links do not require arranging two separate Tx/Rx strands. No skill, simulator, shared topology model or actual network is changed. The direction diagram is semantic HTML, explicitly a functional relationship rather than a physical left/right port map. Installed optics in the user's managed area are not assumed.

| Claim | Primary source | Qualification |
|---|---|---|
| Ordinary duplex optics use two fibers; each endpoint's Tx connects to the opposite Rx, including paths through patch panels. Correctly assembled duplex cords need not be split, but the complete path still needs correct polarity. | [Fluke Networks: Fiber Polarity Basics for Duplex Applications](https://www.flukenetworks.com/blog/cabling-chronicles/b-c-s-fiber-polarity), End-to-End Duplex Polarity | Documentary review CONFIRMED; functional diagram, not a wiring layout or automatic polarity claim. |
| Identify Tx/Rx using module markings or arrows pointing away from/towards the connector. | [Cisco Remote-PHY shelf installation](https://www.cisco.com/c/en/us/td/docs/cable/remote-phy-devices/installation/guide/b_cbr_rphy_shelf_hardware_install_guide/install.html), Installing SFP+ Modules, step 3 | Consult the exact model's diagram when markings are unclear. |
| Fixed left/right assumptions are unreliable because installed module orientation may differ between ports. Record existing connections before disconnection. | [Cisco 8800 hardware guide](https://www.cisco.com/c/en/us/td/docs/iosxr/cisco8000/hardware/hig-modular/b-8800-hardware-installation-guide-modular/connect_router_to_the_network.html), bale-clasp SFP+/SFP28 installation step 2 and removal step 2 | General teaching inference from a documented normal/inverted installation example; no claim every device has this arrangement. |
| Single-fiber 1000BASE-BX10 uses complementary U/D optics: U Tx1310/Rx1490 nm, D Tx1490/Rx1310 nm over one SMF strand. | [Cisco Gigabit SFP data sheet](https://www.cisco.com/c/en/us/products/collateral/interfaces-modules/gigabit-ethernet-gbic-sfp-modules/datasheet-c78-366584.html), 1000BASE-BX10-D/U and cabling sections | Optional product-specific example; BiDi is not universally one connector/one fiber, and other families' wavelengths and suffixes must be read from their own specifications. Main text explicitly says “한 가닥용”. |
| Singlemode is not the same as single strand; the earlier J9150D SR and J9151E LR examples both use duplex LC. | [HPE Aruba 10G guide](https://arubanetworking.hpe.com/techdocs/Switches/xcvrs/xcvr_guide/Content/GUID-C1449A69-FEA4-4DA4-AD25-C73A7FB9CF0A.html) | Both modes can have conventional two-fiber examples. |
| Do not look into an optical port or fiber end to identify transmitting light; appropriate detectors are used. | Fluke polarity guide, How to Check Duplex Polarity | Brief caution directly relevant to the identification question, not a measurement procedure. |

No MPO polarity taxonomy, loss budget, live swapping procedure or hardware troubleshooting lab is added. Source review CONFIRMED; hardware/PNETLab verification NOT_RUN. The workplace Cat5e scope, real-photo attribution, fiber-color caveats and SFP/GBIC distinction are preserved.

Browser QA: fresh pages at 360, 768, 1366 and 1920 px passed normal and doubled-text horizontal-overflow checks, including the expanded BiDi wavelength table. Verified unique IDs, three comparison rows and keyboard expansion/collapse; no page errors or failed local assets. Desktop and mobile screenshots were visually reviewed. This validates the learning-page presentation only.
