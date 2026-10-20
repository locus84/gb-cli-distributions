// @ts-check

function objectOrEmpty(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}
function positiveInt(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}
function numberOr(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

/** @type {import('./cloudcode').CloudCodeHandler} */
exports.default = async ({
  input,
  userId,
  now,
  services
}) => {
  return await services.transaction(async tx => {
    if (!userId) return {
      ok: false,
      error: 'USER_REQUIRED'
    };
    const data = objectOrEmpty(input);
    const itemInstanceId = typeof data.itemInstanceId === 'string' ? data.itemInstanceId : 'item';
    const upgradeId = typeof data.upgradeId === 'string' ? data.upgradeId : 'enhance';
    const levelBefore = positiveInt(data.levelBefore, 1);
    const maxLevel = positiveInt(data.maxLevel, 10);
    if (levelBefore >= maxLevel) return {
      ok: false,
      error: 'MAX_LEVEL',
      itemInstanceId,
      levelBefore,
      maxLevel
    };
    const successRate = Math.max(0, Math.min(1, numberOr(data.successRate, 0)));
    // The roll is drawn inside the server sandbox and recorded in the state below; never read it from player input.
    const random = Math.random();
    const success = random < successRate;
    const levelAfter = success ? levelBefore + 1 : levelBefore;
    const resultItemId = typeof data.resultItemId === 'string' ? data.resultItemId : itemInstanceId + '+1';
    const compensation = objectOrEmpty(data.failureCompensation);
    const source = 'upgrade:' + upgradeId;
    let rewardCount = 0;
    const currencyCost = objectOrEmpty(data.currencyCost);
    const costCurrencyId = typeof currencyCost.currencyId === 'string' ? currencyCost.currencyId : '';
    const costAmount = positiveInt(currencyCost.amount, 0);
    const materialSpend = Array.isArray(data.materials) ? data.materials.map(material => ({
      itemId: material.id,
      quantity: positiveInt(material.quantity, 1)
    })) : [];
    const spend = {
      items: materialSpend
    };
    if (costCurrencyId && costAmount > 0) spend.currencies = [{
      currencyId: costCurrencyId,
      amount: costAmount
    }];
    if (success) {
      await tx.economy.transaction(userId, {
        spend,
        updateItems: [{
          inventoryItemId: itemInstanceId,
          expectedVersion: positiveInt(data.expectedVersion, 1),
          data: {
            level: levelAfter,
            resultItemId,
            upgradedAt: now
          }
        }],
        reason: source
      });
      rewardCount += 1;
    } else if (typeof compensation.currencyId === 'string') {
      const amount = positiveInt(compensation.amount, 0);
      if (amount > 0) {
        await tx.economy.addCurrency(userId, compensation.currencyId, amount, source + ':fail');
        rewardCount += 1;
      }
    }
    const state = {
      itemInstanceId,
      upgradeId,
      levelBefore,
      levelAfter,
      success,
      random,
      successRate,
      spendPreview: {
        materials: Array.isArray(data.materials) ? data.materials : [],
        currencyCost: costCurrencyId && costAmount > 0 ? {
          currencyId: costCurrencyId,
          amount: costAmount
        } : {}
      },
      enhancedAt: now,
      note: 'Success path uses economy.transaction with material/currency spend and expectedVersion item mutation.'
    };
    await tx.documents.putAuthoritative('player_readonly', userId, 'upgrades', itemInstanceId + ':last', state);
    return {
      ok: true,
      itemInstanceId,
      upgradeId,
      levelBefore,
      levelAfter,
      success,
      rewardCount,
      spendPreview: state.spendPreview
    };
  });
};
