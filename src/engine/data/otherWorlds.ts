// Gate Tables — ENG/04 gazette.pdf page 1.
import { fx, type TableEntry, type WorldId } from './effects';

export interface WorldDef {
  id: WorldId;
  name: string;
  /** Origination-class colour of monsters keyed to this world. */
  color: string;
  /** Hound of Tindalos is "no encounter" here (not a building-like world). */
  tindalosSafe?: boolean;
  table: TableEntry[];
}

const { gain, lose, test, draw, monster, stay, lost } = fx;

export const WORLDS: Record<WorldId, WorldDef> = {
  abyss: {
    id: 'abyss', name: 'The Abyss', color: '#e8d84a', tindalosSafe: true,
    table: [
      { roll: [1], text: 'The stone arch breaks! Successful strength roll to hold it up until you can get through; fail, and lose D6 strength points.', fx: [test('str', [], [lose('str', 'd6')])] },
      { roll: [2], text: 'With a successful Fight, you fend off the monstrous mass; without it you are lost: start a new investigator.', fx: [test('fight', [], [lost()])] },
      { roll: [3], text: 'A merciless monster attacks you.', fx: [monster()] },
      { roll: [4], text: 'You are bewildered: successful Knowledge roll or you remain in this box next turn.', fx: [test('knowledge', [], [stay()])] },
      { roll: [5], text: 'The unending blackness terrifies you; will you never find your way home? Lose 2 sanity points.', fx: [lose('san', 2)] },
      { roll: [6], text: 'You find 1 item.', fx: [draw('item')] },
    ],
  },
  another_dimension: {
    id: 'another_dimension', name: 'Another Dimension', color: '#e66a6a',
    table: [
      { roll: [1], text: 'From the whorling patterns you learn a spell: draw 1 spell card.', fx: [draw('spell')] },
      { roll: [2], text: 'You shift to Celeano. Roll for 1 encounter there, then return to this box next turn.', fx: [{ k: 'visitWorld', world: 'great_hall_of_celeano' }] },
      { roll: [3], text: "You are shifted to R'lyeh; roll for 1 encounter there, then return to this box next turn.", fx: [{ k: 'visitWorld', world: 'rlyeh' }] },
      { roll: [4], text: 'You are shifted to Arkham, but roll on Gate Appearance table for random Arkham location where you appear, with or without a gate.', fx: [{ k: 'randomArkham' }] },
      { roll: [5], text: 'A hideous monster attacks you.', fx: [monster()] },
      { roll: [6], text: 'The dimensions shift again: you see yourself clearly: gain 1 sanity point.', fx: [gain('san', 1)] },
    ],
  },
  city_of_the_great_race: {
    id: 'city_of_the_great_race', name: 'City of the Great Race', color: '#f0a040',
    table: [
      { roll: [1], text: 'Amid the incomprehensible artifacts you recognize something: draw 1 item card.', fx: [draw('item')] },
      { roll: [2], text: 'Monsters lurk everywhere. Stay in same box next turn.', fx: [stay()] },
      { roll: [3], text: 'A monster stalks you and attacks.', fx: [monster()] },
      { roll: [4], text: 'The conical entity teaches you a spell: draw 1 spell card.', fx: [draw('spell')] },
      { roll: [5], text: 'The conical entities give up the chase: you lose 2 strength points from exhaustion.', fx: [lose('str', 2)] },
      { roll: [6], text: 'Lose 2 sanity points because of a hideous whistling.', fx: [lose('san', 2)] },
    ],
  },
  earths_dreamlands: {
    id: 'earths_dreamlands', name: "Earth's Dreamlands", color: '#c9895a', tindalosSafe: true,
    table: [
      { roll: [1], text: 'The village elder teaches you something. Draw 1 spell card.', fx: [draw('spell')] },
      { roll: [2], text: 'The men at the Temple are wise: if any skills cards are not held, draw 1.', fx: [{ k: 'special', id: 'dreamlandsSkill' }] },
      { roll: [3], text: 'A monster springs at you.', fx: [monster()] },
      { roll: [4], text: 'Gradually the sly Moonbeast edges you to the gangplank: make Fast Talk roll. Failing, you board the ship and never return: start another investigator.', fx: [test('fastTalk', [], [lost()])] },
      { roll: [5], text: 'You encounter the talking cats of Ulthar, who teach you a spell. Draw 1 spell card.', fx: [draw('spell')] },
      { roll: [6], text: 'Waving goodby, the happy villagers bestow a gift. Draw 1 item card.', fx: [draw('item')] },
    ],
  },
  great_hall_of_celeano: {
    id: 'great_hall_of_celeano', name: 'Great Hall of Celeano', color: '#6b7fc7',
    table: [
      { roll: [1], text: 'Successful Fast Talk to convince The Librarian of your importance, or start a new investigator.', fx: [test('fastTalk', [], [lost()])] },
      { roll: [2, 3], text: 'A monster attacks from the shadows.', fx: [monster()] },
      { roll: [4], text: 'You find one book small enough to carry: draw 1 spell card.', fx: [draw('spell')] },
      { roll: [5], text: 'A vast stirring: successful Sneak roll or lose D6 strength points.', fx: [test('sneak', [], [lose('str', 'd6')])] },
      { roll: [6], text: 'Wedged beneath the fallen shelves is a scroll: draw 1 spell card.', fx: [draw('spell')] },
    ],
  },
  plateau_of_leng: {
    id: 'plateau_of_leng', name: 'Plateau of Leng', color: '#8ccbe6', tindalosSafe: true,
    table: [
      { roll: [1], text: 'A lurking monster attacks.', fx: [monster()] },
      { roll: [2], text: 'The wind increases, and you feel your feet go numb. Successful strength roll or lose 2 strength points.', fx: [test('str', [], [lose('str', 2)])] },
      { roll: [3], text: 'Avalanche! Successful strength roll or lose 3 strength points AND successful Fight roll or lose 3 more strength points as well.', fx: [test('str', [], [lose('str', 3)]), test('fight', [], [lose('str', 3)])] },
      { roll: [4], text: 'You see the mountains move: lose 2 sanity points from terror.', fx: [lose('san', 2)] },
      { roll: [5], text: 'Among the bones you find an old book: draw 1 spell card.', fx: [draw('spell')] },
      { roll: [6], text: 'Your peril clears your mind: add 1 sanity point.', fx: [gain('san', 1)] },
    ],
  },
  rlyeh: {
    id: 'rlyeh', name: "R'lyeh", color: '#4fae5a',
    table: [
      { roll: [1], text: 'A slimy monster attacks you.', fx: [monster()] },
      { roll: [2], text: 'With a successful Knowledge roll, cryptic altar symbols suggest a spell: draw 1 spell card.', fx: [test('knowledge', [draw('spell')], [])] },
      { roll: [3], text: 'Unnerving alien angles: lose 2 sanity points.', fx: [lose('san', 2)] },
      { roll: [4], text: 'Hurricane winds smash you against cyclopean stones: successful strength roll or lose 3 strength points.', fx: [test('str', [], [lose('str', 3)])] },
      { roll: [5], text: 'That night the stars change; the brazen temple doors open; a vast black corpulence comes forth: lose D6 sanity.', fx: [lose('san', 'd6')] },
      { roll: [6], text: 'A rotten sea chest: from it draw 1 item.', fx: [draw('item')] },
    ],
  },
  yuggoth: {
    id: 'yuggoth', name: 'Yuggoth', color: '#c070d0',
    table: [
      { roll: [1], text: 'Fear grabs you as the buzzing entities approach: fail sanity roll and lose 1 sanity point.', fx: [test('san', [], [lose('san', 1)])] },
      { roll: [2], text: '"You\'ll never return," the cylindered head cackles. Lose 2 sanity points from despair.', fx: [lose('san', 2)] },
      { roll: [3], text: 'Exposure and fear weaken your mind: discard 1 spell card or lose 2 sanity points.', fx: [{ k: 'choose', options: [
        { label: 'Discard 1 spell card', fx: [{ k: 'discard', deck: 'spell' }], if: { c: 'hasSpells' } },
        { label: 'Lose 2 sanity points', fx: [lose('san', 2)] },
      ] }] },
      { roll: [4], text: "You're dizzy from the strange ray: make a successful strength roll or lose 1 item card.", fx: [test('str', [], [{ k: 'discard', deck: 'item' }])] },
      { roll: [5], text: 'You find a book: draw 1 spell card.', fx: [draw('spell')] },
      { roll: [6], text: 'The pinkish rays nearly get you: successful Sneak roll or lose 2 strength points.', fx: [test('sneak', [], [lose('str', 2)])] },
    ],
  },
};
