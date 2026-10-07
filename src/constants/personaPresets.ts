export type PresetGroupId = 'era' | 'role' | 'tone';

export interface PresetOption {
  id: string;
  label: string;
  /** Extra guidance sent to the model when this preset is selected */
  hint: string;
}

export interface PresetGroup {
  id: PresetGroupId;
  label: string;
  /** Label used in the generation request, e.g. "Era" */
  promptLabel: string;
  options: PresetOption[];
}

/** Selected preset option id per group (absent = none selected) */
export type PresetSelection = Partial<Record<PresetGroupId, string>>;

export const PERSONA_PRESET_GROUPS: PresetGroup[] = [
  {
    id: 'era',
    label: 'Era',
    promptLabel: 'Era',
    options: [
      { id: 'old-republic', label: 'Old Republic', hint: 'thousands of years before the Skywalker saga; ancient Jedi and Sith wars' },
      { id: 'high-republic', label: 'High Republic', hint: 'golden age of the Jedi; Starlight Beacon, hyperspace exploration, the Nihil' },
      { id: 'clone-wars', label: 'Clone Wars', hint: 'Republic vs. Separatists; clone troopers, battle droids, Jedi generals' },
      { id: 'empire', label: 'Galactic Empire', hint: 'Imperial reign; Darth Vader, stormtroopers, the Rebellion rising' },
      { id: 'new-republic', label: 'New Republic', hint: 'after the Empire fell; Imperial remnants, Mandalorian bounty hunts' },
      { id: 'first-order', label: 'First Order', hint: 'sequel era; the Resistance, Starkiller Base, Kylo Ren' },
    ],
  },
  {
    id: 'role',
    label: 'Faction / Role',
    promptLabel: 'Faction/Role',
    options: [
      { id: 'jedi', label: 'Jedi', hint: 'guardian of peace, follows the Jedi Code and the light side' },
      { id: 'sith', label: 'Sith', hint: 'dark side user driven by passion, power and the Rule of Two' },
      { id: 'mandalorian', label: 'Mandalorian', hint: 'warrior culture, beskar armor, "This is the Way"' },
      { id: 'bounty-hunter', label: 'Bounty Hunter', hint: 'mercenary who takes contracts and lives by the hunt' },
      { id: 'smuggler', label: 'Smuggler', hint: 'roguish spacer running cargo, dodging Imperials and Hutts' },
      { id: 'droid', label: 'Droid', hint: 'mechanical being with protocols, functions and droid quirks' },
      { id: 'imperial-officer', label: 'Imperial Officer', hint: 'disciplined servant of the Empire, loyal to order and rank' },
      { id: 'rebel', label: 'Rebel', hint: 'freedom fighter of the Rebel Alliance, hopeful and defiant' },
      { id: 'senator', label: 'Senator', hint: 'galactic politician, diplomatic and versed in Senate procedure' },
    ],
  },
  {
    id: 'tone',
    label: 'Tone',
    promptLabel: 'Tone',
    options: [
      { id: 'wise', label: 'Wise', hint: 'calm, thoughtful, speaks in measured insight' },
      { id: 'menacing', label: 'Menacing', hint: 'cold, intimidating, quietly threatening' },
      { id: 'comedic', label: 'Comedic', hint: 'witty and playful, quick with a joke' },
      { id: 'gruff', label: 'Gruff', hint: 'blunt, terse, short on patience' },
      { id: 'cheerful', label: 'Cheerful', hint: 'upbeat, warm and enthusiastic' },
      { id: 'mysterious', label: 'Mysterious', hint: 'cryptic, reveals little, speaks in riddles' },
    ],
  },
];

/** Turns a selection into lines like "Era: Clone Wars (Republic vs. ...)" for the generation request. */
export function describePresetSelection(selection: PresetSelection): string[] {
  const lines: string[] = [];
  for (const group of PERSONA_PRESET_GROUPS) {
    const opt = group.options.find((o) => o.id === selection[group.id]);
    if (opt) lines.push(`${group.promptLabel}: ${opt.label} (${opt.hint})`);
  }
  return lines;
}
