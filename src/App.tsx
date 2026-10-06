import { useState } from 'react';
import { LocalClient } from './client';
import type { SaveGame, Setup as SetupData } from './engine';
import { RemoteClient, playerName } from './net/RemoteClient';
import { GameView } from './ui/GameView';
import { OnlineGame } from './ui/Online';
import { Setup } from './ui/Setup';

type Screen = { kind: 'menu' } | { kind: 'local'; client: LocalClient } | { kind: 'online'; client: RemoteClient };

function initial(): Screen {
  const room = new URLSearchParams(location.search).get('room');
  const name = playerName();
  if (room && name) return { kind: 'online', client: new RemoteClient({ room }, name) };
  return { kind: 'menu' };
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(initial);
  const saved = LocalClient.autosave();
  const menu = () => setScreen({ kind: 'menu' });

  const load = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as SaveGame;
      setScreen({ kind: 'local', client: new LocalClient(data) });
    } catch {
      alert('That file is not an Arkham Horror save game.');
    }
  };

  if (screen.kind === 'local') return <GameView client={screen.client} onQuit={menu} />;
  if (screen.kind === 'online') return <OnlineGame client={screen.client} onQuit={menu} />;
  return (
    <Setup
      defaultName={playerName()}
      defaultRoom={new URLSearchParams(location.search).get('room')?.toUpperCase() ?? undefined}
      onStart={(setup: SetupData) => {
        LocalClient.clearAutosave();
        setScreen({ kind: 'local', client: new LocalClient(setup) });
      }}
      onHost={(setup, name) => {
        playerName(name);
        setScreen({ kind: 'online', client: new RemoteClient({ create: setup }, name) });
      }}
      onJoin={(room, name) => {
        playerName(name);
        setScreen({ kind: 'online', client: new RemoteClient({ room }, name) });
      }}
      onResume={saved ? () => setScreen({ kind: 'local', client: new LocalClient(saved) }) : undefined}
      onLoad={load}
    />
  );
}
