import { useState } from 'react';
import { LocalClient } from './client';
import type { SaveGame, Setup as SetupData } from './engine';
import { GameView } from './ui/GameView';
import { Setup } from './ui/Setup';

export default function App() {
  const [client, setClient] = useState<LocalClient | null>(null);
  const saved = LocalClient.autosave();

  const load = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as SaveGame;
      setClient(new LocalClient(data));
    } catch {
      alert('That file is not an Arkham Horror save game.');
    }
  };

  if (!client) {
    return (
      <Setup
        onStart={(setup: SetupData) => {
          LocalClient.clearAutosave();
          setClient(new LocalClient(setup));
        }}
        onResume={saved ? () => setClient(new LocalClient(saved)) : undefined}
        onLoad={load}
      />
    );
  }
  return <GameView client={client} onQuit={() => setClient(null)} />;
}
