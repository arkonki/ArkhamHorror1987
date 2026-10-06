import { Card, Monster, OtherWorld, LocationData, StreetNode, OtherWorldId } from '../types/game';

export const GATE_APPEARANCE_TABLE: Record<number, { locationId: string; locationName: string; extraMonsterSpawn?: boolean }> = {
  2: { locationId: 'shunned_house', locationName: 'Shunned House' },
  3: { locationId: 'darks_carnival', locationName: "Dark's Carnival" },
  4: { locationId: 'lighthouse', locationName: 'Lighthouse' },
  5: { locationId: 'devils_beach', locationName: "Devil's Beach" },
  6: { locationId: 'graveyard', locationName: 'Graveyard' },
  7: { locationId: 'founders_rock', locationName: "Founder's Rock", extraMonsterSpawn: true },
  8: { locationId: 'silver_twilight_lodge', locationName: 'Silver Twilight Lodge' },
  9: { locationId: 'woods', locationName: 'Woods' },
  10: { locationId: 'lake_miskatonic', locationName: 'Lake Miskatonic', extraMonsterSpawn: true },
  11: { locationId: 'harney_jones_shack', locationName: "Harney Jones' Shack" },
  12: { locationId: 'black_cave', locationName: 'Black Cave' },
};

export const OTHER_WORLDS: Record<OtherWorldId, OtherWorld> = {
  abyss: {
    id: 'abyss',
    name: 'Abyss',
    color: '#ca8a04', // yellow / amber
    description: 'A terrifying rift in reality plunging into endless pitch-black depths.',
    flavor: 'The stone arch breaks! Will you ever find your way home?',
    table: {
      1: 'The stone arch breaks! Successful strength roll to hold it up until you can get through; fail, and lose D6 strength points.',
      2: 'With a successful Fight roll, you fend off the monstrous mass; without it you are lost: start a new investigator.',
      3: 'A merciless monster attacks you.',
      4: 'You are bewildered: successful Knowledge roll or you remain in this box next turn.',
      5: 'The unending blackness terrifies you; will you never find your way home? Lose 2 sanity points.',
      6: 'You find 1 item.'
    }
  },
  another_dimension: {
    id: 'another_dimension',
    name: 'Another Dimension',
    color: '#dc2626', // red
    description: 'A kaleidoscopic vortex of non-Euclidean angles and warped chronologies.',
    flavor: 'Whorling patterns teach forgotten lore or cast you across the cosmos.',
    table: {
      1: 'From the whorling patterns you learn a spell: draw 1 spell card.',
      2: 'You shift to Celeano. Roll for 1 encounter there, then return to this box next turn.',
      3: 'You shift to R\'lyeh; roll for 1 encounter there, then return to this box next turn.',
      4: 'You are shifted to Arkham, but roll on Gate Appearance table for random Arkham location where you appear, with or without a gate.',
      5: 'A hideous monster attacks you.',
      6: 'The dimensions shift again: you see yourself clearly: gain 1 sanity point.'
    }
  },
  city_of_great_race: {
    id: 'city_of_great_race',
    name: 'City of the Great Race',
    color: '#ea580c', // orange
    description: 'Immense basalt towers of Pnakotus inhabited by the minds of the Yithians.',
    flavor: 'Incomprehensible machines whisper the archives of prehistoric Earth.',
    table: {
      1: 'Amid the incomprehensible artifacts you recognize something: draw 1 item card.',
      2: 'Monsters lurk everywhere. Stay in same box next turn.',
      3: 'A monster stalks you and attacks.',
      4: 'The conical entity teaches you a spell: draw 1 spell card.',
      5: 'The conical entities give up the chase: you lose 2 strength points from exhaustion.',
      6: 'Lose 2 sanity points because of a hideous whistling.'
    }
  },
  earths_dreamlands: {
    id: 'earths_dreamlands',
    name: "Earth's Dreamlands",
    color: '#d97706', // warm golden brown
    description: 'Enchanted forests, talking cats of Ulthar, and the sinister Moonbeasts.',
    flavor: 'Waving goodbye, happy villagers bestow wondrous gifts upon you.',
    table: {
      1: 'The village elder teaches you something. Draw 1 spell card.',
      2: 'The men at the Temple are wise: if any skills cards are not held, draw 1.',
      3: 'A monster springs at you.',
      4: 'Gradually the sly Moonbeast edges you to the gangplank: make Fast Talk roll. Failing, you board the ship and never return: start another investigator.',
      5: 'You encounter the talking cats of Ulthar, who teach you a spell. Draw 1 spell card.',
      6: 'Waving goodbye, the happy villagers bestow a gift. Draw 1 item card.'
    }
  },
  great_hall_of_celeano: {
    id: 'great_hall_of_celeano',
    name: 'Great Hall of Celeano',
    color: '#2563eb', // blue
    description: 'An infinite repository of forbidden cosmic tomes among the Pleiades.',
    flavor: 'Wedged beneath fallen shelves rests an ancient scroll of cosmic power.',
    table: {
      1: 'Successful Fast Talk to convince The Librarian of your importance, or start a new investigator.',
      2: 'A monster attacks from the shadows.',
      3: 'A monster attacks from the shadows.',
      4: 'You find one book small enough to carry: draw 1 spell card.',
      5: 'A vast stirring: successful Sneak roll or lose D6 strength points.',
      6: 'Wedged beneath the fallen shelves is a scroll: draw 1 spell card.'
    }
  },
  plateau_of_leng: {
    id: 'plateau_of_leng',
    name: 'Plateau of Leng',
    color: '#0891b2', // cyan / teal
    description: 'A desolate, frozen wasteland swept by howling wind and ancient ruins.',
    flavor: 'Avalanches crash down from violet mountains where horrors dwell.',
    table: {
      1: 'A lurking monster attacks.',
      2: 'The wind increases, and you feel your feet go numb. Successful strength roll or lose 2 strength points.',
      3: 'Avalanche! Successful strength roll or lose 3 strength points AND successful Fight roll or lose 3 more strength points as well.',
      4: 'You see the mountains move; lose 2 sanity points from terror.',
      5: 'Among the bones you find an old book: draw 1 spell card.',
      6: 'Your peril clears your mind: add 1 sanity point.'
    }
  },
  rlyeh: {
    id: 'rlyeh',
    name: "R'lyeh",
    color: '#16a34a', // emerald green
    description: 'The submerged cyclopean city where Great Cthulhu dreams in death.',
    flavor: 'Alien angles and slime-coated monoliths defy terrestrial geometry.',
    table: {
      1: 'A slimy monster attacks you.',
      2: 'With a successful Knowledge roll, cryptic altar symbols suggest a spell: draw 1 spell card.',
      3: 'Unnerving alien angles: lose 2 sanity points.',
      4: 'Hurricane winds smash you against cyclopean stones: successful strength roll or lose 3 strength points.',
      5: 'That night the stars change; the brazen temple doors open; a vast black corpulence comes forth: lose D6 sanity.',
      6: 'A rotten sea chest: from it draw 1 item.'
    }
  },
  yuggoth: {
    id: 'yuggoth',
    name: 'Yuggoth',
    color: '#7c3aed', // purple / violet
    description: 'The dark rim world of Pluto where the fungoid Mi-Go extract human brains.',
    flavor: 'The cylindered head mocks your hopes with metallic buzzing echoes.',
    table: {
      1: 'Fear grabs you as the buzzing entities approach: fail sanity roll and lose 1 sanity point.',
      2: 'The cylindered head mocks your hopes: "You\'ll never return," it cackles. Lose 2 sanity points from despair.',
      3: 'Exposure and fear weaken your mind: discard 1 spell card or lose 2 sanity points.',
      4: 'You\'re dizzy from the strange ray: make a successful strength roll or lose 1 item card.',
      5: 'You find a book: draw 1 spell card.',
      6: 'The pinkish rays nearly get you: successful Sneak roll or lose 2 strength points.'
    }
  }
};

