// @ts-check

function objectOrEmpty(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}
function positiveInt(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}
async function grantReward(services, userId, source, reward) {
  if (!reward || typeof reward !== 'object') return 0;
  if (reward.type === 'currency' && typeof reward.id === 'string') {
    const amount = positiveInt(reward.amount, 0);
    if (amount > 0) {
      await services.economy.addCurrency(userId, reward.id, amount, source);
      return 1;
    }
  }
  if (reward.type === 'item' && typeof reward.id === 'string') {
    await services.economy.grantItem(userId, reward.id, positiveInt(reward.quantity, 1), source);
    return 1;
  }
  return 0;
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
    const calendarId = typeof data.calendarId === 'string' ? data.calendarId : 'daily';
    const claimDay = typeof data.claimDay === 'string' ? data.claimDay : now.slice(0, 10);
    const claimedDays = Array.isArray(data.claimedDays) ? data.claimedDays : [];
    if (claimedDays.includes(claimDay)) return {
      ok: false,
      error: 'ALREADY_CLAIMED',
      calendarId,
      claimDay
    };
    const calendar = Array.isArray(data.calendar) ? data.calendar : [];
    const dayIndex = positiveInt(data.dayIndex, claimedDays.length + 1);
    const dayConfig = calendar.find(day => positiveInt(day && day.day, 0) === dayIndex) || calendar[0] || {};
    const rewards = Array.isArray(dayConfig.rewards) ? dayConfig.rewards : [];
    const source = 'attendance:' + calendarId + ':' + claimDay;
    let rewardCount = 0;
    for (const reward of rewards) rewardCount += await grantReward(tx, userId, source, reward);
    const streak = positiveInt(data.streakBefore, 0) + 1;
    const state = {
      calendarId,
      claimDay,
      dayIndex,
      streak,
      claimedDays: [...claimedDays, claimDay],
      claimedAt: now
    };
    await tx.documents.putAuthoritative('player_readonly', userId, 'attendance', calendarId, state);
    return {
      ok: true,
      calendarId,
      claimDay,
      dayIndex,
      streak,
      rewardCount
    };
  });
};
