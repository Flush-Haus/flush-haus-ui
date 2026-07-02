import type { SeatModel, SeatStatus, Street, TableModel } from '../types/poker';
import type { ServerMessage } from './PokerClient';
import { protocolCardToId } from './cards';

// ---- Internal state ----

export interface NetPlayer {
  id: string;
  name: string;
  chips: number;
  bet: number;
  status: SeatStatus | 'eliminated';
  holeCards: (string | null)[]; // asset ids; opponents stay null until showdown
  lastAction?: string;
  seatPosition?: number;
}

export interface NetState {
  selfId?: string;
  sessionId?: string;
  ownerId?: string;
  sessionState: 'idle' | 'lobby' | 'running' | 'closed';
  players: Record<string, NetPlayer>;
  joinOrder: string[];
  dealerId?: string;
  smallBlindId?: string;
  bigBlindId?: string;
  smallBlindAmount?: number;
  bigBlindAmount?: number;
  board: (string | null)[];
  pot: number;
  sidePots: number[];
  street?: Street;
  handInProgress: boolean;
  acting?: {
    playerId: string;
    toCall: number;
    minRaiseTo: number;
    maxRaiseTo: number;
    actionTimeMs: number;
    deadline: number;
  };
  lastError?: string;
  banner?: string;
}

export const initialNetState: NetState = {
  sessionState: 'idle',
  players: {},
  joinOrder: [],
  board: [null, null, null, null, null],
  pot: 0,
  sidePots: [],
  handInProgress: false,
};

function ensurePlayer(players: Record<string, NetPlayer>, id: string, name?: string): NetPlayer {
  const existing = players[id];
  if (existing) {
    if (name && existing.name !== name) {
      players[id] = { ...existing, name };
      return players[id];
    }
    return existing;
  }
  const created: NetPlayer = {
    id,
    name: name ?? id,
    chips: 0,
    bet: 0,
    status: 'waiting',
    holeCards: [],
  };
  players[id] = created;
  return created;
}

// Server player-state enum -> internal status.
function mapServerPlayerState(state: string): NetPlayer['status'] {
  switch (state) {
    case 'active':
      return 'active';
    case 'folded':
      return 'folded';
    case 'all_in':
      return 'allin';
    case 'eliminated':
      return 'eliminated';
    default:
      return 'waiting'; // connected / disconnected / waiting
  }
}

const ACTION_LABELS: Record<string, string> = {
  fold: 'Fold',
  check: 'Check',
  call: 'Call',
  bet: 'Bet',
  raise: 'Raise',
  all_in: 'All-in',
};

function actionLabel(type: string, amount: number): string {
  const base = ACTION_LABELS[type] ?? type;
  if ((type === 'bet' || type === 'raise' || type === 'call') && amount > 0) {
    return `${base} ${amount}`;
  }
  return base;
}

// Read a count-prefixed variable list: returns [items, nextIndex].
function readList<T>(
  params: string[],
  startIndex: number,
  stride: number,
  build: (slice: string[]) => T
): [T[], number] {
  const count = Number(params[startIndex] ?? 0);
  const items: T[] = [];
  let index = startIndex + 1;
  for (let i = 0; i < count; i += 1) {
    items.push(build(params.slice(index, index + stride)));
    index += stride;
  }
  return [items, index];
}

// ---- Reducer ----

