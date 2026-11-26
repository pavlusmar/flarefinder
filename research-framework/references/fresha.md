# Fresha | Strategic account reference

Evidence checked 2026-11-26. Opportunities are analyst hypotheses.

## A. Executive account assessment

Prioritise a discussion with the Partner Network product team. On 19 November Fresha brought its marketplace inventory to additional search and AI surfaces. A prospective client can look for a service in Claude and complete the booking on Fresha. The junction between discovery, accurate availability and confirmation now matters to a merchant's acquisition economics. That makes a better opening than an attack-volume estimate. Fresha itself reports substantial referral growth, but a session containing a booking event is a different measure from an attended, fee-eligible appointment. Ask which step actually loses clients. [S1][S2][S3]

This is an established operating platform expanding how merchants acquire clients. Embedded capital and the KKR financing indicate resources and a broader commercial ambition. The account risk is equally clear: Fresha already operates transaction infrastructure and uses outside suppliers. Only an incremental, measurable improvement warrants a platform change. [S6][S7][S8][S9]

## B. Business model and commercial economics

A salon, professional or multi-site operator pays for tools that run its calendar, client relationships and business. Subscriptions can rise with bookable team members and optional products can add location-level recurring revenue. The consumer marketplace has a different meter: a fee for introducing an eligible new client. A returning client can deepen retention without generating another introduction fee. A switch from a direct to an external discovery channel may change fee attribution even if total appointments stay constant. [S1][S3][S4]

Payments and capital deepen the relationship with merchants. Adyen's reported lending volume is capital issued to merchants, not revenue to Fresha. Market-level pricing varies. Current revenue, margin and mix across subscriptions, referrals, payments and AI were not established. Likely cost drivers include transaction processing, partner support, infrastructure and metered model or telephony use. These are economic exposures, not reported expense shares. Booking success and cost per attended appointment provide a closer business link than requests handled. [S3][S4][S5][S6][S8]

## C. Market dynamics and competitive positioning

An operator choosing where to list a salon weighs access to new customers against fees and control of repeat relationships. Fresha can distribute the same merchant profile across search, AI and its own marketplace, lowering a salon's integration effort. Inventory freshness and credible attribution make this distribution valuable. Local directories, direct booking links and general search compete for the discovery occasion. A merchant who sees a questionable first-client fee has reason to route future customers elsewhere. [S1][S2][S3]

Timing favours experimentation while discovery habits change. Execution requires product and commercial teams to make third-party journeys work. Differentiation comes from bookable local supply and merchant workflows. Funding extends execution capacity, while monetisation depends on what happens after discovery. These are distinct startup success factors: paid traffic growth alone establishes none of the unit economics. [S1][S4][S7]

## D. Customer strategy and strategic priorities

**Extend discovery beyond owned channels — stated.** The Partner Network makes listings available across external surfaces without separate merchant setup. Fresha named a future distribution partner. The execution risk is showing plausible but stale information or mishandling the handoff. Measure progression through the actual channel, territory and service mix. [S1][S2]

**Make acquired demand valuable to merchants — inferred.** The fee rules distinguish returning customers and explain when a cancelled booking changes the fee. Fresha plans to simplify attribution from January 2027. Channel attribution and accurate customer matching must survive the integration. Count complaints and corrected charges alongside conversion. [S3]

**Capture missed enquiries and deepen merchant adoption — stated.** Concierge can handle enquiries against customer and service context. An interaction only delivers value if the merchant gains a useful booking or saves staff time. An erroneous confirmation can cost time and trust. Financing adds a separate adoption path for merchants with working capital needs. [S4][S5][S6]

## E. Execution initiatives and technical strategy

The monetisable handoff varies by channel. Claude's guide directs booking and payment to Fresha; the Partner Network release describes a different Google journey. Test and instrument each channel independently. Do not infer that a crawler fetch, availability lookup and booking write share one endpoint, identity or data policy. A service listing photo tolerates distribution differently from a live slot or a customer-specific fee calculation. [S1][S2][S3]

One concrete architecture exists for transactional analytics: EKS hosts Fluss with S3 storage, and Flink enriches commerce events. That is evidence of an operating investment in transaction data, not a map of the public API or the booking system of record. Datadog is declared for logging and tracing. Ask for existing partner dashboards and incident ownership before introducing another telemetry layer. [S8][S9]

