# WAVE 0.4.6 VALIDATOR SOURCE AUDIT

## 1. Component Verification
- **Validator Script**: `docs/wave-0/4.6/validate-wave0-4-6-dispatch.cjs`
- **SHA-256**: `689fc92fd3ee39b15baa88cd0a0c6623d03e6b2b1f829ac3f773b9b52932b3e0`
- **Physical Line Count**: 368
- **Isolated Target Directory**: Parameterized via `--targetDir <dir>` ensuring zero reliance on ambient repository files when testing sandbox targets.
- **Strict RFC 4180 Parser**: Evaluates CSVs using `strict-rfc4180-csv-parser.cjs`.

## 2. Five Verification Categories
1. **staticSchema**: Enforces 21 tasks, 175 manifest files, 11 Batch 1 tasks, 9 contracts, daAppShell lines.
2. **crossDocumentConsistency**: Reconciles manifest against tasks, allowlists, and contract requirements.
3. **filesystem**: Rejects path traversal, bare directories, non-existent required source files.
4. **semanticReview**: Enforces Wave 5 serialization, W7 two-step resolution, W8 10MB string guard.
5. **empiricalExecution**: Audits execution logs and records offline restrictions.
