/**
 * test-csv-parser.cjs
 * Comprehensive positive and negative test suite for strict-rfc4180-csv-parser.cjs.
 */

const assert = require('assert');
const fs = require('fs');
const { parseStrictCSV, CSVParseError } = require('./strict-rfc4180-csv-parser.cjs');

const testResults = [];

function recordTest(id, name, type, passed, details) {
  testResults.push({ id, name, type, passed, details });
  const status = passed ? 'PASS' : 'FAIL';
  console.log(`[${status}] ${id}: ${name}`);
  if (!passed) {
    console.error(`   Error: ${details}`);
  }
}

const positiveFixtures = [
  { id: 'POS-01', name: 'Simple unquoted 2x2 CSV', input: 'col1,col2\nval1,val2\n', expected: [['col1', 'col2'], ['val1', 'val2']] },
  { id: 'POS-02', name: 'Field containing a comma', input: 'id,name\n1,"Doe, Jane"\n', expected: [['id', 'name'], ['1', 'Doe, Jane']] },
  { id: 'POS-03', name: 'Field containing escaped double quotes', input: 'id,quote\n1,"She said ""Hello"""\n', expected: [['id', 'quote'], ['1', 'She said "Hello"']] },
  { id: 'POS-04', name: 'Field containing embedded CRLF newline', input: 'id,multiline\r\n1,"Line 1\r\nLine 2"\r\n', expected: [['id', 'multiline'], ['1', 'Line 1\r\nLine 2']] },
  { id: 'POS-05', name: 'Field containing embedded LF newline', input: 'id,multiline\n1,"Line A\nLine B"\n', expected: [['id', 'multiline'], ['1', 'Line A\nLine B']] },
  { id: 'POS-06', name: 'Unicode UTF-8 content', input: 'id,lang\n1,日本語\n2,Français\n3,Español\n', expected: [['id', 'lang'], ['1', '日本語'], ['2', 'Français'], ['3', 'Español']] },
  { id: 'POS-07', name: 'Field with leading space in unquoted field', input: 'col1,col2\n val1,val2\n', expected: [['col1', 'col2'], [' val1', 'val2']] },
  { id: 'POS-08', name: 'Field with trailing space in unquoted field', input: 'col1,col2\nval1 ,val2\n', expected: [['col1', 'col2'], ['val1 ', 'val2']] },
  { id: 'POS-09', name: 'Quoted field preserving leading and trailing spaces', input: 'col1,col2\n"  leading and trailing  ",normal\n', expected: [['col1', 'col2'], ['  leading and trailing  ', 'normal']] },
  { id: 'POS-10', name: 'Empty fields in middle and end of row', input: 'a,b,c\n1,,3\n4,5,\n', expected: [['a', 'b', 'c'], ['1', '', '3'], ['4', '5', '']] },
  { id: 'POS-11', name: 'Empty final field on row', input: 'h1,h2,h3\nx,y,\n', expected: [['h1', 'h2', 'h3'], ['x', 'y', '']] },
  { id: 'POS-12', name: 'Final row without trailing newline', input: 'col1,col2\nv1,v2', expected: [['col1', 'col2'], ['v1', 'v2']] },
  { id: 'POS-13', name: 'UTF-8 BOM handled at start of file', input: '\uFEFFheader1,header2\nval1,val2\n', expected: [['header1', 'header2'], ['val1', 'val2']] },
  { id: 'POS-14', name: 'Completely quoted header and cells', input: '"H1","H2"\n"V1","V2"\n', expected: [['H1', 'H2'], ['V1', 'V2']] },
  { id: 'POS-15', name: 'Consecutive commas yielding multiple empty fields', input: 'a,b,c,d\n1,,,4\n', expected: [['a', 'b', 'c', 'd'], ['1', '', '', '4']] },
  { id: 'POS-16', name: 'Empty quoted field ("")', input: 'c1,c2\n"",val\n', expected: [['c1', 'c2'], ['', 'val']] }
];

