const fs = require('fs');
const path = require('path');
const fixturePath = path.resolve(__dirname, '../../..', 'audit-fixtures', 'cloud-spend-tracker', 'explorer-data.json');
const data = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
const edges = data.edges.filter(e => e.source === 'ApexClass:UserOrganizationRoleTriggerHandler');
console.log(JSON.stringify(edges, null, 2));
