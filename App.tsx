
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { BOARD_WIDTH, BOARD_HEIGHT, TETROMINOES, LINE_POINTS } from './constants';
import type { Board, Player, Cell, CellValue, Particle, DebrisParticle, SmokeParticle, BackgroundTheme } from './types';
import ParticleCanvas from './ParticleCanvas';
import BackgroundCanvas from './BackgroundCanvas';

// Helper Functions
const createBoard = (): Board => Array.from(Array(BOARD_HEIGHT), () => new Array(BOARD_WIDTH).fill([0, 'clear']));

// FIX: Simplified the implementation of randomTetromino to avoid complex type assertions
// that could confuse the TypeScript compiler.
const randomTetromino = (): CellValue[][] => {
  const tetrominoKeys = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'] as const;
  const randKey = tetrominoKeys[Math.floor(Math.random() * tetrominoKeys.length)];
  return TETROMINOES[randKey].shape;
};

const generateChippedShape = (baseRadius: number): { points: {x: number, y: number}[], radius: number } => {
    const points: {x: number, y: number}[] = [];
    const numVertices = 5 + Math.floor(Math.random() * 5); // 5 to 9 vertices
    let maxRadiusSq = 0;
    for (let i = 0; i < numVertices; i++) {
        const angle = (i / numVertices) * Math.PI * 2;
        // Add some randomness to the angle to make it less uniform
        const angleOffset = (Math.random() - 0.5) * (Math.PI / numVertices);
        const finalAngle = angle + angleOffset;

        const radius = baseRadius * (0.6 + Math.random() * 0.4); // Random radius for each vertex
        
        const x = Math.cos(finalAngle) * radius;
        const y = Math.sin(finalAngle) * radius;
        points.push({ x, y });
        maxRadiusSq = Math.max(maxRadiusSq, x*x + y*y);
    }
    return { points, radius: Math.sqrt(maxRadiusSq) };
};


// Child Components defined outside main component to prevent re-creation on re-renders
interface CellProps {
  cell: Cell;
}
const MemoizedCell: React.FC<CellProps> = React.memo(({ cell }) => {
    const [type, state] = cell;
    const color = TETROMINOES[type].colorClass;
    
    let cellClass = `w-full aspect-square border-gray-700/50 border-[1px] ${color}`;
    
    if (state === 'ghost') {
      cellClass = `w-full aspect-square border-gray-700/50 border-[1px] ${color} opacity-30`;
    } else if (state === 'cracking') {
        cellClass += ' animate-crack';
    }
  
    return <div className={cellClass}></div>;
});


interface BoardProps {
  board: Board;
}
const GameBoard: React.FC<BoardProps> = ({ board }) => (
  <div className="relative grid grid-cols-10 grid-rows-20 gap-0 border-2 border-gray-600 bg-transparent">
    {board.map((row, y) =>
      row.map((cell, x) => <MemoizedCell key={`${y}-${x}`} cell={cell} />)
    )}
  </div>
);

interface GameStatsProps {
  score: number;
  lines: number;
  level: number;
  highScore: number;
}
const GameStats: React.FC<GameStatsProps> = ({ score, lines, level, highScore }) => (
  <div className="w-full p-4 bg-gray-800/80 border-2 border-gray-600 rounded-lg text-white">
    <h2 className="text-xl font-bold mb-4 text-cyan-400">Stats</h2>
    <div className="space-y-2 text-lg">
      <p>High Score: <span className="font-mono float-right">{highScore}</span></p>
      <p>Score: <span className="font-mono float-right">{score}</span></p>
      <p>Lines: <span className="font-mono float-right">{lines}</span></p>
      <p>Level: <span className="font-mono float-right">{level}</span></p>
    </div>
  </div>
);

interface PreviewProps {
    tetromino: CellValue[][];
}
const Preview: React.FC<PreviewProps> = ({ tetromino }) => {
    const shape = tetromino;
    const boxSize = 'w-full h-full p-4 bg-gray-800/80 border-2 border-gray-600 rounded-lg text-white flex flex-col justify-center items-center';

    return (
        <div className={boxSize}>
            <h2 className="text-xl font-bold mb-4 text-cyan-400 self-start">Next</h2>
            <div className="flex-grow flex justify-center items-center">
                 <div style={{ gridTemplateRows: `repeat(${shape.length}, 1fr)`, gridTemplateColumns: `repeat(${shape[0].length}, 1fr)`}} className="grid gap-px">
                     {shape.map((row, y) =>
                        row.map((cell, x) => (
                           <div key={`${y}-${x}`} className={`w-5 h-5 ${cell === 0 ? 'bg-transparent' : TETROMINOES[cell].colorClass}`}></div>
                        ))
                     )}
                </div>
            </div>
        </div>
    );
};


