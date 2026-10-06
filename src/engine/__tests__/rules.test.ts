import { describe, expect, it } from 'vitest';
import { NEIGHBORS, STREET_NEIGHBORS, TAXI_SPACES, distances, locNode, nextStreetNode } from '../board';
import { LOCATION_NODES } from '../data/boardData';
import { LOCATIONS } from '../data/locations';
import { MONSTERS } from '../data/monsters';
import { ITEMS, SPELLS } from '../data/cards';
import { WORLDS } from '../data/otherWorlds';
import { Game, Interrupt, type Flow } from '../game';
import { DEFAULT_OPTIONS } from '../state';
import type { Answer, Prompt, Setup } from '../types';

function setup(n = 2): Setup {
  return {
    seed: 42,
    players: [{ name: 'P' }],
    investigators: ['joe_diamond', 'harvey_walters', 'vincent_lee', 'gloria_goldberg', 'jenny_barnes'].slice(0, n).map((defId) => ({ defId, player: 0, str: 5 })),
    options: { ...DEFAULT_OPTIONS },
  };
}

/** Run a flow to completion, answering prompts with a function. */
function drive<T>(flow: Flow<T>, answer: (p: Prompt) => Answer = (p) => (p.multi ? [] : p.options.find((o) => !o.disabled)!.key)): T {
  let r = flow.next(undefined as unknown as Answer);
  let guard = 0;
  while (!r.done) {
    if (guard++ > 500) throw new Error(`stuck at prompt: ${r.value.title}`);
    r = flow.next(answer(r.value));
  }
  return r.value;
}

/** A game with setup done, dice fixed to `dice` (cycled). */
function game(dice: number[] = [3], n = 2) {
  const g = new Game(setup(n));
  drive(g.setupGame());
  // clear the board for scenario tests
  for (const m of Object.values(g.state.monsters)) g.toCup(m);
  for (const gate of Object.values(g.state.gates)) gate.location = null;
  g.state.doom = 1;
  let i = 0;
  g.rng.d6 = () => dice[i++ % dice.length];
  return g;
}

function put(g: Game, species: string, node: string) {
  const m = Object.values(g.state.monsters).find((x) => g.def(x).species === species && !x.node)!;
  g.state.cup = g.state.cup.filter((u) => u !== m.uid);
  m.node = node;
  return m;
}

