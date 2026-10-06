# Arkham Horror (1987)

A faithful hotseat recreation of Chaosium's 1987 board game *Arkham Horror*, using the original
rules, tables and artwork scanned in `ENG/` (personal use).

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # rules + random-play tests
```

## Layout

- `src/engine/` — rules engine (pure TS, deterministic, serialisable). See `docs/WORKPLAN.md`.
- `src/ui/` — React interface.
- `docs/RULES_NOTES.md` — rules digest transcribed from the rulebook, used as the engine's reference.
- `tools/` — scripts that extract artwork from the PDFs and generate the board graph.
