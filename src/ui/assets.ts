const base = import.meta.env.BASE_URL;
/** Only the street map, cropped and compressed (tools/optimize_assets.py); placed at CROP on the board. */
export const boardUrl = `${base}assets/board_view.webp`;
export const cardUrl = (id: string) => `${base}assets/cards/${id}.jpg`;
export const investigatorUrl = (defId: string) => `${base}assets/investigators/${defId}.jpg`;
export const monsterUrl = (art: string, side: 'front' | 'back' = 'front') => `${base}assets/monsters/${side}/${art}.webp`;
