// Cards — ENG/06 cards.pdf. `count` = number of copies in the deck.
import type { WorldId } from './effects';

export type ItemKind = 'weapon' | 'gun' | 'magicWeapon' | 'oneShot' | 'special' | 'auction';

export interface ItemDef {
  id: string;
  name: string;
  price: number;
  count: number;
  magical?: boolean;
  /** Attack bonus when used in a fight. */
  attack?: number;
  hands?: 0 | 1 | 2;
  /** Guns are useless against "Unharmed By Guns" monsters and can fire the Silver Bullet. */
  gun?: boolean;
  /** Discarded after one use. */
  oneUse?: boolean;
  /** Holy Water: bonus lasts the whole turn, then discarded. */
  oneTurn?: boolean;
  text: string;
}

export interface SpellDef {
  id: string;
  name: string;
  book: string;
  count: number;
  /** Magical attack bonus. */
  attack?: number;
  sanityCost: number;
  text: string;
  /** Bind Monster: returned to the deck after one successful cast. */
  discardOnSuccess?: boolean;
}

export const ITEMS: ItemDef[] = [
  { id: 'elder_sign', name: 'Elder Sign', price: 5, count: 4, magical: true, hands: 0, text: 'Destroys Gate. Find Both Sides of Gate; Spend 2 Sanity Points; Keep Gate as Trophy; Move Back Doom Factor By 1. Prevents Appearance of Gate/Monster at Location.' },
  { id: 'taxi_whistle', name: 'Taxi Whistle', price: 1, count: 2, hands: 0, oneUse: true, text: 'Summon taxi, take ride: $1. discard after 1 use' },
  { id: 'dynamite', name: 'Dynamite', price: 4, count: 2, attack: 8, hands: 2, oneUse: true, text: '+8 Physical Attack (2H). discard after 1 use' },
  { id: 'automatic_45', name: '.45 Automatic', price: 5, count: 2, attack: 4, hands: 1, gun: true, text: '+4 Physical Attack (1H)' },
  { id: 'revolver_38', name: '.38 Revolver', price: 4, count: 2, attack: 3, hands: 1, gun: true, text: '+3 Physical Attack (1H)' },
  { id: 'shotgun', name: 'Shotgun', price: 7, count: 2, attack: 6, hands: 2, gun: true, text: '+6 Physical Attack (2H)' },
  { id: 'submachine_gun', name: 'Submachine Gun', price: 13, count: 1, attack: 7, hands: 2, gun: true, text: '+7 Physical Attack (2H)' },
  { id: 'rifle', name: 'Rifle', price: 5, count: 1, attack: 5, hands: 2, gun: true, text: '+5 Physical Attack (2H)' },
  { id: 'derringer_18', name: '.18 Derringer', price: 3, count: 1, attack: 2, hands: 1, gun: true, text: '+2 Physical Attack (1H)' },
  { id: 'sword_of_glory', name: 'Sword of Glory', price: 6, count: 1, magical: true, attack: 6, hands: 1, text: 'With this honored weapon you can hack away for 6 points of damage during combat. A one-handed weapon. Usable the rest of the game.' },
  { id: 'enchanted_knife', name: 'Enchanted Knife', price: 6, count: 1, magical: true, attack: 4, hands: 1, text: 'This weapon strikes for 4 points of damage during combat. A one-handed weapon. Usable the rest of the game.' },
  { id: 'knife', name: 'Knife', price: 2, count: 1, attack: 1, hands: 1, text: '+1 Physical Attack (1H)' },
  { id: 'cavalry_saber', name: 'Cavalry Saber', price: 3, count: 1, attack: 2, hands: 1, text: '+2 Physical Attack (1H)' },
  { id: 'auction', name: 'Auction', price: 0, count: 3, text: 'Call Auction And Participate If You Wish.' },
  { id: 'silver_key', name: 'Silver Key', price: 4, count: 1, magical: true, hands: 0, text: "An alchemist's key allowing the owner to pass to and from the Other World box of the Dreamlands during any movement or encounter step. Before use, take any sanity loss. Put on space, location, or Other World box to mark departure point. Usable rest of the game; movable by owner." },
  { id: 'brazen_head', name: 'Brazen Head', price: 8, count: 1, magical: true, hands: 0, text: 'Grants two random spells. Roll D6 twice: any result other than 6 grants one spell. A result of 6 summons a monster into that space or location. After second roll, discard.' },
  { id: 'silver_bullet', name: 'Silver Bullet', price: 3, count: 1, hands: 0, oneUse: true, text: 'With any gun, automatically kills werewolf. discard after 1 use' },
  { id: 'holy_water', name: 'Holy Water', price: 2, count: 1, magical: true, attack: 6, hands: 0, oneTurn: true, text: 'Grants the owner +6 magical attack for all of one turn, then is discarded.' },
  { id: 'lamp_of_alhazred', name: 'Lamp of Alhazred', price: 5, count: 1, magical: true, attack: 3, hands: 1, text: 'Its blaze adds a +3 magical attack whenever you wish. This is a one-handed weapon. Usable the rest of the game.' },
  { id: 'brass_collar', name: 'Brass Collar', price: 3, count: 1, magical: true, hands: 0, text: 'While wearing this glorious collar, increase your strength by +1 each turn, to the maximum of 7. Usable the rest of the game.' },
  { id: 'piccolo_of_leng', name: 'Piccolo of Leng', price: 6, count: 1, magical: true, hands: 0, text: "Its grotesque tones let you launch one attack per turn without taking target's counterattack. Works half the time: announce attack, flip coin. Heads succeeds, tails fails. Usable the rest of the game." },
  { id: 'dragons_eye', name: "Dragon's Eye", price: 6, count: 1, magical: true, hands: 0, oneUse: true, text: 'If this black gem of unnerving aspect is dashed to the ground it banishes any one Mythos monster from Earth or closes any one Gate. Lose D6 strength points from the concussion. Use once, then discard.' },
  { id: 'healing_stone', name: 'Healing Stone', price: 3, count: 1, magical: true, hands: 0, text: "To heal, be in the same space with the target and roll D6. A result equal to or less than the user's strength successfully grants the target D6 strength points. Usable once per turn the rest of the game." },
  { id: 'alien_spectacles', name: 'Alien Spectacles', price: 6, count: 1, magical: true, hands: 0, text: 'Made of unearthly metals and crystals. Aiming with the help of the alien lornette lets an investigator inflict damage with a one-handed physical weapon on any monster. Usable the rest of the game.' },
  { id: 'ruby_of_rlyeh', name: "Ruby of R'lyeh", price: 15, count: 1, magical: true, hands: 0, text: "Adds 3 to investigator's movement roll result each turn. Useful the rest of the game." },
  { id: 'flute_of_the_outer_gods', name: 'Flute of the Outer Gods', price: 5, count: 1, magical: true, hands: 0, oneUse: true, text: 'It banishes one of the following: any of the five powers, or a byakhee, dhole, gug, hunting horror, migo, nightgaunt, shambler, shantak, shoggoth, or a Tindalos. Must be in target space or location. Use once, then discard.' },
  { id: 'blue_watcher', name: 'Blue Watcher of the Pyramid', price: 4, count: 1, magical: true, hands: 0, oneUse: true, text: 'Painted with the ancient Egyptian Eye of Protection, this fragment dashed to the ground banishes any one Mythos monster from Earth or closes any one Gate. Lose D6 strength points from the concussion. Use once, then discard.' },
];

