import assert from "node:assert/strict";
import test from "node:test";

import { validateDurationResult } from "./websocket-duration-validation.mjs";

test("観測中に市場データを受信し続けた結果を成功と判定する", () => {
  assert.deepEqual(
    validateDurationResult({ error: null, closedEarly: false, messageCount: 10 }),
    { ok: true, reason: null },
  );
});

test("観測終了前の切断を失敗と判定する", () => {
  assert.deepEqual(
    validateDurationResult({ error: null, closedEarly: true, messageCount: 10 }),
    { ok: false, reason: "closed_before_observation_completed" },
  );
});

test("市場データを受信しなかった結果を失敗と判定する", () => {
  assert.deepEqual(
    validateDurationResult({ error: null, closedEarly: false, messageCount: 0 }),
    { ok: false, reason: "no_market_message" },
  );
});

test("WebSocketエラーを失敗理由として返す", () => {
  assert.deepEqual(
    validateDurationResult({ error: "websocket_error", closedEarly: false, messageCount: 0 }),
    { ok: false, reason: "websocket_error" },
  );
});
