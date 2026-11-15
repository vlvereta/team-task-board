# Build report

> **Status: iteration 1 is not finished. The session's usage limit was reached during review round 4.**
>
> - **Done:** the app is live at https://vlvereta.github.io/team-task-board/ (`deployed_at` 2026-11-15T11:55:17Z). Every SPEC.md acceptance item passed in functional review rounds 2 and 3 (34/34). Every issue found in rounds 0–3 is fixed with a regression test (see `docs/REVIEW.md`). CI and deploy are green, and the live smoke test passes.
> - **Not done:**
>   - Functional review round 4, which must find zero functional issues before `ready_at` can be recorded, was stopped unfinished.
>   - `ready_at` has not been recorded.
>   - The measured report below and the README "How this was built" numbers have not been written yet.
> - **Next steps:**
>   1. Re-run one full functional review of the live site.
>   2. Fix anything it finds.
>   3. Record `ready_at` with `node scripts/timeline.mjs mark ready_at`.
>   4. Run `npm run usage-report` and write this report from `docs/metrics/usage.json` and `docs/metrics/pricing.json`.
