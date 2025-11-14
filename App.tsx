


import React, { useState, useCallback, useEffect, useRef } from 'react';
import { BOARD_WIDTH, BOARD_HEIGHT, TETROMINOES, LINE_POINTS } from './constants';
import type { Board, Player, Cell, CellValue, Particle } from './types';
import ParticleCanvas from './ParticleCanvas';

// Helper Functions
const createBoard = (): Board => Array.from(Array(BOARD_HEIGHT), () => new Array(BOARD_WIDTH).fill([0, 'clear']));

// FIX: Simplified the implementation of randomTetromino to avoid complex type assertions
// that could confuse the TypeScript compiler.
const randomTetromino = (): CellValue[][] => {
  const tetrominoKeys = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'] as const;
  const randKey = tetrominoKeys[Math.floor(Math.random() * tetrominoKeys.length)];
  return TETROMINOES[randKey].shape;
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
  <div className="relative grid grid-cols-10 grid-rows-20 gap-0 border-2 border-gray-600 bg-gray-800/80">
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
                    const color = TETROMINOES[cellValue].colorValue;
                    const fragmentCount = 6 + Math.floor(Math.random() * 3); // 6-8 fragments per block
                    for (let i = 0; i < fragmentCount; i++) {
                        newParticles.push({
                            x: x + 0.5,
                            y: y + 0.5,
                            vx: (Math.random() - 0.5) * 1.2,
                            vy: -Math.random() * 1.5 - 0.5,
                            color: color,
                            size: Math.random() * 0.25 + 0.15,  // Smaller fragments
                            rotation: Math.random() * Math.PI * 2,
                            rotationSpeed: (Math.random() - 0.5) * 0.2,
                            isSquare: true,
                        });
                    }
                }
            }
        });
        setParticles(prev => [...prev, ...newParticles]);
    }, []);


    const handlePieceLanded = useCallback((landedPlayer: Player) => {
        // 1. Update particles based on impact: shatter and nudge
        setParticles(currentParticles => {
            const particlesToShatter: Particle[] = [];
            const playerBlocks: {x: number, y: number}[] = [];

            landedPlayer.tetromino.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value !== 0) {
                        const boardY = y + landedPlayer.pos.y;
                        const boardX = x + landedPlayer.pos.x;
                        playerBlocks.push({ x: boardX, y: boardY });
                    }
                });
            });
            
            const nonShatteredParticles = currentParticles.filter(p => {
                const pGridX = Math.floor(p.x);
                const pGridY = Math.floor(p.y);
                const shouldShatter = playerBlocks.some(block => block.x === pGridX && block.y === pGridY);
                if (shouldShatter) {
                    particlesToShatter.push(p);
                    return false;
                }
                return true;
            });

            const newFragments: Particle[] = [];
            if (particlesToShatter.length > 0) {
                particlesToShatter.forEach(shatteredParticle => {
                    const count = shatteredParticle.size > 0.3 ? 4 : 2; // Shatter into smaller pieces
                    for (let i = 0; i < count; i++) {
                        newFragments.push({
                            x: shatteredParticle.x + (Math.random() - 0.5) * 0.5,
                            y: shatteredParticle.y + (Math.random() - 0.5) * 0.5,
                            vx: (Math.random() - 0.5) * 1.5,
                            vy: (Math.random() - 0.5) * 1.5,
                            color: shatteredParticle.color,
                            size: shatteredParticle.size * 0.6,
                            rotation: Math.random() * Math.PI * 2,
                            rotationSpeed: (Math.random() - 0.5) * 0.4,
                            isSquare: true,
                        });
                    }
                });
            }
            
            // Nudge nearby non-shattered particles
            const nudgedParticles = nonShatteredParticles.map(p => {
                 let minDistance = Infinity;
                 for (const block of playerBlocks) {
                     // Calculate distance from center of block to center of particle
                     const dist = Math.sqrt(Math.pow(block.x + 0.5 - p.x, 2) + Math.pow(block.y + 0.5 - p.y, 2));
                     if (dist < minDistance) {
                         minDistance = dist;
                     }
                 }

                 const nudgeRadius = 2.5;
                 if (minDistance < nudgeRadius) {
                     const impulseStrength = (nudgeRadius - minDistance) / nudgeRadius; // Stronger impulse for closer particles
                     return {
                        ...p,
                        vx: p.vx + (Math.random() - 0.5) * impulseStrength * 0.8,
                        vy: p.vy - Math.random() * impulseStrength * 1.0,
                        rotationSpeed: p.rotationSpeed + (Math.random() - 0.5) * impulseStrength * 0.2
                     };
                 }
                 return p;
            });
            
            return [...nudgedParticles, ...newFragments];
        });

        // 2. Update Board and Game State
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
    
            const GRAVITY = 0.025;
            const AIR_FRICTION = 0.98;
            const SURFACE_FRICTION = 0.85;
            const BOUNCE_FACTOR = 0.2;
            
            const updatedParticles = prevParticles.map(p => {
                // If particle is at rest, check if it should stay at rest.
                if (p.vx === 0 && p.vy === 0 && p.rotationSpeed === 0) {
                    const onTheFloor = p.y >= BOARD_HEIGHT - p.size / 2;
                    
                    // Check one pixel below the particle's bottom edge to see if it's on a block
                    const checkY = Math.floor(p.y + p.size / 2 + 0.01);
                    const gridX = Math.floor(p.x);
                    
                    const onABlock = checkY >= 0 && checkY < BOARD_HEIGHT && gridX >= 0 && gridX < BOARD_WIDTH && board[checkY] && board[checkY][gridX][1] === 'merged';
                    
                    // If it's resting on a stable surface, don't apply physics.
                    if (onTheFloor || onABlock) {
                        return p;
                    }
                }

                let { x, y, vx, vy, rotation, rotationSpeed } = p;
    
                // Apply physics
                vy += GRAVITY;
                vx *= AIR_FRICTION;
                rotationSpeed *= AIR_FRICTION;
                
                let nextX = x + vx;
                let nextY = y + vy;
                
                // Wall collisions
                if (nextX >= BOARD_WIDTH - p.size / 2) {
                    nextX = BOARD_WIDTH - p.size / 2;
                    vx = -vx * BOUNCE_FACTOR;
                } else if (nextX <= p.size / 2) {
                    nextX = p.size / 2;
                    vx = -vx * BOUNCE_FACTOR;
                }

                // Floor and Block collisions
                const onTheFloor = nextY >= BOARD_HEIGHT - p.size / 2;
                const gridX = Math.floor(nextX);
                const gridY = Math.floor(nextY);
                const onABlock = vy > 0 && gridY >=0 && gridY < BOARD_HEIGHT && gridX >=0 && gridX < BOARD_WIDTH && board[gridY] && board[gridY][gridX][1] === 'merged';

                if (onTheFloor || onABlock) {
                    if (onTheFloor) {
                        nextY = BOARD_HEIGHT - p.size / 2;
                    } else {
                        nextY = gridY - p.size / 2;
                    }
                    vy = -vy * BOUNCE_FACTOR;
                    
                    // Apply surface friction and handle resting state
                    if (Math.abs(vy) < 0.1) {
                        vy = 0; // Prevent jittering
                        vx *= SURFACE_FRICTION;
                        rotationSpeed *= SURFACE_FRICTION;
                    }
                }
                
                // Stop tiny movements to come to a rest
                if (Math.abs(vx) < 0.01) vx = 0;
                if (Math.abs(vy) < 0.01 && (onTheFloor || onABlock)) vy = 0;
                if (Math.abs(rotationSpeed) < 0.01) rotationSpeed = 0;
    
                return {
                    ...p,
                    x: nextX,
                    y: nextY,
                    vx,
                    vy,
                    rotation: rotation + rotationSpeed,
                    rotationSpeed,
                };
            });
    
            return updatedParticles;
        });
    
        physicsFrameRef.current = requestAnimationFrame(runPhysics);
    }, [board]);

    useEffect(() => {
        const newLevel = Math.floor(lines / 10) + 1;
        if (newLevel !== level) {
            setLevel(newLevel);
        }
    }, [lines, level]);
    
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