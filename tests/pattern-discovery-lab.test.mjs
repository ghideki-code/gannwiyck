#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
const src=fs.readFileSync('bot/pattern-discovery-lab-v01.mjs','utf8');
assert.match(src,/realExecution:false/);
assert.match(src,/frozenV56Touched:false/);
assert.match(src,/Benjamini-Hochberg/);
assert.match(src,/function applyGlobalBH\(/);
assert.match(src,/globalSignificant/);
assert.match(src,/globalHypothesisCount/);
assert.match(src,/climaxProxy/);
assert.doesNotMatch(src,/newOrder|placeOrder|createOrder|\/order\b/i);
const rangeSrc=fs.readFileSync('bot/range-model1-crossanalysis-v01.mjs','utf8');
assert.match(rangeSrc,/lookaheadAudit=M\.lookaheadAudit/);
assert.doesNotMatch(rangeSrc,/placeOrder|createOrder|newOrder|\/order\b/i);
const workflow=fs.readFileSync('.github/workflows/pattern-discovery-lab.yml','utf8');
assert.match(workflow,/Lookahead audit/);
assert.match(workflow,/globalSignificant/);
console.log('pattern-discovery-lab static safety tests: PASS');
