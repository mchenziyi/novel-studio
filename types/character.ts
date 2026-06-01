export interface Character {
  id: string;
  name: string;
  role: 'protagonist' | 'antagonist' | 'supporting';
  status: 'alive' | 'dead' | 'unknown';
  description: string;
  relations: CharacterRelation[];
  firstAppearance: number;
  lastAppearance?: number;
}

export interface CharacterRelation {
  target: string;
  type: 'family' | 'friend' | 'enemy' | 'lover' | 'colleague' | 'mentor' | 'rival';
  strength: number; // 0-1
  description?: string;
}
