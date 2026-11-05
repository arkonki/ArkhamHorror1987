/**
 * Encounter interpreter.
 *
 * The Gazette / Other World tables are stored as flavour text. This module reads that text
 * and turns it into concrete, playable options (pay, decline, skill rolls, rides...) and
 * applies their outcomes to the game state.
 */
import { Card, GameState, Investigator, LocationEvent } from '../types/game';
import { LOCATIONS_DATA, GATE_APPEARANCE_TABLE } from '../data/rules1987';
import { getNodeForLocation } from '../data/boardGraph';
import {
  addLog,
  discardRandomCard,
  drawItems,
  drawSpells,
  getEffectiveStats,
  knockOut,
  patchInvestigator,
  rollD6,
  spawnMonsterAtLocation,
  openGateAt
} from './engine';

export type CheckSkill = 'fight' | 'sneak' | 'knowledge' | 'fastTalk' | 'strength' | 'sanity';

export interface Outcome {
  money?: number;
  strength?: number;
  sanity?: number;
  strengthD6?: 1 | -1; // gain (+1) or lose (-1) D6 strength
  sanityD6?: 1 | -1;
  items?: number;
  spells?: number;
  skills?: number;
  returnRandom?: boolean; // Other World: thrown back to a random Arkham location
  specificItemId?: string;
  loseItem?: boolean;
  loseSpell?: boolean;
  loseGunsAndMoney?: boolean;
  skipTurns?: number;
  jail?: boolean;
  hospital?: boolean;
  monster?: boolean;
  gate?: boolean;
  retainer?: boolean;
  statBoost?: { stat: keyof Investigator['stats']; amount: number };
  teleport?: 'any' | string; // 'any' or a location id
  rollThere?: boolean;
  dreamlands?: boolean;
  moveBonus?: number;
  stayInBox?: boolean;
  lostInSpace?: boolean;
  gamble?: boolean;
  buyTopItem?: boolean;
}

export interface EncounterOption {
  id: string;
  label: string;
  detail?: string;
  cost?: number;
  outcome?: Outcome;
  check?: { skill: CheckSkill; success: Outcome; failure: Outcome };
  tone?: 'primary' | 'neutral' | 'danger';
}

const SKILL_LABEL: Record<CheckSkill, string> = {
  fight: 'Fight',
  sneak: 'Sneak',
  knowledge: 'Knowledge',
  fastTalk: 'Fast Talk',
  strength: 'Strength',
  sanity: 'Sanity'
};

export function getCheckTarget(inv: Investigator, skill: CheckSkill): number {
  const s = getEffectiveStats(inv);
  switch (skill) {
    case 'fight': return s.fight;
    case 'sneak': return s.sneak;
    case 'knowledge': return s.knowledge;
    case 'fastTalk': return s.fastTalk;
    case 'strength': return inv.strength;
    case 'sanity': return inv.sanity;
  }
}

export function checkLabel(inv: Investigator, skill: CheckSkill): string {
  return `${SKILL_LABEL[skill]} roll (D6 ≤ ${getCheckTarget(inv, skill)})`;
}

function isEmpty(o: Outcome | undefined): boolean {
  return !o || Object.keys(o).length === 0;
}

function num(v: string): number {
  return parseInt(v, 10);
}

