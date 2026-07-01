import { useEffect, useRef } from 'react';
import PokerTable from './components/table/PokerTable';
import Lobby from './components/table/Lobby';
import type { ActionBarActions } from './components/table/ActionBar';
import { SAMPLE_TABLE } from './data/sampleTable';
import { usePokerTable } from './net/usePokerTable';
import './table.css';

// ?demo renders the static sample table (every seat state at once) so the
// full layout can be inspected without a server or a second player.
const DEMO = new URLSearchParams(window.location.search).has('demo');
const noop = () => undefined;
const demoActions: ActionBarActions = {
  fold: noop,
  check: noop,
  call: noop,
  bet: noop,
  raise: noop,
  allIn: noop,
};

// Card sandbox preserved in ./CardSandbox for reference; its FlyingCard/DeckStack
// motion primitives are the next layer to graft onto these live state transitions.
export default function App() {
  const { status, net, table, isOwner, actions } = usePokerTable();
  const dealtRef = useRef(false);

  // The server deals a round on the first `game ready`; only the owner sends it
  // (this server has no ready aggregation, so multiple readies would re-deal).
  useEffect(() => {
    if (net.sessionState === 'running' && isOwner && !dealtRef.current) {
      dealtRef.current = true;
      actions.ready();
    }
    if (net.sessionState !== 'running') {
      dealtRef.current = false;
    }
  }, [net.sessionState, isOwner, actions]);

  const showNextHand = net.sessionState === 'running' && !net.handInProgress && isOwner;

  if (DEMO) {
    return <PokerTable table={SAMPLE_TABLE} actions={demoActions} banner="FLUSH HAUS" />;
  }

  return (
    <>
      <PokerTable table={table} actions={actions} banner={net.banner} />
      <Lobby status={status} net={net} isOwner={isOwner} actions={actions} />

      {net.sessionId && net.sessionState !== 'closed' ? (
        <div className="hud">
          <span className={`hud-dot status-${status}`} aria-hidden="true" />
          <span className="hud-text">{net.sessionId}</span>
          {showNextHand ? (
            <button type="button" className="hud-btn" onClick={actions.ready}>
              Próxima mão
            </button>
          ) : null}
          <button type="button" className="hud-btn hud-btn-ghost" onClick={actions.disconnect}>
            Sair
          </button>
        </div>
      ) : null}
    </>
  );
}
