import { useEffect, useState } from 'react';
import type { HeroOptions } from '../../types/poker';
import { formatChips } from '../../utils/chips';

export interface ActionBarActions {
  fold: () => void;
  check: () => void;
  call: () => void;
  bet: (amount: number) => void;
  raise: (raiseToAmount: number) => void;
  allIn: () => void;
}

interface ActionBarProps {
  options: HeroOptions;
  actions: ActionBarActions;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export default function ActionBar({ options, actions }: ActionBarProps) {
  const { canCheck, toCall, minRaise, maxRaise, pot } = options;
  const [raise, setRaise] = useState(minRaise);

  // Reset the proposed raise whenever the turn's limits change.
  useEffect(() => {
    setRaise(clamp(minRaise, minRaise, maxRaise));
  }, [minRaise, maxRaise]);

  const quick: { label: string; value: number }[] = [
    { label: 'Min', value: minRaise },
    { label: '½ Pote', value: clamp(Math.round(pot / 2), minRaise, maxRaise) },
    { label: 'Pote', value: clamp(pot, minRaise, maxRaise) },
    { label: 'All-in', value: maxRaise },
  ];

  const isAllIn = raise >= maxRaise;
  const raiseLabel = isAllIn ? 'All-in' : toCall === 0 ? 'Apostar' : 'Aumentar';

  const handleRaise = () => {
    if (isAllIn) {
      actions.allIn();
    } else if (toCall === 0) {
      actions.bet(raise);
    } else {
      actions.raise(raise);
    }
  };

  const canRaise = maxRaise > toCall;

  return (
    <div className="action-bar" role="group" aria-label="Suas ações">
      {canRaise ? (
        <div className="action-sizing">
          <div className="quick-bets">
            {quick.map((option) => (
              <button
                type="button"
                key={option.label}
                className={`quick-bet ${raise === option.value ? 'is-active' : ''}`}
                onClick={() => setRaise(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="slider-row">
            <input
              className="bet-slider"
              type="range"
              min={minRaise}
              max={maxRaise}
              step={10}
              value={raise}
              onChange={(event) => setRaise(Number(event.target.value))}
              aria-label="Valor do aumento"
            />
            <span className="bet-readout">{formatChips(raise)}</span>
          </div>
        </div>
      ) : null}

      <div className="action-buttons">
        <button type="button" className="act act-fold" onClick={actions.fold}>
          Desistir
        </button>
        <button
          type="button"
          className="act act-call"
          onClick={() => (canCheck ? actions.check() : actions.call())}
        >
          {canCheck ? 'Passar' : <>Pagar <span className="act-sub">{formatChips(toCall)}</span></>}
        </button>
        {canRaise ? (
          <button type="button" className="act act-raise" onClick={handleRaise}>
            {raiseLabel} {!isAllIn ? <span className="act-sub">{formatChips(raise)}</span> : null}
          </button>
        ) : null}
      </div>
    </div>
  );
}
