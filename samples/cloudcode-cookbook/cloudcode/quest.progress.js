// @ts-check

function objectOrEmpty(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function positiveInt(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback
}

function queueReward(services, userId, questId, reward) {
  if (!reward || typeof reward !== 'object') return 0
  if (typeof reward.currencyId === 'string') {
    const amount = positiveInt(reward.amount, 0)
    if (amount > 0) {
      services.economy.addCurrency(userId, reward.currencyId, amount, 'quest:' + questId)
      return 1
    }
  }
  if (typeof reward.itemId === 'string') {
    services.economy.grantItem(userId, reward.itemId, positiveInt(reward.quantity, 1), 'quest:' + questId)
    return 1
  }
  return 0
}

/** @type {import('./cloudcode').CloudCodeHandler} */
exports.default = async ({ input, userId, now, services }) => {
  if (!userId) return { ok: false, error: 'USER_REQUIRED' }
  const data = objectOrEmpty(input)
  const questId = typeof data.questId === 'string' ? data.questId : 'quest'
  const eventName = typeof data.eventName === 'string' ? data.eventName : 'progress'
  const previousProgress = Math.max(0, positiveInt(data.previousProgress, 0))
  const amount = positiveInt(data.amount, 1)
  const target = positiveInt(data.target, 1)
  const progress = Math.min(target, previousProgress + amount)
  const completed = progress >= target
  const alreadyClaimed = data.alreadyClaimed === true
  const state = { questId, eventName, progress, target, completed, claimed: alreadyClaimed, updatedAt: now }
  services.documents.putAuthoritative('player_readonly', userId, 'quests', questId, state)
  const queuedRewards = completed && !alreadyClaimed ? queueReward(services, userId, questId, data.reward) : 0
  return { ok: true, questId, eventName, progress, target, completed, queuedRewards }
}
