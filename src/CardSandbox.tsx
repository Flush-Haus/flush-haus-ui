import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import CardHand from './components/CardHand';
import DeckStack from './components/DeckStack';
import FlyingCard from './components/FlyingCard';
import TableCard from './components/TableCard';
import type { CardAsset } from './hooks/useCardAssets';
import useCardAssets from './hooks/useCardAssets';
import { getTableLandingSpot } from './utils/getTableLandingSpot';

const MAX_HAND_SIZE = 5;

interface TableCardState {
  id: string;
  card: CardAsset;
  x: number;
  y: number;
  width: number;
  height: number;
  from?: CardBox;
  fromRotation?: number;
  spin?: number;
  rotation: number;
  zIndex: number;
}

interface FlyingCardState {
  animationId: string;
  kind: 'throw' | 'draw';
  card: CardAsset;
  from: CardBox;
  to: CardBox;
  fromRotation: number;
  rotation: number;
  spin: number;
  zIndex: number;
}

interface CardBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

function shuffleCards(cards: CardAsset[]) {
  const next = [...cards];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

function rectToStageBox(rect: DOMRect, stageRect: DOMRect): CardBox {
  return {
    x: rect.left - stageRect.left,
    y: rect.top - stageRect.top,
    width: rect.width,
    height: rect.height,
  };
}

function createAnimationId(kind: FlyingCardState['kind'], cardId: string) {
  return `${kind}-${cardId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getResponsiveHandCardSize(stageWidth: number) {
  const width = stageWidth <= 720 ? clamp(stageWidth * 0.22, 78, 108) : clamp(stageWidth * 0.092, 92, 150);

  return {
    width,
    height: width * 1.4,
  };
}

function getProjectedHandPlacement(stageRect: DOMRect, handCountAfterDraw: number, newCardIndex: number) {
  const cardSize = getResponsiveHandCardSize(stageRect.width);
  const middle = (handCountAfterDraw - 1) / 2;
  const offset = newCardIndex - middle;
  const normalized = middle === 0 ? 0 : offset / middle;
  const spacing = stageRect.width <= 720 ? 102 * 0.66 : 102;
  const arc = Math.pow(Math.abs(normalized), 1.55) * 24;
  const fanBottom = clamp(stageRect.height * 0.026, 8, 26);

  return {
    x: stageRect.width / 2 + offset * spacing - cardSize.width / 2,
    y: stageRect.height - fanBottom - cardSize.height + arc,
    width: cardSize.width,
    height: cardSize.height,
    rotation: normalized * 12,
  };
}

export default function CardSandbox() {
  const { cards, backCard } = useCardAssets();
  const stageRef = useRef<HTMLElement>(null);
  const freshCardTimersRef = useRef(new Map<string, number>());
  const handReflowTimerRef = useRef<number | null>(null);
  const leavingCardTimersRef = useRef(new Map<string, number>());
  const drawRevealTimersRef = useRef(new Map<string, number>());
  const [deckCards, setDeckCards] = useState<CardAsset[]>([]);
  const [handCards, setHandCards] = useState<CardAsset[]>([]);
  const [tableCards, setTableCards] = useState<TableCardState[]>([]);
  const [flyingCards, setFlyingCards] = useState<FlyingCardState[]>([]);
  const [freshHandCardIds, setFreshHandCardIds] = useState(() => new Set<string>());
  const [incomingHandCardIds, setIncomingHandCardIds] = useState(() => new Set<string>());
  const [leavingHandCardIds, setLeavingHandCardIds] = useState(() => new Set<string>());
  const [initialDealCardIds, setInitialDealCardIds] = useState(() => new Set<string>());
  const [isHandReflowing, setIsHandReflowing] = useState(false);
  const [deckShakeKey, setDeckShakeKey] = useState(0);

  const assetSignature = useMemo(() => cards.map((card) => card.id).join('|'), [cards]);
  const isDrawing = flyingCards.some((card) => card.kind === 'draw');

  useEffect(() => {
    if (cards.length === 0) {
      return;
    }

    const shuffled = shuffleCards(cards);
    const openingHand = shuffled.slice(0, MAX_HAND_SIZE);
    setHandCards(openingHand);
    setDeckCards(shuffled.slice(MAX_HAND_SIZE));
    setTableCards([]);
    setFlyingCards([]);
    setFreshHandCardIds(new Set());
    setIncomingHandCardIds(new Set());
    setLeavingHandCardIds(new Set());
    setInitialDealCardIds(new Set(openingHand.map((card) => card.id)));
    setIsHandReflowing(false);
  }, [assetSignature, cards]);

  useEffect(() => {
    return () => {
      freshCardTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      leavingCardTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      drawRevealTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      if (handReflowTimerRef.current !== null) {
        window.clearTimeout(handReflowTimerRef.current);
      }
    };
  }, []);

  const markFreshHandCard = (cardId: string) => {
    window.clearTimeout(freshCardTimersRef.current.get(cardId));
    setFreshHandCardIds((current) => {
      const next = new Set(current);
      next.add(cardId);
      return next;
    });

    const timer = window.setTimeout(() => {
      freshCardTimersRef.current.delete(cardId);
      setFreshHandCardIds((current) => {
        const next = new Set(current);
        next.delete(cardId);
        return next;
      });
    }, 650);

    freshCardTimersRef.current.set(cardId, timer);
  };

  const revealIncomingCard = (cardId: string) => {
    window.clearTimeout(drawRevealTimersRef.current.get(cardId));
    drawRevealTimersRef.current.delete(cardId);
    setIncomingHandCardIds((current) => {
      if (!current.has(cardId)) {
        return current;
      }

      const next = new Set(current);
      next.delete(cardId);
      return next;
    });
    markFreshHandCard(cardId);
  };

  const completeFlyingCard = (completed: FlyingCardState) => {
    if (completed.kind === 'draw') {
      revealIncomingCard(completed.card.id);
      setHandCards((hand) => {
        if (hand.length >= MAX_HAND_SIZE || hand.some((card) => card.id === completed.card.id)) {
          return hand;
        }

        return [...hand, completed.card];
      });

      window.requestAnimationFrame(() => {
        setFlyingCards((current) => current.filter((card) => card.animationId !== completed.animationId));
      });
      return;
    }

    setFlyingCards((current) => current.filter((card) => card.animationId !== completed.animationId));
  };

  const holdHandReflow = (duration: number) => {
    setIsHandReflowing(true);

    if (handReflowTimerRef.current !== null) {
      window.clearTimeout(handReflowTimerRef.current);
    }

    handReflowTimerRef.current = window.setTimeout(() => {
      handReflowTimerRef.current = null;
      setIsHandReflowing(false);
    }, duration);
  };

  const throwCard = (card: CardAsset, cardRect: DOMRect, startRotation: number) => {
    const stage = stageRef.current;

    if (!stage || leavingHandCardIds.has(card.id) || incomingHandCardIds.has(card.id)) {
      return;
    }

    const stageRect = stage.getBoundingClientRect();
    const from = rectToStageBox(cardRect, stageRect);
    const landing = getTableLandingSpot(
      tableCards.map((tableCard) => ({
        x: tableCard.x,
        y: tableCard.y,
        width: from.width,
        height: from.height,
      })),
      { width: stageRect.width, height: stageRect.height },
      { width: from.width, height: from.height },
    );

    const tableCard: TableCardState = {
      id: `${card.id}-${Date.now()}`,
      card,
      x: landing.x,
      y: landing.y,
      width: from.width,
      height: from.height,
      from,
      fromRotation: startRotation,
      rotation: landing.rotation,
      spin: landing.spin,
      zIndex: 200 + tableCards.length,
    };

    holdHandReflow(620);
    setLeavingHandCardIds((current) => {
      const next = new Set(current);
      next.add(card.id);
      return next;
    });
    setTableCards((table) => [...table, tableCard]);

    window.clearTimeout(leavingCardTimersRef.current.get(card.id));
    const removalTimer = window.setTimeout(() => {
      leavingCardTimersRef.current.delete(card.id);
      setHandCards((hand) => hand.filter((handCard) => handCard.id !== card.id));
      setLeavingHandCardIds((current) => {
        const next = new Set(current);
        next.delete(card.id);
        return next;
      });
    }, 115);
    leavingCardTimersRef.current.set(card.id, removalTimer);
  };

  const drawFromDeck = (deckRect: DOMRect) => {
    const stage = stageRef.current;

    if (!stage || handCards.length >= MAX_HAND_SIZE || deckCards.length === 0 || isDrawing) {
      setDeckShakeKey((key) => key + 1);
      return;
    }

    const [nextCard, ...remainingDeck] = deckCards;
    const stageRect = stage.getBoundingClientRect();
    const target = getProjectedHandPlacement(stageRect, handCards.length + 1, handCards.length);
    const deckBox = rectToStageBox(deckRect, stageRect);
    const from = {
      x: deckBox.x + deckBox.width / 2 - target.width / 2,
      y: deckBox.y + deckBox.height / 2 - target.height / 2,
      width: target.width,
      height: target.height,
    };

    holdHandReflow(860);
    setDeckCards(remainingDeck);
    setIncomingHandCardIds((current) => {
      const next = new Set(current);
      next.add(nextCard.id);
      return next;
    });
    setHandCards((hand) => (hand.some((card) => card.id === nextCard.id) ? hand : [...hand, nextCard]));
    setFlyingCards((current) => [
      ...current,
      {
        animationId: createAnimationId('draw', nextCard.id),
        kind: 'draw',
        card: nextCard,
        from,
        to: target,
        fromRotation: -0.35,
        rotation: target.rotation,
        spin: Math.random() > 0.5 ? 22 : -22,
        zIndex: 900,
      },
    ]);

    const revealTimer = window.setTimeout(() => revealIncomingCard(nextCard.id), 780);
    drawRevealTimersRef.current.set(nextCard.id, revealTimer);
  };

  if (cards.length === 0) {
    return (
      <main className="black-stage">
        <span className="sr-only">No playable card images found.</span>
      </main>
    );
  }

  return (
    <main className="black-stage" aria-label="Poker table prototype" ref={stageRef}>
      <div className="table-glow" aria-hidden="true" />

      <section className="table-zone" aria-label="Cards on table">
        <AnimatePresence>
          {tableCards.map((tableCard) => (
            <TableCard key={tableCard.id} tableCard={tableCard} />
          ))}
        </AnimatePresence>
      </section>

      <DeckStack
        backUrl={backCard?.url}
        remainingCount={deckCards.length}
        canDraw={handCards.length < MAX_HAND_SIZE && deckCards.length > 0 && !isDrawing}
        shakeKey={deckShakeKey}
        onDraw={drawFromDeck}
      />

      <CardHand
        cards={handCards}
        freshCardIds={freshHandCardIds}
        incomingCardIds={incomingHandCardIds}
        leavingCardIds={leavingHandCardIds}
        initialDealCardIds={initialDealCardIds}
        isReflowing={isHandReflowing}
        onThrowCard={throwCard}
      />

      {flyingCards.map((flyingCard) => (
        <FlyingCard
          key={flyingCard.animationId}
          flyingCard={flyingCard}
          backUrl={backCard?.url}
          onComplete={completeFlyingCard}
        />
      ))}
    </main>
  );
}
