# Wave 4 (`FEAT-STATE-03`): Canonical Filter Contract Specification

| Specification Attribute | Value |
|---|---|
| **Contract Version** | v2.0.0 |
| **Module Target** | `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daFilterSchema.js` |
| **Branch** | `jules-17630609474842121823-74bd3cd3` |
| **HEAD Commit** | `9b1948f5faaa09116751b2e4a6ea67d5e9d4b220` |

---

## 1. Schema Definition

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Wave4FilterPresetContainer",
  "type": "object",
  "required": ["schemaVersion", "presets", "activeFilter"],
  "properties": {
    "schemaVersion": { "type": "integer", "enum": [2] },
    "activePresetId": { "type": ["string", "null"] },
    "presets": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "name", "criteria"],
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "isDefault": { "type": "boolean" },
          "criteria": { "$ref": "#/definitions/CanonicalFilterCriteria" }
        }
      }
    },
    "activeFilter": { "$ref": "#/definitions/CanonicalFilterCriteria" }
  },
  "definitions": {
    "CanonicalFilterCriteria": {
      "type": "object",
      "properties": {
        "searchTerm": { "type": "string", "default": "" },
        "riskLevels": { "type": "array", "items": { "type": "string" }, "default": [] },
        "nodeTypes": { "type": "array", "items": { "type": "string" }, "default": [] },
        "layers": { "type": "array", "items": { "type": "string" }, "default": [] },
        "testCoverageStatus": { "type": "array", "items": { "type": "string" }, "default": [] },
        "findingsSeverity": { "type": "array", "items": { "type": "string" }, "default": [] },
        "findingsStatus": { "type": "array", "items": { "type": "string" }, "default": [] }
      }
    }
  }
}
```

---

## 2. Cross-View Criterion Mapping Table

| Canonical Criterion | Graph View (`daGraphViewer`) | Matrix View (`daMatrixViewer`) | Findings View (`daFindingsViewer`) | Source Field | Unsupported Behavior |
|---|---|---|---|---|---|
| `searchTerm` | Filters nodes by name/ID string match | Filters rows/columns by entity name | Filters finding title, description, rule | `node.name`, `finding.title` | None (Supported across all) |
| `riskLevels` | Filters nodes by risk level | Filters cells/entities by risk level | Unsupported in findings data | `node.risk` | Ignored by Findings view |
| `nodeTypes` | Filters nodes by component type (ApexClass, LWC, etc) | Filters rows/columns by entity type | Filters findings by target component type | `node.type`, `finding.targetType` | None (Supported across all) |
| `layers` | Filters nodes by architectural layer | Filters rows/columns by layer | Unsupported in findings data | `node.layer` | Ignored by Findings view |
| `testCoverageStatus` | Filters nodes by 4 coverage states (`COVERED`, `UNTESTED`, `AMBIGUOUS`, `UNKNOWN`) | Filters rows/columns by coverage status | Filters findings by target coverage state | `node.testCoverageStatus` | None (Supported across all) |
| `findingsSeverity` | Unsupported in core graph topology | Unsupported in basic topology matrix | Filters findings by severity (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) | `finding.severity` | Ignored by Graph & Matrix views |
| `findingsStatus` | Unsupported in core graph topology | Unsupported in basic topology matrix | Filters findings by resolution status (`OPEN`, `MUTED`, `RESOLVED`) | `finding.status` | Ignored by Graph & Matrix views |

---

## 3. Event Bus Contract

When filters or presets change, `daAppShell` publishes a CustomEvent:
- **Event Name:** `filterchange`
- **Bubbles:** `true`, **Composed:** `true`
- **Detail Payload:**
  ```javascript
  {
    activePresetId: "preset_123",
    criteria: {
      searchTerm: "Account",
      riskLevels: ["HIGH"],
      nodeTypes: ["ApexClass"],
      layers: ["Domain"],
      testCoverageStatus: ["COVERED"],
      findingsSeverity: [],
      findingsStatus: []
    }
  }
  ```
