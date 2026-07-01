// Casino chip denomination colors, picked by the magnitude of the amount so a
// bet renders with a believable top-chip color.
const CHIP_TIERS: { max: number; color: string; ring: string }[] = [
  { max: 5, color: '#e9e3d2', ring: '#b8b09a' }, // white
  { max: 25, color: '#c0392b', ring: '#7e2118' }, // red
  { max: 100, color: '#1f9d55', ring: '#0e5b30' }, // green
  { max: 500, color: '#15171d', ring: '#3a3f4a' }, // black
  { max: 1000, color: '#7b3fa0', ring: '#4a2462' }, // purple
  { max: Infinity, color: '#e0a82e', ring: '#9a6f12' }, // gold
];

export function chipColor(amount: number) {
  return CHIP_TIERS.find((tier) => amount <= tier.max) ?? CHIP_TIERS[CHIP_TIERS.length - 1];
}

export function formatChips(amount: number) {
  return amount.toLocaleString('en-US');
}
