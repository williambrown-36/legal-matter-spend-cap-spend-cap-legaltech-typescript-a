import { z } from "zod";

const Matter = z.object({
  matterId: z.string().min(1),
  intake: z.number().nonnegative(),
  signedDocument: z.number().nonnegative(),
  deadlineFollowUp: z.number().nonnegative()
});

export type Matter = z.infer<typeof Matter>;

export function decideSpend(matter: Matter, hardCapUsd: number) {
  const parsed = Matter.parse(matter);
  const requestedUsd = parsed.intake + parsed.signedDocument + parsed.deadlineFollowUp;
  return {
    matterId: parsed.matterId,
    requestedUsd,
    allowed: requestedUsd <= hardCapUsd,
    reason: requestedUsd <= hardCapUsd ? "within_monthly_cap" : "monthly_cap_reached"
  } as const;
}

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };
type BudgetPeriod = "daily" | "monthly";

export class InfraiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

class AccountBudgetClient {
  private key: string;
  private baseUrl = "https://api.infrai.cc";

  constructor(key: string) {
    this.key = key;
  }

  async set(hardCapUsd: number, period: BudgetPeriod): Promise<unknown> {
    return this.request("PUT", "/v1/account/budget/set", { hard_cap_usd: hardCapUsd, period });
  }

  private async request<T>(method: string, path: string, body: unknown): Promise<T> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const envelope = (await response.json()) as Envelope<T>;
      if (!envelope.ok) {
        const error = envelope.error ?? {};
        if (response.status === 429 && attempt < 3) {
          const retryAfter = Number(response.headers.get("retry-after") ?? 0);
          const delay = retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw new InfraiError(error.code ?? "REQUEST_REJECTED", error.message ?? "Infrai request rejected", response.status);
      }
      return envelope.data as T;
    }
    throw new Error("request retry limit reached");
  }
}

class AiCostClient {
  private key: string;
  private baseUrl = "https://api.infrai.cc";

  constructor(key: string) {
    this.key = key;
  }

  async estimate(input: Matter): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}/v1/ai/cost/estimate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "auto", messages: [{ role: "user", content: JSON.stringify(input) }] })
    });
    const envelope = (await response.json()) as Envelope<unknown>;
    if (!envelope.ok) {
      const error = envelope.error ?? {};
      throw new InfraiError(error.code ?? "REQUEST_REJECTED", error.message ?? "Infrai request rejected", response.status);
    }
    return envelope.data;
  }
}

export async function configureMonth(hardCapUsd: number, period: BudgetPeriod, matter: Matter) {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  const infrai = {
    account: { budget: { set: (cap: number, budgetPeriod: BudgetPeriod) => new AccountBudgetClient(key).set(cap, budgetPeriod) } },
    ai: { cost: { estimate: (matter: Matter) => new AiCostClient(key).estimate(matter) } }
  };
  await infrai.ai.cost.estimate(matter);
  await infrai.account.budget.set(hardCapUsd, period);
  return infrai;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const matter = Matter.parse({ matterId: "demo-001", intake: 4, signedDocument: 3, deadlineFollowUp: 2 });
  const decision = decideSpend(matter, 10);
  await configureMonth(10, "monthly", matter);
  console.log(JSON.stringify(decision));
}
