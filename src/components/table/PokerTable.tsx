import { useMemo } from 'react';
import useCardAssets from '../../hooks/useCardAssets';
import type { TableModel } from '../../types/poker';
import { SEAT_ANCHORS } from './seatLayout';
import Seat from './Seat';
import CommunityBoard from './CommunityBoard';
import Pot from './Pot';
import ActionBar, { type ActionBarActions } from './ActionBar';

interface PokerTableProps {
  table: TableModel;
  actions?: ActionBarActions;
  banner?: string;
}

export default function PokerTable({ table, actions, banner }: PokerTableProps) {
  const { cards, backCard } = useCardAssets();

  const getCardUrl = useMemo(() => {
    const map = new Map(cards.map((card) => [card.id, card.url]));
    return (id?: string | null) => (id ? map.get(id) : undefined);
  }, [cards]);

  return (
    <main className="poker-room" aria-label="Mesa de poker">
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
            <CommunityBoard board={table.board} getCardUrl={getCardUrl} />
          </div>
        </div>

        {SEAT_ANCHORS.map((anchor, index) => (
          <Seat
            key={index}
            anchor={anchor}
            seat={table.seats[index] ?? null}
            getCardUrl={getCardUrl}
            backUrl={backCard?.url}
          />
        ))}
      </div>

      {table.heroOptions && actions ? <ActionBar options={table.heroOptions} actions={actions} /> : null}

      <div className="crt-overlay" aria-hidden="true" />
    </main>
  );
}