export const LOCATIONS_DATA: Record<string, LocationData> = {
  train_station: {
    id: 'train_station',
    name: 'Train Station',
    description: 'North entrance to Arkham where Boston express trains arrive.',
    pointerNodeId: 'node_train_station',
    x: 540,
    y: 295,
    events: {
      1: { roll: 1, text: 'A monster appears on the platform!', type: 'monster', reward: { monsterSpawn: true } },
      2: { roll: 2, text: 'A stranger in a turban steps off the Boston local with a crazed smile, offering a statue: make Fast Talk roll to avoid touching it, or lose 2 strength points when he pushes it against you.', type: 'choice' },
      3: { roll: 3, text: 'Just getting off work, Bill Washington offers you a free ride anywhere in town.', type: 'teleport' },
      4: { roll: 4, text: 'Taxi available: pay $1 for quick transit, or decline.', type: 'choice' },
      5: { roll: 5, text: 'Taxi available: pay $1 for quick transit, or decline.', type: 'choice' },
      6: { roll: 6, text: 'Lost-And-Found sale: pay $3 to claim an abandoned valise containing an item!', type: 'choice', reward: { itemsCount: 1 } },
    }
  },
  harney_jones_shack: {
    id: 'harney_jones_shack',
    name: "Harney Jones' Shack",
    description: 'A ramshackle hut near the woods where old Harney hides his secrets.',
    pointerNodeId: 'node_harney_shack',
    x: 320,
    y: 330,
    events: {
      1: { roll: 1, text: 'A monster appears from behind the woodpile!', type: 'monster', reward: { monsterSpawn: true } },
      2: { roll: 2, text: 'Harney tells you about strange goings-on in the Woods. For $2 he sells you an old scroll: draw 1 spell card.', type: 'choice', reward: { spellsCount: 1 } },
      3: { roll: 3, text: 'Feeling testy, Harney opens fire! Successful Sneak to sidewalk or lose D6 strength.', type: 'choice' },
      4: { roll: 4, text: 'Harney gives you a keen hint about hunting monsters: +1 to your Sneak skill!', type: 'stat' },
      5: { roll: 5, text: 'You discover the Sheldon Gang stash in the floorboards: receive $15 from the bank!', type: 'money', reward: { money: 15 } },
      6: { roll: 6, text: 'A dimensional gate and a monster appear in the shack!', type: 'gate', reward: { gateSpawn: true, monsterSpawn: true } },
    }
  },
  black_cave: {
    id: 'black_cave',
    name: 'Black Cave',
    description: 'A cavernous grotto descending deep into subterranean horrors.',
    pointerNodeId: 'node_black_cave',
    x: 775,
    y: 325,
    events: {
      1: { roll: 1, text: 'A monster crawls out from the dark fissures!', type: 'monster', reward: { monsterSpawn: true } },
      2: { roll: 2, text: 'In the darkness you happen upon the remains of a previous spelunker: draw 1 free item card!', type: 'item', reward: { itemsCount: 1 } },
      3: { roll: 3, text: 'You stumble into a pit! Successful strength roll gets out; otherwise stay trapped for 2 turns.', type: 'choice' },
      4: { roll: 4, text: 'Cave-In! With successful roll, Sneak to sidewalk or lose 3 points from strength.', type: 'choice' },
      5: { roll: 5, text: 'For $5, hire Tom Big-Mountain: he adds +2 to your Fight skill and can defend against monsters!', type: 'choice' },
      6: { roll: 6, text: 'A dimensional gate and a monster appear from the depths!', type: 'gate', reward: { gateSpawn: true, monsterSpawn: true } },
    }
  },
  woods: {
    id: 'woods',
    name: 'Woods',
    description: 'Dense, shadowed pine woods on the outskirts of Arkham.',
    pointerNodeId: 'node_woods',
    x: 480,
    y: 450,
    events: {
      1: { roll: 1, text: 'A monster stalks through the trees!', type: 'monster', reward: { monsterSpawn: true } },
      2: { roll: 2, text: 'The Sheldon Gang protect their still! Sneak to sidewalk or fall into a concealed pit (Strength roll to escape and find $10, or lose 1 sanity).', type: 'choice' },
      3: { roll: 3, text: 'The Gang shrieks and grunts to scare you off: successful Knowledge roll grants $10 as you report them; fail and lose 1 sanity.', type: 'choice' },
      4: { roll: 4, text: 'The gang takes your guns and money! You awaken next turn stranded across town.', type: 'special' },
      5: { roll: 5, text: 'The Sheldons are awed by your suave wit: draw 1 free item card.', type: 'item', reward: { itemsCount: 1 } },
      6: { roll: 6, text: 'A dimensional gate and a monster tear open the woods!', type: 'gate', reward: { gateSpawn: true, monsterSpawn: true } },
    }
  },
  shunned_house: {
    id: 'shunned_house',
    name: 'Shunned House',
    description: 'An abandoned manor coated in noxious fungus and dark rumors.',
    pointerNodeId: 'node_shunned_house',
    x: 585,
    y: 430,
    events: {
      1: { roll: 1, text: 'A foul monster bursts from the moldy floor!', type: 'monster', reward: { monsterSpawn: true } },
      2: { roll: 2, text: 'You find a mysterious manuscript in the study: draw 1 spell card.', type: 'spell', reward: { spellsCount: 1 } },
      3: { roll: 3, text: 'Hidden in the wall, you find $10 in vintage bills!', type: 'money', reward: { money: 10 } },
      4: { roll: 4, text: 'The ceiling suddenly buckles! Successful strength roll to escape to sidewalk or lose 2 strength points.', type: 'choice' },
      5: { roll: 5, text: 'For $5, hire Eric Colt: adds +2 to your Fight and can sacrifice for you.', type: 'choice' },
      6: { roll: 6, text: 'A dimensional gate and monster erupt from the basement!', type: 'gate', reward: { gateSpawn: true, monsterSpawn: true } },
    }
  },
  north_church: {
    id: 'north_church',
    name: 'North Church',
    description: 'The ancient stone belfry whose bell tolls through the foggy nights.',
    pointerNodeId: 'node_north_church',
    x: 700,
    y: 470,
    events: {
      1: { roll: 1, text: 'Services in progress. Attend: spend $2 and lose next turn, but gain 2 sanity points.', type: 'choice', reward: { sanity: 2 } },
      2: { roll: 2, text: 'Testifyin\' Cooter Falwell accosts you for $3 ministry money or delays you (roll only D6 for next move).', type: 'choice' },
      3: { roll: 3, text: 'Talk to the kindly cleric: add 1 sanity point.', type: 'stat', reward: { sanity: 1 } },
      4: { roll: 4, text: 'Accept the rector\'s invitation to lunch: add 1 strength point.', type: 'stat', reward: { strength: 1 } },
      5: { roll: 5, text: 'The drainspout gargoyle moves! Successful sanity roll or lose 2 sanity points.', type: 'choice' },
      6: { roll: 6, text: 'The drainspout gargoyle moves! Successful sanity roll or lose 2 sanity points.', type: 'choice' },
    }
  },
  silver_twilight_lodge: {
    id: 'silver_twilight_lodge',
    name: 'Silver Twilight Lodge',
    description: 'Mansion headquarters of the secretive hermetic brotherhood.',
    pointerNodeId: 'node_lodge',
    x: 885,
    y: 355,
    events: {
      1: { roll: 1, text: 'A monster summoned by the lodge appears!', type: 'monster', reward: { monsterSpawn: true } },
      2: { roll: 2, text: 'Carl Stanford asks why you wander. His piercing eyes compel you: lose 1 sanity point.', type: 'stat', reward: { sanity: -1 } },
      3: { roll: 3, text: '"Care to join The Order?" accept and pay $3, or refuse and make Sneak roll to escape safely.', type: 'choice' },
      4: { roll: 4, text: 'Caught rifling files! Sneak to escape, or lose 1 spell card to interrogation.', type: 'choice' },
      5: { roll: 5, text: 'Find a valise containing arcane gear: draw 2 free items!', type: 'item', reward: { itemsCount: 2 } },
      6: { roll: 6, text: 'A dimensional gate and a monster appear in the ceremonial chamber!', type: 'gate', reward: { gateSpawn: true, monsterSpawn: true } },
    }
  },
  lake_miskatonic: {
    id: 'lake_miskatonic',
    name: 'Lake Miskatonic',
    description: 'Fog-shrouded waters fed by the dark Miskatonic river.',
    pointerNodeId: 'node_lake_miskatonic',
    x: 810,
    y: 425,
    events: {
      1: { roll: 1, text: 'Mumbling cultists chant by the shore! Sneak to sidewalk or summon a monster.', type: 'choice' },
      2: { roll: 2, text: 'Slip into the icy water: successful strength roll or lose D6 strength and go to hospital.', type: 'choice' },
      3: { roll: 3, text: '"Drifter" Hampton shows you a hidden shortcut to Devil\'s Beach: free ride there and roll!', type: 'teleport' },
      4: { roll: 4, text: 'You dredge up an item from the murky depths: draw 1 item card.', type: 'item', reward: { itemsCount: 1 } },
      5: { roll: 5, text: 'Enjoy a peaceful swim under the willow trees: add 1 sanity point.', type: 'stat', reward: { sanity: 1 } },
      6: { roll: 6, text: 'A dimensional gate and a monster break through the waters!', type: 'gate', reward: { gateSpawn: true, monsterSpawn: true } },
    }
  },
  miskatonic_university: {
    id: 'miskatonic_university',
    name: 'Miskatonic University',
    description: 'The famed university known for occult sciences and the Orne Library.',
    pointerNodeId: 'node_university',
    x: 770,
    y: 535,
    events: {
      1: { roll: 1, text: 'Frat pranksters douse you with cold water: Sneak to sidewalk or lose next turn drying clothes.', type: 'choice' },
      2: { roll: 2, text: 'In the restricted stacks you discover an ancient grimoire: draw 1 spell card.', type: 'spell', reward: { spellsCount: 1 } },
      3: { roll: 3, text: 'In the restricted stacks you discover an ancient grimoire: draw 1 spell card.', type: 'spell', reward: { spellsCount: 1 } },
      4: { roll: 4, text: 'A peddler offers an occult curiosity: buy 1 item at list price, or go to sidewalk.', type: 'choice' },
      5: { roll: 5, text: 'Fast Talk Prof. Harper for backing: gain a Retainer card! Collect $2 at the start of each turn.', type: 'retainer', reward: { retainer: true } },
      6: { roll: 6, text: 'Fast Talk Prof. Harper for backing: gain a Retainer card! Collect $2 at the start of each turn.', type: 'retainer', reward: { retainer: true } },
    }
  },
  graveyard: {
    id: 'graveyard',
    name: 'Graveyard',
    description: 'Old Christchurch cemetery where the dead do not always rest.',
    pointerNodeId: 'node_graveyard',
    x: 325,
    y: 580,
    events: {
      1: { roll: 1, text: 'A ghastly monster claws out of a mausoleum!', type: 'monster', reward: { monsterSpawn: true } },
      2: { roll: 2, text: 'Edifying graveside sermon by a visiting pastor: add 1 sanity point.', type: 'stat', reward: { sanity: 1 } },
      3: { roll: 3, text: 'Testifyin\' Cooter Falwell offers an item at list price, or move to sidewalk.', type: 'choice' },
      4: { roll: 4, text: 'Stumble over a sunken headstone in the dark: lose 2 strength points.', type: 'stat', reward: { strength: -2 } },
      5: { roll: 5, text: 'Tombstone rubbings give historical clues: free move to any Arkham location!', type: 'teleport' },
      6: { roll: 6, text: 'A dimensional gate opens among the sepulchers!', type: 'gate', reward: { gateSpawn: true, monsterSpawn: true } },
    }
  },
  city_hall: {
    id: 'city_hall',
    name: 'City Hall',
    description: 'The neoclassical seat of Arkham city administration and public records.',
    pointerNodeId: 'node_city_hall',
    x: 585,
    y: 590,
    events: {
      1: { roll: 1, text: 'The mail clerk delivers a letter from Howard Lovecraft praising your prose: add 1 sanity point.', type: 'stat', reward: { sanity: 1 } },
      2: { roll: 2, text: 'Payment from Enigmatics Magazine arrives: collect $6 cash!', type: 'money', reward: { money: 6 } },
      3: { roll: 3, text: 'Mail clerk demands $2 for post office box rental: pay or move to sidewalk.', type: 'choice' },
      4: { roll: 4, text: 'Uncle sends a strange package: pay $3 postage to draw 1 item and 1 spell card!', type: 'choice', reward: { itemsCount: 1, spellsCount: 1 } },
      5: { roll: 5, text: 'You stumble into a crime scene: make Fast Talk roll or spend next turn in jail!', type: 'choice' },
      6: { roll: 6, text: 'City chauffeur offers a free ride in the mayoral automobile to any Arkham location.', type: 'teleport' },
    }
  },
  police_station: {
    id: 'police_station',
    name: 'Police Station & Jail',
    description: 'Headquarters of Sheriff Engle and Deputy Barney Dingby.',
    pointerNodeId: 'node_police_station',
    x: 600,
    y: 690,
    events: {
      1: { roll: 1, text: 'Deputy Barney Dingby shares chocolate cake: add 1 sanity point.', type: 'stat', reward: { sanity: 1 } },
      2: { roll: 2, text: 'Deputy Dingby accidentally handcuffs you to a radiator: lose your next turn.', type: 'choice' },
      3: { roll: 3, text: 'Dingby leaves his gun on the desk: draw the next handgun from the items deck!', type: 'item', reward: { itemsCount: 1 } },
      4: { roll: 4, text: 'Dingby gives you a ride in the squad car with sirens blazing: go anywhere in Arkham!', type: 'teleport' },
      5: { roll: 5, text: 'Sheriff Engle asks you to a banquet: pay $5 for dress rental or lose next turn.', type: 'choice' },
      6: { roll: 6, text: 'You view a grisly victim in the morgue: lose 1 sanity point and exit to sidewalk.', type: 'stat', reward: { sanity: -1 } },
    }
  },
  boarding_house: {
    id: 'boarding_house',
    name: 'Boarding House',
    description: "Ma Mathison's comfortable lodgings for travelers and scholars.",
    pointerNodeId: 'node_boarding_house',
    x: 690,
    y: 630,
    events: {
      1: { roll: 1, text: "Ma Mathison cooks her special hearty soup: add 2 strength points!", type: 'stat', reward: { strength: 2 } },
      2: { roll: 2, text: 'Sleep like a log in a featherbed: add 2 sanity points!', type: 'stat', reward: { sanity: 2 } },
      3: { roll: 3, text: 'Ma hears a scuffle in the cellar: if you have a gun, exterminate a mutant rat sold for $2!', type: 'choice' },
      4: { roll: 4, text: 'Found an item in the attic: Ma sells it to you at list price.', type: 'choice' },
      5: { roll: 5, text: "Asleep, your mind slips into Earth's Dreamlands: roll on Gate table, then return here.", type: 'special' },
      6: { roll: 6, text: 'Unearthly chanting next door keeps you up all night: lose 1 strength or 1 sanity point.', type: 'choice' },
    }
  },
  founders_rock: {
    id: 'founders_rock',
    name: "Founder's Rock",
    description: 'An ancient pre-colonial megalith surrounded by arcane runes.',
    pointerNodeId: 'node_founders_rock',
    x: 740,
    y: 735,
    events: {
      1: { roll: 1, text: 'A monster slithers from the cracks of Founder\'s Rock!', type: 'monster', reward: { monsterSpawn: true } },
      2: { roll: 2, text: 'Touching the rock fills your mind with cosmic horror: lose 1 sanity point.', type: 'stat', reward: { sanity: -1 } },
      3: { roll: 3, text: 'A scholar left an occult diary here: add 1 sanity point.', type: 'stat', reward: { sanity: 1 } },
      4: { roll: 4, text: 'Gypsy caravan passing by: buy an item from their cart at list price.', type: 'choice' },
      5: { roll: 5, text: 'The crazed fortuneteller screams: "Leave me!" Move to sidewalk or go to jail for 1 turn.', type: 'choice' },
      6: { roll: 6, text: 'A dimensional gate and a monster erupt from the monolith!', type: 'gate', reward: { gateSpawn: true, monsterSpawn: true } },
    }
  },
  hibs_roadhouse: {
    id: 'hibs_roadhouse',
    name: "Hib's Roadhouse",
    description: 'A rowdy speakeasy and motel on the outskirts of town.',
    pointerNodeId: 'node_hibs_roadhouse',
    x: 885,
    y: 675,
    events: {
      1: { roll: 1, text: 'Win $6 in a late-night poker game, but lose 1 strength from foul cigar smoke.', type: 'money', reward: { money: 6, strength: -1 } },
      2: { roll: 2, text: 'Sheriff Engle bets you all your cash: double or nothing on a coin flip!', type: 'choice' },
      3: { roll: 3, text: 'Lose $4 in poker; thrown out onto sidewalk, lose 1 strength point.', type: 'choice' },
      4: { roll: 4, text: 'Sheriff runs you out: "Beat it or go to jail for one turn!"', type: 'choice' },
      5: { roll: 5, text: 'Buy an item from a shady bystander at list price, or go to sidewalk.', type: 'choice' },
      6: { roll: 6, text: 'A stranger offers a ride to Silver Twilight Lodge: move there and roll on its table!', type: 'teleport' },
    }
  },
  curiositie_shoppe: {
    id: 'curiositie_shoppe',
    name: 'Curiositie Shoppe',
    description: 'Ezekiel Sykes\' shop of oddities, relics, and ancient antiquities.',
    pointerNodeId: 'node_curiositie_shoppe',
    x: 805,
    y: 835,
    events: {
      1: { roll: 1, text: 'You accidentally drop a fragile item: discard 1 item from inventory.', type: 'choice' },
      2: { roll: 2, text: 'Pay $3 for an intriguing grimoire: draw 1 spell card!', type: 'choice', reward: { spellsCount: 1 } },
      3: { roll: 3, text: 'A billboard points to Hib\'s Roadhouse: move there now and roll on that table!', type: 'teleport' },
      4: { roll: 4, text: 'Mr. Sykes offers: buy an item for $10, or buy herbal tablets for $1 restoring 2 sanity.', type: 'choice' },
      5: { roll: 5, text: 'Browse the rare stock: purchase one item for list price.', type: 'choice' },
      6: { roll: 6, text: 'Browse the rare stock: purchase one item for list price.', type: 'choice' },
    }
  },
  lighthouse: {
    id: 'lighthouse',
    name: 'Lighthouse',
    description: 'Guiding beacon on the craggy coast overlooking the dark sea.',
    pointerNodeId: 'node_lighthouse',
    x: 900,
    y: 850,
    events: {
      1: { roll: 1, text: 'A monster crawls up the cliffs toward the beacon!', type: 'monster', reward: { monsterSpawn: true } },
      2: { roll: 2, text: 'A monster crawls up the cliffs toward the beacon!', type: 'monster', reward: { monsterSpawn: true } },
      3: { roll: 3, text: 'Art Peabody bets double-or-nothing on poker for all your money.', type: 'choice' },
      4: { roll: 4, text: 'Art Peabody offers to sell his sturdy automobile for $30 cash (move anywhere once per turn)!', type: 'choice' },
      5: { roll: 5, text: 'Find a crumbling nautical chart with cryptic occult notes: draw 1 spell card.', type: 'spell', reward: { spellsCount: 1 } },
      6: { roll: 6, text: 'A dimensional gate and a monster break through the lantern room!', type: 'gate', reward: { gateSpawn: true, monsterSpawn: true } },
    }
  },
  hospital: {
    id: 'hospital',
    name: 'St. Mary\'s Hospital',
    description: 'Medical staff treat injuries and exhaustion for $3 per turn.',
    pointerNodeId: 'node_hospital',
    x: 375,
    y: 690,
    events: {
      1: { roll: 1, text: 'Hospital care: pay $3 to heal D6 strength points (or heal D6 if destitute).', type: 'heal', reward: { strength: 3 } },
      2: { roll: 2, text: 'Hospital care: pay $3 to heal D6 strength points (or heal D6 if destitute).', type: 'heal', reward: { strength: 3 } },
      3: { roll: 3, text: 'Hospital care: pay $3 to heal D6 strength points (or heal D6 if destitute).', type: 'heal', reward: { strength: 3 } },
      4: { roll: 4, text: 'Hospital care: pay $3 to heal D6 strength points (or heal D6 if destitute).', type: 'heal', reward: { strength: 3 } },
      5: { roll: 5, text: 'Hospital care: pay $3 to heal D6 strength points (or heal D6 if destitute).', type: 'heal', reward: { strength: 3 } },
      6: { roll: 6, text: 'Hospital care: pay $3 to heal D6 strength points (or heal D6 if destitute).', type: 'heal', reward: { strength: 3 } },
    }
  },
  sanitarium: {
    id: 'sanitarium',
    name: 'Arkham Sanitarium',
    description: 'Alienists treat madness and psychiatric trauma for $3 per turn.',
    pointerNodeId: 'node_sanitarium',
    x: 480,
    y: 690,
    events: {
      1: { roll: 1, text: 'Sanitarium therapy: pay $3 to restore D6 sanity points (or restore D6 if destitute).', type: 'heal', reward: { sanity: 3 } },
      2: { roll: 2, text: 'Sanitarium therapy: pay $3 to restore D6 sanity points (or restore D6 if destitute).', type: 'heal', reward: { sanity: 3 } },
      3: { roll: 3, text: 'Sanitarium therapy: pay $3 to restore D6 sanity points (or restore D6 if destitute).', type: 'heal', reward: { sanity: 3 } },
      4: { roll: 4, text: 'Sanitarium therapy: pay $3 to restore D6 sanity points (or restore D6 if destitute).', type: 'heal', reward: { sanity: 3 } },
      5: { roll: 5, text: 'Sanitarium therapy: pay $3 to restore D6 sanity points (or restore D6 if destitute).', type: 'heal', reward: { sanity: 3 } },
      6: { roll: 6, text: 'Sanitarium therapy: pay $3 to restore D6 sanity points (or restore D6 if destitute).', type: 'heal', reward: { sanity: 3 } },
    }
  },
  newspaper: {
    id: 'newspaper',
    name: 'Arkham Gazette Newspaper',
    description: 'Editor George Walker\'s printing press and news archives.',
    pointerNodeId: 'node_newspaper',
    x: 275,
    y: 690,
    events: {
      1: { roll: 1, text: 'Earn $10 for your investigative story!', type: 'money', reward: { money: 10 } },
      2: { roll: 2, text: 'Earn $5 for your reporting on unusual local events.', type: 'money', reward: { money: 5 } },
      3: { roll: 3, text: 'Editor George Walker offers a Retainer of $2 per turn for all your sensational stories!', type: 'retainer', reward: { retainer: true } },
      4: { roll: 4, text: 'Editor George Walker offers a Retainer of $2 per turn for all your sensational stories!', type: 'retainer', reward: { retainer: true } },
      5: { roll: 5, text: 'A lead in the clipping file gives 1 free move right now to any Arkham location.', type: 'teleport' },
      6: { roll: 6, text: 'Buy a newspaper subscription for $2 or return to sidewalk.', type: 'choice' },
    }
  },
  library: {
    id: 'library',
    name: 'Arkham Public Library',
    description: 'Quiet aisles of genealogical records and historical lore.',
    pointerNodeId: 'node_library',
    x: 290,
    y: 840,
    events: {
      1: { roll: 1, text: 'Doze off in a leather chair: enter Earth\'s Dreamlands for 1 turn, then return.', type: 'special' },
      2: { roll: 2, text: 'Abigail Foreman the librarian retrieves a special arcane book: draw 1 spell card.', type: 'spell', reward: { spellsCount: 1 } },
      3: { roll: 3, text: 'Eureka! Draw 1 spell card, but your joyous cheer causes you to be escorted to sidewalk.', type: 'spell', reward: { spellsCount: 1 } },
      4: { roll: 4, text: 'Abigail takes you to lunch: add 1 strength point or 1 sanity point (your choice).', type: 'choice', reward: { sanity: 1 } },
      5: { roll: 5, text: 'You find a crisp $5 bill tucked into an old dictionary as a bookmark!', type: 'money', reward: { money: 5 } },
      6: { roll: 6, text: 'Overdue book fines total $4: pay up or be ejected to sidewalk.', type: 'choice' },
    }
  },
  devils_beach: {
    id: 'devils_beach',
    name: "Devil's Beach",
    description: 'A gloomy gravel coast swept by cold waves and rotting kelp.',
    pointerNodeId: 'node_devils_beach',
    x: 375,
    y: 885,
    events: {
      1: { roll: 1, text: 'A monster crawls up from the tide!', type: 'monster', reward: { monsterSpawn: true } },
      2: { roll: 2, text: 'A monster crawls up from the tide!', type: 'monster', reward: { monsterSpawn: true } },
      3: { roll: 3, text: 'Washed ashore in the surf: draw 1 free item card!', type: 'item', reward: { itemsCount: 1 } },
      4: { roll: 4, text: 'The beach is littered with dead fish and a hideous carcass: lose 1 sanity and run to sidewalk.', type: 'stat', reward: { sanity: -1 } },
      5: { roll: 5, text: 'Abner Weems, intoxicated, stumbles into you and drops a book: draw 1 spell card.', type: 'spell', reward: { spellsCount: 1 } },
      6: { roll: 6, text: 'A dimensional gate and a monster erupt from the sea foam!', type: 'gate', reward: { gateSpawn: true, monsterSpawn: true } },
    }
  },
  historical_society: {
    id: 'historical_society',
    name: 'Historical Society',
    description: 'Archives of Arkham founders and early Puritan relics.',
    pointerNodeId: 'node_historical_society',
    x: 430,
    y: 865,
    events: {
      1: { roll: 1, text: 'Janitor offers a ride to the Woods or to the sidewalk.', type: 'teleport' },
      2: { roll: 2, text: 'Geology prof Cindy Fleming offers to show Black Cave: free ride there and roll on its table!', type: 'teleport' },
      3: { roll: 3, text: 'Curious leatherbound tome discovered in an attic trunk: draw 1 spell card.', type: 'spell', reward: { spellsCount: 1 } },
      4: { roll: 4, text: 'Society Go-Fish fundraiser: buy an item at list price.', type: 'choice' },
      5: { roll: 5, text: 'Nightmarish vision over an ancient journal: lose 1 sanity point.', type: 'stat', reward: { sanity: -1 } },
      6: { roll: 6, text: 'Membership dues of $3 requested; decline and return to sidewalk.', type: 'choice' },
    }
  },
  dagon_mission: {
    id: 'dagon_mission',
    name: 'Dagon Mission',
    description: 'Charitable chapel of the Esoteric Order of Dagon offering aid to the destitute.',
    pointerNodeId: 'node_dagon_mission',
    x: 520,
    y: 865,
    events: {
      1: { roll: 1, text: 'The Order of Dagon offers charity to those in true need ($10, 2 items, or 1 spell). Repay by defeating a monster or closing a gate!', type: 'choice' },
      2: { roll: 2, text: 'The Order of Dagon offers charity to those in true need ($10, 2 items, or 1 spell). Repay by defeating a monster or closing a gate!', type: 'choice' },
      3: { roll: 3, text: 'The Order of Dagon offers charity to those in true need ($10, 2 items, or 1 spell). Repay by defeating a monster or closing a gate!', type: 'choice' },
      4: { roll: 4, text: 'The Order of Dagon offers charity to those in true need ($10, 2 items, or 1 spell). Repay by defeating a monster or closing a gate!', type: 'choice' },
      5: { roll: 5, text: 'The Order of Dagon offers charity to those in true need ($10, 2 items, or 1 spell). Repay by defeating a monster or closing a gate!', type: 'choice' },
      6: { roll: 6, text: 'The Order of Dagon offers charity to those in true need ($10, 2 items, or 1 spell). Repay by defeating a monster or closing a gate!', type: 'choice' },
    }
  },
  velmas_diner: {
    id: 'velmas_diner',
    name: "Velma's Diner",
    description: '24-hour greasy spoon serving black coffee and hot pies.',
    pointerNodeId: 'node_velmas_diner',
    x: 565,
    y: 730,
    events: {
      1: { roll: 1, text: 'Food poisoning from the clam chowder: lose 1 strength point.', type: 'stat', reward: { strength: -1 } },
      2: { roll: 2, text: 'Cryptic note scrawled on a napkin points to buried treasure by the old elm: draw 1 free item card!', type: 'item', reward: { itemsCount: 1 } },
      3: { roll: 3, text: 'Velma\'s potent coffee gives you tremendous energy: add +2 to your next movement roll!', type: 'special' },
      4: { roll: 4, text: 'Grease fire in the kitchen! Knowledge roll to extinguish it or hurry out to sidewalk.', type: 'choice' },
      5: { roll: 5, text: 'Spend $1 on fresh Girl Scout cookies: add 1 strength point.', type: 'stat', reward: { strength: 1 } },
      6: { roll: 6, text: 'Spend $1 on fresh Girl Scout cookies: add 1 strength point.', type: 'stat', reward: { strength: 1 } },
    }
  },
  darks_carnival: {
    id: 'darks_carnival',
    name: "Dark's Carnival",
    description: 'A traveling carnival of tents, freak shows, and a creaking ferris wheel.',
    pointerNodeId: 'node_darks_carnival',
    x: 605,
    y: 865,
    events: {
      1: { roll: 1, text: 'A monster emerges from the House of Mirrors!', type: 'monster', reward: { monsterSpawn: true } },
      2: { roll: 2, text: 'Atop the Ferris Wheel you glimpse the immense Mythos darkness over Arkham: lose 1 sanity point.', type: 'stat', reward: { sanity: -1 } },
      3: { roll: 3, text: 'Little Brooke Beyer sells strange trinkets: pay $5 for 1 item and 1 spell card.', type: 'choice', reward: { itemsCount: 1, spellsCount: 1 } },
      4: { roll: 4, text: 'Carnival ruffians toss you to the sidewalk!', type: 'special' },
      5: { roll: 5, text: 'Superb hot dogs: spend $1, add 1 strength point.', type: 'stat', reward: { strength: 1 } },
      6: { roll: 6, text: 'A dimensional gate and a monster break through behind the big top!', type: 'gate', reward: { gateSpawn: true, monsterSpawn: true } },
    }
  }
};

