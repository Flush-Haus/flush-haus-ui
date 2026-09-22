import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { TableModel } from '../types/poker';
import { PokerClient, type ClientStatus } from './PokerClient';
import { initialNetState, pokerReducer, selectTableModel, type NetState } from './pokerReducer';

// flush-haus-api defaults to PORT=8080 (src/utils/env.ts).
// The default WebSocket target follows the page itself so a browser opened
// from another machine on the LAN reaches the right host without typing an
// IP: page on localhost -> localhost:8080/ws, page on 192.168.x.x ->
// 192.168.x.x:8080/ws. VITE_POKER_SERVER_URL wins when set.
function defaultWsUrl(): string {
  const override = (import.meta.env.VITE_POKER_SERVER_URL as string | undefined)?.trim();
  if (override) {
    return override;
  }
  if (typeof window !== 'undefined' && window.location.hostname) {
    const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${scheme}://${window.location.hostname}:8080/ws`;
  }
  return 'ws://localhost:8080/ws';
}

export const DEFAULT_WS_URL = defaultWsUrl();

// Production marker: VITE_POKER_SERVER_URL is set only in the production
// build, where the normal flow auto-connects (no manual URL step).
export const AUTO_CONNECT = Boolean(
  (import.meta.env.VITE_POKER_SERVER_URL as string | undefined)?.trim()
);

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

  // Production auto-connect: exactly once on mount, using the configured
  // production backend. Manual connect/disconnect still work afterwards.
  const autoDone = useRef(false);
  useEffect(() => {
    if (AUTO_CONNECT && !autoDone.current) {
      autoDone.current = true;
      connect();
    }
  }, [connect]);

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