/** Species the Flute of the Outer Gods can banish (plus all powers). */
export const FLUTE_TARGETS = ['Byakhee', 'Dhole', 'Gug', 'Migo', 'Nightgaunt', 'Dimensional Shambler', 'Shoggoth', 'Hound of Tindalos'];

export const SPELLS: SpellDef[] = [
  { id: 'bind_monster', name: 'Bind Monster', book: 'Pnakotic Manuscripts', count: 6, sanityCost: 0, discardOnSuccess: true, text: 'Banish Monster From Earth; Monster Attacks Target Or Gate. Discard after 1 successful cast.' },
  { id: 'cloud_memory', name: 'Cloud Memory', book: 'De Vermiis Mysteriis', count: 2, sanityCost: 0, text: 'Adds 2 Sanity Points To target. Use Once Per Turn.' },
  { id: 'flesh_ward', name: 'Flesh Ward', book: 'Necronomicon', count: 1, sanityCost: 0, text: 'Automatically Cancels 1 Monster Attack or Counterattack. Use Once Per Turn.' },
  { id: 'find_gate', name: 'Find Gate', book: 'True Magick', count: 3, sanityCost: 0, text: 'Locates Gate on Other World To return to Arkham. Use Once Per Turn.' },
  { id: 'dread_curse_of_azathoth', name: 'Dread Curse of Azathoth', book: 'Unaussprechlichen Kulten', count: 2, attack: 9, sanityCost: 2, text: '+9 Magical Attack. Sanity Cost to Cast: 2. Use Once Per Turn.' },
  { id: 'heal', name: 'Heal', book: 'Seven Cryptical Books', count: 2, sanityCost: 0, text: 'Add 2 Strength Points to Target. Use Once Per Turn.' },
  { id: 'power_drain', name: 'Power Drain', book: 'Al Azif', count: 2, attack: 6, sanityCost: 1, text: '+6 Magical Attack. Sanity Cost to Cast: 1. Use Once Per Turn.' },
  { id: 'powder_of_ibn_ghazi', name: 'Powder of Ibn-Ghazi', book: 'Revelations of Glaaki', count: 2, attack: 7, sanityCost: 1, text: '+7 Magical Attack. Sanity Cost to Cast: 1. Use Once Per Turn.' },
  { id: 'mists_of_rlyeh', name: "Mists of R'lyeh", book: 'Nameless Cults', count: 2, sanityCost: 0, text: 'Automatically Successful Sneak. Use Once Per Turn.' },
  { id: 'shrivelling', name: 'Shrivelling', book: 'Book of Dzyan', count: 2, attack: 6, sanityCost: 1, text: '+6 Magical Attack. Sanity Cost to Cast: 1. Use Once Per Turn.' },
];

