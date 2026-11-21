/* Category -> dot color, so topics are scannable without loud badges. */
export function categoryColor(category) {
  const c = String(category || '').toLowerCase();
  if (/(career|interview|job|network)/.test(c)) return '#6366F1';
  if (/(business|sales|leader|work|pitch)/.test(c)) return '#0EA5E9';
  if (/(social|life|personal|story|relation)/.test(c)) return '#F59E0B';
  if (/(tech|science|education)/.test(c)) return '#14B8A6';
  return '#A1A1AA';
}
