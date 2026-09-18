import fs from 'node:fs';
import assert from 'node:assert/strict';
const gate=JSON.parse(fs.readFileSync(new URL('../release-gate.json',import.meta.url),'utf8'));
assert.equal(gate.deployAllowed,false,'Rikkyo must stay blocked until Shared UI is pinned');
assert.ok(gate.blockers.includes('ui.lock.json pinned to Waseda Shared UI'));
assert.ok(!fs.existsSync(new URL('../ui.lock.json',import.meta.url)),'do not invent a Shared UI lock before Waseda release');
console.log('Rikkyo Shared UI migration hold: CLEAN');
