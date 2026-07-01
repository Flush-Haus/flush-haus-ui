# Pixel-Art Table Redesign — Design Spec

**Date:** 2026-07-01
**Project:** poker-table-prototype
**Goal:** Restyle the entire poker screen so it matches the chunky pixel-art
aesthetic of the card sprites in `src/assets/cards/`.

## Problem

The card assets are true pixel art: hard edges, stair-stepped corners, a
limited flat palette (white face, gray rim, black/red suits, ornate red back),
no anti-aliasing. The table around them is retro-*themed* but rendered with
smooth CSS — radial/linear gradients, blurred box-shadows, smoothly rounded
corners, glossy highlights. The two languages clash.

## Decisions (agreed with user)

| Question | Decision |
|---|---|
| Scope | Everything on screen: rail, felt, pods, chips, pot, badges, action bar, HUD, lobby, banner |
| Palette | Keep green felt / warm gold / dark wood identity, flattened into hard pixel tones |
| Typography | Press Start 2P for labels/buttons/headers; clean font (current stack) for player names and numeric amounts |
| CRT overlay | Keep, retuned to the new look |
| Approach | Pure CSS (no image assets, no DOM changes) |

## Design language (foundation)

Reusable rules applied to every component, expressed as CSS custom properties
and a few utility recipes at the top of `table.css`:

1. **Banded shading, no gradients.** Every gradient becomes 2–4 flat color
   bands with hard stops (highlight / base / shade), like sprite shading.
   Felt = concentric flat rings; rail = flat wood bands with 1px dark seams.
2. **Stepped pixel corners.** A shared `clip-path` stair-step polygon recipe
   replaces `border-radius` on pods, panels, buttons, badges, plates.
   Small elements: 1 step. Large panels: 2–3 steps.
   **Exception:** the table oval (rail/felt) keeps elliptical geometry —
   a huge oval cannot be cleanly clip-path-stepped at every viewport size;
   it reads as pixel art through banding, dither, and hard 2px borders.
3. **Hard shadows.** Blurred box-shadows become hard offsets
   (`0 3px 0 rgba(0,0,0,…)`) or solid dark borders. No glow blur anywhere.
4. **Dual pixel borders.** Panels mirror the card face: dark 2px outer border
   + light 1px inner border.
5. **Dither for texture.** Keep/retune the existing 2px checkerboard
   (`repeating-conic-gradient`) to soften band transitions on the felt and
   between rail bands.
6. **Stepped motion.** Animations use `steps()` — the active-seat pulse
   becomes a 2-frame gold-outline blink; the action timer bar drains in
   `steps(20)` ticks. `prefers-reduced-motion` still disables them.
7. **Tokens.** Palette bands as custom properties: `--felt-1/2/3`,
   `--wood-1/2/3`, `--gold-1/2`, plus `--px` scale unit. Components consume
   tokens only.
8. **Text.** Press Start 2P: all labels, buttons, headings, badges. Clean
   font: names + amounts, with `font-variant-numeric: tabular-nums` and hard
   `1px 1px 0 #000` text shadows.

## Components

### Table rail + felt
- Rail: three flat wood bands (light edge → base → dark lip), 1px seams,
  4px dither band between base and lip, hard 2px black outline around the
  table, 1px light inner edge at the felt boundary.
- Felt: three concentric flat greens with dithered transitions; gold center
  "spot" becomes a flat low-opacity gold ellipse band; ♠ watermark stays as a
  hard single-tone overlay.
- Table drop shadow: solid dark offset block instead of 60px blur.

### Center: board + pot
- Empty board slots: pixel-dashed border (4px dashes via
  `repeating-linear-gradient`), flat dark inset fill.
- Pot: rectangular plate, stepped corners, flat dark fill, 2px gold border,
  "POT" in Press Start 2P; amount in clean font.
- Community/hole card shadows: hard offset `drop-shadow` (no blur).

### Seats
- Pod: flat dark fill, stepped corners, dual border, hard 3px drop shadow.
- Avatar: two flat tones (top-lit), stepped-corner square, 1px dark outline;
  initials in clean bold font.
- Active state: solid 2px gold outline blinking between two brightness frames
  (`steps(2)` animation); timer bar 4px tall, draining in `steps(20)`.
- Folded/all-in/empty variants keep current semantics, restyled flat
  (folded = desaturated + dimmed; all-in = amber flat border; empty = pixel-
  dashed border plate).

### Chips
- Flat pixel discs: base color, one darker crescent band for depth, white rim
  dashes via `conic-gradient` hard stops, 1px black outline. No gloss.
- Stack offsets unchanged; amounts in clean font with hard text shadow.

### Badges
- Dealer: white pixel disc, black "D" in Press Start 2P, hard shadow.
- Blinds: flat dark plate, gold text (BB highlighted as today).

### Action bar
- Panel: pixel frame (flat fill, stepped corners, dual border, hard shadow).
- Fold/Call/Raise: flat fills (dark red / green / two-band gold), stepped
  corners, `0 3px 0` dark bottom edge that collapses on `:active` (button
  visibly presses down 3px). Labels in Press Start 2P.
- Quick-bets: small flat pixel tabs. Slider: squared track + square pixel
  thumb via `::-webkit-slider-thumb` / `::-moz-range-thumb`.

### HUD, banner, lobby
- HUD: small pixel plate; status dot becomes a hard square (green/amber/red,
  no glow).
- Banner: flat gold plate, stepped corners, black Press Start 2P text.
- Lobby card: full panel treatment; inputs = flat dark fields, 2px border,
  instant gold border on focus (no transition); buttons use the pressed-down
  style.

### CRT overlay
- Keep structure; lower opacity slightly and align the scanline period to the
  2px dither grid so they don't moiré.

## Constraints / non-goals

- **CSS-only.** `table.css` rewritten in place; same class names, same DOM.
  No changes to components, hooks, `src/net/`, or types.
- `styles.css` (sandbox/stage) touched only where it visibly clashes on the
  main screen.
- No new font families expected (Press Start 2P already loaded).
- Does not touch the pending FlyingCard deal/reveal animation work.
- Responsive behavior preserved: existing `clamp()` sizing and the 760px
  breakpoint stay.

## Verification

No automated tests exist. Visual verification:
1. `bun run dev` in `~/poker-api`; `npm run dev` in the prototype.
2. Load http://localhost:5173, connect, and screenshot lobby + live table.
3. Checklist: no smooth gradients or blurred shadows remain; corners stepped;
   fonts applied per the typography split; chips flat; buttons press down;
   active-seat blink + stepped timer work; folded/all-in/empty seats read
   correctly; ≤760px layout intact; CRT overlay doesn't moiré with dither.
