/**
 * Arkham Horror (1987) rules engine.
 *
 * The game is a generator: it yields a Prompt whenever a player must decide something and
 * resumes with the Answer. With a seeded RNG this makes the whole game a pure function of
 * (setup, answers[]) — the basis for save games, undo, and online play (every client replays
 * the same answer stream).
 */
import {
  NEIGHBORS, STREET_NEIGHBORS, TAXI_SPACES, compass, nodeLabel, distances, isLocNode, locNode, nextStreetNode,
  nodeLoc, shortestPath, vehicleBlocked,
} from './board';
import { FLUTE_TARGETS, ITEM_BY_ID, LOCAL_CHARACTERS, SKILL_CARDS, SPELL_BY_ID } from './data/cards';
import type { Amount, Condition, Effect, LocationId, SkillName, TableEntry, TestName, WorldId } from './data/effects';
import { INVESTIGATORS, INVESTIGATOR_BY_ID } from './data/investigators';
import { GATE_APPEARANCE, GATE_EXTRA_MONSTER, LOCATIONS } from './data/locations';
import { MONSTER_BY_ID, ghastliness, type MonsterDef } from './data/monsters';
import { WORLDS } from './data/otherWorlds';
import { Rng } from './rng';
import { START_NODE, createState, gateLimit, newInvestigator } from './state';
import type {
  Answer, Card, GameState, GateInst, HonorEntry, InvId, Investigator, MonsterInst, Prompt, PromptOption, Setup,
} from './types';

export type Flow<T = void> = Generator<Prompt, T, Answer>;

/** Thrown when the investigator is removed from the current encounter (hospital, sanitarium, lost, carried off). */
export class Interrupt {
  constructor(public inv: InvId) {}
}
class GameOver {}

const HOSPITAL = locNode('hospital');
const SANITARIUM = locNode('sanitarium');
const POLICE = locNode('police_station');

const MAX = 7;

export class Game {
  state: GameState;
  rng: Rng;
  /** Per-combat Shoggoth strength (SP 14 + D6). */
  private rolledSp: Record<string, number> = {};

  constructor(setup: Setup) {
    this.rng = new Rng(setup.seed);
    this.state = createState(setup, this.rng);
  }

  // ------------------------------------------------------------------ basics

  get s() {
    return this.state;
  }

  log(text: string, kind?: GameState['log'][number]['kind']) {
    this.s.log.push({ turn: this.s.turn, text, kind });
  }

  inv(id: InvId): Investigator {
    return this.s.investigators[id];
  }

  def(m: MonsterInst): MonsterDef {
    return MONSTER_BY_ID[m.def];
  }

  mName(m: MonsterInst) {
    return this.def(m).species;
  }

  locName(l: LocationId) {
    return LOCATIONS[l].name;
  }

  nodeName(node: string) {
    return nodeLabel(node, (l) => this.locName(l));
  }

  node(inv: Investigator): string | null {
    return inv.place.t === 'arkham' ? inv.place.node : null;
  }

  activeInvestigators(): Investigator[] {
    return this.s.order.map((id) => this.inv(id)).filter((i) => !i.out && !i.stranded && i.activeFrom <= this.s.turn);
  }

  invsAt(node: string): Investigator[] {
    return this.activeInvestigators().filter((i) => this.node(i) === node);
  }

  monstersAt(node: string): MonsterInst[] {
    return Object.values(this.s.monsters).filter((m) => m.node === node);
  }

  boardMonsters(): MonsterInst[] {
    return Object.values(this.s.monsters).filter((m) => m.node !== null);
  }

  gateAt(loc: LocationId | null): GateInst | undefined {
    if (!loc) return undefined;
    return Object.values(this.s.gates).find((g) => g.location === loc);
  }

  openGates(): GateInst[] {
    return Object.values(this.s.gates).filter((g) => g.location !== null);
  }

  uid(prefix: string) {
    return `${prefix}${this.s.uidCounter++}`;
  }

  roll(label: string, n = 1, target?: number): number[] {
    const dice = Array.from({ length: n }, () => this.rng.d6());
    const sum = dice.reduce((a, b) => a + b, 0);
    this.showRoll({ label, dice, target, success: target === undefined ? undefined : sum <= target });
    return dice;
  }

  /** Record a roll for display (the dice tray shows every roll since the last decision). */
  showRoll(r: GameState['rolls'][number]) {
    const shown = { ...r, seq: ++this.s.rollSeq };
    this.s.lastRoll = shown;
    this.s.rolls.push(shown);
    if (this.s.rolls.length > 60) this.s.rolls.splice(0, this.s.rolls.length - 60);
  }

  amount(n: Amount, label: string): number {
    return n === 'd6' ? this.roll(label)[0] : n;
  }

  skill(inv: Investigator, s: SkillName): number {
    const base = INVESTIGATOR_BY_ID[inv.defId][s];
    const cards = inv.skillCards.filter((id) => SKILL_CARDS.find((c) => c.id === id)?.skill === s).length;
    let v = base + cards;
    if (s === 'sneak') v += inv.tempSneak;
    if (s === 'fight') v += 2 * inv.localChars.length;
    return v;
  }

  hasItem(inv: Investigator, id: string) {
    return inv.items.some((c) => c.id === id);
  }

  spellReady(inv: Investigator, id: string): Card | undefined {
    return inv.spells.find((c) => c.id === id && !inv.usedSpells.includes(c.uid));
  }

  // ------------------------------------------------------------------ prompts

  *ask(p: Prompt): Flow<string> {
    const a = yield p;
    return Array.isArray(a) ? a[0] : a;
  }

  *choose(inv: Investigator | null, title: string, options: PromptOption[], text?: string): Flow<string> {
    const enabled = options.filter((o) => !o.disabled);
    if (enabled.length === 0) return '';
    return yield* this.ask({ kind: 'choice', inv: inv?.id ?? null, title, text, options });
  }

  *yesNo(inv: Investigator, title: string, yes: string, no: string, text?: string): Flow<boolean> {
    return (yield* this.choose(inv, title, [{ key: 'y', label: yes }, { key: 'n', label: no }], text)) === 'y';
  }

  *ack(inv: Investigator | null, title: string, text?: string): Flow {
    yield* this.ask({ kind: 'ack', inv: inv?.id ?? null, title, text, options: [{ key: 'ok', label: 'Continue' }] });
  }

  // ------------------------------------------------------------------ rolls

  test(inv: Investigator, t: TestName, mod = 0, why = ''): boolean {
    const value = (t === 'str' ? inv.str : t === 'san' ? inv.san : this.skill(inv, t)) + mod;
    const name = { str: 'Strength', san: 'Sanity', fastTalk: 'Fast Talk', fight: 'Fight', knowledge: 'Knowledge', sneak: 'Sneak' }[t];
    const [d] = this.roll(`${inv.name}: ${name} roll${why ? ` (${why})` : ''}`, 1, value);
    const ok = d <= value;
    this.log(`${inv.name} rolls ${d} against ${name} ${value}: ${ok ? 'success' : 'failure'}.`, 'roll');
    if (t === 'sneak' && inv.tempSneak) inv.tempSneak = 0;
    return ok;
  }

  // ------------------------------------------------------------------ main loop

  *run(): Flow {
    try {
      yield* this.setupGame();
      for (;;) {
        this.s.phase = 'investigator';
        for (const i of Object.values(this.s.investigators)) i.sanityRolled = [];
        this.s.rolls = this.s.rolls.slice(-12);
        for (const id of [...this.s.order]) {
          const inv = this.inv(id);
          if (inv.out || inv.activeFrom > this.s.turn) continue;
          this.s.active = id;
          if (inv.stranded) {
            yield* this.strandedTurn(inv);
            continue;
          }
          try {
            yield* this.investigatorTurn(inv);
          } catch (e) {
            if (!(e instanceof Interrupt)) throw e;
          }
          this.endInvestigatorTurn(inv);
          this.checkVictory();
        }
        this.s.active = null;
        yield* this.mythos();
        this.checkEndOfTurn();
        this.s.turn++;
        this.log(`— Game turn ${this.s.turn} —`, 'info');
      }
    } catch (e) {
      if (!(e instanceof GameOver)) throw e;
      this.s.phase = 'over';
      this.s.active = null;
    }
  }

  *setupGame(): Flow {
    const s = this.s;
    this.log('The year is 1926. Strange things are afoot in Arkham, Massachusetts.', 'info');
    for (const id of s.order) this.dealStartingCards(this.inv(id));

    // Setup step 7: first gate, three monsters, doom on space 1.
    const [a, b] = this.roll('Gate Appearance Table', 2);
    const loc = GATE_APPEARANCE[a + b];
    const gate = this.drawGate(loc)!;
    this.log(`A gate to ${WORLDS[gate.world].name} opens at ${this.locName(loc)}! Three monsters emerge.`, 'mythos');
    for (let i = 0; i < 3; i++) yield* this.appear(locNode(loc), null, false);

    // Setup step 8: highest 2D6 goes first, then play to the left.
    const rolls = s.order.map((id) => {
      const [x, y] = this.roll('Order of play', 2);
      return { id, r: x + y };
    });
    const best = rolls.reduce((m, r, i) => (r.r > rolls[m].r ? i : m), 0);
    s.order = [...s.order.slice(best), ...s.order.slice(0, best)];
    this.log(`${this.inv(s.order[0]).name} rolled highest and goes first.`, 'info');
    this.log('— Game turn 1 —', 'info');
  }

  dealStartingCards(inv: Investigator) {
    const count = Object.keys(this.s.investigators).length > 4 ? 2 : 3;
    const skipped: string[] = [];
    while (inv.items.length < count && this.s.itemDeck.length + this.s.itemDiscard.length > 0) {
      const id = this.drawCard('item');
      if (!id) break;
      if (id === 'auction') skipped.push(id);
      else inv.items.push({ uid: this.uid('c'), id });
    }
    this.s.itemDeck.push(...skipped);
    if (skipped.length) this.rng.shuffle(this.s.itemDeck);
    const sp = this.drawCard('spell');
    if (sp) inv.spells.push({ uid: this.uid('c'), id: sp });
    const sk = this.s.skillDeck.shift();
    if (sk) inv.skillCards.push(sk);
    inv.charity = 'ready';
  }

  // ------------------------------------------------------------------ decks

  drawCard(deck: 'item' | 'spell'): string | null {
    const d = deck === 'item' ? this.s.itemDeck : this.s.spellDeck;
    const discard = deck === 'item' ? this.s.itemDiscard : this.s.spellDiscard;
    if (d.length === 0 && discard.length) {
      d.push(...this.rng.shuffle(discard.splice(0)));
    }
    return d.shift() ?? null;
  }

  discardCard(deck: 'item' | 'spell', id: string) {
    (deck === 'item' ? this.s.itemDiscard : this.s.spellDiscard).push(id);
  }

  *gainItem(inv: Investigator, id: string): Flow {
    if (id === 'auction') {
      this.discardCard('item', 'auction');
      this.log(`${inv.name} draws an Auction card.`);
      yield* this.auction(inv);
      return;
    }
    yield* this.receiveItem(inv, id);
  }

  /** Take an item card into hand (OPTION: Strength limits how many items can be carried). */
  *receiveItem(inv: Investigator, id: string): Flow {
    if (this.s.setup.options.carryLimit && inv.items.length >= inv.str) {
      const k = yield* this.choose(inv, `${inv.name} cannot carry more (Strength ${inv.str}, ${inv.items.length} items)`, [
        ...inv.items.map((c) => ({ key: c.uid, label: `Drop ${ITEM_BY_ID[c.id].name} to take ${ITEM_BY_ID[id].name}`, ref: c.id })),
        { key: 'leave', label: `Leave the ${ITEM_BY_ID[id].name} behind`, ref: id },
      ]);
      if (k === 'leave' || !k) {
        this.discardCard('item', id);
        return this.log(`${inv.name} leaves the ${ITEM_BY_ID[id].name} behind.`);
      }
      const dropped = inv.items.find((c) => c.uid === k);
      this.removeItem(inv, k);
      if (dropped) this.log(`${inv.name} drops ${ITEM_BY_ID[dropped.id].name}.`);
    }
    inv.items.push({ uid: this.uid('c'), id });
    this.log(`${inv.name} gains ${ITEM_BY_ID[id].name}.`);
  }

  *drawItems(inv: Investigator, n: number): Flow {
    for (let i = 0; i < n; i++) {
      const id = this.drawCard('item');
      if (!id) return this.log('The item deck is empty.');
      yield* this.gainItem(inv, id);
    }
  }

  drawSpells(inv: Investigator, n: number) {
    for (let i = 0; i < n; i++) {
      const id = this.drawCard('spell');
      if (!id) return this.log('The spell deck is empty.');
      inv.spells.push({ uid: this.uid('c'), id });
      this.log(`${inv.name} learns ${SPELL_BY_ID[id].name}.`);
    }
  }

  removeItem(inv: Investigator, uid: string, toDeck = true) {
    const i = inv.items.findIndex((c) => c.uid === uid);
    if (i < 0) return;
    const [c] = inv.items.splice(i, 1);
    if (toDeck) this.discardCard('item', c.id);
  }

  removeSpell(inv: Investigator, uid: string) {
    const i = inv.spells.findIndex((c) => c.uid === uid);
    if (i < 0) return;
    const [c] = inv.spells.splice(i, 1);
    this.discardCard('spell', c.id);
  }

