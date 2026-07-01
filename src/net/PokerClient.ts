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

export class PokerClient {
  private ws: WebSocket | null = null;
  private readonly url: string;
  private readonly handlers: PokerClientHandlers;
  private pingTimer: number | null = null;
  private closedByUser = false;

  constructor(url: string, handlers: PokerClientHandlers) {
    this.url = url;
    this.handlers = handlers;
  }

  connect() {
    this.closedByUser = false;
    this.handlers.onStatus('connecting');

    try {
      this.ws = new WebSocket(this.url);
    } catch {
      this.handlers.onStatus('error');
      return;
    }

    this.ws.onopen = () => {
      this.handlers.onStatus('connected');
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
      this.handlers.onStatus('error');
    };

    this.ws.onclose = () => {
      this.stopHeartbeat();
      this.handlers.onStatus(this.closedByUser ? 'disconnected' : 'error');
    };
  }

  disconnect() {
    this.closedByUser = true;
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
