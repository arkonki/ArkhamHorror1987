# Arkham Horror (1987) — workplan & status

Goal: a faithful digital recreation of Chaosium's 1987 *Arkham Horror*, built from the scans in `ENG/`,
hotseat first, architected for online play.

## Architecture

```
ENG/*.pdf ──tools/extract_assets.py──► public/assets/   (board, cards, counters, investigator sheets)
board scan ─tools/genboard.py────────► src/engine/data/boardData.ts   (spaces, polygons, edges, entrances)

src/engine/            pure TypeScript, no React
  data/                transcribed tables & components (locations, other worlds, monsters, cards, investigators)
  board.ts             graph helpers: movement, intersection turning, flyer paths, vehicle blocking
  game.ts              the rules as a generator: yields a Prompt for every decision
  session.ts           replay/validate answers; save = (setup, answers[])
src/client.ts          GameClient interface; LocalClient (hotseat) — a network client implements the same API
src/ui/                React views (setup, board, prompt panel, investigator sheets, log)
```

Because the engine is deterministic (seeded RNG) and every decision is an explicit answer,
a game is fully described by `(setup, answers[])`. That gives save/load and undo for free, and
online play is "relay answers": the host validates each answer (`Session.isValid`) and broadcasts it;
every peer replays the same stream.

## Phases

| # | Phase | Status |
|---|-------|--------|
| 0 | Foundations: strip AI-Studio scaffolding, Vitest, seeded RNG, generator engine with prompts | ✅ |
| 1 | Data: 26 location tables, 8 gate tables, 49 monsters (errata applied), 37 items, 24 spells, 8 skills, 16 gates, 8 investigators | ✅ |
| 2 | Board graph traced from the scan (68 street spaces, 3 taxi stands, 28 entrances incl. 3 back doors) + tests | ✅ |
| 3 | Investigator phase: retainer, move/wait/taxi/whistle/automobile, stopping at monsters, entering locations, encounters | ✅ |
| 4 | Combat: sanity (once per monster per turn), sneak, fight totals, hand limit, immunities, counterattack, Flesh Ward, local characters, Piccolo, silver bullet | ✅ |
| 5 | Mythos: gate appearance (rules/board variant), doom, vampires, handed movement & intersections, flyers, Tindalos, monster attacks | ✅ |
| 6 | Gates & Other Worlds: box 2 → 1 → return, found-both-sides, attack gate, guardians, colour purge, Elder Sign, Dragon's Eye/Blue Watcher, Find Gate, Nightgaunt | ✅ |
| 7 | Economy & meta: purchases with Fast Talk, selling, auctions, charity & repayment, retainers, trading, lost investigators & replacements, Roll of Honor | ✅ (see gaps) |
| 8 | UI: board with original art, clickable spaces, prompt panel, sheets, log, autosave/file save, undo | ✅ first pass |
| 9 | Online multiplayer (room server relaying answers), simple AI for unclaimed investigators | ⏳ next |

## Known gaps / simplifications (to do)

- **Bind Monster**: only the *banish* use is implemented; directing a bound monster to attack a monster or gate is not.
- **Silver Key** (Dreamlands shortcut) has no effect yet.
- **Auctions**: cash bids only (bidding items at cash value not supported).
- **Monster heading on appearance** is randomised (the box lets a player orient the arrow).
- **Several monsters entering one space**: "nearest monster attacks highest Fight" is approximated by pairing strongest monster with highest Fight.
- **Trading** is one-way "give" between investigators in the same space.
- Optional rules not yet offered: lost-investigator rescue, Strength as carrying limit.
- Investigator-vs-investigator attacks (remorse rule) are not modelled; remorse for stranding someone by closing a gate is.
- UI polish: animated dice, monster movement animation, mobile layout, card zoom viewer, rules reference panel.

## Rule decisions taken where the text is ambiguous

- Gate Appearance Table extra monster: selectable — rules sheet (7) or printed board (4 & 10).
- A monster already sharing a space with an investigator at the Mythos phase does not move away; it attacks.
- Flyers with no investigator on the streets stay put.
- "Remain in this box next turn" in an Other World: the box does not advance and the gate table is rolled again.
- Shoggoth SP 14+D6 is rolled once per combat.