describe('components', () => {
  it('has the box contents', () => {
    expect(MONSTERS).toHaveLength(49);
    expect(MONSTERS.filter((m) => m.cls === 'power')).toHaveLength(5);
    expect(Object.keys(LOCATIONS)).toHaveLength(26);
    expect(Object.keys(WORLDS)).toHaveLength(8);
    expect(ITEMS.reduce((n, i) => n + i.count, 0)).toBe(37); // 16 + 16 + 5 on the card sheets
    expect(SPELLS.reduce((n, s) => n + s.count, 0)).toBe(24);
    for (const l of Object.values(LOCATIONS)) {
      if (!l.table) continue;
      const rolls = l.table.flatMap((e) => e.roll).sort();
      expect(rolls, l.name).toEqual([1, 2, 3, 4, 5, 6]);
    }
    for (const w of Object.values(WORLDS)) expect(w.table.flatMap((e) => e.roll).sort(), w.name).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('board graph', () => {
  it('connects every location and has three taxi stands', () => {
    const d = distances(locNode('train_station'));
    for (const loc of Object.keys(LOCATION_NODES)) expect(d[`loc:${loc}`], loc).toBeDefined();
    expect(TAXI_SPACES).toHaveLength(3);
  });

  it('gives the three back-door locations two entrances', () => {
    const two = Object.entries(LOCATION_NODES).filter(([, v]) => v.entrances.length === 2).map(([k]) => k).sort();
    expect(two).toEqual(['boarding_house', 'dagon_mission', 'miskatonic_u']);
  });

  it('every street space has at least two street neighbours (patrols never dead-end)', () => {
    for (const [n, adj] of Object.entries(STREET_NEIGHBORS)) expect(adj.length, n).toBeGreaterThanOrEqual(2);
  });

  it('handed monsters turn left/right at intersections', () => {
    // Heading west along the Graveyard road: right = north, left = south.
    expect(nextStreetNode('s33', 's34', 'R', (o) => o[0])).toBe('s32');
    expect(nextStreetNode('s33', 's34', 'L', (o) => o[0])).toBe('s40');
    // Heading east along North Street at the Shunned House branch.
    expect(nextStreetNode('s5', 's6', 'R', (o) => o[0])).toBe('s12');
    expect(nextStreetNode('s5', 's6', 'L', (o) => o[0])).toBe('s3');
    // Plain street: keep going.
    expect(nextStreetNode('s0', 's1', 'L', (o) => o[0])).toBe('s4');
    expect(NEIGHBORS['s1']).toContain('loc:train_station');
  });
});

describe('combat', () => {
  it('Only Magic Harms It: Fight and ordinary weapons do nothing; the D6 still counts', () => {
    const g = game([5]);
    const inv = g.inv(g.state.order[0]);
    inv.items = [{ uid: 'x1', id: 'shotgun' }];
    const ghost = put(g, 'Ghost', 's1');
    const r = drive(g.attack(inv, { monster: ghost }), (p) => (p.multi ? ['x1'] : p.options[0].key));
    expect(r.win).toBe(false); // 5 (die only) < 6
    expect(g.state.lastRoll?.label).toContain('total 5');
  });

  it('magical items count against Only Magic monsters', () => {
    const g = game([1]);
    const inv = g.inv(g.state.order[0]);
    inv.items = [{ uid: 'x1', id: 'sword_of_glory' }];
    const ghost = put(g, 'Ghost', 's1');
    const r = drive(g.attack(inv, { monster: ghost }), (p) => (p.multi ? ['x1'] : p.options[0].key));
    expect(r.win).toBe(true); // 1 + 6
  });

  it('Weapons Do 1 Point Damage counts each physical attack as 1', () => {
    const g = game([6]);
    const inv = g.inv(g.state.order[0]); // Joe Diamond, Fight 5 (+ maybe a skill card)
    inv.skillCards = [];
    inv.localChars = [];
    inv.items = [{ uid: 'a', id: 'revolver_38' }, { uid: 'b', id: 'cavalry_saber' }];
    const polyp = put(g, 'Flying Polyp', 's1');
    drive(g.attack(inv, { monster: polyp }), (p) => (p.multi ? ['a', 'b'] : p.options[0].key));
    expect(g.state.lastRoll?.label).toContain('total 9'); // 1 + 1 + 1 + D6(6)
  });

  it('enforces the two-hand limit', () => {
    const g = game([3]);
    const inv = g.inv(g.state.order[0]);
    inv.items = [{ uid: 'a', id: 'shotgun' }, { uid: 'b', id: 'revolver_38' }];
    const ghoul = put(g, 'Ghoul', 's1');
    const answers: Answer[] = [['a', 'b'], ['a']];
    drive(g.attack(inv, { monster: ghoul }), (p) => (p.multi ? answers.shift()! : p.options[0].key));
    expect(answers).toHaveLength(0); // re-prompted after the illegal 3-hand choice
  });

  it('the silver bullet kills a werewolf outright', () => {
    const g = game([1]);
    const inv = g.inv(g.state.order[0]);
    inv.items = [{ uid: 'g', id: 'revolver_38' }, { uid: 's', id: 'silver_bullet' }];
    const wolf = put(g, 'Werewolf', 's1');
    const r = drive(g.attack(inv, { monster: wolf }), (p) => (p.multi ? ['silver'] : p.options[0].key));
    expect(r.win).toBe(true);
    expect(inv.items.map((c) => c.id)).toEqual(['revolver_38']);
  });
});

describe('gates', () => {
  it('closing a gate takes guardians as trophies and purges monsters of that colour', () => {
    const g = game([3]);
    const inv = g.inv(g.state.order[0]);
    inv.charity = 'ready';
    const gate = Object.values(g.state.gates).find((x) => x.world === 'rlyeh')!;
    gate.location = 'woods';
    g.state.gates[Object.values(g.state.gates).find((x) => x.world === 'abyss')!.uid].location = 'graveyard';
    const ghost = put(g, 'Ghost', 'loc:woods');
    const deepOne = put(g, 'Deep One', 's20');
    const ghoul = put(g, 'Ghoul', 's30');
    drive(g.closeGate(inv, gate, 'attack'));
    expect(inv.trophies.gates).toEqual([gate.uid]);
    expect(inv.trophies.monsters).toEqual([ghost.uid]);
    expect(deepOne.node).toBeNull();
    expect(g.state.cup).toContain(deepOne.uid);
    expect(ghoul.node).toBe('s30');
  });

  it('a gate closed while charity is owed goes to the Order of Dagon', () => {
    const g = game([3]);
    const inv = g.inv(g.state.order[0]);
    inv.charity = 'owed';
    const gate = Object.values(g.state.gates)[0];
    gate.location = 'woods';
    g.state.gates[Object.values(g.state.gates)[1].uid].location = 'graveyard';
    drive(g.closeGate(inv, gate, 'attack'));
    expect(inv.trophies.gates).toEqual([]);
    expect(inv.charity).toBe('ready');
    expect(g.state.gateDeck).toContain(gate.uid);
  });

  it('wins when the last gate closes from turn 2 on', () => {
    const g = game([3]);
    g.state.turn = 2;
    const inv = g.inv(g.state.order[0]);
    const gate = Object.values(g.state.gates)[0];
    gate.location = 'woods';
    expect(() => drive(g.closeGate(inv, gate, 'attack'))).toThrow();
    expect(g.state.result?.victory).toBe(true);
  });

  it('does not win on turn 1', () => {
    const g = game([3]);
    const inv = g.inv(g.state.order[0]);
    const gate = Object.values(g.state.gates)[0];
    gate.location = 'woods';
    drive(g.closeGate(inv, gate, 'attack'));
    expect(g.state.result).toBeNull();
  });

  it('the Elder Sign seals the location, moves doom back and blocks new gates there', () => {
    const g = game([1, 1]); // Gate Appearance 2 = Shunned House
    const inv = g.inv(g.state.order[0]);
    inv.items = [{ uid: 'e', id: 'elder_sign' }];
    inv.san = 5;
    const gate = Object.values(g.state.gates)[0];
    gate.location = 'shunned_house';
    g.state.gates[Object.values(g.state.gates)[1].uid].location = 'woods';
    g.state.doom = 5;
    drive(g.elderSign(inv, gate));
    expect(g.state.doom).toBe(4);
    expect(inv.san).toBe(3);
    expect(g.state.elderSigns).toEqual(['shunned_house']);
    drive(g.gateAppears());
    expect(g.gateAt('shunned_house')).toBeUndefined();
    expect(g.monstersAt(locNode('shunned_house'))).toHaveLength(0);
  });

  it('the doom track counts every gate and loses past 13', () => {
    const g = game([1, 1]);
    g.state.doom = 13;
    expect(() => drive(g.gateAppears())).toThrow();
    expect(g.state.result?.victory).toBe(false);
  });

  it('a second gate result on a gated location only adds a monster', () => {
    const g = game([3, 4]); // 7 = Founder's Rock
    const gate = Object.values(g.state.gates)[0];
    gate.location = 'founders_rock';
    const before = g.state.doom;
    drive(g.gateAppears());
    expect(g.state.doom).toBe(before);
    expect(g.openGates()).toHaveLength(1);
  });

  it('gate table variant decides which results add monsters to every gated location', () => {
    for (const [variant, roll, extra] of [['rules', [3, 4], true], ['board', [3, 4], false], ['board', [2, 2], true], ['rules', [2, 2], false]] as const) {
      const g = game([...roll]);
      g.state.setup.options.gateTable = variant;
      const other = Object.values(g.state.gates)[5];
      other.location = 'woods';
      drive(g.gateAppears());
      expect(g.monstersAt(locNode('woods')).length, `${variant} ${roll}`).toBe(extra ? 1 : 0);
    }
  });

  it('loses when the gate limit stands for a full game turn', () => {
    const g = game([3], 2);
    const all = Object.values(g.state.gates);
    const locs = ['woods', 'graveyard', 'black_cave', 'lighthouse', 'devils_beach', 'founders_rock', 'shunned_house', 'darks_carnival'] as const;
    locs.forEach((l, i) => (all[i].location = l));
    g.checkEndOfTurn();
    expect(g.state.result).toBeNull();
    g.state.turn++;
    expect(() => g.checkEndOfTurn()).toThrow();
    expect(g.state.result?.victory).toBe(false);
  });
});

describe('investigators', () => {
  it('reaching 0 Strength in Arkham sends you to the Hospital and costs an item', () => {
    const g = game([6]);
    const inv = g.inv(g.state.order[0]);
    inv.str = 2;
    inv.items = [{ uid: 'a', id: 'knife' }];
    expect(() => drive(g.lose(inv, 'str', 3))).toThrow();
    expect(inv.place).toEqual({ t: 'arkham', node: 'loc:hospital' });
    expect(inv.items).toHaveLength(0);
  });

  it('charity requires the fewest of a category', () => {
    const g = game([3]);
    const [a, b] = g.state.order.map((id) => g.inv(id));
    a.money = 5;
    b.money = 1;
    a.items = [{ uid: '1', id: 'knife' }];
    b.items = [{ uid: '2', id: 'knife' }, { uid: '3', id: 'knife' }];
    a.spells = [{ uid: 's', id: 'shrivelling' }];
    b.spells = [{ uid: 't', id: 'heal' }];
    expect(g.charityOptions(a).map((o) => o.key)).toEqual(['items']);
    expect(g.charityOptions(b).map((o) => o.key)).toEqual(['money', 'spell']);
  });

  it('flyers move toward the nearest investigator on the streets', () => {
    const g = game([3]);
    const inv = g.inv(g.state.order[0]);
    inv.place = { t: 'arkham', node: 's0' };
    g.inv(g.state.order[1]).place = { t: 'arkham', node: 'loc:hospital' };
    const byakhee = put(g, 'Byakhee', 's8');
    g.moveMonsters();
    const before = distances('s8')['s0'];
    expect(distances(byakhee.node!)['s0']).toBe(Math.max(0, before - 5));
  });
});

/** Drive a flow that may end with an Interrupt; answers by prompt title/kind. */
function play<T>(flow: Flow<T>, answer: (p: Prompt) => Answer) {
  try {
    return drive(flow, answer);
  } catch (e) {
    if (e instanceof Interrupt) return undefined;
    throw e;
  }
}

describe('monster arrows', () => {
  it('asks a player to point a new monster and then follows that street', () => {
    for (const [exit, end] of [['s4', 's3'], ['s0', 's9']] as const) {
      const g = game([3]);
      for (const i of Object.values(g.state.investigators)) i.place = { t: 'arkham', node: 'loc:hospital' };
      g.state.cup = g.state.cup.filter((u) => g.def(g.state.monsters[u]).species === 'Maniac' && g.def(g.state.monsters[u]).hand === 'L');
      const seen: Prompt[] = [];
      const m = drive(g.appear('loc:train_station', null), (p) => {
        seen.push(p);
        return exit;
      })!;
      expect(seen[0].kind).toBe('orient');
      expect(seen[0].nodes?.sort()).toEqual(['s0', 's4']);
      g.moveMonsters();
      expect(m.node, `heading ${exit}`).toBe(end);
    }
  });
});

describe('Bind Monster', () => {
  it('binds a monster that then fights for you and is set free nearby', () => {
    const g = game([1]);
    const inv = g.inv(g.state.order[0]);
    inv.place = { t: 'arkham', node: 's1' };
    inv.spells = [{ uid: 'b', id: 'bind_monster' }];
    const ghoul = put(g, 'Ghoul', 's1');
    drive(g.useUtility(inv, 'u:bind'), (p) => (p.options.some((o) => o.key === 'bind') ? 'bind' : p.options[0].key));
    expect(inv.bound).toBe(ghoul.uid);
    expect(ghoul.node).toBeNull();
    expect(inv.spells).toHaveLength(0);

    const maniac = put(g, 'Maniac', 's1');
    const r = drive(g.attack(inv, { monster: maniac }), (p) => (p.multi ? ['bound'] : p.kind === 'destination' ? 's4' : p.options[0].key));
    expect(r.win).toBe(true);
    expect(inv.bound).toBeNull();
    expect(ghoul.node).toBe('s4');
  });

  it('a bound monster used against a gate goes into the trophy pile', () => {
    const g = game([6]);
    const inv = g.inv(g.state.order[0]);
    const zombie = Object.values(g.state.monsters).find((m) => g.def(m).species === 'Zombie')!;
    g.state.cup = g.state.cup.filter((u) => u !== zombie.uid);
    inv.bound = zombie.uid;
    const gate = Object.values(g.state.gates)[0];
    gate.location = 'woods';
    const r = drive(g.attack(inv, { gate }), (p) => (p.multi ? ['bound'] : p.options[0].key));
    expect(r.win).toBe(true);
    expect(inv.trophies.monsters).toContain(zombie.uid);
  });

  it('a bound monster is physical, except against its own species', () => {
    const g = game([1]);
    const inv = g.inv(g.state.order[0]);
    const ghostA = Object.values(g.state.monsters).find((m) => g.def(m).species === 'Ghost')!;
    g.state.cup = g.state.cup.filter((u) => u !== ghostA.uid);
    inv.bound = ghostA.uid;
    const ghostB = put(g, 'Ghost', 's1');
    const spectre = put(g, 'Formless Spawn', 's1');
    drive(g.attack(inv, { monster: spectre }), (p) => (p.multi ? ['bound'] : p.options[0].key));
    expect(g.state.lastRoll?.label).toContain('total 1'); // only magic harms it: bound ghost is physical
    expect(inv.bound).toBe(ghostA.uid);
    drive(g.attack(inv, { monster: ghostB }), (p) => (p.multi ? ['bound'] : p.kind === 'destination' ? p.options[0].key : p.options[0].key));
    expect(g.state.lastRoll?.label).toContain('total 7'); // ghost vs ghost is magical: 6 + D6(1)
  });
});

describe('Silver Key', () => {
  it('passes to the Dreamlands and back to the marked space', () => {
    const g = game([2]);
    const inv = g.inv(g.state.order[0]);
    inv.place = { t: 'arkham', node: 's22' };
    inv.items = [{ uid: 'k', id: 'silver_key' }];
    play(g.useUtility(inv, 'u:key'), (p) => p.options[0].key);
    expect(inv.place).toMatchObject({ t: 'world', world: 'earths_dreamlands', keyReturn: 's22' });
    expect(inv.silverKey).toBe('s22');
    expect(g.utilityOptions(inv).map((o) => o.key)).toContain('u:keyBack');
    play(g.useUtility(inv, 'u:keyBack'), (p) => p.options[0].key);
    expect(inv.place).toEqual({ t: 'arkham', node: 's22' });
  });

  it('finishing the Dreamlands visit also returns to the key marker', () => {
    const g = game([2]);
    const inv = g.inv(g.state.order[0]);
    inv.place = { t: 'world', world: 'earths_dreamlands', box: 1, gate: null, keyReturn: 's30' };
    drive(g.returnToArkham(inv));
    expect(inv.place).toEqual({ t: 'arkham', node: 's30' });
  });
});

describe('auctions', () => {
  it('accepts items at their cash value and gives change', () => {
    const g = game([3]);
    const [a, b] = g.state.order.map((id) => g.inv(id));
    a.money = 0;
    a.items = [];
    b.money = 1;
    b.items = [{ uid: 'sg', id: 'shotgun' }];
    g.state.itemDeck = ['knife', 'cavalry_saber', 'rifle'];
    drive(g.auction(a), (p) => {
      if (p.kind === 'bid') return p.title.includes('Knife') ? '2' : '3';
      if (p.title.startsWith('Pay $3')) return 'cash';
      return p.options.find((o) => o.ref === 'shotgun')?.key ?? p.options[0].key;
    });
    expect(b.items.map((c) => c.id).sort()).toEqual(['cavalry_saber', 'knife']);
    expect(b.money).toBe(1 + 5 - 3); // shotgun ($7) for a $2 knife: $5 change; saber paid in cash
    expect(a.money).toBe(1 + 1); // half of each sale
  });
});

describe('trading', () => {
  it('swaps cards and money both ways when accepted', () => {
    const g = game([3]);
    const [a, b] = g.state.order.map((id) => g.inv(id));
    a.place = b.place = { t: 'arkham', node: 's1' };
    a.items = [{ uid: 'kn', id: 'knife' }];
    a.spells = [];
    b.items = [];
    b.spells = [{ uid: 'hl', id: 'heal' }];
    a.money = 5;
    b.money = 0;
    drive(g.trade(a), (p) => {
      if (p.multi) return p.inv === a.id ? ['i:kn'] : ['s:hl'];
      if (p.title.includes('add money')) return p.options.find((o) => o.key === '2')?.key ?? '0';
      return p.options[0].key; // accept
    });
    expect(a.items).toHaveLength(0);
    expect(a.spells.map((c) => c.id)).toEqual(['heal']);
    expect(b.items.map((c) => c.id)).toEqual(['knife']);
    expect([a.money, b.money]).toEqual([3, 2]);
  });
});

describe('OPTION: rescue', () => {
  function lostSetup() {
    const g = game([1]);
    g.state.setup.options.rescueLost = true;
    const [lost, hero] = g.state.order.map((id) => g.inv(id));
    lost.place = { t: 'world', world: 'abyss', box: 2, gate: 'x' };
    const gate = Object.values(g.state.gates).find((x) => x.world === 'abyss')!;
    gate.location = 'woods';
    lost.str = 1;
    play(g.lose(lost, 'str', 3), (p) => (p.options.some((o) => o.key === 'wait') ? 'wait' : p.options[0].key));
    return { g, lost, hero };
  }

  it('a lost investigator stays where they fell and can be carried home', () => {
    const { g, lost, hero } = lostSetup();
    expect(lost.stranded).toBe(true);
    expect(lost.out).toBeFalsy();
    hero.place = { t: 'world', world: 'abyss', box: 2, gate: Object.values(g.state.gates).find((x) => x.location === 'woods')!.uid };
    play(g.otherWorldTurn(hero), (p) => p.options[0].key); // carry along (Strength roll succeeds)
    expect(lost.place).toMatchObject({ box: 1 });
    play(g.otherWorldTurn(hero), (p) => p.options[0].key);
    expect(lost.stranded).toBe(false);
    expect(lost.place).toEqual({ t: 'arkham', node: 'loc:hospital' }); // arrived with 0 Strength
    expect(hero.place).toEqual({ t: 'arkham', node: 'loc:woods' });
  });

  it('healing a lost investigator back to health rescues them', () => {
    const { g, lost, hero } = lostSetup();
    hero.place = { t: 'world', world: 'abyss', box: 2, gate: null };
    hero.spells = [{ uid: 'h', id: 'heal' }];
    drive(g.useUtility(hero, 'u:heal'), (p) => (p.options.find((o) => o.key === lost.id)?.key ?? p.options[0].key));
    expect(lost.str).toBe(2);
    expect(lost.stranded).toBe(false);
  });
});

describe('OPTION: carrying limit', () => {
  it('cannot pick up more items than Strength without dropping one', () => {
    const g = game([3]);
    g.state.setup.options.carryLimit = true;
    const inv = g.inv(g.state.order[0]);
    inv.str = 2;
    inv.items = [{ uid: 'a', id: 'knife' }, { uid: 'b', id: 'cavalry_saber' }];
    drive(g.receiveItem(inv, 'rifle'), () => 'leave');
    expect(inv.items.map((c) => c.id)).toEqual(['knife', 'cavalry_saber']);
    drive(g.receiveItem(inv, 'rifle'), () => 'a');
    expect(inv.items.map((c) => c.id)).toEqual(['cavalry_saber', 'rifle']);
  });
});