  *chooseCard(inv: Investigator, deck: 'item' | 'spell', title: string, filter: (c: Card) => boolean = () => true): Flow<Card | null> {
    const cards = (deck === 'item' ? inv.items : inv.spells).filter(filter);
    if (cards.length === 0) return null;
    if (cards.length === 1) return cards[0];
    const key = yield* this.ask({
      kind: 'cards', inv: inv.id, title,
      options: cards.map((c) => ({ key: c.uid, label: deck === 'item' ? ITEM_BY_ID[c.id].name : SPELL_BY_ID[c.id].name, ref: c.id })),
    });
    return cards.find((c) => c.uid === key) ?? cards[0];
  }

  // ------------------------------------------------------------------ strength / sanity

  gain(inv: Investigator, pool: 'str' | 'san' | 'money', n: number) {
    if (pool === 'money') inv.money += n;
    else inv[pool] = Math.min(MAX, inv[pool] + n);
    const label = pool === 'money' ? `$${n}` : `${n} ${pool === 'str' ? 'Strength' : 'Sanity'}`;
    this.log(`${inv.name} gains ${label}.`);
    if (inv.stranded && inv.str > 0 && inv.san > 0) this.revive(inv, null);
  }

  *lose(inv: Investigator, pool: 'str' | 'san' | 'money', n: number): Flow {
    if (n <= 0) return;
    if (pool === 'money') {
      const paid = Math.min(inv.money, n);
      inv.money -= paid;
      this.log(`${inv.name} loses $${paid}.`);
      return;
    }
    inv[pool] = Math.max(0, inv[pool] - n);
    this.log(`${inv.name} loses ${n} ${pool === 'str' ? 'Strength' : 'Sanity'}.`, 'warn');
    if (inv[pool] === 0) yield* this.knockout(inv, pool);
  }

  /** Out of Strength/Sanity: Hospital or Sanitarium in Arkham, lost in an Other World. */
  *knockout(inv: Investigator, pool: 'str' | 'san'): Flow {
    if (inv.place.t === 'world') {
      if (this.s.setup.options.rescueLost) yield* this.strand(inv, pool);
      else yield* this.loseInvestigator(inv, pool === 'str' ? 'perished in an Other World' : 'went mad in an Other World');
      throw new Interrupt(inv.id);
    }
    if (pool === 'str') {
      this.log(`${inv.name} collapses and is taken to St. Mary's Hospital.`, 'warn');
      this.moveTo(inv, HOSPITAL);
      const c = yield* this.chooseCard(inv, 'item', 'Choose an item to lose');
      if (c) {
        this.removeItem(inv, c.uid);
        this.log(`${inv.name} loses ${ITEM_BY_ID[c.id].name}.`);
      }
    } else {
      this.log(`${inv.name} goes temporarily insane and is committed to the Arkham Sanitarium.`, 'warn');
      this.moveTo(inv, SANITARIUM);
      const c = yield* this.chooseCard(inv, 'spell', 'Choose a spell to forget');
      if (c) {
        this.removeSpell(inv, c.uid);
        this.log(`${inv.name} forgets ${SPELL_BY_ID[c.id].name}.`);
      }
    }
    throw new Interrupt(inv.id);
  }

  *loseInvestigator(inv: Investigator, reason: string): Flow {
    this.log(`${inv.name} ${reason}. The investigator is lost!`, 'warn');
    for (const c of inv.items) this.discardCard('item', c.id);
    for (const c of inv.spells) this.discardCard('spell', c.id);
    this.s.skillDeck.push(...inv.skillCards);
    this.rng.shuffle(this.s.skillDeck);
    for (const uid of inv.trophies.monsters) this.toCup(this.s.monsters[uid]);
    for (const uid of inv.trophies.gates) this.s.gateDeck.push(uid);
    this.rng.shuffle(this.s.gateDeck);
    if (inv.retainer) this.s.retainersLeft++;
    if (inv.bound) this.toCup(this.s.monsters[inv.bound]);
    this.s.localCharsLeft.push(...inv.localChars);
    Object.assign(inv, { items: [], spells: [], skillCards: [], localChars: [], retainer: false, automobile: false, bound: null, stranded: false, waiting: false, out: true });
    inv.trophies = { monsters: [], gates: [] };
    yield* this.replaceInvestigator(inv);
  }

  *replaceInvestigator(lost: Investigator): Flow {
    const inPlay = new Set(Object.values(this.s.investigators).filter((i) => !i.out).map((i) => i.defId));
    const options = INVESTIGATORS.filter((d) => !inPlay.has(d.id)).map((d) => ({
      key: d.id, label: `${d.name} — Fast Talk ${d.fastTalk}, Fight ${d.fight}, Knowledge ${d.knowledge}, Sneak ${d.sneak}`, ref: d.id,
    }));
    const player = this.s.setup.players[lost.player]?.name ?? 'Player';
    const defId = yield* this.ask({ kind: 'newInvestigator', inv: null, title: `${player}: choose a new investigator`, options, data: { player: lost.player } });
    const str = yield* this.ask({
      kind: 'choice', inv: null, title: 'Divide 10 points between Strength and Sanity',
      options: [3, 4, 5, 6, 7].map((n) => ({ key: String(n), label: `Strength ${n} / Sanity ${10 - n}` })),
      data: { player: lost.player },
    });
    const fresh = newInvestigator(this.s, defId, lost.player, Number(str), this.s.turn + 1);
    this.s.investigators[fresh.id] = fresh;
    this.s.order.splice(this.s.order.indexOf(lost.id) + 1, 0, fresh.id);
    this.dealStartingCards(fresh);
    this.log(`${fresh.name} arrives at the Train Station and will join the investigation next turn.`, 'info');
  }

  // ---- OPTION: rescuing investigators lost in an Other World

  *strand(inv: Investigator, pool: 'str' | 'san'): Flow {
    const p = inv.place;
    if (p.t !== 'world') return;
    inv.stranded = true;
    if (inv.bound) {
      this.toCup(this.s.monsters[inv.bound]);
      inv.bound = null;
    }
    this.log(`${inv.name} ${pool === 'str' ? 'collapses' : 'loses their mind'} in ${WORLDS[p.world].name} (box ${p.box}). Another investigator reaching this box may rescue them.`, 'warn');
    const k = yield* this.choose(inv, `${inv.name} is lost in ${WORLDS[p.world].name}`, [
      { key: 'wait', label: 'Wait for a rescue (do nothing until then)' },
      { key: 'new', label: 'Start a new investigator now (the lost one can still be rescued)' },
    ]);
    inv.waiting = k === 'wait';
    if (!inv.waiting) yield* this.replaceInvestigator(inv);
  }

  *strandedTurn(inv: Investigator): Flow {
    if (!inv.waiting) return;
    const k = yield* this.choose(inv, `${inv.name} waits to be rescued`, [
      { key: 'wait', label: 'Keep waiting' },
      { key: 'give', label: 'Give up: start a new investigator' },
    ]);
    if (k === 'give') yield* this.loseInvestigator(inv, 'is given up for lost');
  }

  /** Investigators (including stranded ones) in the same Other World box. */
  worldMates(inv: Investigator): Investigator[] {
    const p = inv.place;
    if (p.t !== 'world') return [];
    return Object.values(this.s.investigators).filter((o) => !o.out && o.place.t === 'world' && o.place.world === p.world && o.place.box === p.box);
  }

  /** Rescuer tries to carry stranded investigators along to the next box (Strength roll each). */
  *carryAlong(inv: Investigator, others: Investigator[]): Flow<Investigator[]> {
    const carried: Investigator[] = [];
    for (const o of others) {
      if (!(yield* this.yesNo(inv, `${o.name} lies here, lost`, `Carry ${o.name} along (Strength roll)`, 'Leave them'))) continue;
      if (this.test(inv, 'str', 0, `carrying ${o.name}`)) carried.push(o);
      else this.log(`${inv.name} cannot carry ${o.name} this time.`);
    }
    return carried;
  }

  /** A stranded investigator is rescued: in Arkham at `node`, or where they stand. */
  revive(o: Investigator, node: string | null) {
    o.stranded = false;
    o.waiting = false;
    o.activeFrom = this.s.turn + 1;
    if (node) {
      o.place = { t: 'arkham', node };
      if (o.str === 0) o.place = { t: 'arkham', node: HOSPITAL };
      else if (o.san === 0) o.place = { t: 'arkham', node: SANITARIUM };
    }
    this.log(`${o.name} is rescued and rejoins the investigation next turn!`, 'info');
  }

  // ------------------------------------------------------------------ placement

  moveTo(inv: Investigator, node: string) {
    if (inv.foundGate) {
      const g = this.s.gates[inv.foundGate];
      if (!g.location || locNode(g.location) !== node) inv.foundGate = null;
    }
    inv.place = { t: 'arkham', node };
  }

  toCup(m: MonsterInst) {
    m.node = null;
    m.prev = null;
    m.exit = null;
    m.vampireBonus = 0;
    if (!this.s.cup.includes(m.uid)) this.s.cup.push(m.uid);
  }

  drawMonster(): MonsterInst | null {
    if (this.s.cup.length === 0) {
      this.log('No monsters remain in the cup.');
      return null;
    }
    const i = this.rng.int(this.s.cup.length);
    const [uid] = this.s.cup.splice(i, 1);
    return this.s.monsters[uid];
  }

  /** A monster appears at a location. Returns it, or null (none left, Elder Sign, Hound outside a building). */
  placeMonster(node: string, respectElderSign = true): MonsterInst | null {
    const loc = nodeLoc(node);
    if (respectElderSign && loc && this.s.elderSigns.includes(loc)) return null;
    const m = this.drawMonster();
    if (!m) return null;
    const d = this.def(m);
    if (d.special?.includes('tindalos') && loc && !LOCATIONS[loc].building) {
      this.log(`A Hound of Tindalos finds no angles at ${this.locName(loc)} and vanishes.`, 'mythos');
      this.toCup(m);
      return null;
    }
    m.node = node;
    m.prev = null;
    m.exit = null;
    this.log(`${d.species} appears at ${this.nodeName(node)}.`, 'mythos');
    return m;
  }

  /** A monster appears; a player points its arrow (or it is randomised, by option). */
  *appear(node: string, chooser: Investigator | null, respectElderSign = true): Flow<MonsterInst | null> {
    const m = this.placeMonster(node, respectElderSign);
    if (m) yield* this.orient(m, chooser);
    return m;
  }

  /** Choose the street a handed monster heads along from where it stands. */
  *orient(m: MonsterInst, chooser: Investigator | null, force = false): Flow {
    const d = this.def(m);
    if (!m.node || d.speed === 0 || d.cls === 'flyer') return;
    const cur = m.node;
    const exits: { node: string; via: string }[] = [];
    for (const e of isLocNode(cur) ? NEIGHBORS[cur] : [cur]) {
      for (const n of STREET_NEIGHBORS[e]) if (!exits.some((x) => x.node === n)) exits.push({ node: n, via: e });
    }
    if (!exits.length) return;
    if (!force && !this.s.setup.options.orientMonsters) {
      m.exit = this.rng.pick(exits).node;
      return;
    }
    const k = yield* this.ask({
      kind: 'orient', inv: chooser?.id ?? null,
      title: `Point the ${d.species}'s arrow`,
      text: `${d.hand === 'L' ? 'Left' : 'Right'}-handed, moves ${d.speed}. Choose the street it heads along${isLocNode(cur) ? ` from ${this.nodeName(cur)}` : ''}.`,
      nodes: exits.map((x) => x.node),
      options: exits.map((x) => ({ key: x.node, label: `${compass(x.via, x.node)} ${this.nodeName(x.node)}${isLocNode(cur) && NEIGHBORS[cur].length > 1 ? ` (via ${this.nodeName(x.via)})` : ''}`, ref: x.node })),
      data: { monster: m.def },
    });
    m.exit = exits.some((x) => x.node === k) ? k : exits[0].node;
  }

  /** Draw a gate card onto a location. Returns null if no gate cards remain (errata: ignore). */
  drawGate(loc: LocationId): GateInst | null {
    const uid = this.s.gateDeck.shift();
    if (!uid) {
      this.log('All gates are on the board or in trophy stacks — no new gate appears.', 'mythos');
      return null;
    }
    const g = this.s.gates[uid];
    g.location = loc;
    g.faceUp = false;
    this.s.doom++;
    this.log(`Doom advances to ${this.s.doom}.`, 'mythos');
    if (this.s.doom > 13) this.endGame(false, 'The Doom Factor passed 13. The Doom of Arkham has come.');
    return g;
  }

  // ------------------------------------------------------------------ investigator phase

  endInvestigatorTurn(inv: Investigator) {
    if (inv.turn.holyWater) {
      const hw = inv.items.find((c) => c.id === 'holy_water');
      if (hw) this.removeItem(inv, hw.uid);
    }
    inv.turn = {};
    inv.tempSneak = 0;
  }