## F. Cloudflare commercial opportunity analysis

**Primary — Protect partner access.** External discovery is expanding, so legitimate machine clients can generate fee-bearing appointments. With the marketplace owner, identify one partner-facing path and compare current admission decisions against a shadow classification using Cloudflare bot signals where eligible. Join requests to partner-verified identity and downstream outcomes. A verified-bot flag is not a substitute for partner authentication. Distinguish public crawlers, authenticated partner services and ordinary customers. Compare partner success, conversion and merchant complaints against the incumbent. Do not enforce a rule until exceptions and false positives are understood. Confidence is medium in relevance and low in need for a vendor. [S1][S2][S3][S8][S10]

**Adjacent — Connect public listing assets.** If mobile discovery stalls on images or public static assets, compare cacheable traffic against the origin's present delivery. Check geographies, asset sizes, permissions and refresh rules. Exclude live inventory, private responses, customer records and checkout. Measure load time and progression to availability lookup, with expired or wrong-market content as a failure condition. Current CDN and baseline performance remain unknown. [S1][S11]

**Longer term — Build.** A model-request gateway could help if Concierge has multiple directly operated compatible providers and a monitoring gap. Compare against Datadog and existing provider telemetry before a pilot. No case is established for replacing transaction storage, booking writes, payments infrastructure or credit underwriting. [S5][S6][S8][S9][S12]

## G. AI opportunity analysis

There are two businesses behind the word AI. Claude and ChatGPT can send customers to Fresha. The assistant provider's inference spend is outside this sale. Fresha's Concierge, by contrast, is a paid product that responds for a merchant. Model latency, errors and cost per resolved enquiry could affect adoption and margin. A provider list does not prove which model handles Concierge, whether voice traverses a compatible endpoint or who selects routing. [S1][S2][S4][S5][S8]

For a metadata-only pilot ask who controls the request path, what measures model cost today, which contact details could reach logs and which regions must process them. Compare redacted latency and failure measurements with the existing stack. Training, model serving, storage and application-level booking permissions are outside a request-management experiment. [S8][S12]

## H. Commercial timing and buying readiness

The November launch is a current commercial trigger. The January fee change gives a second, dated reason to ask about measurement integrity. Neither event identifies a vendor review. Concierge and Adyen Capital are operating products. Treat their launch dates as delivery milestones. No evidence establishes security failures, a capacity crisis, budget ownership or dissatisfaction. Revisit after channel-level baselines exist or a team identifies a problem it owns. [S1][S3][S5][S6]

## I. Stakeholder map

Start with **Michaela Peicheva**, senior product manager quoted on the Partner Network launch, for channel outcomes and referral to the integration owner. **William Zeqiri**, founder and CEO, supplies strategic context and is a possible sponsor if the commercial impact crosses product lines. Seek the marketplace integration engineer for path ownership, merchant support for fee disputes and the data protection owner for any Concierge trial. Names for those roles were not verified. [S1][S7][S8]

## J. Account engagement strategy

Suggested opening: “Michaela, you’ve made a salon’s live availability discoverable outside Fresha. As the network expands, how do you tell the difference between a partner that sends useful demand and one whose journey breaks before a client reaches a bookable slot? I’d like to compare one partner path with your existing measurements.” [S1][S2]

1. Which partners deliver confirmed or attended first bookings, and which stop at discovery?
2. How do you join a partner lookup to fee eligibility without introducing duplicate attribution?
3. Where is freshness guaranteed, and which parts can safely tolerate stale data?
4. Which authorised automated clients are distinguishable at the edge today?
5. What additional insight would change an engineering or partner decision?

Bring an SE in once the product owner supplies one route, baseline and owner. Compare observation over equivalent traffic periods; use no customer payloads in the exercise. Agree in advance what incremental reduction in errors or attribution disputes would justify switching. Expand only if another channel shares the demonstrated constraint.

## K. Addressable spend

Ask for partner requests by route, successful lookups, attributable first visits, current proxy/CDN fees and data transfer, cacheable bytes, existing vendor minimums and peak load. Model the delivery opportunity on eligible, contractually movable traffic. For Concierge, collect controllable model requests and telemetry costs separately. For value, multiply incremental completed eligible introductions by net fee after adjustments. Do not apply a fee to all 35 million appointments or multiply referral growth by model inference rates. No verified Cloudflare spend or approved budget was located. [S1][S3][S4][S6]

