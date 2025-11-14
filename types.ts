export type CellValue = keyof typeof import('./constants').TETROMINOES | 0;
export type Cell = [CellValue, 'clear' | 'merged' | 'ghost' | 'cracking'];
export type Board = Cell[][];

export type Player = {
  pos: { x: number; y: number };
  tetromino: CellValue[][];
  collided: boolean;
};

export type TetrominoShape = {
  shape: CellValue[][];
  colorClass: string;
  colorValue: string;
};

export type TetrominoesMap = {
  0: { shape: [[0]]; colorClass: string; colorValue: string; };
  I: TetrominoShape;
  J: TetrominoShape;
  L: TetrominoShape;
  O: TetrominoShape;
  S: TetrominoShape;
  T: TetrominoShape;
  Z: TetrominoShape;
};

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  width: number;
  height: number;
  rotation: number;
  rotationSpeed: number;
};
