export interface MissionStats {
  health: number;
  credits: number;
  inventory: string[];
  objective: string;
  /** 'active' while playing; the GM flips it to 'victory' or 'defeat' to end the mission */
  status: 'active' | 'victory' | 'defeat';
}

export interface MissionScenario {
  id: string;
  title: string;
  icon: string;
  location: string;
  blurb: string;
  /** Shown to the player as the first GM narration; also seeded into the conversation */
  openingScene: string;
  openingChoices: string[];
  start: MissionStats;
  /** Extra art direction for the "Visualize scene" image prompt */
  imageStyle: string;
}

export const MISSIONS: MissionScenario[] = [
  {
    id: 'death-star',
    title: 'Escape the Death Star',
    icon: '◎',
    location: 'Death Star, Alderaan system',
    blurb: 'Your freighter has been pulled in by a tractor beam. Find a way off the battle station before Vader finds you.',
    openingScene:
      "The tractor beam's hum fades as your battered freighter settles into Docking Bay 327. Through the viewport you see a squad of stormtroopers marching up the ramp, and an Imperial officer barking orders at a scanning crew. You and your co-pilot are hidden in the smuggling compartments beneath the deck plates — for now. Somewhere on this moon-sized station is the tractor beam generator, and somewhere is your only way out.",
    openingChoices: [
      'Wait for the scanning crew and ambush them for their uniforms',
      'Slip out through the maintenance hatch toward the hangar control room',
      'Slice into the ship computer to spoof a false departure log',
    ],
    start: {
      health: 100,
      credits: 250,
      inventory: ['DL-44 blaster pistol', 'Comlink', 'Smuggler\'s datapad'],
      objective: 'Disable the tractor beam and escape the Death Star',
      status: 'active',
    },
    imageStyle: 'cinematic Star Wars concept art, Imperial battle station interior, cold grey corridors, dramatic lighting',
  },
  {
    id: 'canto-bight',
    title: 'Heist on Canto Bight',
    icon: '◇',
    location: 'Canto Bight, Cantonica',
    blurb: 'An arms dealer keeps a codebreaker locked in the casino vault. Talk, bribe, or blast your way to it.',
    openingScene:
      "Music spills from the Canto Casino as fathiers race on the tracks below. You stroll through the gilded doors wearing borrowed finery that itches at the collar. Your target — a slicer known only as 'the Master Codebreaker' — is somewhere in the high-roller lounge, and the arms dealer you need to rob keeps his vault key on a chain around his neck. A Canto Bight police droid swivels its head toward you as you pass.",
    openingChoices: [
      'Head to the sabacc tables and try to win your way into the high-roller lounge',
      'Charm the arms dealer\'s bodyguard at the bar',
      'Find a service corridor and look for the vault',
    ],
    start: {
      health: 100,
      credits: 1500,
      inventory: ['Hold-out blaster', 'Fake invitation', 'Slicing spike'],
      objective: 'Recruit the Master Codebreaker and steal the vault data',
      status: 'active',
    },
    imageStyle: 'cinematic Star Wars concept art, opulent casino city, warm golden light, glamorous crowds',
  },
  {
    id: 'tatooine-hunt',
    title: 'Hunt on Tatooine',
    icon: '☼',
    location: 'Mos Espa, Tatooine',
    blurb: 'Jabba has posted a bounty on a Rodian smuggler hiding somewhere in the Dune Sea. Bring him in — or cut a better deal.',
    openingScene:
      "Twin suns hammer the streets of Mos Espa. The bounty puck in your palm flickers with the face of Greeta, a Rodian smuggler who skipped out on a debt to Jabba the Hutt. Rumor in the cantina says he paid a Jawa sandcrawler to carry him into the Dune Sea, but rumors on Tatooine are cheap and Tusken Raiders are not. Your speeder bike is low on fuel and a rival bounty hunter in Mandalorian armor just took the stool beside you.",
    openingChoices: [
      'Ask the Mandalorian, carefully, what job brings him to Mos Espa',
      'Buy fuel and head straight out toward the Dune Sea',
      'Bribe the cantina bartender for better information',
    ],
    start: {
      health: 100,
      credits: 400,
      inventory: ['Bounty puck', 'Blaster rifle', 'Macrobinoculars', 'Water canteen'],
      objective: 'Capture Greeta the Rodian and deliver him to Jabba\'s palace',
      status: 'active',
    },
    imageStyle: 'cinematic Star Wars concept art, desert planet, twin suns, sand-blasted adobe architecture, heat haze',
  },
  {
    id: 'echo-base',
    title: 'Defend Echo Base',
    icon: '❄',
    location: 'Echo Base, Hoth',
    blurb: 'Imperial walkers are advancing across the ice fields. Buy time for the transports to evacuate.',
    openingScene:
      "Klaxons echo through the ice tunnels of Echo Base. 'Imperial walkers on the north ridge!' General Rieekan's voice crackles over every comlink. Transports are loading, but the shield generator must hold until the last ship clears the atmosphere. You are a Rebel lieutenant with a squad of four troopers, a frozen trench line, and one snowspeeder still being refueled in the hangar.",
    openingChoices: [
      'Take the snowspeeder and try to trip the walkers with a tow cable',
      'Rally your squad in the trenches around the shield generator',
      'Help the ground crew load the last transport faster',
    ],
    start: {
      health: 100,
      credits: 50,
      inventory: ['A280 blaster rifle', 'Thermal detonator', 'Rebel comlink', 'Cold-weather gear'],
      objective: 'Hold the line until all transports evacuate Hoth',
      status: 'active',
    },
    imageStyle: 'cinematic Star Wars concept art, frozen ice planet battlefield, AT-AT walkers in snow, smoke and blaster fire',
  },
  {
    id: 'ilum-trials',
    title: 'Jedi Trials on Ilum',
    icon: '✧',
    location: 'Crystal Caves, Ilum',
    blurb: 'Enter the sacred caves alone and face your own fears to claim a kyber crystal before the cave entrance freezes shut.',
    openingScene:
      "The Gathering has begun. Master Yoda's words still echo in your mind as the ice seals behind you: 'Find your crystal before the sun sets, you must — or trapped here until it rises again, you will be.' The cavern walls glitter with a thousand points of light, and somewhere deeper a single crystal calls to you through the Force. But the cave is known to show each initiate a vision of what they fear most — and you can already hear a voice that sounds like your own.",
    openingChoices: [
      'Close your eyes and follow the call of the Force',
      'Follow the voice that sounds like your own',
      'Search the walls carefully for any crystal you can see',
    ],
    start: {
      health: 100,
      credits: 0,
      inventory: ['Training lightsaber hilt (no crystal)', 'Glow rod', 'Jedi robes'],
      objective: 'Claim your kyber crystal and leave the cave before sunset',
      status: 'active',
    },
    imageStyle: 'cinematic Star Wars concept art, glowing crystal ice cave, mystical blue light, lone Jedi initiate',
  },
];
