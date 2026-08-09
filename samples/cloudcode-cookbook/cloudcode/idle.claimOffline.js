// @ts-check

function objectOrEmpty(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function numberOr(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

/** @type {import('./cloudcode').CloudCodeHandler} */
exports.default = async ({ input, userId, now, services }) => {
  if (!userId) return { ok: false, error: 'USER_REQUIRED' }
  const data = objectOrEmpty(input)
  const stateId = typeof data.stateId === 'string' ? data.stateId : 'main'
  const currencyId = typeof data.currencyId === 'string' ? data.currencyId : 'gold'
  const lastSeenAt = typeof data.lastSeenAt === 'string' ? data.lastSeenAt : now
  const lastSeenMs = Date.parse(lastSeenAt)
  const nowMs = Date.parse(now)
  const elapsedSeconds = Number.isFinite(lastSeenMs) && Number.isFinite(nowMs) ? Math.max(0, Math.floor((nowMs - lastSeenMs) / 1000)) : 0
  const capSeconds = Math.max(0, Math.floor(numberOr(data.capSeconds, 3600)))
  const creditedSeconds = Math.min(elapsedSeconds, capSeconds)
  const ratePerSecond = Math.max(0, numberOr(data.ratePerSecond, 0))
  const multipliers = objectOrEmpty(data.multipliers)
  const adMultiplier = Math.max(1, numberOr(multipliers.ad, 1))
  const vipMultiplier = Math.max(1, numberOr(multipliers.vip, 1))
  const multiplier = adMultiplier * vipMultiplier
  const amount = Math.floor(creditedSeconds * ratePerSecond * multiplier)
  if (amount > 0) services.economy.addCurrency(userId, currencyId, amount, 'idle-offline:' + stateId)
  services.documents.putAuthoritative('player_readonly', userId, 'idle', stateId, { stateId, currencyId, lastClaimAt: now, elapsedSeconds, creditedSeconds, multiplier, amount })
  return { ok: true, stateId, currencyId, elapsedSeconds, creditedSeconds, multiplier, amount }
}