export const STREET_NODES: Record<string, StreetNode> = {
  // Taxi Stands (Large yellow circular stands)
  taxi_west: { id: 'taxi_west', name: 'West Taxi Stand', x: 230, y: 460, connectedTo: ['st_nw_1', 'st_w_1'], isTaxiStand: true },
  taxi_south: { id: 'taxi_south', name: 'South Taxi Stand', x: 475, y: 865, connectedTo: ['st_s_2', 'st_s_3', 'st_san_tax_2'], isTaxiStand: true },
  taxi_east: { id: 'taxi_east', name: 'East Taxi Stand', x: 925, y: 500, connectedTo: ['st_ne_3', 'st_e_1'], isTaxiStand: true },

  // ==========================================
  // 1. NORTH STREET (From West Taxi to East Taxi)
  // ==========================================
  st_nw_1: { id: 'st_nw_1', name: 'Northwest Road', x: 245, y: 415, connectedTo: ['taxi_west', 'st_nw_2'] },
  st_nw_2: { id: 'st_nw_2', name: 'Northwest Road', x: 275, y: 380, connectedTo: ['st_nw_1', 'node_harney_shack'] },
  node_harney_shack: { id: 'node_harney_shack', name: "Harney Shack Path", x: 340, y: 360, connectedTo: ['st_nw_2', 'st_n_1'], leadsToLocation: 'harney_jones_shack' },
  st_n_1: { id: 'st_n_1', name: 'North Street', x: 405, y: 340, connectedTo: ['node_harney_shack', 'st_n_2', 'st_woods_in_1'] },
  st_n_2: { id: 'st_n_2', name: 'North Street', x: 470, y: 330, connectedTo: ['st_n_1', 'node_train_station'] },
  node_train_station: { id: 'node_train_station', name: 'Train Station Entrance', x: 540, y: 320, connectedTo: ['st_n_2', 'st_n_3'], leadsToLocation: 'train_station' },
  st_n_3: { id: 'st_n_3', name: 'North Street', x: 610, y: 330, connectedTo: ['node_train_station', 'st_n_4', 'node_shunned_house'] },
  st_n_4: { id: 'st_n_4', name: 'North Street', x: 680, y: 340, connectedTo: ['st_n_3', 'node_black_cave'] },
  node_black_cave: { id: 'node_black_cave', name: 'Black Cave Road', x: 750, y: 355, connectedTo: ['st_n_4', 'st_ne_1', 'node_lake_miskatonic'], leadsToLocation: 'black_cave' },
  st_ne_1: { id: 'st_ne_1', name: 'Lodge Approach', x: 805, y: 365, connectedTo: ['node_black_cave', 'node_lodge'] },
  node_lodge: { id: 'node_lodge', name: 'Lodge Lane', x: 860, y: 380, connectedTo: ['st_ne_1', 'st_ne_2'], leadsToLocation: 'silver_twilight_lodge' },
  st_ne_2: { id: 'st_ne_2', name: 'Northeast Avenue', x: 895, y: 415, connectedTo: ['node_lodge', 'st_ne_3'] },
  st_ne_3: { id: 'st_ne_3', name: 'Northeast Avenue', x: 915, y: 455, connectedTo: ['st_ne_2', 'taxi_east'] },

  // ==========================================
  // 2. WEST STREET (From West Taxi to Devil's Beach)
  // ==========================================
  st_w_1: { id: 'st_w_1', name: 'West Avenue', x: 240, y: 500, connectedTo: ['taxi_west', 'st_w_2'] },
  st_w_2: { id: 'st_w_2', name: 'West Avenue', x: 250, y: 535, connectedTo: ['st_w_1', 'node_graveyard'] },
  node_graveyard: { id: 'node_graveyard', name: 'Cemetery Gate', x: 270, y: 575, connectedTo: ['st_w_2', 'st_w_3', 'st_c_w2'], leadsToLocation: 'graveyard' },
  st_w_3: { id: 'st_w_3', name: 'Press Street North', x: 275, y: 615, connectedTo: ['node_graveyard', 'node_newspaper'] },
  node_newspaper: { id: 'node_newspaper', name: 'Press Street', x: 280, y: 655, connectedTo: ['st_w_3', 'st_w_4', 'st_h_np'], leadsToLocation: 'newspaper' },
  st_w_4: { id: 'st_w_4', name: 'Southwest Road', x: 285, y: 700, connectedTo: ['node_newspaper', 'st_w_5'] },
  st_w_5: { id: 'st_w_5', name: 'Library Approach', x: 290, y: 750, connectedTo: ['st_w_4', 'node_library'] },
  node_library: { id: 'node_library', name: 'Library Steps', x: 300, y: 800, connectedTo: ['st_w_5', 'st_sw_1'], leadsToLocation: 'library' },
  st_sw_1: { id: 'st_sw_1', name: 'Coastal Path', x: 325, y: 830, connectedTo: ['node_library', 'node_devils_beach'] },
  node_devils_beach: { id: 'node_devils_beach', name: 'Beach Road', x: 360, y: 855, connectedTo: ['st_sw_1', 'st_s_1'], leadsToLocation: 'devils_beach' },

  // ==========================================
  // 3. SOUTH SHORE ROAD (From Devil's Beach to Lighthouse)
  // ==========================================
  st_s_1: { id: 'st_s_1', name: 'Shoreline Drive', x: 390, y: 860, connectedTo: ['node_devils_beach', 'node_historical_society'] },
  node_historical_society: { id: 'node_historical_society', name: 'History Walk', x: 420, y: 865, connectedTo: ['st_s_1', 'st_s_2'], leadsToLocation: 'historical_society' },
  st_s_2: { id: 'st_s_2', name: 'South Street', x: 448, y: 865, connectedTo: ['node_historical_society', 'taxi_south'] },
  st_s_3: { id: 'st_s_3', name: 'Mission Path', x: 500, y: 865, connectedTo: ['taxi_south', 'node_dagon_mission'] },
  node_dagon_mission: { id: 'node_dagon_mission', name: 'Mission Alley', x: 525, y: 865, connectedTo: ['st_s_3', 'st_s_4'], leadsToLocation: 'dagon_mission' },
  st_s_4: { id: 'st_s_4', name: 'Fairgrounds Way', x: 565, y: 865, connectedTo: ['node_dagon_mission', 'node_darks_carnival'] },
  node_darks_carnival: { id: 'node_darks_carnival', name: 'Fairgrounds Gate', x: 605, y: 865, connectedTo: ['st_s_4', 'st_s_5', 'st_velma_carnival'], leadsToLocation: 'darks_carnival' },
  st_s_5: { id: 'st_s_5', name: 'Old South Road', x: 655, y: 860, connectedTo: ['node_darks_carnival', 'st_s_6'] },
  st_s_6: { id: 'st_s_6', name: 'Old South Road', x: 705, y: 855, connectedTo: ['st_s_5', 'st_s_7'] },
  st_s_7: { id: 'st_s_7', name: 'Antique Row', x: 750, y: 850, connectedTo: ['st_s_6', 'node_curiositie_shoppe'] },
  node_curiositie_shoppe: { id: 'node_curiositie_shoppe', name: 'Old Town Lane', x: 795, y: 845, connectedTo: ['st_s_7', 'st_se_1', 'st_found_curio'], leadsToLocation: 'curiositie_shoppe' },
  st_se_1: { id: 'st_se_1', name: 'Beacon Trail', x: 840, y: 845, connectedTo: ['node_curiositie_shoppe', 'node_lighthouse', 'st_e_4'] },
  node_lighthouse: { id: 'node_lighthouse', name: 'Coastal Point', x: 885, y: 845, connectedTo: ['st_se_1'], leadsToLocation: 'lighthouse' },

  // ==========================================
  // 4. EAST ROAD (From East Taxi to Coast)
  // ==========================================
  st_e_1: { id: 'st_e_1', name: 'East Boulevard', x: 915, y: 550, connectedTo: ['taxi_east', 'st_e_2'] },
  st_e_2: { id: 'st_e_2', name: 'East Boulevard', x: 895, y: 590, connectedTo: ['st_e_1', 'node_hibs_roadhouse', 'st_uni_east'] },
  node_hibs_roadhouse: { id: 'node_hibs_roadhouse', name: 'Highway 1', x: 860, y: 640, connectedTo: ['st_e_2', 'st_e_3', 'st_found_hibs'], leadsToLocation: 'hibs_roadhouse' },
  st_e_3: { id: 'st_e_3', name: 'Highway 1 South', x: 855, y: 695, connectedTo: ['node_hibs_roadhouse', 'st_e_4'] },
  st_e_4: { id: 'st_e_4', name: 'Highway 1 South', x: 850, y: 750, connectedTo: ['st_e_3', 'st_se_1'] },

  // ==========================================
  // 5. INTERIOR STREETS (Woods, Church, University, Lake)
  // ==========================================
  st_woods_in_1: { id: 'st_woods_in_1', name: 'Pine Path', x: 445, y: 380, connectedTo: ['st_n_1', 'node_woods'] },
  node_woods: { id: 'node_woods', name: 'Woodland Edge', x: 485, y: 420, connectedTo: ['st_woods_in_1', 'st_woods_in_2'], leadsToLocation: 'woods' },
  st_woods_in_2: { id: 'st_woods_in_2', name: 'Woods Crossroad', x: 520, y: 460, connectedTo: ['node_woods', 'node_shunned_house', 'node_center1'] },

  node_shunned_house: { id: 'node_shunned_house', name: 'Shunned Path', x: 585, y: 410, connectedTo: ['st_n_3', 'st_woods_in_2', 'st_mid_ch1'], leadsToLocation: 'shunned_house' },
  st_mid_ch1: { id: 'st_mid_ch1', name: 'Belfry Lane', x: 635, y: 430, connectedTo: ['node_shunned_house', 'node_north_church'] },
  node_north_church: { id: 'node_north_church', name: 'Church Square', x: 680, y: 450, connectedTo: ['st_mid_ch1', 'st_ch_lake', 'st_ch_ch'], leadsToLocation: 'north_church' },
  st_ch_lake: { id: 'st_ch_lake', name: 'Lake Road', x: 735, y: 450, connectedTo: ['node_north_church', 'node_lake_miskatonic'] },
  node_lake_miskatonic: { id: 'node_lake_miskatonic', name: 'Lake Approach', x: 790, y: 445, connectedTo: ['node_black_cave', 'st_ch_lake', 'st_lake_uni'], leadsToLocation: 'lake_miskatonic' },
  st_lake_uni: { id: 'st_lake_uni', name: 'Campus Walk North', x: 775, y: 495, connectedTo: ['node_lake_miskatonic', 'node_university'] },
  node_university: { id: 'node_university', name: 'University Campus Gate', x: 755, y: 545, connectedTo: ['st_lake_uni', 'st_board_uni', 'st_uni_east'], leadsToLocation: 'miskatonic_university' },
  st_uni_east: { id: 'st_uni_east', name: 'College Way', x: 840, y: 570, connectedTo: ['node_university', 'st_e_2'] },

  // ==========================================
  // 6. CENTRAL CROSSROADS (Center, City Hall, Boarding House)
  // ==========================================
  node_center1: { id: 'node_center1', name: 'Central Crossroad', x: 510, y: 510, connectedTo: ['st_woods_in_2', 'node_city_hall', 'st_c_w1', 'st_c_s1'], isIntersection: true },
  st_c_w1: { id: 'st_c_w1', name: 'Hospital Lane West', x: 435, y: 535, connectedTo: ['node_center1', 'st_c_w2'] },
  st_c_w2: { id: 'st_c_w2', name: 'Cemetery Crossroad', x: 325, y: 585, connectedTo: ['node_graveyard', 'st_c_w1', 'node_hospital'] },
  st_c_s1: { id: 'st_c_s1', name: 'Center South', x: 500, y: 585, connectedTo: ['node_center1', 'node_sanitarium'] },

  st_ch_ch: { id: 'st_ch_ch', name: 'Market Way', x: 640, y: 500, connectedTo: ['node_north_church', 'node_city_hall'] },
  node_city_hall: { id: 'node_city_hall', name: 'City Hall Plaza', x: 600, y: 555, connectedTo: ['node_center1', 'st_ch_ch', 'st_ch_board', 'st_ch_pol'], leadsToLocation: 'city_hall' },
  st_ch_board: { id: 'st_ch_board', name: 'Residential Street', x: 640, y: 570, connectedTo: ['node_city_hall', 'node_boarding_house'] },
  node_boarding_house: { id: 'node_boarding_house', name: 'Residential Way', x: 680, y: 590, connectedTo: ['st_ch_board', 'st_board_uni', 'st_board_found'], leadsToLocation: 'boarding_house' },
  st_board_uni: { id: 'st_board_uni', name: 'Faculty Path', x: 715, y: 565, connectedTo: ['node_boarding_house', 'node_university'] },
  st_board_found: { id: 'st_board_found', name: 'Founder Trail North', x: 710, y: 645, connectedTo: ['node_boarding_house', 'node_founders_rock'] },

  // ==========================================
  // 7. CIVIC & MEDICAL DISTRICT (Hospital, Sanitarium, Police, Diner)
  // ==========================================
  st_h_np: { id: 'st_h_np', name: 'Ambulance Way', x: 330, y: 660, connectedTo: ['node_newspaper', 'node_hospital'] },
  node_hospital: { id: 'node_hospital', name: "St. Mary's Drive", x: 380, y: 660, connectedTo: ['st_c_w2', 'st_h_np', 'st_h_san'], leadsToLocation: 'hospital' },
  st_h_san: { id: 'st_h_san', name: 'Asylum Walk', x: 435, y: 660, connectedTo: ['node_hospital', 'node_sanitarium'] },
  node_sanitarium: { id: 'node_sanitarium', name: 'Asylum Avenue', x: 490, y: 660, connectedTo: ['st_c_s1', 'st_h_san', 'st_san_pol', 'st_san_tax_1'], leadsToLocation: 'sanitarium' },
  st_san_tax_1: { id: 'st_san_tax_1', name: 'Mission Approach North', x: 485, y: 730, connectedTo: ['node_sanitarium', 'st_san_tax_2'] },
  st_san_tax_2: { id: 'st_san_tax_2', name: 'Mission Approach South', x: 480, y: 800, connectedTo: ['st_san_tax_1', 'taxi_south'] },

  st_ch_pol: { id: 'st_ch_pol', name: 'Sheriff Way', x: 595, y: 610, connectedTo: ['node_city_hall', 'node_police_station'] },
  st_san_pol: { id: 'st_san_pol', name: 'Courthouse Row', x: 540, y: 660, connectedTo: ['node_sanitarium', 'node_police_station'] },
  node_police_station: { id: 'node_police_station', name: "Sheriff's Court", x: 590, y: 660, connectedTo: ['st_ch_pol', 'st_san_pol', 'node_velmas_diner'], leadsToLocation: 'police_station' },
  node_velmas_diner: { id: 'node_velmas_diner', name: 'Diner Alley', x: 570, y: 720, connectedTo: ['node_police_station', 'st_velma_carnival'], leadsToLocation: 'velmas_diner' },
  st_velma_carnival: { id: 'st_velma_carnival', name: 'Fairfield Path', x: 590, y: 790, connectedTo: ['node_velmas_diner', 'node_darks_carnival'] },

  // ==========================================
  // 8. FOUNDER'S ROCK & HIWAY 1
  // ==========================================
  node_founders_rock: { id: 'node_founders_rock', name: "Founder's Trail", x: 740, y: 700, connectedTo: ['st_board_found', 'st_found_hibs', 'st_found_curio'], leadsToLocation: 'founders_rock' },
  st_found_hibs: { id: 'st_found_hibs', name: 'Tavern Road', x: 800, y: 670, connectedTo: ['node_founders_rock', 'node_hibs_roadhouse'] },
  st_found_curio: { id: 'st_found_curio', name: 'Relic Trail', x: 765, y: 775, connectedTo: ['node_founders_rock', 'node_curiositie_shoppe'] }
};

