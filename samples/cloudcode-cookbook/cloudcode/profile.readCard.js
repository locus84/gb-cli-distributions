// @ts-check

// Read-only profile card: one services.readBatch call returns the caller's public profile, their
// rank in the current season of a leaderboard (by board key), and game-owned stats. There is no
// transaction and no write, so the call leaves no invocation row behind.

/** @type {import('./cloudcode').CloudCodeHandler} */
exports.default = async ({ input, userId, services }) => {
  if (!userId) return { ok: false, error: 'USER_REQUIRED' };
  const data = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const leaderboardKey = typeof data.leaderboardKey === 'string' && data.leaderboardKey ? data.leaderboardKey : 'league.season';
  const [profile, season, stats] = await services.readBatch([
    { service: 'profile', method: 'getPublic', args: [userId] },
    { service: 'leaderboards', method: 'getRank', args: [leaderboardKey, userId] },
    { service: 'gameState', method: 'get', args: ['profile-stats', userId] },
  ]);
  // Each entry succeeds or fails on its own (a board without a current season is NOT_FOUND);
  // only the profile is required for a card.
  if (!profile.ok) return { ok: false, error: profile.error.code };
  const ranked = season.ok && season.value && typeof season.value.rank === 'number' ? season.value : null;
  return {
    ok: true,
    profile: profile.value,
    season: ranked ? {
      rank: ranked.rank,
      total: ranked.total,
      topPercent: ranked.total ? Math.ceil((100 * ranked.rank) / ranked.total) : null,
    } : null,
    stats: stats.ok && stats.value ? stats.value.data : {},
  };
};
