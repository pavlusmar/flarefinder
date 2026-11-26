# Independent review experiments

Checked November 26, 2026. Each number below identifies its origin. Offline fixture judgments measure whether the written examples satisfy the rubric. They cannot estimate the deployed model's quality.

## An actual before-image of the 9fin display path

Run `node tests/baseline-replay.mjs` in a checkout containing commit `549f80b434ccd55b15b72ed6c09ce6d0bf7a9d7a` using Node 24+. The script loads the two historical functions directly from git and applies them to the exact authored model-format candidate in `tests/fixtures/9fin-fixed.json`. Four independently opened public sources form the frozen dossier. No production snapshot or private search response was available.

| Field | Input candidate | Old displayed output | Updated displayed output |
| --- | ---: | ---: | ---: |
| Growth signals | 1 | 0 | 1 |
| Technical signals | 2 | 0 | 2 |
| Strategic priorities | 1 | 0 | 1 |
| Opportunities | 1 | 0 | 1 |

The candidate used valid source numbers in parentheses for all four affected fields. Its summary used square brackets and survived. The old displayed report omitted the shared platform remit and its conditional request-visibility opportunity. A reader could see one question about provider metadata but no longer see its reasoning. Scoring the old displayed fixture using the dimension order in the rubric yielded **24/100** (8,2,7,1,2,2,1,1). It failed for material lost evidence. This is an independent agent's assessment of a controlled reconstruction. A historical GPT-OSS answer, its production scores and the complete historical 30-source dossier were unavailable.

The same invocation also exercises the updated display functions. All counts return to their original values. The legacy-format candidate lacks a linked priority ID and explicit initiative field. Both defects are retained as review warnings rather than removing the hypothesis. This demonstrates evidence preservation; it does not establish an analyst-model quality gain.

## Held-out and negative controls

A separate analyst agent wrote from the fixed public dossiers in `tests/fixtures/held-out-dossiers.json` for this exercise and wrote the candidate assessments in `tests/fixtures/held-out-candidates.json`. The reviewer assessed the candidates after they were written. Neither file participates in reference retrieval. This used separate assistant agents outside the Worker. It establishes an independent assessment of actual authored reports. It does not establish the GPT-OSS, Qwen or live Worker performance.

| Candidate | Dimension points in rubric order | Quality | Independent assessment |
| --- | --- | ---: | --- |
| Paddle | 16,18,14,13,9,8,5,4 | 87 | Identifies the merchant-of-record transaction model. Delayed or duplicate events are a handling requirement, with no evidence of an incident. Separates merchant-owned receivers from Paddle's delivery side, keeping template adoption outside direct Paddle spend. The proof could better specify whether a support burden is big enough to justify the maintenance cost. No dated urgency. |
| tldraw | 17,18,14,14,9,8,5,4 | 89 | Correctly treats Durable Objects and R2 as incumbent at tldraw.com. A customer's self-hosted implementation creates a distinct opportunity. Illustrates how to test marginal value on a hosted room and return to the existing setup if performance already meets needs. The relationship between licensing conversion and a partner example remains unmeasured. |
| Fastly | 16,17,12,14,9,9,5,3 | 85 | Explicitly rejects replacement of the competing edge service. A separate non-core use case would require a specific workload and owner. Current evidence supplies no segment-level revenue, capital allocation or new reason for outreach. A precise verification question would improve discovery. |
| Synthetic sparse account | 17,16,13,14,10,10,5,3 | 88 | Leaves fit and opportunities unqualified, identifies the first verifiable facts to obtain and avoids costs, named buyers or deadlines. An explicit reopen condition involving an owned workload and dated initiative would improve the result. |

The last two cases were graded for appropriate restraint under a sparse dossier. Their high scores do not suggest these are attractive sales targets. No confidence interval or average lift is appropriate for this hand-selected sample.

## Repeat using another analyst agent

A second analyst separately wrote reports on the identical dossiers in `tests/experiments/heldout-reports.json`. The independent reviewer applied the same rubric. Both analyst agents distinguished Paddle's customers' webhook receivers from Paddle's own offering, recognised the existing Cloudflare footprint at tldraw, disqualified the competitive core at Fastly and declined to recommend a product to the sparse account. Their most promising tldraw next steps differed. One sought a constraint in the hosted service, while the other focused on reducing SDK adopters' authorisation integration work. Both qualify these as discovery hypotheses.

| Candidate | Dimension points | Quality | Reviewer notes on the second draft |
| --- | --- | ---: | --- |
| Paddle | 17,18,14,13,9,8,5,4 | 88 | Retains the precise published fee and avoids confusing callback traffic with revenue. Connects merchant onboarding time to the transaction economics and asks for a measurable pilot. Signature verification is missing from its proposed pilot criteria. The five-second timeout is contractual behavior, not proof of experienced friction. |
| tldraw | 17,18,14,14,9,8,5,4 | 89 | Explains SDK conversion economics and the limits of direct spend. Explicitly tests a plausible authorisation onboarding obstacle and asks the owner for data. A pilot needs customer willingness, a defined tenant model and demonstrated license-conversion friction. |
| Fastly | 17,17,12,14,9,9,5,3 | 86 | Names the competing core and gives explicit reopening criteria. Unverified pricing is left unknown. Does not establish any alternative customer initiative. This is appropriate for the one-source dossier. |
| Synthetic sparse account | 17,17,13,14,10,10,5,3 | 89 | Requires a dated initiative after basic identity and monetisation. A more operational reopen condition would specify whose workload and what evidence of constraint qualify. |

