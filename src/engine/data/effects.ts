/**
 * Encounter effect scripts.
 *
 * Every location-table and gate-table result is data: a printed text plus a list of
 * effects the engine interprets. Effects are plain JSON so a game state containing a
 * half-resolved script can be serialised and sent over the wire.
 */

export type SkillName = 'fastTalk' | 'fight' | 'knowledge' | 'sneak';
export type TestName = SkillName | 'str' | 'san';
export type Pool = 'str' | 'san' | 'money';
export type Deck = 'item' | 'spell' | 'skill';
export type Amount = number | 'd6';

export type LocationId =
  | 'black_cave' | 'boarding_house' | 'city_hall' | 'curiositie_shoppe' | 'dagon_mission'
  | 'darks_carnival' | 'devils_beach' | 'founders_rock' | 'graveyard' | 'harney_jones_shack'
  | 'hibs_roadhouse' | 'historical_society' | 'hospital' | 'lake_miskatonic' | 'library'
  | 'lighthouse' | 'miskatonic_u' | 'newspaper' | 'north_church' | 'police_station'
  | 'sanitarium' | 'shunned_house' | 'silver_twilight_lodge' | 'train_station'
  | 'velmas_diner' | 'woods';

export type WorldId =
  | 'abyss' | 'another_dimension' | 'city_of_the_great_race' | 'earths_dreamlands'
  | 'great_hall_of_celeano' | 'plateau_of_leng' | 'rlyeh' | 'yuggoth';

export type Condition =
  | { c: 'hasGun' }
  | { c: 'hasItems' }
  | { c: 'hasSpells' }
  | { c: 'hasSkills' }
  | { c: 'hasMoney'; n: number }
  | { c: 'onRetainer' }
  | { c: 'retainerAvailable' }
  | { c: 'localCharAvailable'; id: string };

export type Effect =
  /** No encounter: nothing happens. */
  | { k: 'none' }
  | { k: 'gain'; pool: Pool; n: Amount }
  | { k: 'lose'; pool: Pool; n: Amount }
  /** Lose all money. */
  | { k: 'loseAllMoney' }
  /** D6 test against skill/strength/sanity (roll <= value passes). */
  | { k: 'test'; test: TestName; mod?: number; pass?: Effect[]; fail?: Effect[] }
  /** Draw from a deck. price: 'list' = pay the printed price, number = flat cost; unpaid → `else`. */
  | { k: 'draw'; deck: Deck; n?: number; price?: 'list' | number; else?: Effect[] }
  /** Discard card(s) of the investigator's choice. */
  | { k: 'discard'; deck: 'item' | 'spell'; n?: number }
  /** A monster appears in the investigator's Arkham location (meet it) or attacks in an Other World. */
  | { k: 'monster' }
  /** Gate and monster appear here; investigator is swept to the Other World. */
  | { k: 'gateAndMonster' }
  /** Player picks one option. */
  | { k: 'choose'; options: { label: string; fx: Effect[]; if?: Condition }[] }
  /** Optional payment: pay n to apply `then`, otherwise `else`. Fast Talk discounts when `bargain`. */
  | { k: 'pay'; n: number; then: Effect[]; else?: Effect[]; bargain?: boolean; mandatory?: boolean }
  | { k: 'if'; cond: Condition; then: Effect[]; else?: Effect[] }
  /** Move out to the street space beside this location's entrance. */
  | { k: 'sidewalk' }
  | { k: 'jail'; turns?: number }
  /** Lose your next n turns where you are (Other World: stay in this box). */
  | { k: 'stay'; turns: number }
  | { k: 'hospital' }
  /** Free ride; to = specific location or 'any'. roll = roll on the destination table. */
  | { k: 'ride'; to: LocationId | 'any'; roll?: boolean; forced?: boolean }
  /** Roll again on this same table. */
  | { k: 'reroll' }
  /** Investigator is lost; start a new one. */
  | { k: 'lost' }
  /** Visit an Other World for `rolls` encounters, then come back here. */
  | { k: 'visitWorld'; world: WorldId; stayTurn?: boolean }
  /** (Another Dimension) appear in Arkham at a random Gate Appearance Table location. */
  | { k: 'randomArkham' }
  | { k: 'retainer' }
  | { k: 'localCharacter'; id: 'tom_big_mountain' | 'eric_colt'; cost: number }
  /** Next encounter only: +n to a skill. */
  | { k: 'tempSkill'; skill: SkillName; n: number }
  /** Coin / D6 gamble for all money. even = D6 even wins. */
  | { k: 'doubleOrNothing'; by: 'coin' | 'd6'; loseFx?: Effect[] }
  /** Modify the investigator's next movement roll: 'd6' = roll only one die, number = add. */
  | { k: 'nextMove'; mode: 'd6' | number }
  /** Sell one item to the location for a fixed price. */
  | { k: 'sellItemFor'; n: number }
  /** Location-specific logic implemented in code. */
  | { k: 'special'; id: string };

export interface TableEntry {
  /** D6 results this entry covers, e.g. [1] or [1, 2]. */
  roll: number[];
  text: string;
  fx: Effect[];
}

export const fx = {
  none: (): Effect => ({ k: 'none' }),
  gain: (pool: Pool, n: Amount): Effect => ({ k: 'gain', pool, n }),
  lose: (pool: Pool, n: Amount): Effect => ({ k: 'lose', pool, n }),
  test: (test: TestName, pass: Effect[] = [], fail: Effect[] = [], mod?: number): Effect =>
    ({ k: 'test', test, pass, fail, ...(mod ? { mod } : {}) }),
  draw: (deck: Deck, n = 1): Effect => ({ k: 'draw', deck, n }),
  buy: (deck: Deck, price: 'list' | number = 'list', orElse: Effect[] = []): Effect =>
    ({ k: 'draw', deck, n: 1, price, else: orElse }),
  monster: (): Effect => ({ k: 'monster' }),
  gate: (): Effect => ({ k: 'gateAndMonster' }),
  sidewalk: (): Effect => ({ k: 'sidewalk' }),
  jail: (turns = 1): Effect => ({ k: 'jail', turns }),
  stay: (turns = 1): Effect => ({ k: 'stay', turns }),
  ride: (to: LocationId | 'any', roll = false): Effect => ({ k: 'ride', to, roll }),
  lost: (): Effect => ({ k: 'lost' }),
};
