import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { TableModel } from '../types/poker';
import { PokerClient, type ClientStatus } from './PokerClient';
import { initialNetState, pokerReducer, selectTableModel, type NetState } from './pokerReducer';

// flush-haus-api defaults to PORT=8080 (src/utils/env.ts).
export const DEFAULT_WS_URL = 'ws://localhost:8080/ws';

export interface PokerActions {
  connect: (url?: string) => void;
  disconnect: () => void;
  createSession: (playerName: string) => void;
  joinSession: (sessionId: string, playerName: string) => void;
  startGame: (smallBlind: number, bigBlind: number, startingChips: number) => void;
  ready: () => void;
  fold: () => void;
  check: () => void;
  call: () => void;
  bet: (amount: number) => void;
  raise: (raiseToAmount: number) => void;
  allIn: () => void;
}

export interface PokerConnection {
  status: ClientStatus;
  net: NetState;
  table: TableModel;
  isOwner: boolean;
  actions: PokerActions;
}

export function usePokerTable(): PokerConnection {
  const [status, setStatus] = useState<ClientStatus>('disconnected');
  const [net, dispatch] = useReducer(pokerReducer, initialNetState);
  const [now, setNow] = useState(() => Date.now());
  const clientRef = useRef<PokerClient | null>(null);

  // Drive the action-timer countdown only while someone is to act.
  useEffect(() => {
    if (!net.acting) {
      return;
    }
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [net.acting]);

  useEffect(() => {
    return () => clientRef.current?.disconnect();
  }, []);

  // Once we know our player id, an auto-reconnect can re-bind to it instead of
  // starting over (PROTOCOLO.md `session reconnect`).
  useEffect(() => {
    clientRef.current?.setResumeCommand(net.selfId ? `session reconnect ${net.selfId}` : null);
  }, [net.selfId]);

  const connect = useCallback((url: string = DEFAULT_WS_URL) => {
    clientRef.current?.disconnect();
    const client = new PokerClient(url, {
      onMessage: (message) => dispatch(message),
      onStatus: setStatus,
    });
    clientRef.current = client;
    client.connect();
  }, []);

  const actions = useMemo<PokerActions>(
    () => ({
      connect,
      disconnect: () => clientRef.current?.disconnect(),
      createSession: (name) => clientRef.current?.sessionCreate(name),
      joinSession: (sessionId, name) => clientRef.current?.sessionJoin(sessionId, name),
      startGame: (sb, bb, chips) => clientRef.current?.sessionStart(sb, bb, chips),
      ready: () => clientRef.current?.gameReady(),
      fold: () => clientRef.current?.gameFold(),
      check: () => clientRef.current?.gameCheck(),
      call: () => clientRef.current?.gameCall(),
      bet: (amount) => clientRef.current?.gameBet(amount),
      raise: (amount) => clientRef.current?.gameRaise(amount),
      allIn: () => clientRef.current?.gameAllIn(),
    }),
    [connect]
  );

  const table = useMemo(() => selectTableModel(net, now), [net, now]);
  const isOwner = Boolean(net.selfId && net.ownerId && net.selfId === net.ownerId);

  return { status, net, table, isOwner, actions };
}
