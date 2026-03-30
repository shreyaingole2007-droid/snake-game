export type Point = {
  x: number;
  y: number;
};

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export type GameStatus = 'START' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export type PowerUpType = 'GOLDEN_APPLE';

export interface PowerUp {
  position: Point;
  type: PowerUpType;
  expiresAt: number;
}

export interface GameState {
  snake: Point[];
  food: Point;
  powerUp: PowerUp | null;
  obstacles: Point[];
  direction: Direction;
  nextDirection: Direction;
  score: number;
  highScore: number;
  level: number;
  status: GameStatus;
  speed: number;
  isDoublePoints: boolean;
}
