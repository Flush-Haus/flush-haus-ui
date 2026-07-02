# Product

## Register

product

## Users

Fellipe and friends playing Texas Hold'em together over a LAN/localhost session (the companion `flush-haus-api` began as a CEFET computer-networks exercise). Desktop browser first; occasionally a phone joining a lobby. Users are in a game, relaxed, playing for fun — not money.

## Product Purpose

Flush Haus is a real-time multiplayer poker table: create/join a session in the lobby, then play full hands (blinds, streets, showdown) over a plain-text websocket protocol. Success = a table that reads instantly (whose turn, what's the pot, what do I hold) and feels like a place, not a form.

## Brand Personality

1900s luxury riverboat saloon, rendered in chunky pixel art. Mahogany, polished brass, ivory detail; opulent but playful — a first-class smoking room where someone smuggled in a Game Boy. Three words: opulent, tactile, playful.

## Anti-references

- Generic dark-casino poker apps (PokerStars-style gray/neon gradients, glossy chrome).
- Flat minimal SaaS styling — this surface has a strong physical identity on purpose.
- Smooth CSS pretending to be retro: no blurred glows, no soft gradients; the pixel language (hard banding, stepped corners, visible dither) must stay legible.

## Design Principles

- **The table is a place.** Physical materials (wood, brass, felt, ivory) rendered in the pixel vocabulary; every surface belongs to the boat.
- **Game state over decoration.** Whose turn, pot, stacks, and actions must read in under a second; theme never obscures state.
- **Pixels are the brand.** The card sprites set the language — if an element wouldn't fit on the same sprite sheet, it doesn't ship. Press Start 2P for labels/buttons is deliberate identity (accepted exception to the display-font-in-UI ban); numbers and names stay in a clean readable stack.
- **Consistency across screens.** Lobby, table, HUD, and action bar share one frame/button/plate vocabulary.

## Accessibility & Inclusion

Sensible defaults, no formal WCAG target: body/label text ≥4.5:1 against its surface, state never signaled by color alone (badges/labels carry text), `prefers-reduced-motion` disables blinks/presses, hit targets ≥40px on touch.