  *investigatorTurn(inv: Investigator): Flow {
    inv.usedSpells = [];
    if (inv.retainer) this.gain(inv, 'money', 2);
    if (this.hasItem(inv, 'brass_collar') && inv.str < MAX && inv.str > 0) this.gain(inv, 'str', 1);

    if (inv.place.t === 'world') {
      const done = yield* this.otherWorldTurn(inv);
      if (done) return;
    }

    if (inv.lostTurns > 0) {
      inv.lostTurns--;
      this.log(`${inv.name} loses this turn.`);
      return;
    }
    if (inv.jailTurns > 0) {
      inv.jailTurns--;
      this.log(`${inv.name} spends the turn in jail.`);
      return;
    }

    yield* this.actStep(inv);
    yield* this.encounterStep(inv);
  }

  /** Returns true when the turn is over (still in the Other World). */
  *otherWorldTurn(inv: Investigator): Flow<boolean> {
    const p = inv.place;
    if (p.t !== 'world') return false;
    if (inv.lostTurns > 0) {
      inv.lostTurns--;
      this.log(`${inv.name} remains in the same box of ${WORLDS[p.world].name}.`);
      yield* this.worldEncounter(inv);
      return true;
    }
    const lostHere = this.worldMates(inv).filter((o) => o.stranded);
    if (p.box === 2) {
      const carried = yield* this.carryAlong(inv, lostHere);
      p.box = 1;
      for (const o of carried) if (o.place.t === 'world') o.place.box = 1;
      this.log(`${inv.name} moves deeper into ${WORLDS[p.world].name}.`);
      yield* this.worldEncounter(inv);
      return true;
    }
    const carried = yield* this.carryAlong(inv, lostHere);
    yield* this.returnToArkham(inv);
    for (const o of carried) this.revive(o, this.node(inv));
    return false;
  }

  *returnToArkham(inv: Investigator): Flow {
    const p = inv.place;
    if (p.t !== 'world') return;
    if (p.returnTo) {
      this.log(`${inv.name} returns to ${this.locName(p.returnTo)}.`);
      inv.place = { t: 'arkham', node: locNode(p.returnTo) };
      return;
    }
    if (p.keyReturn) {
      this.log(`${inv.name} follows the Silver Key back to ${this.nodeName(p.keyReturn)}.`);
      inv.place = { t: 'arkham', node: p.keyReturn };
      return;
    }
    const gates = this.openGates().filter((g) => g.world === p.world);
    let gate = gates.find((g) => g.uid === p.gate) ?? gates[0];
    if (gates.length > 1) {
      const k = yield* this.choose(inv, `Return to Arkham — which gate to ${WORLDS[p.world].name}?`,
        gates.map((g) => ({ key: g.uid, label: this.locName(g.location!) })));
      gate = gates.find((g) => g.uid === k) ?? gate;
    }
    if (!gate) {
      yield* this.loseInvestigator(inv, 'is stranded — the way home is closed');
      throw new Interrupt(inv.id);
    }
    inv.place = { t: 'arkham', node: locNode(gate.location!) };
    inv.foundGate = gate.uid;
    this.log(`${inv.name} returns to Arkham through the gate at ${this.locName(gate.location!)}. Both sides of the gate are now known.`);
  }

  // ---- Step 1: Acts

  movementRoll(inv: Investigator): number {
    const mode = inv.nextMove;
    inv.nextMove = null;
    const dice = this.roll(`${inv.name}: movement`, mode === 'd6' ? 1 : 2);
    let n = dice.reduce((a, b) => a + b, 0);
    if (typeof mode === 'number') n += mode;
    if (this.hasItem(inv, 'ruby_of_rlyeh')) n += 3;
    return n;
  }

  monsterBlocks(node: string): boolean {
    const loc = nodeLoc(node);
    return this.monstersAt(node).some((m) => {
      const d = this.def(m);
      // The Hound of Tindalos is passed through freely except inside buildings.
      if (d.special?.includes('tindalos')) return !!loc && LOCATIONS[loc].building;
      return true;
    });
  }

  vehicleDestinations(from: string): string[] {
    const blockers = this.boardMonsters().filter((m) => this.def(m).cls === 'blocker' && m.node && !isLocNode(m.node)).map((m) => m.node!);
    const blocked = vehicleBlocked(blockers);
    const dist = distances(from, (n) => !blocked.has(n));
    return Object.keys(dist).filter((n) => n !== from);
  }

  *actStep(inv: Investigator): Flow {
    const start = this.node(inv);
    if (!start) return;
    if (inv.str === 0 || inv.san === 0) {
      this.log(`${inv.name} is too weak to move and stays put.`);
      return;
    }
    for (;;) {
      const options: PromptOption[] = [
        { key: 'move', label: 'Move (roll 2D6)' },
        { key: 'wait', label: 'Wait' },
      ];
      if (TAXI_SPACES.includes(this.node(inv)!)) options.push({ key: 'taxi', label: 'Take a taxi ($1)', disabled: inv.money < 1 ? 'No money' : undefined });
      if (this.hasItem(inv, 'taxi_whistle')) options.push({ key: 'whistle', label: 'Blow the Taxi Whistle ($1)', disabled: inv.money < 1 ? 'No money' : undefined });
      if (inv.automobile && !inv.turn.usedCar) options.push({ key: 'car', label: 'Drive your automobile' });
      options.push(...this.utilityOptions(inv));
      const k = yield* this.ask({ kind: 'choice', inv: inv.id, title: `${inv.name}: Investigator acts`, text: `At ${this.nodeName(this.node(inv)!)}.`, options });
      if (k === 'wait') return this.log(`${inv.name} waits.`);
      if (k === 'move') return yield* this.walk(inv, this.movementRoll(inv));
      if (k === 'taxi' || k === 'whistle') {
        if (k === 'whistle') {
          const w = inv.items.find((c) => c.id === 'taxi_whistle')!;
          this.removeItem(inv, w.uid);
        }
        inv.money -= 1;
        return yield* this.ride(inv, 'any', false, 'Taxi');
      }
      if (k === 'car') {
        inv.turn.usedCar = true;
        return yield* this.ride(inv, 'any', false, 'Automobile');
      }
      yield* this.useUtility(inv, k);
      if (!this.node(inv)) return;
    }
  }

  *walk(inv: Investigator, steps: number): Flow {
    this.log(`${inv.name} may move ${steps} spaces.`, 'roll');
    let left = steps;
    let passMists = false;
    for (;;) {
      const cur = this.node(inv)!;
      const options: PromptOption[] = [];
      if (left > 0) {
        for (const n of NEIGHBORS[cur]) options.push({ key: n, label: `${compass(cur, n)} ${this.nodeName(n)}${this.monstersAt(n).length ? ' (monster!)' : ''}`, ref: n });
      }
      options.push({ key: 'stop', label: left > 0 ? 'Stop here' : 'End movement' });
      if (TAXI_SPACES.includes(cur) && inv.money >= 1) options.push({ key: 'taxi', label: 'Take a taxi ($1)' });
      const mists = this.spellReady(inv, 'mists_of_rlyeh');
      if (mists && !passMists && left > 0) options.push({ key: 'mists', label: "Cast Mists of R'lyeh (move past monsters)" });
      if (this.hasItem(inv, 'silver_key')) options.push({ key: 'u:key', label: 'Use the Silver Key: pass into the Dreamlands' });
      const k = yield* this.ask({
        kind: 'move', inv: inv.id, title: `${inv.name}: move (${left} left)`, options,
        nodes: left > 0 ? NEIGHBORS[cur] : [], data: { left, from: cur },
      });
      if (k === 'stop') return;
      if (k === 'taxi') {
        inv.money -= 1;
        return yield* this.ride(inv, 'any', false, 'Taxi');
      }
      if (k === 'u:key') return yield* this.useUtility(inv, k);
      if (k === 'mists') {
        passMists = yield* this.castSpell(inv, mists!.uid);
        if (passMists) inv.turn.autoSneak = true;
        continue;
      }
      if (!NEIGHBORS[cur].includes(k) || left <= 0) continue;
      this.moveTo(inv, k);
      left--;
      if (isLocNode(k)) {
        this.log(`${inv.name} enters ${this.nodeName(k)}.`);
        return;
      }
      if (this.monsterBlocks(k) && !passMists) {
        this.log(`${inv.name} runs into a monster and must stop.`, 'warn');
        return;
      }
    }
  }

  /** Vehicle travel (taxi, free ride, automobile). Blockers halt vehicles one space distant. */
  *ride(inv: Investigator, to: LocationId | 'any', rollThere: boolean, how: string, locationsOnly = false): Flow {
    const from = this.node(inv) ?? START_NODE;
    let dest: string;
    if (to === 'any') {
      let nodes = this.vehicleDestinations(from);
      if (locationsOnly) nodes = nodes.filter(isLocNode);
      if (nodes.length === 0) return this.log('No destination can be reached.');
      dest = yield* this.ask({
        kind: 'destination', inv: inv.id, title: `${how}: choose a destination`, nodes,
        options: nodes.map((n) => ({ key: n, label: this.nodeName(n), ref: n })),
      });
      if (!nodes.includes(dest)) dest = nodes[0];
    } else {
      dest = locNode(to);
    }
    this.moveTo(inv, dest);
    this.log(`${inv.name} travels to ${this.nodeName(dest)}.`);
    if (rollThere && isLocNode(dest)) yield* this.locationEncounter(inv, true);
  }

  // ---- Step 2: Encounters

  *encounterStep(inv: Investigator): Flow {
    const node = this.node(inv);
    if (!node) return;
    if (inv.jailTurns > 0) return;
    if (!isLocNode(node)) {
      if (this.monstersAt(node).length) yield* this.meetMonsters(inv);
      return;
    }
    yield* this.locationEncounter(inv, false);
  }

  /** Encounter at the investigator's current location. */
  *locationEncounter(inv: Investigator, arrivedByRide: boolean): Flow {
    const node = this.node(inv)!;
    const loc = nodeLoc(node)!;
    const ldef = LOCATIONS[loc];

    if (this.monstersAt(node).length) return yield* this.meetMonsters(inv);

    // Hospital / Sanitarium treatment.
    if (loc === 'hospital' || loc === 'sanitarium') return yield* this.treatment(inv, loc);

    const gate = this.gateAt(loc);
    let first = true;
    for (;;) {
      const options: PromptOption[] = [];
      if (gate) {
        options.push({ key: 'gate', label: `Enter the gate to ${gate.faceUp ? WORLDS[gate.world].name : 'an Other World'}` });
        if (inv.foundGate === gate.uid) {
          options.push({ key: 'attackGate', label: `Attack the gate (SP ${gate.sp})` });
          if (this.hasItem(inv, 'elder_sign')) options.push({ key: 'elderSign', label: 'Seal it with the Elder Sign (−2 Sanity)', disabled: inv.san <= 2 ? 'Not enough Sanity' : undefined });
        }
        for (const id of ['dragons_eye', 'blue_watcher']) {
          if (this.hasItem(inv, id)) options.push({ key: `shatter:${id}`, label: `Close the gate with ${ITEM_BY_ID[id].name} (lose D6 Strength)` });
        }
      }
      if (ldef.services) {
        for (const sv of ldef.services) {
          if (sv.id === 'charity') options.push({ key: 'charity', label: 'Ask the Order of Dagon for charity', disabled: this.charityOptions(inv).length ? undefined : inv.charity === 'owed' ? 'Repay with good works first' : 'You do not qualify' });
          if (sv.id === 'monograph') options.push({ key: 'monograph', label: 'Sell a monograph', disabled: inv.retainer ? 'Not while on retainer' : undefined });
        }
      }
      if (ldef.table) options.push({ key: 'table', label: `Roll on the ${ldef.name} table` });
      options.push({ key: 'wait', label: 'No encounter' });
      options.push(...this.utilityOptions(inv));

      const auto = first && arrivedByRide && !gate && !ldef.services;
      first = false;
      const k = auto ? 'table'
        : yield* this.choose(inv, `${inv.name} at ${ldef.name}`, options, gate ? `A gate${gate.faceUp ? ` to ${WORLDS[gate.world].name}` : ''} stands open here.` : undefined);
      if (k === 'wait' || k === '') return;
      if (k === 'table') return yield* this.rollLocationTable(inv, loc);
      if (k === 'gate') return yield* this.enterGate(inv, gate!);
      if (k === 'attackGate') return yield* this.attackGate(inv, gate!);
      if (k === 'elderSign') return yield* this.elderSign(inv, gate!);
      if (k.startsWith('shatter:')) return yield* this.shatter(inv, k.slice(8), { gate: gate! });
      if (k === 'charity') return yield* this.charity(inv);
      if (k === 'monograph') {
        const [d] = this.roll(`${inv.name}: monograph`);
        const n = d <= 3 ? 2 : d <= 5 ? 5 : 10;
        this.log(`The monograph sells for $${n}.`);
        return this.gain(inv, 'money', n);
      }
      yield* this.useUtility(inv, k);
      if (this.node(inv) !== node) return;
    }
  }

  *rollLocationTable(inv: Investigator, loc: LocationId): Flow {
    const table = LOCATIONS[loc].table!;
    const [d] = this.roll(`${LOCATIONS[loc].name} table`);
    const entry = table.find((e) => e.roll.includes(d))!;
    this.log(`${LOCATIONS[loc].name} (${d}): ${entry.text}`, 'roll');
    yield* this.resolveEntry(inv, entry, { loc });
    // Items may be sold after surviving a location event at Hib's and the Curiositie Shoppe.
    if (LOCATIONS[loc].buysItems && this.node(inv) === locNode(loc)) yield* this.sellItems(inv);
  }

