// Investigator sheets — ENG/05 investigators.pdf.
export interface InvestigatorDef {
  id: string;
  name: string;
  pawn: string;
  fastTalk: number;
  fight: number;
  knowledge: number;
  sneak: number;
}

export const INVESTIGATORS: InvestigatorDef[] = [
  { id: 'vincent_lee', name: 'Vincent Lee', pawn: '#1b1b1b', fastTalk: 1, fight: 4, knowledge: 4, sneak: 4 },
  { id: 'gloria_goldberg', name: 'Gloria Goldberg', pawn: '#8a8a8a', fastTalk: 5, fight: 4, knowledge: 3, sneak: 2 },
  { id: 'joe_diamond', name: 'Joe Diamond', pawn: '#d42a1e', fastTalk: 4, fight: 5, knowledge: 2, sneak: 3 },
  { id: 'monterey_jack', name: 'Monterey Jack', pawn: '#ec7a1c', fastTalk: 2, fight: 4, knowledge: 3, sneak: 5 },
  { id: 'jenny_barnes', name: 'Jenny Barnes', pawn: '#6a3d9a', fastTalk: 3, fight: 3, knowledge: 4, sneak: 4 },
  { id: 'mandy_thompson', name: 'Mandy Thompson', pawn: '#2f8f3a', fastTalk: 4, fight: 3, knowledge: 4, sneak: 3 },
  { id: 'carolyn_fern', name: 'Carolyn Fern', pawn: '#2b3d9a', fastTalk: 4, fight: 4, knowledge: 3, sneak: 3 },
  { id: 'harvey_walters', name: 'Harvey Walters', pawn: '#e8c51c', fastTalk: 2, fight: 3, knowledge: 5, sneak: 3 },
];

export const INVESTIGATOR_BY_ID: Record<string, InvestigatorDef> = Object.fromEntries(INVESTIGATORS.map((d) => [d.id, d]));
