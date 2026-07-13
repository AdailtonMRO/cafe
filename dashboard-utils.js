export function buildConsumerRanking(participations, currentUserId, currentUserName) {
  const totals = new Map();

  participations.forEach((participation) => {
    const current = totals.get(participation.userId) || { userId: participation.userId, totalKg: 0, totalSpent: 0 };
    current.totalKg += Number(participation.quantityKg || 0);
    current.totalSpent += Number(participation.valueTotal || 0);
    totals.set(participation.userId, current);
  });

  const rankings = Array.from(totals.values()).map((entry) => ({
    userId: entry.userId,
    totalKg: Number(entry.totalKg.toFixed(2)),
    totalSpent: Number(entry.totalSpent.toFixed(2)),
    displayName: entry.userId === currentUserId ? currentUserName || 'Você' : `Consumidor ${entry.userId.slice(-1)}`,
  }));

  return rankings.sort((a, b) => b.totalKg - a.totalKg);
}
