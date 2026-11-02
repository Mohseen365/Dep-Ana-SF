const assert = require('assert');
const { parseStrictCSV, parseStrictCSVToObjects, CsvParseError } = require('./strict-rfc4180-csv-parser.cjs');

console.log('Running Strict RFC 4180 CSV Parser Conformance Suite...');
let passed = 0;
let total = 0;

function runTest(id, name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✓ [${id}] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ [${id}] ${name} FAILED:`, err.message);
    throw err;
  }
}

runTest('CSV-01', 'Empty text returns empty array', () => {
  assert.deepStrictEqual(parseStrictCSV(''), []);
  assert.deepStrictEqual(parseStrictCSVToObjects(''), []);
});

runTest('CSV-02', 'Basic single row CRLF', () => {
  const input = 'a,b,c\r\n';
  assert.deepStrictEqual(parseStrictCSV(input, { strictCrlf: true }), [['a', 'b', 'c']]);
});

runTest('CSV-03', 'Multiple rows with CRLF', () => {
  const input = 'a,b,c\r\n1,2,3\r\n4,5,6\r\n';
  assert.deepStrictEqual(parseStrictCSV(input, { strictCrlf: true }), [
    ['a', 'b', 'c'],
    ['1', '2', '3'],
    ['4', '5', '6']
  ]);
});

runTest('CSV-04', 'Quoted field with comma', () => {
  const input = 'field1,"field2,with,commas",field3\r\n';
  assert.deepStrictEqual(parseStrictCSV(input, { strictCrlf: true }), [
    ['field1', 'field2,with,commas', 'field3']
  ]);
});

runTest('CSV-05', 'Quoted field with embedded CRLF', () => {
  const input = 'field1,"line1\r\nline2",field3\r\n';
  assert.deepStrictEqual(parseStrictCSV(input, { strictCrlf: true }), [
    ['field1', 'line1\r\nline2', 'field3']
  ]);
});

runTest('CSV-06', 'Quoted field with escaped double quotes', () => {
  const input = 'field1,"he said ""hello""",field3\r\n';
  assert.deepStrictEqual(parseStrictCSV(input, { strictCrlf: true }), [
    ['field1', 'he said "hello"', 'field3']
  ]);
});

runTest('CSV-07', 'Spaces are preserved in fields', () => {
  const input = ' a , b , c \r\n';
  assert.deepStrictEqual(parseStrictCSV(input, { strictCrlf: true }), [[' a ', ' b ', ' c ']]);
});

runTest('CSV-08', 'parseStrictCSVToObjects basic mapping', () => {
  const input = 'col1,col2\r\nval1,val2\r\nval3,val4\r\n';
  assert.deepStrictEqual(parseStrictCSVToObjects(input, { strictCrlf: true }), [
    { col1: 'val1', col2: 'val2' },
    { col1: 'val3', col2: 'val4' }
  ]);
});

runTest('CSV-09', 'Bare LF rejected when strictCrlf: true', () => {
  const input = 'a,b,c\n1,2,3\n';
  assert.throws(() => parseStrictCSV(input, { strictCrlf: true }), (err) => {
    return err instanceof CsvParseError && err.code === 'BARE_LF';
  });
});

runTest('CSV-10', 'Bare CR rejected when strictCrlf: true', () => {
  const input = 'a,b,c\r1,2,3\r';
  assert.throws(() => parseStrictCSV(input, { strictCrlf: true }), (err) => {
    return err instanceof CsvParseError && err.code === 'BARE_CR';
  });
});

runTest('CSV-11', 'Unclosed quote rejected', () => {
  const input = 'a,"b,c\r\n';
  assert.throws(() => parseStrictCSV(input), (err) => {
    return err instanceof CsvParseError && err.code === 'UNCLOSED_QUOTE';
  });
});

runTest('CSV-12', 'Unquoted text after closing quote rejected', () => {
  const input = 'a,"b"c,d\r\n';
  assert.throws(() => parseStrictCSV(input), (err) => {
    return err instanceof CsvParseError && err.code === 'UNQUOTED_TEXT_AFTER_QUOTE';
  });
});

runTest('CSV-13', 'Unexpected double quote inside unquoted field rejected', () => {
  const input = 'a,b"c,d\r\n';
  assert.throws(() => parseStrictCSV(input), (err) => {
    return err instanceof CsvParseError && err.code === 'UNEXPECTED_QUOTE';
  });
});

runTest('CSV-14', 'Row width mismatch rejected', () => {
  const input = 'a,b,c\r\n1,2\r\n';
  assert.throws(() => parseStrictCSV(input), (err) => {
    return err instanceof CsvParseError && err.code === 'ROW_WIDTH_MISMATCH';
  });
});

runTest('CSV-15', 'Duplicate header name rejected', () => {
  const input = 'id,name,id\r\n1,foo,2\r\n';
  assert.throws(() => parseStrictCSVToObjects(input), (err) => {
    return err instanceof CsvParseError && err.code === 'DUPLICATE_HEADER';
  });
});

runTest('CSV-16', 'Empty header name rejected', () => {
  const input = 'id,,status\r\n1,foo,active\r\n';
  assert.throws(() => parseStrictCSVToObjects(input), (err) => {
    return err instanceof CsvParseError && err.code === 'EMPTY_HEADER_NAME';
  });
});

console.log(`\nStrict CSV Parser Conformance Summary: ${passed}/${total} PASSED\n`);
