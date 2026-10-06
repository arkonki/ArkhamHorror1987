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
| 7 | Economy & meta: purchases with Fast Talk, selling, auctions (cash and items), charity & repayment, retainers, two-way trading, lost investigators & replacements, Roll of Honor | ✅ |
| 8 | UI: board with original art, clickable spaces, prompt panel, sheets, log, autosave/file save, undo | ✅ first pass |
| 9 | Online multiplayer (room server relaying answers), simple AI for unclaimed investigators | ⏳ next |

## Step 1 — rules completion ✅

- **Bind Monster**: banish *or* bind; a bound monster travels with the investigator and adds its SP to an attack
  (physical, magical against its own species). Against a gate it goes to the trophy pile; against a monster it is
  set free in an adjacent space and pointed by the player. Powers are immune.
- **Silver Key**: during movement or encounters, pass to the Dreamlands (sanity rolls first); the key marks the
  departure space and returns there — by turning the key again or after the normal two Dreamlands turns.
- **Auctions**: items can be bid at list value; payment may be partly in items, with change from the bank.
- **Trading**: two-way — each side selects cards (items, spells, local characters, charity) and money, then the
  initiator confirms.
- **Monster arrows**: when a monster appears, a player points its arrow (option; random when off).
- **OPTION rescue**: an investigator lost in an Other World stays where they fell; their player waits or starts a
  new investigator. A rescuer in the same box carries them box to box (Strength roll per move) or restores them
  with Heal / Cloud Memory / Healing Stone.
- **OPTION carrying limit**: an investigator cannot pick up an item unless Strength exceeds items carried (or drops one).

## Known gaps / simplifications

- **Silver Key** from the Dreamlands back to Arkham needs a marker placed earlier (entering the Dreamlands by a gate
  and leaving by the key is not supported).
- **Several monsters entering one space**: "nearest monster attacks highest Fight" is approximated by pairing strongest monster with highest Fight.
- Investigator-vs-investigator attacks (remorse rule) are not modelled; remorse for stranding someone by closing a gate is.
- UI polish (Step 2): animated dice, monster movement animation, mobile layout, card zoom viewer, rules reference panel.

## Rule decisions taken where the text is ambiguous

- Gate Appearance Table extra monster: selectable — rules sheet (7) or printed board (4 & 10).
- A monster already sharing a space with an investigator at the Mythos phase does not move away; it attacks.
- Flyers with no investigator on the streets stay put.
- A rescued investigator who reaches Arkham with 0 Strength or Sanity goes straight to the Hospital / Sanitarium (no further card loss).
- A stranded investigator still counts toward the gate limit while their player waits for rescue.
- "Remain in this box next turn" in an Other World: the box does not advance and the gate table is rolled again.
- Shoggoth SP 14+D6 is rolled once per combat.
