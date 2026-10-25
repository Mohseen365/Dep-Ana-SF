import { describe, it, expect } from 'vitest';
import { classifyNodeLayer } from '../lib/layout/layers';
import type { ExplorerNode } from '../types/explorer';

function makeNode(id:string, displayName:string, type:string='ApexClass', behavior:any = {}): ExplorerNode {
  return { id, type, displayName, behavior } as ExplorerNode;
}

describe('classifyNodeLayer – handler classification', () => {
  it('classifies a Handler with query behavior as application', () => {
    const node = makeNode('ApexClass:UserOrganizationRoleTriggerHandler', 'UserOrganizationRoleTriggerHandler', 'ApexClass', { queryCount: 1, dmlCount: 0, asyncPatterns: [] });
    expect(classifyNodeLayer(node)).toBe('application');
  });

  it('classifies a Handler with DML behavior as application', () => {
    const node = makeNode('ApexClass:UserOrganizationRoleTriggerHandler', 'UserOrganizationRoleTriggerHandler', 'ApexClass', { queryCount: 0, dmlCount: 1, asyncPatterns: [] });
    expect(classifyNodeLayer(node)).toBe('application');
  });

  it('classifies a domain‑style class with query behavior as domain', () => {
    const node = makeNode('ApexClass:AccountSelector', 'AccountSelector', 'ApexClass', { queryCount: 1, dmlCount: 0, asyncPatterns: [] });
    expect(classifyNodeLayer(node)).toBe('domain');
  });

  it('preserves explicit type‑based mapping (Object -> schema)', () => {
    const node = makeNode('Object:Account', 'Account', 'Object');
    expect(classifyNodeLayer(node)).toBe('schema');
  });
});
