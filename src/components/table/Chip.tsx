import type { CSSProperties } from 'react';
import { chipColor, formatChips } from '../../utils/chips';

interface ChipProps {
  amount: number;
  size?: number;
}

/** A single pixel-style chip disc, colored by denomination. */
export function Chip({ amount, size = 22 }: ChipProps) {
  const { color, ring } = chipColor(amount);
  const style = {
    '--chip-color': color,
    '--chip-ring': ring,
    '--chip-size': `${size}px`,
  } as CSSProperties & Record<`--${string}`, string>;

  return <span className="chip" style={style} aria-hidden="true" />;
}

interface ChipStackProps {
  amount: number;
  size?: number;
}

/** A short stack of chips plus the amount label — used for bets and the pot. */
export function ChipStack({ amount, size = 22 }: ChipStackProps) {
  const { color, ring } = chipColor(amount);
  const layers = Math.min(4, Math.max(1, Math.round(amount / 200) + 1));
  const style = {
    '--chip-color': color,
    '--chip-ring': ring,
    '--chip-size': `${size}px`,
  } as CSSProperties & Record<`--${string}`, string>;

  return (
    <span className="chip-stack" style={style}>
      <span className="chip-stack-discs" aria-hidden="true">
        {Array.from({ length: layers }, (_, index) => (
          <span className="chip" key={index} style={{ bottom: `${index * 3}px` } as CSSProperties} />
        ))}
      </span>
      <span className="chip-stack-amount">{formatChips(amount)}</span>
    </span>
  );
}
