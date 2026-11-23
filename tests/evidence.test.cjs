// Run with: npm install && node --test tests/evidence.test.cjs
// Pure offline regression tests. No Cloudflare API, Tavily, database or network calls.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../src/index.ts'), 'utf8');
const compiled = ts.transpileModule(source + '\nexports.__test = { validateOpportunityEvidence, evidenceGrounded, citedSourceText, scorePursuitWithClef };', {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
});
const sandbox = { exports: {}, console, URL, Response, Request, Headers, TextEncoder, TextDecoder };
vm.runInNewContext(compiled.outputText, sandbox, { filename: 'index.transpiled.cjs' });
const { validateOpportunityEvidence, evidenceGrounded, scorePursuitWithClef } = sandbox.exports.__test;
const sourceItem = snippet => ({ title: 'Company engineering announcement', snippet, url: 'https://example.com/company' });
const opportunity = (pillar, product_fit) => ({
  pillar, product_fit, confidence: 'medium',
  evidence: '[S1]', signal: 'Company initiative [S1]',
  hypothesis: 'Explore this documented initiative',
  implication: 'Could create a relevant technical discussion',
  limitations: 'Existing providers and architecture unknown',
  stakeholder: 'Platform engineering lead',
  discovery_question: 'What requirements are driving this initiative?',
  outreach: 'I saw your initiative [S1] and would welcome a conversation.'
});
const report = (opportunities=[], ai=[]) => ({ cloudflare_opportunities: opportunities, ai_signals: ai, questions: [] });
const ai = (theme, signal='strong') => ({ theme, signal, evidence:'[S1]', hypothesis:'Validate relevance', confidence:'high' });

test('accepts a sourced Build AI Gateway opportunity, without asserting a purchase', () => {
  const r=report([opportunity('Build','AI Gateway')]);
  validateOpportunityEvidence(r,[sourceItem('Engineering team hiring for AI gateway and model routing')]);
  assert.equal(r.cloudflare_opportunities.length,1);
});
test('rejects unsupported Connect pitch based on generic AI hiring', () => {
  const r=report([opportunity('Connect','Cloudflare CDN')]);
  validateOpportunityEvidence(r,[sourceItem('Hiring a senior AI platform engineer to build agents')]);
  assert.equal(r.cloudflare_opportunities.length,0);
});
test('rejects a Protect pitch based only on generic agent work', () => {
  const r=report([opportunity('Protect','API Shield')]);
  validateOpportunityEvidence(r,[sourceItem('Hiring to build autonomous agents')]);
  assert.equal(r.cloudflare_opportunities.length,0);
});
test('rejects invented source indices', () => {
  const r=report([{...opportunity('Build','AI Gateway'),evidence:'[S99]',signal:'Company initiative [S99]'}]);
  validateOpportunityEvidence(r,[sourceItem('AI gateway engineering')]);
  assert.equal(r.cloudflare_opportunities.length,0);
});
test('does not treat generic AI marketing as verified AI security', () => {
  const r=report([],[ai('Secure AI Applications & Agents')]);
  validateOpportunityEvidence(r,[sourceItem('New AI assistant product launch')]);
  assert.equal(r.ai_signals[0].signal,'insufficient');
});
test('preserves explicit AI inference cost evidence', () => {
  const r=report([],[ai('AI Cost & Inference Economics')]);
  validateOpportunityEvidence(r,[sourceItem('Engineering roadmap prioritises inference cost optimization')]);
  assert.equal(r.ai_signals[0].signal,'strong');
});
test('downgrades model routing without two named providers', () => {
  const r=report([],[ai('Multi-Model Operations')]);
  validateOpportunityEvidence(r,[sourceItem('Building an AI gateway for model routing')]);
  assert.equal(r.ai_signals[0].signal,'possible');
});
test('preserves multi-provider evidence when two families are named', () => {
  const r=report([],[ai('Multi-Model Operations')]);
  validateOpportunityEvidence(r,[sourceItem('Platform integrates OpenAI GPT-4 and Anthropic Claude with model routing')]);
  assert.equal(r.ai_signals[0].signal,'strong');
});
test('invalid citations cannot pass the opportunity filter', () => {
  const r=report([opportunity('Build','AI Gateway')]);
  r.cloudflare_opportunities[0].signal='Company initiative [S500]';
  evidenceGrounded(r,[sourceItem('AI gateway engineering')]);
  assert.equal(r.cloudflare_opportunities.length,0);
});

const mockCompany = {id:'9fin',name:'9fin',description:'Debt intelligence software',sector:'Fintech',website:'https://9fin.com',employees:null,funding_usd:null,growth_score:null,last_funding_date:null,growth_prediction:null};
function mockScoring(answers) {
  return { AI: { run: async () => ({answers}) } };
}
const scoreKeys=['digital_native_fit','commercial_scale','momentum','product_relevance','research_quality','validated_need','solution_evidence','timing','stakeholders'];
test('scoring: generic AI hiring cannot create verified buyer need or stakeholder access', async () => {
  const answers=Object.fromEntries(scoreKeys.map(key=>[key,{value:'4'}]));
  const r=report([opportunity('Build','AI Gateway')]);
  r.cloudflare_opportunities[0].confidence='high';
  const score=await scorePursuitWithClef(mockScoring(answers),mockCompany,r,[sourceItem('Hiring AI platform engineer to work on model routing')]);
  assert.equal(score.status,'scored');
  assert.equal(score.readiness.dimensions.find(x=>x.key==='validated_need').score,1);
  assert.equal(score.readiness.dimensions.find(x=>x.key==='stakeholders').score,0);
});
test('scoring: a documented RFP and explicit need can preserve scored readiness', async () => {
  const answers=Object.fromEntries(scoreKeys.map(key=>[key,{value:'3'}]));
  const r=report([opportunity('Build','AI Gateway')]);
  r.cloudflare_opportunities[0].confidence='high';
  const score=await scorePursuitWithClef(mockScoring(answers),mockCompany,r,[sourceItem('We need an AI gateway. RFP issued for vendor selection underway.')]);
  assert.equal(score.status,'scored');
  assert.equal(score.readiness.dimensions.find(x=>x.key==='validated_need').score,3);
  assert.equal(score.readiness.dimensions.find(x=>x.key==='stakeholders').score,3);
});
