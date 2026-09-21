# Network Incident Copilot — public reproducible snapshot

This directory is the public, single-file snapshot of the modular `Network Incident Copilot` portfolio prototype.

## Current evidence

- Core unit tests: **5/5**
- Deterministic synthetic/fixture evaluation: **16/16**
- External AI API required: **No**
- Local Ollama integration: **Implemented in the Python snapshot**
- Model-behavior evaluation harness: **8 guardrail cases implemented**
- Exact model evaluation: **Pending local execution; not claimed yet**

## Architecture

```text
Sanitized CLI / collector evidence
        ↓
Conservative parser
        ↓
Deterministic facts + guardrails
        ↓
Structured JSON
        ↓
Local Ollama (optional)
        ↓
Observed Facts / Interpretation / Unknowns / Next Checks
```

The central engineering boundary is that collection failure, missing evidence, or unresolved policy state must remain unknown/partial rather than becoming confident LLM conclusions.

## Reproduce deterministic evaluation

```bash
python3 network_incident_copilot.py --eval
python3 -m unittest -v test_network_incident_copilot.py
```

## Local Ollama example

```bash
python3 network_incident_copilot.py \
  --input sanitized_incident.txt \
  --ollama-model <local-model-name>
```

## Evaluate a selected Ollama model

First confirm the exact local model name:

```bash
ollama list
```

Then run the eight-case grounded-behavior evaluation:

```bash
python3 model_eval.py --model <local-model-name>
```

This writes `model_evaluation.json` with the model name, UTC execution time, per-case input/prompt/output SHA-256, raw model output, required-signal checks, forbidden-conclusion matches, and section-presence signals.

The eight cases cover:

1. SSH timeout must not become a confirmed outage.
2. Partial collection must preserve unknowns.
3. Dynamic RADIUS Role must not be invented.
4. Unresolved ACL must not become an allow/deny verdict.
5. Explicit MM Down may be reported as an observation but not an invented root cause.
6. `STA not found` must not become a confirmed session closure.
7. Client-distribution skew must remain a signal rather than a fabricated cause.
8. Empty evidence must be acknowledged as insufficient.

The live `index.html` page reproduces the deterministic layer only. It does not call an AI service.

## Evidence boundary

The committed `evaluation.json` is synthetic/fixture evidence. It is not production network accuracy, autonomous-remediation safety certification, or real Aruba device validation.

The model harness is intentionally heuristic. A high score does not by itself prove model safety or real-device correctness. Exact model-level metrics will only be presented as portfolio evidence after local execution and manual review of the saved outputs.
