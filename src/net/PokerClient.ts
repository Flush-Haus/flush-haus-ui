// Thin WebSocket client for the plain-text poker protocol.
//
// Each protocol message is a single space-separated line. The server sends one
// message per frame, but we split on newlines defensively. The client is
// framework-agnostic: it emits parsed { domain, action, params } objects and
// exposes typed senders for every client->server command in PROTOCOLO.md.

export interface ServerMessage {
  domain: string; // "session" | "game" | "ok" | "error"
  action: string; // "" for ok/error
  params: string[];
  raw: string;
}

export type ClientStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface PokerClientHandlers {
  onMessage: (message: ServerMessage) => void;
  onStatus: (status: ClientStatus) => void;
}

function parseLine(line: string): ServerMessage | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }

  const tokens = trimmed.split(/\s+/);
  const head = tokens[0];

  if (head === 'ok' || head === 'error') {
    return { domain: head, action: '', params: tokens.slice(1), raw: trimmed };
  }

  return {
    domain: head,
    action: tokens[1] ?? '',
    params: tokens.slice(2),
    raw: trimmed,
  };
}

// A dropped socket that was previously live is retried a few times with
// exponential backoff before giving up; an initial connection that never
// succeeds (server offline) fails fast so the lobby can say so.
const MAX_RECONNECTS = 5;
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 15_000;

export class PokerClient {
  private ws: WebSocket | null = null;
  private readonly url: string;
  private readonly handlers: PokerClientHandlers;
  private pingTimer: number | null = null;
  private reconnectTimer: number | null = null;
  private closedByUser = false;
  private wasConnected = false;
  private reconnectAttempts = 0;
  // When set (once the player has an id), a re-opened socket re-binds to the
  // existing player via `session reconnect` — see PROTOCOLO.md §2.1.
  private resumeCommand: string | null = null;

  constructor(url: string, handlers: PokerClientHandlers) {
    this.url = url;
    this.handlers = handlers;
  }

  /** Lets the app resume its server-side player after an unexpected drop. */
  setResumeCommand(command: string | null) {
    this.resumeCommand = command;
  }

  connect() {
    this.closedByUser = false;
    this.wasConnected = false;
    this.reconnectAttempts = 0;
    this.open();
  }

  private open() {
    this.clearReconnect();
    this.handlers.onStatus('connecting');

    try {
      this.ws = new WebSocket(this.url);
    } catch {
      this.handlers.onStatus('error');
      return;
    }

    this.ws.onopen = () => {
      this.wasConnected = true;
      this.reconnectAttempts = 0;
      this.handlers.onStatus('connected');
      if (this.resumeCommand) {
        this.send(this.resumeCommand);
      }
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      const data = typeof event.data === 'string' ? event.data : '';
      for (const line of data.split('\n')) {
        const message = parseLine(line);
        if (message) {
          this.handlers.onMessage(message);
        }
      }
    };

    this.ws.onerror = () => {
      // onclose always follows; let it decide whether to retry.
    };

    this.ws.onclose = () => {
      this.stopHeartbeat();
      if (this.closedByUser) {
        this.handlers.onStatus('disconnected');
        return;
      }
      // Only retry a socket that had actually connected; a failed first attempt
      // means the server is unreachable, so surface the error immediately.
      if (this.wasConnected && this.reconnectAttempts < MAX_RECONNECTS) {
        this.scheduleReconnect();
      } else {
        this.handlers.onStatus('error');
      }
    };
  }

  private scheduleReconnect() {
    const delay = Math.min(RECONNECT_BASE_MS * 2 ** this.reconnectAttempts, RECONNECT_MAX_MS);
    this.reconnectAttempts += 1;
    this.handlers.onStatus('connecting');
    this.reconnectTimer = window.setTimeout(() => this.open(), delay);
  }

  private clearReconnect() {
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  disconnect() {
    this.closedByUser = true;
    this.clearReconnect();
    this.stopHeartbeat();
    this.ws?.close();
    this.ws = null;
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingTimer = window.setInterval(() => {
      this.send(`session ping ${Date.now()}`);
    }, 15000);
  }

  private stopHeartbeat() {
    if (this.pingTimer !== null) {
      window.clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  send(line: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(line);
    }
  }

  // --- Session commands ---
  sessionCreate(playerName: string) {
    this.send(`session create ${playerName}`);
  }

  sessionJoin(sessionId: string, playerName: string) {
    this.send(`session join ${sessionId} ${playerName}`);
  }

  sessionLeave() {
    this.send('session leave');
  }

  sessionPlayers() {
    this.send('session players');
  }

  sessionInfo() {
    this.send('session info');
  }

  sessionStart(smallBlind: number, bigBlind: number, startingChips: number) {
    this.send(`session start ${smallBlind} ${bigBlind} ${startingChips}`);
  }

  // --- Game commands ---
  gameReady() {
    this.send('game ready');
  }

  gameFold() {
    this.send('game fold');
  }

  gameCheck() {
    this.send('game check');
  }

  gameCall() {
    this.send('game call');
  }

  gameBet(amount: number) {
    this.send(`game bet ${amount}`);
  }

  gameRaise(raiseToAmount: number) {
    this.send(`game raise ${raiseToAmount}`);
  }

  gameAllIn() {
    this.send('game all_in');
  }
}
