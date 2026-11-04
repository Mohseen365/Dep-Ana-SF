/**
 * strict-rfc4180-csv-parser.cjs
 * Wave 0.4.11 Hardened Strict RFC 4180 CSV Parser
 *
 * Implements strict RFC 4180 parsing:
 * - Fails closed on any grammar violation.
 * - Strict CRLF mode (strictCrlf: true): mandatory \r\n record endings; bare \n and bare \r rejected.
 * - Normalized mode (strictCrlf: false): accepts \r\n or \n record endings, rejects bare \r.
 * - Enforces exact column count across all records matching header.
 * - Enforces quote closing, character-after-closing-quote rejection, unescaped quote rejection.
 * - Disallows duplicate headers or empty header names.
 * - Zero fallback to permissive split methods.
 */

class CSVParseError extends Error {
  constructor(message, filename, recordNum, fieldNum, charPos) {
    super(`[CSV_ERROR] ${filename}:${recordNum}:${fieldNum || '?'}${charPos !== undefined ? ` (offset ${charPos})` : ''} - ${message}`);
    this.name = 'CSVParseError';
    this.filename = filename;
    this.recordNum = recordNum;
    this.fieldNum = fieldNum;
    this.charPos = charPos;
  }
}

function parseStrictCSV(content, options = {}) {
  const filename = options.filename || 'input.csv';
  const strictColumnCount = options.strictColumnCount !== false;
  const requireNonEmptyHeader = options.requireNonEmptyHeader !== false;
  const disallowDuplicateHeaders = options.disallowDuplicateHeaders !== false;
  const strictCrlf = options.strictCrlf === true;

  if (typeof content !== 'string') {
    throw new CSVParseError('Input must be a string', filename, 1, 1, 0);
  }

  let text = content;
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);
  }

  if (text.length === 0) {
    return [];
  }

  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;
  let quoteClosedJustNow = false;
  let recordNum = 1;
  let fieldNum = 1;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const nextCh = i + 1 < text.length ? text[i + 1] : null;

    if (inQuotes) {
      if (ch === '"') {
        if (nextCh === '"') {
          // Escaped double-quote inside quotes
          currentField += '"';
          i++; // skip next quote
        } else {
          // Closing quote
          inQuotes = false;
          quoteClosedJustNow = true;
        }
      } else {
        currentField += ch;
      }
    } else {
      // Not in quotes
      if (quoteClosedJustNow) {
        if (ch !== ',' && ch !== '\r' && ch !== '\n') {
          throw new CSVParseError(
            `Characters after closing quote before field delimiter: '${ch}'`,
            filename,
            recordNum,
            fieldNum,
            i
          );
        }
        quoteClosedJustNow = false;
      }

      if (ch === '"') {
        if (currentField.length > 0) {
          throw new CSVParseError(
            'Unescaped quote inside unquoted field',
            filename,
            recordNum,
            fieldNum,
            i
          );
        }
        inQuotes = true;
      } else if (ch === ',') {
        currentRow.push(currentField);
        currentField = '';
        fieldNum++;
      } else if (ch === '\r') {
        if (nextCh === '\n') {
          currentRow.push(currentField);
          currentField = '';
          rows.push(currentRow);
          currentRow = [];
          recordNum++;
          fieldNum = 1;
          i++; // skip \n
        } else {
          throw new CSVParseError(
            'Bare CR without LF',
            filename,
            recordNum,
            fieldNum,
            i
          );
        }
      } else if (ch === '\n') {
        if (strictCrlf) {
          throw new CSVParseError(
            'Bare LF without CR in strict CRLF mode',
            filename,
            recordNum,
            fieldNum,
            i
          );
        }
        currentRow.push(currentField);
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
        recordNum++;
        fieldNum = 1;
      } else {
        currentField += ch;
      }
    }
  }

  if (inQuotes) {
    throw new CSVParseError(
      'Unclosed quote at end of input',
      filename,
      recordNum,
      fieldNum,
      text.length
    );
  }

  // Handle trailing content if any
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  if (rows.length === 0) {
    return [];
  }

  const header = rows[0];
  const expectedCols = header.length;

  if (requireNonEmptyHeader) {
    for (let c = 0; c < expectedCols; c++) {
      if (!header[c] || header[c].trim().length === 0) {
        throw new CSVParseError(
          `Empty or whitespace-only header column at position ${c + 1}`,
          filename,
          1,
          c + 1
        );
      }
    }
  }

  if (disallowDuplicateHeaders) {
    const seen = new Set();
    for (let c = 0; c < expectedCols; c++) {
      const col = header[c].trim();
      if (seen.has(col)) {
        throw new CSVParseError(
          `Duplicate header column name: '${col}' at position ${c + 1}`,
          filename,
          1,
          c + 1
        );
      }
      seen.add(col);
    }
  }

  if (strictColumnCount) {
    for (let r = 1; r < rows.length; r++) {
      if (rows[r].length !== expectedCols) {
        throw new CSVParseError(
          `Column count mismatch: expected ${expectedCols} columns, found ${rows[r].length}`,
          filename,
          r + 1,
          rows[r].length
        );
      }
    }
  }

  return rows;
}

function parseStrictCSVToObjects(content, options = {}) {
  const rows = parseStrictCSV(content, options);
  if (rows.length === 0) return [];

  const headers = rows[0].map(h => h.trim());
  const objects = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const obj = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = row[c];
    }
    objects.push(obj);
  }

  return objects;
}

module.exports = {
  CSVParseError,
  parseStrictCSV,
  parseStrictCSVToObjects
};
