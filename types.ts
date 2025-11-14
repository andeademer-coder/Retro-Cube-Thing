export type CellValue = keyof typeof import('./constants').TETROMINOES | 0;
export type Cell = [CellValue, 'clear' | 'merged' | 'ghost'];
export type Board = Cell[][];

export type Player = {
  pos: { x: number; y: number };
  tetromino: CellValue[][];
  collided: boolean;
};

export type TetrominoShape = {
  shape: CellValue[][];
  color: string;
};

export type TetrominoesMap = {
  0: { shape: [[0]]; color: string; };
  I: TetrominoShape;
  J: TetrominoShape;
  L: TetrominoShape;
  O: TetrominoShape;
  S: TetrominoShape;
  T: TetrominoShape;
  Z: TetrominoShape;
};