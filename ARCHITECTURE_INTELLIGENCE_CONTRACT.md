# Deterministic Architecture Intelligence Contract (BASE-ARCH-1)

This contract defines the foundation requirements, data structures, vocabulary, and boundary rules for all deterministic architecture-intelligence capabilities within `dependency-analyzer/`.

---

## 1. Core Principles & Boundary Rules

### 1.1 Deterministic Authority
Deterministic analysis is authoritative for facts directly established by repository structure, metadata, graph relationships, parser output, and deterministic rules.

Semantic/LLM investigation may provide:
* observations
* hypotheses
* interpretations
* risk assessments

Semantic/LLM investigation **must not** silently overwrite deterministic facts. If an LLM claim contradicts a deterministic fact (e.g. claiming a class is `without sharing` when AST parsing proves `with sharing`), the deterministic fact is retained and a contradiction is recorded.

### 1.2 Zero LLM Requirement
All deterministic capabilities must operate with **0 LLM calls**.

Deterministic modules (such as `role-classifier.cjs` and contract utilities in `deterministic/contract.cjs`) must not import or depend on `LlmClient`, `CacheManager`, or `semantic-investigation-service`.

### 1.3 Capability Independence
Each deterministic architecture-intelligence capability (e.g. role classification, layer classification, entry-point analysis, path analysis) must be:
* independently testable
* runnable without external network or LLM access
* free of circular dependencies

Shared utilities under `dependency-analyzer/deterministic/` are permitted.

---

## 2. Common Intelligence Result Contract

Future deterministic capabilities produce structured outputs conforming to:

```json
{
  "value": "service",
  "primary": "service",
  "confidence": "high",
  "evidence": [
    {
      "rule": "name-suffix-service",
      "detail": "Component name 'AssetService' matches Service layer naming convention."
    }
  ],
  "secondary": []
}
```

### Key Fields
* `value` / `primary`: The derived classification or fact string.
* `confidence`: A standardized confidence rating (`high` | `medium` | `low` | `unknown`).
* `evidence`: Array of explainable evidence items (`{ rule, detail }`).
* `secondary`: Optional list of secondary or lower-precedence matches.

---

## 3. Evidence Contract

Evidence items explain why a classification or signal was produced.

### Preferred Shape
```json
{
  "rule": "rule-name",
  "detail": "human-readable explanation"
}
```

### Optional Fields
Implementations may retain additional metadata if relevant (e.g. `weight`, `source`, `field`, `value`), but every evidence item must supply a non-empty `rule` string and `detail` string.

Every non-unknown result must provide sufficient evidence items to explain the result.

---

## 4. Confidence Contract & Vocabulary

Confidence ratings express the strength of deterministic evidence. They are **not** statistical probabilities or percentages.

### Vocabulary
1. `high`: Strong deterministic evidence exists (explicit component type, explicit annotation, multiple independent rules, authoritative metadata).
2. `medium`: Meaningful deterministic evidence exists, but is less direct (naming convention, directory convention, single structural rule).
3. `low`: Only weak heuristic evidence exists.
4. `unknown`: Insufficient evidence exists to establish a classification.

---

## 5. Component Intelligence & Aggregate Integration

### Component Intelligence
Capabilities extend existing component intelligence artifacts (`01-CONTEXT.json`) rather than creating competing parallel artifacts. Existing fields (such as `role`, `impact`, `assessment`, `data`, `frontend`, `tests`, `architecture`, `evidence`) are preserved without renaming.

### Aggregate Intelligence
Architecture-level aggregate statistics are registered in top-level analyzer outputs (`dependency-report.json` and `architecture-metrics.json`).

---

## 6. Semantic Investigation Boundary

Deterministic intelligence is exposed to semantic investigation as read-only context (`08-LLM-INVESTIGATION.json`). Semantic investigation operates strictly downhill:

```text
deterministic facts
    |
    +--> component intelligence
    +--> investigation context
    |
    v
semantic investigation (LLM)
```

Direct mutation of deterministic facts by semantic investigation is strictly prohibited.
