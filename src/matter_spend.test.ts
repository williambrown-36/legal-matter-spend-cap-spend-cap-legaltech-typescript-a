import assert from "node:assert/strict";
import { decideSpend } from "./matter_spend.ts";

const matter = { matterId: "lease-17", intake: 4, signedDocument: 3, deadlineFollowUp: 2 };
assert.deepEqual(decideSpend(matter, 10), {
  matterId: "lease-17",
  requestedUsd: 9,
  allowed: true,
  reason: "within_monthly_cap"
});
assert.equal(decideSpend({ ...matter, deadlineFollowUp: 8 }, 10).allowed, false);
console.log("matter spend decision test passed");
