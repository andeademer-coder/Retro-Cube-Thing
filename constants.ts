
import type { TetrominoesMap, CellValue } from './types';

export const BOARD_WIDTH: number = 10;
export const BOARD_HEIGHT: number = 20;

export const TETROMINOES: TetrominoesMap = {
  0: { shape: [[0]], color: 'bg-transparent' },
  I: {
    shape: [
      [0, 'I', 0, 0],
      [0, 'I', 0, 0],
      [0, 'I', 0, 0],
      [0, 'I', 0, 0],
    ] as CellValue[][],
    color: 'bg-cyan-500',
  },
  J: {
    shape: [
      [0, 'J', 0],
      [0, 'J', 0],
      ['J', 'J', 0],
    ] as CellValue[][],
    color: 'bg-blue-500',
  },
  L: {
    shape: [
      [0, 'L', 0],
      [0, 'L', 0],
      [0, 'L', 'L'],
    ] as CellValue[][],
    color: 'bg-orange-500',
  },
  O: {
    shape: [
      ['O', 'O'],
      ['O', 'O'],
    ] as CellValue[][],
    color: 'bg-yellow-500',
  },
  S: {
    shape: [
      [0, 'S', 'S'],
      ['S', 'S', 0],
      [0, 0, 0],
    ] as CellValue[][],
    color: 'bg-green-500',
  },
  T: {
    shape: [
      [0, 0, 0],
      ['T', 'T', 'T'],
      [0, 'T', 0],
    ] as CellValue[][],
    color: 'bg-purple-500',
  },
  Z: {
    shape: [
      ['Z', 'Z', 0],
      [0, 'Z', 'Z'],
      [0, 0, 0],
    ] as CellValue[][],
    color: 'bg-red-500',
  },
};

export const LINE_POINTS = [40, 100, 300, 1200];
