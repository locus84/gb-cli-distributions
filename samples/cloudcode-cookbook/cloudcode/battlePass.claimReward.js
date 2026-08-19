// @ts-check

function objectOrEmpty(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function positiveInt(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback
}

function grantReward(services, userId, source, reward) {
  if (!reward || typeof reward !== 'object') return 0
  if (reward.type === 'currency' && typeof reward.id === 'string') {
    const amount = positiveInt(reward.amount, 0)
    if (amount > 0) { services.economy.addCurrency(userId, reward.id, amount, source); return 1 }
  }
  if (reward.type === 'item' && typeof reward.id === 'string') {
    services.economy.grantItem(userId, reward.id, positiveInt(reward.quantity, 1), source)
    return 1
  }
  return 0
}

/** @type {import('./cloudcode').CloudCodeHandler} */
exports.default = async ({ input, userId, now, services }) => {
  if (!userId) return { ok: false, error: 'USER_REQUIRED' }
  const data = objectOrEmpty(input)
  const passId = typeof data.passId === 'string' ? data.passId : 'season'
  const track = data.track === 'premium' ? 'premium' : 'free'
  const entitlementId = typeof data.entitlementId === 'string' ? data.entitlementId : passId + ':premium'
  if (track === 'premium' && !(await services.iap.hasEntitlement(userId, entitlementId)).ok) return { ok: false, error: 'PREMIUM_REQUIRED', passId, track }
  const level = positiveInt(data.level, 1)
  const currentLevel = positiveInt(data.currentLevel, 0)
  if (currentLevel < level) return { ok: false, error: 'LEVEL_LOCKED', passId, track, level, currentLevel }
  const claimKey = passId + ':' + track + ':' + level
  const claimedRewardKeys = Array.isArray(data.claimedRewardKeys) ? data.claimedRewardKeys : []
  if (claimedRewardKeys.includes(claimKey)) return { ok: false, error: 'ALREADY_CLAIMED', claimKey }
  const rewardsByTrack = objectOrEmpty(data.rewardsByTrack)
  const trackRewards = objectOrEmpty(rewardsByTrack[track])
  const rewards = Array.isArray(trackRewards[String(level)]) ? trackRewards[String(level)] : []
  const source = 'battle-pass:' + claimKey
  let queuedRewards = 0
  for (const reward of rewards) queuedRewards += grantReward(services, userId, source, reward)
  const state = { passId, track, level, claimKey, claimedRewardKeys: [...claimedRewardKeys, claimKey], claimedAt: now }
  services.documents.putAuthoritative('player_readonly', userId, 'battlePass', passId + ':claims', state)
  return { ok: true, passId, track, level, claimKey, queuedRewards }
}
