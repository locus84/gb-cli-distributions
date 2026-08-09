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
  const shopId = typeof data.shopId === 'string' ? data.shopId : 'event_shop'
  const sku = typeof data.sku === 'string' ? data.sku : 'sku'
  const schedule = objectOrEmpty(data.schedule)
  const nowMs = Date.parse(now)
  const startsAtMs = Date.parse(typeof schedule.startsAt === 'string' ? schedule.startsAt : now)
  const endsAtMs = Date.parse(typeof schedule.endsAt === 'string' ? schedule.endsAt : now)
  if (Number.isFinite(nowMs) && Number.isFinite(startsAtMs) && nowMs < startsAtMs) return { ok: false, error: 'SHOP_NOT_STARTED', shopId }
  if (Number.isFinite(nowMs) && Number.isFinite(endsAtMs) && nowMs >= endsAtMs) return { ok: false, error: 'SHOP_ENDED', shopId }
  const purchase = objectOrEmpty(data.purchase)
  const limit = positiveInt(purchase.limit, 1)
  const purchased = Math.max(0, Math.floor(Number(data.purchased ?? 0) || 0))
  if (purchased >= limit) return { ok: false, error: 'PURCHASE_LIMIT_REACHED', shopId, sku, purchased, limit }
  const source = 'event-shop:' + shopId + ':' + sku
  const rewards = Array.isArray(purchase.rewards) ? purchase.rewards : []
  const price = objectOrEmpty(purchase.price)
  const priceCurrencyId = typeof price.currencyId === 'string' ? price.currencyId : ''
  const priceAmount = positiveInt(price.amount, 0)
  const itemGrants = rewards
    .filter((reward) => reward && reward.type === 'item' && typeof reward.id === 'string')
    .map((reward) => ({ itemId: reward.id, quantity: positiveInt(reward.quantity, 1) }))
  let queuedRewards = 0
  if (priceCurrencyId && priceAmount > 0 && itemGrants.length === rewards.length && itemGrants.length > 0) {
    services.economy.transaction(userId, { spend: { currencies: [{ currencyId: priceCurrencyId, amount: priceAmount }] }, grant: { items: itemGrants }, reason: source })
    queuedRewards = itemGrants.length
  } else {
    for (const reward of rewards) queuedRewards += grantReward(services, userId, source, reward)
  }
  const nextPurchased = purchased + 1
  const state = {
    shopId,
    sku,
    purchased: nextPurchased,
    limit,
    purchasedAt: now,
    spendPreview: price,
    note: priceCurrencyId && priceAmount > 0 ? 'Currency spend and item rewards use economy.transaction.' : 'Preview only: replace with a first-class spend/transaction op before using real event currency.'
  }
  services.documents.putAuthoritative('player_readonly', userId, 'eventShop', shopId + ':' + sku, state)
  return { ok: true, shopId, sku, purchased: nextPurchased, limit, queuedRewards, spendPreview: state.spendPreview }
}