## L. Evidence ledger and analytical limitations

- No measured bottleneck, Cloudflare incumbent status, current vendor review, budget or infrastructure invoices were found.
- AI referral sessions and appointments have different denominators. Source figures do not establish paid acquisition or successful attendance.
- Partner publications and company materials describe their own launches. Supplier names establish a relationship but cannot attribute a particular feature or path.
- The pricing page localises currency and calling availability. Validate the merchant's country and contract before modelling unit economics.

- **[S1] Fresha Partner Network launch** (2026-11-19). Search and AI integrations distribute merchant profiles and availability. Fresha reported over 151,000 monthly ChatGPT-referred sessions and named senior product manager Michaela Peicheva. Alexa was planned for early 2027. Supports distribution, stakeholder and timing. Company announcement, self-reported scale. [Source](https://www.fresha.com/blog/fresha-partner-network-ai-search-booking-integrations)
- **[S2] Using Fresha with Claude** (undated). Claude performs discovery using criteria and location while booking, payment and account functions take place on Fresha. Supports integration boundary and handoff. First-party operational documentation. [Source](https://www.fresha.com/help-center/knowledge-base/knowledge-base-category/102129-using-fresha-with-claude)
- **[S3] Marketplace new client fee** (undated). First-client fees depend on channel and prior merchant-client relationship. Fees can move after a cancellation. A January 2027 rule change is planned. Supports revenue attribution and outcome. First-party operational documentation. [Source](https://www.fresha.com/help-center/knowledge-base/billing-and-fees/101357-about-the-marketplace-new-client-fee)
- **[S4] Fresha pricing** (undated). Merchant subscriptions scale with bookable staff. Optional Concierge is sold per location with market-dependent calling availability. Supports recurring revenue and AI monetisation. First-party operational documentation. [Source](https://www.fresha.com/pricing)
- **[S5] Introducing AI Concierge** (2026-05-18). The product connects two-way enquiries to client profiles to help salons capture demand and appointments. Supports paid AI workload. Company product launch. [Source](https://www.fresha.com/blog/fresha-ai-concierge-launch)
- **[S6] Adyen and Fresha expand embedded finance** (2026-02-03). Adyen reported capital availability across seven countries, over $5.5 million issued to merchants and more than 35 million appointments monthly across the platform. Supports finance boundary and context. Partner announcement, shared commercial interest. [Source](https://www.adyen.com/press-and-media/adyen-fresha-embedded-finance-capital-launch)
- **[S7] Fresha at $1B** (2026-06-03). Existing investor BECO reported an $80 million KKR primary investment at a valuation above $1 billion. It identified William Zeqiri as founder and CEO. Supports execution capacity, leadership. Investor account, interested party. [Source](https://www.becocapital.com/fresha-at-1b-defining-product-led-growth/)
- **[S8] Subprocessor list** (undated). Fresha lists AWS, Datadog, payment processors, OpenAI, Anthropic and Google, with distinct indicated purposes. Supports existing suppliers and limits on feature attribution. Company legal disclosure. [Source](https://terms.fresha.com/sub-processors)
- **[S9] Fresha transactional data serving case** (undated). Fresha describes running Fluss on EKS with S3, using Flink to enrich appointment events. Supports deployed analytics boundary. Project-hosted customer account. [Source](https://fluss.incubator.apache.org/user-stories/fresha/)
- **[S10] Bot Management fields** (2026-09-16). Rules can use a bot score and an independently maintained verified-bot classification. Supports Protect feasibility. Cloudflare technical documentation. [Source](https://developers.cloudflare.com/bots/reference/bot-management-variables/)
- **[S11] Default cache behavior** (2026-09-14). Origin privacy directives, cookies, method and object characteristics affect default caching. Supports public content delivery boundary. Cloudflare technical documentation. [Source](https://developers.cloudflare.com/cache/concepts/default-cache-behavior/)
- **[S12] AI Gateway logging** (2026-11-25). Request metadata can include provider, latency and cost. Logging configuration and retention matter because payloads can contain prompts and responses. Supports conditional AI observation. Cloudflare technical documentation. [Source](https://developers.cloudflare.com/ai-gateway/observability/logging/)