  *resolveEntry(inv: Investigator, entry: TableEntry, src: { loc?: LocationId; world?: WorldId }): Flow {
    const first = entry.fx[0];
    const interactive = first && (first.k === 'choose' || first.k === 'pay' || first.k === 'localCharacter' || (first.k === 'draw' && first.price !== undefined));
    if (!interactive) yield* this.ack(inv, src.loc ? LOCATIONS[src.loc].name : WORLDS[src.world!].name, entry.text);
    yield* this.runFx(inv, entry.fx, src, entry.text);
  }

  // ---- Effect interpreter

  cond(inv: Investigator, c: Condition): boolean {
    switch (c.c) {
      case 'hasGun': return inv.items.some((i) => ITEM_BY_ID[i.id].gun);
      case 'hasItems': return inv.items.length > 0;
      case 'hasSpells': return inv.spells.length > 0;
      case 'hasSkills': return inv.skillCards.length > 0;
      case 'hasMoney': return inv.money >= c.n;
      case 'onRetainer': return inv.retainer;
      case 'retainerAvailable': return this.s.retainersLeft > 0 && !inv.retainer;
      case 'localCharAvailable': return this.s.localCharsLeft.includes(c.id);
    }
  }

  *runFx(inv: Investigator, list: Effect[], src: { loc?: LocationId; world?: WorldId }, text?: string): Flow {
    for (const e of list) {
      if (inv.out) return;
      yield* this.runEffect(inv, e, src, text);
    }
  }

  *runEffect(inv: Investigator, e: Effect, src: { loc?: LocationId; world?: WorldId }, text?: string): Flow {
    switch (e.k) {
      case 'none':
        return;
      case 'gain': {
        const n = this.amount(e.n, `${inv.name}: gain`);
        return this.gain(inv, e.pool, n);
      }
      case 'lose': {
        const n = this.amount(e.n, `${inv.name}: lose`);
        return yield* this.lose(inv, e.pool, n);
      }
      case 'loseAllMoney':
        return yield* this.lose(inv, 'money', inv.money);
      case 'test':
        return yield* this.runFx(inv, this.test(inv, e.test, e.mod ?? 0) ? e.pass ?? [] : e.fail ?? [], src);
      case 'draw': {
        const n = e.n ?? 1;
        if (e.price === undefined) {
          if (e.deck === 'item') return yield* this.drawItems(inv, n);
          if (e.deck === 'spell') return this.drawSpells(inv, n);
          return this.drawSkill(inv);
        }
        if (e.price === 'list') {
          const id = this.drawCard('item');
          if (!id) return;
          if (id === 'auction') return yield* this.gainItem(inv, id);
          const it = ITEM_BY_ID[id];
          const bought = yield* this.purchase(inv, it.price, `${it.name} ($${it.price})`, text, id);
          if (bought) return yield* this.gainItem(inv, id);
          this.s.itemDeck.push(id);
          return yield* this.runFx(inv, e.else ?? [], src);
        }
        const bought = yield* this.purchase(inv, e.price, e.deck === 'item' ? 'an item' : 'a spell', text);
        if (!bought) return yield* this.runFx(inv, e.else ?? [], src);
        if (e.deck === 'item') return yield* this.drawItems(inv, n);
        return this.drawSpells(inv, n);
      }
      case 'discard': {
        for (let i = 0; i < (e.n ?? 1); i++) {
          const c = yield* this.chooseCard(inv, e.deck, `Choose ${e.deck === 'item' ? 'an item' : 'a spell'} to discard`);
          if (!c) return;
          if (e.deck === 'item') this.removeItem(inv, c.uid);
          else this.removeSpell(inv, c.uid);
          this.log(`${inv.name} discards ${e.deck === 'item' ? ITEM_BY_ID[c.id].name : SPELL_BY_ID[c.id].name}.`);
        }
        return;
      }
      case 'monster': {
        if (inv.place.t === 'world') return yield* this.worldMonster(inv);
        const m = yield* this.appear(this.node(inv)!, inv);
        if (m) yield* this.meetMonsters(inv);
        return;
      }
      case 'gateAndMonster':
        return yield* this.locationGate(inv);
      case 'choose': {
        const opts = e.options.map((o, i) => ({ key: String(i), label: o.label, disabled: o.if && !this.cond(inv, o.if) ? 'Not possible' : undefined }));
        const k = yield* this.choose(inv, src.loc ? LOCATIONS[src.loc].name : WORLDS[src.world!].name, opts, text);
        const opt = e.options[Number(k)];
        if (opt) yield* this.runFx(inv, opt.fx, src);
        return;
      }
      case 'pay': {
        const paid = yield* this.purchase(inv, e.n, `$${e.n}`, text, undefined, e.bargain);
        return yield* this.runFx(inv, paid ? e.then : e.else ?? [], src);
      }
      case 'if':
        return yield* this.runFx(inv, this.cond(inv, e.cond) ? e.then : e.else ?? [], src);
      case 'sidewalk':
        return yield* this.toSidewalk(inv);
      case 'jail':
        this.moveTo(inv, POLICE);
        inv.jailTurns = e.turns ?? 1;
        this.log(`${inv.name} is taken to jail.`, 'warn');
        throw new Interrupt(inv.id);
      case 'stay':
        inv.lostTurns += e.turns;
        return this.log(`${inv.name} will lose ${e.turns} turn${e.turns > 1 ? 's' : ''}.`);
      case 'hospital':
        this.moveTo(inv, HOSPITAL);
        this.log(`${inv.name} is taken to the Hospital.`);
        throw new Interrupt(inv.id);
      case 'ride':
        return yield* this.ride(inv, e.to, !!e.roll, 'Free ride');
      case 'reroll':
        if (src.loc) return yield* this.rollLocationTable(inv, src.loc);
        return yield* this.worldEncounter(inv);
      case 'lost':
        yield* this.loseInvestigator(inv, 'never returns');
        throw new Interrupt(inv.id);
      case 'visitWorld':
        return yield* this.visitWorld(inv, e.world, !!e.stayTurn);
      case 'randomArkham': {
        const [a, b] = this.roll('Gate Appearance Table', 2);
        const loc = GATE_APPEARANCE[a + b];
        inv.place = { t: 'arkham', node: locNode(loc) };
        this.log(`${inv.name} reappears in Arkham at ${this.locName(loc)}.`);
        throw new Interrupt(inv.id);
      }
      case 'retainer':
        if (this.s.retainersLeft <= 0 || inv.retainer) return this.log('No retainer is available.');
        this.s.retainersLeft--;
        inv.retainer = true;
        return this.log(`${inv.name} is now on a $2 retainer.`);
      case 'localCharacter': {
        const lc = LOCAL_CHARACTERS.find((c) => c.id === e.id)!;
        if (!this.s.localCharsLeft.includes(e.id)) return this.log(`${lc.name} is not available.`);
        const hired = yield* this.purchase(inv, e.cost, `hire ${lc.name}`, text, undefined, true);
        if (!hired) return;
        this.s.localCharsLeft = this.s.localCharsLeft.filter((x) => x !== e.id);
        inv.localChars.push(e.id);
        return this.log(`${lc.name} joins ${inv.name}.`);
      }
      case 'tempSkill':
        inv.tempSneak += e.n;
        return this.log(`${inv.name} gains +${e.n} Sneak for the next encounter.`);
      case 'doubleOrNothing': {
        const win = e.by === 'coin' ? this.rng.coin() : this.roll(`${inv.name}: double or nothing`)[0] % 2 === 0;
        if (win) {
          this.log(`${inv.name} wins the bet!`);
          return this.gain(inv, 'money', inv.money);
        }
        this.log(`${inv.name} loses the bet.`, 'warn');
        inv.money = 0;
        return yield* this.runFx(inv, e.loseFx ?? [], src);
      }
      case 'sellItemFor': {
        const c = yield* this.chooseCard(inv, 'item', `Sell an item for $${e.n}`);
        if (!c) return;
        this.removeItem(inv, c.uid);
        return this.gain(inv, 'money', e.n);
      }
      case 'nextMove':
        inv.nextMove = e.mode;
        return this.log(e.mode === 'd6' ? `${inv.name} will roll only one die next move.` : `${inv.name} adds ${e.mode} to the next movement roll.`);
      case 'special':
        return yield* this.special(inv, e.id, src, text);
    }
  }

  drawSkill(inv: Investigator) {
    const sk = this.s.skillDeck.shift();
    if (!sk) return this.log('No skill cards remain.');
    inv.skillCards.push(sk);
    this.log(`${inv.name} gains ${SKILL_CARDS.find((c) => c.id === sk)!.name}.`);
  }

  *special(inv: Investigator, id: string, src: { loc?: LocationId; world?: WorldId }, text?: string): Flow {
    if (id === 'dreamlandsSkill') {
      if (this.s.skillDeck.length) this.drawSkill(inv);
      return;
    }
    if (id === 'automobile') {
      if (inv.automobile) return;
      const bought = yield* this.purchase(inv, 30, "Art Peabody's automobile", text, undefined, false);
      if (bought) {
        inv.automobile = true;
        this.log(`${inv.name} buys an automobile.`);
      }
      return;
    }
    if (id === 'findHandgun') {
      const deck = this.s.itemDeck;
      const i = deck.findIndex((x) => ITEM_BY_ID[x].gun && ITEM_BY_ID[x].hands === 1);
      if (i < 0) return yield* this.toSidewalk(inv);
      const [gun] = deck.splice(i, 1);
      this.rng.shuffle(deck);
      return yield* this.gainItem(inv, gun);
    }
    if (id === 'sheldonBeating') {
      for (const c of inv.items.filter((x) => ITEM_BY_ID[x.id].gun)) this.removeItem(inv, c.uid);
      inv.money = 0;
      const [d] = this.roll('Where do you wake?');
      const loc: LocationId = d <= 2 ? 'devils_beach' : d <= 4 ? 'lighthouse' : 'lake_miskatonic';
      inv.place = { t: 'arkham', node: locNode(loc) };
      this.log(`${inv.name} is robbed and beaten, waking at ${this.locName(loc)}.`, 'warn');
      throw new Interrupt(inv.id);
    }
    void src;
  }

  /** Pay for goods or services. Fast Talk buys for $1 less. Returns true when paid. */
  *purchase(inv: Investigator, price: number, what: string, text?: string, cardRef?: string, bargain = true): Flow<boolean> {
    if (price <= 0) return true;
    const opts: PromptOption[] = [
      { key: 'pay', label: `Pay $${price}`, disabled: inv.money < price ? 'Not enough money' : undefined },
    ];
    if (bargain && price > 1) opts.push({ key: 'talk', label: `Fast Talk for $${price - 1}`, disabled: inv.money < price - 1 ? 'Not enough money' : undefined });
    opts.push({ key: 'no', label: 'Decline' });
    if (opts.every((o) => o.key === 'no' || o.disabled)) {
      this.log(`${inv.name} cannot afford ${what}.`);
      return false;
    }
    const k = yield* this.ask({ kind: 'choice', inv: inv.id, title: `Buy ${what}?`, text, options: opts, data: cardRef ? { card: cardRef } : undefined });
    if (k === 'pay') {
      inv.money -= price;
      this.log(`${inv.name} pays $${price}.`);
      return true;
    }
    if (k === 'talk') {
      if (this.test(inv, 'fastTalk', 0, 'bargain')) {
        inv.money -= price - 1;
        this.log(`${inv.name} talks the price down and pays $${price - 1}.`);
        return true;
      }
      const full = price + (this.s.setup.options.fastTalkPenalty ? 1 : 0);
      if (inv.money < full) return false;
      return yield* this.payFull(inv, full);
    }
    return false;
  }

  private *payFull(inv: Investigator, full: number): Flow<boolean> {
    const ok = yield* this.yesNo(inv, `The bargaining failed. Pay $${full}?`, `Pay $${full}`, 'Decline');
    if (ok) {
      inv.money -= full;
      this.log(`${inv.name} pays $${full}.`);
    }
    return ok;
  }

  *toSidewalk(inv: Investigator): Flow {
    const loc = nodeLoc(this.node(inv) ?? '');
    if (!loc) return;
    const entrances = NEIGHBORS[locNode(loc)];
    let dest = entrances[0];
    if (entrances.length > 1) {
      dest = yield* this.ask({
        kind: 'destination', inv: inv.id, title: 'Go to the sidewalk outside', nodes: entrances,
        options: entrances.map((n) => ({ key: n, label: this.nodeName(n), ref: n })),
      });
      if (!entrances.includes(dest)) dest = entrances[0];
    }
    this.moveTo(inv, dest);
    this.log(`${inv.name} goes to the sidewalk outside.`);
    throw new Interrupt(inv.id);
  }

  *sellItems(inv: Investigator): Flow {
    for (;;) {
      const sellable = inv.items.filter((c) => ITEM_BY_ID[c.id].price > 1);
      if (!sellable.length) return;
      const k = yield* this.choose(inv, 'Sell items at half list price?', [
        ...sellable.map((c) => ({ key: c.uid, label: `Sell ${ITEM_BY_ID[c.id].name} for $${Math.ceil(ITEM_BY_ID[c.id].price / 2)}`, ref: c.id })),
        { key: 'done', label: 'Done' },
      ]);
      if (k === 'done' || !k) return;
      const c = sellable.find((x) => x.uid === k);
      if (!c) return;
      this.removeItem(inv, c.uid);
      this.gain(inv, 'money', Math.ceil(ITEM_BY_ID[c.id].price / 2));
    }
  }

