# Cost and runtime

Rates checked November 26, 2026. Estimates below use USD list prices before allowances. The local test runs used mocked bindings and incurred zero Workers AI or Tavily calls. Research for the ten reference plans and the supplementary blind experiment used the assistant environment. Provider billing and token counts for those activities were unavailable.

| Stage | Model or service | Example input / output tokens | Illustrative cost |
|---|---|---:|---:|
| Adaptive search planner | Llama 3.1 8B FP8 Fast, $0.045 / $0.384 per million input / output tokens | 10,000 / 400 | $0.00060 |
| Strategic analysis | GPT-OSS 120B, $0.35 / $0.75 per million | 32,000 / 5,000 | $0.01495 |
| Independent evaluation | Qwen 3.8 27B, $0.45 / $3.20 per million | 38,000 / 2,000 | $0.02350 |
| One revision and its review | Same pair with additional feedback and prior draft | 38,000 / 5,000 and 38,000 / 2,000 | $0.04055 |
| Clef Flash classification and pursuit scoring | $0.038 per million input tokens | 20,000 combined | $0.00076 |

At these assumed lengths the first model pass is approximately $0.040 fresh or $0.039 on saved evidence. Two review-and-revision rounds add about $0.081. A fresh-only evidence supplement can add another review. Actual reasoning output, retries, model settings and prompt size affect cost. Version history captures provider-reported token usage and elapsed milliseconds for analyst and evaluator calls when available. Missing token information is stored as null. Planner and Clef token consumption in this table is scenario-only.

Collection runs seven advanced searches and up to six advanced follow-ups, one basic extraction batch of up to eight URLs, and at most one evaluator-led basic gap search on the normal path. At $0.008 per credit, the full 13 advanced searches alone cost $0.208 pay-as-you-go. Budget up to two additional credits for the initial extraction batch and one for the gap search, approximately $0.232 total search/extraction before retry costs. A full fresh first pass with all those operations and one extra review would be about $0.30 under these assumptions. A saved-evidence replay performs zero searches and zero extractions. Provider retries following interrupted stages can repeat a charged call. D1, Queue, Worker and storage charges are excluded.

The analyst's documented context limit is 128,000 tokens. The evaluator's is 262,144. Each queue delivery advances one persisted stage. A Cloudflare queue consumer has a 15-minute wall-clock limit. Initial collection parallelizes bounded queries; larger report cycles span deliveries. The process uses IDs in queue messages, persisting the dossier and versions in D1. Model latency, billing, structured-output yield, quota exhaustion, D1 size at scale and live end-to-end time still require staging measurements. The sub-second local fixture suite excludes model inference and network latency.

[Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/) · [GPT-OSS model](https://developers.cloudflare.com/workers-ai/models/gpt-oss-120b/) · [Qwen model](https://developers.cloudflare.com/workers-ai/models/qwen3.8-27b/) · [Tavily credits](https://docs.tavily.com/documentation/api-credits) · [Queue limits](https://developers.cloudflare.com/queues/platform/limits/)
