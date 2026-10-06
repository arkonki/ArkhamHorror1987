# Arkham Horror (1987)

A faithful hotseat recreation of Chaosium's 1987 board game *Arkham Horror*, using the original
rules, tables and artwork scanned in `ENG/` (personal use).

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # rules + random-play tests
```

## Play online

```bash
npm run dev:server   # room server on :3001 (keep running)
npm run dev          # app on :3000, proxies /ws to the room server
```

Choose **Online** on the start screen. The host sets up the game and gets a five-letter room code and an
invite link; every player (host included) takes one or more player seats. Each decision can only be made
from the seat that owns that investigator; anyone seated can make shared decisions such as pointing a new
monster's arrow. Games survive reloads, dropped connections and server restarts. Only the host can undo.

### Deploy

One process serves both the app and the rooms:

```bash
npm ci && npm run build && npm start      # PORT (default 3001), DATA_DIR (default data/rooms)
```

or with Docker (mount a volume at `/data` so games persist):

```bash
docker build -t arkham . && docker run -p 8080:8080 -v arkham-data:/data arkham
```

Any host that runs a Node container with WebSockets works (Fly.io, Render, Railway, a VPS). Put it behind
HTTPS; the client switches to `wss://` automatically. To serve the app elsewhere (e.g. static hosting),
build it with `VITE_SERVER_URL=wss://your-server/ws`.

## Layout

- `src/engine/` — rules engine (pure TS, deterministic, serialisable). See `docs/WORKPLAN.md`.
- `src/ui/` — React interface.
- `src/net/` — online protocol and the remote client; `server/` — room server (Node + ws).
- `docs/RULES_NOTES.md` — rules digest transcribed from the rulebook, used as the engine's reference.
- `tools/` — scripts that extract artwork from the PDFs and generate the board graph.
