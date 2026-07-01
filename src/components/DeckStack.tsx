import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

interface DeckStackProps {
  backUrl?: string;
  remainingCount: number;
  canDraw: boolean;
  shakeKey: number;
  onDraw: (deckRect: DOMRect) => void;
}

function getLayerCount(remainingCount: number) {
  if (remainingCount <= 0) {
    return 0;
  }

  return Math.min(14, Math.max(5, Math.ceil(remainingCount / 4)));
}

export default function DeckStack({ backUrl, remainingCount, canDraw, shakeKey, onDraw }: DeckStackProps) {
  const deckRef = useRef<HTMLButtonElement>(null);
  const topCardRef = useRef<HTMLSpanElement>(null);
  const [isShaking, setIsShaking] = useState(false);
  const layerCount = getLayerCount(remainingCount);
  const layers = useMemo(() => Array.from({ length: layerCount }, (_, index) => index), [layerCount]);

  useEffect(() => {
    if (shakeKey === 0) {
      return;
    }

    setIsShaking(true);
    const timer = window.setTimeout(() => setIsShaking(false), 360);
    return () => window.clearTimeout(timer);
  }, [shakeKey]);

  const handleDraw = () => {
    const rect = topCardRef.current?.getBoundingClientRect() ?? deckRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    onDraw(rect);
  };

  return (
    <aside className="deck-zone" aria-label="Deck">
      <button
        className={`deck-stack ${canDraw ? 'can-draw' : ''} ${isShaking ? 'is-shaking' : ''}`}
        type="button"
        ref={deckRef}
        onClick={handleDraw}
        aria-label={remainingCount > 0 ? `Draw from deck, ${remainingCount} cards remaining` : 'Deck is empty'}
      >
        {remainingCount > 0 ? (
          layers.map((index) => {
            const depth = layerCount - index;
            const layerStyle = {
              '--layer-x': `${depth * 0.7}px`,
              '--layer-y': `${depth * 0.95}px`,
              '--layer-rot': `${(depth - layerCount / 2) * 0.035}deg`,
              '--layer-z': `${index}`,
            } as CSSProperties & Record<`--${string}`, string>;

            return (
              <span className="deck-layer" key={index} style={layerStyle} aria-hidden="true" />
            );
          })
        ) : (
          <span className="deck-empty-mark" />
        )}

        {remainingCount > 0 ? (
          <span className="deck-top-card" ref={topCardRef}>
            {backUrl ? <img className="card-image" src={backUrl} alt="" draggable="false" /> : null}
          </span>
        ) : null}
      </button>

      <div className="deck-counter" aria-live="polite">
        {remainingCount}
      </div>
    </aside>
  );
}
