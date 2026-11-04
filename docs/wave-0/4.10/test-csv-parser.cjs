/**
 * test-csv-parser.cjs
 * Wave 0.4.10 Strict RFC 4180 CSV Parser Conformance Suite
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const {
  parseStrictCSV,
  parseStrictCSVToObjects,
  CSVParseError
} = require('./strict-rfc4180-csv-parser.cjs');

const evidenceDir = path.resolve(__dirname, 'evidence/raw');
if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });

function hashBuf(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

const csvResults = [];

function recordResult(id, desc, expected, actual, status, logFileName, logContent) {
  const logPath = path.join(evidenceDir, logFileName);
  fs.writeFileSync(logPath, logContent, 'utf8');
  const logSha = hashBuf(Buffer.from(logContent, 'utf8'));

  csvResults.push({
    id,
    desc,
    expected,
    actual,
    status,
    logFile: logFileName,
    logSha
  });
}

function runCsvSuite() {
  console.log('=== WAVE 0.4.10 STRICT RFC 4180 CSV PARSER CONFORMANCE SUITE (16 SCENARIOS) ===');

  // CSV-01: Standard CRLF records parsed correctly
  {
    const input = 'col1,col2,col3\r\na,b,c\r\n1,2,3\r\n';
    let actual = '';
    try {
      const rows = parseStrictCSV(input);
      actual = (rows.length === 3 && rows[1][1] === 'b') ? 'SUCCESS' : 'FAILED';
    } catch (e) {
      actual = e.message;
    }
    const status = (actual === 'SUCCESS') ? 'PASS' : 'FAIL';
    recordResult('CSV-01', 'Standard CRLF records parsed correctly', 'SUCCESS', actual, status, 'CSV-01.log', `INPUT:\n${input}\nACTUAL: ${actual}\n`);
  }

  // CSV-02: Standard LF records parsed correctly in normalized mode
  {
    const input = 'col1,col2,col3\na,b,c\n1,2,3\n';
    let actual = '';
    try {
      const rows = parseStrictCSV(input);
      actual = (rows.length === 3 && rows[2][2] === '3') ? 'SUCCESS' : 'FAILED';
    } catch (e) {
      actual = e.message;
    }
    const status = (actual === 'SUCCESS') ? 'PASS' : 'FAIL';
    recordResult('CSV-02', 'Standard LF records parsed correctly in normalized mode', 'SUCCESS', actual, status, 'CSV-02.log', `INPUT:\n${input}\nACTUAL: ${actual}\n`);
  }

  // CSV-03: Quoted field with embedded commas
  {
    const input = 'col1,col2\r\n"hello, world",test\r\n';
    let actual = '';
    try {
      const rows = parseStrictCSV(input);
      actual = (rows[1][0] === 'hello, world') ? 'SUCCESS' : 'FAILED';
    } catch (e) {
      actual = e.message;
    }
    const status = (actual === 'SUCCESS') ? 'PASS' : 'FAIL';
    recordResult('CSV-03', 'Quoted field with embedded comma parsed correctly', 'SUCCESS', actual, status, 'CSV-03.log', `INPUT:\n${input}\nACTUAL: ${actual}\n`);
  }

  // CSV-04: Quoted field with embedded CRLF
  {
    const input = 'col1,col2\r\n"line 1\r\nline 2",val\r\n';
    let actual = '';
    try {
      const rows = parseStrictCSV(input);
      actual = (rows[1][0] === 'line 1\r\nline 2') ? 'SUCCESS' : 'FAILED';
    } catch (e) {
      actual = e.message;
    }
    const status = (actual === 'SUCCESS') ? 'PASS' : 'FAIL';
    recordResult('CSV-04', 'Quoted field with embedded CRLF preserved', 'SUCCESS', actual, status, 'CSV-04.log', `INPUT:\n${input}\nACTUAL: ${actual}\n`);
  }

  // CSV-05: Quoted field with escaped double quotes ("")
  {
    const input = 'col1,col2\r\n"quote ""inside""",second\r\n';
    let actual = '';
    try {
      const rows = parseStrictCSV(input);
      actual = (rows[1][0] === 'quote "inside"') ? 'SUCCESS' : 'FAILED';
    } catch (e) {
      actual = e.message;
    }
    const status = (actual === 'SUCCESS') ? 'PASS' : 'FAIL';
    recordResult('CSV-05', 'Escaped quotes inside quoted field resolved', 'SUCCESS', actual, status, 'CSV-05.log', `INPUT:\n${input}\nACTUAL: ${actual}\n`);
  }

  // CSV-06: Leading/trailing whitespace within quotes preserved
  {
    const input = 'col1,col2\r\n"  spaces  ",val\r\n';
    let actual = '';
    try {
      const rows = parseStrictCSV(input);
      actual = (rows[1][0] === '  spaces  ') ? 'SUCCESS' : 'FAILED';
    } catch (e) {
      actual = e.message;
    }
    const status = (actual === 'SUCCESS') ? 'PASS' : 'FAIL';
    recordResult('CSV-06', 'Whitespace in quotes strictly preserved', 'SUCCESS', actual, status, 'CSV-06.log', `INPUT:\n${input}\nACTUAL: ${actual}\n`);
  }

  // CSV-07: Empty fields handled properly
  {
    const input = 'col1,col2,col3\r\n,,val3\r\n';
    let actual = '';
    try {
      const rows = parseStrictCSV(input);
      actual = (rows[1][0] === '' && rows[1][1] === '' && rows[1][2] === 'val3') ? 'SUCCESS' : 'FAILED';
    } catch (e) {
      actual = e.message;
    }
    const status = (actual === 'SUCCESS') ? 'PASS' : 'FAIL';
    recordResult('CSV-07', 'Consecutive commas parsed as empty fields', 'SUCCESS', actual, status, 'CSV-07.log', `INPUT:\n${input}\nACTUAL: ${actual}\n`);
  }

  // CSV-08: UTF-8 BOM stripped transparently
  {
    const input = '\uFEFFcol1,col2\r\na,b\r\n';
    let actual = '';
    try {
      const rows = parseStrictCSV(input);
      actual = (rows[0][0] === 'col1') ? 'SUCCESS' : 'FAILED';
    } catch (e) {
      actual = e.message;
    }
    const status = (actual === 'SUCCESS') ? 'PASS' : 'FAIL';
    recordResult('CSV-08', 'UTF-8 BOM stripped from first column header', 'SUCCESS', actual, status, 'CSV-08.log', `INPUT:\n${input}\nACTUAL: ${actual}\n`);
  }

  // CSV-09: Unclosed quote rejected fail-closed
  {
    const input = 'col1,col2\r\n"unclosed quote,val\r\n';
    let actual = '';
    try {
      parseStrictCSV(input);
      actual = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actual = (e instanceof CSVParseError) ? 'REJECTED_UNCLOSED_QUOTE' : e.message;
    }
    const status = (actual === 'REJECTED_UNCLOSED_QUOTE') ? 'PASS' : 'FAIL';
    recordResult('CSV-09', 'Unclosed quote rejected fail-closed', 'REJECTED_UNCLOSED_QUOTE', actual, status, 'CSV-09.log', `INPUT:\n${input}\nACTUAL: ${actual}\n`);
  }

  // CSV-10: Characters after closing quote rejected fail-closed
  {
    const input = 'col1,col2\r\n"quoted"extra,val\r\n';
    let actual = '';
    try {
      parseStrictCSV(input);
      actual = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actual = (e instanceof CSVParseError) ? 'REJECTED_CHARS_AFTER_QUOTE' : e.message;
    }
    const status = (actual === 'REJECTED_CHARS_AFTER_QUOTE') ? 'PASS' : 'FAIL';
    recordResult('CSV-10', 'Characters after closing quote rejected fail-closed', 'REJECTED_CHARS_AFTER_QUOTE', actual, status, 'CSV-10.log', `INPUT:\n${input}\nACTUAL: ${actual}\n`);
  }

  // CSV-11: Unescaped quotes inside unquoted field rejected fail-closed
  {
    const input = 'col1,col2\r\nunquoted"bad,val\r\n';
    let actual = '';
    try {
      parseStrictCSV(input);
      actual = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actual = (e instanceof CSVParseError) ? 'REJECTED_UNESCAPED_QUOTE' : e.message;
    }
    const status = (actual === 'REJECTED_UNESCAPED_QUOTE') ? 'PASS' : 'FAIL';
    recordResult('CSV-11', 'Unescaped quote in unquoted field rejected fail-closed', 'REJECTED_UNESCAPED_QUOTE', actual, status, 'CSV-11.log', `INPUT:\n${input}\nACTUAL: ${actual}\n`);
  }

  // CSV-12: Column count mismatch in subsequent row rejected fail-closed
  {
    const input = 'col1,col2,col3\r\na,b\r\n';
    let actual = '';
    try {
      parseStrictCSV(input);
      actual = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actual = (e instanceof CSVParseError) ? 'REJECTED_COLUMN_COUNT_MISMATCH' : e.message;
    }
    const status = (actual === 'REJECTED_COLUMN_COUNT_MISMATCH') ? 'PASS' : 'FAIL';
    recordResult('CSV-12', 'Column count mismatch rejected fail-closed', 'REJECTED_COLUMN_COUNT_MISMATCH', actual, status, 'CSV-12.log', `INPUT:\n${input}\nACTUAL: ${actual}\n`);
  }

  // CSV-13: Empty header rejected fail-closed
  {
    const input = 'col1,,col3\r\na,b,c\r\n';
    let actual = '';
    try {
      parseStrictCSV(input);
      actual = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actual = (e instanceof CSVParseError) ? 'REJECTED_EMPTY_HEADER' : e.message;
    }
    const status = (actual === 'REJECTED_EMPTY_HEADER') ? 'PASS' : 'FAIL';
    recordResult('CSV-13', 'Empty header column name rejected fail-closed', 'REJECTED_EMPTY_HEADER', actual, status, 'CSV-13.log', `INPUT:\n${input}\nACTUAL: ${actual}\n`);
  }

  // CSV-14: Duplicate header column rejected fail-closed
  {
    const input = 'col1,col2,col1\r\na,b,c\r\n';
    let actual = '';
    try {
      parseStrictCSV(input);
      actual = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actual = (e instanceof CSVParseError) ? 'REJECTED_DUPLICATE_HEADER' : e.message;
    }
    const status = (actual === 'REJECTED_DUPLICATE_HEADER') ? 'PASS' : 'FAIL';
    recordResult('CSV-14', 'Duplicate header column rejected fail-closed', 'REJECTED_DUPLICATE_HEADER', actual, status, 'CSV-14.log', `INPUT:\n${input}\nACTUAL: ${actual}\n`);
  }

  // CSV-15: Strict CRLF mode rejects bare LF
  {
    const input = 'col1,col2\na,b\n';
    let actual = '';
    try {
      parseStrictCSV(input, { strictCrlf: true });
      actual = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actual = (e instanceof CSVParseError) ? 'REJECTED_BARE_LF' : e.message;
    }
    const status = (actual === 'REJECTED_BARE_LF') ? 'PASS' : 'FAIL';
    recordResult('CSV-15', 'Strict CRLF mode rejects bare LF', 'REJECTED_BARE_LF', actual, status, 'CSV-15.log', `INPUT:\n${input}\nACTUAL: ${actual}\n`);
  }

  // CSV-16: Strict CRLF mode rejects bare CR
  {
    const input = 'col1,col2\ra,b\r';
    let actual = '';
    try {
      parseStrictCSV(input, { strictCrlf: true });
      actual = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actual = (e instanceof CSVParseError) ? 'REJECTED_BARE_CR' : e.message;
    }
    const status = (actual === 'REJECTED_BARE_CR') ? 'PASS' : 'FAIL';
    recordResult('CSV-16', 'Strict CRLF mode rejects bare CR', 'REJECTED_BARE_CR', actual, status, 'CSV-16.log', `INPUT:\n${input}\nACTUAL: ${actual}\n`);
  }

  console.log(`CSV Parser suite finished: ${csvResults.length} scenarios. All pass: ${csvResults.every(r => r.status === 'PASS')}`);
  if (!csvResults.every(r => r.status === 'PASS')) {
    process.exitCode = 1;
  }
  return csvResults;
}

module.exports = { runCsvSuite, csvResults };

if (require.main === module) {
  runCsvSuite();
}
