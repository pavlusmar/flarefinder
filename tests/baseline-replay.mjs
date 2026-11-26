// Replay the exact historical display functions. The test's candidate is explicitly authored,
// so its output measures transformation loss and cannot estimate model generation quality.
import {execFileSync} from 'node:child_process';
import {stripTypeScriptTypes} from 'node:module';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const commit = '549f80b434ccd55b15b72ed6c09ce6d0bf7a9d7a';
const root = new URL('../', import.meta.url);
const base = execFileSync('git',['show',commit+':src/index.ts'],{cwd:root,encoding:'utf8'});
// This imported constant is consumed only by reference retrieval. Neither display function uses it.
const isolated = base.replace('import { strategyReferences } from "./strategy-references";','const strategyReferences = [];')
  + '\nexport { normalizeReport, finalizeEvidenceReport };';
const js=stripTypeScriptTypes(isolated,{mode:'transform'});
const {normalizeReport,finalizeEvidenceReport}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const fixture=JSON.parse(readFileSync(new URL('fixtures/9fin-fixed.json',import.meta.url)));
const normalized=normalizeReport(fixture.candidate);
const displayed=finalizeEvidenceReport(normalized,fixture.sources);
const count=r=>({growth:r.growth_signals.length,technical:r.technical_signals.length,opportunities:r.cloudflare_opportunities.length,priorities:r.customer_perspective.priorities.length});
const before=count(fixture.candidate),after=count(displayed);
assert.deepEqual(before,{growth:1,technical:2,opportunities:1,priorities:1});
assert.deepEqual(after,{growth:0,technical:0,opportunities:0,priorities:0});
console.log(JSON.stringify({commit,before,after,displayed},null,2));

// Only exercise the display path here. External bindings and model imports are unused.
const current=readFileSync(new URL('../src/index.ts',import.meta.url),'utf8').replace(/^import .*?;$/gm,'');
const updatedJs=stripTypeScriptTypes(current+'\nexport { normalizeReport, finalizeEvidenceReport };',{mode:'transform'});
const updatedModule=await import('data:text/javascript;base64,'+Buffer.from(updatedJs).toString('base64'));
const preserved=updatedModule.finalizeEvidenceReport(updatedModule.normalizeReport(fixture.candidate),fixture.sources);
assert.deepEqual(count(preserved),before);
console.log(JSON.stringify({updated:count(preserved),issues:preserved.validation_issues},null,2));
