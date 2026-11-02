/**
 * strict-rfc4180-csv-parser.cjs
 * Wave 0.4.8 Strict RFC 4180 CSV Parser
 *
 * Implements strict RFC 4180 parsing:
 * - Fails closed on any grammar violation.
 * - Enforces record separator rules (CRLF mandatory when strictCrlf: true, accepts CRLF or LF in normalized mode).
 * - Enforces exact column count across all records matching header.
 * - Enforces quote closing, character-after-closing-quote rejection, unescaped quote rejection.
 * - Disallows duplicate headers or empty header names.
 * - Absolutely zero fallback to permissive split methods.
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
  let quoteClosed = false;
  let fieldHasChars = false;
  let fieldIsQuoted = false;
  let recordNum = 1;
  let fieldNum = 1;

  let i = 0;
  const len = text.length;

  while (i < len) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (i + 1 < len && text[i + 1] === '"') {
          currentField += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          quoteClosed = true;
          i++;
          continue;
        }
      } else {
        currentField += c;
        i++;
        continue;
      }
    } else {
      if (quoteClosed) {
        if (c === ',') {
          currentRow.push(currentField);
          currentField = '';
          fieldHasChars = false;
          fieldIsQuoted = false;
          quoteClosed = false;
          fieldNum++;
          i++;
          continue;
        } else if (c === '\r') {
          if (i + 1 < len && text[i + 1] === '\n') {
            i++; // skip \n
          } else if (strictCrlf) {
            throw new CSVParseError(`Bare CR without LF in strict CRLF mode`, filename, recordNum, fieldNum, i);
          }
          currentRow.push(currentField);
          rows.push(currentRow);
          currentRow = [];
          currentField = '';
          fieldHasChars = false;
          fieldIsQuoted = false;
          quoteClosed = false;
          recordNum++;
          fieldNum = 1;
          i++;
          continue;
        } else if (c === '\n') {
          if (strictCrlf) {
            throw new CSVParseError(`Bare LF without CR in strict CRLF mode`, filename, recordNum, fieldNum, i);
          }
          currentRow.push(currentField);
          rows.push(currentRow);
          currentRow = [];
          currentField = '';
          fieldHasChars = false;
          fieldIsQuoted = false;
          quoteClosed = false;
          recordNum++;
          fieldNum = 1;
          i++;
          continue;
        } else {
          throw new CSVParseError(
            `Characters encountered after closing quote: '${c}'`,
            filename,
            recordNum,
            fieldNum,
            i
          );
        }
      }

      if (c === '"') {
        if (!fieldHasChars) {
          inQuotes = true;
          fieldIsQuoted = true;
          fieldHasChars = true;
          i++;
          continue;
        } else {
          throw new CSVParseError(
            `Unescaped quote encountered inside unquoted field`,
            filename,
            recordNum,
            fieldNum,
            i
          );
        }
      } else if (c === ',') {
        currentRow.push(currentField);
        currentField = '';
        fieldHasChars = false;
        fieldIsQuoted = false;
        fieldNum++;
        i++;
        continue;
      } else if (c === '\r') {
        if (i + 1 < len && text[i + 1] === '\n') {
          i++;
        } else if (strictCrlf) {
          throw new CSVParseError(`Bare CR without LF in strict CRLF mode`, filename, recordNum, fieldNum, i);
        }
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        fieldHasChars = false;
        fieldIsQuoted = false;
        recordNum++;
        fieldNum = 1;
        i++;
        continue;
      } else if (c === '\n') {
        if (strictCrlf) {
          throw new CSVParseError(`Bare LF without CR in strict CRLF mode`, filename, recordNum, fieldNum, i);
        }
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        fieldHasChars = false;
        fieldIsQuoted = false;
        recordNum++;
        fieldNum = 1;
        i++;
        continue;
      } else {
        currentField += c;
        fieldHasChars = true;
        i++;
        continue;
      }
    }
  }

  if (inQuotes) {
    throw new CSVParseError('Unclosed quote at end of input', filename, recordNum, fieldNum, len);
  }

  if (fieldHasChars || currentRow.length > 0 || quoteClosed) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  if (rows.length === 0) {
    return [];
  }

  const header = rows[0];
  if (requireNonEmptyHeader) {
    for (let c = 0; c < header.length; c++) {
      if (!header[c] || header[c].trim().length === 0) {
        throw new CSVParseError(`Empty header at index ${c}`, filename, 1, c + 1, 0);
      }
    }
  }

  if (disallowDuplicateHeaders) {
    const seenHeaders = new Set();
    for (let c = 0; c < header.length; c++) {
      const h = header[c];
      if (seenHeaders.has(h)) {
        throw new CSVParseError(`Duplicate header column name: '${h}'`, filename, 1, c + 1, 0);
      }
      seenHeaders.add(h);
    }
  }

  const expectedWidth = header.length;
  if (strictColumnCount) {
    for (let r = 1; r < rows.length; r++) {
      if (rows[r].length !== expectedWidth) {
        throw new CSVParseError(
          `Record ${r + 1} column count mismatch: expected ${expectedWidth}, got ${rows[r].length}`,
          filename,
          r + 1,
          rows[r].length,
          0
        );
      }
    }
  }

  return rows;
}

function parseStrictCSVToObjects(content, options = {}) {
  const rows = parseStrictCSV(content, options);
  if (rows.length === 0) return [];
  const header = rows[0];
  const objects = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const obj = {};
    for (let c = 0; c < header.length; c++) {
      obj[header[c]] = row[c];
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
