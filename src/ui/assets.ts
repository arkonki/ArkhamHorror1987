const base = import.meta.env.BASE_URL;
export const boardUrl = `${base}assets/board.jpg`;
export const cardUrl = (id: string) => `${base}assets/cards/${id}.jpg`;
export const investigatorUrl = (defId: string) => `${base}assets/investigators/${defId}.jpg`;
export const monsterUrl = (art: string, side: 'front' | 'back' = 'front') => `${base}assets/monsters/${side}/${art}.png`;
