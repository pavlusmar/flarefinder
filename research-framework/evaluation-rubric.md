# Independent review of the displayed account analysis

The evaluator reads the same frozen company dossier, methodology and selected reference excerpts as the analyst. It receives the normalized report that the application will show, plus blocking integrity failures. Reference accounts illustrate analytical methods. The target's own dossier supplies the facts. The evaluator never gets a target score to reproduce or an expected number of opportunities.

| Dimension | Points | What earns credit |
| --- | ---: | --- |
| Strategic understanding | 20 | Explains the ambition, competitive mechanism and priorities in this company’s terms. |
| Strategy to technology | 20 | Traces priorities to action and workload requirements. Identifies who owns the workload and which implementation facts remain open. |
| Business model and market | 15 | Explains who pays, why and how the service competes. Separates reported financials from assumptions. |
| Technology to commercial value | 15 | Tests incremental value against incumbents, identifies a measurable result, or justifies leaving an opportunity empty. |
| Evidence accuracy and coverage | 10 | Matches claims to source, recency and status. Uses material contrary evidence and independently identifies omissions. |
| Commercial timing | 10 | Distinguishes company momentum, a decision window and buying intent. A well-supported decision to wait earns credit. |
| Counterarguments and limitations | 5 | Explains competing approaches, ownership boundaries and the conditions that would invalidate the thesis. |
| Stakeholders and discovery | 5 | Identifies the right role or verified person and asks a question with a discriminating answer. |

Score the customer understanding demonstrated, given the available evidence. An empty opportunity list can pass. A source naming a product, a high IGNITE score, a longer report or a confident tone adds no points by itself.

Reject on a material fabrication, source misrepresentation, incorrect business model, inappropriate product, invented buying intent, ignored contradictory evidence, absent strategic linkage across material recommendations, unexplained removal of significant evidence, historical technology treated as current, or recommendations interchangeable across accounts. An integrity failure can veto a score of 100.

The result records integer dimension scores, critical failures and findings on missed evidence, unsupported claims, weak reasoning, missing links, technical errors, overlooked hypotheses, downgrades, required revisions and follow-up research. The application calculates the sum and the pass decision itself. Incomplete data, an evaluator outage, and identical analyst/evaluator model IDs produce an unevaluated result with a null score. Findings and concise rationales suffice for review.

The default passing mark is 85 and the default revision budget is two. Revisions reuse the previous report, feedback and original evidence. Stop at the first passing result or the budget. When no version passes, prefer a reviewed report without known critical failures, then the highest score within that class. Keep the earlier result when tied. A report with unresolved critical failures must carry its warning when displayed. Report scoring is independent of commercial attractiveness, buying readiness and spend.

## Model choice and limitations

The configured Qwen3.8 27B reviewer comes from a different model family than the GPT-OSS 120B analyst. Cloudflare documents a 262,144-token context window for Qwen, low reasoning effort and a response-format field. The suggested Qwen3 30B model page gives a November 20, 2026 deprecation date. Cloudflare's JSON-mode guide describes schema support and possible generation failures. Actual JSON adherence and semantic quality still require a real endpoint run. The application validates output rather than trusting a score emitted by the reviewer. [Qwen3.8 27B](https://developers.cloudflare.com/workers-ai/models/qwen3.8-27b/) · [Qwen3 30B](https://developers.cloudflare.com/workers-ai/models/qwen3-30b-a3b-fp8/) · [JSON mode](https://developers.cloudflare.com/workers-ai/features/json-mode/) · [GPT-OSS 120B](https://developers.cloudflare.com/workers-ai/models/gpt-oss-120b/)

## Offline experiments

The independent reviewer verdicts, limitations and instructions for a credentialed repeat appear in [evaluation-experiments.md](evaluation-experiments.md).