interface ModalProps {
    title: string;
    children: React.ReactNode;
}
const Modal: React.FC<ModalProps> = ({ title, children }) => (
    <div className="absolute inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50">
        <div className="bg-gray-800 p-8 rounded-lg border-2 border-cyan-400 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">{title}</h2>
            {children}
        </div>
    </div>
);

const MAX_PARTICLES = 800;
const THEMES: BackgroundTheme[] = ['FOREST', 'WASTELAND', 'VOLCANIC', 'SPACE'];

const App: React.FC = () => {
    const [board, setBoard] = useState<Board>(() => createBoard());
    const [player, setPlayer] = useState<Player>({
        pos: { x: 0, y: 0 },
        tetromino: [[0]],
        collided: false,
    });
    const [nextTetromino, setNextTetromino] = useState(() => randomTetromino());
    const [score, setScore] = useState(0);
    const [lines, setLines] = useState(0);
    const [level, setLevel] = useState(1);
    const [highScore, setHighScore] = useState(0);
    const [isGameOver, setIsGameOver] = useState(true); // Start in game over state
    const [isPaused, setIsPaused] = useState(false);
    const [particles, setParticles] = useState<Particle[]>([]);
    const [isAnimating, setIsAnimating] = useState(false);
    const [showBazinga, setShowBazinga] = useState(false);
    const [backgroundTheme, setBackgroundTheme] = useState<BackgroundTheme>('SPACE');

    const gameAreaRef = useRef<HTMLDivElement>(null);
    const dropIntervalRef = useRef<number | null>(null);
    // FIX: The `useRef` hook requires an initial value. Changed from `useRef<number>()` to `useRef<number | null>(null)` to provide a default value and allow for null.
    const physicsFrameRef = useRef<number | null>(null);

    const checkCollision = useCallback((playerToCheck: Player, boardToCheck: Board, { x: moveX, y: moveY }: { x: number; y: number }): boolean => {
        for (let y = 0; y < playerToCheck.tetromino.length; y += 1) {
            for (let x = 0; x < playerToCheck.tetromino[y].length; x += 1) {
                if (playerToCheck.tetromino[y][x] !== 0) {
                    const newY = y + playerToCheck.pos.y + moveY;
                    const newX = x + playerToCheck.pos.x + moveX;

                    if (
                        newY >= BOARD_HEIGHT ||
                        newX < 0 ||
                        newX >= BOARD_WIDTH ||
                        !boardToCheck[newY] || // Ensure row exists
                        boardToCheck[newY][newX][1] !== 'clear'
                    ) {
                        return true;
                    }
                }
            }
        }
        return false;
    }, []);
    
    const startGame = useCallback(() => {
        setBoard(createBoard());
        setScore(0);
        setLines(0);
        setLevel(1);
        setParticles([]);
        
        const randomTheme = THEMES[Math.floor(Math.random() * THEMES.length)];
        setBackgroundTheme(randomTheme);
        
        const firstPiece = randomTetromino();

        setPlayer({
            pos: { x: BOARD_WIDTH / 2 - Math.floor(firstPiece[0].length / 2), y: 0 },
            tetromino: firstPiece,
            collided: false,
        });
        
        setNextTetromino(randomTetromino());
        setIsGameOver(false);
        setIsPaused(false);
        gameAreaRef.current?.focus();
    }, []);
    
    useEffect(() => {
        // Load high score on initial mount
        const savedHighScore = localStorage.getItem('retroBlockStackHighScore');
        if (savedHighScore) {
            setHighScore(parseInt(savedHighScore, 10));
        }
    }, []);
    
    // Auto-start the game on mount by showing the start screen
    useEffect(() => {
        setIsGameOver(true);
    }, []);


    useEffect(() => {
        if (!isGameOver && score > highScore) {
            setHighScore(score);
            localStorage.setItem('retroBlockStackHighScore', score.toString());
        }
    }, [isGameOver, score, highScore]);

    const updatePlayerPos = ({ x, y }: { x: number; y: number }): void => {
        setPlayer(prev => ({
            ...prev,
            pos: { x: prev.pos.x + x, y: prev.pos.y + y },
        }));
    };
    
    const createDebris = useCallback((clearedRows: number[], boardState: Board) => {
        const newParticles: Particle[] = [];
        clearedRows.forEach(y => {
            for (let x = 0; x < BOARD_WIDTH; x++) {
                const cellValue = boardState[y][x][0];
                if (cellValue !== 0) {
                    const blockColor = TETROMINOES[cellValue].colorValue;
                    const fragmentCount = 8 + Math.floor(Math.random() * 5);

                    // --- Theme-specific Debris ---
                    let debrisColor = blockColor;
                    if (backgroundTheme === 'FOREST') debrisColor = ['#8B4513', '#A0522D', '#5C4033'][Math.floor(Math.random() * 3)];
                    if (backgroundTheme === 'WASTELAND') debrisColor = ['#9c7b4f', '#8c6d3f', '#7b5e2e'][Math.floor(Math.random() * 3)];
                    if (backgroundTheme === 'VOLCANIC') debrisColor = ['#2E1A1A', '#3A1F1F', '#1B0D0D'][Math.floor(Math.random() * 3)];
                    if (backgroundTheme === 'SPACE') debrisColor = ['#AEC6CF', '#B6D0E2', '#C4D7E0'][Math.floor(Math.random() * 3)];

                    for (let i = 0; i < fragmentCount; i++) {
                        const particleX = x + Math.random();
                        const particleY = y + Math.random();
                        const baseRadius = (Math.random() * 0.4 + 0.1);
                        const { points, radius } = generateChippedShape(baseRadius);

                        newParticles.push({
                            type: 'debris',
                            x: particleX,
                            y: particleY,
                            vx: (particleX - (x + 0.5)) * 1.8 + (Math.random() - 0.5) * 0.8,
                            vy: (particleY - (y + 0.5)) * 1.8 - Math.random() * 1.5,
                            color: debrisColor,
                            shapePoints: points,
                            boundingRadius: radius,
                            rotation: Math.random() * Math.PI * 2,
                            rotationSpeed: (Math.random() - 0.5) * 0.2,
                            shade: -(20 + Math.random() * 40),
                        });
                    }

                    // --- Theme-specific Secondary Particles ---
                    const secondaryCount = 12 + Math.floor(Math.random() * 8);
                    for (let i = 0; i < secondaryCount; i++) {
                        const life = 120 + Math.random() * 60; // 2-3 seconds
                        switch (backgroundTheme) {
                            case 'FOREST':
                                newParticles.push({
                                    type: 'leaf',
                                    x: x + 0.25 + Math.random() * 0.5,
                                    y: y + Math.random() * 0.5,
                                    vx: (Math.random() - 0.5) * 0.03,
                                    vy: (Math.random() * 0.02 + 0.01),
                                    size: 0.1 + Math.random() * 0.15,
                                    life: life,
                                    initialLife: life,
                                    rotation: Math.random() * Math.PI * 2,
                                    rotationSpeed: (Math.random() - 0.5) * 0.05,
                                    flutter: Math.random() * 0.05,
                                    color: ['#228B22', '#32CD32', '#9ACD32'][Math.floor(Math.random() * 3)],
                                });
                                break;
                            case 'WASTELAND':
                                newParticles.push({
                                    type: 'smoke',
                                    x: x + 0.25 + Math.random() * 0.5,
                                    y: y + Math.random() * 0.5,
                                    vx: (Math.random() - 0.5) * 0.015,
                                    vy: -(Math.random() * 0.03 + 0.01),
                                    radius: Math.random() * 0.2 + 0.05,
                                    life: life,
                                    initialLife: life,
                                    color: { r: 210, g: 180, b: 140 }, // Sandy color
                                });
                                break;
                            case 'VOLCANIC':
                                newParticles.push({
                                    type: 'smoke',
                                    x: x + 0.25 + Math.random() * 0.5,
                                    y: y + Math.random() * 0.5,
                                    vx: (Math.random() - 0.5) * 0.01,
                                    vy: -(Math.random() * 0.08 + 0.04),
                                    radius: Math.random() * 0.2 + 0.05,
                                    life: life,
                                    initialLife: life,
                                    color: { r: 50, g: 50, b: 50 }, // Dark smoke
                                });
                                if (i % 2 === 0) {
                                    newParticles.push({
                                        type: 'ember',
                                        x: x + 0.25 + Math.random() * 0.5,
                                        y: y + Math.random(),
                                        vx: (Math.random() - 0.5) * 0.02,
                                        vy: -(Math.random() * 0.1 + 0.05),
                                        radius: Math.random() * 0.08 + 0.03,
                                        life: life * 0.8,
                                        initialLife: life * 0.8,
                                    });
                                }
                                break;
                            case 'SPACE':
                                newParticles.push({
                                    type: 'sparkle',
                                    x: x + 0.1 + Math.random() * 0.8,
                                    y: y + 0.1 + Math.random() * 0.8,
                                    radius: 0.05 + Math.random() * 0.2,
                                    life: 30 + Math.random() * 30,
                                    initialLife: 60,
                                    color: ['#FFFFFF', '#ADD8E6', '#F0F8FF'][Math.floor(Math.random() * 3)],
                                });
                                break;
                        }
                    }
                }
            }
        });
        setParticles(prev => [...prev, ...newParticles].slice(-MAX_PARTICLES));
    }, [backgroundTheme]);


    const handlePieceLanded = useCallback((landedPlayer: Player) => {
        // Particle interaction logic removed.

        // Update Board and Game State
        const newBoard = board.map(row => [...row] as Cell[]);
        landedPlayer.tetromino.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    const boardY = y + landedPlayer.pos.y;
                    const boardX = x + landedPlayer.pos.x;
                    if (boardY < BOARD_HEIGHT) {
                        newBoard[boardY][boardX] = [value, 'merged'];
                    }
                }
            });
        });

        const linesToClearIndices: number[] = [];
        newBoard.forEach((row, y) => {
            if (row.every(cell => cell[0] !== 0 && cell[1] === 'merged')) {
                linesToClearIndices.push(y);
            }
        });

        if (linesToClearIndices.length > 0) {
            setShowBazinga(true);
            setIsAnimating(true);
            
            const crackingBoard = newBoard.map((row, y) => {
                if (linesToClearIndices.includes(y)) {
                    return row.map(cell => [cell[0], 'cracking'] as Cell);
                }
                return row;
            });
            setBoard(crackingBoard);

            setTimeout(() => {
                createDebris(linesToClearIndices, newBoard);

                const boardForAnimation = newBoard.map((row, y) => {
                    if (linesToClearIndices.includes(y)) {
                        return new Array(BOARD_WIDTH).fill([0, 'clear']);
                    }
                    return row;
                });
                setBoard(boardForAnimation);

                setTimeout(() => {
                    const sweptBoard = newBoard.reduce((acc, row, y) => {
                        if (!linesToClearIndices.includes(y)) {
                             acc.push(row);
                        }
                        return acc;
                    }, [] as Board);
                    
                    while (sweptBoard.length < BOARD_HEIGHT) {
                        sweptBoard.unshift(new Array(BOARD_WIDTH).fill([0, 'clear']));
                    }
                    
                    setScore(prev => prev + LINE_POINTS[linesToClearIndices.length - 1] * level);
                    setLines(prev => prev + linesToClearIndices.length);
                    
                    const newTetromino = nextTetromino;
                    const newPlayer = {
                        pos: { x: BOARD_WIDTH / 2 - Math.floor(newTetromino[0].length / 2), y: 0 },
                        tetromino: newTetromino,
                        collided: false,
                    };
                    
                    setBoard(sweptBoard);
                    if (checkCollision(newPlayer, sweptBoard, { x: 0, y: 0 })) {
                        setIsGameOver(true);
                    } else {
                        setPlayer(newPlayer);
                        setNextTetromino(randomTetromino());
                    }

                    setIsAnimating(false);
                    setShowBazinga(false);
                }, 1300);
            }, 200);
        } else {
            const newTetromino = nextTetromino;
            const newPlayer = {
                pos: { x: BOARD_WIDTH / 2 - Math.floor(newTetromino[0].length / 2), y: 0 },
                tetromino: newTetromino,
                collided: false,
            };
            
            setBoard(newBoard);
            if (checkCollision(newPlayer, newBoard, { x: 0, y: 0 })) {
                setIsGameOver(true);
            } else {
                setPlayer(newPlayer);
                setNextTetromino(randomTetromino());
            }
        }

    }, [board, level, nextTetromino, checkCollision, createDebris]);


    const drop = useCallback(() => {
        if (isPaused || isGameOver || isAnimating) return;

        if (!checkCollision(player, board, { x: 0, y: 1 })) {
            updatePlayerPos({ x: 0, y: 1 });
        } else {
            if (player.pos.y < 1) {
                setIsGameOver(true);
                return;
            }
            handlePieceLanded(player);
        }
    }, [board, checkCollision, isGameOver, isPaused, player, handlePieceLanded, isAnimating]);

    const movePlayer = (dir: -1 | 1) => {
        if (!checkCollision(player, board, { x: dir, y: 0 })) {
            updatePlayerPos({ x: dir, y: 0 });
        }
    };
    
    const rotate = (matrix: CellValue[][]): CellValue[][] => {
        const rotated = matrix.map((_, index) => matrix.map(col => col[index]));
        return rotated.map(row => row.reverse());
    };

    const playerRotate = () => {
        const clonedPlayer = JSON.parse(JSON.stringify(player));
        clonedPlayer.tetromino = rotate(clonedPlayer.tetromino);

        const pos = clonedPlayer.pos.x;
        let offset = 1;
        while (checkCollision(clonedPlayer, board, { x: 0, y: 0 })) {
            clonedPlayer.pos.x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1));
            if (offset > clonedPlayer.tetromino[0].length) {
                clonedPlayer.pos.x = pos; // Reset if cannot rotate
                return;
            }
        }
        setPlayer(clonedPlayer);
    };

    const hardDrop = useCallback(() => {
        let dropHeight = 0;
        while (!checkCollision(player, board, { x: 0, y: dropHeight + 1 })) {
            dropHeight++;
        }
        const landedPlayer = {
            ...player,
            pos: { x: player.pos.x, y: player.pos.y + dropHeight }
        };
        
        setPlayer(prev => ({...prev, collided: true})); // Mark as collided to prevent further input
        handlePieceLanded(landedPlayer);
    }, [board, checkCollision, player, handlePieceLanded]);
    
    const togglePause = () => {
      if (isGameOver) return;
      if (isPaused) {
        gameAreaRef.current?.focus();
      }
      setIsPaused(prev => !prev);
    };

    const testLineClear = useCallback(() => {
        if (isGameOver || isAnimating) return;

        const testBoard = board.map(row => [...row] as Cell[]);
        for (let i = 0; i < BOARD_WIDTH; i++) {
            testBoard[BOARD_HEIGHT - 1][i] = ['T', 'merged'];
        }
        const linesToClearIndices = [BOARD_HEIGHT - 1];

        setShowBazinga(true);
        setIsAnimating(true);
        
        const crackingBoard = testBoard.map((row, y) => {
            if (linesToClearIndices.includes(y)) {
                return row.map(cell => [cell[0], 'cracking'] as Cell);
            }
            return row;
        });
        setBoard(crackingBoard);

        setTimeout(() => {
            createDebris(linesToClearIndices, testBoard);

            const boardForAnimation = testBoard.map((row, y) => {
                if (linesToClearIndices.includes(y)) {
                    return new Array(BOARD_WIDTH).fill([0, 'clear']);
                }
                return row;
            });
            setBoard(boardForAnimation);

            setTimeout(() => {
                const sweptBoard = testBoard.reduce((acc, row, y) => {
                    if (!linesToClearIndices.includes(y)) {
                         acc.push(row);
                    }
                    return acc;
                }, [] as Board);
                
                while (sweptBoard.length < BOARD_HEIGHT) {
                    sweptBoard.unshift(new Array(BOARD_WIDTH).fill([0, 'clear']));
                }
                
                setScore(prev => prev + LINE_POINTS[0] * level);
                setLines(prev => prev + 1);
                
                setBoard(sweptBoard);

                setIsAnimating(false);
                setShowBazinga(false);
            }, 1300);
        }, 200);
    }, [isGameOver, isAnimating, board, createDebris, level]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (isGameOver || player.collided || isAnimating) return;
        
        if (e.key.toLowerCase() === 'p') {
          togglePause();
          return;
        }

        if (isPaused) return;

        if (e.key === 'ArrowLeft') movePlayer(-1);
        else if (e.key === 'ArrowRight') movePlayer(1);
        else if (e.key === 'ArrowDown') drop();
        else if (e.key === 'ArrowUp') playerRotate();
        else if (e.key === ' ') {
            e.preventDefault(); // Prevent spacebar from scrolling the page
            hardDrop();
        }
    };

    const runPhysics = useCallback(() => {
        setParticles(prevParticles => {
            if (prevParticles.length === 0) return [];
    
            const GRAVITY = 0.002;
            const AIR_FRICTION = 0.98;
            const BOUNCE_FACTOR = 0.6;
            
            const updatedParticles = prevParticles.map((p): Particle | null => {
                switch (p.type) {
                    case 'smoke': {
                        const life = p.life - 1;
                        if (life <= 0) return null;
                        const swirl = Math.sin(p.y * 0.8 + p.initialLife) * 0.002;
                        const vx = (p.vx + swirl) * 0.98;
                        const vy = p.vy * 0.98 - 0.0003;
                        const radius = p.radius + 0.002;
                        const x = p.x + vx;
                        const y = p.y + vy;
                        return { ...p, x, y, vx, vy, life, radius };
                    }
                    case 'leaf': {
                        const life = p.life - 1;
                        if (life <= 0) return null;
                        const vx = p.vx * 0.99 + Math.sin(p.y * 0.5) * p.flutter;
                        const vy = p.vy * 0.99 + 0.0005; // Gentle gravity
                        const x = p.x + vx;
                        const y = p.y + vy;
                        const rotation = p.rotation + p.rotationSpeed;
                        const rotationSpeed = p.rotationSpeed * 0.99;
                        return { ...p, x, y, vx, vy, life, rotation, rotationSpeed };
                    }
                    case 'ember': {
                        const life = p.life - 1;
                        if (life <= 0) return null;
                        const vx = p.vx * 0.96;
                        const vy = p.vy * 0.99 - 0.0001; // Rise, but slow down
                        const radius = p.radius * 0.98; // Shrink
                        const x = p.x + vx;
                        const y = p.y + vy;
                        return { ...p, x, y, vx, vy, life, radius };
                    }
                    case 'sparkle': {
                        const life = p.life - 1;
                        if (life <= 0) return null;
                        return { ...p, life };
                    }
                    case 'debris': {
                        let { x, y, vx, vy, rotation, rotationSpeed } = p;
        
                        vy += GRAVITY;
                        vx *= AIR_FRICTION;
                        vy *= AIR_FRICTION;
                        rotationSpeed *= AIR_FRICTION;
                        
                        let nextX = x + vx;
                        let nextY = y + vy;

                        if (nextX - p.boundingRadius < 0) {
                            nextX = p.boundingRadius;
                            vx = -vx * BOUNCE_FACTOR;
                            rotationSpeed *= 0.5;
                        } else if (nextX + p.boundingRadius > BOARD_WIDTH) {
                            nextX = BOARD_WIDTH - p.boundingRadius;
                            vx = -vx * BOUNCE_FACTOR;
                            rotationSpeed *= 0.5;
                        }
                    
                        if (nextY - p.boundingRadius < 0) {
                            nextY = p.boundingRadius;
                            vy = -vy * BOUNCE_FACTOR;
                        }
                        
                        if (Math.abs(vx) < 0.01) vx = 0;
                        if (Math.abs(vy) < 0.01 && vy !== 0) vy = 0;
                        if (Math.abs(rotationSpeed) < 0.01) rotationSpeed = 0;

                        if (nextY > BOARD_HEIGHT + 5) {
                            return null;
                        }
            
                        return { ...p, x: nextX, y: nextY, vx, vy, rotation: rotation + rotationSpeed, rotationSpeed };
                    }
                }
            }).filter((p): p is Particle => p !== null);
                
            return updatedParticles;
        });
    
        physicsFrameRef.current = requestAnimationFrame(runPhysics);
    }, []);

    useEffect(() => {
        const newLevel = Math.floor(lines / 10) + 1;
        if (newLevel !== level) {
            setLevel(newLevel);
            if (newLevel > 1 && newLevel % 5 === 1) {
                const currentThemeIndex = THEMES.indexOf(backgroundTheme);
                const nextThemeIndex = (currentThemeIndex + 1) % THEMES.length;
                setBackgroundTheme(THEMES[nextThemeIndex]);
            }
        }
    }, [lines, level, backgroundTheme]);
    
    useEffect(() => {
        if (isPaused || isGameOver || isAnimating) {
            if (dropIntervalRef.current) clearInterval(dropIntervalRef.current);
            return;
        }

        const currentDropTime = Math.max(50, 1000 * Math.pow(0.85, level - 1));

        dropIntervalRef.current = window.setInterval(() => {
            drop();
        }, currentDropTime);
        
        return () => {
            if (dropIntervalRef.current) clearInterval(dropIntervalRef.current);
        };
    }, [drop, isPaused, isGameOver, level, isAnimating]);

    useEffect(() => {
        if (!isGameOver) {
            physicsFrameRef.current = requestAnimationFrame(runPhysics);
        }
        return () => {
            if (physicsFrameRef.current) {
                cancelAnimationFrame(physicsFrameRef.current);
            }
        };
    }, [isGameOver, runPhysics]);


    // Create the display board on every render
    const displayBoard = board.map(row => [...row] as Cell[]);
    
    if (!isGameOver) {
        // Calculate ghost piece position
        let ghostY = player.pos.y;
        while (!checkCollision(player, board, { x: 0, y: ghostY - player.pos.y + 1 })) {
            ghostY++;
        }

        // Draw ghost piece
        player.tetromino.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    const boardY = y + ghostY;
                    const boardX = x + player.pos.x;
                    if (boardY >= 0 && boardY < BOARD_HEIGHT && displayBoard[boardY][boardX][1] !== 'merged' && displayBoard[boardY][boardX][1] !== 'cracking') {
                       displayBoard[boardY][boardX] = [value, 'ghost'];
                    }
                }
            });
        });
        
        // Draw active player piece
        player.tetromino.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    const boardY = y + player.pos.y;
                    const boardX = x + player.pos.x;
                    if (boardY >= 0 && boardY < BOARD_HEIGHT) {
                       displayBoard[boardY][boardX] = [value, 'clear'];
                    }
                }
            });
        });
    }

    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col justify-center items-center font-mono p-4">
            <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500 z-10">
                Retro Block Stack
            </h1>
            <div
              className="relative w-full max-w-4xl mx-auto flex flex-col md:flex-row gap-8 items-start outline-none z-10"
              ref={gameAreaRef}
              tabIndex={0}
              onKeyDown={handleKeyDown}
              onBlur={() => {if (!isGameOver) setIsPaused(true)}}
            >
                {isGameOver && (
                    <Modal title="Retro Block Stack">
                        <p className="text-xl mb-2">Score: {score}</p>
                        <p className="text-lg text-cyan-400 mb-4">High Score: {highScore}</p>
                        <button onMouseDown={(e) => e.preventDefault()} onClick={startGame} className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-lg font-semibold">
                            Play Game
                        </button>
                    </Modal>
                )}
                {isPaused && !isGameOver && (
                     <Modal title="Paused">
                        <button onMouseDown={(e) => e.preventDefault()} onClick={togglePause} className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg text-lg font-semibold">
                            Resume
                        </button>
                    </Modal>
                )}

                <div className="flex-1 relative">
                    <BackgroundCanvas theme={backgroundTheme} />
                    <GameBoard board={displayBoard} />
                    {showBazinga && (
                        <div className="absolute inset-0 flex justify-center items-center pointer-events-none z-40">
                            <h1 className="text-8xl font-black text-yellow-300 animate-bazinga" style={{ WebkitTextStroke: '3px black', textShadow: '0 0 15px white' }}>
                                BAZINGA!
                            </h1>
                        </div>
                    )}
                    <ParticleCanvas particles={particles} />
                </div>

                <aside className="w-full md:w-56 flex flex-col gap-4 flex-shrink-0">
                    <GameStats score={score} lines={lines} level={level} highScore={highScore} />
                    {!isGameOver && <Preview tetromino={nextTetromino} />}
                    <button onMouseDown={(e) => e.preventDefault()} onClick={togglePause} className="w-full p-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-lg font-semibold">
                       {isPaused ? 'Resume' : 'Pause'} (P)
                    </button>
                    <button onMouseDown={(e) => e.preventDefault()} onClick={startGame} className="w-full p-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-lg font-semibold">
                       New Game
                    </button>
                    <button onMouseDown={(e) => e.preventDefault()} onClick={testLineClear} className="w-full p-3 bg-gray-500 hover:bg-gray-400 rounded-lg text-lg font-semibold">
                       Test Line Clear
                    </button>
                </aside>
            </div>
             <div className="mt-4 text-gray-400 text-center text-sm max-w-md z-10">
                <p><span className="font-bold text-gray-200">Controls:</span> Use Arrow Keys to move and rotate. Spacebar to hard drop. Click the board or press P to pause/resume.</p>
            </div>
        </div>
    );
};

export default App;