# Flush Haus UI — Pixel-Art Table Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `~/flush-haus-ui` (the poker frontend, moved out of `~/poker-table-prototype`), make it work against the `Flush-Haus/flush-haus-api` server, and restyle the whole screen as pixel art matching the card sprites.

**Architecture:** CSS-only visual rewrite of `src/table.css` (same DOM, same class names) driven by a small pixel vocabulary: flat banded backgrounds (hard-stop gradients), 6×6 SVG-data-URI `border-image` frames for stepped corners + dual borders, hard offset shadows, `steps()` animations. One tiny React change adds a `?demo` URL flag that renders `SAMPLE_TABLE` so every visual state can be screenshotted without multiplayer. The API repo gets a minimal patch restoring the `session start`/`session ping` handlers its refactor dropped.

**Tech Stack:** Vite + React 18 + TypeScript (frontend), Bun + Elysia (server), Google Chrome headless for screenshots.

**Spec:** `docs/superpowers/specs/2026-07-01-pixel-table-redesign-design.md` (copied into this repo by Task 1).

## Global Constraints

- **Never modify** `~/poker-table-prototype` or `~/poker-api` — they stay as the untouched originals.
- Frontend DOM/components unchanged except: `src/App.tsx` (demo mode, Task 3) and `index.html` (title, Task 1). All styling lands in `src/table.css`.
- The wire protocol is defined by `~/flush-haus-api/PROTOCOLO.md` and must not change; frontend `src/net/` is not modified.
- Commit style: conventional and factual (`feat:`, `fix:`, `style:`), **no AI attribution of any kind** (no Co-Authored-By, no "Generated with" lines).
- Every task ends with `npm run build` passing (in `~/flush-haus-ui`) plus the stated screenshot; look at the screenshot before marking the task done.
- Fonts: 'Press Start 2P' (already loaded in `index.html`) for labels/buttons/headings ONLY; player names and numeric amounts keep the system font stack with `font-variant-numeric: tabular-nums`.
- No smooth gradients, no blurred shadows, no `border-radius` (except chips/avatars noted in tasks), no glow effects anywhere in `table.css` when done. Exception: the table rail/felt keep elliptical `border-radius` geometry (approved in spec) and the CRT overlay keeps its vignette.
- Screenshots go to the scratchpad dir, not the repo.
- Dev servers: API `cd ~/flush-haus-api && bun run dev` (port 3000), UI `cd ~/flush-haus-ui && npm run dev` (port 5173). Kill stale ones first: `pkill -f "vite --host" ; pkill -f "bun run --watch"`.

---

### Task 1: Scaffold flush-haus-ui

**Files:**
- Create: `~/flush-haus-ui/` (copy of `~/poker-table-prototype`)
- Modify: `~/flush-haus-ui/package.json` (name), `~/flush-haus-ui/index.html` (title)
- Create: `~/flush-haus-ui/.gitignore`
- Copy: spec into `~/flush-haus-ui/docs/superpowers/specs/`

**Interfaces:**
- Produces: a git-initialized, building copy of the frontend at `~/flush-haus-ui`; all later tasks work only inside it.

- [ ] **Step 1: Copy the project (excluding build artifacts)**

```bash
rsync -a --exclude node_modules --exclude dist --exclude '*.tsbuildinfo' \
  ~/poker-table-prototype/ ~/flush-haus-ui/
mkdir -p ~/flush-haus-ui/docs/superpowers/specs
cp ~/poker-table-prototype/docs/superpowers/specs/2026-07-01-pixel-table-redesign-design.md \
  ~/flush-haus-ui/docs/superpowers/specs/
```

- [ ] **Step 2: Rename package and title**

In `~/flush-haus-ui/package.json` change `"name": "poker-table-prototype"` → `"name": "flush-haus-ui"`.
In `~/flush-haus-ui/index.html` change the `<title>` text to `Flush Haus`.

- [ ] **Step 3: Add .gitignore**

```gitignore
node_modules
dist
*.tsbuildinfo
*.log
```

- [ ] **Step 4: Install and verify build**

Run: `cd ~/flush-haus-ui && npm install && npm run build`
Expected: `vite build` completes with `✓ built in …` and zero TypeScript errors.

- [ ] **Step 5: git init + baseline commit**

```bash
cd ~/flush-haus-ui && git init -b main && git add -A
git commit -m "chore: import poker table frontend as flush-haus-ui"
```

---

### Task 2: Restore session start/ping handlers in flush-haus-api

The GitHub refactor dropped the `session start` and `session ping` ws cases
(`sessionService.startSession` exists but is never called; PROTOCOLO.md §2.1
documents both). Without them the lobby can never start a game and the
client's keepalive gets `ERR` responses.

**Files:**
- Modify: `~/flush-haus-api/src/server/websocket/poker-ws.ts` (inside `handleSessionCommand`)

**Interfaces:**
- Consumes: `sessionService.startSession(sessionId, sb, bb, chips)` from `@/services/session-service` (already exported); `serializeError`, `serializeOk` already imported in the file.
- Produces: server responses `session started <sb> <bb> <chips>` (broadcast) and `session pong <clientMs> <serverMs>`, exactly as the local `~/poker-api` emits them.

- [ ] **Step 1: Write the failing smoke test (bun script, ws client)**

Create `/tmp/claude-1000/-home-fellipe/6e8eb34a-136c-4a06-a6ea-8408ff36a1cd/scratchpad/ws-smoke.ts`:

