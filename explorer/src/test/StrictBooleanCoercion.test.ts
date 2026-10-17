import { describe, it, expect } from 'vitest';
import { toBool } from '../lib/boolean-utils';

describe('Strict Boolean Coercion - toBool', () => {
  it('converts booleans directly', () => {
    expect(toBool(true)).toBe(true);
    expect(toBool(false)).toBe(false);
  });

  it('converts string booleans strictly without Boolean("false") bug', () => {
    expect(toBool('true')).toBe(true);
    expect(toBool('TRUE')).toBe(true);
    expect(toBool('false')).toBe(false);
    expect(toBool('FALSE')).toBe(false);
  });

  it('converts numbers and numeric strings', () => {
    expect(toBool(1)).toBe(true);
    expect(toBool(0)).toBe(false);
    expect(toBool('1')).toBe(true);
    expect(toBool('0')).toBe(false);
  });

  it('handles null, undefined, and empty values safely', () => {
    expect(toBool(null)).toBe(false);
    expect(toBool(undefined)).toBe(false);
    expect(toBool('')).toBe(false);
  });
});
