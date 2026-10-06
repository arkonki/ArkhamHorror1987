import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

interface ZoomContent {
  title: string;
  images: string[];
  caption?: string;
}

const Ctx = createContext<(c: ZoomContent) => void>(() => {});

export const useZoom = () => useContext(Ctx);

/** Click-to-enlarge viewer for cards, counters and investigator sheets. */
export function ZoomProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<ZoomContent | null>(null);
  const close = useCallback(() => setContent(null), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);
  return (
    <Ctx.Provider value={setContent}>
      {children}
      {content && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={close} role="dialog" aria-label={content.title}>
          <div className="max-h-full overflow-auto rounded-xl border border-amber-200/30 bg-stone-900 p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center gap-4">
              <h2 className="font-display text-xl text-amber-50">{content.title}</h2>
              <button onClick={close} className="ml-auto rounded border border-stone-600 px-2 text-stone-300 hover:bg-stone-800">Close</button>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              {content.images.map((src) => <img key={src} src={src} alt="" className="max-h-[70vh] max-w-[min(90vw,560px)] rounded-lg shadow-lg" />)}
            </div>
            {content.caption && <p className="mt-3 max-w-xl whitespace-pre-line text-sm text-stone-300">{content.caption}</p>}
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