export function pokerReducer(state: NetState, message: ServerMessage): NetState {
  const { domain, action, params } = message;
  const players = { ...state.players };

  if (domain === 'ok') {
    return state.lastError ? { ...state, lastError: undefined } : state;
  }

  if (domain === 'error') {
    // error [requestCommand...] [errorCode] [detailCount] [details...]
    const codeIndex = params.findIndex((token) => token.startsWith('ERR_'));
    const code = codeIndex >= 0 ? params[codeIndex] : 'ERR_UNKNOWN';
    return { ...state, lastError: code };
  }

  if (domain === 'session') {
    switch (action) {
      case 'created': {
        const [sessionId, ownerId] = params;
        ensurePlayer(players, ownerId);
        return {
          ...state,
          players,
          sessionId,
          ownerId,
          selfId: ownerId,
          sessionState: 'lobby',
          joinOrder: state.joinOrder.includes(ownerId) ? state.joinOrder : [...state.joinOrder, ownerId],
        };
      }
      case 'joined': {
        const [sessionId, selfId] = params;
        ensurePlayer(players, selfId);
        return {
          ...state,
          players,
          sessionId,
          selfId,
          sessionState: state.sessionState === 'idle' ? 'lobby' : state.sessionState,
          joinOrder: state.joinOrder.includes(selfId) ? state.joinOrder : [...state.joinOrder, selfId],
        };
      }
      case 'info': {
        // session info [sessionId] [sessionState] [ownerId] [count] (id,name,state)*
        const [sessionId, sessionState, ownerId] = params;
        const [list] = readList(params, 3, 3, (s) => ({ id: s[0], name: s[1], state: s[2] }));
        const nextPlayers: Record<string, NetPlayer> = {};
        const joinOrder: string[] = [];
        for (const entry of list) {
          const prev = state.players[entry.id];
          nextPlayers[entry.id] = {
            id: entry.id,
            name: entry.name,
            chips: prev?.chips ?? 0,
            bet: prev?.bet ?? 0,
            status: mapServerPlayerState(entry.state),
            holeCards: prev?.holeCards ?? [],
            lastAction: prev?.lastAction,
            seatPosition: prev?.seatPosition,
          };
          joinOrder.push(entry.id);
        }
        return {
          ...state,
          players: nextPlayers,
          joinOrder,
          sessionId: sessionId ?? state.sessionId,
          ownerId: ownerId ?? state.ownerId,
          sessionState: sessionState === 'running' ? 'running' : 'lobby',
        };
      }
      case 'player_joined': {
        const [playerId, playerName] = params;
        ensurePlayer(players, playerId, playerName);
        return {
          ...state,
          players,
          joinOrder: state.joinOrder.includes(playerId) ? state.joinOrder : [...state.joinOrder, playerId],
        };
      }
      case 'player_left': {
        const [playerId] = params;
        delete players[playerId];
        return { ...state, players, joinOrder: state.joinOrder.filter((id) => id !== playerId) };
      }
      case 'started': {
        const [sb, bb, startingChips] = params;
        const chips = Number(startingChips);
        // The handler doesn't broadcast game info, so seed stacks from here.
        for (const id of Object.keys(players)) {
          players[id] = { ...players[id], chips };
        }
        return {
          ...state,
          players,
          sessionState: 'running',
          smallBlindAmount: Number(sb),
          bigBlindAmount: Number(bb),
        };
      }
      case 'closed':
        return { ...state, sessionState: 'closed' };
      default:
        return state;
    }
  }

  if (domain === 'game') {
    switch (action) {
      case 'info':
      case 'chips': {
        // game info/chips [count] (id, chips)*
        const [list] = readList(params, 0, 2, (s) => ({ id: s[0], chips: Number(s[1]) }));
        for (const entry of list) {
          const player = ensurePlayer(players, entry.id);
          players[entry.id] = { ...player, chips: entry.chips };
        }
        return { ...state, players };
      }
      case 'round_start': {
        // [dealer] [sb] [bb] [sbAmt] [bbAmt] [seatsCount] (position, playerId)*
        const [dealerId, smallBlindId, bigBlindId, sbAmt, bbAmt] = params;
        const [seats] = readList(params, 5, 2, (s) => ({ position: Number(s[0]), playerId: s[1] }));
        const seated = new Set(seats.map((seat) => seat.playerId));
        for (const seat of seats) {
          const player = ensurePlayer(players, seat.playerId);
          players[seat.playerId] = {
            ...player,
            seatPosition: seat.position,
            bet: 0,
            lastAction: undefined,
            // flush-haus-api sends `game hole` before `game round_start`, so
            // the hero's cards must survive this reset (opponents stay hidden).
            holeCards: seat.playerId === state.selfId ? player.holeCards : [],
            status: player.status === 'eliminated' ? 'eliminated' : 'active',
          };
        }
        // Players not seated this round wait it out.
        for (const id of Object.keys(players)) {
          if (!seated.has(id) && players[id].status !== 'eliminated') {
            players[id] = { ...players[id], status: 'waiting', bet: 0, lastAction: undefined, holeCards: [] };
          }
        }
        return {
          ...state,
          players,
          dealerId,
          smallBlindId,
          bigBlindId,
          smallBlindAmount: Number(sbAmt),
          bigBlindAmount: Number(bbAmt),
          board: [null, null, null, null, null],
          pot: 0,
          sidePots: [],
          street: 'preflop',
          handInProgress: true,
          acting: undefined,
          banner: undefined,
        };
      }
      case 'hole': {
        // game hole [c1] [c2] — only the recipient (self) gets this
        if (!state.selfId) {
          return state;
        }
        const player = ensurePlayer(players, state.selfId);
        players[state.selfId] = {
          ...player,
          holeCards: [protocolCardToId(params[0]), protocolCardToId(params[1])],
        };
        return { ...state, players };
      }
      case 'turn': {
        // [actingId] [toCall] [minRaiseTo] [maxRaiseTo] [actionTimeMs]
        const [actingPlayerId, toCall, minRaiseTo, maxRaiseTo, actionTimeMs] = params;
        const ms = Number(actionTimeMs);
        return {
          ...state,
          acting: {
            playerId: actingPlayerId,
            toCall: Number(toCall),
            minRaiseTo: Number(minRaiseTo),
            maxRaiseTo: Number(maxRaiseTo),
            actionTimeMs: ms,
            deadline: Date.now() + ms,
          },
        };
      }
      case 'action': {
        // [playerId] [actionType] [actionAmount] [potTotal] [playerChips]
        const [playerId, actionType, actionAmount, potTotal, playerChips] = params;
        const player = ensurePlayer(players, playerId);
        let status: NetPlayer['status'] = player.status;
        if (actionType === 'fold') {
          status = 'folded';
        } else if (actionType === 'all_in') {
          status = 'allin';
        }
        players[playerId] = {
          ...player,
          chips: Number(playerChips),
          status,
          lastAction: actionLabel(actionType, Number(actionAmount)),
        };
        return {
          ...state,
          players,
          // The server reports only the current street's chips, which drop to 0
          // between streets; keep the pot monotonic until the next deal resets it.
          pot: Math.max(state.pot, Number(potTotal)),
          acting: state.acting?.playerId === playerId ? undefined : state.acting,
        };
      }
      case 'bets': {
        // [count] (id, amount)*
        const [list] = readList(params, 0, 2, (s) => ({ id: s[0], amount: Number(s[1]) }));
        const betById = new Map(list.map((entry) => [entry.id, entry.amount]));
        for (const id of Object.keys(players)) {
          players[id] = { ...players[id], bet: betById.get(id) ?? 0 };
        }
        return { ...state, players };
      }
      case 'pots': {
        // [potsCount] (type, amount, eligibleCount, eligibleIds...)*
        const count = Number(params[0] ?? 0);
        let index = 1;
        let total = 0;
        const sidePots: number[] = [];
        for (let i = 0; i < count; i += 1) {
          const type = params[index];
          const amount = Number(params[index + 1]);
          const eligibleCount = Number(params[index + 2]);
          index += 3 + eligibleCount;
          total += amount;
          if (type !== 'MAIN') {
            sidePots.push(amount);
          }
        }
        return { ...state, pot: total, sidePots };
      }
      case 'board_flop': {
        const board = [...state.board];
        board[0] = protocolCardToId(params[0]);
        board[1] = protocolCardToId(params[1]);
        board[2] = protocolCardToId(params[2]);
        return { ...state, board, street: 'flop' };
      }
      case 'board_turn': {
        const board = [...state.board];
        board[3] = protocolCardToId(params[0]);
        return { ...state, board, street: 'turn' };
      }
      case 'board_river': {
        const board = [...state.board];
        board[4] = protocolCardToId(params[0]);
        return { ...state, board, street: 'river' };
      }
      case 'showdown': {
        // [count] (id, cardA, cardB)*
        const [list] = readList(params, 0, 3, (s) => ({
          id: s[0],
          cards: [protocolCardToId(s[1]), protocolCardToId(s[2])],
        }));
        for (const entry of list) {
          const player = ensurePlayer(players, entry.id);
          players[entry.id] = { ...player, holeCards: entry.cards };
        }
        return { ...state, players, street: 'showdown', acting: undefined };
      }
      case 'result': {
        // [winnersCount] (winnerId, winAmount, handRank)*
        const [winners] = readList(params, 0, 3, (s) => ({
          id: s[0],
          amount: Number(s[1]),
          rank: s[2],
        }));
        const banner = winners
          .map((w) => `${players[w.id]?.name ?? w.id} ganha ${w.amount}${w.rank && w.rank !== 'NONE' ? ` (${w.rank})` : ''}`)
          .join(' · ');
        return { ...state, banner, handInProgress: false, acting: undefined };
      }
      case 'eliminated': {
        const [playerId] = params;
        const player = ensurePlayer(players, playerId);
        players[playerId] = { ...player, status: 'eliminated' };
        return { ...state, players };
      }
      case 'over': {
        const [winnerId] = params;
        return {
          ...state,
          banner: `Fim de jogo — ${players[winnerId]?.name ?? winnerId} venceu`,
          handInProgress: false,
          acting: undefined,
        };
      }
      default:
        return state;
    }
  }

  return state;
}

