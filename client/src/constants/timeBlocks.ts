export const TIME_BLOCKS = [
  { key: 'early-morning', label: 'Early AM', hour: 2, icon: '\u{1F319}' },
  { key: 'morning', label: 'Morning', hour: 7, icon: '\u{1F305}' },
  { key: 'midday', label: 'Midday', hour: 11, icon: '\u2600\uFE0F' },
  { key: 'afternoon', label: 'Afternoon', hour: 15, icon: '\u{1F324}\uFE0F' },
  { key: 'evening', label: 'Evening', hour: 19, icon: '\u{1F307}' },
  { key: 'night', label: 'Night', hour: 22, icon: '\u{1F311}' },
] as const;

export function hourToBlock(h: number): string {
  if (h < 5) return 'early-morning';
  if (h < 10) return 'morning';
  if (h < 13) return 'midday';
  if (h < 17) return 'afternoon';
  if (h < 21) return 'evening';
  return 'night';
}
