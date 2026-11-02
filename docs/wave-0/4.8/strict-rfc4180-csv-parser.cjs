/**
 * strict-rfc4180-csv-parser.cjs - Wave 0.4.8
 * Fully compliant RFC 4180 CSV Parser with fail-closed semantics.
 */

class CsvParseError extends Error {
  constructor(code, message, details = {}) {
    super(`[CSV_PARSE_${code}] ${message}`);
    this.name = 'CsvParseError';
    this.code = code;
    this.details = details;
  }
}

function parseStrictCSV(text, options = {}) {
  const strictCrlf = options.strictCrlf === true;

  if (typeof text !== 'string') {
    throw new CsvParseError('INVALID_INPUT', 'Input must be a string');
  }

  if (text.length === 0) {
    return [];
  }

  const rows = [];
  let currentRow = [];
  let currentField = '';
  let insideQuotes = false;
  let quoteClosed = false;
  let i = 0;
  const len = text.length;

  while (i < len) {
    const char = text[i];

    if (insideQuotes) {
      if (char === '"') {
        if (i + 1 < len && text[i + 1] === '"') {
          currentField += '"';
          i += 2;
          continue;
        } else {
          insideQuotes = false;
          quoteClosed = true;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (quoteClosed) {
        if (char === ',') {
          currentRow.push(currentField);
          currentField = '';
          quoteClosed = false;
          i++;
          continue;
        } else if (char === '\r') {
          if (i + 1 < len && text[i + 1] === '\n') {
            i++;
          } else if (strictCrlf) {
            throw new CsvParseError('BARE_CR', `Bare CR detected at index ${i}`);
          }
          currentRow.push(currentField);
          currentField = '';
          rows.push(currentRow);
          currentRow = [];
          quoteClosed = false;
          i++;
          continue;
        } else if (char === '\n') {
          if (strictCrlf) {
            throw new CsvParseError('BARE_LF', `Bare LF detected at index ${i}`);
          }
          currentRow.push(currentField);
          currentField = '';
          rows.push(currentRow);
          currentRow = [];
          quoteClosed = false;
          i++;
          continue;
        } else {
          throw new CsvParseError(
            'UNQUOTED_TEXT_AFTER_QUOTE',
            `Unexpected character '${char}' after closing quote at index ${i}`,
            { index: i, char }
          );
        }
      }

      if (char === '"') {
        if (currentField.length > 0) {
          throw new CsvParseError(
            'UNEXPECTED_QUOTE',
            `Double quote found inside unquoted field at index ${i}`,
            { index: i }
          );
        }
        insideQuotes = true;
        i++;
        continue;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
        i++;
        continue;
      } else if (char === '\r') {
        if (i + 1 < len && text[i + 1] === '\n') {
          i++;
        } else if (strictCrlf) {
          throw new CsvParseError('BARE_CR', `Bare CR detected at index ${i}`);
        }
        currentRow.push(currentField);
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
        i++;
        continue;
      } else if (char === '\n') {
        if (strictCrlf) {
          throw new CsvParseError('BARE_LF', `Bare LF detected at index ${i}`);
        }
        currentRow.push(currentField);
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  if (insideQuotes) {
    throw new CsvParseError('UNCLOSED_QUOTE', 'Unclosed quote at end of CSV stream', { index: i });
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  if (rows.length === 0) {
    return [];
  }

  const expectedWidth = rows[0].length;
  for (let r = 0; r < rows.length; r++) {
    if (rows[r].length !== expectedWidth) {
      throw new CsvParseError(
        'ROW_WIDTH_MISMATCH',
        `Row ${r + 1} has ${rows[r].length} fields, expected ${expectedWidth}`,
        { rowIndex: r, actualWidth: rows[r].length, expectedWidth }
      );
    }
  }

  return rows;
}

function parseStrictCSVToObjects(text, options = {}) {
  const rows = parseStrictCSV(text, options);
  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0];
  const headerSet = new Set();
  for (let h = 0; h < headers.length; h++) {
    const name = headers[h].trim();
    if (!name) {
      throw new CsvParseError('EMPTY_HEADER_NAME', `Header at column ${h + 1} is empty`);
    }
    if (headerSet.has(name)) {
      throw new CsvParseError('DUPLICATE_HEADER', `Duplicate header name detected: ${name}`, { name });
    }
    headerSet.add(name);
  }

  const result = [];
  for (let r = 1; r < rows.length; r++) {
    const rowObj = {};
    const rowData = rows[r];
    for (let c = 0; c < headers.length; c++) {
      rowObj[headers[c].trim()] = rowData[c];
    }
    result.push(rowObj);
  }

  return result;
}

module.exports = {
  CsvParseError,
  parseStrictCSV,
  parseStrictCSVToObjects
};
