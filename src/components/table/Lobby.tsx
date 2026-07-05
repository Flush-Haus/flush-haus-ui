import { useState } from 'react';
import type { ClientStatus } from '../../net/PokerClient';
import type { NetState } from '../../net/pokerReducer';
import type { PokerActions } from '../../net/usePokerTable';
import { DEFAULT_WS_URL } from '../../net/usePokerTable';

interface LobbyProps {
  status: ClientStatus;
  net: NetState;
  isOwner: boolean;
  actions: PokerActions;
}

const STATUS_LABEL: Record<ClientStatus, string> = {
  disconnected: 'Desconectado',
  connecting: 'Conectando…',
  connected: 'Conectado',
  error: 'Falha na conexão',
};

// Turn the protocol's ERR_* codes (PROTOCOLO.md §4.2) into readable messages.
const ERROR_LABEL: Record<string, string> = {
  ERR_SESSION_NOT_FOUND: 'Sessão não encontrada — confira o ID.',
  ERR_SESSION_FULL: 'A sessão está cheia.',
  ERR_NOT_OWNER: 'Apenas o anfitrião pode fazer isso.',
  ERR_GAME_ALREADY_STARTED: 'A partida já começou.',
  ERR_GAME_NOT_STARTED: 'A partida ainda não começou.',
  ERR_NOT_YOUR_TURN: 'Não é a sua vez.',
  ERR_INVALID_ACTION: 'Ação inválida.',
  ERR_INVALID_STATE: 'Ação indisponível agora.',
  ERR_INSUFFICIENT_CHIPS: 'Fichas insuficientes.',
  ERR_PLAYER_NOT_IN_SESSION: 'Você não está em uma sessão.',
  ERR_PLAYER_BANNED: 'Você foi banido desta sessão.',
  ERR_INVALID_PARAMS: 'Comando inválido.',
  ERR_UNKNOWN_COMMAND: 'Comando desconhecido.',
};

function errorMessage(code: string): string {
  return ERROR_LABEL[code] ?? code;
}

export default function Lobby({ status, net, isOwner, actions }: LobbyProps) {
  const [url, setUrl] = useState(DEFAULT_WS_URL);
  const [name, setName] = useState('');
  const [joinId, setJoinId] = useState('');
  const [smallBlind, setSmallBlind] = useState(5);
  const [bigBlind, setBigBlind] = useState(10);
  const [startingChips, setStartingChips] = useState(1000);

  // Once a hand is running the lobby steps aside for the table.
  if (net.sessionState === 'running') {
    return null;
  }

  const connected = status === 'connected';
  const inSession = Boolean(net.sessionId);
  const players = net.joinOrder.map((id) => net.players[id]).filter(Boolean);

  return (
    <div className="lobby-overlay">
      <section className="lobby-card">
        <header className="lobby-head">
          <h1 className="lobby-title">♠ Mesa de Poker</h1>
          <span className={`lobby-status status-${status}`}>{STATUS_LABEL[status]}</span>
        </header>

        {net.lastError ? <p className="lobby-error">{errorMessage(net.lastError)}</p> : null}

        {!connected ? (
          <div className="lobby-step">
            <label className="lobby-field">
              <span>Servidor WebSocket</span>
              <input value={url} onChange={(event) => setUrl(event.target.value)} spellCheck={false} />
            </label>
            <button
              type="button"
              className="lobby-primary"
              disabled={status === 'connecting'}
              onClick={() => actions.connect(url)}
            >
              {status === 'connecting' ? 'Conectando…' : status === 'error' ? 'Tentar de novo' : 'Conectar'}
            </button>
            {status === 'error' ? (
              <p className="lobby-hint">
                Sem resposta do servidor. Confira se o <code>flush-haus-api</code> está rodando em{' '}
                <code>{url}</code>.
              </p>
            ) : null}
          </div>
        ) : null}

        {connected && !inSession ? (
          <div className="lobby-step">
            <label className="lobby-field">
              <span>Seu nome</span>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Heitor" />
            </label>

            <button
              type="button"
              className="lobby-primary"
              disabled={!name.trim()}
              onClick={() => actions.createSession(name.trim())}
            >
              Criar sessão
            </button>

            <div className="lobby-divider">ou</div>

            <label className="lobby-field">
              <span>ID da sessão</span>
              <input value={joinId} onChange={(event) => setJoinId(event.target.value)} placeholder="session_000" />
            </label>
            <button
              type="button"
              className="lobby-secondary"
              disabled={!name.trim() || !joinId.trim()}
              onClick={() => actions.joinSession(joinId.trim(), name.trim())}
            >
              Entrar na sessão
            </button>
          </div>
        ) : null}

        {connected && inSession && net.sessionState !== 'closed' ? (
          <div className="lobby-step">
            <div className="lobby-session-id">
              <span className="lobby-field-label">ID da sessão</span>
              <code>{net.sessionId}</code>
            </div>

            <ul className="lobby-players">
              {players.map((player) => (
                <li key={player.id} className={player.id === net.ownerId ? 'is-owner' : ''}>
                  {player.name}
                  {player.id === net.ownerId ? <span className="lobby-tag">anfitrião</span> : null}
                  {player.id === net.selfId ? <span className="lobby-tag">você</span> : null}
                </li>
              ))}
            </ul>

            {isOwner ? (
              <>
                <div className="lobby-blinds">
                  <label className="lobby-field">
                    <span>Small blind</span>
                    <input type="number" value={smallBlind} onChange={(e) => setSmallBlind(Number(e.target.value))} />
                  </label>
                  <label className="lobby-field">
                    <span>Big blind</span>
                    <input type="number" value={bigBlind} onChange={(e) => setBigBlind(Number(e.target.value))} />
                  </label>
                  <label className="lobby-field">
                    <span>Fichas iniciais</span>
                    <input type="number" value={startingChips} onChange={(e) => setStartingChips(Number(e.target.value))} />
                  </label>
                </div>
                <button
                  type="button"
                  className="lobby-primary"
                  onClick={() => actions.startGame(smallBlind, bigBlind, startingChips)}
                >
                  Iniciar partida
                </button>
              </>
            ) : (
              <p className="lobby-waiting">Aguardando o anfitrião iniciar a partida…</p>
            )}
          </div>
        ) : null}

        {net.sessionState === 'closed' ? <p className="lobby-waiting">Sessão encerrada.</p> : null}

        <details className="lobby-net">
          <summary>Redes &amp; TCP — o que isto demonstra</summary>
          <div className="lobby-net-body">
            <p>
              A mesa é sincronizada em tempo real por <strong>WebSocket</strong>, que roda
              sobre <strong>TCP</strong>. É o TCP que garante entrega <em>confiável</em> e{' '}
              <em>ordenada</em>: cada ação (apostar, virar carta, distribuir o pote) chega
              íntegra e na sequência certa, então todos veem a mesma mesa.
            </p>
            <p>
              Este cliente é a <strong>demonstração prática</strong>. O estudo comparativo das
              variantes do TCP (Tahoe, Reno, NewReno, Vegas e SACK) é um{' '}
              <strong>relatório separado</strong> em <code>docs/tcp-comparative-study.md</code>.
            </p>
          </div>
        </details>
      </section>
    </div>
  );
}
