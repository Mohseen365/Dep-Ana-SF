/**
 * strict-rfc4180-csv-parser.cjs
 * Strict, zero-dependency, fully compliant RFC 4180 CSV Parser.
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
            i++;
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
        quoteClosed = false;
        fieldNum++;
        i++;
        continue;
      } else if (c === '\r') {
        if (i + 1 < len && text[i + 1] === '\n') {
          i++;
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
        currentField += c;
        fieldHasChars = true;
        i++;
        continue;
      }
    }
  }

  if (inQuotes) {
    throw new CSVParseError('Unclosed quoted field at end of file', filename, recordNum, fieldNum, i);
  }

  if (fieldHasChars || quoteClosed || currentField === '' && currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  if (rows.length === 0) {
    return [];
  }

  const headerCols = rows[0].length;

  if (disallowDuplicateHeaders) {
    const seenHeaders = new Set();
    for (let c = 0; c < headerCols; c++) {
      const h = rows[0][c];
      if (seenHeaders.has(h)) {
        throw new CSVParseError(`Duplicate header '${h}' in column ${c + 1}`, filename, 1, c + 1);
      }
      seenHeaders.add(h);
    }
  }

  if (requireNonEmptyHeader) {
    for (let c = 0; c < headerCols; c++) {
      if (rows[0][c].trim() === '') {
        throw new CSVParseError(`Empty or whitespace-only header in column ${c + 1}`, filename, 1, c + 1);
      }
    }
  }

  if (strictColumnCount) {
    for (let r = 1; r < rows.length; r++) {
      if (rows[r].length !== headerCols) {
        throw new CSVParseError(
          `Inconsistent column count: header has ${headerCols} columns, but row ${r + 1} has ${rows[r].length} columns`,
          filename,
          r + 1
        );
      }
    }
  }

  return rows;
}

function parseStrictCSVToObjects(content, options = {}) {
  const rows = parseStrictCSV(content, options);
  if (rows.length === 0) return [];
  const headers = rows[0];
  const objects = [];
  for (let r = 1; r < rows.length; r++) {
    const obj = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = rows[r][c];
    }
    objects.push(obj);
  }
  return objects;
}

module.exports = {
  parseStrictCSV,
  parseStrictCSVToObjects,
  CSVParseError
};
