const BUCKET_COUNT = 16

function bucketFor(value) {
  let hash = 2166136261
  for (const char of value) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return `bucket-${(hash >>> 0) % BUCKET_COUNT}`
}

exports.default = async ({ input, userId, services }) => {
  if (!userId) throw new Error('AUTH_REQUIRED')
  if (typeof input.seasonId !== 'string' || !/^[A-Za-z0-9_.-]{1,64}$/.test(input.seasonId)) throw new Error('INVALID_SEASON')

  const collection = `community:${input.seasonId}`
  const documentId = bucketFor(userId)
  const current = await services.gameState.get(collection, documentId)
  const count = Number(current?.data?.count ?? 0) + 1

  services.gameState.put(collection, documentId, { count }, {
    expectedVersion: current?.version ?? 0,
  })

  return { documentId, count }
}