```ts
// Smoke: create session, start it, ping. Exits 0 only if all expected replies arrive.
const url = "ws://localhost:3000/ws";
const expect = ["session created", "session started", "session pong"];
const got: string[] = [];
const ws = new WebSocket(url);
const timer = setTimeout(() => { console.error("TIMEOUT. got:", got); process.exit(1); }, 4000);
ws.onopen = () => ws.send("session create Tester");
ws.onmessage = (e) => {
  const line = String(e.data);
  got.push(line);
  if (line.startsWith("session created")) {
    ws.send("session start 5 10 1000");
  } else if (line.startsWith("session started")) {
    ws.send("session ping 1751400000000");
  } else if (line.startsWith("session pong")) {
    clearTimeout(timer);
    console.log("OK:", got.filter(l => expect.some(p => l.startsWith(p))));
    process.exit(0);
  } else if (line.startsWith("ERR")) {
    console.error("ERR reply:", line, "got so far:", got);
    clearTimeout(timer); process.exit(1);
  }
};
```

- [ ] **Step 2: Run it against the unpatched server to verify it fails**

```bash
pkill -f "bun run --watch" 2>/dev/null; cd ~/flush-haus-api && (bun run dev &) && sleep 2
bun /tmp/claude-1000/-home-fellipe/6e8eb34a-136c-4a06-a6ea-8408ff36a1cd/scratchpad/ws-smoke.ts
```

Expected: exit 1 with an `ERR` reply (unknown action) or timeout after `session start`.

- [ ] **Step 3: Add the two cases**

In `~/flush-haus-api/src/server/websocket/poker-ws.ts`, inside
`handleSessionCommand`'s `switch (action)`, after the `"info"` case, add
(mirroring the local `~/poker-api/src/server/websocket/pokerWs.ts:83-112`
behavior, adapted to the kebab-case imports already in this file):

```ts
    case "start": {
      const playerId = wsToPlayer.get(ws);
      const session = playerId ? sessionService.getSessionByPlayer(playerId) : undefined;
      if (!session || session.ownerId !== playerId) {
        ws.send(serializeError(text, "ERR_NOT_OWNER", []));
        break;
      }
      const [sb, bb, chips] = params.map(Number);
      const ok = sessionService.startSession(session.id, sb || 0, bb || 0, chips || 0);
      if (!ok) {
        ws.send(serializeError(text, "ERR_INVALID_STATE", []));
        break;
      }
      const started = `session started ${sb} ${bb} ${chips}`;
      for (const p of session.players) {
        p.ws?.send(started);
      }
      ws.send(serializeOk(text));
      break;
    }
    case "ping": {
      const [clientMs] = params;
      ws.send(`session pong ${clientMs} ${Date.now()}`);
      break;
    }
```