  *treatment(inv: Investigator, loc: 'hospital' | 'sanitarium'): Flow {
    const pool = loc === 'hospital' ? 'str' : 'san';
    const forced = inv[pool] === 0;
    if (!forced) {
      const ok = yield* this.yesNo(inv, `${LOCATIONS[loc].name}`, `Stay and be treated ($3, +D6 ${pool === 'str' ? 'Strength' : 'Sanity'})`, 'No treatment', LOCATIONS[loc].services![0].text);
      if (!ok) return;
    }
    const paid = Math.min(3, inv.money);
    inv.money -= paid;
    const [d] = this.roll(`${inv.name}: treatment`);
    this.log(`${inv.name} pays $${paid} for treatment.`);
    this.gain(inv, pool, d);
  }

  charityOptions(inv: Investigator): { key: string; label: string }[] {
    if (inv.charity !== 'ready') return [];
    const others = this.activeInvestigators();
    const attackSpells = (i: Investigator) => i.spells.filter((c) => SPELL_BY_ID[c.id].attack).length;
    const out: { key: string; label: string }[] = [];
    if (inv.money === 0 || others.every((o) => o.money >= inv.money)) out.push({ key: 'money', label: '$10 in cash' });
    if (inv.items.length === 0 || others.every((o) => o.items.length >= inv.items.length)) out.push({ key: 'items', label: '2 item cards' });
    if (inv.spells.length === 0 || others.every((o) => attackSpells(o) >= attackSpells(inv))) out.push({ key: 'spell', label: '1 spell card' });
    return out;
  }

  *charity(inv: Investigator): Flow {
    const opts = this.charityOptions(inv);
    if (!opts.length) return;
    const k = yield* this.choose(inv, 'The Benevolent Order of Dagon', opts, LOCATIONS.dagon_mission.services![0].text);
    if (k === 'money') this.gain(inv, 'money', 10);
    if (k === 'items') yield* this.drawItems(inv, 2);
    if (k === 'spell') this.drawSpells(inv, 1);
    inv.charity = 'owed';
    this.log(`${inv.name} must now repay the Order with good works.`);
  }

  // ---- Auctions

  *auction(auctioneer: Investigator): Flow {
    const lots: string[] = [];
    const returned: string[] = [];
    while (lots.length < 2) {
      const id = this.drawCard('item');
      if (!id) break;
      if (id === 'auction') returned.push(id);
      else lots.push(id);
    }
    this.s.itemDeck.push(...returned);
    if (returned.length) this.rng.shuffle(this.s.itemDeck);
    for (const id of lots) {
      const it = ITEM_BY_ID[id];
      this.log(`${auctioneer.name} auctions ${it.name} (list $${it.price}).`);
      const bidders = this.activeInvestigators();
      const start = bidders.indexOf(auctioneer);
      const ring = [...bidders.slice(start + 1), ...bidders.slice(0, start + 1)];
      const passed = new Set<string>();
      let high = null as { inv: Investigator; bid: number } | null;
      while (ring.filter((b) => !passed.has(b.id)).length > (high ? 1 : 0)) {
        let progress = false;
        for (const b of ring) {
          if (passed.has(b.id) || high?.inv === b) continue;
          const min: number = (high?.bid ?? 0) + 1;
          // Items may be bid at their cash (list) value.
          const worth = b.money + b.items.reduce((n, c) => n + ITEM_BY_ID[c.id].price, 0);
          if (worth < min) {
            passed.add(b.id);
            continue;
          }
          const bids = [min, min + 1, min + 2, min + 5, b.money, worth].filter((v, i, a) => v >= min && v <= worth && a.indexOf(v) === i).sort((x, y) => x - y);
          const k: string = yield* this.ask({
            kind: 'bid', inv: b.id, title: `Auction: ${it.name}`, text: high ? `High bid: $${high.bid} by ${high.inv.name}` : 'No bids yet.',
            options: [...bids.map((v) => ({ key: String(v), label: `Bid $${v}${v > b.money ? ' (paying partly with items)' : ''}` })), { key: 'pass', label: 'Pass' }], data: { card: id },
          });
          if (k === 'pass') passed.add(b.id);
          else {
            high = { inv: b, bid: Math.max(min, Math.min(worth, Number(k))) };
            progress = true;
          }
          if (ring.filter((x) => !passed.has(x.id) && x !== high?.inv).length === 0) break;
        }
        if (!progress) break;
      }
      if (high) {
        yield* this.payWithItems(high.inv, high.bid, it.name);
        if (high.inv !== auctioneer) {
          const share = Math.floor(high.bid / 2);
          auctioneer.money += share;
          this.log(`${high.inv.name} buys ${it.name} for $${high.bid}; ${auctioneer.name} receives $${share}.`);
        } else this.log(`${auctioneer.name} buys ${it.name} for $${high.bid}.`);
        yield* this.receiveItem(high.inv, id);
      } else if (auctioneer.money >= it.price && (yield* this.yesNo(auctioneer, `${it.name} went unsold`, `Buy it at list price ($${it.price})`, 'Discard it'))) {
        auctioneer.money -= it.price;
        this.log(`${auctioneer.name} buys ${it.name} at list price.`);
        yield* this.receiveItem(auctioneer, id);
      } else {
        this.discardCard('item', id);
        this.log(`${it.name} goes unsold.`);
      }
    }
  }

  /** Pay an auction price in cash, or partly with items at their list price (change from the bank). */
  *payWithItems(inv: Investigator, amount: number, what: string): Flow {
    let owed = amount;
    let withItems = inv.money < amount;
    if (!withItems && inv.items.length) {
      withItems = (yield* this.choose(inv, `Pay $${amount} for ${what}`, [
        { key: 'cash', label: `Pay $${amount} in cash` },
        { key: 'items', label: 'Hand over items at their list price' },
      ])) === 'items';
    }
    while (withItems && owed > 0 && inv.items.length) {
      const opts: PromptOption[] = inv.items.map((c) => ({ key: c.uid, label: `${ITEM_BY_ID[c.id].name} ($${ITEM_BY_ID[c.id].price})`, ref: c.id }));
      if (inv.money >= owed) opts.push({ key: 'cash', label: `Pay the remaining $${owed} in cash` });
      const k = yield* this.choose(inv, `Pay for ${what}: $${owed} still owed`, opts);
      if (k === 'cash' || !k) break;
      const c = inv.items.find((x) => x.uid === k);
      if (!c) break;
      owed -= ITEM_BY_ID[c.id].price;
      this.removeItem(inv, c.uid);
      this.log(`${inv.name} hands over ${ITEM_BY_ID[c.id].name}.`);
    }
    if (owed > 0) inv.money = Math.max(0, inv.money - owed);
    else if (owed < 0) {
      inv.money -= owed;
      this.log(`${inv.name} receives $${-owed} in change.`);
    }
  }

  // ------------------------------------------------------------------ utilities (spells/items usable any time)

  utilityOptions(inv: Investigator): PromptOption[] {
    const out: PromptOption[] = [];
    const node = this.node(inv);
    const here = node ? this.invsAt(node) : [inv];
    const ready = (id: string) => this.spellReady(inv, id);
    if (ready('heal')) out.push({ key: 'u:heal', label: 'Cast Heal (+2 Strength)' });
    if (ready('cloud_memory')) out.push({ key: 'u:cloud_memory', label: 'Cast Cloud Memory (+2 Sanity)' });
    if (this.hasItem(inv, 'healing_stone') && !inv.turn.usedHealingStone) out.push({ key: 'u:healing_stone', label: 'Use the Healing Stone' });
    if (this.hasItem(inv, 'brazen_head')) out.push({ key: 'u:brazen_head', label: 'Consult the Brazen Head' });
    const mons = node ? this.monstersAt(node) : [];
    if (mons.length) {
      if (ready('bind_monster') && mons.some((m) => this.def(m).cls !== 'power')) out.push({ key: 'u:bind', label: 'Cast Bind Monster' });
      if (this.hasItem(inv, 'flute_of_the_outer_gods')) out.push({ key: 'u:flute', label: 'Play the Flute of the Outer Gods' });
      for (const id of ['dragons_eye', 'blue_watcher']) if (this.hasItem(inv, id)) out.push({ key: `u:banish:${id}`, label: `Banish a monster with ${ITEM_BY_ID[id].name}` });
    }
    if (this.hasItem(inv, 'silver_key')) {
      if (node) out.push({ key: 'u:key', label: 'Use the Silver Key: pass into the Dreamlands' });
      else if (inv.place.t === 'world' && inv.place.world === 'earths_dreamlands' && inv.silverKey) {
        out.push({ key: 'u:keyBack', label: `Use the Silver Key: return to ${this.nodeName(inv.silverKey)}` });
      }
    }
    if (this.tradePartners(inv).length) out.push({ key: 'u:trade', label: 'Trade with an investigator here' });
    void here;
    return out;
  }

  *castSpell(inv: Investigator, uid: string): Flow<boolean> {
    const card = inv.spells.find((c) => c.uid === uid);
    if (!card || inv.usedSpells.includes(uid)) return false;
    const sd = SPELL_BY_ID[card.id];
    if (sd.sanityCost && inv.san <= sd.sanityCost) {
      this.log(`${inv.name} lacks the Sanity to cast ${sd.name}.`);
      return false;
    }
    inv.usedSpells.push(uid);
    if (!this.test(inv, 'knowledge', 0, sd.name)) {
      this.log(`${inv.name} fails to cast ${sd.name}.`);
      return false;
    }
    if (sd.sanityCost) yield* this.lose(inv, 'san', sd.sanityCost);
    this.log(`${inv.name} casts ${sd.name}.`);
    return true;
  }

  *pickTarget(inv: Investigator, title: string): Flow<Investigator> {
    const node = this.node(inv);
    const here = node ? this.invsAt(node) : this.worldMates(inv);
    if (here.length <= 1) return inv;
    const k = yield* this.choose(inv, title, here.map((i) => ({ key: i.id, label: `${i.name}${i.stranded ? ' (lost)' : ''}` })));
    return this.inv(k) ?? inv;
  }

  *pickMonster(inv: Investigator, title: string, filter: (m: MonsterInst) => boolean = () => true): Flow<MonsterInst | null> {
    const node = this.node(inv);
    const mons = node ? this.monstersAt(node).filter(filter) : [];
    if (!mons.length) return null;
    if (mons.length === 1) return mons[0];
    const k = yield* this.choose(inv, title, mons.map((m) => ({ key: m.uid, label: this.mName(m), ref: m.def })));
    return this.s.monsters[k] ?? mons[0];
  }

  *useUtility(inv: Investigator, key: string): Flow {
    if (key === 'u:heal' || key === 'u:cloud_memory') {
      const card = this.spellReady(inv, key.slice(2))!;
      const target = yield* this.pickTarget(inv, `${SPELL_BY_ID[card.id].name}: choose a target`);
      if (yield* this.castSpell(inv, card.uid)) this.gain(target, key === 'u:heal' ? 'str' : 'san', 2);
      return;
    }
    if (key === 'u:healing_stone') {
      inv.turn.usedHealingStone = true;
      const target = yield* this.pickTarget(inv, 'Healing Stone: choose a target');
      if (this.test(inv, 'str', 0, 'Healing Stone')) this.gain(target, 'str', this.roll('Healing Stone')[0]);
      return;
    }
    if (key === 'u:brazen_head') {
      const c = inv.items.find((x) => x.id === 'brazen_head')!;
      this.removeItem(inv, c.uid);
      for (let i = 0; i < 2; i++) {
        const [d] = this.roll('Brazen Head');
        if (d < 6) this.drawSpells(inv, 1);
        else if (this.node(inv)) {
          const m = yield* this.appear(this.node(inv)!, inv);
          if (m) yield* this.meetMonsters(inv);
        }
      }
      return;
    }
    if (key === 'u:bind') {
      const card = this.spellReady(inv, 'bind_monster')!;
      const m = yield* this.pickMonster(inv, 'Bind Monster: choose a target', (x) => this.def(x).cls !== 'power');
      if (!m) return this.log('Powers are immune to Bind Monster.');
      const mode = inv.bound ? 'banish' : yield* this.choose(inv, `Bind the ${this.mName(m)}`, [
        { key: 'banish', label: 'Banish it from Earth (to your trophy pile)' },
        { key: 'bind', label: 'Bind it to travel with you and attack a monster or gate' },
      ]);
      if (yield* this.castSpell(inv, card.uid)) {
        this.removeSpell(inv, card.uid);
        if (mode === 'bind') {
          m.node = null;
          m.prev = null;
          m.exit = null;
          inv.bound = m.uid;
          this.log(`${inv.name} binds the ${this.mName(m)} to their will.`, 'info');
        } else {
          this.log(`${inv.name} banishes the ${this.mName(m)}.`);
          this.awardMonster(inv, m);
        }
      }
      return;
    }
    if (key === 'u:key') {
      const node = this.node(inv)!;
      for (const m of this.monstersAt(node)) yield* this.sanityCheck(inv, m);
      inv.silverKey = node;
      inv.place = { t: 'world', world: 'earths_dreamlands', box: 2, gate: null, keyReturn: node };
      this.log(`${inv.name} turns the Silver Key and passes into the Dreamlands.`, 'info');
      yield* this.worldEncounter(inv);
      throw new Interrupt(inv.id);
    }
    if (key === 'u:keyBack') {
      const node = inv.silverKey!;
      inv.place = { t: 'arkham', node };
      this.log(`${inv.name} turns the Silver Key and returns to ${this.nodeName(node)}.`, 'info');
      throw new Interrupt(inv.id);
    }
    if (key === 'u:flute') {
      const m = yield* this.pickMonster(inv, 'Flute of the Outer Gods: choose a target',
        (x) => this.def(x).cls === 'power' || FLUTE_TARGETS.includes(this.def(x).species));
      if (!m) return this.log('The flute has no power over these monsters.');
      const c = inv.items.find((x) => x.id === 'flute_of_the_outer_gods')!;
      this.removeItem(inv, c.uid);
      this.log(`${inv.name} plays the flute; the ${this.mName(m)} is banished.`);
      return this.awardMonster(inv, m);
    }
    if (key.startsWith('u:banish:')) return yield* this.shatter(inv, key.slice(9), {});
    if (key === 'u:trade') return yield* this.trade(inv);
  }

