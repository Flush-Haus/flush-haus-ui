import type { CardId } from '../../types/poker';

interface CommunityBoardProps {
  board: (CardId | null)[];
  getCardUrl: (id?: string | null) => string | undefined;
  hiddenCards?: Set<string>;
}

const SLOT_LABELS = ['Flop', 'Flop', 'Flop', 'Turn', 'River'];

export default function CommunityBoard({ board, getCardUrl, hiddenCards }: CommunityBoardProps) {
  const slots = Array.from({ length: 5 }, (_, index) => board[index] ?? null);

  return (
    <div className="board" aria-label="Community cards">
      {slots.map((cardId, index) => {
        const url = getCardUrl(cardId);
        const hidden = hiddenCards?.has(`board-${index}`);
        return (
          <div className={`board-slot ${url ? 'is-filled' : 'is-empty'}`} key={index} data-board-slot={index}>
            {url ? (
              <img
                className="tbl-card"
                src={url}
                alt=""
                draggable="false"
                style={hidden ? { visibility: 'hidden' } : undefined}
              />
            ) : (
              <span className="board-slot-label">{SLOT_LABELS[index]}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
