// Poker table state model.
//
// This intentionally mirrors the shape a websocket would broadcast: one
// snapshot of the whole table. The UI renders purely from this model, so the
// eventual integration is "feed socket state in here, diff it, fire animations"
// — no rendering logic changes required.

export type SeatStatus = 'active' | 'folded' | 'allin' | 'waiting' | 'empty';
export type BlindKind = 'SB' | 'BB';
export type Street = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

/** A card id matches the asset catalog: rank + suit, e.g. "AS", "10H", "2C". */
export type CardId = string;

export interface SeatModel {
  seatIndex: number; // 0..8, maps to a fixed anchor around the oval
  name: string;
  stack: number;
  /** Hole cards; `null` = present but unknown (rendered face-down). */
  holeCards: (CardId | null)[];
  holeFaceUp: boolean;
  /** Chips committed on the current street, shown in front of the seat. */
  bet?: number;
  /** Short label of the last action taken, e.g. "Raise 600", "Check". */
  lastAction?: string;
  status: SeatStatus;
  isHero?: boolean;
  isDealer?: boolean;
  blind?: BlindKind;
  /** This seat is currently to act. */
  isToAct?: boolean;
  /** Fraction of the action timer remaining, 0..1. */
  timer?: number;
}

export interface HeroOptions {
  canCheck: boolean;
  toCall: number;
  minRaise: number;
  maxRaise: number;
  pot: number;
}

export interface TableModel {
  /** Fixed 9 slots; `null` = open seat. */
  seats: (SeatModel | null)[];
  /** Fixed 5 community slots; `null` = not yet dealt. */
  board: (CardId | null)[];
  pot: number;
  sidePots?: number[];
  street: Street;
  heroOptions?: HeroOptions;
}