Before committing, open the local `~/poker-api/src/server/websocket/pokerWs.ts:83-112`
and the flush-haus-api `session-service.ts` `startSession` signature side by side;
if names differ (e.g. `getSessionByPlayer` doesn't exist), use the accessor this
repo actually exports — the wire strings above are the contract, not the helper names.

- [ ] **Step 4: Re-run smoke to verify it passes**

```bash
bun /tmp/claude-1000/-home-fellipe/6e8eb34a-136c-4a06-a6ea-8408ff36a1cd/scratchpad/ws-smoke.ts
```

Expected: exit 0, `OK: [ 'session created …', 'session started 5 10 1000', 'session pong …' ]`.

- [ ] **Step 5: Commit on a branch (do NOT push without user confirmation)**

```bash
cd ~/flush-haus-api && git checkout -b fix/session-start-ping
git add src/server/websocket/poker-ws.ts
git commit -m "fix: restore session start and ping handlers per PROTOCOLO"
```

---

### Task 3: Demo mode (`?demo`) for visual verification

**Files:**
- Modify: `~/flush-haus-ui/src/App.tsx`

**Interfaces:**
- Consumes: `SAMPLE_TABLE` from `./data/sampleTable`, `PokerTable` props (`table`, `actions?`, `banner?`), `ActionBarActions` from `./components/table/ActionBar`.
- Produces: `http://localhost:5173/?demo` renders the full static table (all seat states + action bar); all later tasks screenshot this URL.

- [ ] **Step 1: Add the demo branch to App.tsx**

At the top of `~/flush-haus-ui/src/App.tsx` add imports and a module-level stub:

```tsx
import { SAMPLE_TABLE } from './data/sampleTable';
import type { ActionBarActions } from './components/table/ActionBar';

const DEMO = new URLSearchParams(window.location.search).has('demo');
const noop = () => undefined;
const demoActions: ActionBarActions = {
  fold: noop, check: noop, call: noop, bet: noop, raise: noop, allIn: noop,
};
```

Then as the first statement inside `App()`... **no** — hooks must run unconditionally; instead put the early return AFTER the existing hook calls, before the regular `return`:

```tsx
  if (DEMO) {
    return <PokerTable table={SAMPLE_TABLE} actions={demoActions} banner="FLUSH HAUS" />;
  }
```

- [ ] **Step 2: Build + screenshot to verify demo renders**

```bash
cd ~/flush-haus-ui && npm run build && (npm run dev >/dev/null 2>&1 &) && sleep 3
google-chrome-stable --headless=new --window-size=1600,900 --virtual-time-budget=8000 \
  --screenshot=/tmp/claude-1000/-home-fellipe/6e8eb34a-136c-4a06-a6ea-8408ff36a1cd/scratchpad/t3-demo-before.png \
  "http://localhost:5173/?demo"
```

Expected: build passes; screenshot shows the table mid-hand: hero with AS/KH face up, a bettor, an all-in, folded seats, dealer/blind badges, pot 1250, flop AH 9C 2D, action bar visible. This is the "before" reference image.

- [ ] **Step 3: Commit**

```bash
cd ~/flush-haus-ui && git add src/App.tsx
git commit -m "feat: add ?demo flag rendering the sample table"
```

---

### Task 4: Pixel foundation — tokens, frames, background

**Files:**
- Modify: `~/flush-haus-ui/src/table.css:1-46` (the header comment + entire `.poker-room` rule)

**Interfaces:**
- Produces (consumed by every later task): custom properties `--px`, `--px2`, `--px3`, `--felt-1/2/3`, `--felt-line`, `--wood-1/2/2b/3`, `--gold-1/2`, `--gold-ink`, `--outline`, `--ink`, `--ink-muted`, `--plate`, `--plate-line`, `--shadow`, `--font-pixel`, `--frame-plate`, `--frame-gold`, `--clip-step`, plus the untouched `--avatar-size`, `--hole-card-w`, `--hero-card-w`, `--board-card-w` and `--z-*` scale.

- [ ] **Step 1: Replace the file header and `.poker-room` block**

Replace `table.css` lines 1–46 with:

```css
/* Flush Haus — pixel-art 9-max poker table.
   Matches the card sprites: flat banded color (hard-stop gradients only),
   pixel border frames (6×6 SVG border-image, stepped corners), hard offset
   shadows, steps() motion. No blur, no smooth gradients, no border-radius
   (exceptions: the table oval geometry, chip/avatar discs). */

.poker-room {
  /* one art pixel */
  --px: 2px;
  --px2: calc(var(--px) * 2);
  --px3: calc(var(--px) * 3);

  /* palette bands */
  --felt-1: #1c7a4c;
  --felt-2: #135939;
  --felt-3: #0a3a25;
  --felt-line: #051f14;
  --wood-1: #6b4527;
  --wood-2: #462c19;
  --wood-2b: #331e10;
  --wood-3: #24140b;
  --gold-1: #f5cd76;
  --gold-2: #e0a83a;
  --gold-ink: #1a1206;
  --outline: #070b08;
  --ink: #f4ecd8;
  --ink-muted: rgba(244, 236, 216, 0.62);
  --plate: #0d1611;
  --plate-line: #57492a;
  --shadow: rgba(0, 0, 0, 0.55);
  --font-pixel: 'Press Start 2P', ui-monospace, monospace;

  /* 6×6 pixel frames, border-image-slice 2: dark outer line + light inner
     line with 1-step corners. Pair with:
       border: var(--px2) solid transparent;
       border-image: var(--frame-plate) 2;
       background: <fill> padding-box;  */
  --frame-plate: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 6 6' shape-rendering='crispEdges'%3E%3Cpath fill='%2357492a' d='M2 1h2v1H2zM2 4h2v1H2zM1 2h1v2H1zM4 2h1v2H4z'/%3E%3Cpath fill='%23070b08' d='M2 0h2v1H2zM2 5h2v1H2zM0 2h1v2H0zM5 2h1v2H5zM1 1h1v1H1zM4 1h1v1H4zM1 4h1v1H4zM1 4h1v1H1zM4 4h1v1H4z'/%3E%3C/svg%3E");
  --frame-gold: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 6 6' shape-rendering='crispEdges'%3E%3Cpath fill='%23f5cd76' d='M2 1h2v1H2zM2 4h2v1H2zM1 2h1v2H1zM4 2h1v2H4z'/%3E%3Cpath fill='%23070b08' d='M2 0h2v1H2zM2 5h2v1H2zM0 2h1v2H0zM5 2h1v2H5zM1 1h1v1H1zM4 1h1v1H4zM1 4h1v1H1zM4 4h1v1H4z'/%3E%3C/svg%3E");

  /* single-step pixel corner for flat, unframed elements */
  --clip-step: polygon(
    0 var(--px2), var(--px2) var(--px2), var(--px2) 0,
    calc(100% - var(--px2)) 0, calc(100% - var(--px2)) var(--px2), 100% var(--px2),
    100% calc(100% - var(--px2)),
    calc(100% - var(--px2)) calc(100% - var(--px2)),
    calc(100% - var(--px2)) 100%, var(--px2) 100%,
    var(--px2) calc(100% - var(--px2)), 0 calc(100% - var(--px2))
  );

  --avatar-size: clamp(34px, 3.6vw, 46px);
  --hole-card-w: clamp(30px, 3.1vw, 46px);
  --hero-card-w: clamp(56px, 5.4vw, 84px);
  --board-card-w: clamp(48px, 5vw, 76px);

  --z-felt: 1;
  --z-board: 5;
  --z-bet: 6;
  --z-hole: 8;
  --z-pod: 10;
  --z-badge: 12;
  --z-action: 30;
  --z-crt: 50;

  position: relative;
  display: grid;
  place-items: center;
  width: 100vw;
  min-height: 100vh;
  overflow: hidden;
  background: radial-gradient(ellipse at 50% 45%, #0a1410 0 34%, #071009 34% 62%, #050a07 62% 100%);
  isolation: isolate;
  image-rendering: pixelated;
}
```

Note the room background is now three flat bands (hard stops), not a smooth radial.

- [ ] **Step 2: Fix the duplicated rect in --frame-plate**

The `--frame-plate` dark path above contains an accidental duplicate segment
(`M1 4h1v1H4zM1 4h1v1H1z`). Use exactly this dark `d` for BOTH frames:
`M2 0h2v1H2zM2 5h2v1H2zM0 2h1v2H0zM5 2h1v2H5zM1 1h1v1H1zM4 1h1v1H4zM1 4h1v1H1zM4 4h1v1H4z`

- [ ] **Step 3: Build + screenshot**

```bash
cd ~/flush-haus-ui && npm run build
google-chrome-stable --headless=new --window-size=1600,900 --virtual-time-budget=8000 \
  --screenshot=/tmp/claude-1000/-home-fellipe/6e8eb34a-136c-4a06-a6ea-8408ff36a1cd/scratchpad/t4-foundation.png \
  "http://localhost:5173/?demo"
```

Expected: build passes; page renders with visibly banded (stepped) background rings instead of a smooth fade. Components still look old — fine.

- [ ] **Step 4: Commit**

```bash
cd ~/flush-haus-ui && git add src/table.css
git commit -m "style: pixel design tokens, border-image frames, banded stage"
```

---

### Task 5: Rail, felt, and CRT overlay

**Files:**
- Modify: `~/flush-haus-ui/src/table.css` — rules `.table-rail`, `.felt`, `.felt-dither`, `.felt-spot`, `.felt-mark`, `.crt-overlay`

**Interfaces:**
- Consumes: Task 4 tokens.
- Produces: nothing consumed later; visual only.

- [ ] **Step 1: Replace the table + felt rules**

```css
.table-rail {
  position: relative;
  width: min(1180px, 94vw);
  height: min(640px, 76vh);
  border-radius: clamp(150px, 26vw, 340px);
  background: linear-gradient(
    180deg,
    var(--wood-1) 0 12%,
    var(--wood-2) 12% 55%,
    var(--wood-2b) 55% 78%,
    var(--wood-3) 78% 100%
  );
  box-shadow:
    0 0 0 var(--px) var(--outline),
    0 var(--px3) 0 rgba(0, 0, 0, 0.65);
  z-index: var(--z-felt);
}

.felt {
  position: absolute;
  inset: clamp(14px, 1.7vw, 24px);
  border-radius: inherit;
  overflow: hidden;
  background: radial-gradient(
    ellipse at 50% 42%,
    var(--felt-1) 0 32%,
    var(--felt-2) 32% 60%,
    var(--felt-3) 60% 100%
  );
  box-shadow:
    inset 0 0 0 var(--px) var(--outline),
    inset 0 0 0 var(--px3) var(--felt-line);
}

/* Ordered-dither texture: hard checker sized in art pixels. */
.felt-dither {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.4;
  mix-blend-mode: soft-light;
  background-image: repeating-conic-gradient(
    rgba(255, 255, 255, 0.05) 0% 25%,
    rgba(0, 0, 0, 0.06) 0% 50%
  );
  background-size: var(--px2) var(--px2);
  image-rendering: pixelated;
}

.felt-spot {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(
    ellipse at 50% 40%,
    rgba(245, 205, 118, 0.09) 0 32%,
    transparent 32%
  );
}

.felt-mark {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: clamp(120px, 20vw, 240px);
  line-height: 1;
  color: rgba(255, 255, 255, 0.05);
  pointer-events: none;
  user-select: none;
}
```

- [ ] **Step 2: Retune the CRT overlay (keep vignette)**

```css
.crt-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: var(--z-crt);
  background:
    repeating-linear-gradient(
      0deg,
      rgba(0, 0, 0, 0.14) 0px,
      rgba(0, 0, 0, 0.14) 1px,
      transparent 1px,
      transparent 4px
    ),
    radial-gradient(ellipse at center, transparent 58%, rgba(0, 0, 0, 0.5) 100%);
  mix-blend-mode: multiply;
  opacity: 0.45;
}
```

- [ ] **Step 3: Build + screenshot, inspect**

Same build+screenshot commands, output `t5-rail-felt.png`.
Expected: felt shows three flat green rings softened by dither; rail shows flat wood bands with a hard black outline and a solid dark block shadow below; no blurry halo around the table.

- [ ] **Step 4: Commit**

```bash
cd ~/flush-haus-ui && git add src/table.css
git commit -m "style: banded rail and felt, pixel dither, retuned scanlines"
```

---

### Task 6: Center — board slots, cards' shadow, pot, chips, badges

**Files:**
- Modify: `~/flush-haus-ui/src/table.css` — `.board-slot`, `.board-slot.is-empty`, `.board-slot-label`, `.tbl-card`, `.pot`, `.pot-label`, `.pot-side`, `.chip`, `.chip-stack-amount`, `.badge`, `.badge-dealer`, `.badge-blind`

**Interfaces:**
- Consumes: Task 4 tokens; `.chip` keeps consuming `--chip-color`, `--chip-ring`, `--chip-size` set inline by `Chip.tsx` — do not rename them.

- [ ] **Step 1: Board slots and card shadows**

```css
.board-slot {
  width: var(--board-card-w);
  height: calc(var(--board-card-w) * 1.4);
  border-radius: 0;
  display: grid;
  place-items: center;
}

/* Pixel-dashed outline: four hard dash strips, one per edge. */
.board-slot.is-empty {
  background:
    repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.16) 0 var(--px2), transparent var(--px2) calc(var(--px2) * 2)) top / 100% var(--px) no-repeat,
    repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.16) 0 var(--px2), transparent var(--px2) calc(var(--px2) * 2)) bottom / 100% var(--px) no-repeat,
    repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.16) 0 var(--px2), transparent var(--px2) calc(var(--px2) * 2)) left / var(--px) 100% no-repeat,
    repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.16) 0 var(--px2), transparent var(--px2) calc(var(--px2) * 2)) right / var(--px) 100% no-repeat,
    rgba(0, 0, 0, 0.22);
}

.board-slot-label {
  font-family: var(--font-pixel);
  font-size: 0.42rem;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.24);
}

.tbl-card {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
  image-rendering: pixelated;
  filter: drop-shadow(0 var(--px2) 0 rgba(0, 0, 0, 0.4));
}
```

- [ ] **Step 2: Pot plate**

```css
.pot {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px 5px 10px;
  border: var(--px2) solid transparent;
  border-image: var(--frame-gold) 2;
  background: rgba(6, 12, 9, 0.88) padding-box;
  border-radius: 0;
  box-shadow: 0 var(--px2) 0 var(--shadow);
}

.pot-label {
  font-family: var(--font-pixel);
  font-size: 0.5rem;
  color: var(--gold-1);
}

.pot-side {
  display: inline-flex;
  gap: 6px;
  font-size: 0.62rem;
  color: var(--ink-muted);
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 3: Flat pixel chips**

```css
/* Flat pixel disc: rim dashes (hard conic), flat center, hard outline. */
.chip {
  display: block;
  width: var(--chip-size, 22px);
  height: var(--chip-size, 22px);
  border-radius: 50%;
  background:
    radial-gradient(circle, var(--chip-color, #c0392b) 0 58%, transparent 58% 100%),
    repeating-conic-gradient(#f6efdc 0 24deg, var(--chip-ring, #7e2118) 24deg 60deg);
  box-shadow:
    0 0 0 var(--px) var(--outline),
    inset 0 calc(var(--px) * -1) 0 rgba(0, 0, 0, 0.28);
  image-rendering: pixelated;
}

.chip-stack-amount {
  font-size: 0.74rem;
  font-weight: 800;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
  text-shadow: 1px 1px 0 #000;
}
```

(`.chip-stack` and `.chip-stack-discs` rules stay as they are.)

- [ ] **Step 4: Badges**

```css
.badge {
  display: grid;
  place-items: center;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  margin-left: auto;
  font-family: var(--font-pixel);
  font-size: 0.44rem;
  border: var(--px) solid var(--outline);
  border-radius: 0;
  z-index: var(--z-badge);
}

.badge-dealer {
  color: var(--outline);
  background: #f6efdc;
  box-shadow: 0 var(--px) 0 var(--shadow);
}

.badge-blind {
  color: var(--ink);
  background: var(--plate);
}

.blind-BB {
  color: var(--gold-1);
}
```

- [ ] **Step 5: Build + screenshot `t6-center.png`, inspect**

Expected: pot is a gold-framed rectangular plate; chips read flat with rim dashes and hard outline; empty board slots show pixel dashes; card shadows are hard-edged.

- [ ] **Step 6: Commit**

```bash
cd ~/flush-haus-ui && git add src/table.css
git commit -m "style: pixel pot plate, flat chips, dashed board slots, square badges"
```

---

### Task 7: Seats — pods, avatars, states, timer

**Files:**
- Modify: `~/flush-haus-ui/src/table.css` — `.pod`, `.avatar`, `.pod-name`, `.pod-stack`, `.seat.is-to-act .pod`, `.pod-progress`, `.seat-action`, `.seat.is-folded`, `.seat.is-allin .pod`, `.seat.is-allin .seat-action`, `.seat.is-empty .pod-empty`, `.pod-empty-label`, `@keyframes podPulse` → `podBlink`

**Interfaces:**
- Consumes: Task 4 tokens; `.avatar` keeps consuming `--avatar-hue` set inline by `Seat.tsx`; `.pod-progress` keeps consuming `--timer`.

- [ ] **Step 1: Pod frame + avatar**

```css
.pod {
  position: relative;
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: clamp(104px, 12vw, 150px);
  padding: 6px 12px 6px 7px;
  border: var(--px2) solid transparent;
  border-image: var(--frame-plate) 2;
  background: var(--plate) padding-box;
  border-radius: 0;
  box-shadow: 0 var(--px2) 0 var(--shadow);
  overflow: visible;
  z-index: var(--z-pod);
}

/* Two flat tones, top-lit, stepped corners. */
.avatar {
  display: grid;
  place-items: center;
  width: var(--avatar-size);
  height: var(--avatar-size);
  flex: none;
  border-radius: 0;
  clip-path: var(--clip-step);
  font-size: 0.78rem;
  font-weight: 800;
  color: #0a0a0a;
  background: linear-gradient(
    180deg,
    oklch(0.78 0.13 var(--avatar-hue, 40)) 0 50%,
    oklch(0.58 0.14 var(--avatar-hue, 40)) 50% 100%
  );
  box-shadow: inset 0 0 0 var(--px) rgba(0, 0, 0, 0.35);
}

.pod-name {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 1px 1px 0 #000;
}

.pod-stack {
  font-size: 0.78rem;
  font-weight: 800;
  color: var(--gold-1);
  font-variant-numeric: tabular-nums;
  text-shadow: 1px 1px 0 #000;
}
```

Note `overflow: visible` (was `hidden`): the border-image steps render in the
border area and must not be clipped; `.pod-progress` moves inside padding box
(next step) so nothing else escapes.

- [ ] **Step 2: Active state — gold frame + 2-frame blink; chunky timer**

```css
.seat.is-to-act .pod {
  border-image: var(--frame-gold) 2;
  animation: podBlink 0.9s steps(2, jump-none) infinite;
}

.pod-progress {
  position: absolute;
  left: 0;
  bottom: 0;
  height: var(--px2);
  width: calc(var(--timer, 0) * 100%);
  background: var(--gold-1);
}
```

Replace `@keyframes podPulse` (and its name in the reduced-motion block) with:

```css
@keyframes podBlink {
  0%, 100% { filter: brightness(1); }
  50% { filter: brightness(1.3); }
}
```

- [ ] **Step 3: Action label, folded/all-in, empty seat**

```css
.seat-action {
  padding: 2px 8px;
  font-family: var(--font-pixel);
  font-size: 0.46rem;
  color: var(--ink-muted);
  background: rgba(0, 0, 0, 0.6);
  border: var(--px) solid var(--outline);
  border-radius: 0;
}

.seat.is-folded {
  opacity: 0.42;
  filter: grayscale(0.5);
}

.seat.is-allin .pod {
  border-image: var(--frame-gold) 2;
}

.seat.is-allin .seat-action {
  color: var(--gold-ink);
  background: var(--gold-2);
  border-color: var(--outline);
}

.seat.is-empty .pod-empty {
  display: grid;
  place-items: center;
  min-width: clamp(104px, 12vw, 150px);
  min-height: calc(var(--avatar-size) + 12px);
  background:
    repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.14) 0 var(--px2), transparent var(--px2) calc(var(--px2) * 2)) top / 100% var(--px) no-repeat,
    repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.14) 0 var(--px2), transparent var(--px2) calc(var(--px2) * 2)) bottom / 100% var(--px) no-repeat,
    repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.14) 0 var(--px2), transparent var(--px2) calc(var(--px2) * 2)) left / var(--px) 100% no-repeat,
    repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.14) 0 var(--px2), transparent var(--px2) calc(var(--px2) * 2)) right / var(--px) 100% no-repeat,
    rgba(0, 0, 0, 0.3);
  border: none;
  border-radius: 0;
}

