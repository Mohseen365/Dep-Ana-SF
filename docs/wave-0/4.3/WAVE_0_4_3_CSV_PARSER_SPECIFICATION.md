# WAVE 0.4.3 CSV PARSER SPECIFICATION

## 1. Specification Overview

The Wave 0.4.2 CSV parser claimed RFC 4180 compatibility but contained structural defects:
1. It automatically called `.trim()` on all unquoted and quoted tokens, destroying meaningful leading and trailing whitespace.
2. It accepted malformed quote placement (such as `x"z"` or `"x"junk`) without failing closed.
3. It had inconsistent detection of multiline CRLF records and trailing empty fields.

Wave 0.4.3 introduces `strict-rfc4180-csv-parser.cjs`, a zero-dependency, strict RFC 4180 parser designed to enforce exact syntax and preserve data integrity across all Wave registers.

---

## 2. Grammar & Structural Rules

1. **Record Delimiters**: Accepts both CRLF (`\r\n`) and LF (`\n`). Records may end with or without a trailing newline at EOF.
2. **Field Separation**: Fields are separated by ASCII comma (`,`).
3. **Escaping**: Double quotes inside quoted fields are represented by consecutive double quotes (`""`). Lone double quotes inside quoted fields trigger an unclosed quote error or syntax error.
4. **Embedded Commas and Newlines**: Quoted fields can contain arbitrary commas, CRLFs, and LFs without terminating the field or record.
5. **Exact Preservation**: No whitespace trimming is performed on field data. Spaces, tabs, and indentation are preserved verbatim.
6. **Byte Order Mark (BOM)**: If a UTF-8 BOM (`\uFEFF`) is detected at byte index 0, it is stripped transparently before lexical analysis.
7. **Empty Fields**: Preserved as empty strings (`""`), including leading, intermediate, consecutive, and final trailing empty fields.

---

## 3. Strict Rejection Invariants

The parser halts immediately and throws a structured `CSVParseError` indicating filename, row, column, and character offset upon encountering any of:

1. **Quote Inside Unquoted Field**: An unescaped quote appearing after characters in an unquoted field (e.g. `x"z"`).
2. **Trailing Junk After Quoted Field**: Any characters other than comma, CRLF, LF, or EOF appearing immediately after a closing double quote (e.g. `"x"junk`).
3. **Leading Whitespace Before Opening Quote**: Leading spaces before an opening quote (e.g. ` "val"`), which under strict RFC 4180 grammar is treated as an unquoted field starting with a space, causing the subsequent quote to trigger an unescaped quote error.
4. **Unclosed Quoted Field**: A quoted string not closed before EOF.
5. **Inconsistent Column Count**: Any row having more or fewer fields than the header row (Row 1).
6. **Duplicate Headers**: Multiple header columns sharing the exact same identifier.
7. **Empty / Whitespace-Only Headers**: Header fields that are completely empty or contain only whitespace characters.

---

## 4. Test Verification Summary

The parser was verified via `test-csv-parser.cjs` with 32 adversarial test scenarios:
- **Positive Scenarios (16)**: All 16 passed, verifying exact 2D array output, whitespace preservation, Unicode handling, escaped quotes, multiline fields, and empty final columns.
- **Negative Scenarios (16)**: All 16 passed, successfully failing closed against every malformed syntax variation.
- **Test Evidence Register**: Documented in `docs/wave-0/4.3/WAVE_0_4_3_CSV_PARSER_TEST_REGISTER.csv`.
