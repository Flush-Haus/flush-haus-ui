import { ChipStack } from './Chip';

interface PotProps {
  pot: number;
  sidePots?: number[];
}

export default function Pot({ pot, sidePots }: PotProps) {
  return (
    <div className="pot" aria-label={`Pot ${pot}`}>
      <span className="pot-label">POT</span>
      <ChipStack amount={pot} size={20} />
      {sidePots?.length ? (
        <span className="pot-side">
          {sidePots.map((side, index) => (
            <span className="pot-side-item" key={index}>
              Side {side.toLocaleString('en-US')}
            </span>
          ))}
        </span>
      ) : null}
    </div>
  );
}
