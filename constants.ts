import type { TetrominoesMap, CellValue } from './types';

export const BOARD_WIDTH: number = 10;
export const BOARD_HEIGHT: number = 20;

export const TETROMINOES: TetrominoesMap = {
  0: { shape: [[0]], colorClass: 'bg-transparent', colorValue: 'transparent' },
  I: {
    shape: [
      [0, 'I', 0, 0],
      [0, 'I', 0, 0],
      [0, 'I', 0, 0],
      [0, 'I', 0, 0],
    ] as CellValue[][],
    colorClass: 'bg-cyan-500',
    colorValue: '#06b6d4',
  },
  J: {
    shape: [
      [0, 'J', 0],
      [0, 'J', 0],
      ['J', 'J', 0],
    ] as CellValue[][],
    colorClass: 'bg-blue-500',
    colorValue: '#3b82f6',
  },
  L: {
    shape: [
      [0, 'L', 0],
      [0, 'L', 0],
      [0, 'L', 'L'],
    ] as CellValue[][],
    colorClass: 'bg-orange-500',
    colorValue: '#f97316',
  },
  O: {
    shape: [
      ['O', 'O'],
      ['O', 'O'],
    ] as CellValue[][],
    colorClass: 'bg-yellow-500',
    colorValue: '#eab308',
  },
  S: {
    shape: [
      [0, 'S', 'S'],
      ['S', 'S', 0],
      [0, 0, 0],
    ] as CellValue[][],
    colorClass: 'bg-green-500',
    colorValue: '#22c55e',
  },
  T: {
    shape: [
      [0, 0, 0],
      ['T', 'T', 'T'],
      [0, 'T', 0],
    ] as CellValue[][],
    colorClass: 'bg-purple-500',
    colorValue: '#8b5cf6',
  },
  Z: {
    shape: [
      ['Z', 'Z', 0],
      [0, 'Z', 'Z'],
      [0, 0, 0],
    ] as CellValue[][],
    colorClass: 'bg-red-500',
    colorValue: '#ef4444',
  },
};

export const LINE_POINTS = [40, 100, 300, 1200];
