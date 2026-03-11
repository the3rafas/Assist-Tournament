export interface Player {
  id: number;
  name: string;
  phone: string;
  age: string;
}

export interface Match {
  player1: Player;
  player2: Player;
  winnerId?: number;
  score?: string;
  group?: boolean;
  date: string;
}

export interface BracketRound {
  round: number;
  matches: Match[];
  active: boolean;
  thirdPlaceMatch?: Match;
}

export type BracketData = BracketRound[];
