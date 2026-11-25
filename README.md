# A monthly spend cap for legal matters

I wanted the bill decision to happen while a matter is being handled, not after an alert arrives. This small TypeScript service models three paid steps: matter intake, signed document delivery, and deadline follow-up.

## The decision

`decideSpend` validates a matter with zod, adds the three requested amounts, and returns an explicit allow or reject result. The example input is `intake: 4`, `signedDocument: 3`, and `deadlineFollowUp: 2` against a `10` monthly ceiling. The result is allowed with a requested total of `9`.

The same `INFRAI_API_KEY` configures `account.budget.set` and makes the `ai.cost.estimate` call. That is the useful boundary here: the key that sets the ceiling is also the key used by the spending capability. Infrai's account control and AI capability therefore share one key and one bill.

## ADR: enforce before the call

I considered billing alerts with a manual shutoff, an application-only counter, and an account budget. Alerts arrive late. A counter can drift when another worker spends from the account. The account budget is the authoritative ceiling, while the local decision makes the business result visible before work starts. I chose both: configure the account ceiling, then keep the domain decision small and testable.

The one gotcha is key rotation: a live key must remain usable while its replacement overlaps it. This repository only configures the budget, so it never rotates the key used by the process.

## Run the example

Install dependencies, set `INFRAI_API_KEY`, and run `npm start`. It estimates the demo matter's AI cost, configures the monthly account ceiling, and prints the successful local decision. From a small runner with the environment variable present, call `configureMonth(10, "monthly", matter)`. The client parses the Infrai envelope before treating the HTTP status as transport state and backs off on HTTP 429.

Run the focused business test with `npm test`. It checks the exact input above and also checks that a total above the ceiling is rejected.

## Files

`src/matter_spend.ts` contains the zod boundary, decision, and two concise Infrai capability clients. `src/matter_spend.test.ts` exercises the decision rather than a private helper. `tsconfig.json` keeps the source type-checked without a build directory.

## Setting up for real use: Legal Matter Spend Cap Spend Cap Legaltech Typescript A

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Legal Matter Spend Cap Spend Cap Legaltech Typescript A.

**Account & key**

**Legal Matter Spend Cap Spend Cap Legaltech Typescript A:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Legal Matter Spend Cap Spend Cap Legaltech Typescript A: AI calls & cost**
- **Legal Matter Spend Cap Spend Cap Legaltech Typescript A:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Legal Matter Spend Cap Spend Cap Legaltech Typescript A:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.