.pod-empty-label {
  font-family: var(--font-pixel);
  font-size: 0.46rem;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.32);
}
```

- [ ] **Step 4: Build + screenshot `t7-seats.png`, inspect**

Expected: pods are framed pixel panels with hard drop shadows; hero seat blinks gold in two discrete frames (screenshot catches one); folded seats dim; all-in pod gold-framed with gold action tag; empty seats pixel-dashed.

- [ ] **Step 5: Commit**

```bash
cd ~/flush-haus-ui && git add src/table.css
git commit -m "style: pixel seat pods, flat avatars, stepped active blink"
```

---

### Task 8: Action bar — panel, buttons, quick-bets, slider

**Files:**
- Modify: `~/flush-haus-ui/src/table.css` — `.action-bar`, `.quick-bet`, `.quick-bet.is-active`, `.bet-slider` (+ new thumb/track pseudo-element rules), `.bet-readout`, `.act`, `.act:hover`, `.act:active`, `.act-sub`, `.act-fold`, `.act-call`, `.act-raise`

**Interfaces:**
- Consumes: Task 4 tokens.

- [ ] **Step 1: Panel and buttons**

```css
.action-bar {
  position: fixed;
  right: clamp(16px, 2vw, 30px);
  bottom: clamp(16px, 2.6vh, 30px);
  left: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: min(440px, 44vw);
  padding: 12px 14px;
  border: var(--px2) solid transparent;
  border-image: var(--frame-plate) 2;
  background: rgba(10, 16, 12, 0.95) padding-box;
  border-radius: 0;
  box-shadow: 0 var(--px3) 0 var(--shadow);
  z-index: var(--z-action);
}

