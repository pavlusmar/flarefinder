# FlareFinder pipeline audit

Baseline commit `549f80b`. Follow one account from the territory table through the browser rather than evaluating the model prompt in isolation.

| Boundary | Observed behaviour | Consequence |
|---|---|---|
| Select → queue | Individual, selected and scheduled routes change D1 status. Queue messages carry a company ID. An update conditioned on pending/queued claims the job. | The browser can return before work completes. Previously one delivery did collection, analysis, qualification, scoring and final write. |
| Plan → retrieve | Despite a comment saying six, 13 initial advanced Tavily queries run, followed by up to six adaptive queries. The primary input is title/URL/excerpt, with employer and host filtering. | Index position, host quotas and duplicate URL order affect evidence coverage. Syndicated sources on different domains can still repeat the same claim. |
| Sources → dossier | Official technical pages and job posts receive preferential slots. Prior sources merge ahead of fresh sources for accounts other than 9fin. | Results can depend on prior runs. The original 9fin exception complicates controlled comparisons. |
| References → reasoning | Only partial entries are eligible. Ranking counts shared tokens. Prompt receives name, model, logic and provisional status. | Pending entries never participate and the analyst cannot inspect supporting facts, alternative explanations or complete opportunity logic. |
| Analyst → normalized report | Exact bracket regexes run in normalizeReport and analyze. Fields are length-limited, arrays sliced, and priorities, hires, signals and stakeholders also pass through independent filters. | Changing citation punctuation can remove a whole hypothesis or corroborating signal before finalization. Multiple filters make post-hoc investigation difficult. |
| Finalize → persist | finalizeEvidenceReport requires citations in both evidence and signal plus nonempty implication, product fit and limitations. The main research row is updated in place. Source zero holds pursuit, customer perspective and stakeholder metadata. | Formatting, a missing secondary field and an invented source can have the same external result. Prior model versions are unavailable from the row. |
| Read → browser | replaySavedResearch revalidates opportunities. Browser detail mutates PolyAI separately, groups by pillar and rechecks bracket citations. The overview shows at most two items per pillar. | An evaluator reading only raw model output can grade a different report. A stored brief can change without a new model call. |
| Score → display | Clef qualification and pursuit calls occur separately. Browser derives IGNITE potential and readiness from saved data and displays illustrative TAS. | An independent quality grade must carry separate fields and labels. |

## Minimal reproduction on the baseline

Given one legitimate source, an otherwise identical opportunity with signal and evidence `[S1]` survives `finalizeEvidenceReport`. Replacing both with `(S1)` removes it. With multiple sources, `(S1, S2)` likewise fails. This result concerns punctuation only. A reference to `S99` in a one-source dossier is a separate evidence error.
