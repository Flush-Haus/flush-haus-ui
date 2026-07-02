import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import type { CardAsset } from '../../hooks/useCardAssets';
import type { SeatModel, TableModel } from '../../types/poker';

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DealFlight {
  animationId: string;
  kind: 'throw' | 'draw';
  card: CardAsset;
  from: Box;
  to: Box;
  fromRotation: number;
  rotation: number;
  spin: number;
  zIndex: number;
  /** Seconds before the flight leaves the deck (framer-motion owns the stagger). */
  delay: number;
  revealKeys: string[];
}

const cardStub = (id: string, url: string): CardAsset => ({
  id,
  label: id,
  shortLabel: id,
  fileName: '',
  url,
  sortIndex: 0,
});

function toRoomBox(rect: DOMRect, room: DOMRect): Box {
  return { x: rect.left - room.left, y: rect.top - room.top, width: rect.width, height: rect.height };
}

function fromOrigin(origin: Box, to: Box): Box {
  return {
    x: origin.x + origin.width / 2 - to.width / 2,
    y: origin.y + origin.height / 2 - to.height / 2,
    width: to.width * 0.9,
    height: to.height * 0.9,
  };
}

const HOLE_STAGGER_MS = 130;
const BOARD_STAGGER_MS = 170;

/**
 * Watches the table model and turns state transitions into card flights:
 * - a new hand deals two rounds of face-down cards clockwise from the
 *   dealer's left (hero's cards flip face-up in flight);
 * - each new street flies board cards from the deck, flipping to reveal.
 * While a card is in flight its real DOM counterpart is hidden via
 * `hiddenCards` keys (`hole-<seat>-<i>` / `board-<i>`).
 *
 * All flights are committed in a single state update with framer-motion
 * `delay`s (no setTimeout scheduling) so the effect stays idempotent under
 * StrictMode's double-invocation.
 */
export default function useDealFX(
  table: TableModel,
  roomRef: RefObject<HTMLElement | null>,
  getCardUrl: (id?: string | null) => string | undefined,
  backUrl?: string,
) {
  const [flights, setFlights] = useState<DealFlight[]>([]);
  const [hiddenCards, setHiddenCards] = useState<Set<string>>(() => new Set());
  const prevRef = useRef<TableModel | undefined>(undefined);

  useLayoutEffect(() => {
    const prev = prevRef.current;
    prevRef.current = table;
    const room = roomRef.current;
    if (!room || !backUrl) {
      return;
    }
    // Skip straight to the final state when motion is unwanted or the tab is
    // hidden (rAF pauses there, which would leave cards hidden until refocus).
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.hidden) {
      return;
    }

    // A hand just started if any seat went from no hole cards to some.
    // (The hero keeps cards across round_start, so key off opponents too.)
    const newHand = table.seats.some(
      (seat, i) => seat && seat.holeCards.length > 0 && (prev?.seats[i]?.holeCards.length ?? 0) === 0,
    );
    const dealSeats = newHand
      ? table.seats.filter(
          (seat): seat is SeatModel => !!seat && seat.holeCards.length > 0 && seat.status !== 'folded',
        )
      : [];

    const newBoardSlots: number[] = [];
    table.board.forEach((cardId, i) => {
      if (cardId && !prev?.board?.[i]) {
        newBoardSlots.push(i);
      }
    });

    if (dealSeats.length === 0 && newBoardSlots.length === 0) {
      return;
    }

    const roomRect = room.getBoundingClientRect();
    const deckRect = room.querySelector('.table-deck')?.getBoundingClientRect();
    const origin: Box = deckRect
      ? toRoomBox(deckRect, roomRect)
      : { x: roomRect.width / 2 - 24, y: roomRect.height / 3, width: 48, height: 67 };

    const specs: Omit<DealFlight, 'animationId'>[] = [];

    if (newHand) {
      const dealerIdx = table.seats.findIndex((seat) => seat?.isDealer);
      const clockwiseFromSB = (seat: SeatModel) => (seat.seatIndex - dealerIdx - 1 + 9) % 9;
      const order = [...dealSeats].sort((a, b) => clockwiseFromSB(a) - clockwiseFromSB(b));

      order.forEach((seat, k) => {
        for (let cardIdx = 0; cardIdx < Math.min(2, seat.holeCards.length); cardIdx += 1) {
          const span = room.querySelector(`[data-seat="${seat.seatIndex}"] .hole-card:nth-child(${cardIdx + 1})`);
          if (!span) {
            continue;
          }
          const to = toRoomBox(span.getBoundingClientRect(), roomRect);
          const faceUrl = seat.isHero && seat.holeFaceUp ? getCardUrl(seat.holeCards[cardIdx]) : undefined;
          specs.push({
            kind: faceUrl ? 'draw' : 'throw',
            card: cardStub(faceUrl ? String(seat.holeCards[cardIdx]) : 'back', faceUrl ?? backUrl),
            from: fromOrigin(origin, to),
            to,
            fromRotation: -6 + Math.random() * 12,
            rotation: (cardIdx - 0.5) * (seat.isHero ? 7 : 5),
            spin: (Math.random() > 0.5 ? 1 : -1) * (90 + Math.random() * 120),
            zIndex: 40 + cardIdx,
            delay: ((cardIdx * order.length + k) * HOLE_STAGGER_MS) / 1000,
            revealKeys: [`hole-${seat.seatIndex}-${cardIdx}`],
          });
        }
      });
    }

    const boardBaseDelay = newHand ? dealSeats.length * 2 * HOLE_STAGGER_MS + 240 : 0;
    newBoardSlots.forEach((slotIdx, j) => {
      const slot = room.querySelector(`[data-board-slot="${slotIdx}"]`);
      const url = getCardUrl(table.board[slotIdx]);
      if (!slot || !url) {
        return;
      }
      const to = toRoomBox(slot.getBoundingClientRect(), roomRect);
      specs.push({
        kind: 'draw',
        card: cardStub(String(table.board[slotIdx]), url),
        from: fromOrigin(origin, to),
        to,
        fromRotation: -4 + Math.random() * 8,
        rotation: 0,
        spin: 0,
        zIndex: 46,
        delay: (boardBaseDelay + j * BOARD_STAGGER_MS) / 1000,
        revealKeys: [`board-${slotIdx}`],
      });
    });

    if (specs.length === 0) {
      return;
    }

    // Hide every target before paint so the static card never flashes early.
    setHiddenCards((current) => {
      const next = new Set(newHand ? [] : current);
      for (const spec of specs) {
        for (const key of spec.revealKeys) {
          next.add(key);
        }
      }
      return next;
    });

    const batch = Date.now();
    setFlights((current) => [
      ...(newHand ? [] : current),
      ...specs.map((spec, i) => ({ ...spec, animationId: `fx-${batch}-${i}` })),
    ]);
  }, [table, roomRef, getCardUrl, backUrl]);

  const completeFlight = (flight: DealFlight) => {
    setHiddenCards((current) => {
      const next = new Set(current);
      for (const key of flight.revealKeys) {
        next.delete(key);
      }
      return next;
    });
    setFlights((current) => current.filter((item) => item.animationId !== flight.animationId));
  };

  return { flights, hiddenCards, completeFlight };
}