.act {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 8px;
  font-family: var(--font-pixel);
  font-size: 0.58rem;
  color: #0a0a0a;
  border: var(--px2) solid transparent;
  border-image: var(--frame-plate) 2;
  border-radius: 0;
  cursor: pointer;
  box-shadow: 0 var(--px2) 0 var(--outline);
  transition: none;
}

.act:hover {
  filter: brightness(1.12);
  transform: none;
}

.act:active {
  transform: translateY(var(--px2));
  box-shadow: 0 0 0 var(--outline);
}

.act-sub {
  font-size: 0.46rem;
  opacity: 0.85;
  font-variant-numeric: tabular-nums;
}

.act-fold {
  color: var(--ink);
  background: linear-gradient(180deg, #55282c 0 50%, #34181b 50% 100%) padding-box;
}

.act-call {
  color: #06130c;
  background: linear-gradient(180deg, #4fd08a 0 50%, #2fa264 50% 100%) padding-box;
}

.act-raise {
  color: var(--gold-ink);
  background: linear-gradient(180deg, #ffe08a 0 50%, var(--gold-2) 50% 100%) padding-box;
}
```

- [ ] **Step 2: Quick-bets and slider**

```css
.quick-bet {
  flex: 1;
  padding: 7px 4px;
  font-family: var(--font-pixel);
  font-size: 0.46rem;
  color: var(--ink-muted);
  border: var(--px) solid var(--plate-line);
  background: rgba(0, 0, 0, 0.35);
  border-radius: 0;
  cursor: pointer;
  transition: none;
}

.quick-bet:hover {
  color: var(--ink);
  border-color: var(--gold-2);
}

.quick-bet.is-active {
  color: var(--gold-1);
  border-color: var(--gold-1);
  background: rgba(245, 205, 118, 0.12);
}

.bet-slider {
  flex: 1;
  appearance: none;
  height: var(--px2);
  background: var(--outline);
  outline: none;
}

.bet-slider::-webkit-slider-thumb {
  appearance: none;
  width: 14px;
  height: 22px;
  background: var(--gold-1);
  border: var(--px) solid var(--outline);
  border-radius: 0;
  cursor: pointer;
}

.bet-slider::-moz-range-thumb {
  width: 14px;
  height: 22px;
  background: var(--gold-1);
  border: var(--px) solid var(--outline);
  border-radius: 0;
  cursor: pointer;
}

.bet-slider::-moz-range-track {
  height: var(--px2);
  background: var(--outline);
}

.bet-readout {
  min-width: 64px;
  text-align: right;
  font-size: 0.92rem;
  font-weight: 800;
  color: var(--gold-1);
  font-variant-numeric: tabular-nums;
  text-shadow: 1px 1px 0 #000;
}
```

(Also delete the old `accent-color` line — thumb is now custom.)

- [ ] **Step 3: Build + screenshot `t8-actionbar.png`, inspect**

Expected: action bar is a pixel panel; Desistir/Pagar/Aumentar are chunky pixel-font buttons with a hard dark bottom edge; quick-bets are flat tabs; slider has a square gold thumb on a dark bar.

- [ ] **Step 4: Commit**

```bash
cd ~/flush-haus-ui && git add src/table.css
git commit -m "style: pixel action bar with pressable buttons and square slider"
```

---

### Task 9: HUD, banner, lobby

**Files:**
- Modify: `~/flush-haus-ui/src/table.css` — `.table-banner`, `.hud`, `.hud-dot` (+status variants), `.hud-btn`, `.hud-btn-ghost`, `.lobby-card`, `.lobby-error`, `.lobby-field input`, `.lobby-field input:focus`, `.lobby-primary`, `.lobby-secondary`, `.lobby-players li`, `.lobby-tag`

**Interfaces:**
- Consumes: Task 4 tokens.

- [ ] **Step 1: Banner and HUD**

```css
.table-banner {
  font-family: var(--font-pixel);
  font-size: 0.56rem;
  line-height: 1.6;
  color: var(--gold-ink);
  background: linear-gradient(180deg, #ffe08a 0 50%, var(--gold-2) 50% 100%) padding-box;
  border: var(--px2) solid transparent;
  border-image: var(--frame-gold) 2;
  padding: 8px 14px;
  border-radius: 0;
  box-shadow: 0 var(--px2) 0 var(--shadow);
  text-align: center;
  max-width: 60vw;
}

.hud {
  position: fixed;
  top: clamp(10px, 2vh, 18px);
  left: clamp(10px, 2vw, 18px);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  font-size: 0.78rem;
  color: var(--ink);
  border: var(--px2) solid transparent;
  border-image: var(--frame-plate) 2;
  background: rgba(6, 12, 9, 0.92) padding-box;
  border-radius: 0;
  z-index: var(--z-action);
}

.hud-dot {
  width: 9px;
  height: 9px;
  border-radius: 0;
  background: #666;
  border: 1px solid var(--outline);
}

.hud-dot.status-connected { background: #4fd08a; box-shadow: none; }
.hud-dot.status-connecting { background: var(--gold-2); }
.hud-dot.status-error { background: #e0564a; }

.hud-btn {
  padding: 6px 10px;
  font-family: var(--font-pixel);
  font-size: 0.46rem;
  color: var(--gold-ink);
  background: linear-gradient(180deg, #ffe08a 0 50%, var(--gold-2) 50% 100%);
  border: var(--px) solid var(--outline);
  border-radius: 0;
  box-shadow: 0 var(--px) 0 var(--outline);
  cursor: pointer;
}

.hud-btn:active { transform: translateY(var(--px)); box-shadow: none; }

.hud-btn-ghost {
  color: var(--ink-muted);
  background: rgba(255, 255, 255, 0.05);
  border: var(--px) solid var(--plate-line);
}
```

- [ ] **Step 2: Lobby**

```css
.lobby-card {
  width: min(420px, 94vw);
  padding: 22px;
  color: var(--ink);
  border: var(--px3) solid transparent;
  border-image: var(--frame-plate) 2;
  background: #0b120e padding-box;
  border-radius: 0;
  box-shadow: 0 var(--px3) 0 rgba(0, 0, 0, 0.7);
}

.lobby-error {
  margin: 0 0 12px;
  padding: 6px 10px;
  font-size: 0.74rem;
  color: #ffb3ab;
  background: rgba(120, 40, 34, 0.4);
  border: var(--px) solid #a04338;
  border-radius: 0;
}

.lobby-field input {
  padding: 9px 11px;
  font: inherit;
  font-size: 0.9rem;
  color: var(--ink);
  background: rgba(0, 0, 0, 0.4);
  border: var(--px) solid var(--plate-line);
  border-radius: 0;
}

.lobby-field input:focus {
  outline: none;
  border-color: var(--gold-1);
}

.lobby-primary,
.lobby-secondary {
  padding: 12px;
  font-family: var(--font-pixel);
  font-size: 0.55rem;
  border-radius: 0;
  cursor: pointer;
  box-shadow: 0 var(--px) 0 var(--outline);
}

.lobby-primary {
  color: var(--gold-ink);
  background: linear-gradient(180deg, #ffe08a 0 50%, var(--gold-2) 50% 100%);
  border: var(--px) solid var(--outline);
}

.lobby-primary:active,
.lobby-secondary:active {
  transform: translateY(var(--px));
  box-shadow: none;
}

.lobby-secondary {
  color: var(--ink);
  background: rgba(255, 255, 255, 0.06);
  border: var(--px) solid var(--plate-line);
}

.lobby-players li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  font-size: 0.84rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0;
}

.lobby-tag {
  padding: 2px 6px;
  font-family: var(--font-pixel);
  font-size: 0.42rem;
  color: var(--gold-1);
  background: rgba(245, 205, 118, 0.14);
  border: 1px solid var(--gold-2);
  border-radius: 0;
}
```

(Keep `.lobby-overlay`, `.lobby-head`, `.lobby-title`, `.lobby-status*`, `.lobby-step`, `.lobby-field`, `.lobby-divider`, `.lobby-session-id*`, `.lobby-blinds`, `.lobby-waiting` as they are — they're layout/typography that already fits; `.lobby-title` is already pixel font.)

- [ ] **Step 3: Build + screenshot lobby (no `?demo`) `t9-lobby.png`, inspect**

```bash
google-chrome-stable --headless=new --window-size=1600,900 --virtual-time-budget=8000 \
  --screenshot=/tmp/claude-1000/-home-fellipe/6e8eb34a-136c-4a06-a6ea-8408ff36a1cd/scratchpad/t9-lobby.png \
  "http://localhost:5173/"
```

Expected: lobby is a pixel-framed panel with pixel-font Conectar button; if the API from Task 2 is running, the HUD/status shows connected after joining — at minimum the lobby itself must render the new style.

- [ ] **Step 4: Commit**

```bash
cd ~/flush-haus-ui && git add src/table.css
git commit -m "style: pixel hud, banner and lobby panels"
```

---

### Task 10: Responsive + reduced motion + full sweep

**Files:**
- Modify: `~/flush-haus-ui/src/table.css` — the `@media (max-width: 760px)` block, the `@media (prefers-reduced-motion: reduce)` block

**Interfaces:** none new.

- [ ] **Step 1: Update media blocks**

In the 760px block, keep existing overrides and add pixel-font size bumps:

```css
@media (max-width: 760px) {
  .poker-room {
    --px: 2px;
    --avatar-size: clamp(28px, 8vw, 38px);
    --hole-card-w: clamp(22px, 7vw, 34px);
    --hero-card-w: clamp(44px, 13vw, 64px);
    --board-card-w: clamp(38px, 11vw, 56px);
  }

  .table-rail {
    width: 96vw;
    height: 70vh;
    border-radius: clamp(90px, 30vw, 200px);
  }

  .pod {
    min-width: clamp(78px, 26vw, 120px);
    padding: 4px 8px 4px 5px;
    gap: 6px;
  }

  .pod-name,
  .pod-stack {
    font-size: 0.68rem;
  }

  .act {
    font-size: 0.5rem;
    padding: 10px 6px;
  }

  .action-bar {
    left: 50%;
    right: auto;
    bottom: 10px;
    transform: translateX(-50%);
    width: min(440px, 94vw);
  }
}

@media (prefers-reduced-motion: reduce) {
  .seat.is-to-act .pod {
    animation: none;
  }
}
```

- [ ] **Step 2: Grep-audit for leftovers**

```bash
cd ~/flush-haus-ui && grep -nE "blur|border-radius: [1-9]|999px|box-shadow:.*[0-9]+px [0-9]+px [1-9][0-9]*px" src/table.css
```

Expected: matches only the allowed exceptions — `.table-rail`/`.felt` `border-radius: clamp(...)` (oval geometry), `.chip` `border-radius: 50%`, and nothing with a blur radius. Fix anything else found.

- [ ] **Step 3: Screenshots — desktop demo, mobile demo, lobby**

```bash
S=/tmp/claude-1000/-home-fellipe/6e8eb34a-136c-4a06-a6ea-8408ff36a1cd/scratchpad
google-chrome-stable --headless=new --window-size=1600,900 --virtual-time-budget=8000 --screenshot=$S/t10-desktop.png "http://localhost:5173/?demo"
google-chrome-stable --headless=new --window-size=390,844 --virtual-time-budget=8000 --screenshot=$S/t10-mobile.png "http://localhost:5173/?demo"
google-chrome-stable --headless=new --window-size=1600,900 --virtual-time-budget=8000 --screenshot=$S/t10-lobby.png "http://localhost:5173/"
```

Inspect all three against the spec checklist (spec §Verification). Expected: cohesive pixel look at both sizes; mobile action bar centered; nothing overflowing.

- [ ] **Step 4: Console error check**

```bash
google-chrome-stable --headless=new --enable-logging=stderr --v=0 --window-size=1600,900 \
  --virtual-time-budget=8000 --screenshot=/dev/null "http://localhost:5173/?demo" 2>&1 \
  | grep -iE "uncaught|error" | grep -v "vaInitialize\|GPU\|dbus" || echo "no console errors"
```

Expected: `no console errors`.

- [ ] **Step 5: Commit**

```bash
cd ~/flush-haus-ui && git add src/table.css
git commit -m "style: responsive pixel sizing and motion-reduction pass"
```

---

### Task 11: Live verification against flush-haus-api

**Files:** none modified — verification only.

- [ ] **Step 1: Fresh servers**

```bash
pkill -f "bun run --watch"; pkill -f "vite --host"; sleep 1
cd ~/flush-haus-api && (bun run dev >/dev/null 2>&1 &)
cd ~/flush-haus-ui && (npm run dev >/dev/null 2>&1 &)
timeout 30 bash -c 'until curl -sf http://localhost:5173 >/dev/null; do sleep 1; done'
```

- [ ] **Step 2: Protocol smoke (full round-trip incl. game deal)**

Re-run the Task 2 smoke, then extend it: after `session pong`, send `game ready` and expect a `game round_start`-prefixed reply within 3s (single-player sessions may legitimately refuse to deal — if the server replies `ERR` because it needs ≥2 players, that is a PASS for protocol purposes; record which happened).

- [ ] **Step 3: UI connect check**

Screenshot `http://localhost:5173/` — the lobby status must NOT show an error state with both servers up (the client autoconnects to `ws://localhost:3000/ws`). Inspect the screenshot: status text/dot connected or connecting, no red error banner.

- [ ] **Step 4: Report**

Summarize to the user: what was verified, any deviations, and that
`~/flush-haus-api` has the unpushed branch `fix/session-start-ping` awaiting
their OK (pushing to the org and creating a `Flush-Haus/flush-haus-ui` repo
both need explicit user confirmation).

---

## Self-Review Notes

- **Spec coverage:** foundation→T4, rail/felt/CRT→T5, board/pot/chips/badges→T6, seats→T7, action bar→T8, HUD/banner/lobby→T9, responsive/reduced-motion→T10, verification→T3/T10/T11. Adaptation to flush-haus-api→T2 (server fix, smoke-tested). ✔
- **Timer `steps(20)` deviation:** the spec's stepped timer drain can't be done in CSS because width comes from a JS-driven `--timer` var, not an animation; the bar keeps server-tick granularity. Recorded here as an accepted deviation.
- **Corner mechanism deviation:** spec named `clip-path` as the stepped-corner recipe; plan uses SVG `border-image` frames for bordered panels (clip-path would clip borders/shadows) and keeps `clip-path` (`--clip-step`) for flat fills like the avatar. Same approved visual, sturdier mechanism.
- **Type consistency:** token names are defined once in T4 and referenced verbatim in T5–T10; `--chip-*`/`--avatar-hue`/`--timer` inline-style contracts from TSX are preserved. ✔
- **Placeholder scan:** every step has exact code/commands; the one look-before-you-edit instruction (T2 helper names) is deliberate since the API repo's service accessors weren't fully enumerated. ✔