/** Parse concrete effects out of a fragment of event text. */
export function parseEffects(fragment: string, otherWorld = false): Outcome {
  const l = fragment.toLowerCase();
  const o: Outcome = {};

  for (const m of l.matchAll(/lose (d6|\d+)(?: points?)?(?: from| of)?(?: your)? (strength|sanity)/g)) {
    if (m[1] === 'd6') {
      if (m[2] === 'strength') o.strengthD6 = -1; else o.sanityD6 = -1;
    } else if (m[2] === 'strength') o.strength = (o.strength || 0) - num(m[1]);
    else o.sanity = (o.sanity || 0) - num(m[1]);
  }
  for (const m of l.matchAll(/(?:add|gain|restore|restoring|heal|regain)s? \+?(d6|\d+)(?: points?)?(?: of)? (strength|sanity)/g)) {
    if (m[1] === 'd6') {
      if (m[2] === 'strength') o.strengthD6 = 1; else o.sanityD6 = 1;
    } else if (m[2] === 'strength') o.strength = (o.strength || 0) + num(m[1]);
    else o.sanity = (o.sanity || 0) + num(m[1]);
  }
  const gain = l.match(/(?:receive|collect|earn|win|find|grants?)\s+\$(\d+)/);
  if (gain) o.money = num(gain[1]);
  const loss = l.match(/lose \$(\d+)/);
  if (loss) o.money = (o.money || 0) - num(loss[1]);

  for (const m of l.matchAll(/(?:draw|find)\s+(\d+)\s+(?:free\s+)?(item|spell)/g)) {
    if (m[2] === 'item') o.items = (o.items || 0) + num(m[1]);
    else o.spells = (o.spells || 0) + num(m[1]);
  }
  if (/lose (?:1|a|one) spell/.test(l)) o.loseSpell = true;
  if (/discard (?:1|an?) item|lose (?:1|an?) item/.test(l)) o.loseItem = true;

  const trapped = l.match(/trapped for (\d) turns/);
  if (trapped) o.skipTurns = num(trapped[1]);
  else if (/lose (?:your )?next turn|spend next turn/.test(l)) o.skipTurns = 1;
  if (/roll only d6 for next move/.test(l)) o.moveBonus = -3;
  if (/jail/.test(l)) { o.jail = true; o.skipTurns = o.skipTurns || 1; }
  if (/go to hospital/.test(l)) o.hospital = true;
  if (/remain in this box|stay in (?:this|same) box|return to this box next turn/.test(l)) o.stayInBox = true;
  if (/start (?:a new|another) investigator/.test(l)) o.lostInSpace = true;
  if (/skills? cards? (?:are )?not held|draw 1 skill/.test(l)) o.skills = 1;
  if (/shifted to arkham/.test(l)) o.returnRandom = true;
  if (/summon a monster|monster (?:appears|attacks)|monster springs|monster stalks|attacks you/.test(l)) o.monster = true;
  if (/next movement roll/.test(l)) o.moveBonus = 2;
  if (/\bor (?:go to )?jail/.test(l)) { delete o.jail; delete o.skipTurns; } // the sidewalk is always the safer option
  const boost = l.match(/\+(\d) to your (fight|sneak|knowledge|fast talk)/);
  if (boost) {
    const map: Record<string, keyof Investigator['stats']> = {
      fight: 'fightSkill', sneak: 'sneakSkill', knowledge: 'knowledgeSkill', 'fast talk': 'fastTalkSkill'
    };
    o.statBoost = { stat: map[boost[2]], amount: num(boost[1]) };
  }
  if (!otherWorld && /dreamlands/.test(l)) o.dreamlands = true;
  return o;
}

function rewardToOutcome(event: LocationEvent): Outcome {
  const r = event.reward;
  if (!r) return {};
  const o: Outcome = {};
  if (r.money) o.money = r.money;
  if (r.strength) o.strength = r.strength;
  if (r.sanity) o.sanity = r.sanity;
  if (r.itemsCount) o.items = r.itemsCount;
  if (r.spellsCount) o.spells = r.spellsCount;
  if (r.retainer) o.retainer = true;
  if (r.monsterSpawn) o.monster = true;
  if (r.gateSpawn) o.gate = true;
  return o;
}

function detectCheck(text: string): { skill: CheckSkill; index: number; length: number; inverted: boolean } | null {
  const l = text.toLowerCase();
  const m = l.match(/(sneak|fight|knowledge|fast talk|strength|sanity) roll|sneak to (?:sidewalk|escape)|successful (sneak|fight|knowledge|fast talk)/);
  if (!m || m.index === undefined) return null;
  const word = m[1] || m[2] || 'sneak';
  // e.g. "fail sanity roll and lose 1 sanity point": the effect that follows is the failure
  const inverted = /\bfail\s*$/.test(l.slice(0, m.index));
  const map: Record<string, CheckSkill> = {
    sneak: 'sneak', fight: 'fight', knowledge: 'knowledge', 'fast talk': 'fastTalk', strength: 'strength', sanity: 'sanity'
  };
  return { skill: map[word], index: m.index, length: m[0].length, inverted };
}