  /** Dragon's Eye / Blue Watcher: banish a monster or close a gate; lose D6 Strength; card returns to the deck. */
  *shatter(inv: Investigator, itemId: string, target: { gate?: GateInst }): Flow {
    const c = inv.items.find((x) => x.id === itemId);
    if (!c) return;
    let monster: MonsterInst | null = null;
    if (!target.gate) {
      monster = yield* this.pickMonster(inv, `${ITEM_BY_ID[itemId].name}: banish which monster?`);
      if (!monster) return;
    }
    this.removeItem(inv, c.uid);
    this.log(`${inv.name} dashes ${ITEM_BY_ID[itemId].name} to the ground!`);
    if (target.gate) yield* this.closeGate(inv, target.gate, 'shatter');
    else if (monster) this.awardMonster(inv, monster);
    yield* this.lose(inv, 'str', this.roll('Concussion')[0]);
  }

  /** Investigators who may trade with `inv`: same Arkham space, or same Other World box. */
  tradePartners(inv: Investigator): Investigator[] {
    const node = this.node(inv);
    const mates = node ? this.invsAt(node) : this.worldMates(inv);
    return mates.filter((o) => o !== inv);
  }

  *tradeOffer(from: Investigator, to: Investigator, title: string): Flow<{ cards: string[]; money: number; label: string }> {
    const opts: PromptOption[] = [];
    for (const c of from.items) opts.push({ key: `i:${c.uid}`, label: ITEM_BY_ID[c.id].name, ref: c.id });
    for (const c of from.spells) opts.push({ key: `s:${c.uid}`, label: SPELL_BY_ID[c.id].name, ref: c.id });
    for (const id of from.localChars) opts.push({ key: `l:${id}`, label: LOCAL_CHARACTERS.find((x) => x.id === id)!.name });
    if (from.charity && !to.charity) opts.push({ key: 'charity', label: from.charity === 'owed' ? 'Charity card (repayment owed)' : 'Charity card' });
    let cards: string[] = [];
    if (opts.length) {
      const a = yield { kind: 'cards', inv: from.id, multi: true, title, text: 'Select any cards to hand over (or none).', options: opts } as Prompt;
      cards = (Array.isArray(a) ? a : [a]).filter((k) => opts.some((o) => o.key === k));
    }
    let money = 0;
    if (from.money > 0) {
      const amts = [0, 1, 2, 5, 10, from.money].filter((v, i, a) => v <= from.money && a.indexOf(v) === i);
      money = Number(yield* this.choose(from, `${from.name}: add money?`, amts.map((v) => ({ key: String(v), label: v ? `$${v}` : 'No money' }))));
    }
    const names = cards.map((k) => opts.find((o) => o.key === k)!.label);
    if (money) names.push(`$${money}`);
    return { cards, money, label: names.length ? names.join(', ') : 'nothing' };
  }

  transfer(from: Investigator, to: Investigator, offer: { cards: string[]; money: number }) {
    from.money -= offer.money;
    to.money += offer.money;
    for (const k of offer.cards) {
      if (k.startsWith('i:')) to.items.push(...from.items.splice(from.items.findIndex((c) => c.uid === k.slice(2)), 1));
      else if (k.startsWith('s:')) to.spells.push(...from.spells.splice(from.spells.findIndex((c) => c.uid === k.slice(2)), 1));
      else if (k.startsWith('l:')) {
        from.localChars = from.localChars.filter((x) => x !== k.slice(2));
        to.localChars.push(k.slice(2));
      } else if (k === 'charity') {
        to.charity = from.charity;
        from.charity = null;
      }
    }
  }

  /** Two-way trade between investigators sharing a space (Making Trades). */
  *trade(inv: Investigator): Flow {
    const others = this.tradePartners(inv);
    if (!others.length) return;
    const partner = others.length === 1 ? others[0]
      : this.inv(yield* this.choose(inv, 'Trade with whom?', others.map((o) => ({ key: o.id, label: o.name }))));
    if (!partner) return;
    const give = yield* this.tradeOffer(inv, partner, `${inv.name}: what do you offer ${partner.name}?`);
    const get = yield* this.tradeOffer(partner, inv, `${partner.name}: what do you give ${inv.name} in return?`);
    if (!give.cards.length && !give.money && !get.cards.length && !get.money) return;
    if (this.s.setup.options.carryLimit) {
      const items = (o: { cards: string[] }) => o.cards.filter((k) => k.startsWith('i:')).length;
      for (const [who, n] of [[partner, partner.items.length + items(give) - items(get)], [inv, inv.items.length + items(get) - items(give)]] as const) {
        if (n > who.items.length && n > who.str) {
          return this.log(`${who.name} cannot carry that many items (Strength ${who.str}). The trade is off.`, 'warn');
        }
      }
    }
    const ok = yield* this.yesNo(inv, 'Accept the trade?', 'Shake hands', 'Call it off', `${inv.name} gives: ${give.label}\n${partner.name} gives: ${get.label}`);
    if (!ok) return this.log('The trade is called off.');
    this.transfer(inv, partner, give);
    this.transfer(partner, inv, get);
    this.log(`${inv.name} and ${partner.name} trade: ${give.label} for ${get.label}.`);
  }

  // ------------------------------------------------------------------ monsters & combat

  /** One sanity roll per individual monster (and per species in one encounter) per game turn. */
  *sanityCheck(inv: Investigator, m: MonsterInst, speciesSeen?: Set<string>): Flow {
    const d = this.def(m);
    if (inv.sanityRolled.includes(m.uid)) return;
    inv.sanityRolled.push(m.uid);
    if (speciesSeen?.has(d.species)) return;
    speciesSeen?.add(d.species);
    const [pass, fail] = d.san;
    if (pass === 0 && fail === 0 && d.sanFailD6Plus === undefined) return;
    const ok = this.test(inv, 'san', 0, `facing ${d.species}`);
    const loss = ok ? pass : d.sanFailD6Plus !== undefined ? this.roll('Sanity loss')[0] + d.sanFailD6Plus : fail;
    yield* this.lose(inv, 'san', loss);
  }

  monsterSp(m: MonsterInst): number {
    const d = this.def(m);
    if (d.spPlusD6) {
      if (this.rolledSp[m.uid] === undefined) this.rolledSp[m.uid] = d.sp + this.roll(`${d.species} strength`)[0];
      return this.rolledSp[m.uid];
    }
    return d.sp + m.vampireBonus;
  }

  /** The investigator chooses weapons and spells and attacks. Returns true on a kill (or gate destroyed). */
  *attack(inv: Investigator, target: { monster?: MonsterInst; gate?: GateInst }): Flow<{ win: boolean; noCounter: boolean }> {
    const d = target.monster ? this.def(target.monster) : null;
    const opts: PromptOption[] = [];
    for (const c of inv.items) {
      const it = ITEM_BY_ID[c.id];
      if (it.attack && !it.oneTurn) opts.push({ key: c.uid, label: `${it.name} (+${it.attack}${it.magical ? ' magical' : ''}${it.hands ? `, ${it.hands}H` : ''})`, ref: c.id });
      if (it.oneTurn && !inv.turn.holyWater) opts.push({ key: c.uid, label: `${it.name} (+6 magical all turn)`, ref: c.id });
    }
    for (const c of inv.spells) {
      const sd = SPELL_BY_ID[c.id];
      if (sd.attack && !inv.usedSpells.includes(c.uid)) opts.push({ key: c.uid, label: `${sd.name} (+${sd.attack} magical, ${sd.sanityCost} SAN)`, ref: c.id, disabled: inv.san <= sd.sanityCost ? 'Not enough Sanity' : undefined });
    }
    if (d?.special?.includes('magicAndSilver') && this.hasItem(inv, 'silver_bullet') && inv.items.some((c) => ITEM_BY_ID[c.id].gun)) {
      opts.push({ key: 'silver', label: 'Fire the Silver Bullet' });
    }
    if (target.monster && this.hasItem(inv, 'piccolo_of_leng') && !inv.turn.usedPiccolo) opts.push({ key: 'piccolo', label: 'Play the Piccolo of Leng (no counterattack on heads)' });
    const bound = inv.bound ? this.s.monsters[inv.bound] : null;
    const sameSpecies = !!bound && !!d && this.def(bound).species === d.species;
    if (bound) opts.push({ key: 'bound', label: `Bound ${this.mName(bound)} attacks (+${this.monsterSp(bound)}${sameSpecies ? ' magical' : ' physical'})`, ref: bound.def });

    const sp = target.monster ? this.monsterSp(target.monster) : target.gate!.sp;
    let chosen: string[] = [];
    for (;;) {
      const a = yield {
        kind: 'combat', inv: inv.id, multi: true,
        title: target.monster ? `${inv.name} attacks the ${d!.species} (SP ${sp})` : `${inv.name} attacks the gate (SP ${sp})`,
        text: [
          `Fight ${this.skill(inv, 'fight')} + chosen weapons and spells + D6.`,
          d?.special?.includes('onlyMagic') && 'Only magic harms it: Fight and ordinary weapons have no effect.',
          d?.special?.includes('magicAndSilver') && 'Harmed only by magic and the silver bullet.',
          d?.special?.includes('weapons1') && 'Weapons do 1 point damage: each physical attack counts as 1.',
          d?.special?.includes('unharmedByGuns') && 'Unharmed by guns.',
          inv.turn.holyWater && 'Holy Water: +6 magical this turn.',
        ].filter(Boolean).join('\n'),
        options: opts, data: { sp, monster: target.monster?.def, fight: this.skill(inv, 'fight') },
      } as Prompt;
      chosen = (Array.isArray(a) ? a : a ? [a] : []).filter((k) => opts.some((o) => o.key === k && !o.disabled));
      const hands = chosen.reduce((n, k) => n + (ITEM_BY_ID[inv.items.find((c) => c.uid === k)?.id ?? '']?.hands ?? 0), 0);
      if (hands <= 2) break;
    }

    if (chosen.includes('silver')) {
      const b = inv.items.find((c) => c.id === 'silver_bullet')!;
      this.removeItem(inv, b.uid);
      this.log(`The silver bullet strikes the Werewolf true!`, 'combat');
      return { win: true, noCounter: true };
    }
    let noCounter = false;
    if (chosen.includes('piccolo')) {
      inv.turn.usedPiccolo = true;
      noCounter = this.rng.coin();
      this.log(noCounter ? 'The piccolo shrills — the monster cannot strike back this round.' : 'The piccolo fails.', 'combat');
    }

    const special = d?.special ?? [];
    const onlyMagic = special.includes('onlyMagic') || special.includes('magicAndSilver');
    const weapons1 = special.includes('weapons1');
    const noGuns = special.includes('unharmedByGuns');
    const spectacles = this.hasItem(inv, 'alien_spectacles');
    let total = 0;
    let spectaclesUsed = false;
    const physical = (n: number, oneHanded = false, gun = false) => {
      if (!target.monster) return n;
      if (gun && noGuns) return 0;
      if (onlyMagic) {
        if (spectacles && oneHanded && !spectaclesUsed) {
          spectaclesUsed = true;
          return weapons1 ? 1 : n;
        }
        return 0;
      }
      return weapons1 ? Math.min(1, n) : n;
    };
    total += physical(this.skill(inv, 'fight'));
    if (this.s.setup.options.teamFightBonus && this.node(inv) && this.invsAt(this.node(inv)!).length > 1) total += 1;
    if (inv.turn.holyWater) total += 6;
    for (const k of chosen) {
      if (k === 'bound' && bound) {
        // A bound monster's attack is physical, except against its own species (magical).
        total += sameSpecies ? this.monsterSp(bound) : physical(this.monsterSp(bound));
        continue;
      }
      const item = inv.items.find((c) => c.uid === k);
      if (item) {
        const it = ITEM_BY_ID[item.id];
        if (it.oneTurn) {
          inv.turn.holyWater = true;
          total += 6;
        } else if (it.magical) total += it.attack ?? 0;
        else total += physical(it.attack ?? 0, it.hands === 1, it.gun);
        if (it.oneUse) this.removeItem(inv, item.uid);
        continue;
      }
      const spell = inv.spells.find((c) => c.uid === k);
      if (spell && (yield* this.castSpell(inv, spell.uid))) total += SPELL_BY_ID[spell.id].attack ?? 0;
    }
    const [die] = this.roll(`${inv.name}: attack`);
    total += die;
    const win = total >= sp;
    // Replace the bare attack die with the full total so the tray shows the result.
    this.s.rolls.pop();
    this.showRoll({ label: `${inv.name}: attack — total ${total} vs SP ${sp}`, dice: [die], success: win });
    this.log(`${inv.name} attacks with a total of ${total} against SP ${sp}: ${win ? 'success!' : 'not enough.'}`, 'combat');
    if (win && bound && chosen.includes('bound')) yield* this.releaseBound(inv, bound, !!target.gate);
    return { win, noCounter };
  }

