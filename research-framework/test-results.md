# Development handover

The development branch is `research/strategic-rebuild`. The production deployment, D1 and the territory CSVs were untouched. The reference corpus and methodology are bundled into the Worker at build time.

## Reference library

| Account | Strategic question | Files |
|---|---|---|
| 9fin | Can a shared platform reduce repeated engineering work for credit research features while keeping proprietary material within agreed controls? | [Plan](references/9fin.md) · [JSON](structured-references/9fin.json) |
| ElevenLabs | Which voice delivery constraints belong to ElevenLabs, and which belong to developers integrating its models? | [Plan](references/elevenlabs.md) · [JSON](structured-references/elevenlabs.json) |
| Fresha | Can partners bring salons more completed bookings without blocking legitimate automated discovery? | [Plan](references/fresha.md) · [JSON](structured-references/fresha.json) |
| Ably | Where can developer integration improve adoption without displacing the realtime product Ably sells? | [Plan](references/ably.md) · [JSON](structured-references/ably.json) |
| MUBI | Does campaign delivery affect conversion among people actually entitled to the advertised benefit? | [Plan](references/mubi.md) · [JSON](structured-references/mubi.json) |
| Form3 | Can its simulator shorten the path from bank integration to live processing without a new dependency on live rails? | [Plan](references/form3.md) · [JSON](structured-references/form3.json) |
| Attio | Which measurable expansion could improve a permissioned CRM workflow given the disclosed Cloudflare relationship? | [Plan](references/attio.md) · [JSON](structured-references/attio.json) |
| Oxa | Who owns a non-operational partner interface and has evidence it slows site integration? | [Plan](references/oxa.md) · [JSON](structured-references/oxa.json) |
| Tessl | What happens to stored bytes and serving costs as run outputs are retained for longer? | [Plan](references/tessl.md) · [JSON](structured-references/tessl.json) |
| Harmonic Security | Does shipping detections to additional SIEM platforms create recurring integration work outside its competitive core? | [Plan](references/harmonic-security.md) · [JSON](structured-references/harmonic-security.json) |

## Implementation and evidence

- [Pipeline audit](pipeline-audit.md) traces selection through presentation. [Methodology](methodology.md) and [structured principles](methodology.json) derive twelve analytical patterns from the case comparisons.
- Queue stages cover collection or saved-dossier loading, reference retrieval, analysis, independent evaluation, conditional additional evidence and revision, then report selection. The additive migration records run configuration, evidence, references, versions, feedback and available usage. Dashboard users can see the stage, separate quality score and warnings, replay saved evidence, and inspect prior versions.
- GPT-OSS 120B supplies strategic analysis. A different model, Qwen 3.8 27B, evaluates the normalized report. The previously proposed Qwen3 30B was marked deprecated on November 20. The threshold defaults to 85 and the revision limit to two. An unavailable evaluator cannot confer a passing grade. Search is disabled for saved-evidence runs, including evaluator requests for more information.
- A historical-code replay with a four-source 9fin fixture verified that the old display dropped one growth signal, two technical signals, one priority and one opportunity. All five survive the new transformation. Missing strategic linkage remains visible for review. The historical production dossier was unavailable.
- The blinded 9fin trial, repeated held-out cases, negative controls and deliberate errors are documented in [evaluation experiments](evaluation-experiments.md). Two separately written briefs used the same four target sources. The evaluator scored the reference-assisted brief 94 and the control 91. Both warranted discovery. This single pair does not quantify production uplift.
- All 36 local tests passed on Node 24. TypeScript, browser JavaScript syntax and Wrangler packaging also passed. The compressed Worker bundle was 88.90 KiB. The tests use real migration SQL with SQLite, actual Worker handlers and mock provider responses. They exercise duplicate deliveries, model allowlists, admin gates, review failure, bounded revisions, saved-dossier reuse, fresh-only supplementation and best-version selection. A Chromium smoke check with a mocked API opened a report, displayed its quality warning, loaded history and submitted saved-evidence replay. Wrangler produced a deployment bundle in dry-run mode.
- This checkout had no authenticated Workers AI, staging Worker or Tavily credentials. Cloudflare and Tavily endpoint quality, live latency, real spend and production behaviour remain unverified. [Cost scenarios](cost-analysis.md) distinguish measured activity from estimated billing.

## Reproduction and staging acceptance

Use Node 24. Install dependencies with `npm install --legacy-peer-deps`, then run `npm run typecheck`, `node --check public/app.js`, `node --test tests/*.test.*`, `node tests/baseline-replay.mjs` and `npx wrangler deploy --dry-run`. The historical comparison needs Git history containing 549f80b.

For live acceptance, use a separately provisioned staging Worker, D1 and queues, apply the additive migrations to that database, and configure Workers AI, Tavily and the admin token on staging. The checked-in Wrangler settings refer to the existing application, so choose the staging bindings explicitly before any deployment. On a staging company with saved sources, choose **Reanalyze saved evidence** twice with the same analyst, changing only **Use reference reports**. For an exact historical run use the authenticated replay endpoint and the same `dossier_run_id` for both arms. Repeat on held-out accounts. Compare initial and selected versions, inspect failures, confirm unchanged evidence timestamps and zero search calls, and record tokens and elapsed time. Use the optional `tests/live-evaluator.mjs --live` harness on the flawed public fixtures to check the actual judge. No credentials belong in the repository.
