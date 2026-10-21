// @ts-check

// Read-only profile card: one services.readBatch call returns the caller's public profile, their
// rank in the active season of a competition event kind, and game-owned stats. There is no
// transaction and no write, so the call leaves no invocation row behind.

/** @type {import('./cloudcode').CloudCodeHandler} */
exports.default = async ({ input, userId, now, services }) => {
  if (!userId) return { ok: false, error: 'USER_REQUIRED' };
  const data = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const eventKind = typeof data.eventKind === 'string' && data.eventKind ? data.eventKind : 'league.season';
  const [profile, season, stats] = await services.readBatch([
    { service: 'profile', method: 'getPublic', args: [userId] },
    { service: 'leaderboards', method: 'getRankForActiveEvent', args: [eventKind, now, userId] },
    { service: 'gameState', method: 'get', args: ['profile-stats', userId] },
  ]);
  // Each entry succeeds or fails on its own; only the profile is required for a card.
  if (!profile.ok) return { ok: false, error: profile.error.code };
  const active = season.ok && season.value.event ? season.value : null;
  return {
    ok: true,
    profile: profile.value,
    season: active ? {
      rank: active.rank,
      total: active.total,
      topPercent: active.rank !== null && active.total ? Math.ceil((100 * active.rank) / active.total) : null,
    } : null,
    stats: stats.ok && stats.value ? stats.value.data : {},
  };
};