function splitAfterCheck(text: string, from: number): { success: string; failure: string } {
  const rest = text.slice(from);
  const m = rest.match(/;\s*(?:fail|otherwise|without it)|\.\s*failing,?|,?\s+or\s+|;\s*otherwise/i);
  if (!m || m.index === undefined) return { success: rest, failure: '' };
  return { success: rest.slice(0, m.index), failure: rest.slice(m.index + m[0].length) };
}

function findLocationInText(text: string, excludeId?: string): string | undefined {
  const l = text.toLowerCase();
  let best: { id: string; len: number } | undefined;
  for (const loc of Object.values(LOCATIONS_DATA)) {
    if (loc.id === excludeId) continue;
    const name = loc.name.toLowerCase();
    if (l.includes(name) && (!best || name.length > best.len)) best = { id: loc.id, len: name.length };
  }
  return best?.id;
}

export function describeOutcome(o: Outcome | undefined): string {
  if (!o || isEmpty(o)) return 'No effect';
  const parts: string[] = [];
  if (o.money) parts.push(o.money > 0 ? `+$${o.money}` : `-$${-o.money}`);
  if (o.strength) parts.push(`${o.strength > 0 ? '+' : ''}${o.strength} Strength`);
  if (o.sanity) parts.push(`${o.sanity > 0 ? '+' : ''}${o.sanity} Sanity`);
  if (o.strengthD6) parts.push(`${o.strengthD6 > 0 ? '+' : '-'}D6 Strength`);
  if (o.sanityD6) parts.push(`${o.sanityD6 > 0 ? '+' : '-'}D6 Sanity`);
  if (o.items) parts.push(`+${o.items} item${o.items > 1 ? 's' : ''}`);
  if (o.specificItemId) parts.push('gain the item');
  if (o.spells) parts.push(`+${o.spells} spell${o.spells > 1 ? 's' : ''}`);
  if (o.skills) parts.push('+1 skill');
  if (o.buyTopItem) parts.push('buy the item');
  if (o.returnRandom) parts.push('thrown back to Arkham');
  if (o.loseItem) parts.push('lose an item');
  if (o.loseSpell) parts.push('lose a spell');
  if (o.loseGunsAndMoney) parts.push('lose guns & money');
  if (o.jail) parts.push('jail');
  else if (o.skipTurns) parts.push(`lose ${o.skipTurns} turn${o.skipTurns > 1 ? 's' : ''}`);
  if (o.hospital) parts.push('to hospital');
  if (o.monster) parts.push('monster!');
  if (o.gate) parts.push('gate opens!');
  if (o.retainer) parts.push('Retainer (+$2/turn)');
  if (o.statBoost) parts.push(`+${o.statBoost.amount} ${o.statBoost.stat.replace('Skill', '')}`);
  if (o.teleport === 'any') parts.push('move anywhere');
  else if (o.teleport) parts.push(`go to ${LOCATIONS_DATA[o.teleport]?.name}${o.rollThere ? ' & encounter' : ''}`);
  if (o.dreamlands) parts.push("visit Earth's Dreamlands");
  if (o.moveBonus) parts.push(`${o.moveBonus > 0 ? '+' : ''}${o.moveBonus} next move`);
  if (o.stayInBox) parts.push('stay in this box');
  if (o.lostInSpace) parts.push('lost in time & space');
  if (o.gamble) parts.push('double or nothing');
  return parts.join(', ');
}

