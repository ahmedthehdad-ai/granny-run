
export interface Entity {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Player extends Entity {
  vy: number;
  isJumping: boolean;
  isDucking: boolean;
}

export enum ObstacleType {
  TRASH_CAN,
  FLYING_CAT
}

export interface Obstacle extends Entity {
  speed: number;
  type: ObstacleType;
}

export enum GameStatus {
  START,
  PLAYING,
  GAMEOVER
}

export interface GameState {
  status: GameStatus;
  score: number;
  highScore: number;
  commentary: string;
}
