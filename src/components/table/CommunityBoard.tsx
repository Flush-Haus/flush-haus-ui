import type { CardId } from '../../types/poker';

interface CommunityBoardProps {
  board: (CardId | null)[];
  getCardUrl: (id?: string | null) => string | undefined;
}

const SLOT_LABELS = ['Flop', 'Flop', 'Flop', 'Turn', 'River'];

export default function CommunityBoard({ board, getCardUrl }: CommunityBoardProps) {
  const slots = Array.from({ length: 5 }, (_, index) => board[index] ?? null);

  return (
    <div className="board" aria-label="Community cards">
      {slots.map((cardId, index) => {
        const url = getCardUrl(cardId);
        return (
          <div className={`board-slot ${url ? 'is-filled' : 'is-empty'}`} key={index}>
            {url ? (
              <img className="tbl-card" src={url} alt="" draggable="false" />
            ) : (
              <span className="board-slot-label">{SLOT_LABELS[index]}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
