# Network Incident Copilot — public reproducible snapshot

This directory is the public, single-file snapshot of the modular `Network Incident Copilot` portfolio prototype.

## Current evidence

- Core unit tests: **5/5**
- Deterministic synthetic/fixture evaluation: **16/16**
- External AI API required: **No**
- Local Ollama integration: **Implemented in the Python snapshot**
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

The live `index.html` page reproduces the deterministic layer only. It does not call an AI service.

## Evidence boundary

The committed `evaluation.json` is synthetic/fixture evidence. It is not production network accuracy, autonomous-remediation safety certification, or real Aruba device validation. Exact model-level metrics will only be added after running and manually reviewing the selected local Ollama model.