/** Turn a location / other world event into playable options. */
export function buildEncounterOptions(
  event: LocationEvent,
  inv: Investigator,
  state: GameState,
  ctx: { locationId?: string; otherWorld?: boolean }
): EncounterOption[] {
  const text = event.text;
  const l = text.toLowerCase();
  const ow = !!ctx.otherWorld;
  const base = rewardToOutcome(event);
  const decline: EncounterOption = { id: 'decline', label: 'Decline — step out to the sidewalk', tone: 'neutral' };

  // Charity of the Order of Dagon
  if (/charity/.test(l)) {
    return [
      { id: 'c_money', label: 'Accept $10', outcome: { money: 10 }, tone: 'primary' },
      { id: 'c_items', label: 'Accept 2 items', outcome: { items: 2 }, tone: 'primary' },
      { id: 'c_spell', label: 'Accept 1 spell', outcome: { spells: 1 }, tone: 'primary' },
      decline
    ];
  }

  // Double or nothing gambles
  if (/double[- ]or[- ]nothing/.test(l)) {
    return [
      { id: 'gamble', label: `Gamble all $${inv.money}`, detail: '50%: double it, 50%: lose it all', outcome: { gamble: true }, tone: 'danger' },
      decline
    ];
  }

  // Mutant rat in the cellar
  if (/if you have a gun/.test(l)) {
    const hasGun = inv.items.some(i => i.isGun);
    return [{ id: 'gun', label: hasGun ? 'Shoot the rat (+$2)' : 'No gun — leave it be', outcome: hasGun ? { money: 2 } : {}, tone: 'primary' }];
  }

  // Buy an item at list price
  if (/list price/.test(l)) {
    const top: Card | undefined = state.itemDeck[0];
    if (!top) return [{ id: 'none', label: 'Nothing left to buy', tone: 'neutral' }];
    const price = top.price || 3;
    return [
      { id: 'buy', label: `Buy ${top.name} for $${price}`, detail: top.description, cost: price, outcome: { buyTopItem: true }, tone: 'primary' },
      decline
    ];
  }

  // Automobile sale
  if (/automobile for \$(\d+)/.test(l)) {
    const price = num(l.match(/automobile for \$(\d+)/)![1]);
    return [
      { id: 'car', label: `Buy the Automobile for $${price}`, cost: price, outcome: { specificItemId: 'item_automobile' }, tone: 'primary' },
      decline
    ];
  }

  // "lose 1 strength or 1 sanity point" / "add 1 strength point or 1 sanity point"
  const either = l.match(/(lose|add) (\d) strength(?: points?)? or (\d) sanity/);
  if (either) {
    const sign = either[1] === 'lose' ? -1 : 1;
    const verb = sign < 0 ? 'Lose' : 'Gain';
    return [
      { id: 'str', label: `${verb} ${either[2]} Strength`, outcome: { strength: sign * num(either[2]) }, tone: sign < 0 ? 'danger' : 'primary' },
      { id: 'san', label: `${verb} ${either[3]} Sanity`, outcome: { sanity: sign * num(either[3]) }, tone: sign < 0 ? 'danger' : 'primary' }
    ];
  }
  const spellOrSanity = l.match(/discard 1 spell card or lose (\d) sanity/);
  if (spellOrSanity && inv.spells.length > 0) {
    return [
      { id: 'spell', label: 'Discard a spell', outcome: { loseSpell: true }, tone: 'danger' },
      { id: 'san', label: `Lose ${spellOrSanity[1]} Sanity`, outcome: { sanity: -num(spellOrSanity[1]) }, tone: 'danger' }
    ];
  }

  // Guns & money stolen
  if (/takes your guns and money/.test(l)) {
    return [{ id: 'robbed', label: 'Continue', outcome: { loseGunsAndMoney: true, skipTurns: 1 }, tone: 'danger' }];
  }

  const check = detectCheck(text);
  const costRe = /(?:pay|spend|for|demands|dues of|total|costs?)\s+\$(\d+)/gi;
  const costs = [...text.matchAll(costRe)];

  // Cost + skill roll (e.g. join the Order or Sneak away)
  if (check && costs.length > 0 && costs[0].index! < check.index) {
    const cost = num(costs[0][1]);
    const { success, failure } = splitAfterCheck(text, check.index + check.length);
    return [
      { id: 'pay', label: `Pay $${cost}`, cost, outcome: {}, tone: 'neutral' },
      { id: 'check', label: checkLabel(inv, check.skill), check: { skill: check.skill, success: parseEffects(success, ow), failure: parseEffects(failure, ow) }, tone: 'primary' }
    ];
  }

  // Skill roll
  if (check) {
    const split = splitAfterCheck(text, check.index + check.length);
    const success = check.inverted ? '' : split.success;
    const failure = check.inverted ? split.success + ' ' + split.failure : split.failure;
    let successOutcome = parseEffects(success, ow);
    const failureOutcome = parseEffects(failure, ow);
    if ((failureOutcome.money || 0) > 0) delete failureOutcome.money; // failing never pays
    if (isEmpty(successOutcome) && !isEmpty(base) && !base.monster) successOutcome = base;
    return [
      {
        id: 'check',
        label: checkLabel(inv, check.skill),
        detail: `Success: ${describeOutcome(successOutcome)} · Failure: ${describeOutcome(failureOutcome)}`,
        check: { skill: check.skill, success: successOutcome, failure: failureOutcome },
        tone: 'primary'
      }
    ];
  }

  // Paid offers ("For $5, hire...", "pay $3 to heal D6...", "buy X for $10, or buy Y for $1...")
  if (costs.length > 0) {
    const options: EncounterOption[] = [];
    const clauses = costs.length > 1 ? text.split(/,\s*or\s+/i) : [text];
    clauses.forEach((clause, i) => {
      const c = clause.match(/(?:pay|spend|for|demands|dues of|total|costs?)\s+\$(\d+)/i);
      if (!c) return;
      let cost = num(c[1]);
      const offer = costs.length === 1 ? clause.split(/,?\s+or\s+/i)[0] : clause;
      let outcome = parseEffects(offer, ow);
      if (costs.length > 1 && /buy an item/i.test(clause)) outcome = { ...outcome, items: 1 };
      if (/destitute/i.test(text) && inv.money < cost) cost = 0;
      if (costs.length === 1 && !isEmpty(base)) {
        outcome = { ...base, ...outcome };
        if (outcome.strengthD6) delete outcome.strength;
        if (outcome.sanityD6) delete outcome.sanity;
      }
      if (/transit|ride/i.test(clause)) outcome = { ...outcome, teleport: 'any' };
      options.push({
        id: `pay_${i}`,
        label: cost > 0 ? `Pay $${cost}` : 'Accept (free — destitute)',
        detail: describeOutcome(outcome),
        cost,
        outcome,
        tone: 'primary'
      });
    });
    const declineTail = costs.length > 1 ? '' : text.split(/\s+or\s+/i).slice(1).join(' or ');
    const declineOutcome = parseEffects(declineTail, ow);
    delete declineOutcome.jail; // "pay or go to the sidewalk / jail" — sidewalk is always available
    options.push({ ...decline, label: isEmpty(declineOutcome) ? decline.label : 'Refuse', detail: isEmpty(declineOutcome) ? undefined : describeOutcome(declineOutcome), outcome: declineOutcome });
    return options;
  }

  // Free rides
  if (event.type === 'teleport') {
    const any = /anywhere|any (?:arkham )?location|any space|anywhere in town/.test(l);
    const dest = any ? 'any' : findLocationInText(text, ctx.locationId);
    if (dest) {
      const outcome: Outcome = { teleport: dest, rollThere: dest !== 'any' && /roll/.test(l) };
      return [
        { id: 'ride', label: dest === 'any' ? 'Accept the ride — choose a destination' : `Go to ${LOCATIONS_DATA[dest]?.name}`, detail: describeOutcome(outcome), outcome, tone: 'primary' },
        decline
      ];
    }
  }

  // Plain events: use structured reward if present, else read the text
  const outcome = isEmpty(base) ? parseEffects(text, ow) : base;
  if (ow && outcome.monster) {
    return [{ id: 'monster', label: 'Face the monster!', outcome, tone: 'danger' }];
  }
  return [{ id: 'ok', label: 'Continue', detail: isEmpty(outcome) ? undefined : describeOutcome(outcome), outcome, tone: 'primary' }];
}