  /** After a successful attack the bound monster goes through the gate (trophy) or is set free nearby. */
  *releaseBound(inv: Investigator, m: MonsterInst, intoGate: boolean): Flow {
    inv.bound = null;
    if (intoGate) {
      inv.trophies.monsters.push(m.uid);
      return this.log(`The bound ${this.mName(m)} is sucked through the gate.`, 'info');
    }
    const node = this.node(inv);
    const spots = node ? (isLocNode(node) ? NEIGHBORS[node] : STREET_NEIGHBORS[node]) : [];
    if (!spots.length) {
      this.log(`The bound ${this.mName(m)} is released and vanishes.`);
      return this.toCup(m);
    }
    let dest = spots[0];
    if (spots.length > 1) {
      dest = yield* this.ask({
        kind: 'destination', inv: inv.id, title: `Set the ${this.mName(m)} free — where?`, nodes: spots,
        options: spots.map((n) => ({ key: n, label: this.nodeName(n), ref: n })),
      });
      if (!spots.includes(dest)) dest = spots[0];
    }
    m.node = dest;
    m.prev = null;
    this.log(`The ${this.mName(m)} is released at ${this.nodeName(dest)}.`);
    yield* this.orient(m, inv, true);
  }

  /** A monster's attack or counterattack lands (unless warded off). */
  *monsterHits(inv: Investigator, m: MonsterInst | null, def: MonsterDef): Flow {
    const opts: PromptOption[] = [];
    const ward = this.spellReady(inv, 'flesh_ward');
    if (ward) opts.push({ key: 'ward', label: 'Cast Flesh Ward' });
    for (const id of inv.localChars) opts.push({ key: `lc:${id}`, label: `${LOCAL_CHARACTERS.find((x) => x.id === id)!.name} takes the blow` });
    if (opts.length) {
      opts.unshift({ key: 'take', label: 'Take the blow' });
      const k = yield* this.choose(inv, `The ${def.species} strikes at ${inv.name}!`, opts);
      if (k === 'ward' && (yield* this.castSpell(inv, ward!.uid))) return this.log('The Flesh Ward turns the blow aside.', 'combat');
      if (k.startsWith('lc:')) {
        const id = k.slice(3);
        inv.localChars = inv.localChars.filter((x) => x !== id);
        this.s.localCharsLeft.push(id);
        return this.log(`${LOCAL_CHARACTERS.find((x) => x.id === id)!.name} takes the blow and is gone.`, 'combat');
      }
    }
    if (def.special?.includes('nightgaunt')) return yield* this.nightgauntDrop(inv);
    const dmg = this.roll(`${def.species} attack`)[0];
    if (m && def.special?.includes('tindalos')) {
      this.log('Having drawn blood, the Hound of Tindalos returns to its angles.', 'combat');
      this.toCup(m);
    }
    yield* this.lose(inv, 'str', dmg);
  }

  *nightgauntDrop(inv: Investigator): Flow {
    if (inv.place.t === 'world') {
      this.log(`A nightgaunt carries ${inv.name} back to Arkham!`, 'combat');
      yield* this.returnToArkham(inv);
      throw new Interrupt(inv.id);
    }
    const from = this.node(inv)!;
    const dist = distances(from);
    const gates = this.openGates().sort((a, b) => (dist[locNode(a.location!)] ?? 99) - (dist[locNode(b.location!)] ?? 99));
    if (!gates.length) return this.log('The nightgaunt finds no gate and drops its prey.', 'combat');
    const g = gates[0];
    g.faceUp = true;
    inv.place = { t: 'world', world: g.world, box: 2, gate: g.uid };
    this.log(`A nightgaunt drops ${inv.name} through the gate at ${this.locName(g.location!)} into ${WORLDS[g.world].name}!`, 'combat');
    throw new Interrupt(inv.id);
  }

  /** Award a killed/banished monster: trophy, Migo item, or the Order of Dagon. */
  awardMonster(inv: Investigator, m: MonsterInst) {
    const d = this.def(m);
    m.node = null;
    delete this.rolledSp[m.uid];
    if (d.special?.includes('migo')) {
      this.toCup(m);
      this.log('The Migo dissolves; something it carried remains.');
      const id = this.drawCard('item');
      if (id && id !== 'auction') inv.items.push({ uid: this.uid('c'), id });
      else if (id) this.discardCard('item', id);
      return;
    }
    if (inv.charity === 'owed') {
      inv.charity = 'ready';
      this.toCup(m);
      return this.log(`The Order of Dagon claims the ${d.species} as ${inv.name}'s repayment.`);
    }
    inv.trophies.monsters.push(m.uid);
    this.log(`${inv.name} defeats the ${d.species}!`, 'combat');
  }

  /** Investigator meets the monsters at their Arkham node (Investigator Step 3 & 4). */
  *meetMonsters(inv: Investigator): Flow {
    const node = this.node(inv)!;
    const loc = nodeLoc(node);
    const species = new Set<string>();
    for (;;) {
      if (this.node(inv) !== node) return;
      const mons = this.monstersAt(node);
      if (!mons.length) return;
      const gate = this.gateAt(loc);
      const opts: PromptOption[] = mons.map((m) => ({ key: `f:${m.uid}`, label: `Fight the ${this.mName(m)} (SP ${this.def(m).spPlusD6 ? '14+D6' : this.def(m).sp + m.vampireBonus})`, ref: m.def }));
      const tindalosHere = mons.some((m) => this.def(m).special?.includes('tindalos'));
      const free = NEIGHBORS[node].filter((n) => this.monstersAt(n).length === 0);
      opts.push({ key: 'sneak', label: 'Sneak away', disabled: tindalosHere ? 'The Hound cannot be evaded' : free.length === 0 ? 'Monsters on every side' : undefined });
      if (gate) opts.push({ key: 'sneakGate', label: `Sneak past into the gate${gate.faceUp ? ` to ${WORLDS[gate.world].name}` : ''}` });
      if (gate && inv.foundGate === gate.uid) opts.push({ key: 'attackGate', label: `Attack the gate (SP ${gate.sp})` });
      opts.push(...this.utilityOptions(inv));
      opts.push({ key: 'wait', label: 'Wait' });
      const k = yield* this.choose(inv, `${inv.name} meets ${mons.map((m) => this.mName(m)).join(', ')}`, opts);
      if (k === 'wait' || k === '') return;
      if (k === 'sneak') {
        const ghastly = [...mons].sort((a, b) => ghastliness(this.def(b)) - ghastliness(this.def(a)))[0];
        const ok = inv.turn.autoSneak || this.test(inv, 'sneak');
        if (ok) {
          inv.turn.autoSneak = false;
          let dest = free[0];
          if (free.length > 1) {
            dest = yield* this.ask({ kind: 'destination', inv: inv.id, title: 'Sneak to which space?', nodes: free, options: free.map((n) => ({ key: n, label: this.nodeName(n), ref: n })) });
            if (!free.includes(dest)) dest = free[0];
          }
          yield* this.sanityCheck(inv, ghastly, species);
          this.moveTo(inv, dest);
          this.log(`${inv.name} sneaks away to ${this.nodeName(dest)}.`);
          if (this.monstersAt(dest).length) return yield* this.meetMonsters(inv);
          if (isLocNode(dest)) return yield* this.locationEncounter(inv, true);
          return;
        }
        this.log(`${inv.name} fails to sneak away and must confront the monster.`, 'warn');
        yield* this.sanityCheck(inv, ghastly, species);
        continue;
      }
      if (k === 'sneakGate') {
        for (const m of mons) yield* this.sanityCheck(inv, m);
        if (inv.turn.autoSneak || this.test(inv, 'sneak', 0, 'past the guardians')) {
          inv.turn.autoSneak = false;
          return yield* this.enterGate(inv, gate!);
        }
        yield* this.lose(inv, 'str', this.roll('Caught sneaking')[0]);
        continue;
      }
      if (k === 'attackGate') {
        for (const m of mons) yield* this.sanityCheck(inv, m);
        return yield* this.attackGate(inv, gate!);
      }
      if (k.startsWith('f:')) {
        const m = this.s.monsters[k.slice(2)];
        yield* this.sanityCheck(inv, m, species);
        const r = yield* this.attack(inv, { monster: m });
        if (r.win) this.awardMonster(inv, m);
        else if (!r.noCounter) yield* this.monsterHits(inv, m, this.def(m));
        continue;
      }
      yield* this.useUtility(inv, k);
    }
  }

  // ------------------------------------------------------------------ gates & other worlds

  *enterGate(inv: Investigator, gate: GateInst): Flow {
    gate.faceUp = true;
    inv.place = { t: 'world', world: gate.world, box: 2, gate: gate.uid };
    this.log(`${inv.name} steps through the gate into ${WORLDS[gate.world].name}.`, 'info');
    yield* this.worldEncounter(inv);
  }

  *worldEncounter(inv: Investigator): Flow {
    const p = inv.place;
    if (p.t !== 'world') return;
    for (;;) {
      const fg = this.spellReady(inv, 'find_gate');
      const opts: PromptOption[] = [{ key: 'roll', label: 'Roll on the gate table' }];
      if (fg && !p.returnTo) opts.push({ key: 'find', label: 'Cast Find Gate and return to Arkham' });
      opts.push(...this.utilityOptions(inv));
      if (opts.length === 1) break;
      const k = yield* this.choose(inv, `${inv.name} in ${WORLDS[p.world].name} (box ${p.box})`, opts);
      if (k === 'roll' || !k) break;
      if (k === 'find') {
        if (yield* this.castSpell(inv, fg!.uid)) {
          yield* this.returnToArkham(inv);
          throw new Interrupt(inv.id);
        }
        continue;
      }
      yield* this.useUtility(inv, k);
    }
    const w = WORLDS[p.world];
    const [d] = this.roll(`${w.name} gate table`);
    const entry = w.table.find((e) => e.roll.includes(d))!;
    this.log(`${w.name} (${d}): ${entry.text}`, 'roll');
    yield* this.resolveEntry(inv, entry, { world: p.world });
  }

  *worldMonster(inv: Investigator): Flow {
    const p = inv.place;
    if (p.t !== 'world') return;
    const m = this.drawMonster();
    if (!m) return;
    const d = this.def(m);
    if (d.special?.includes('tindalos') && WORLDS[p.world].tindalosSafe) {
      this.log('A Hound of Tindalos finds no angles here and vanishes.');
      return this.toCup(m);
    }
    this.log(`A ${d.species} attacks ${inv.name} in ${WORLDS[p.world].name}!`, 'combat');
    try {
      yield* this.sanityCheck(inv, m);
      for (;;) {
        const fg = this.spellReady(inv, 'find_gate');
        const opts: PromptOption[] = [{ key: 'fight', label: `Fight the ${d.species}`, ref: m.def }, { key: 'sneak', label: 'Sneak away' }];
        if (fg) opts.push({ key: 'find', label: 'Cast Find Gate and return to Arkham' });
        opts.push(...this.utilityOptions(inv).filter((o) => o.key === 'u:keyBack'));
        const k = yield* this.choose(inv, `${inv.name} faces a ${d.species}`, opts);
        if (k === 'u:keyBack') {
          this.toCup(m);
          yield* this.useUtility(inv, k);
        }
        if (k === 'find' && (yield* this.castSpell(inv, fg!.uid))) {
          this.toCup(m);
          yield* this.returnToArkham(inv);
          throw new Interrupt(inv.id);
        }
        if (k === 'sneak') {
          if (inv.turn.autoSneak || this.test(inv, 'sneak')) {
            this.log(`${inv.name} slips away; the ${d.species} is gone.`);
            return this.toCup(m);
          }
          yield* this.monsterHits(inv, null, d);
          continue;
        }
        if (k === 'fight') {
          const r = yield* this.attack(inv, { monster: m });
          if (r.win) return this.awardMonster(inv, m);
          if (!r.noCounter) yield* this.monsterHits(inv, null, d);
        }
      }
    } catch (e) {
      if (m.node === null && !Object.values(this.s.investigators).some((i) => i.trophies.monsters.includes(m.uid))) this.toCup(m);
      throw e;
    }
  }

  *visitWorld(inv: Investigator, world: WorldId, stayTurn: boolean): Flow {
    const prev = inv.place;
    const returnTo = nodeLoc(this.node(inv) ?? '') ?? undefined;
    inv.place = { t: 'world', world, box: 1, gate: null, returnTo };
    this.log(`${inv.name} is drawn into ${WORLDS[world].name}.`);
    const w = WORLDS[world];
    const [d] = this.roll(`${w.name} gate table`);
    const entry = w.table.find((e) => e.roll.includes(d))!;
    this.log(`${w.name} (${d}): ${entry.text}`, 'roll');
    yield* this.resolveEntry(inv, entry, { world });
    if (inv.out || inv.place.t !== 'world' || inv.place.world !== world) return;
    if (prev.t === 'world') {
      // Another Dimension: return to this box next turn.
      inv.place = prev;
      inv.lostTurns = Math.max(inv.lostTurns, 1);
      return;
    }
    if (!stayTurn) {
      inv.place = prev;
      this.log(`${inv.name} returns to ${this.nodeName((prev as { node: string }).node)}.`);
    }
    throw new Interrupt(inv.id);
  }

