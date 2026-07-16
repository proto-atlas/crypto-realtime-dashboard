export function validateDurationResult(result) {
  if (result.error !== null) {
    return { ok: false, reason: result.error };
  }

  if (result.closedEarly) {
    return { ok: false, reason: "closed_before_observation_completed" };
  }

  if (result.messageCount === 0) {
    return { ok: false, reason: "no_market_message" };
  }

  return { ok: true, reason: null };
}