The consistency observed across four decisions is an offline, same-dossier qualitative result. The two pairs of ratings and four accounts are too small and too related to infer an expected score improvement.

## Deliberately flawed reports

An independent assessor compared the four drafts in `tests/fixtures/flawed-reports.json` against the corresponding dossiers. All four warrant critical failure. The same file stores the expected issue families separately from the drafts. The live harness sends only a draft and its dossier to the model.

| Report | Critical failures identified | Targeted revision |
| --- | --- | --- |
| Paddle | S1 contradicts the fixed-price consumer subscription. S2 assigns the receiver to merchants. S99, the named VP, budget, outage and migration approval have no source. | Explain who earns revenue per completed checkout and which team controls the failing step before proposing an engagement. |
| tldraw | S2 explicitly documents Cloudflare adoption. The candidate falsely attributes third-party rooms to tldraw and asserts a purchase request without evidence. | Separate direct footprint from distribution influence. Compare a single confirmed improvement against its incumbent baseline. |
| Fastly | S1 documents a product competing with the proposed replacement. The quarter deadline and core migration have no source. | Close out the core replacement pitch unless there is a separate buyer-owned workload and measurable unmet requirement. |
| Synthetic sparse account | The sole source records a website. The analyst invents its business model, AI budget and buyer and proposes a GPU training job on standard Workers. | Obtain company identity, products and workload ownership before estimating fit or initiating outreach. |

This is an independent content review of introduced errors, not a measured Qwen recall rate.

## Revision, selection and reproducibility

Run `node --test tests/evaluation.test.mjs` with Node 24+. These tests use explicitly scripted endpoint responses. A legitimate 80/100 draft was revised to 84/100; a third response returned 100/100 but introduced a critical failure. The 84/100 draft was retained with a warning. A separate test stops after an eligible revision passes. Other tests check exact displayed input, missing fields, limits, same-model rejection, independent grade aggregation and equal-score ties. Repeated fixed inputs in this harness demonstrate deterministic controller behavior only. Reproducibility of generated commercial conclusions needs repeated real model calls.

## Endpoint experiment

`node tests/live-evaluator.mjs --live` runs the fixed flawed-report suite with four calls maximum using environment variables `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` (Workers AI permission). It emits the full per-case evaluation, usage when provided and elapsed time. Its no-credential guard was tested. No production data is accessed. Check identified issue families as well as the numeric score. A critical failure unrelated to the injected errors is not evidence that the reviewer detected the error. The harness deliberately stops after the first technical failure. Search costs are zero and no credentials are stored. This experiment remains unexecuted against a real endpoint.

## Blinded fixed-dossier comparison for 9fin

Two candidate briefs were scored under opaque identifiers on the four-source dossier. The reviewer scored J before seeing Q and scored Q before disclosure of its condition. Both retained recent product, commercial leadership and intended engineering evidence; both qualified a potential shared-platform use case without asserting procurement. Neither independently establishes that a routing layer improves revenue. The proposed test would need to beat existing instrumentation and satisfy the company's data handling constraints.

| Candidate | Dimension points in rubric order | Quality | Decision |
| --- | --- | ---: | --- |
| [J](../tests/experiments/sample-j.json) | 18,18,13,14,9,9,5,5 | 91 | Pass. Joins gateway telemetry to a completed issuer comparison and distinguishes the CRO from its platform owner. Covers retries, regulated content, compatibility and unknown billing. Its “possible” multi-model signal rests only on a shared serving remit. |
| [Q](../tests/experiments/sample-q.json) | 19,19,14,14,9,9,5,5 | 94 | Pass. Tests whether accepted comparisons are worth repeating, requires ownership of the model path and gives an explicit incumbent-sufficient stop condition. Controls model and issuer mix and associates trial cost with an accepted comparison. “Rate of growth … unspecified” describes the frozen S4 abstract; the underlying release actually gives a rate. This wording should refer explicitly to the abstract. |

Q ranks three points higher on this specific reviewer’s application of the rubric. Both produce the same primary decision and both scores exceed the default passing threshold. The offline pair cannot establish an average lift, causality or the quality of a real Workers AI endpoint. The baseline 24/100 reflects a different authored candidate passed through lossy historical display logic. Subtracting that score from either of these scores would confound generation with normalization and input changes.

After both scores were recorded, the conditions were unblinded. J received the analyst instructions and fixed target dossier alone. Q additionally received the runtime-retrieved passages from Tessl, Ably and ElevenLabs. The analyst and independent reviewer in this experiment were assistant agents. The production-design model pair requires separate endpoint validation.
