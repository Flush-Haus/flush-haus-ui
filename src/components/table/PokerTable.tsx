import { useMemo, useRef } from 'react';
import useCardAssets from '../../hooks/useCardAssets';
import useMediaQuery from '../../hooks/useMediaQuery';
import type { TableModel } from '../../types/poker';
import FlyingCard from '../FlyingCard';
import { PORTRAIT_SEAT_ANCHORS, SEAT_ANCHORS } from './seatLayout';
import Seat from './Seat';
import CommunityBoard from './CommunityBoard';
import Pot from './Pot';
import ActionBar, { type ActionBarActions } from './ActionBar';
import useDealFX from './useDealFX';

interface PokerTableProps {
  table: TableModel;
  actions?: ActionBarActions;
  banner?: string;
}

export default function PokerTable({ table, actions, banner }: PokerTableProps) {
  const { cards, backCard } = useCardAssets();
  const roomRef = useRef<HTMLElement>(null);
  const isPortrait = useMediaQuery('(max-width: 760px)');
  const anchors = isPortrait ? PORTRAIT_SEAT_ANCHORS : SEAT_ANCHORS;

  const getCardUrl = useMemo(() => {
    const map = new Map(cards.map((card) => [card.id, card.url]));
    return (id?: string | null) => (id ? map.get(id) : undefined);
  }, [cards]);

  const { flights, hiddenCards, completeFlight } = useDealFX(table, roomRef, getCardUrl, backCard?.url);

  return (
    <main className="poker-room" aria-label="Mesa de poker" ref={roomRef}>
      <div className="table-rail">
        <div className="felt">
          <div className="felt-dither" aria-hidden="true" />
          <div className="felt-spot" aria-hidden="true" />
          <span className="felt-mark" aria-hidden="true">
            ♠
          </span>

          <div className="table-center">
            {banner ? <div className="table-banner">{banner}</div> : null}
            <Pot pot={table.pot} sidePots={table.sidePots} />
            <CommunityBoard board={table.board} getCardUrl={getCardUrl} hiddenCards={hiddenCards} />
          </div>

          {backCard ? (
            <div className="table-deck" aria-hidden="true">
              <img src={backCard.url} alt="" draggable="false" />
            </div>
          ) : null}
        </div>

        {anchors.map((anchor, index) => (
          <Seat
            key={index}
            anchor={anchor}
            seat={table.seats[index] ?? null}
            getCardUrl={getCardUrl}
            backUrl={backCard?.url}
            hiddenCards={hiddenCards}
          />
        ))}
      </div>

      <div className="table-fx" aria-hidden="true">
        {flights.map((flight) => (
          <FlyingCard
            key={flight.animationId}
            flyingCard={flight}
            backUrl={backCard?.url}
            onComplete={() => completeFlight(flight)}
          />
        ))}
      </div>

      {table.heroOptions && actions ? <ActionBar options={table.heroOptions} actions={actions} /> : null}

      <div className="crt-overlay" aria-hidden="true" />
    </main>
  );
}