export type SkillId = 'skill_fast_talk' | 'skill_fight' | 'skill_knowledge' | 'skill_sneak';
export const SKILL_CARDS: { id: SkillId; name: string; skill: 'fastTalk' | 'fight' | 'knowledge' | 'sneak'; count: number }[] = [
  { id: 'skill_fast_talk', name: 'Fast Talk +1', skill: 'fastTalk', count: 2 },
  { id: 'skill_fight', name: 'Fight +1', skill: 'fight', count: 2 },
  { id: 'skill_knowledge', name: 'Knowledge +1', skill: 'knowledge', count: 2 },
  { id: 'skill_sneak', name: 'Sneak +1', skill: 'sneak', count: 2 },
];

export const GATES: { world: WorldId; sp: number }[] = [
  { world: 'abyss', sp: 13 },
  { world: 'another_dimension', sp: 13 },
  { world: 'city_of_the_great_race', sp: 13 },
  { world: 'earths_dreamlands', sp: 10 },
  { world: 'great_hall_of_celeano', sp: 15 },
  { world: 'plateau_of_leng', sp: 15 },
  { world: 'rlyeh', sp: 16 },
  { world: 'yuggoth', sp: 15 },
];
export const GATE_COPIES = 2;

export const LOCAL_CHARACTERS = [
  { id: 'tom_big_mountain', name: 'Tom Big-Mountain', fight: 2 },
  { id: 'eric_colt', name: 'Eric Colt', fight: 2 },
] as const;

export const RETAINER_CARDS = 4;
export const CHARITY_CARDS = 8;

export const ITEM_BY_ID: Record<string, ItemDef> = Object.fromEntries(ITEMS.map((d) => [d.id, d]));
export const SPELL_BY_ID: Record<string, SpellDef> = Object.fromEntries(SPELLS.map((d) => [d.id, d]));
