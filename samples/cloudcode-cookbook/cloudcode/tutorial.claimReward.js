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
  const tutorialId = typeof data.tutorialId === 'string' ? data.tutorialId : 'main'
  const stepId = typeof data.stepId === 'string' ? data.stepId : 'step'
  const claimKey = tutorialId + ':' + stepId
  const completedSteps = Array.isArray(data.completedSteps) ? data.completedSteps : []
  if (!completedSteps.includes(stepId)) return { ok: false, error: 'STEP_NOT_COMPLETED', tutorialId, stepId }
  const claimedSteps = Array.isArray(data.claimedSteps) ? data.claimedSteps : []
  if (claimedSteps.includes(stepId)) return { ok: false, error: 'ALREADY_CLAIMED', tutorialId, stepId }
  const rewards = Array.isArray(data.rewards) ? data.rewards : []
  const source = 'tutorial:' + claimKey
  let queuedRewards = 0
  for (const reward of rewards) queuedRewards += grantReward(services, userId, source, reward)
  const state = { tutorialId, stepId, claimedSteps: [...claimedSteps, stepId], claimedAt: now }
  services.documents.putAuthoritative('player_readonly', userId, 'tutorial', tutorialId + ':claims', state)
  return { ok: true, tutorialId, stepId, claimKey, queuedRewards }
}
