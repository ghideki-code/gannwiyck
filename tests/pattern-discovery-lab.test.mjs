#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
const src=fs.readFileSync('bot/pattern-discovery-lab-v01.mjs','utf8');
assert.match(src,/realExecution:false/);
assert.match(src,/frozenV56Touched:false/);
assert.match(src,/Benjamini-Hochberg/);
assert.match(src,/climaxProxy/);
assert.doesNotMatch(src,/newOrder|placeOrder|createOrder|\/order\b/i);
console.log('pattern-discovery-lab static safety tests: PASS');
