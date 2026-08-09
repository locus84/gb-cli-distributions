// @ts-check

function objectOrEmpty(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function positiveNumber(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : fallback
}

function pickWeighted(entries, random) {
  const totalWeight = entries.reduce((sum, entry) => sum + positiveNumber(entry && entry.weight, 0), 0)
  if (entries.length === 0 || totalWeight <= 0) return null
  let cursor = Math.max(0, Math.min(0.999999, Number(random) || 0)) * totalWeight
  for (const entry of entries) {
    cursor -= positiveNumber(entry && entry.weight, 0)
    if (cursor <= 0) return entry
  }
  return entries[entries.length - 1]
}

function rewardToTransaction(tx, reward) {
  if (!reward || typeof reward !== 'object') return 0
  if (reward.type === 'currency' && typeof reward.id === 'string') {
    const amount = Math.floor(positiveNumber(reward.amount, 0))
    if (amount > 0) { tx.grant.currencies.push({ currencyId: reward.id, amount }); return 1 }
  }
  if (reward.type === 'item' && typeof reward.id === 'string') {
    tx.grant.items.push({ itemId: reward.id, quantity: Math.floor(positiveNumber(reward.quantity, 1)), data: reward.data })
    return 1
  }
  return 0
}

/** @type {import('./cloudcode').CloudCodeHandler} */
exports.default = async ({ input, userId, now, services }) => {
  if (!userId) return { ok: false, error: 'USER_REQUIRED' }
  const data = objectOrEmpty(input)
  const bannerId = typeof data.bannerId === 'string' ? data.bannerId : 'default'
  const entries = Array.isArray(data.entries) ? data.entries : []
  const pityBefore = Math.max(0, Math.floor(positiveNumber(data.pityBefore, 0)))
  const pityThreshold = Math.max(0, Math.floor(positiveNumber(data.pityThreshold, 0)))
  const guaranteed = pityThreshold > 0 && pityBefore + 1 >= pityThreshold
  const guaranteedEntry = entries.find((entry) => entry && entry.guaranteed === true)
  const selected = guaranteed && guaranteedEntry ? guaranteedEntry : pickWeighted(entries, data.random)
  if (!selected) return { ok: false, error: 'NO_ROLL_ENTRIES' }
  const duplicate = selected.owned === true
  const source = 'gacha:' + bannerId
  const rewards = duplicate && selected.duplicateReward ? [selected.duplicateReward] : (Array.isArray(selected.rewards) ? selected.rewards : [])
  const tx = { grant: { currencies: [], items: [] }, reason: source }
  let queuedRewards = 0
  for (const reward of rewards) queuedRewards += rewardToTransaction(tx, reward)
  if (queuedRewards > 0) services.economy.transaction(userId, tx)
  const pityAfter = selected.resetsPity === true || guaranteed ? 0 : pityBefore + 1
  const result = { bannerId, entryId: selected.id || 'entry', rarity: selected.rarity || 'common', duplicate, guaranteed, pityBefore, pityAfter, rewards, rolledAt: now }
  services.events.track(userId, 'gacha_roll', { bannerId, entryId: result.entryId, rarity: result.rarity, duplicate, guaranteed, pityBefore, pityAfter })
  services.documents.putAuthoritative('player_readonly', userId, 'gacha', bannerId + ':last', result)
  return { ok: true, bannerId, selected: result, queuedRewards }
}
