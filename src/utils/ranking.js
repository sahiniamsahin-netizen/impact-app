export function calculateScore(post) {
  const impact = post.impact || 0;
  const age = Date.now() - (post.createdAt || 0);

  const freshness = Math.exp(-age / 10000000);

  return impact + freshness;
}