export interface FollowUp {
  combatMonsterId?: string; // a monster appeared on the investigator's space
  otherWorldMonster?: boolean;
  teleportAny?: boolean;
  encounterAt?: string; // location to immediately encounter
  dreamlands?: boolean;
  knockedOut?: boolean;
}

/** Apply an outcome to the investigator at `idx`. Pure: returns the new state plus follow-ups for the UI. */
export function applyOutcome(
  state: GameState,
  idx: number,
  outcome: Outcome | undefined,
  ctx: { locationId?: string; otherWorld?: boolean; cost?: number }
): { state: GameState; follow: FollowUp } {
  let s = state;
  const follow: FollowUp = {};
  const inv0 = s.investigators[idx];
  if (!inv0) return { state: s, follow };
  const name = inv0.name;
  const o = outcome || {};

  if (ctx.cost) {
    s = patchInvestigator(s, idx, i => ({ ...i, money: Math.max(0, i.money - ctx.cost!) }));
    s = addLog(s, `${name} pays $${ctx.cost}.`);
  }

  if (o.gamble) {
    const win = Math.random() < 0.5;
    s = patchInvestigator(s, idx, i => ({ ...i, money: win ? i.money * 2 : 0 }));
    s = addLog(s, win ? `${name} wins the bet and doubles their cash!` : `${name} loses every last cent.`, 'event');
  }

  const strDelta = (o.strength || 0) + (o.strengthD6 ? o.strengthD6 * rollD6() : 0);
  const sanDelta = (o.sanity || 0) + (o.sanityD6 ? o.sanityD6 * rollD6() : 0);
  if (strDelta || sanDelta || o.money) {
    s = patchInvestigator(s, idx, i => ({
      ...i,
      strength: Math.min(i.maxStrength, i.strength + strDelta),
      sanity: Math.min(i.maxSanity, i.sanity + sanDelta),
      money: Math.max(0, i.money + (o.money || 0))
    }));
    const bits: string[] = [];
    if (strDelta) bits.push(`${strDelta > 0 ? '+' : ''}${strDelta} Strength`);
    if (sanDelta) bits.push(`${sanDelta > 0 ? '+' : ''}${sanDelta} Sanity`);
    if (o.money) bits.push(`${o.money > 0 ? '+' : '-'}$${Math.abs(o.money)}`);
    s = addLog(s, `${name}: ${bits.join(', ')}.`);
  }

  if (o.items) {
    const r = drawItems(s, idx, o.items);
    s = r.state;
    if (r.drawn.length) s = addLog(s, `${name} gains ${r.drawn.map(c => c.name).join(', ')}.`);
  }
  if (o.buyTopItem) {
    const r = drawItems(s, idx, 1);
    s = r.state;
    if (r.drawn.length) s = addLog(s, `${name} buys ${r.drawn[0].name}.`);
  }
  if (o.specificItemId) {
    const card = s.itemDeck.find(c => c.id === o.specificItemId);
    if (card) {
      s = { ...s, itemDeck: s.itemDeck.filter(c => c.id !== card.id) };
      s = patchInvestigator(s, idx, i => ({ ...i, items: [...i.items, card], hasAutomobile: i.hasAutomobile || card.specialEffect === 'car_travel' }));
      s = addLog(s, `${name} acquires the ${card.name}.`);
    }
  }
  if (o.spells) {
    const r = drawSpells(s, idx, o.spells);
    s = r.state;
    if (r.drawn.length) s = addLog(s, `${name} learns ${r.drawn.map(c => c.name).join(', ')}.`);
  }
  if (o.skills) {
    const held = new Set(s.investigators[idx].skills.map(k => k.id));
    const card = s.skillDeck.find(k => !held.has(k.id));
    if (card) {
      s = { ...s, skillDeck: s.skillDeck.filter(k => k.id !== card.id) };
      s = patchInvestigator(s, idx, i => ({ ...i, skills: [...i.skills, card] }));
      s = addLog(s, `${name} learns the skill ${card.name}.`);
    }
  }
  if (o.returnRandom) {
    const keys = Object.keys(GATE_APPEARANCE_TABLE);
    const entry = GATE_APPEARANCE_TABLE[Number(keys[Math.floor(Math.random() * keys.length)])];
    const nodeId = getNodeForLocation(entry.locationId) || 'LOC_TRAIN_STATION';
    s = patchInvestigator(s, idx, i => ({ ...i, otherWorldState: undefined, locationNodeId: nodeId }));
    s = addLog(s, `${name} is hurled back into Arkham at ${entry.locationName}!`);
  }
  if (o.loseItem) {
    const r = discardRandomCard(s, idx, 'item');
    s = r.state;
    if (r.lost) s = addLog(s, `${name} loses ${r.lost.name}.`);
  }
  if (o.loseSpell) {
    const r = discardRandomCard(s, idx, 'spell');
    s = r.state;
    if (r.lost) s = addLog(s, `${name} forgets ${r.lost.name}.`);
  }
  if (o.loseGunsAndMoney) {
    const guns = s.investigators[idx].items.filter(i => i.isGun);
    s = patchInvestigator(s, idx, i => ({ ...i, money: 0, items: i.items.filter(c => !c.isGun) }));
    s = { ...s, discardedItems: [...s.discardedItems, ...guns] };
    s = addLog(s, `${name} is robbed of all money${guns.length ? ' and guns' : ''}.`);
  }
  if (o.retainer) {
    s = patchInvestigator(s, idx, i => ({ ...i, hasRetainer: true }));
    s = addLog(s, `${name} is now on Retainer (+$2 each turn).`);
  }
  if (o.statBoost) {
    const { stat, amount } = o.statBoost;
    s = patchInvestigator(s, idx, i => ({ ...i, stats: { ...i.stats, [stat]: Math.min(6, i.stats[stat] + amount) } }));
    s = addLog(s, `${name} gains +${amount} ${stat.replace('Skill', '')}.`);
  }
  if (o.moveBonus) {
    s = patchInvestigator(s, idx, i => ({ ...i, moveBonus: (i.moveBonus || 0) + o.moveBonus! }));
    s = addLog(s, `${name} will get +${o.moveBonus} on their next movement roll.`);
  }
  if (o.stayInBox) {
    s = patchInvestigator(s, idx, i => (i.otherWorldState ? { ...i, otherWorldState: { ...i.otherWorldState, stayInBox: true } } : i));
    s = addLog(s, `${name} is bewildered and stays in this box next turn.`);
  }
  if (o.skipTurns) {
    s = patchInvestigator(s, idx, i => ({
      ...i,
      skipTurns: (i.skipTurns || 0) + o.skipTurns!,
      isInJail: !!o.jail,
      locationNodeId: o.jail ? 'LOC_POLICE_STATION_JAIL' : i.locationNodeId
    }));
    s = addLog(s, o.jail ? `${name} is thrown in jail!` : `${name} will lose ${o.skipTurns} turn${o.skipTurns > 1 ? 's' : ''}.`);
  }
  if (o.hospital) {
    s = patchInvestigator(s, idx, i => ({ ...i, locationNodeId: 'LOC_HOSPITAL' }));
    s = addLog(s, `${name} is taken to St. Mary's Hospital.`);
  }

  // Knock-outs from damage
  const inv = s.investigators[idx];
  if (inv.strength <= 0 || inv.sanity <= 0 || o.lostInSpace) {
    s = knockOut(s, idx, inv.strength <= 0 ? 'strength' : 'sanity');
    follow.knockedOut = true;
    return { state: s, follow };
  }

  if (o.gate && ctx.locationId) {
    s = openGateAt(s, ctx.locationId);
    const nodeId = getNodeForLocation(ctx.locationId);
    const m = [...s.activeMonsters].reverse().find(mm => mm.currentNodeId === nodeId);
    if (m) follow.combatMonsterId = m.id;
  } else if (o.monster) {
    if (ctx.otherWorld) {
      follow.otherWorldMonster = true;
    } else if (ctx.locationId) {
      const r = spawnMonsterAtLocation(s, ctx.locationId);
      s = r.state;
      if (r.monster) follow.combatMonsterId = r.monster.id;
    }
  }

  if (o.teleport === 'any') follow.teleportAny = true;
  else if (o.teleport) {
    const nodeId = getNodeForLocation(o.teleport);
    if (nodeId) {
      s = patchInvestigator(s, idx, i => ({ ...i, locationNodeId: nodeId }));
      s = addLog(s, `${name} travels to ${LOCATIONS_DATA[o.teleport]?.name}.`);
      if (o.rollThere) follow.encounterAt = o.teleport;
    }
  }
  if (o.dreamlands) follow.dreamlands = true;

  return { state: s, follow };
}