  /** "Gate and monster appear" location result. */
  *locationGate(inv: Investigator): Flow {
    const node = this.node(inv)!;
    const loc = nodeLoc(node)!;
    if (this.s.elderSigns.includes(loc)) return this.log('The Elder Sign holds; nothing appears.');
    const existing = this.gateAt(loc);
    if (existing) {
      const m = yield* this.appear(node, inv);
      if (m) yield* this.meetMonsters(inv);
      return;
    }
    const gate = this.drawGate(loc);
    if (!gate) return;
    this.log(`A gate to ${WORLDS[gate.world].name} tears open at ${this.locName(loc)}!`, 'mythos');
    yield* this.appear(node, inv);
    gate.faceUp = true;
    inv.place = { t: 'world', world: gate.world, box: 2, gate: gate.uid };
    this.log(`${inv.name} is swept through into ${WORLDS[gate.world].name}.`, 'warn');
    yield* this.worldEncounter(inv);
    throw new Interrupt(inv.id);
  }

  *attackGate(inv: Investigator, gate: GateInst): Flow {
    for (const m of this.monstersAt(locNode(gate.location!))) yield* this.sanityCheck(inv, m);
    const r = yield* this.attack(inv, { gate });
    if (r.win) yield* this.closeGate(inv, gate, 'attack');
    else this.log('The gate holds. Try again next turn.');
  }

  *elderSign(inv: Investigator, gate: GateInst): Flow {
    const c = inv.items.find((x) => x.id === 'elder_sign');
    if (!c || inv.san <= 2) return;
    yield* this.lose(inv, 'san', 2);
    this.removeItem(inv, c.uid, false);
    const loc = gate.location!;
    yield* this.closeGate(inv, gate, 'elderSign');
    this.s.elderSigns.push(loc);
    this.s.doom = Math.max(0, this.s.doom - 1);
    this.log(`The Elder Sign seals ${this.locName(loc)} forever. Doom falls back to ${this.s.doom}.`, 'info');
  }

  *closeGate(inv: Investigator, gate: GateInst, how: 'attack' | 'elderSign' | 'shatter'): Flow {
    const loc = gate.location!;
    const node = locNode(loc);
    this.log(`${inv.name} destroys the gate to ${WORLDS[gate.world].name} at ${this.locName(loc)}!`, 'info');
    // Guardians (black-and-white monsters on the gated location) are sucked through.
    for (const m of this.monstersAt(node)) {
      if (this.def(m).world === null) {
        m.node = null;
        inv.trophies.monsters.push(m.uid);
        this.log(`The ${this.mName(m)} is sucked through the dying gate.`, 'info');
      }
    }
    // Colour purge.
    for (const m of this.boardMonsters()) {
      if (this.def(m).world === gate.world) {
        this.toCup(m);
        this.log(`The ${this.mName(m)} fades back to ${WORLDS[gate.world].name}.`);
      }
    }
    gate.location = null;
    for (const i of Object.values(this.s.investigators)) if (i.foundGate === gate.uid) i.foundGate = null;
    if (inv.charity === 'owed' && how !== 'elderSign') {
      inv.charity = 'ready';
      this.s.gateDeck.push(gate.uid);
      this.log(`The Order of Dagon claims the gate as ${inv.name}'s repayment.`);
    } else inv.trophies.gates.push(gate.uid);
    // Anyone still on the far side is stranded.
    for (const other of this.activeInvestigators()) {
      if (other.place.t === 'world' && other.place.gate === gate.uid && !this.openGates().some((g) => g.world === gate.world)) {
        yield* this.loseInvestigator(other, 'is stranded when the gate collapses');
        yield* this.lose(inv, 'san', this.roll('Remorse')[0]);
      }
    }
    this.checkVictory();
    void how;
  }

  // ------------------------------------------------------------------ mythos phase

  *mythos(): Flow {
    this.s.phase = 'mythos';
    this.log('— Mythos Phase —', 'mythos');
    for (const i of Object.values(this.s.investigators)) i.sanityRolled = [];
    yield* this.gateAppears();
    this.moveMonsters();
    yield* this.monsterAttacks();
  }

  *gateAppears(): Flow {
    const [a, b] = this.roll('Gate Appearance Table', 2);
    const total = a + b;
    const loc = GATE_APPEARANCE[total];
    this.log(`Gate Appearance roll ${total}: ${this.locName(loc)}.`, 'mythos');
    for (const m of this.boardMonsters()) if (this.def(m).cls === 'vampire') m.vampireBonus++;
    if (this.s.elderSigns.includes(loc)) {
      this.log('An Elder Sign protects it; nothing appears.', 'mythos');
    } else if (this.gateAt(loc)) {
      yield* this.appear(locNode(loc), null);
    } else {
      const g = this.drawGate(loc);
      if (g) {
        this.log(`A gate opens at ${this.locName(loc)}!`, 'mythos');
        yield* this.appear(locNode(loc), null);
      }
    }
    if (GATE_EXTRA_MONSTER[this.s.setup.options.gateTable].includes(total)) {
      for (const g of this.openGates()) if (g.location !== loc) yield* this.appear(locNode(g.location!), null);
    }
    // Investigators already at a location where something appeared will face it during monster attacks.
  }

  /** Mythos Step 2: all monsters move. */
  moveMonsters() {
    const investigatorNodes = (tindalos: boolean) => new Set(
      this.activeInvestigators().map((i) => this.node(i)).filter((n): n is string => {
        if (!n) return false;
        const l = nodeLoc(n);
        return tindalos ? !!l && LOCATIONS[l].building : !l;
      }),
    );
    this.s.monsterMoves = {};
    this.s.moveSeq++;
    for (const m of Object.values(this.s.monsters).sort((a, b) => a.uid.localeCompare(b.uid, undefined, { numeric: true }))) {
      if (!m.node) continue;
      const start = m.node;
      const d = this.def(m);
      if (d.speed === 0) continue;
      if (this.invsAt(m.node).length) continue; // already engaged
      const tindalos = !!d.special?.includes('tindalos');
      if (d.cls === 'flyer') {
        const targets = investigatorNodes(tindalos);
        if (!targets.size) continue;
        const passable = (n: string) => !isLocNode(n) || targets.has(n);
        const dist = distances(m.node, passable);
        const reach = [...targets].filter((n) => dist[n] !== undefined).sort((x, y) => dist[x] - dist[y]);
        if (!reach.length) continue;
        const best = reach.filter((n) => dist[n] === dist[reach[0]]);
        const fightOf = (n: string) => Math.max(...this.invsAt(n).map((i) => this.skill(i, 'fight')));
        best.sort((x, y) => fightOf(y) - fightOf(x));
        const target = best.length > 1 && fightOf(best[0]) === fightOf(best[1]) ? this.rng.pick(best.filter((n) => fightOf(n) === fightOf(best[0]))) : best[0];
        const path = shortestPath(m.node, target, passable)!;
        const steps = Math.min(d.speed, path.length - 1);
        m.prev = path[steps - 1] ?? m.node;
        m.node = path[steps];
        this.s.monsterMoves[m.uid] = path.slice(0, steps + 1);
        this.log(`The ${d.species} flies to ${this.nodeName(m.node)}.`, 'mythos');
        continue;
      }
      const stopAt = investigatorNodes(false);
      let cur = m.node;
      let prev = m.prev;
      const walked = [start];
      for (let i = 0; i < d.speed; i++) {
        let next: string;
        const exit = m.exit;
        if (isLocNode(cur)) next = NEIGHBORS[cur].find((e) => exit && STREET_NEIGHBORS[e].includes(exit)) ?? this.rng.pick(NEIGHBORS[cur]);
        else if (exit && STREET_NEIGHBORS[cur].includes(exit)) {
          next = exit;
          m.exit = null;
        } else next = nextStreetNode(prev, cur, d.hand ?? 'R', (opts) => this.rng.pick(opts));
        prev = cur;
        cur = next;
        walked.push(cur);
        if (stopAt.has(cur)) break;
      }
      m.node = cur;
      m.prev = prev;
      this.s.monsterMoves[m.uid] = walked;
    }
    this.log('The monsters prowl the streets of Arkham.', 'mythos');
  }

  /** Mythos Step 3: monsters in a space or location with investigators attack. */
  *monsterAttacks(): Flow {
    const nodes = new Set(this.boardMonsters().map((m) => m.node!));
    for (const node of nodes) {
      const loc = nodeLoc(node);
      let mons = this.monstersAt(node).filter((m) => {
        const d = this.def(m);
        if (d.special?.includes('tindalos')) return !!loc && LOCATIONS[loc].building;
        return true;
      });
      const invs = this.invsAt(node);
      if (!mons.length || !invs.length) continue;
      mons = mons.sort((a, b) => this.monsterSp(b) - this.monsterSp(a));
      const ranked = [...invs].sort((a, b) => this.skill(b, 'fight') - this.skill(a, 'fight') || (this.rng.coin() ? 1 : -1));
      for (let i = 0; i < mons.length; i++) {
        const m = mons[i];
        const target = ranked[i % ranked.length];
        if (m.node !== node || this.node(target) !== node || target.out) continue;
        this.s.active = target.id;
        try {
          yield* this.monsterAttack(target, m);
        } catch (e) {
          if (!(e instanceof Interrupt)) throw e;
        }
      }
    }
    this.s.active = null;
  }

  *monsterAttack(inv: Investigator, m: MonsterInst): Flow {
    const d = this.def(m);
    const node = m.node!;
    this.log(`The ${d.species} attacks ${inv.name}!`, 'combat');
    yield* this.sanityCheck(inv, m);
    while (m.node === node && this.node(inv) === node) {
      const free = NEIGHBORS[node].filter((n) => this.monstersAt(n).length === 0);
      const canSneak = !(d.special?.includes('tindalos')) && free.length > 0;
      const k = yield* this.choose(inv, `The ${d.species} attacks ${inv.name}`, [
        { key: 'fight', label: `Counterattack (SP ${this.monsterSp(m)})`, ref: m.def },
        { key: 'sneak', label: 'Sneak away', disabled: canSneak ? undefined : 'Cannot sneak' },
      ]);
      if (k === 'sneak' && canSneak) {
        if (inv.turn.autoSneak || this.test(inv, 'sneak')) {
          let dest = free[0];
          if (free.length > 1) {
            dest = yield* this.ask({ kind: 'destination', inv: inv.id, title: 'Sneak to which space?', nodes: free, options: free.map((n) => ({ key: n, label: this.nodeName(n), ref: n })) });
            if (!free.includes(dest)) dest = free[0];
          }
          this.moveTo(inv, dest);
          return this.log(`${inv.name} sneaks away to ${this.nodeName(dest)}.`);
        }
        yield* this.monsterHits(inv, m, d);
        continue;
      }
      const r = yield* this.attack(inv, { monster: m });
      if (r.win) return this.awardMonster(inv, m);
      if (!r.noCounter) yield* this.monsterHits(inv, m, d);
    }
  }

  // ------------------------------------------------------------------ end of game

  checkVictory() {
    if (this.s.turn >= 2 && this.openGates().length === 0) {
      this.endGame(true, 'Every gate has been sealed. Arkham is saved — for now.');
    }
  }

  checkEndOfTurn() {
    const open = this.openGates().length;
    const limit = gateLimit(this.s);
    if (open >= limit) {
      if (this.s.overrunSince !== null && this.s.overrunSince < this.s.turn) {
        this.endGame(false, `${open} gates stood open for a full game turn. Arkham is overrun.`);
      }
      if (this.s.overrunSince === null) {
        this.s.overrunSince = this.s.turn;
        this.log(`${open} gates are open — close one before the end of next turn or Arkham is lost!`, 'warn');
      }
    } else this.s.overrunSince = null;
    this.checkVictory();
  }

  honorRoll(): HonorEntry[] {
    const gateSp = (i: Investigator) => i.trophies.gates.reduce((n, g) => n + this.s.gates[g].sp, 0);
    const monSp = (i: Investigator) => i.trophies.monsters.reduce((n, u) => n + MONSTER_BY_ID[this.s.monsters[u].def].sp, 0);
    const byGateSp = this.s.setup.options.honorByGateSp;
    return Object.values(this.s.investigators)
      .filter((i) => !i.out || i.trophies.gates.length)
      .map((i) => ({
        inv: i.id, name: i.name, player: this.s.setup.players[i.player]?.name ?? '',
        gates: i.trophies.gates.length, gateSp: gateSp(i), monsterSp: monSp(i), survived: !i.out,
      }))
      .sort((a, b) => (byGateSp ? b.gateSp - a.gateSp : b.gates - a.gates) || b.monsterSp - a.monsterSp);
  }

  endGame(victory: boolean, reason: string): never {
    this.s.result = { victory, reason, honor: this.honorRoll() };
    this.log(reason, victory ? 'info' : 'warn');
    throw new GameOver();
  }
}