// ---- Selector: NetState -> TableModel (hero-centric, mapped to 9 anchors) ----

const SEAT_COUNT = 9;

function orderedSeatIds(state: NetState): string[] {
  const ids = Object.keys(state.players);
  const seated = ids.filter((id) => state.players[id].seatPosition !== undefined);
  const unseated = state.joinOrder.filter((id) => state.players[id] && !seated.includes(id));

  seated.sort((a, b) => (state.players[a].seatPosition ?? 0) - (state.players[b].seatPosition ?? 0));

  const order = [...seated, ...unseated];
  if (!order.length) {
    return order;
  }

  const selfIndex = state.selfId ? order.indexOf(state.selfId) : -1;
  if (selfIndex <= 0) {
    return order;
  }
  return [...order.slice(selfIndex), ...order.slice(0, selfIndex)];
}

function toSeatStatus(status: NetPlayer['status']): SeatStatus {
  if (status === 'eliminated') {
    return 'folded';
  }
  return status;
}

export function selectTableModel(state: NetState, now: number): TableModel {
  const seats: (SeatModel | null)[] = Array.from({ length: SEAT_COUNT }, () => null);
  const order = orderedSeatIds(state);
  const n = order.length || 1;

  order.forEach((id, i) => {
    const player = state.players[id];
    if (!player) {
      return;
    }
    const anchorIndex = Math.floor((i * SEAT_COUNT) / n) % SEAT_COUNT;
    const isSelf = id === state.selfId;
    const isShowdown = state.street === 'showdown';

    let holeCards: (string | null)[] = [];
    let faceUp = false;
    if (isSelf && player.holeCards.length) {
      holeCards = player.holeCards;
      faceUp = true;
    } else if (isShowdown && player.holeCards.length) {
      holeCards = player.holeCards;
      faceUp = true;
    } else if (state.handInProgress && player.status !== 'folded' && player.status !== 'eliminated') {
      holeCards = [null, null];
    }

    const isToAct = state.acting?.playerId === id;
    let timer: number | undefined;
    if (isToAct && state.acting) {
      timer = Math.max(0, Math.min(1, (state.acting.deadline - now) / state.acting.actionTimeMs));
    }

    seats[anchorIndex] = {
      seatIndex: anchorIndex,
      name: player.name,
      stack: player.chips,
      holeCards,
      holeFaceUp: faceUp,
      bet: player.bet,
      lastAction: player.lastAction,
      status: toSeatStatus(player.status),
      isHero: isSelf,
      isDealer: id === state.dealerId,
      blind: id === state.smallBlindId ? 'SB' : id === state.bigBlindId ? 'BB' : undefined,
      isToAct,
      timer,
    };
  });

  const heroActing = state.acting && state.acting.playerId === state.selfId ? state.acting : undefined;

  return {
    seats,
    board: state.board,
    pot: state.pot,
    sidePots: state.sidePots.length ? state.sidePots : undefined,
    street: state.street ?? 'preflop',
    heroOptions: heroActing
      ? {
          canCheck: heroActing.toCall === 0,
          toCall: heroActing.toCall,
          minRaise: heroActing.minRaiseTo,
          maxRaise: heroActing.maxRaiseTo,
          pot: state.pot,
        }
      : undefined,
  };
}
