
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { BOARD_WIDTH, BOARD_HEIGHT, TETROMINOES, LINE_POINTS } from './constants';
import type { Board, Player, Cell, CellValue } from './types';

// Helper Functions
const createBoard = (): Board => Array.from(Array(BOARD_HEIGHT), () => new Array(BOARD_WIDTH).fill([0, 'clear']));

const randomTetromino = (): CellValue[][] => {
  const tetrominoes = 'IJLOSTZ';
  const randTetromino = tetrominoes[Math.floor(Math.random() * tetrominoes.length)] as keyof Omit<typeof TETROMINOES, 0>;
  return TETROMINOES[randTetromino].shape;
};


// Child Components defined outside main component to prevent re-creation on re-renders
interface CellProps {
  cell: Cell;
}
const MemoizedCell: React.FC<CellProps> = React.memo(({ cell }) => {
    const [type, state] = cell;
    const color = TETROMINOES[type].color;
    
    let cellClass = `w-full aspect-square border-gray-700/50 border-[1px] ${color}`;
    
    if (state === 'ghost') {
      cellClass = `w-full aspect-square border-gray-700/50 border-[1px] ${color} opacity-30`;
    }
  
    return <div className={cellClass}></div>;
});


interface BoardProps {
  board: Board;
}
const GameBoard: React.FC<BoardProps> = ({ board }) => (
  <div className="grid grid-cols-10 grid-rows-20 gap-0 border-2 border-gray-600 bg-gray-800">
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
  <div className="w-full p-4 bg-gray-800 border-2 border-gray-600 rounded-lg text-white">
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
    const boxSize = 'w-full h-full p-4 bg-gray-800 border-2 border-gray-600 rounded-lg text-white flex flex-col justify-center items-center';

    return (
        <div className={boxSize}>
            <h2 className="text-xl font-bold mb-4 text-cyan-400 self-start">Next</h2>
            <div className="flex-grow flex justify-center items-center">
                 <div style={{ gridTemplateRows: `repeat(${shape.length}, 1fr)`, gridTemplateColumns: `repeat(${shape[0].length}, 1fr)`}} className="grid gap-px">
                     {shape.map((row, y) =>
                        row.map((cell, x) => (
                           <div key={`${y}-${x}`} className={`w-5 h-5 ${cell === 0 ? 'bg-transparent' : TETROMINOES[cell].color}`}></div>
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
    <div className="absolute inset-0 bg-black bg-opacity-75 flex justify-center items-center z-10">
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

    const gameAreaRef = useRef<HTMLDivElement>(null);
    const dropIntervalRef = useRef<number | null>(null);

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
        
        const firstPiece = randomTetromino();
        const secondPiece = randomTetromino();

        setPlayer({
            pos: { x: BOARD_WIDTH / 2 - Math.floor(firstPiece[0].length / 2), y: 0 },
            tetromino: firstPiece,
            collided: false,
        });
        
        setNextTetromino(secondPiece);
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
    
    const handlePieceLanded = useCallback((landedPlayer: Player) => {
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

        let clearedLines = 0;
        const sweptBoard = newBoard.reduce((acc, row) => {
            if (row.every(cell => cell[0] !== 0)) {
                clearedLines++;
                acc.unshift(new Array(BOARD_WIDTH).fill([0, 'clear']));
                return acc;
            }
            acc.push(row);
            return acc;
        }, [] as Board);

        if (clearedLines > 0) {
            setScore(prev => prev + LINE_POINTS[clearedLines - 1] * level);
            setLines(prev => prev + clearedLines);
        }
        
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

    }, [board, level, nextTetromino, checkCollision]);


    const drop = useCallback(() => {
        if (isPaused || isGameOver) return;

        if (!checkCollision(player, board, { x: 0, y: 1 })) {
            updatePlayerPos({ x: 0, y: 1 });
        } else {
            if (player.pos.y < 1) {
                setIsGameOver(true);
                return;
            }
            handlePieceLanded(player);
        }
    }, [board, checkCollision, isGameOver, isPaused, player, handlePieceLanded]);

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
        // The player has landed, so we set their collided state and call handlePieceLanded in the next render cycle.
        // This prevents race conditions with state updates.
        setPlayer(landedPlayer);
        handlePieceLanded(landedPlayer);
    }, [board, checkCollision, player, handlePieceLanded]);
    
    const togglePause = () => {
      if (isGameOver) return;
      if (isPaused) {
        gameAreaRef.current?.focus();
      }
      setIsPaused(prev => !prev);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (isGameOver) return;
        
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

    useEffect(() => {
        const newLevel = Math.floor(lines / 10) + 1;
        if (newLevel !== level) {
            setLevel(newLevel);
        }
    }, [lines, level]);
    
    useEffect(() => {
        if (isPaused || isGameOver) {
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
    }, [drop, isPaused, isGameOver, level]);

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
                    if (boardY >= 0 && boardY < BOARD_HEIGHT && displayBoard[boardY][boardX][1] === 'clear') {
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
            <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500">
                Retro Block Stack
            </h1>
            <div
              className="relative w-full max-w-4xl mx-auto flex flex-col md:flex-row gap-8 items-start outline-none"
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

                <div className="flex-1">
                    <GameBoard board={displayBoard} />
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
                </aside>
            </div>
             <div className="mt-4 text-gray-400 text-center text-sm max-w-md">
                <p><span className="font-bold text-gray-200">Controls:</span> Use Arrow Keys to move and rotate. Spacebar to hard drop. Click the board or press P to pause/resume.</p>
            </div>
        </div>
    );
};

export default App;
