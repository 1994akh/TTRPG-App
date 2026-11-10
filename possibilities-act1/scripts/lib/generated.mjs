/* Written by build/content.mjs. Do not edit by hand. */
export const CONTENT = {
 "steps": [
  {
   "key": "pc",
   "n": 1,
   "title": "Make your character, and the Coast Road",
   "scenes": [
    "ch1_intro_founding",
    "ch1_intro_beastkin",
    "ch1_intro_fae",
    "ch1_intro_monsterkin"
   ],
   "map": "ashford",
   "actors": [],
   "tools": [
    "makeCharacter"
   ],
   "systems": "The creator (race, profession, skills, looks, name; no class yet). One intro by race family, played on the Coast Road.",
   "day": 1,
   "prompts": [
    "What did {pc} say when the gate let them through?",
    "What does {pc} leave behind, and why do they need a ship?",
    "A line to remember."
   ],
   "gmNotes": [
    "Act 1 covers four days: day 1 arrive and take the job; day 2 the Undercourses, the Gloam at noon; day 3 paid and bound; day 4 morning, the missed ship.",
    "Fog rolls in off the brume every night and burns off by mid-morning everywhere except Refinery Row, which stays clear and warm."
   ]
  },
  {
   "key": "broker",
   "n": 2,
   "title": "A hard time at the Exchange",
   "scenes": [
    "ch1_broker"
   ],
   "map": "sallows_exchange",
   "actors": [
    "broker",
    "protag2",
    "protag3",
    "enkrid"
   ],
   "tools": [
    "addTrio"
   ],
   "systems": "Dialogue with one choice. The trio join the party here.",
   "day": 1,
   "prompts": [
    "What did {pc} tell the broker they came for?",
    "What changed for {pc}, or between the four of them?",
    "A line to remember."
   ],
   "gmNotes": []
  },
  {
   "key": "questions",
   "n": 3,
   "title": "Stupid, basic, and naive questions",
   "scenes": [
    "ch1_questions"
   ],
   "map": "sallows_exchange",
   "actors": [
    "broker"
   ],
   "tools": [
    "askBroker"
   ],
   "systems": "The broker's question menu: show any answer to the table.",
   "day": 1,
   "prompts": [
    "Which question did {pc} ask first?",
    "What changed for {pc}, or between the four of them?",
    "A line to remember."
   ],
   "gmNotes": []
  },
  {
   "key": "commission",
   "n": 4,
   "title": "The commission",
   "scenes": [
    "ch1_commission"
   ],
   "map": "sallows_exchange",
   "actors": [
    "broker"
   ],
   "tools": [
    "giveLoaners"
   ],
   "systems": "Loaned gear (marked Loaned). The broker's board opens for filler after the act.",
   "day": 1,
   "prompts": [
    "What did {pc} say on the Exchange steps?",
    "What changed for {pc}, or between the four of them?",
    "A line to remember."
   ],
   "gmNotes": [
    "Petra saw grey fog moving against the wind out of the street grates at night, and a light under the street where no one should be. That is why she went down.",
    "The broker suspected from the sellswords' silence and Petra's story, and sent the cheapest crew she could find. Not evil, a broker."
   ]
  },
  {
   "key": "prologue",
   "n": 5,
   "title": "Prologue: the three legends (flashback)",
   "scenes": [
    "ch1_prologue"
   ],
   "map": "",
   "actors": [
    "dov",
    "captain",
    "first_mate",
    "inventor"
   ],
   "tools": [],
   "systems": "A flashback: read it aloud, or play young Enkrid. No saves, nothing at stake.",
   "day": 1,
   "prompts": [
    "What did {pc} say to Enkrid after his story?",
    "What changed for {pc}, or between the four of them?",
    "A line to remember."
   ],
   "gmNotes": [
    "Play it as narration on a sepia page, with one or two choices for young Enkrid and no dice, then go back to the steps.",
    "Staging from your draft: at the communal fire, a lone man with a long walking staff tells a story to about thirty villagers, thumping the staff in time with his words, while young Enkrid hides behind a hovel."
   ]
  },
  {
   "key": "sewer",
   "n": 6,
   "title": "Into the Undercourses",
   "scenes": [
    "ch1_sewer_enter"
   ],
   "map": "undercourses",
   "actors": [
    "sellsword"
   ],
   "tools": [
    "revealHandout"
   ],
   "systems": "The first dungeon. The sellswords' journal is a clue item.",
   "day": 2,
   "prompts": [
    "What did {pc} say over the sellswords' bodies?",
    "What changed for {pc}, or between the four of them?",
    "A line to remember."
   ],
   "gmNotes": [
    "The three sellswords wear a Coldwater crew mark (a gull over a knotted net), so Coldwater can come back later. Their names are in the handout."
   ]
  },
  {
   "key": "gnaw",
   "n": 7,
   "title": "Old Gnaw",
   "scenes": [
    "ch1_old_gnaw"
   ],
   "map": "undercourses",
   "actors": [
    "old_gnaw",
    "rat",
    "rat_swarm"
   ],
   "tools": [
    "startGnaw"
   ],
   "systems": "The first real fight, Unclassed: Strike, Aid, Stabilise and items. Three actions a turn; -4 / -8 on the second and third Strike.",
   "day": 2,
   "prompts": [
    "What did {pc} shout in the fight with Old Gnaw?",
    "What changed for {pc}, or between the four of them?",
    "A line to remember."
   ],
   "gmNotes": [
    "Fair but tense: Old Gnaw can drop one hero if the party is careless. Nobody dies in Act 1 unless the Undertaking setting is on."
   ]
  },
  {
   "key": "gloam",
   "n": 8,
   "title": "The thing in the dark",
   "scenes": [
    "ch1_the_gloam"
   ],
   "map": "grate_chamber",
   "actors": [
    "gloam",
    "petra"
   ],
   "tools": [
    "startGloam",
    "gloamRebuff"
   ],
   "systems": "A fight they can't win: after two rounds the Gloam throws the party back to the doorway. Nobody dies.",
   "day": 2,
   "prompts": [
    "What did {pc} say when everything they hit 'just wasn't there'?",
    "What changed for {pc}, or between the four of them?",
    "A line to remember."
   ],
   "gmNotes": [
    "What the Gloam is: brume run-off from the refinery that pooled in the dark for forty years until it started wanting. Sunlight fixes it and it falls apart. Nobody in Ashford wants that known.",
    "Play it uncanny, not gory: it moves wrong, sounds are muffled near it, the lamps don't light it, and it is never seen clearly until the sun holds it."
   ]
  },
  {
   "key": "light",
   "n": 9,
   "title": "Into the light",
   "scenes": [
    "ch1_into_the_light"
   ],
   "map": "grate_chamber",
   "actors": [
    "into_the_light",
    "gloam",
    "petra"
   ],
   "tools": [
    "startLight",
    "sunClock"
   ],
   "systems": "A Scene: Resistance, approaches (Full / Half / None), Setbacks that damage the loaners, and the sun clock.",
   "day": 2,
   "prompts": [
    "What did {pc} say to Petra?",
    "What changed for {pc}, or between the four of them?",
    "A line to remember."
   ],
   "gmNotes": [
    "Setbacks hit on a critical failure always, on a failure when the approach says so, and once at the end of every round the sun clock moves.",
    "Profession XP comes from Scenes: this one counts for every hero who made an attempt."
   ]
  },
  {
   "key": "fee",
   "n": 10,
   "title": "Paying for the loaners",
   "scenes": [
    "ch1_danger_fee"
   ],
   "map": "sallows_exchange",
   "actors": [
    "broker"
   ],
   "tools": [
    "openPurse",
    "keepLoaners"
   ],
   "systems": "The purse: the reward, the bill for the loaners, the danger fee. The loaners become the party's own.",
   "day": 3,
   "prompts": [
    "What did {pc} say to press the broker for the danger fee?",
    "What changed for {pc}, or between the four of them?",
    "A line to remember."
   ],
   "gmNotes": [
    "Hollis Tarrant pays in full and in public, so Refinery Row sees he is generous, and asks them never to mention where Petra was found."
   ]
  },
  {
   "key": "binding",
   "n": 11,
   "title": "Binding",
   "scenes": [
    "ch1_binding"
   ],
   "map": "binding_house",
   "actors": [
    "binder"
   ],
   "tools": [
    "bindAll"
   ],
   "systems": "The PC picks one of the twelve F-grade classes; the trio take theirs from the story. Everyone becomes F-Novice.",
   "day": 3,
   "prompts": [
    "What did {pc} say when the binder asked them to choose?",
    "What changed for {pc}, or between the four of them?",
    "A line to remember."
   ],
   "gmNotes": [
    "The brume goes in through the hands and chest; everything goes white and too-sharp for a moment; it leaves a faint grey vein mark, the binding mark, that darkens with each grade.",
    "Binding hits fae harder: that is why Enkrid collapses."
   ]
  },
  {
   "key": "collapse",
   "n": 12,
   "title": "It hurts",
   "scenes": [
    "ch1_collapse"
   ],
   "map": "binding_house",
   "actors": [
    "binder"
   ],
   "tools": [
    "enkridCollapses"
   ],
   "systems": "Enkrid is down (a story condition) until the inn.",
   "day": 3,
   "prompts": [
    "What did {pc} say while they carried Enkrid?",
    "What changed for {pc}, or between the four of them?",
    "A line to remember."
   ],
   "gmNotes": []
  },
  {
   "key": "inn",
   "n": 13,
   "title": "A night at the Lantern and Lee",
   "scenes": [
    "ch1_inn_night"
   ],
   "map": "lantern_lee",
   "actors": [
    "innkeeper"
   ],
   "tools": [
    "innRest",
    "revealHandout"
   ],
   "systems": "A long rest at the inn. Optional talks with each of the trio.",
   "day": 3,
   "prompts": [
    "What did {pc} say to each of the trio before sleeping?",
    "What changed for {pc}, or between the four of them?",
    "A line to remember."
   ],
   "gmNotes": [
    "The legends' journal page 1 is here: Dunmore kept a page Captain Varr left with a bar tab. Show it with the Show a handout tool; you write its text."
   ]
  },
  {
   "key": "ship",
   "n": 14,
   "title": "The Gilded Tern leaves without them",
   "scenes": [
    "ch1_missed_ship"
   ],
   "map": "long_quay",
   "actors": [
    "rourke",
    "noble"
   ],
   "tools": [
    "endAct",
    "milestone"
   ],
   "systems": "The end of Act 1: the title card, then the session log.",
   "day": 4,
   "prompts": [
    "What did {pc} say as the Gilded Tern slipped its lines?",
    "Write the end of Act 1: where are the four of them now, and what do they want next?",
    "A line to remember."
   ],
   "gmNotes": [
    "Rourke is charming and reasonable on the quay. The one detail that sticks: his crew is armed like mercenaries, not sailors. It pays off on island 3.",
    "After the last line: a scruffy captain on the next berth has been watching them. Then the title card, then the milestone."
   ]
  }
 ],
 "config": {
  "note": "Every number the user may change from the Possibilities Foundry decisions page. Draft by Claude.",
  "purse": {
   "bindingFeeGp": 50,
   "bindings": 4,
   "entries": [
    {
     "key": "reward",
     "step": "fee",
     "label": "Hollis Tarrant's reward for Petra",
     "gp": 160
    },
    {
     "key": "loanerBill",
     "step": "fee",
     "label": "The bill for the damaged loaners",
     "gp": -30
    },
    {
     "key": "dangerFee",
     "step": "fee",
     "label": "The danger fee, pressed out of the broker",
     "gp": 70
    }
   ]
  },
  "gloam": {
   "rebuffRounds": 2
  },
  "light": {
   "clockRounds": 8,
   "resistance": 80,
   "dc": 12,
   "note": "8 rounds to match the 8 points of the sun's path on the Grate Chamber map (one point per tick)."
  },
  "pcStart": {
   "gp": 2,
   "sp": 5,
   "cp": 0
  },
  "fClasses": [
   "Reaver",
   "Firebrand",
   "Chaplain",
   "Tidecaller",
   "Vanguard",
   "Duelist",
   "Oathkeeper",
   "Beastbound",
   "Shade",
   "Bloodcharged",
   "Medium",
   "Theorist"
  ],
  "fClassesNote": "Fallback list for the Binding when the system API is missing; read from the rules data at authoring time.",
  "coin": {
   "cp": "copper bits",
   "sp": "silver marks",
   "gp": "gold crowns",
   "pp": "platinum charters"
  },
  "playlists": [
   "Ashford",
   "Sallow's Exchange",
   "The Undercourses",
   "The Gloam",
   "The Binding House",
   "The Lantern and Lee",
   "The Long Quay"
  ],
  "oracle": {
   "odds": {
    "likely": 4,
    "even": 0,
    "unlikely": -4
   },
   "bands": [
    [
     3,
     "No, and"
    ],
    [
     7,
     "No"
    ],
    [
     10,
     "No, but"
    ],
    [
     13,
     "Yes, but"
    ],
    [
     17,
     "Yes"
    ],
    [
     99,
     "Yes, and"
    ]
   ],
   "note": "d20 + odds; at or under each band's number."
  },
  "milestone": {
   "profession": "Apprentice",
   "note": "Draft: the end-of-Act-1 milestone raises each hero's profession one rank (Novice to Apprentice)."
  },
  "sideWork": {
   "default": false
  }
 },
 "scripts": {
  "ch1_intro_founding": {
   "name": "The Coast Road (Founding)",
   "style": "played",
   "lines": [
    {
     "note": "Dawn. The player walks the Coast Road through the ash fields toward Ashford; the refinery stacks glow ahead."
    },
    {
     "speaker": "narrator",
     "name": "Narrator",
     "text": "The Coast Road ends where the ash fields begin, and the ash fields end at Ashford Roads."
    },
    {
     "speaker": "narrator",
     "name": "Narrator",
     "text": "You have a profession, a pack, and coin for a week. You do not have a class, a ship, or a plan past the harbour."
    },
    {
     "note": "A carter passes and nods; nobody looks twice. Founding peoples pass unremarked."
    },
    {
     "speaker": "narrator",
     "name": "Narrator",
     "text": "Nobody looks twice at you. In Ashford Roads that is a kind of luck."
    },
    {
     "note": "A pinned notice at the city gate: \"Crews wanted. Ask at Sallow's Exchange.\""
    },
    {
     "speaker": "narrator",
     "name": "Narrator",
     "text": "Every notice on the gate says the same thing: ask at Sallow's Exchange."
    }
   ]
  },
  "ch1_intro_beastkin": {
   "name": "The Coast Road (Beastkin)",
   "style": "played",
   "lines": [
    {
     "note": "Dawn on the Coast Road. A gate clerk checks papers."
    },
    {
     "speaker": "narrator",
     "name": "Narrator",
     "text": "Every beastkin family can name its home rock. Yours is two days' sail behind you, and Ashford Roads is in front."
    },
    {
     "speaker": "narrator",
     "name": "Narrator",
     "text": "The gate clerk asks for your island before your name, and writes the island down first."
    },
    {
     "speaker": "narrator",
     "name": "Narrator",
     "text": "You have a profession, a pack, and coin for a week. You do not have a class, or a ship."
    },
    {
     "speaker": "narrator",
     "name": "Narrator",
     "text": "The clerk points without looking up. Work, ships and crews: Sallow's Exchange, by the port."
    }
   ]
  },
  "ch1_intro_fae": {
   "name": "The Coast Road (Fae)",
   "style": "played",
   "lines": [
    {
     "note": "Dawn on the Coast Road. The refinery's haze makes the player's outline shimmer; a child points."
    },
    {
     "speaker": "narrator",
     "name": "Narrator",
     "text": "Fae are closer to unfixed than anyone alive, and Ashford Roads burns the unfixed sea for fuel. The stacks are lit all night."
    },
    {
     "speaker": "narrator",
     "name": "Narrator",
     "text": "A child on a cart points at you, and her mother pulls her arm down. Not cruelly. Just quickly."
    },
    {
     "speaker": "narrator",
     "name": "Narrator",
     "text": "You have a profession, a pack, and coin for a week. No class, no ship."
    },
    {
     "speaker": "narrator",
     "name": "Narrator",
     "text": "The notices at the gate all point one way: Sallow's Exchange, by the port."
    }
   ]
  },
  "ch1_intro_monsterkin": {
   "name": "The Coast Road (Monsterkin)",
   "style": "played",
   "lines": [
    {
     "note": "Dawn at the city gate. A guard steps out with a ledger."
    },
    {
     "speaker": "narrator",
     "name": "Narrator",
     "text": "\"Monster\" is what the Compact writes on the manifest. The gate guard writes it on yours."
    },
    {
     "speaker": "narrator",
     "name": "Narrator",
     "text": "Surety, he says: a bond before you can stay inside the walls overnight. You don't have it. You have a profession, a pack, and coin for a week."
    },
    {
     "speaker": "narrator",
     "name": "Narrator",
     "text": "He lets you through for the day. The quay inns won't take you, he adds, except one."
    },
    {
     "speaker": "narrator",
     "name": "Narrator",
     "text": "Work, ships and crews are at Sallow's Exchange. He says it like he expects you'll be back at the gate by dusk."
    }
   ]
  },
  "ch1_broker": {
   "name": "A hard time at the Exchange",
   "style": "played",
   "lines": [
    {
     "note": "Inside Sallow's Exchange. Rook and Tova are already at the high desk; the player joins the queue behind them."
    },
    {
     "speaker": "broker",
     "name": "Odile Sallow",
     "text": "A crow with a satchel full of somebody else's pens. No."
    },
    {
     "speaker": "protag2",
     "name": "Rook",
     "text": "They're my pens. Now."
    },
    {
     "speaker": "broker",
     "name": "Odile Sallow",
     "text": "And a Trollblood who wants a berth on a ship. Dear heart, I can't even get you a bed."
    },
    {
     "speaker": "protag3",
     "name": "Tova",
     "text": "I sleep on deck. I'm first up and last down. Write that on whatever you write."
    },
    {
     "speaker": "broker",
     "name": "Odile Sallow",
     "text": "And you, {pc}. Let me guess. Big plans, no class."
    },
    {
     "choice": "I'm here for a ship."
    },
    {
     "choice": "I'm here for work."
    },
    {
     "speaker": "broker",
     "name": "Odile Sallow",
     "text": "Everyone is. Sit down, the three of you, and stop blocking my door."
    },
    {
     "note": "The door bangs. Enkrid comes in out of breath, a pocket watch chain swinging."
    },
    {
     "speaker": "enkrid",
     "name": "Enkrid",
     "text": "Ashford Roads. Is this where the legends' crews hire? Captain Isolde Varr's people?"
    },
    {
     "speaker": "broker",
     "name": "Odile Sallow",
     "text": "Captain Isolde Varr has been gone eight years, little road fae. And now there are four of you."
    },
    {
     "speaker": "broker",
     "name": "Odile Sallow",
     "text": "Here is the part none of you will like. No captain in this harbour signs on unclassed crew. Not even for the galley. Get bound, then come back."
    },
    {
     "speaker": "protag3",
     "name": "Tova",
     "text": "How much is binding?"
    },
    {
     "speaker": "broker",
     "name": "Odile Sallow",
     "text": "More than you have. All four together, more than you have."
    },
    {
     "speaker": "protag2",
     "name": "Rook",
     "text": "Then we put it together."
    },
    {
     "speaker": "enkrid",
     "name": "Enkrid",
     "text": "Together. Yes."
    },
    {
     "speaker": "broker",
     "name": "Odile Sallow",
     "text": "You've known each other a minute and a half."
    },
    {
     "speaker": "protag3",
     "name": "Tova",
     "text": "Then it's a good minute and a half. Give us work. And answer questions."
    },
    {
     "speaker": "broker",
     "name": "Odile Sallow",
     "text": "Oh, I'll answer your stupid, basic, and naive questions. Questions are free today. Tomorrow they're a silver each."
    },
    {
     "note": "Opens the broker's question menu (see the Questions entry). Then the commission."
    }
   ]
  },
  "ch1_questions": {
   "name": "Stupid, basic, and naive questions",
   "style": "menu",
   "lines": []
  },
  "ch1_commission": {
   "name": "The commission",
   "style": "played",
   "lines": [
    {
     "speaker": "broker",
     "name": "Odile Sallow",
     "text": "Work, then. One job pays enough to bind four. Hollis Tarrant, charge-lamp money on Refinery Row. His daughter Petra Tarrant went into the the Undercourses four days ago and hasn't come out."
    },
    {
     "speaker": "protag2",
     "name": "Rook",
     "text": "Into the sewers. On purpose."
    },
    {
     "speaker": "broker",
     "name": "Odile Sallow",
     "text": "She saw something from her window and went to look. Rich girls do."
    },
    {
     "speaker": "enkrid",
     "name": "Enkrid",
     "text": "Something's off. Why hasn't anyone taken it?"
    },
    {
     "speaker": "broker",
     "name": "Odile Sallow",
     "text": "Someone did."
    },
    {
     "speaker": "protag3",
     "name": "Tova",
     "text": "And?"
    },
    {
     "speaker": "broker",
     "name": "Odile Sallow",
     "text": "Three Coldwater sellswords, six days ago. They haven't come out either."
    },
    {
     "note": "Beat. Everyone looks at each other."
    },
    {
     "speaker": "protag3",
     "name": "Tova",
     "text": "Then the pay goes up."
    },
    {
     "speaker": "broker",
     "name": "Odile Sallow",
     "text": "The pay is the pay."
    },
    {
     "speaker": "protag2",
     "name": "Rook",
     "text": "Then you lend us gear. We have a pack each and a stolen pen."
    },
    {
     "speaker": "broker",
     "name": "Odile Sallow",
     "text": "Loaners. Basic blades, a lamp, a pry bar. Bring them back whole or pay for them."
    },
    {
     "note": "The heroes receive the loaned gear: one basic weapon each, a charge lamp, a pry bar. Marked \"Loaned\"."
    },
    {
     "note": "Outside, on the Exchange steps, the four check their gear. Bonding beat."
    },
    {
     "speaker": "protag3",
     "name": "Tova",
     "text": "Four people, one job, zero classes. I've had worse crews."
    },
    {
     "speaker": "protag2",
     "name": "Rook",
     "text": "You've had a crew?"
    },
    {
     "speaker": "protag3",
     "name": "Tova",
     "text": "I've had a dock. Same thing with fewer oars."
    },
    {
     "speaker": "enkrid",
     "name": "Enkrid",
     "text": "Captain Isolde Varr's crew started in this harbour too. Did you know that?"
    },
    {
     "note": "Enkrid takes out the pocket watch. The flashback begins: the Prologue entry."
    }
   ]
  },
  "ch1_prologue": {
   "name": "Prologue: the three legends",
   "style": "flashback",
   "lines": [
    {
     "speaker": "narrator",
     "name": "Narrator",
     "text": "Prologue-",
     "draft": true
    },
    {
     "speaker": "narrator",
     "name": "Narrator",
     "text": "Enkrid stooped behind the hovels edge, tightly hugging his knees to his chest, body aching from . Hidden by the darkness of the moonless night and the shadows cast by the communal fire at center of the small so called village, the small child shivered silent. The child did not shiver due to the warm humid air of the mid-summer night nor the soft dry breeze that rolled off of the grassy planes that stretched seemingly with no end. Fear drove him, his hear raced at every noise.",
     "draft": true
    },
    {
     "speaker": "narrator",
     "name": "Narrator",
     "text": "N the largest or tallest of the village’s children, nor did Enkrid ever expect he would be, his wiry frame showed only the smallest possibility of blooming into height or muscle, his greatest wish. Even while considering his long standing gripe against the gods, spirits or whomever had cursed him with his frame, he knew that his future size was the least of his concerns at the moment. His muscles ached from making himself small to hide, yet he still risked it.",
     "draft": true
    },
    {
     "speaker": "narrator",
     "name": "Narrator",
     "text": "Paces away, people of all ages, seemingly the entire village sat, laid, or silently stood to listen to a lone man standing near the fire, central for all to see, around 30 people. Painted in by the flickering fire, the people of the village looked Erie in the fright Enkrid thought to himself. The orange of the small fire discoloring the villagers grey and green stone like skin gave each a nightmarish look, only quickening his heart in fear as he peered from his hiding place.",
     "draft": true
    },
    {
     "speaker": "narrator",
     "name": "Narrator",
     "text": "The figure in the center gesticulated with one hand and rhythmically thumped his long walking staff in time with his words.",
     "draft": true
    },
    {
     "speaker": "narrator",
     "name": "Narrator",
     "text": "Even after another round of torture by the other children of their nameless village, why would he brave being seen",
     "draft": true
    },
    {
     "note": "Flashback filter. Night in the village with no name. A small Enkrid, maybe nine, curled on the ground behind a hovel."
    },
    {
     "speaker": "dov",
     "name": "Dov",
     "text": "Road fae. Horns like a goat and legs like a stork. Get up so we can knock you down again."
    },
    {
     "note": "The boys kick him. Nobody from the fire comes."
    },
    {
     "speaker": "narrator",
     "name": "Narrator",
     "text": "Nobody ever came. Nobody stood up for an orphaned road fae."
    },
    {
     "speaker": "captain",
     "name": "Captain Isolde Varr",
     "text": "That's enough. Go home, all of you, before I decide you're crew and put you to work."
    },
    {
     "note": "The boys scatter. Captain Isolde Varr kneels. Behind her, Elian Marsh with a chart case and Aurelio Fenn with a toolbag full of brass."
    },
    {
     "speaker": "captain",
     "name": "Captain Isolde Varr",
     "text": "Life is worth living, little one. If only to see what the world's still hiding."
    },
    {
     "speaker": "narrator",
     "name": "Narrator",
     "text": "They were recruiting. Strong backs and quick hands, for an expedition past anything anyone had charted."
    },
    {
     "speaker": "enkrid",
     "name": "Enkrid",
     "text": "I can work. I can fix things. I fixed the chapel clock."
    },
    {
     "speaker": "first_mate",
     "name": "Elian Marsh",
     "text": "How old are you? Nine? The Sea of Possibility doesn't care how clever you are. Grow first. Learn first."
    },
    {
     "speaker": "narrator",
     "name": "Narrator",
     "text": "They said no. He was bruised, and small, and nine."
    },
    {
     "speaker": "inventor",
     "name": "Aurelio Fenn",
     "text": "Wait. We can't leave him here like this."
    },
    {
     "speaker": "narrator",
     "name": "Narrator",
     "text": "So they paid. Four years at the Wright chapel: schooling, room and board, Brother Ansel's patience."
    },
    {
     "speaker": "captain",
     "name": "Captain Isolde Varr",
     "text": "When you're grown and done with school, come and find us. Ashford Roads. Any captain there will know our names."
    },
    {
     "speaker": "inventor",
     "name": "Aurelio Fenn",
     "text": "Here. It keeps time, and it'll remind you what you're keeping time for."
    },
    {
     "note": "Aurelio Fenn gives him the crystal-faced, engraved pocket watch. Close-up on the engraving (the user to write what it says)."
    },
    {
     "speaker": "narrator",
     "name": "Narrator",
     "text": "They left the next morning on the expedition they'd planned, and were never heard from again."
    },
    {
     "speaker": "narrator",
     "name": "Narrator",
     "text": "Everyone said they were lost. Enkrid wound the watch every night and decided everyone was wrong."
    },
    {
     "note": "Flashback ends on the Exchange steps."
    },
    {
     "speaker": "enkrid",
     "name": "Enkrid",
     "text": "They're alive. I'm going to find them."
    },
    {
     "speaker": "protag3",
     "name": "Tova",
     "text": "Then we'd better get bound. Sewers first."
    }
   ]
  },
  "ch1_sewer_enter": {
   "name": "Into the Undercourses",
   "style": "played",
   "lines": [
    {
     "note": "The heroes drop through a culvert hatch under Refinery Row. Warm, foul air. Rat noise everywhere."
    },
    {
     "speaker": "protag2",
     "name": "Rook",
     "text": "It's warm. Why is a sewer warm?"
    },
    {
     "speaker": "enkrid",
     "name": "Enkrid",
     "text": "Refinery run-off. Forty years of it."
    },
    {
     "note": "A side tunnel: three bodies in Coldwater colours, gnawed. A dropped journal."
    },
    {
     "speaker": "protag3",
     "name": "Tova",
     "text": "The sellswords. All three."
    },
    {
     "speaker": "protag2",
     "name": "Rook",
     "text": "Rats did this. Look at the marks. Lots of rats."
    },
    {
     "speaker": "enkrid",
     "name": "Enkrid",
     "text": "Rats don't usually finish a person."
    },
    {
     "note": "The journal's last page: \"Something in the big cistern. Lamps don't scare it. Light does.\" Kept as a clue item."
    }
   ]
  },
  "ch1_old_gnaw": {
   "name": "Old Gnaw",
   "style": "battle",
   "lines": [
    {
     "note": "A rat the size of a pony, with a dozen smaller rats. Battle: Old Gnaw and a rat swarm. Unclassed heroes: Strike, Aid, Stabilise, items."
    },
    {
     "speaker": "protag3",
     "name": "Tova",
     "text": "That is not a rat. That's a rat's landlord."
    },
    {
     "note": "After the win, no casualties."
    },
    {
     "speaker": "enkrid",
     "name": "Enkrid",
     "text": "We did that. Unclassed, with loaners."
    },
    {
     "speaker": "protag3",
     "name": "Tova",
     "text": "We did that. Keep going."
    },
    {
     "speaker": "narrator",
     "name": "Narrator",
     "text": "Confident now, they pressed on."
    }
   ]
  },
  "ch1_the_gloam": {
   "name": "The thing in the dark",
   "style": "battle",
   "lines": [
    {
     "note": "The Grate Chamber. Petra Tarrant is huddled on a ledge. Something made of dark and teeth uncoils in the cistern: the Gloam."
    },
    {
     "speaker": "petra",
     "name": "Petra Tarrant",
     "text": "Don't! It doesn't stop!"
    },
    {
     "note": "Battle: the Gloam. Its Resistance is far beyond the party. After two rounds it throws them back to the doorway."
    },
    {
     "speaker": "protag3",
     "name": "Tova",
     "text": "Everything I hit, it just isn't there anymore."
    },
    {
     "speaker": "protag2",
     "name": "Rook",
     "text": "Fighting it isn't working. Look at the room instead."
    },
    {
     "note": "A shaft of daylight through the street grate falls in a bright square on the floor. the Gloam flows around it, every time."
    },
    {
     "speaker": "enkrid",
     "name": "Enkrid",
     "text": "It won't touch the light."
    },
    {
     "speaker": "petra",
     "name": "Petra Tarrant",
     "text": "It goes still when the sun comes through. Every day, around noon. That's how I'm alive."
    }
   ]
  },
  "ch1_into_the_light": {
   "name": "Into the light",
   "style": "scene",
   "lines": [
    {
     "speaker": "protag3",
     "name": "Tova",
     "text": "So we put it in the light."
    },
    {
     "speaker": "protag2",
     "name": "Rook",
     "text": "The light's moving. The sun doesn't wait for us."
    },
    {
     "speaker": "enkrid",
     "name": "Enkrid",
     "text": "Then we move faster than the sun."
    },
    {
     "note": "Scene approaches, shown before the player picks: Bait it (Full, Combat Effort, takes hits). Block its exits (Full, Athletics). Angle the light with the charge lamp's mirror or by prying the grate wider (Full for Tinker, Half for others). Rig a line to drag the grate cover (Full for Sailor). Talk to Petra and read its pattern (Half, Craft Effort). Aid (Half)."
    },
    {
     "note": "Setbacks hit hit points and the loaned gear; each Setback marks one loaner Damaged."
    },
    {
     "speaker": "narrator",
     "name": "Narrator",
     "text": "They had underestimated how long the sun would take. They took every hit while it crawled across the floor."
    },
    {
     "note": "Win: the Gloam is caught in the light, goes rigid, and comes apart into warm grey fog that settles in the water. Petra Tarrant is free."
    },
    {
     "speaker": "petra",
     "name": "Petra Tarrant",
     "text": "You came all the way down here for me?"
    },
    {
     "speaker": "protag2",
     "name": "Rook",
     "text": "For your father's money. But also for you. Mostly the money."
    }
   ]
  },
  "ch1_danger_fee": {
   "name": "Paying for the loaners",
   "style": "played",
   "lines": [
    {
     "note": "Back at the Exchange. Petra is home; the fee is paid. The broker inspects the battered loaners."
    },
    {
     "speaker": "broker",
     "name": "Odile Sallow",
     "text": "Bent, chipped, cracked, and is that tooth marks? You'll pay for these."
    },
    {
     "speaker": "protag3",
     "name": "Tova",
     "text": "Then they're ours."
    },
    {
     "speaker": "broker",
     "name": "Odile Sallow",
     "text": "Then they're yours. Which leaves you short of four bindings by a little."
    },
    {
     "speaker": "enkrid",
     "name": "Enkrid",
     "text": "The sellswords' journal said light. You knew what was down there."
    },
    {
     "speaker": "broker",
     "name": "Odile Sallow",
     "text": "I suspected."
    },
    {
     "speaker": "protag2",
     "name": "Rook",
     "text": "Suspected is a word that costs a danger fee."
    },
    {
     "speaker": "protag3",
     "name": "Tova",
     "text": "Unless you'd like Coldwater to hear how their sellswords died."
    },
    {
     "note": "Beat. The broker counts out more coin."
    },
    {
     "speaker": "broker",
     "name": "Odile Sallow",
     "text": "Danger fee. Don't come back for a week. Actually, come back. I like you. I'll deny it."
    },
    {
     "speaker": "narrator",
     "name": "Narrator",
     "text": "Just enough to bind four. Not a copper over."
    },
    {
     "note": "The loaned gear is now owned. The broker's commissions board opens: F-grade work around Ashford."
    }
   ]
  },
  "ch1_binding": {
   "name": "Binding",
   "style": "played",
   "lines": [
    {
     "note": "The Binding House: a white hall, brass coils, glass cylinders of warm grey brume."
    },
    {
     "speaker": "binder",
     "name": "Binder Maren Quell",
     "text": "Cash or Compact debt?"
    },
    {
     "speaker": "protag3",
     "name": "Tova",
     "text": "Cash. All of it."
    },
    {
     "speaker": "binder",
     "name": "Binder Maren Quell",
     "text": "Rare. Choose your binding."
    },
    {
     "note": "The player chooses one of the twelve F-grade classes. The trio: Enkrid Bloodcharged, Rook Theorist, Tova Vanguard."
    },
    {
     "speaker": "binder",
     "name": "Binder Maren Quell",
     "text": "Hold still. I've stopped promising it won't hurt."
    }
   ]
  },
  "ch1_collapse": {
   "name": "It hurts",
   "style": "played",
   "lines": [
    {
     "note": "Binding: the brume flows in. White light. Everyone staggers. Enkrid drops."
    },
    {
     "speaker": "protag2",
     "name": "Rook",
     "text": "Is he breathing? He's fae. Is it different for fae?"
    },
    {
     "speaker": "binder",
     "name": "Binder Maren Quell",
     "text": "Fae take in more than they should. He'll live. He'll want a bed."
    },
    {
     "speaker": "protag3",
     "name": "Tova",
     "text": "Then he gets a bed. We stick together."
    },
    {
     "note": "They carry Enkrid to the Lantern and Lee."
    }
   ]
  },
  "ch1_inn_night": {
   "name": "A night at the Lantern and Lee",
   "style": "played",
   "lines": [
    {
     "speaker": "innkeeper",
     "name": "Old Dunmore",
     "text": "Monsterkin, fae, crow and whatever you are. One room. I don't ask, you don't break anything."
    },
    {
     "note": "Optional: talk to each of the trio before sleeping."
    },
    {
     "speaker": "protag3",
     "name": "Tova",
     "text": "I've never been bound before. I can feel the floor through my boots. I can feel the whole quay."
    },
    {
     "speaker": "protag2",
     "name": "Rook",
     "text": "My father would call this a waste of a good family's money. It's the first thing I've ever bought myself."
    },
    {
     "speaker": "enkrid",
     "name": "Enkrid",
     "text": "The watch stopped when I fell. It's ticking again now."
    },
    {
     "speaker": "narrator",
     "name": "Narrator",
     "text": "They slept late. Much too late."
    }
   ]
  },
  "ch1_missed_ship": {
   "name": "The Gilded Tern leaves without them",
   "style": "played",
   "lines": [
    {
     "note": "Midmorning. The heroes run onto the Long Quay. the Gilded Tern is loading. Captain Silvan Rourke stands at the gangway with Lady Celestine Varenne and her retinue."
    },
    {
     "speaker": "protag3",
     "name": "Tova",
     "text": "Captain! Four bound crew, ready to sign!"
    },
    {
     "speaker": "rourke",
     "name": "Captain Silvan Rourke",
     "text": "Four bound crew. Yesterday I'd have taken you. This morning, Lady Celestine Varenne needs the berths for her household."
    },
    {
     "speaker": "noble",
     "name": "Lady Celestine Varenne",
     "text": "Is that a troll?"
    },
    {
     "speaker": "protag3",
     "name": "Tova",
     "text": "Trollblood. And I'm crew."
    },
    {
     "speaker": "rourke",
     "name": "Captain Silvan Rourke",
     "text": "Not on my ship. No offence to your blood. It's business."
    },
    {
     "note": "The gangway comes up. the Gilded Tern slips its lines."
    },
    {
     "speaker": "enkrid",
     "name": "Enkrid",
     "text": "That was our ship."
    },
    {
     "speaker": "protag2",
     "name": "Rook",
     "text": "That was a ship."
    },
    {
     "speaker": "protag3",
     "name": "Tova",
     "text": "There'll be another. There's always another ship."
    },
    {
     "speaker": "narrator",
     "name": "Narrator",
     "text": "The first ship left without them."
    },
    {
     "note": "End of the demo. Title card: \"Possibilities\". The next chapter begins with the Second Captain."
    }
   ]
  }
 },
 "questions": [
  {
   "key": "q1",
   "question": "What is a class?",
   "answer": "What binding gives you. Brume possibility bound into your body, and with it the way you fight. Until you're bound you can swing a stick like anyone; after, you're a Vanguard, a Theorist, whatever you pay for."
  },
  {
   "key": "q2",
   "question": "What is a profession?",
   "answer": "What you do when nobody's trying to kill you. Anyone can learn one. It's how you earn, mend, chart and cook, and in a harbour it matters more than your class."
  },
  {
   "key": "q3",
   "question": "What is grade?",
   "answer": "How firmly a thing is written into the world. You're F, or you will be once you're bound. Water has a grade too. Sail into water above your grade and it will tell you so."
  },
  {
   "key": "q4",
   "question": "Why won't ships take unclassed crew?",
   "answer": "Because the sea outside the Reach is unfixed, and unfixed water eats the unbound. Insurers won't cover you. Captains won't carry what the insurers won't."
  },
  {
   "key": "q5",
   "question": "Who runs Ashford?",
   "answer": "The Compact owns the refinery, the licences and most of the captains. The Bench owns the charts. I own what everyone tells me."
  },
  {
   "key": "q6",
   "question": "Where did the legends' crew go?",
   "answer": "Out past Kelder's Wall, eight years ago, on the best-found ship that ever left this quay. Nobody's heard a word. That's the honest answer. The dishonest ones cost more."
  }
 ],
 "handouts": [
  {
   "key": "gate_notice",
   "title": "The notice on the gate",
   "step": "pc"
  },
  {
   "key": "commission",
   "title": "The commission",
   "step": "commission"
  },
  {
   "key": "sellswords_journal",
   "title": "The sellswords' journal",
   "step": "sewer"
  },
  {
   "key": "loaner_bill",
   "title": "The bill for the loaners",
   "step": "fee"
  },
  {
   "key": "binding_receipt",
   "title": "The binding receipt",
   "step": "binding"
  },
  {
   "key": "legends_page_1",
   "title": "The legends' journal, page 1",
   "step": "inn"
  }
 ],
 "intros": {
  "Founding": "ch1_intro_founding",
  "Beastkin": "ch1_intro_beastkin",
  "Fae": "ch1_intro_fae",
  "Monsterkin": "ch1_intro_monsterkin"
 },
 "trio": [
  "enkrid",
  "protag2",
  "protag3"
 ],
 "sunPath": [
  [
   460,
   1140
  ],
  [
   620,
   1120
  ],
  [
   780,
   1090
  ],
  [
   940,
   1060
  ],
  [
   1100,
   1040
  ],
  [
   1260,
   1010
  ],
  [
   1420,
   970
  ],
  [
   1580,
   920
  ]
 ],
 "ids": {
  "adventure": "YX66ZQDDcnYgeIQl",
  "journals": {
   "act1": "FqmctASVgNOqa5Yp",
   "ashford": "gkYPHeXfhgCqDwxP",
   "people": "7AYWf78KmJc6hQ7N",
   "questions": "DP5HHmTPLvsk1VVZ",
   "handouts": "b4PH7sCC5QhhMoFb",
   "glossary": "wTNyWNpN5x8c52UG",
   "story": "thAoW2AUqI1EJkHY"
  },
  "pages": {
   "act1": {
    "ch1_intro_founding": "rSwcnkkxFKmVpbdp",
    "ch1_intro_beastkin": "2KqtYrGD492STOq4",
    "ch1_intro_fae": "OwMYGCN6HZlHNWDC",
    "ch1_intro_monsterkin": "C9EL18iZUM8iFxl2",
    "ch1_broker": "HpHg1XupFATCx9Yz",
    "ch1_questions": "VEmX6B5K5ORZryl2",
    "ch1_commission": "g2DuoZDPWRMJUadb",
    "ch1_prologue": "CjrYJJMmNDmOtB6x",
    "ch1_sewer_enter": "ydCH2mNX1Qx1pxHD",
    "ch1_old_gnaw": "bgn5QqTyTzJTJtPI",
    "ch1_the_gloam": "ilQ8MjDQPF0iUEVy",
    "ch1_into_the_light": "8FE5334T8u8xFD6r",
    "ch1_danger_fee": "GL06GlncILyPjmOa",
    "ch1_binding": "XMagYFbj0oXyellh",
    "ch1_collapse": "NJRu3FwTMqHPBlZM",
    "ch1_inn_night": "JBY3bHogQ55mhmLd",
    "ch1_missed_ship": "71a0nMcZqeIpCxqD",
    "solo": "BpGvzihH7Jawv5J9",
    "glance": "BwCoT4xruXwe6eJU"
   },
   "ashford": {
    "enkrid_village": "HjkxabJtiSOqLsg9",
    "wright_chapel": "uUsiFBu9e0y6CN3P",
    "ashford": "frHVREY0e4zAFTV8",
    "coast_road": "1kmln4Um8HWlYr9J",
    "sallows_exchange": "jkMip23UKPrl1bEs",
    "refinery_row": "spAZd8Y3FA5DORPG",
    "undercourses": "Ppr8O3sxSTwogcCF",
    "grate_chamber": "bOmD3ijwMsL8Xuzf",
    "binding_house": "Mln7MMNN7spFmvYb",
    "lantern_lee": "ZSMUJHvShTblRkFF",
    "long_quay": "gyhOaqefqo2Rd4X8",
    "gilded_tern": "hxOrLw8aDrOEduNA",
    "coldwater": "4eOQqqPo0Cf65FZV"
   },
   "people": {
    "enkrid": "SckOKvFjQ9k4VTVq",
    "protag2": "Te4TLP8JkGCJAFcg",
    "protag3": "xAWmM5MTdUuUz5PG",
    "captain": "tcUl72prIAEvq3kn",
    "first_mate": "2Qnj0QU4MunyHZL9",
    "inventor": "eupmaxpn970L97tY",
    "ansel": "nouh5iWxfD3xkxKf",
    "dov": "BwBv05PAJllhsvax",
    "broker": "IBFCNSjRl9V3ti9l",
    "merchant": "arDE4nzPezgowpSw",
    "petra": "jOdKInfOpv6VfvdS",
    "binder": "BT49LS9a3pTVtbOv",
    "innkeeper": "Qk9KoH9YULgo4hh0",
    "rourke": "Ri1PPuPJASw76MOh",
    "noble": "HpH5UPbArT8Bg8ec",
    "old_gnaw": "lOA5CD1f1EUoBvb4",
    "gloam": "8Jpe30X8zvac8ZWo"
   },
   "questions": {
    "q1": "4bSfQjM170AnvAeO",
    "q2": "FKEciQcVGq72KipO",
    "q3": "JmZnU0uAbLemIKGH",
    "q4": "8VgvEcjtRMCM3UgY",
    "q5": "JUJ4GoJn9Lx1fuhS",
    "q6": "JdoKP1dbp2wy2wDI"
   },
   "handouts": {
    "gate_notice": "AG1K0OslvXjep12A",
    "commission": "80Tp5bPrBpumgeU5",
    "sellswords_journal": "JBDwPel14i7Xc1mv",
    "loaner_bill": "iy4F8VRYxJGowJvO",
    "binding_receipt": "oXiK5MhOgsV7fMCX",
    "legends_page_1": "PTFXcfn7SDKV6jOX"
   },
   "story": {
    "beat_pc": "3LwpfnxnYr5wvl4c",
    "beat_broker": "9unEOzvtG5cxP1lQ",
    "beat_questions": "blH9YNLbzy76IVtY",
    "beat_commission": "J4UDB683dlPpvHfz",
    "beat_prologue": "OYvmZQka4WlYtR4A",
    "beat_sewer": "FjaZmwyAy3ZQjivf",
    "beat_gnaw": "wuUvvbUO6KAkISps",
    "beat_gloam": "WgR6PG6WEvylp6CD",
    "beat_light": "t9FgKQuO3y5mjNey",
    "beat_fee": "7bN1yLkIshpWBtd3",
    "beat_binding": "C3oY9q0ODEAOtX8O",
    "beat_collapse": "5XcIyYdvDCQ5Qgjs",
    "beat_inn": "UbofVfQ8ikUaCNyI",
    "beat_ship": "GCT3FboBnw19mk6J",
    "log": "76AzNQxR8tBEgYZ4",
    "cover": "1DgbEjLik5VTdVcK"
   }
  },
  "actors": {
   "enkrid": "fMWLOVfCJAtgARWB",
   "protag2": "OyfDUQQ0ZsTMKR57",
   "protag3": "eOm3P4aqvuUldHmj",
   "broker": "p7taa9FObIr5KB75",
   "merchant": "ZdinBL8KoEyWutvs",
   "petra": "HgshpMXm9qOVuDqg",
   "binder": "Y84JqtjUWDq14XIg",
   "innkeeper": "PC7eW86GP7LoUv6a",
   "rourke": "5BENQMYJSZcuuv92",
   "noble": "XjJhidmvYFCNpssE",
   "captain": "ZGm1dcO3TTuuRJlb",
   "first_mate": "Jtrd5s6i5emQu7jF",
   "inventor": "gkNPwkf6y3707XBY",
   "ansel": "Fv3Ii7PhngJEF5ly",
   "dov": "FBByEVnHBuwQVtNi",
   "sellsword": "BLQo5Qt7YlnTSYIR",
   "rat": "hnprgeUrEBPaEcL2",
   "rat_swarm": "CaIa89DBftTWEZ6p",
   "old_gnaw": "BPsM8qRGzPdavixq",
   "gloam": "EfQzsDdc6fjxV6KT",
   "into_the_light": "RiSN1Ugn73gnNUAx"
  },
  "scenes": {
   "ashford": "8S3H8KGWHKFdajes",
   "sallows_exchange": "vr2Zexs5j6aNdqKi",
   "undercourses": "rJ6muOOBhezCzD0A",
   "grate_chamber": "qgyVQPidYMBChQsw",
   "binding_house": "XSSPaZAD26oKPOv2",
   "lantern_lee": "Pu8T5FnY31Pxkwrq",
   "long_quay": "AcDHF10TAlH0yKQn"
  },
  "items": {
   "loaner_blade": "m5yhrF5MTPPQjfBY",
   "charge_lamp": "Sf9Sm9lOBtBy5fCy",
   "pry_bar": "mBebFkndH8zefPBB",
   "pocket_watch": "Lg2bMYnbNpmBQxZZ",
   "sellswords_journal": "IiWbox4OXzyMAaBI",
   "kit_deckhand_0": "Gq0e1T35u0FcLVqw",
   "kit_deckhand_1": "Q1GEZTO1p7RTSd2w",
   "kit_deckhand_2": "xR8KLlxiyMKxA4fy",
   "kit_deckhand_3": "lrOkEmhDLcUZq5pi",
   "kit_scrivener_0": "aCBsnhcYEs2vEApA",
   "kit_scrivener_1": "VluoYwSqRSpEkZbc",
   "kit_scrivener_2": "1ottP42SZoIPatHi",
   "kit_scrivener_3": "ajJz7jBSTvmA7O8G",
   "kit_tinker_0": "GgsHQsHahapd6Ftl",
   "kit_tinker_1": "Tfy2msp5HXpjYI0p",
   "kit_tinker_2": "XtijPPVdDmdfCM3j",
   "kit_tinker_3": "FLOwAr8dMOBR1QZ9",
   "shop_longsword": "wayyAcVe56Tb9tLA",
   "shop_boat-hook": "95EDFTY1uTMfg8UH",
   "shop_hand-crossbow": "FMRHjRdShkSCmR3c",
   "shop_charge-pistol": "j2RLMo9CY5L4xT9n",
   "shop_padded-dock-coat": "n1amHIVNtW9ziB1R",
   "shop_riveted-brigandine": "XwB0yxw58zT9yGZZ",
   "shop_charge-cell": "64Ine1QaGqpD9vMT",
   "shop_hemp-rope-50-ft": "a2oqUqYTdq4BkRz1",
   "shop_lantern-oil-flask": "DjZ55ZIdPR2ipsK1",
   "shop_physician-s-tonic": "UVXxVoAH8D3rrbeP",
   "shop_hardtack-ration": "BvbtWLwZLkk49iDd",
   "shop_a-night-at-the-lantern-and-lee": "7NF2QU4REwgb5NCA"
  },
  "macros": {
   "openDirector": "cpuNHwXT3csvMf7i",
   "makeCharacter": "QA7ulVWhdcj87BLx",
   "openPurse": "XyVdkPyfLPCraG1p",
   "revealHandout": "GCdJtSqtt6T766rS",
   "gloamRebuff": "Dah1c4xYc0IYsl5n",
   "sunClock": "lzcaamptoehuDWha",
   "bindAll": "tMmmZkPVfnQcgqKz",
   "sessionLog": "MXA7gnlzveikpWIv",
   "oracle": "tqaDOkI6d9oWhaiM",
   "openStory": "1j3XnVCcrLTzFDeY",
   "giveLoaners": "y9Fkt8zQfP4m02Bu",
   "keepLoaners": "Hm7QCuIcSpq807VJ",
   "addTrio": "USop81rUl9hlIBoa",
   "startGnaw": "mmuN1lFrV3TRcBuK",
   "startGloam": "6UP1iU2wdalxYjtb",
   "startLight": "yCnKTWzqQ4MRx4XC",
   "enkridCollapses": "xyAPgJQT6zWWFt3e",
   "innRest": "9msOnk6mTOhxQviw",
   "endAct": "C3RzzejzYaUovfyg",
   "askBroker": "LXXO9fp7Bq0e6ot5",
   "copyStory": "Bj9qOeJFropdozD0",
   "milestone": "2pqACumby2aPzqfa",
   "brokerBoard": "GC9u2qkhqudvpqA5",
   "ratCull": "pT3kY569q8VUIwpN",
   "resetAct": "lLN9ux8RYQhZtW2K"
  },
  "table": "jK9lSfN5uS8Xo8oW",
  "sunLight": "REhPdJVnEtgJUp6Y"
 },
 "itemTemplates": {
  "loaner_blade": {
   "name": "Loaned blade",
   "type": "weapon",
   "img": "icons/weapons/swords/sword-guard-brown.webp",
   "system": {
    "grade": "F",
    "price": {
     "value": 5,
     "denom": "gp"
    },
    "loaned": true,
    "condition": "intact",
    "description": "<p>A plain short blade from the Exchange&#39;s back room, stamped SALLOW on the tang.</p>",
    "die": "d6",
    "range": "engaged",
    "traits": "basic",
    "equipped": false,
    "damage": "",
    "improvised": false,
    "tools": ""
   },
   "flags": {
    "possibilities-act1": {
     "key": "loaner_blade",
     "loaner": true,
     "count": 4
    }
   }
  },
  "charge_lamp": {
   "name": "Loaned charge lamp (with mirror)",
   "type": "gear",
   "img": "icons/sundries/lights/lantern-iron-lit-yellow.webp",
   "system": {
    "grade": "F",
    "price": {
     "value": 6,
     "denom": "gp"
    },
    "loaned": true,
    "condition": "intact",
    "description": "<p>A brass charge-lamp with a hinged mirror hood for throwing the beam.</p>",
    "quantity": 1,
    "keyItem": false
   },
   "flags": {
    "possibilities-act1": {
     "key": "charge_lamp",
     "loaner": true,
     "count": 1
    }
   }
  },
  "pry_bar": {
   "name": "Loaned pry bar",
   "type": "weapon",
   "img": "icons/tools/hand/pickaxe-steel-white.webp",
   "system": {
    "grade": "F",
    "price": {
     "value": 4,
     "denom": "gp"
    },
    "loaned": true,
    "condition": "intact",
    "description": "<p>Iron, a yard long, bent at one end.</p>",
    "die": "d4",
    "range": "engaged",
    "traits": "improvised: d4 at -2, unless your profession uses the tool (a Tinker uses it at d6, no penalty)",
    "equipped": false,
    "damage": "",
    "improvised": true,
    "tools": "Tinker"
   },
   "flags": {
    "possibilities-act1": {
     "key": "pry_bar",
     "loaner": true,
     "count": 1
    }
   }
  },
  "pocket_watch": {
   "name": "The inventor's pocket watch",
   "type": "gear",
   "img": "icons/tools/scribal/pocketwatch-gold.webp",
   "system": {
    "grade": "F",
    "price": {
     "value": 0,
     "denom": "gp"
    },
    "loaned": false,
    "condition": "intact",
    "description": "<p>Crystal-faced and engraved: a token of identity and remembrance of Enkrid&#39;s goals. The inventor leaves it with him before the legends depart. The engraving reads: ____________ (yours to write: edit this item&#39;s description once, and the flashback page points here).</p>",
    "quantity": 1,
    "keyItem": true
   },
   "flags": {
    "possibilities-act1": {
     "key": "pocket_watch",
     "keyItem": true,
     "holder": "enkrid",
     "handout": null
    }
   }
  },
  "sellswords_journal": {
   "name": "The sellswords' journal",
   "type": "gear",
   "img": "icons/sundries/books/book-worn-brown.webp",
   "system": {
    "grade": "F",
    "price": {
     "value": 0,
     "denom": "gp"
    },
    "loaned": false,
    "condition": "intact",
    "description": "<p>A Coldwater sellsword&#39;s pocket journal, found by the bodies in the Undercourses.</p>",
    "quantity": 1,
    "keyItem": true
   },
   "flags": {
    "possibilities-act1": {
     "key": "sellswords_journal",
     "keyItem": true,
     "holder": null,
     "handout": "sellswords_journal"
    }
   }
  },
  "kit_deckhand_0": {
   "name": "Hemp rope (50 ft)",
   "type": "gear",
   "img": "icons/containers/bags/pack-simple-leather-brown.webp",
   "system": {
    "grade": "F",
    "price": {
     "value": 1,
     "denom": "gp"
    },
    "loaned": false,
    "condition": "intact",
    "description": "",
    "quantity": 1,
    "keyItem": false
   },
   "flags": {
    "possibilities-act1": {
     "key": "kit_deckhand_0",
     "kit": "kit_deckhand",
     "kitName": "Deckhand's kit"
    }
   }
  },
  "kit_deckhand_1": {
   "name": "Deck knife",
   "type": "weapon",
   "img": "icons/weapons/swords/sword-guard-brown.webp",
   "system": {
    "grade": "F",
    "price": {
     "value": 2,
     "denom": "gp"
    },
    "loaned": false,
    "condition": "intact",
    "description": "",
    "die": "d4",
    "range": "engaged",
    "traits": "light",
    "equipped": false,
    "damage": "",
    "improvised": false,
    "tools": ""
   },
   "flags": {
    "possibilities-act1": {
     "key": "kit_deckhand_1",
     "kit": "kit_deckhand",
     "kitName": "Deckhand's kit"
    }
   }
  },
  "kit_deckhand_2": {
   "name": "Oilskin coat",
   "type": "gear",
   "img": "icons/containers/bags/pack-simple-leather-brown.webp",
   "system": {
    "grade": "F",
    "price": {
     "value": 2,
     "denom": "gp"
    },
    "loaned": false,
    "condition": "intact",
    "description": "",
    "quantity": 1,
    "keyItem": false
   },
   "flags": {
    "possibilities-act1": {
     "key": "kit_deckhand_2",
     "kit": "kit_deckhand",
     "kitName": "Deckhand's kit"
    }
   }
  },
  "kit_deckhand_3": {
   "name": "Hardtack ration",
   "type": "gear",
   "img": "icons/containers/bags/pack-simple-leather-brown.webp",
   "system": {
    "grade": "F",
    "price": {
     "value": 5,
     "denom": "sp"
    },
    "loaned": false,
    "condition": "intact",
    "description": "",
    "quantity": 3,
    "keyItem": false
   },
   "flags": {
    "possibilities-act1": {
     "key": "kit_deckhand_3",
     "kit": "kit_deckhand",
     "kitName": "Deckhand's kit"
    }
   }
  },
  "kit_scrivener_0": {
   "name": "Ink, pens and a chart roll",
   "type": "gear",
   "img": "icons/containers/bags/pack-simple-leather-brown.webp",
   "system": {
    "grade": "F",
    "price": {
     "value": 3,
     "denom": "gp"
    },
    "loaned": false,
    "condition": "intact",
    "description": "",
    "quantity": 1,
    "keyItem": false
   },
   "flags": {
    "possibilities-act1": {
     "key": "kit_scrivener_0",
     "kit": "kit_scrivener",
     "kitName": "Scrivener's kit"
    }
   }
  },
  "kit_scrivener_1": {
   "name": "Chalk and charcoal sticks",
   "type": "gear",
   "img": "icons/containers/bags/pack-simple-leather-brown.webp",
   "system": {
    "grade": "F",
    "price": {
     "value": 1,
     "denom": "sp"
    },
    "loaned": false,
    "condition": "intact",
    "description": "",
    "quantity": 6,
    "keyItem": false
   },
   "flags": {
    "possibilities-act1": {
     "key": "kit_scrivener_1",
     "kit": "kit_scrivener",
     "kitName": "Scrivener's kit"
    }
   }
  },
  "kit_scrivener_2": {
   "name": "Walking staff",
   "type": "weapon",
   "img": "icons/weapons/swords/sword-guard-brown.webp",
   "system": {
    "grade": "F",
    "price": {
     "value": 1,
     "denom": "gp"
    },
    "loaned": false,
    "condition": "intact",
    "description": "",
    "die": "d6",
    "range": "engaged",
    "traits": "two-handed",
    "equipped": false,
    "damage": "",
    "improvised": false,
    "tools": ""
   },
   "flags": {
    "possibilities-act1": {
     "key": "kit_scrivener_2",
     "kit": "kit_scrivener",
     "kitName": "Scrivener's kit"
    }
   }
  },
  "kit_scrivener_3": {
   "name": "Hardtack ration",
   "type": "gear",
   "img": "icons/containers/bags/pack-simple-leather-brown.webp",
   "system": {
    "grade": "F",
    "price": {
     "value": 5,
     "denom": "sp"
    },
    "loaned": false,
    "condition": "intact",
    "description": "",
    "quantity": 3,
    "keyItem": false
   },
   "flags": {
    "possibilities-act1": {
     "key": "kit_scrivener_3",
     "kit": "kit_scrivener",
     "kitName": "Scrivener's kit"
    }
   }
  },
  "kit_tinker_0": {
   "name": "Tinker's tools",
   "type": "gear",
   "img": "icons/containers/bags/pack-simple-leather-brown.webp",
   "system": {
    "grade": "F",
    "price": {
     "value": 5,
     "denom": "gp"
    },
    "loaned": false,
    "condition": "intact",
    "description": "",
    "quantity": 1,
    "keyItem": false
   },
   "flags": {
    "possibilities-act1": {
     "key": "kit_tinker_0",
     "kit": "kit_tinker",
     "kitName": "Tinker's roll"
    }
   }
  },
  "kit_tinker_1": {
   "name": "Spare charge cell",
   "type": "gear",
   "img": "icons/containers/bags/pack-simple-leather-brown.webp",
   "system": {
    "grade": "F",
    "price": {
     "value": 2,
     "denom": "gp"
    },
    "loaned": false,
    "condition": "intact",
    "description": "",
    "quantity": 2,
    "keyItem": false
   },
   "flags": {
    "possibilities-act1": {
     "key": "kit_tinker_1",
     "kit": "kit_tinker",
     "kitName": "Tinker's roll"
    }
   }
  },
  "kit_tinker_2": {
   "name": "Spanner",
   "type": "weapon",
   "img": "icons/weapons/swords/sword-guard-brown.webp",
   "system": {
    "grade": "F",
    "price": {
     "value": 1,
     "denom": "gp"
    },
    "loaned": false,
    "condition": "intact",
    "description": "",
    "die": "d4",
    "range": "engaged",
    "traits": "light",
    "equipped": false,
    "damage": "",
    "improvised": false,
    "tools": ""
   },
   "flags": {
    "possibilities-act1": {
     "key": "kit_tinker_2",
     "kit": "kit_tinker",
     "kitName": "Tinker's roll"
    }
   }
  },
  "kit_tinker_3": {
   "name": "Hardtack ration",
   "type": "gear",
   "img": "icons/containers/bags/pack-simple-leather-brown.webp",
   "system": {
    "grade": "F",
    "price": {
     "value": 5,
     "denom": "sp"
    },
    "loaned": false,
    "condition": "intact",
    "description": "",
    "quantity": 3,
    "keyItem": false
   },
   "flags": {
    "possibilities-act1": {
     "key": "kit_tinker_3",
     "kit": "kit_tinker",
     "kitName": "Tinker's roll"
    }
   }
  },
  "shop_longsword": {
   "name": "Longsword",
   "type": "weapon",
   "img": "icons/weapons/swords/sword-guard-brown.webp",
   "system": {
    "grade": "F",
    "price": {
     "value": 15,
     "denom": "gp"
    },
    "loaned": false,
    "condition": "intact",
    "description": "",
    "die": "d8",
    "range": "engaged",
    "traits": "versatile",
    "equipped": false,
    "damage": "",
    "improvised": false,
    "tools": ""
   },
   "flags": {
    "possibilities-act1": {
     "key": "shop_longsword",
     "shop": true
    }
   }
  },
  "shop_boat-hook": {
   "name": "Boat hook",
   "type": "weapon",
   "img": "icons/weapons/swords/sword-guard-brown.webp",
   "system": {
    "grade": "F",
    "price": {
     "value": 4,
     "denom": "gp"
    },
    "loaned": false,
    "condition": "intact",
    "description": "",
    "die": "d6",
    "range": "engaged",
    "traits": "reach to Near",
    "equipped": false,
    "damage": "",
    "improvised": false,
    "tools": ""
   },
   "flags": {
    "possibilities-act1": {
     "key": "shop_boat-hook",
     "shop": true
    }
   }
  },
  "shop_hand-crossbow": {
   "name": "Hand crossbow",
   "type": "weapon",
   "img": "icons/weapons/swords/sword-guard-brown.webp",
   "system": {
    "grade": "F",
    "price": {
     "value": 25,
     "denom": "gp"
    },
    "loaned": false,
    "condition": "intact",
    "description": "",
    "die": "d6",
    "range": "far",
    "traits": "reload 1 action",
    "equipped": false,
    "damage": "",
    "improvised": false,
    "tools": ""
   },
   "flags": {
    "possibilities-act1": {
     "key": "shop_hand-crossbow",
     "shop": true
    }
   }
  },
  "shop_charge-pistol": {
   "name": "Charge pistol",
   "type": "weapon",
   "img": "icons/weapons/swords/sword-guard-brown.webp",
   "system": {
    "grade": "F",
    "price": {
     "value": 45,
     "denom": "gp"
    },
    "loaned": false,
    "condition": "intact",
    "description": "",
    "die": "d8",
    "range": "far",
    "traits": "needs a charge cell per 6 shots",
    "equipped": false,
    "damage": "",
    "improvised": false,
    "tools": ""
   },
   "flags": {
    "possibilities-act1": {
     "key": "shop_charge-pistol",
     "shop": true
    }
   }
  },
  "shop_padded-dock-coat": {
   "name": "Padded dock coat",
   "type": "armour",
   "img": "icons/equipment/chest/coat-leather-brown.webp",
   "system": {
    "grade": "F",
    "price": {
     "value": 10,
     "denom": "gp"
    },
    "loaned": false,
    "condition": "intact",
    "description": "",
    "armourType": "Light",
    "bonus": 0,
    "equipped": false
   },
   "flags": {
    "possibilities-act1": {
     "key": "shop_padded-dock-coat",
     "shop": true
    }
   }
  },
  "shop_riveted-brigandine": {
   "name": "Riveted brigandine",
   "type": "armour",
   "img": "icons/equipment/chest/coat-leather-brown.webp",
   "system": {
    "grade": "F",
    "price": {
     "value": 30,
     "denom": "gp"
    },
    "loaned": false,
    "condition": "intact",
    "description": "",
    "armourType": "Medium",
    "bonus": 0,
    "equipped": false
   },
   "flags": {
    "possibilities-act1": {
     "key": "shop_riveted-brigandine",
     "shop": true
    }
   }
  },
  "shop_charge-cell": {
   "name": "Charge cell",
   "type": "gear",
   "img": "icons/containers/bags/pack-simple-leather-brown.webp",
   "system": {
    "grade": "F",
    "price": {
     "value": 2,
     "denom": "gp"
    },
    "loaned": false,
    "condition": "intact",
    "description": "",
    "quantity": 1,
    "keyItem": false
   },
   "flags": {
    "possibilities-act1": {
     "key": "shop_charge-cell",
     "shop": true
    }
   }
  },
  "shop_hemp-rope-50-ft": {
   "name": "Hemp rope (50 ft)",
   "type": "gear",
   "img": "icons/containers/bags/pack-simple-leather-brown.webp",
   "system": {
    "grade": "F",
    "price": {
     "value": 1,
     "denom": "gp"
    },
    "loaned": false,
    "condition": "intact",
    "description": "",
    "quantity": 1,
    "keyItem": false
   },
   "flags": {
    "possibilities-act1": {
     "key": "shop_hemp-rope-50-ft",
     "shop": true
    }
   }
  },
  "shop_lantern-oil-flask": {
   "name": "Lantern oil (flask)",
   "type": "gear",
   "img": "icons/containers/bags/pack-simple-leather-brown.webp",
   "system": {
    "grade": "F",
    "price": {
     "value": 1,
     "denom": "sp"
    },
    "loaned": false,
    "condition": "intact",
    "description": "",
    "quantity": 1,
    "keyItem": false
   },
   "flags": {
    "possibilities-act1": {
     "key": "shop_lantern-oil-flask",
     "shop": true
    }
   }
  },
  "shop_physician-s-tonic": {
   "name": "Physician's tonic",
   "type": "gear",
   "img": "icons/containers/bags/pack-simple-leather-brown.webp",
   "system": {
    "grade": "F",
    "price": {
     "value": 5,
     "denom": "gp"
    },
    "loaned": false,
    "condition": "intact",
    "description": "<p>Drink (1 action): heal 1d6 + 1.</p>",
    "quantity": 1,
    "keyItem": false
   },
   "flags": {
    "possibilities-act1": {
     "key": "shop_physician-s-tonic",
     "shop": true
    }
   }
  },
  "shop_hardtack-ration": {
   "name": "Hardtack ration",
   "type": "gear",
   "img": "icons/containers/bags/pack-simple-leather-brown.webp",
   "system": {
    "grade": "F",
    "price": {
     "value": 5,
     "denom": "sp"
    },
    "loaned": false,
    "condition": "intact",
    "description": "",
    "quantity": 1,
    "keyItem": false
   },
   "flags": {
    "possibilities-act1": {
     "key": "shop_hardtack-ration",
     "shop": true
    }
   }
  },
  "shop_a-night-at-the-lantern-and-lee": {
   "name": "A night at the Lantern and Lee",
   "type": "gear",
   "img": "icons/containers/bags/pack-simple-leather-brown.webp",
   "system": {
    "grade": "F",
    "price": {
     "value": 5,
     "denom": "sp"
    },
    "loaned": false,
    "condition": "intact",
    "description": "",
    "quantity": 1,
    "keyItem": false
   },
   "flags": {
    "possibilities-act1": {
     "key": "shop_a-night-at-the-lantern-and-lee",
     "shop": true
    }
   }
  }
 },
 "macros": [
  {
   "fn": "openDirector",
   "name": "Act 1 Director",
   "slot": 1,
   "help": "The 14 steps of Act 1 in order, with read-aloud, pages, maps and ticks (also Shift+A)."
  },
  {
   "fn": "makeCharacter",
   "name": "Make your character",
   "slot": 2,
   "help": "The creator: race, profession, skills, looks, name. Picks your race family's Coast Road intro."
  },
  {
   "fn": "openPurse",
   "name": "Purse",
   "slot": 3,
   "help": "The party's coin against four bindings, with the reward, the loaner bill and the danger fee."
  },
  {
   "fn": "revealHandout",
   "name": "Show a handout",
   "slot": 4,
   "help": "Pick a handout: it is shown to the table and kept in the Handouts journal."
  },
  {
   "fn": "gloamRebuff",
   "name": "The Gloam throws them back",
   "slot": 5,
   "help": "Ends the first Gloam fight: everyone is pushed back to the doorway, nobody is lost."
  },
  {
   "fn": "sunClock",
   "name": "Advance the sun",
   "slot": 6,
   "help": "Ticks the Into the light Scene's clock and moves the shaft of sunlight one step across the Grate Chamber."
  },
  {
   "fn": "bindAll",
   "name": "Binding",
   "slot": 7,
   "help": "Binds every hero: you pick your class; the trio take theirs from the story."
  },
  {
   "fn": "sessionLog",
   "name": "Write the session log",
   "slot": 8,
   "help": "Adds today's entry to My Story: the steps you played since the last entry."
  },
  {
   "fn": "oracle",
   "name": "Ask the oracle",
   "slot": 9,
   "help": "Solo play: a yes/no question, likely / even / unlikely; Yes, and / Yes / Yes, but / No, but / No / No, and."
  },
  {
   "fn": "openStory",
   "name": "My Story",
   "slot": 10,
   "help": "Opens your chronicle at the current beat."
  },
  {
   "fn": "giveLoaners",
   "name": "Hand out the loaners",
   "slot": null,
   "help": "One loaned blade each, plus the charge lamp and the pry bar."
  },
  {
   "fn": "keepLoaners",
   "name": "The loaners are ours",
   "slot": null,
   "help": "After the danger fee: every loaner becomes the party's own (damage and all)."
  },
  {
   "fn": "addTrio",
   "name": "Add the trio to the party",
   "slot": null,
   "help": "Gives you ownership of Enkrid, Rook and Tova and puts their tokens on the current map."
  },
  {
   "fn": "startGnaw",
   "name": "Start the Old Gnaw fight",
   "slot": null,
   "help": "Places Old Gnaw and three rats in the Undercourses and starts the combat."
  },
  {
   "fn": "startGloam",
   "name": "Start the Gloam fight",
   "slot": null,
   "help": "The Grate Chamber: the Gloam uncoils. Ends itself after two rounds."
  },
  {
   "fn": "startLight",
   "name": "Start Into the light",
   "slot": null,
   "help": "Opens the Into the light Scene, resets its Resistance and the sun clock."
  },
  {
   "fn": "enkridCollapses",
   "name": "Enkrid collapses",
   "slot": null,
   "help": "Enkrid drops after his binding; he is down until the inn."
  },
  {
   "fn": "innRest",
   "name": "Rest at the inn",
   "slot": null,
   "help": "A long rest at the Lantern and Lee for every hero; Enkrid gets up."
  },
  {
   "fn": "endAct",
   "name": "End of Act 1",
   "slot": null,
   "help": "The Gilded Tern leaves: the title card, and the session log."
  },
  {
   "fn": "askBroker",
   "name": "The broker's questions",
   "slot": null,
   "help": "Pick a question; the broker's answer is read to chat."
  },
  {
   "fn": "copyStory",
   "name": "Copy my story",
   "slot": null,
   "help": "My Story as clean text, on the clipboard and in a window, ready to paste into Word."
  },
  {
   "fn": "milestone",
   "name": "Apply the milestone",
   "slot": null,
   "help": "The end of Act 1: every hero's profession goes up a rank (Draft)."
  },
  {
   "fn": "brokerBoard",
   "name": "The broker's board",
   "slot": null,
   "help": "Side work: draws an F-grade commission (optional)."
  },
  {
   "fn": "ratCull",
   "name": "Rat cull",
   "slot": null,
   "help": "Side work: one rat swarm in the outer Undercourses (optional)."
  },
  {
   "fn": "resetAct",
   "name": "Reset Act 1",
   "slot": null,
   "help": "Back to the start for a replay. Asks first. Your My Story pages are kept."
  }
 ]
};