export const INITIAL_MONSTERS: Omit<Monster, 'id' | 'currentNodeId'>[] = [
  { name: 'Mi-Go', species: 'Mi-Go', strength: 3, sanityCheck: { passLoss: 1, failLoss: 2 }, speed: 2, handedness: 'R', isFlyer: true, flyerSpeed: 4, specialRules: ['Flyer'] },
  { name: 'Byakhee', species: 'Byakhee', strength: 5, sanityCheck: { passLoss: 1, failLoss: 2 }, speed: 2, handedness: 'none', isFlyer: true, flyerSpeed: 6, specialRules: ['Flyer'] },
  { name: 'Ghoul', species: 'Ghoul', strength: 4, sanityCheck: { passLoss: 0, failLoss: 1 }, speed: 1, handedness: 'R', specialRules: [] },
  { name: 'Nightgaunt', species: 'Nightgaunt', strength: 4, sanityCheck: { passLoss: 1, failLoss: 1 }, speed: 1, handedness: 'L', isFlyer: true, flyerSpeed: 4, specialRules: ['Drops You Through Nearest Gate'] },
  { name: 'Shoggoth', species: 'Shoggoth', strength: 14, sanityCheck: { passLoss: 2, failLoss: 6 }, speed: 1, handedness: 'L', isBlocker: true, specialRules: ['Blocker'] },
  { name: 'Hound of Tindalos', species: 'Hound of Tindalos', strength: 6, sanityCheck: { passLoss: 1, failLoss: 4 }, speed: 2, handedness: 'R', specialRules: ['Attacks in Buildings Only', 'Cannot be Sneaked past'] },
  { name: 'Star Spawn', species: 'Star Spawn', strength: 18, sanityCheck: { passLoss: 1, failLoss: 3 }, speed: 2, handedness: 'R', isBlocker: true, specialRules: ['Blocker'] },
  { name: 'Deep One', species: 'Deep One', strength: 5, sanityCheck: { passLoss: 0, failLoss: 1 }, speed: 1, handedness: 'L', specialRules: [] },
  { name: 'Gug', species: 'Gug', strength: 10, sanityCheck: { passLoss: 1, failLoss: 3 }, speed: 2, handedness: 'R', isBlocker: true, specialRules: ['Blocker', 'Halts vehicle movement'] },
  { name: 'Cultist', species: 'Cultist', strength: 2, sanityCheck: { passLoss: 0, failLoss: 0 }, speed: 1, handedness: 'R', specialRules: [] },
  { name: 'Witch', species: 'Witch', strength: 3, sanityCheck: { passLoss: 0, failLoss: 1 }, speed: 1, handedness: 'L', isMagical: true, specialRules: ['Magic Attacks Only'] },
  { name: 'Vampire', species: 'Vampire', strength: 8, sanityCheck: { passLoss: 0, failLoss: 2 }, speed: 2, handedness: 'R', specialRules: ['Unharmed By Guns'] },
  { name: 'Zombie', species: 'Zombie', strength: 3, sanityCheck: { passLoss: 0, failLoss: 1 }, speed: 1, handedness: 'L', specialRules: [] },
  { name: 'Chthonian', species: 'Chthonian', strength: 12, sanityCheck: { passLoss: 1, failLoss: 4 }, speed: 1, handedness: 'none', isBlocker: true, specialRules: ['Blocker'] },
  { name: 'Hunting Horror', species: 'Hunting Horror', strength: 9, sanityCheck: { passLoss: 1, failLoss: 3 }, speed: 2, handedness: 'none', isFlyer: true, flyerSpeed: 4, specialRules: ['Flyer'] },
  { name: 'Elder Thing', species: 'Elder Thing', strength: 7, sanityCheck: { passLoss: 1, failLoss: 2 }, speed: 1, handedness: 'L', specialRules: [] },
  { name: 'Dhole', species: 'Dhole', strength: 16, sanityCheck: { passLoss: 2, failLoss: 6 }, speed: 1, handedness: 'none', isBlocker: true, isStationary: true, specialRules: ['Blocker', 'Stationary'] },
  { name: 'Ghost', species: 'Ghost', strength: 5, sanityCheck: { passLoss: 0, failLoss: 2 }, speed: 0, handedness: 'none', isStationary: true, specialRules: ['Magic Attacks Only', 'Stationary'] },
];