const negativeFixtures = [
  { id: 'NEG-01', name: 'Quote appearing inside an unquoted field (x"z")', input: 'col1,col2\nx"z",val2\n', expectedPattern: /Unescaped quote encountered inside unquoted field/ },
  { id: 'NEG-02', name: 'Characters after a closing quote ("x"junk)', input: 'col1,col2\n"x"junk,val2\n', expectedPattern: /Characters encountered after closing quote/ },
  { id: 'NEG-03', name: 'Leading whitespace before an opening quote (strict behavior)', input: 'col1,col2\n "quoted",val2\n', expectedPattern: /Unescaped quote encountered inside unquoted field/ },
  { id: 'NEG-04', name: 'Unclosed quoted field at EOF', input: 'col1,col2\n"unclosed,val2\n', expectedPattern: /Unclosed quoted field at end of file/ },
  { id: 'NEG-05', name: 'Inconsistent column count (too few)', input: 'col1,col2,col3\nval1,val2\n', expectedPattern: /Inconsistent column count/ },
  { id: 'NEG-06', name: 'Inconsistent column count (too many)', input: 'col1,col2\nval1,val2,val3\n', expectedPattern: /Inconsistent column count/ },
  { id: 'NEG-07', name: 'Duplicate header names', input: 'col1,col1\nval1,val2\n', expectedPattern: /Duplicate header/ },
  { id: 'NEG-08', name: 'Empty header name', input: 'col1,,col3\n1,2,3\n', expectedPattern: /Empty or whitespace-only header/ },
  { id: 'NEG-09', name: 'Whitespace-only header name', input: 'col1,   ,col3\n1,2,3\n', expectedPattern: /Empty or whitespace-only header/ },
  { id: 'NEG-10', name: 'Trailing characters after quote before CRLF ("x" \\r\\n)', input: 'c1,c2\r\n"x" trailing,y\r\n', expectedPattern: /Characters encountered after closing quote/ },
  { id: 'NEG-11', name: 'Unescaped lone quote at end of unquoted string', input: 'c1,c2\nabc",def\n', expectedPattern: /Unescaped quote encountered inside unquoted field/ },
  { id: 'NEG-12', name: 'Odd number of quotes in quoted string with unclosed quote', input: 'c1,c2\n"some ""quote"more,def\n', expectedPattern: /Characters encountered after closing quote/ },
  { id: 'NEG-13', name: 'Unclosed multiline quoted string at EOF', input: 'c1,c2\n"line 1\nline 2', expectedPattern: /Unclosed quoted field at end of file/ },
  { id: 'NEG-14', name: 'Non-string input throws error', input: 12345, expectedPattern: /Input must be a string/ },
  { id: 'NEG-15', name: 'Second row column count mismatch in CRLF file', input: 'a,b,c\r\n1,2\r\n', expectedPattern: /Inconsistent column count/ },
  { id: 'NEG-16', name: 'Middle quote in third column', input: 'a,b,c\n1,2,a"b\n', expectedPattern: /Unescaped quote encountered inside unquoted field/ }
];

console.log('--- EXECUTING POSITIVE FIXTURES ---');
let posPass = 0;
for (const fix of positiveFixtures) {
  try {
    const actual = parseStrictCSV(fix.input, { filename: fix.id });
    assert.deepStrictEqual(actual, fix.expected);
    recordTest(fix.id, fix.name, 'POSITIVE', true, 'Exact match with expected 2D array');
    posPass++;
  } catch (err) {
    recordTest(fix.id, fix.name, 'POSITIVE', false, err.message);
  }
}

console.log('\n--- EXECUTING NEGATIVE FIXTURES ---');
let negPass = 0;
for (const fix of negativeFixtures) {
  try {
    parseStrictCSV(fix.input, { filename: fix.id });
    recordTest(fix.id, fix.name, 'NEGATIVE', false, 'Expected rejection but parser succeeded');
  } catch (err) {
    if (fix.expectedPattern.test(err.message)) {
      recordTest(fix.id, fix.name, 'NEGATIVE', true, `Correctly rejected: ${err.message}`);
      negPass++;
    } else {
      recordTest(fix.id, fix.name, 'NEGATIVE', false, `Wrong error pattern. Expected ${fix.expectedPattern}, got: ${err.message}`);
    }
  }
}

const registerHeader = 'Test_ID,Scenario_Name,Type,Expected_Outcome,Actual_Outcome,Status,Details\n';
const registerRows = testResults.map(r => {
  const cleanDetails = `"${r.details.replace(/"/g, '""')}"`;
  return `${r.id},"${r.name}",${r.type},${r.type === 'POSITIVE' ? 'PARSED_EXACT' : 'REJECTED'},${r.passed ? (r.type === 'POSITIVE' ? 'PARSED_EXACT' : 'REJECTED') : 'MISMATCH'},${r.passed ? 'PASS' : 'FAIL'},${cleanDetails}`;
}).join('\n');

fs.writeFileSync('docs/wave-0/4.3/WAVE_0_4_3_CSV_PARSER_TEST_REGISTER.csv', registerHeader + registerRows + '\n');

console.log(`\nPARSER TEST SUMMARY:`);
console.log(`Positive tests: ${posPass}/${positiveFixtures.length} passed`);
console.log(`Negative tests: ${negPass}/${negativeFixtures.length} passed`);
console.log(`Total tests: ${posPass + negPass}/${positiveFixtures.length + negativeFixtures.length} passed`);

if (posPass + negPass !== positiveFixtures.length + negativeFixtures.length) {
  process.exit(1);
}
