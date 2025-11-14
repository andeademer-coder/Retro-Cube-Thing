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

export type DebrisParticle = {
  type: 'debris';
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  shapePoints: { x: number; y: number }[];
  boundingRadius: number;
  rotation: number;
  rotationSpeed: number;
  shade: number;
};

export type SmokeParticle = {
  type: 'smoke'; // Used for Wasteland dust and Volcanic smoke
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  initialLife: number;
  life: number;
  color: { r: number, g: number, b: number };
};

export type LeafParticle = {
    type: 'leaf';
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    initialLife: number;
    life: number;
    rotation: number;
    rotationSpeed: number;
    flutter: number;
    color: string;
};

export type EmberParticle = {
    type: 'ember';
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    initialLife: number;
    life: number;
};

export type SparkleParticle = {
    type: 'sparkle';
    x: number;
    y: number;
    radius: number;
    initialLife: number;
    life: number;
    color: string;
};


export type Particle = DebrisParticle | SmokeParticle | LeafParticle | EmberParticle | SparkleParticle;

export type BackgroundTheme = 'FOREST' | 'WASTELAND' | 'VOLCANIC' | 'SPACE';