export const INITIAL_ITEMS: Card[] = [
  { id: 'item_38_revolver', name: '.38 Revolver', type: 'item', description: '+2 to Fight. Handgun.', price: 4, hands: 1, fightBonus: 2, isGun: true },
  { id: 'item_45_automatic', name: '.45 Automatic', type: 'item', description: '+3 to Fight. Handgun.', price: 6, hands: 1, fightBonus: 3, isGun: true },
  { id: 'item_shotgun', name: 'Shotgun', type: 'item', description: '+4 to Fight. Two-handed firearm.', price: 8, hands: 2, fightBonus: 4, isGun: true },
  { id: 'item_tommy_gun', name: 'Tommy Gun', type: 'item', description: '+5 to Fight. Rapid-fire submachine gun.', price: 12, hands: 2, fightBonus: 5, isGun: true },
  { id: 'item_sword', name: 'Cavalry Sword', type: 'item', description: '+2 to Fight. Heavy steel blade.', price: 4, hands: 1, fightBonus: 2 },
  { id: 'item_knife', name: 'Hunting Knife', type: 'item', description: '+1 to Fight. Sharp durable blade.', price: 2, hands: 1, fightBonus: 1 },
  { id: 'item_axe', name: 'Fireman\'s Axe', type: 'item', description: '+2 to Fight. Two-handed chopping axe.', price: 3, hands: 2, fightBonus: 2 },
  { id: 'item_bullwhip', name: 'Bullwhip', type: 'item', description: '+1 to Fight. Long braided leather whip.', price: 2, hands: 1, fightBonus: 1 },
  { id: 'item_derringer', name: 'Derringer', type: 'item', description: '+1 to Fight. Concealable pocket pistol.', price: 3, hands: 1, fightBonus: 1, isGun: true },
  { id: 'item_magic_powder', name: 'Magic Powder', type: 'item', description: '+3 to Fight. Magical attack against creatures immune to physical damage.', price: 5, hands: 1, fightBonus: 3, isMagical: true },
  { id: 'item_holy_water', name: 'Holy Water', type: 'item', description: '+4 to Fight against unholy monsters.', price: 4, hands: 1, fightBonus: 4, isMagical: true },
  { id: 'item_elder_sign_1', name: 'Elder Sign', type: 'item', description: 'Permanently seals and closes a dimensional gate! Costs 2 sanity points to activate.', price: 10, isMagical: true, specialEffect: 'seal_gate' },
  { id: 'item_elder_sign_2', name: 'Elder Sign', type: 'item', description: 'Permanently seals and closes a dimensional gate! Costs 2 sanity points to activate.', price: 10, isMagical: true, specialEffect: 'seal_gate' },
  { id: 'item_automobile', name: 'Automobile', type: 'item', description: 'Allows free travel to any space or location in Arkham once per turn.', price: 30, specialEffect: 'car_travel' },
  { id: 'item_taxi_whistle', name: 'Taxi Whistle', type: 'item', description: 'Allows paying $1 to hail a taxi from any street space in Arkham.', price: 3, specialEffect: 'hail_taxi' },
  { id: 'item_motorcycle', name: 'Motorcycle', type: 'item', description: 'Adds +2 to all movement rolls.', price: 15, specialEffect: 'motorcycle_move' },
  { id: 'item_first_aid', name: 'First Aid Kit', type: 'item', description: 'Use once to restore +2 Strength points.', price: 3, specialEffect: 'heal_strength' },
  { id: 'item_silver_key', name: 'Silver Key', type: 'item', description: 'Allows traveling into or out of Other Worlds without rolling on gate tables.', price: 12, isMagical: true, specialEffect: 'silver_key' },
];

