// @ts-check

function objectOrEmpty(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function positiveInt(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback
}

function hasMaterials(inventory, materials) {
  return materials.every((material) => {
    const id = material && typeof material.id === 'string' ? material.id : ''
    const need = positiveInt(material && material.quantity, 0)
    return id && need > 0 && positiveInt(inventory[id], 0) >= need
  })
}

/** @type {import('./cloudcode').CloudCodeHandler} */
exports.default = async ({ input, userId, now, services }) => {
  if (!userId) return { ok: false, error: 'USER_REQUIRED' }
  const data = objectOrEmpty(input)
  const recipe = objectOrEmpty(data.recipe)
  const recipeId = typeof recipe.id === 'string' ? recipe.id : 'recipe'
  const materials = Array.isArray(recipe.materials) ? recipe.materials : []
  const inventory = objectOrEmpty(data.inventory)
  if (!hasMaterials(inventory, materials)) return { ok: false, error: 'INSUFFICIENT_MATERIALS', recipeId }
  const result = objectOrEmpty(recipe.result)
  const itemId = typeof result.itemId === 'string' ? result.itemId : 'crafted_item'
  const quantity = positiveInt(result.quantity, 1)
  const currencyCost = objectOrEmpty(recipe.currencyCost)
  const costCurrencyId = typeof currencyCost.currencyId === 'string' ? currencyCost.currencyId : ''
  const costAmount = positiveInt(currencyCost.amount, 0)
  const spend = { items: materials.map((material) => ({ itemId: material.id, quantity: positiveInt(material.quantity, 1) })) }
  if (costCurrencyId && costAmount > 0) spend.currencies = [{ currencyId: costCurrencyId, amount: costAmount }]
  services.economy.transaction(userId, { spend, grant: { items: [{ itemId, quantity }] }, reason: 'crafting:' + recipeId })
  const craftRecord = {
    recipeId,
    itemId,
    quantity,
    craftedAt: now,
    spendPreview: { materials: materials.map((material) => ({ id: material.id, quantity: positiveInt(material.quantity, 1) })), currencyCost: costCurrencyId && costAmount > 0 ? { currencyId: costCurrencyId, amount: costAmount } : null },
    note: 'Uses economy.transaction so materials/currency spend and crafted item grant are atomic.'
  }
  services.documents.putAuthoritative('player_readonly', userId, 'crafting', recipeId + ':last', craftRecord)
  return { ok: true, recipeId, itemId, quantity, spendPreview: craftRecord.spendPreview, queuedRewards: 1 }
}
