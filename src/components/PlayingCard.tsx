import type { CSSProperties, MouseEvent } from 'react';
import type { CardAsset } from '../hooks/useCardAssets';

interface PlayingCardProps {
  card: CardAsset;
  index: number;
  isHovered: boolean;
  isFresh: boolean;
  isIncoming: boolean;
  isLeaving: boolean;
  shouldDealIn: boolean;
  startRotation: number;
  style: CSSProperties;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onThrow: (card: CardAsset, cardRect: DOMRect, startRotation: number) => void;
}

export default function PlayingCard({
  card,
  index,
  isHovered,
  isFresh,
  isIncoming,
  isLeaving,
  shouldDealIn,
  startRotation,
  style,
  onPointerEnter,
  onPointerLeave,
  onThrow,
}: PlayingCardProps) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (isIncoming || isLeaving) {
      return;
    }

    const visual = event.currentTarget.querySelector('.hand-card-visual');

    if (!(visual instanceof HTMLElement)) {
      return;
    }

    onThrow(card, visual.getBoundingClientRect(), startRotation);
  };

  return (
    <button
      className={`hand-card ${shouldDealIn ? 'is-dealt' : ''} ${isHovered ? 'is-hovered' : ''} ${isFresh ? 'is-fresh' : ''} ${
        isIncoming ? 'is-incoming' : ''
      } ${isLeaving ? 'is-leaving' : ''}`}
      type="button"
      style={style}
      aria-label={`Throw ${card.label}`}
      onClick={handleClick}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <span className="hand-card-visual">
        <img className="card-image" src={card.url} alt="" draggable="false" />
      </span>
      <span className="sr-only">Card {index + 1}: {card.label}</span>
    </button>
  );
}