export const INITIAL_SPELLS: Card[] = [
  { id: 'spell_dread_curse', name: 'Dread Curse of Azathoth', type: 'spell', description: '+9 magical attack against a target. Costs 2 sanity points.', sanityCost: 2, magicBonus: 9, isMagical: true },
  { id: 'spell_powder_ibn', name: 'Powder of Ibn-Ghazhi', type: 'spell', description: '+7 magical attack against a target. Costs 1 sanity point.', sanityCost: 1, magicBonus: 7, isMagical: true },
  { id: 'spell_power_drain', name: 'Power Drain', type: 'spell', description: '+6 magical attack against a target. Costs 1 sanity point.', sanityCost: 1, magicBonus: 6, isMagical: true },
  { id: 'spell_shrivelling', name: 'Shrivelling', type: 'spell', description: '+4 magical attack against a target. Costs 1 sanity point.', sanityCost: 1, magicBonus: 4, isMagical: true },
  { id: 'spell_heal', name: 'Heal', type: 'spell', description: 'Adds +2 Strength points to an investigator in the same space.', sanityCost: 0, specialEffect: 'heal_strength' },
  { id: 'spell_cloud_memory', name: 'Cloud Memory', type: 'spell', description: 'Adds +2 Sanity points to an investigator in the same space.', sanityCost: 0, specialEffect: 'heal_sanity' },
  { id: 'spell_mists_rlyeh', name: 'Mists of R\'lyeh', type: 'spell', description: 'Allows 1 automatically successful Sneak check per turn.', sanityCost: 0, specialEffect: 'auto_sneak' },
  { id: 'spell_flesh_ward', name: 'Flesh Ward', type: 'spell', description: 'Automatically cancels any one monster attack or counterattack.', sanityCost: 0, specialEffect: 'cancel_damage' },
  { id: 'spell_find_gate', name: 'Find Gate', type: 'spell', description: 'In an Other World: return to Arkham immediately after surviving sanity roll.', sanityCost: 0, specialEffect: 'find_gate' },
  { id: 'spell_bind_monster', name: 'Bind Monster', type: 'spell', description: 'Take control of a monster to attack another creature or gate.', sanityCost: 1, specialEffect: 'bind_monster' },
];

export const INITIAL_SKILLS: Card[] = [
  { id: 'skill_fight', name: 'Expert Pugilist', type: 'skill', description: '+1 to Fight skill rolls and weapon strikes.' },
  { id: 'skill_sneak', name: 'Shadow Stalker', type: 'skill', description: '+1 to Sneak skill rolls when avoiding horrors.' },
  { id: 'skill_knowledge', name: 'Occult Scholar', type: 'skill', description: '+1 to Knowledge skill rolls when casting spells.' },
  { id: 'skill_fast_talk', name: 'Silver Tongue', type: 'skill', description: '+1 to Fast Talk skill rolls when negotiating.' },
];
