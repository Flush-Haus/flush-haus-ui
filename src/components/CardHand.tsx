import { useEffect, useState, type CSSProperties } from 'react';
import type { CardAsset } from '../hooks/useCardAssets';
import PlayingCard from './PlayingCard';

interface CardHandProps {
  cards: CardAsset[];
  freshCardIds: Set<string>;
  incomingCardIds: Set<string>;
  leavingCardIds: Set<string>;
  initialDealCardIds: Set<string>;
  isReflowing: boolean;
  onThrowCard: (card: CardAsset, cardRect: DOMRect, startRotation: number) => void;
}

export default function CardHand({
  cards,
  freshCardIds,
  incomingCardIds,
  leavingCardIds,
  initialDealCardIds,
  isReflowing,
  onThrowCard,
}: CardHandProps) {
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

  useEffect(() => {
    if (isReflowing || (hoveredCardId && !cards.some((card) => card.id === hoveredCardId))) {
      setHoveredCardId(null);
    }
  }, [cards, hoveredCardId, isReflowing]);

  return (
    <section className="hand-stage" aria-label="Player hand">
      <div className={`hand-fan ${isReflowing ? 'is-reflowing' : ''}`}>
        {cards.map((card, index) => {
          const isLeaving = leavingCardIds.has(card.id);
          const isIncoming = incomingCardIds.has(card.id);
          const isFresh = freshCardIds.has(card.id);
          const shouldDealIn = initialDealCardIds.has(card.id) && !isFresh && !isIncoming && !isLeaving;
          const middle = (cards.length - 1) / 2;
          const offset = index - middle;
          const normalized = middle === 0 ? 0 : offset / middle;
          const arc = Math.pow(Math.abs(normalized), 1.55) * 24;
          const rotation = normalized * 12;
          const cardStyle = {
            '--x': `${offset * 102}px`,
            '--y': `${arc.toFixed(2)}px`,
            '--rot': `${rotation.toFixed(3)}deg`,
            '--hover-rot': `${(rotation * 0.42).toFixed(3)}deg`,
            '--hover-tilt': `${(-normalized * 7).toFixed(3)}deg`,
            '--entry-delay': `${index * 95}ms`,
            '--z': `${100 + index}`,
          } as CSSProperties & Record<`--${string}`, string>;

          return (
            <PlayingCard
              key={card.id}
              card={card}
              index={index}
              isHovered={!isReflowing && hoveredCardId === card.id}
              isFresh={isFresh}
              isIncoming={isIncoming}
              isLeaving={isLeaving}
              shouldDealIn={shouldDealIn}
              startRotation={rotation}
              style={cardStyle}
              onPointerEnter={() => {
                if (!isReflowing && !isLeaving && !isIncoming) {
                  setHoveredCardId(card.id);
                }
              }}
              onPointerLeave={() => setHoveredCardId((current) => (current === card.id ? null : current))}
              onThrow={onThrowCard}
            />
          );
        })}
      </div>
    </section>
  );
}
