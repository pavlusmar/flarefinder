import test from 'node:test';
import assert from 'node:assert/strict';
import {commercialFacts,themeKey,verifiedPostingDate} from '../public/commercial-facts.js';
const source=(snippet)=>({title:"Example company profile",snippet});
test('profile facts retain source disagreements and bounds without consuming adjacent fields',()=>{
  const sources=[source("Founded\n: 2016\nEmployees\n: 501-1000"),source("650+ people. It hired 90 people for a new hub."),source("| Employees | 670 |"),source("Raised $170M Series C. Total funding raised now exceeds $250 million.")];
  const facts=commercialFacts({name:"Example"},sources);
  assert.deepEqual(facts.headcount.map(x=>x.value),["501-1000","650+","670"]);
  assert.deepEqual(facts.funding.map(x=>x.value),["> $250 million"]);
});
test('historical currency, period, revenue, ARR and forecast remain separate',()=>{
  const facts=commercialFacts({name:"Example"},[source("2024 revenue was $25M. Accounts show revenues grew to GBP14.3m in 2024. That suggests revenues of GBP60m in 2026F. Annual recurring revenue of approximately $50m.")]);
  assert.deepEqual(facts.revenue.map(x=>x.basis),["Source-reported revenue","Source-reported revenue","Estimate","Reported ARR"]);
  assert.deepEqual(facts.revenue[2].periods,["2026F"]);
  assert.deepEqual(facts.revenue[1].currencies,["GBP"]);
});
test('theme variants agree and collection dates never establish posting dates',()=>{
  assert.equal(themeKey("Multi‑Model Operations"),themeKey("Multi-Model Operations"));
  assert.equal(verifiedPostingDate("2026‑11‑26","[S1]",[source("Collected 2026-11-26")]),"");
  assert.equal(verifiedPostingDate("2026‑11‑26","[S1]",[source("Posted on 2026-11-26")]),"2026-11-26");
});
