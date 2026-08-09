// @ts-check

function objectOrEmpty(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function nonNegativeInt(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : fallback
}

function levelForXp(levels, totalXp) {
  let current = 0
  for (const level of levels) {
    const levelNumber = nonNegativeInt(level && level.level, 0)
    const requiredXp = nonNegativeInt(level && level.requiredXp, 0)
    if (levelNumber > current && totalXp >= requiredXp) current = levelNumber
  }
  return current
}

/** @type {import('./cloudcode').CloudCodeHandler} */
exports.default = async ({ input, userId, now, services }) => {
  if (!userId) return { ok: false, error: 'USER_REQUIRED' }
  const data = objectOrEmpty(input)
  const passId = typeof data.passId === 'string' ? data.passId : 'season'
  const reason = typeof data.reason === 'string' ? data.reason : 'progress'
  const xpBefore = nonNegativeInt(data.xpBefore, 0)
  const xpGained = nonNegativeInt(data.xpGained, 0)
  const totalXp = xpBefore + xpGained
  const levels = Array.isArray(data.levels) ? data.levels : []
  const previousLevel = levelForXp(levels, xpBefore)
  const currentLevel = levelForXp(levels, totalXp)
  const levelsGained = Math.max(0, currentLevel - previousLevel)
  const claimableLevels = levels.filter((level) => {
    const levelNumber = nonNegativeInt(level && level.level, 0)
    return levelNumber > previousLevel && levelNumber <= currentLevel
  }).map((level) => nonNegativeInt(level && level.level, 0))
  const state = { passId, xp: totalXp, previousLevel, currentLevel, levelsGained, claimableLevels, reason, updatedAt: now }
  services.documents.putAuthoritative('player_readonly', userId, 'battlePass', passId + ':progress', state)
  return { ok: true, passId, xpBefore, xpGained, totalXp, previousLevel, currentLevel, levelsGained, claimableLevels }
}
