// Location Tables — ENG/04 gazette.pdf pages 2–4.
import { fx, type Effect, type LocationId, type TableEntry } from './effects';

export interface LocationDef {
  id: LocationId;
  name: string;
  /** Hound of Tindalos may enter/attack only in buildings. */
  building: boolean;
  /** Items worth more than $1 may be sold here at half list price. */
  buysItems?: boolean;
  /** D6 location table. Absent for Dagon Mission / Hospital / Sanitarium (service-only). */
  table?: TableEntry[];
  /** Fixed procedures offered before/instead of the table (implemented in the engine). */
  services?: { id: string; text: string }[];
}

const { gain, lose, test, draw, buy, monster, gate, sidewalk, jail, stay, ride, none } = fx;
const pay = (n: number, then: Effect[], orElse: Effect[] = [none()]): Effect => ({ k: 'pay', n, then, else: orElse, bargain: true });
const choose = (...options: [string, Effect[]][]): Effect => ({ k: 'choose', options: options.map(([label, f]) => ({ label, fx: f })) });

export const LOCATIONS: Record<LocationId, LocationDef> = {
  black_cave: {
    id: 'black_cave', name: 'Black Cave', building: false,
    table: [
      { roll: [1], text: 'Monster appears.', fx: [monster()] },
      { roll: [2], text: 'In the darkness, happen upon the remains of a previous spelunker. Draw one free item.', fx: [draw('item')] },
      { roll: [3], text: 'You stumble into a pit. With successful strength roll get out now; otherwise stay 2 turns.', fx: [test('str', [], [stay(2)])] },
      { roll: [4], text: 'Cave-in! With successful roll, Sneak to sidewalk or lose 3 points from strength.', fx: [test('sneak', [sidewalk()], [lose('str', 3)])] },
      { roll: [5], text: 'For $5, hire Tom Big-Mountain: take his Local Character card. He adds to your Fight. He may be substituted once for you in defending against a monster attack, but then must be discarded. If no hire or not available, then treat as no encounter.', fx: [{ k: 'localCharacter', id: 'tom_big_mountain', cost: 5 }] },
      { roll: [6], text: 'Gate and monster appear.', fx: [gate()] },
    ],
  },
  boarding_house: {
    id: 'boarding_house', name: 'Boarding House', building: true,
    table: [
      { roll: [1], text: 'Ma Mathison cooks one of her special soup: add 2 strength points.', fx: [gain('str', 2)] },
      { roll: [2], text: 'Sleep well; add 2 sanity points.', fx: [gain('san', 2)] },
      { roll: [3], text: "Ma swears that something's in the basement: if you have a gun, you prowl far enough that Monster Appears; if you have no gun, you catch a mutant rat which you sell for $2.", fx: [{ k: 'if', cond: { c: 'hasGun' }, then: [monster()], else: [gain('money', 2)] }] },
      { roll: [4], text: 'Find item in basement, which Ma sells you for list price.', fx: [buy('item')] },
      { roll: [5], text: 'Asleep, you enter the Dreamlands for one roll on that Gate table, then return to Boarding House.', fx: [{ k: 'visitWorld', world: 'earths_dreamlands' }] },
      { roll: [6], text: 'Chanting neighbors keep you up all night: lose 1 strength point or 1 sanity point, your choice.', fx: [choose(['Lose 1 strength point', [lose('str', 1)]], ['Lose 1 sanity point', [lose('san', 1)]])] },
    ],
  },
  city_hall: {
    id: 'city_hall', name: 'City Hall', building: true,
    table: [
      { roll: [1], text: 'Mail clerk gives you envelope containing letter from Howard Lovecraft praising your prose style: add 1 sanity point.', fx: [gain('san', 1)] },
      { roll: [2], text: 'Mail clerk gives you envelope containing payment from Enigmatics Magazine: $6.', fx: [gain('money', 6)] },
      { roll: [3], text: 'Mail clerk demands $2 for post office box rental: pay now or be moved 1 space to sidewalk.', fx: [pay(2, [], [sidewalk()])] },
      { roll: [4], text: 'Uncle sends you strange package: pay $3 postage and draw 1 item and 1 spell; if no cash, treat as no encounter.', fx: [pay(3, [draw('item'), draw('spell')])] },
      { roll: [5], text: 'Find murdered official: successful Fast Talk roll or spend next turn in jail.', fx: [test('fastTalk', [], [jail()])] },
      { roll: [6], text: 'Find murdered official: take free ride to any Arkham location; decline and be ushered to sidewalk.', fx: [choose(['Take a free ride', [ride('any', true)]], ['Decline', [sidewalk()]])] },
    ],
  },
  curiositie_shoppe: {
    id: 'curiositie_shoppe', name: 'Curiositie Shoppe', building: true, buysItems: true,
    table: [
      { roll: [1], text: 'Accidentally drop 1 item: discard 1 item card. If no items held, roll again on this table until another result occurs.', fx: [{ k: 'if', cond: { c: 'hasItems' }, then: [{ k: 'discard', deck: 'item' }], else: [{ k: 'reroll' }] }] },
      { roll: [2], text: 'Pay $3 for intriguing book: draw 1 spell card. If no sale, treat as no encounter.', fx: [buy('spell', 3)] },
      { roll: [3], text: "A sign sends you to Hib's Roadhouse: move there now and roll on that table or return to the sidewalk.", fx: [choose(["Go to Hib's Roadhouse", [ride('hibs_roadhouse', true)]], ['Return to the sidewalk', [sidewalk()]])] },
      { roll: [4], text: 'The proprietor, Mr. Sykes, offers you one of the following, or treat as no encounter: to buy one item from you for $10; to sell for $1 a tablet adding 2 sanity points immediately.', fx: [{ k: 'choose', options: [
        { label: 'Sell him one item for $10', fx: [{ k: 'sellItemFor', n: 10 }], if: { c: 'hasItems' } },
        { label: 'Buy the tablet for $1 (+2 sanity)', fx: [pay(1, [gain('san', 2)])], if: { c: 'hasMoney', n: 1 } },
        { label: 'No encounter', fx: [none()] },
      ] }] },
      { roll: [5, 6], text: 'Purchase one item for list price. If no sale, treat as no encounter.', fx: [buy('item')] },
    ],
  },
  dagon_mission: {
    id: 'dagon_mission', name: 'Dagon Mission', building: true,
    services: [{ id: 'charity', text: 'The Benevolent Order of Dagon grants you charity if you qualify. In return for the next monster or gate you eliminate, the Order gives you one of the following: $10 in cash, or 2 item cards, or 1 spell card. To qualify for money, you must have no cash or the least cash of any investigator. To qualify for items, you must have no items or the fewest item cards of any investigator. To qualify for a spell, you must have no spells or the fewest number of spell cards which can be used for an attack. To give your next monster or gate to the Order, discard it: do not put it in your trophy stack.' }],
  },
  darks_carnival: {
    id: 'darks_carnival', name: "Dark's Carnival", building: false,
    table: [
      { roll: [1], text: 'Monster appears.', fx: [monster()] },
      { roll: [2], text: 'Atop the Ferris wheel you comprehend the extent of the Mythos menace: lose 1 sanity point.', fx: [lose('san', 1)] },
      { roll: [3], text: 'Little Brooke Beyer holds strange items which she got from her "buzzy singer friends:" You can buy 1 item and 1 spell from her for $5. If no sale, treat as no encounter.', fx: [pay(5, [draw('item'), draw('spell')])] },
      { roll: [4], text: 'Carnival manager Wyatt Dark and his ruffians see you skulking about. Sneak to the sidewalk, or lose 1 strength point and be tossed to the sidewalk.', fx: [test('sneak', [sidewalk()], [lose('str', 1), sidewalk()])] },
      { roll: [5], text: 'Superb hot dogs fortify you: spend $1, add 1 strength point. If no sale, treat as no encounter.', fx: [pay(1, [gain('str', 1)])] },
      { roll: [6], text: 'Gate and monster appear.', fx: [gate()] },
    ],
  },
  devils_beach: {
    id: 'devils_beach', name: "Devil's Beach", building: false,
    table: [
      { roll: [1, 2], text: 'Monster appears.', fx: [monster()] },
      { roll: [3], text: 'Walking along the beach, you see the waves wash something ashore. Draw 1 free item card.', fx: [draw('item')] },
      { roll: [4], text: 'The beach is littered with dead fish, and something else! Lose 1 sanity point and run screaming to the sidewalk.', fx: [lose('san', 1), sidewalk()] },
      { roll: [5], text: 'Abner Weems, besotted and mumbling, stumbles against you and passes out, dropping his book. You read it: draw 1 spell card.', fx: [draw('spell')] },
      { roll: [6], text: 'Gate and monster appear.', fx: [gate()] },
    ],
  },
  founders_rock: {
    id: 'founders_rock', name: "Founder's Rock", building: false,
    table: [
      { roll: [1], text: 'Monster appears.', fx: [monster()] },
      { roll: [2], text: "Touch Founder's Rock: an indefinable terror washes over you. Lose 1 sanity point.", fx: [lose('san', 1)] },
      { roll: [3], text: 'Find a passage in a book which gives you hope: add 1 sanity point.', fx: [gain('san', 1)] },
      { roll: [4], text: 'Buy something from Gypsy caravan: draw 1 item card and pay listed price. If no sale, treat as no encounter.', fx: [buy('item')] },
      { roll: [5], text: 'The fortuneteller screams, "I see you among horrors! Leave me!" Move to sidewalk or go to jail for 1 turn for causing disturbance.', fx: [choose(['Move to the sidewalk', [sidewalk()]], ['Go to jail for 1 turn', [jail()]])] },
      { roll: [6], text: 'Gate and monster appear.', fx: [gate()] },
    ],
  },
  graveyard: {
    id: 'graveyard', name: 'Graveyard', building: false,
    table: [
      { roll: [1], text: 'Monster appears.', fx: [monster()] },
      { roll: [2], text: 'Edifying graveside sermon: you add 1 sanity point.', fx: [gain('san', 1)] },
      { roll: [3], text: "Testifyin' Cooter Falwell latches onto you and rambles about his spiritual achievements. Pay list price for the item he profers, or move to sidewalk for no encounter.", fx: [buy('item', 'list', [sidewalk()])] },
      { roll: [4], text: 'Stumble over headstone; lose 2 strength points.', fx: [lose('str', 2)] },
      { roll: [5], text: 'Find clue while collecting tombstone rubbings: take free move to any Arkham location if you wish; if you refuse, treat as no encounter.', fx: [choose(['Take a free move', [ride('any', true)]], ['Refuse', [none()]])] },
      { roll: [6], text: 'Gate and monster appear.', fx: [gate()] },
    ],
  },
  harney_jones_shack: {
    id: 'harney_jones_shack', name: "Harney Jones' Shack", building: true,
    table: [
      { roll: [1], text: 'Monster appears.', fx: [monster()] },
      { roll: [2], text: 'Harney tells you about the strange goings-on in the Woods. For $2 he sells you the old scroll he found: draw 1 spell card. If you refuse, treat as no encounter.', fx: [buy('spell', 2)] },
      { roll: [3], text: 'Feeling testy, Harney opens fire! Successful Sneak to sidewalk or lose D6 strength points.', fx: [test('sneak', [sidewalk()], [lose('str', 'd6')])] },
      { roll: [4], text: 'Harney gives you a hint about monsters: for the next encounter only, add +1 to your Sneak skill.', fx: [{ k: 'tempSkill', skill: 'sneak', n: 1 }] },
      { roll: [5], text: 'Find Sheldon Gang stash: receive $15 from the bank.', fx: [gain('money', 15)] },
      { roll: [6], text: 'Gate and monster appear.', fx: [gate()] },
    ],
  },
  hibs_roadhouse: {
    id: 'hibs_roadhouse', name: "Hib's Roadhouse", building: true, buysItems: true,
    table: [
      { roll: [1], text: 'Win $6 at poker; lose 1 strength point from cigar smoke.', fx: [gain('money', 6), lose('str', 1)] },
      { roll: [2], text: 'Sheriff Engle squints at you: he bets you all your money, double or nothing. Roll D6: even result you collect from bank; odd result and you give all your money to the bank. Refuse, and treat as no result.', fx: [choose(['Accept the bet', [{ k: 'doubleOrNothing', by: 'd6' }]], ['Refuse', [none()]])] },
      { roll: [3], text: 'Lose $4 at Poker; unable to pay, lose any money and 1 strength point as you bounce to sidewalk.', fx: [{ k: 'if', cond: { c: 'hasMoney', n: 4 }, then: [lose('money', 4)], else: [{ k: 'loseAllMoney' }, lose('str', 1), sidewalk()] }] },
      { roll: [4], text: 'Sheriff Engle takes you to Harney Jones\' shack: "Beat it or go to jail for one turn."', fx: [choose(["Go to Harney Jones' Shack", [ride('harney_jones_shack', true)]], ['Go to jail for one turn', [jail()]])] },
      { roll: [5], text: 'Buy 1 item at list price from bystander, or go to sidewalk and treat as no encounter.', fx: [buy('item', 'list', [sidewalk()])] },
      { roll: [6], text: 'Stranger offers free ride to Silver Twilight Lodge. If you accept, move there now and roll on that location table. Refuse, and treat as no encounter.', fx: [choose(['Accept the ride', [ride('silver_twilight_lodge', true)]], ['Refuse', [none()]])] },
    ],
  },
  historical_society: {
    id: 'historical_society', name: 'Historical Society', building: true,
    table: [
      { roll: [1], text: 'The Society members are bird-watching in the Woods; the janitor offers you a free ride there, or go to the sidewalk outside.', fx: [choose(['Ride to the Woods', [ride('woods', true)]], ['Go to the sidewalk', [sidewalk()]])] },
      { roll: [2], text: 'You meet Cindy Fleming, a young Geology professor at the University. She offers to show you the interesting formations at Black Cave: free ride there now, and roll again on Black Cave location table. If declined, treat as no encounter.', fx: [choose(['Ride to Black Cave', [ride('black_cave', true)]], ['Decline', [none()]])] },
      { roll: [3], text: 'You find a curious old book in an old trunk: draw 1 spell card.', fx: [draw('spell')] },
      { roll: [4], text: "At the Society's Go-Fish fundraiser you catch something: pay list price for item or treat as no encounter.", fx: [buy('item')] },
      { roll: [5], text: 'Snoozing over an old book, you have a nightmare: lose 1 sanity point.', fx: [lose('san', 1)] },
      { roll: [6], text: 'They charge you membership fee of $3; if declining or lacking the cash, go to sidewalk outside.', fx: [pay(3, [], [sidewalk()])] },
    ],
  },
  hospital: {
    id: 'hospital', name: 'Hospital', building: true,
    services: [{ id: 'hospital', text: 'Hospital charges $3 per turn: stay one or more turns, each turn adding D6 strength during step 2. Investigator without money or with inadequate money pays as much as possible, stays one turn, adds D6 strength points.' }],
  },
  lake_miskatonic: {
    id: 'lake_miskatonic', name: 'Lake Miskatonic', building: false,
    table: [
      { roll: [1], text: 'You happen upon strangely mumbling folk. Sneak to sidewalk or they summon a monster.', fx: [test('sneak', [sidewalk()], [monster()])] },
      { roll: [2], text: 'Slip into water: successful strength roll or lose D6 strength points and go to hospital.', fx: [test('str', [], [lose('str', 'd6'), { k: 'hospital' }])] },
      { roll: [3], text: '"Drifter" Hampton shows you a shortcut to Devil\'s Beach. If you accept, move free to there now and roll on that location table. If not, treat as no encounter.', fx: [choose(["Go to Devil's Beach", [ride('devils_beach', true)]], ['Decline', [none()]])] },
      { roll: [4], text: 'Find something: draw 1 item card.', fx: [draw('item')] },
      { roll: [5], text: 'Enjoy a cooling swim: add 1 sanity point.', fx: [gain('san', 1)] },
      { roll: [6], text: 'Gate and monster appear.', fx: [gate()] },
    ],
  },
  library: {
    id: 'library', name: 'Library', building: true,
    table: [
      { roll: [1], text: 'Doze off; enter Dreamlands for one turn, then return.', fx: [{ k: 'visitWorld', world: 'earths_dreamlands', stayTurn: true }] },
      { roll: [2], text: 'Abigail Foreman the librarian helps locate that special book: draw 1 spell card.', fx: [draw('spell')] },
      { roll: [3], text: 'Eureka! Draw 1 spell card. But your cheer is so loud that the librarian ushers you to sidewalk.', fx: [draw('spell'), sidewalk()] },
      { roll: [4], text: 'Commenting that you look hungry, poor dear, Abigail Foreman the librarian takes you to lunch: add 1 strength point or 1 sanity point, your choice.', fx: [choose(['Add 1 strength point', [gain('str', 1)]], ['Add 1 sanity point', [gain('san', 1)]])] },
      { roll: [5], text: 'Find $5 bill used as book mark.', fx: [gain('money', 5)] },
      { roll: [6], text: 'Overdue fines total $4. Pay up or be ejected to sidewalk.', fx: [pay(4, [], [sidewalk()])] },
    ],
  },
  lighthouse: {
    id: 'lighthouse', name: 'Lighthouse', building: true,
    table: [
      { roll: [1, 2], text: 'Monster appears.', fx: [monster()] },
      { roll: [3], text: 'Killing time before his poker game tonight, Art Peabody bets you double-or-nothing for all your cash. Flip a coin: heads you win as much more as you hold, tails you lose all your money. If you decline offer, or lose, go to sidewalk.', fx: [choose(['Accept the bet', [{ k: 'doubleOrNothing', by: 'coin', loseFx: [sidewalk()] }]], ['Decline', [sidewalk()]])] },
      { roll: [4], text: 'Art Peabody offers to sell you his automobile for $30 cash. If you buy, move to any point in Arkham once per turn the rest of the game. If no sale, treat as no encounter.', fx: [{ k: 'special', id: 'automobile' }] },
      { roll: [5], text: 'Find crumbling chart with cryptic notes: draw 1 spell card.', fx: [draw('spell')] },
      { roll: [6], text: 'Gate and monster appear.', fx: [gate()] },
    ],
  },
  miskatonic_u: {
    id: 'miskatonic_u', name: 'Miskatonic University', building: true,
    services: [{ id: 'monograph', text: 'Sell monograph, roll D6: (1-3) sells for $2; (4-5) sells for $5; (6) sells for $10. Service unavailable if you are on retainer.' }],
    table: [
      { roll: [1], text: 'Frat pranksters want to douse you: Sneak to sidewalk or lose next turn changing clothes.', fx: [test('sneak', [sidewalk()], [stay(1)])] },
      { roll: [2, 3], text: 'In the stacks you find an old manuscript: draw 1 spell card.', fx: [draw('spell')] },
      { roll: [4], text: 'Buy 1 item at list price from peddler or go to sidewalk and treat as no encounter.', fx: [buy('item', 'list', [sidewalk()])] },
      { roll: [5, 6], text: "Fast Talk to gain Prof. Harper's backing for investigation: success and you get retainer of $2 per turn. Take retainer card and collect from bank at beginning of each turn. You may not sell reports to Newspaper or to Miskatonic. If no retainer cards available or if you refuse, then no encounter.", fx: [{ k: 'if', cond: { c: 'retainerAvailable' }, then: [choose(['Seek Prof. Harper\'s backing', [test('fastTalk', [{ k: 'retainer' }], [])]], ['Refuse', [none()]])], else: [none()] }] },
    ],
  },
  newspaper: {
    id: 'newspaper', name: 'Newspaper', building: true,
    table: [
      { roll: [1], text: 'Earn $10 for story.', fx: [{ k: 'if', cond: { c: 'onRetainer' }, then: [none()], else: [gain('money', 10)] }] },
      { roll: [2], text: 'Earn $5 for story.', fx: [{ k: 'if', cond: { c: 'onRetainer' }, then: [none()], else: [gain('money', 5)] }] },
      { roll: [3, 4], text: 'Editor George Walker offers you a retainer of $2 per turn in return for all your fascinating stories. Take retainer card and collect from bank at beginning of each turn. You may not sell stories to Newspaper or to Miskatonic U. if you accept. If no retainer cards available, or if you refuse, then no encounter.', fx: [{ k: 'if', cond: { c: 'retainerAvailable' }, then: [choose(['Accept the retainer', [{ k: 'retainer' }]], ['Refuse', [none()]])], else: [none()] }] },
      { roll: [5], text: 'Clue in clipping file gives you 1 free move now to any Arkham location. If you refuse, treat as no encounter.', fx: [choose(['Take the free move', [ride('any', true)]], ['Refuse', [none()]])] },
      { roll: [6], text: 'You buy a subscription for $2 or go back to sidewalk.', fx: [pay(2, [], [sidewalk()])] },
    ],
  },
  north_church: {
    id: 'north_church', name: 'North Church', building: true,
    table: [
      { roll: [1], text: 'Services in progress. Attend and lose next turn and $2, but gain 2 sanity points. Decline and go to sidewalk.', fx: [choose(['Attend services', [stay(1), lose('money', 2), gain('san', 2)]], ['Decline', [sidewalk()]])] },
      { roll: [2], text: 'Testifyin\' Cooter Falwell accosts you for cash for his "ministry." Pay him $3 or be delayed by him and take only D6 for next movement roll.', fx: [{ k: 'pay', n: 3, then: [], else: [{ k: 'nextMove', mode: 'd6' }] }] },
      { roll: [3], text: 'Talk to cleric; add 1 sanity point.', fx: [gain('san', 1)] },
      { roll: [4], text: 'Accept invitation to lunch; add 1 strength point.', fx: [gain('str', 1)] },
      { roll: [5, 6], text: 'See drainspout gargoyle move: successful sanity roll or lose 2 sanity points.', fx: [test('san', [], [lose('san', 2)])] },
    ],
  },
  police_station: {
    id: 'police_station', name: 'Police Station & Jail', building: true,
    services: [{ id: 'jail', text: 'ARRESTED? stay in jail 1 game turn, then leave or stay and take a location event. NOT ARRESTED? roll on events table below.' }],
    table: [
      { roll: [1], text: 'Deputy Barney Dingby gives you a wedge of chocolate cake: add 1 sanity point.', fx: [gain('san', 1)] },
      { roll: [2], text: 'Deputy Dingby accidentally handcuffs you: you lose next turn.', fx: [stay(1)] },
      { roll: [3], text: 'Deputy Dingby absentmindedly leaves his gun with you. Search Items from top down to find next handgun, then shuffle deck; if none are available, go to sidewalk for no encounter.', fx: [{ k: 'special', id: 'findHandgun' }] },
      { roll: [4], text: 'Deputy Dingby gives you a free ride in the squad car: turn on the siren and go anywhere in Arkham now. If you choose not to, treat as no encounter.', fx: [choose(['Ride in the squad car', [ride('any', true)]], ['Stay', [none()]])] },
      { roll: [5], text: "Sheriff Engle asks you to his testimonial banquet. Accept and pay $5 for formal dress rental; refuse and lose next turn explaining to Sheriff, then go to sidewalk.", fx: [{ k: 'pay', n: 5, then: [], else: [stay(1), sidewalk()] }] },
      { roll: [6], text: 'You view the latest victim in the morgue: lose 1 sanity point and go to sidewalk for breath of fresh air.', fx: [lose('san', 1), sidewalk()] },
    ],
  },
  sanitarium: {
    id: 'sanitarium', name: 'Sanitarium', building: true,
    services: [{ id: 'sanitarium', text: 'Sanitarium charges $3 per turn: stay one or more turns, each turn adding D6 sanity during step 2. Investigator without money or with inadequate money pays as much as possible, stays one turn, adds D6 sanity points.' }],
  },
  shunned_house: {
    id: 'shunned_house', name: 'Shunned House', building: true,
    table: [
      { roll: [1], text: 'Monster appears.', fx: [monster()] },
      { roll: [2], text: 'Find mysterious manuscript: draw 1 spell card.', fx: [draw('spell')] },
      { roll: [3], text: 'Hidden in wall, find $10.', fx: [gain('money', 10)] },
      { roll: [4], text: 'Ceiling beam suddenly buckles: successful strength roll and escape to sidewalk or lose 2 strength points.', fx: [test('str', [sidewalk()], [lose('str', 2)])] },
      { roll: [5], text: 'For $5, hire Eric Colt: take his Local Character card. He adds to your Fight. He may be substituted once for you in defending against a monster attack, but then must be discarded. If no hire or not available, then treat as no encounter.', fx: [{ k: 'localCharacter', id: 'eric_colt', cost: 5 }] },
      { roll: [6], text: 'Gate and monster appear.', fx: [gate()] },
    ],
  },
  silver_twilight_lodge: {
    id: 'silver_twilight_lodge', name: 'Silver Twilight Lodge', building: true,
    table: [
      { roll: [1], text: 'Monster appears.', fx: [monster()] },
      { roll: [2], text: 'Carl Stanford asks why you wander beyond public area. His eyes compel you: lose 1 sanity point.', fx: [lose('san', 1)] },
      { roll: [3], text: '"Care to join The Order?" Carl Stanford and his henchmen ask. Accept and pay $3. Refuse and roll your Sneak: success and escape to the sidewalk outside; fail and lose D6 strength.', fx: [{ k: 'choose', options: [
        { label: 'Accept and pay $3', fx: [lose('money', 3)], if: { c: 'hasMoney', n: 3 } },
        { label: 'Refuse (Sneak)', fx: [test('sneak', [sidewalk()], [lose('str', 'd6')])] },
      ] }] },
      { roll: [4], text: 'Carl Stanford and henchmen find you rifling files. Roll Sneak: success, and go to sidewalk outside; fail and be interrogated: forget 1 spell because of anxiety.', fx: [test('sneak', [sidewalk()], [{ k: 'discard', deck: 'spell' }])] },
      { roll: [5], text: 'Find valise containing something: draw 2 free items.', fx: [draw('item', 2)] },
      { roll: [6], text: 'Gate and monster appear.', fx: [gate()] },
    ],
  },
  train_station: {
    id: 'train_station', name: 'Train Station', building: true,
    table: [
      { roll: [1], text: 'Monster appears.', fx: [monster()] },
      { roll: [2], text: 'A stranger in a turban steps off the Boston local: with a crazed smile he offers you a statuette: unless you make a successful Fast Talk to avoid touching the grisly thing, lose 2 strength points when he pushes the idol against you.', fx: [test('fastTalk', [], [lose('str', 2)])] },
      { roll: [3], text: 'Just getting off work, Bill Washington offers you a free ride anywhere in town.', fx: [choose(['Accept the ride', [ride('any', true)]], ['Decline', [none()]])] },
      { roll: [4, 5], text: 'Taxi available: pay $1. Decline, and treat as no encounter.', fx: [pay(1, [ride('any', true)])] },
      { roll: [6], text: 'Pay $3 at Lost-And-Found sale: find 1 item in old valise. Decline, and treat as no encounter.', fx: [buy('item', 3)] },
    ],
  },
  velmas_diner: {
    id: 'velmas_diner', name: "Velma's Diner", building: true,
    table: [
      { roll: [1], text: 'Food poisoning: lose 1 strength point.', fx: [lose('str', 1)] },
      { roll: [2], text: 'The note on the napkin tells you to dig beside the old elm tree: find 1 free item.', fx: [draw('item')] },
      { roll: [3], text: "Velma's coffee is diuretic: add 2 to next movement roll.", fx: [{ k: 'nextMove', mode: 2 }] },
      { roll: [4], text: 'Grease Fire! Make successful Knowledge roll to remember how to fight the fire, or go to sidewalk.', fx: [test('knowledge', [], [sidewalk()])] },
      { roll: [5, 6], text: 'Spend $1: buy special Girl Scout cookies and add 1 strength point. Decline, and treat as no encounter.', fx: [pay(1, [gain('str', 1)])] },
    ],
  },
  woods: {
    id: 'woods', name: 'Woods', building: false,
    table: [
      { roll: [1], text: 'Monster appears.', fx: [monster()] },
      { roll: [2], text: 'The Sheldon Gang, hoodlum hicks, fiercely protect their still. With Sneak roll escape to sidewalk. Fail and fall into concealed pit. With successful strength roll get out immediately; failing, lose next turn.', fx: [test('sneak', [sidewalk()], [test('str', [], [stay(1)])])] },
      { roll: [3], text: 'The Gang shrieks and grunts to scare you off: successful Knowledge roll and add $10 reward as you report them; fail and lose 1 sanity point.', fx: [test('knowledge', [gain('money', 10)], [lose('san', 1)])] },
      { roll: [4], text: "They take your guns and money, then the Gang works you over. You wake next turn at: (roll D6) 1-2, Devil's Beach; 3-4, Lighthouse; 5-6, Lake Miskatonic.", fx: [{ k: 'special', id: 'sheldonBeating' }] },
      { roll: [5], text: 'The Sheldons, awed by your suave wit and unfailing aplomb, drive you anywhere in Arkham, AND give you a gift: draw 1 free item card.', fx: [draw('item'), { k: 'ride', to: 'any', roll: true, forced: true }] },
      { roll: [6], text: 'Gate and monster appear.', fx: [gate()] },
    ],
  },
};

/** Gate Appearance Table (2D6). `extra` marks results that also add a monster to every gated location. */
export type GateTableVariant = 'rules' | 'board';
export const GATE_APPEARANCE: Record<number, LocationId> = {
  2: 'shunned_house', 3: 'darks_carnival', 4: 'lighthouse', 5: 'devils_beach', 6: 'graveyard',
  7: 'founders_rock', 8: 'silver_twilight_lodge', 9: 'woods', 10: 'lake_miskatonic',
  11: 'harney_jones_shack', 12: 'black_cave',
};
/** Rules sheet: only 7. Board print: 4 and 10. */
export const GATE_EXTRA_MONSTER: Record<GateTableVariant, number[]> = {
  rules: [7],
  board: [4, 10],
};
