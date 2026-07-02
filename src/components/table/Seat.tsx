import type { CSSProperties } from 'react';
import type { SeatModel } from '../../types/poker';
import type { SeatAnchor } from './seatLayout';
import { formatChips } from '../../utils/chips';
import { ChipStack } from './Chip';

interface SeatProps {
  anchor: SeatAnchor;
  seat: SeatModel | null;
  getCardUrl: (id?: string | null) => string | undefined;
  backUrl?: string;
  hiddenCards?: Set<string>;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Deterministic avatar tint from the name so each player reads as distinct.
function avatarHue(name: string) {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) % 360;
  }
  return hash;
}

function HoleCards({ seat, getCardUrl, backUrl, hiddenCards }: Omit<SeatProps, 'anchor'> & { seat: SeatModel }) {
  if (seat.status === 'folded') {
    return null;
  }

  const cards = seat.holeCards.length ? seat.holeCards : [null, null];

  return (
    <div className={`seat-hole ${seat.isHero ? 'is-hero' : ''}`} data-seat={seat.seatIndex}>
      {cards.map((cardId, index) => {
        const faceUrl = seat.holeFaceUp ? getCardUrl(cardId) : undefined;
        const url = faceUrl ?? backUrl;
        const tilt = (index - (cards.length - 1) / 2) * (seat.isHero ? 7 : 5);
        const hidden = hiddenCards?.has(`hole-${seat.seatIndex}-${index}`);
        return (
          <span className="hole-card" key={index} style={{ '--tilt': `${tilt}deg` } as CSSProperties}>
            {url ? (
              <img
                className="tbl-card"
                src={url}
                alt=""
                draggable="false"
                style={hidden ? { visibility: 'hidden' } : undefined}
              />
            ) : null}
          </span>
        );
      })}
    </div>
  );
}

export default function Seat({ anchor, seat, getCardUrl, backUrl, hiddenCards }: SeatProps) {
  const positionStyle = {
    left: `${anchor.x}%`,
    top: `${anchor.y}%`,
  } as CSSProperties;

  if (!seat) {
    return (
      <div className="seat is-empty" data-half={anchor.half} style={positionStyle}>
        <div className="seat-rim">
          <div className="pod pod-empty">
            <span className="pod-empty-label">Open seat</span>
          </div>
        </div>
      </div>
    );
  }

  const hue = avatarHue(seat.name);
  const classes = [
    'seat',
    `is-${seat.status}`,
    seat.isHero ? 'is-hero' : '',
    seat.isToAct ? 'is-to-act' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const timerStyle = {
    '--timer': `${seat.timer ?? 0}`,
  } as CSSProperties & Record<`--${string}`, string>;

  return (
    <div className={classes} data-half={anchor.half} style={positionStyle}>
      {/* Rim side — pod + last action, nearest the table edge */}
      <div className="seat-rim">
        <div className="pod">
          <span className="avatar" style={{ '--avatar-hue': `${hue}` } as CSSProperties}>
            {initials(seat.name)}
          </span>
          <span className="pod-info">
            <span className="pod-name">{seat.name}</span>
            <span className="pod-stack">{formatChips(seat.stack)}</span>
          </span>

          {seat.isDealer ? (
            <span className="badge badge-dealer" title="Dealer">
              D
            </span>
          ) : null}
          {seat.blind ? <span className={`badge badge-blind blind-${seat.blind}`}>{seat.blind}</span> : null}

          {seat.isToAct ? <span className="pod-progress" style={timerStyle} aria-hidden="true" /> : null}
        </div>

        {seat.lastAction ? <span className="seat-action">{seat.lastAction}</span> : null}
      </div>

      {/* Center side — hole cards + bet, pushed toward the pot */}
      <div className="seat-center">
        <HoleCards seat={seat} getCardUrl={getCardUrl} backUrl={backUrl} hiddenCards={hiddenCards} />
        {typeof seat.bet === 'number' && seat.bet > 0 ? (
          <div className="seat-bet">
            <ChipStack amount={seat.bet} size={16} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
