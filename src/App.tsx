/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Play, 
  RotateCcw, 
  Pause, 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  Zap,
  ShieldAlert
} from 'lucide-react';
import { Point, Direction, GameStatus, GameState, PowerUp } from './types';

const GRID_SIZE = 20;
const INITIAL_SPEED = 150;
const SPEED_INCREMENT = 10;
const MIN_SPEED = 50;

const getRandomPoint = (exclude: Point[]): Point => {
  let newPoint: Point;
  do {
    newPoint = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (exclude.some(p => p.x === newPoint.x && p.y === newPoint.y));
  return newPoint;
};

const generateObstacles = (level: number, exclude: Point[]): Point[] => {
  const obstacles: Point[] = [];
  const count = Math.min(level - 1, 10); // Max 10 obstacles
  for (let i = 0; i < count; i++) {
    obstacles.push(getRandomPoint([...exclude, ...obstacles]));
  }
  return obstacles;
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    snake: [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }],
    food: { x: 5, y: 5 },
    powerUp: null,
    obstacles: [],
    direction: 'UP',
    nextDirection: 'UP',
    score: 0,
    highScore: parseInt(localStorage.getItem('snakeHighScore') || '0'),
    level: 1,
    status: 'START',
    speed: INITIAL_SPEED,
    isDoublePoints: false,
  });

  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);

  const resetGame = useCallback(() => {
    const initialSnake = [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }];
    const initialFood = getRandomPoint(initialSnake);
    setGameState(prev => ({
      ...prev,
      snake: initialSnake,
      food: initialFood,
      powerUp: null,
      obstacles: [],
      direction: 'UP',
      nextDirection: 'UP',
      score: 0,
      level: 1,
      status: 'PLAYING',
      speed: INITIAL_SPEED,
      isDoublePoints: false,
    }));
  }, []);

  const gameOver = useCallback(() => {
    setGameState(prev => {
      const newHighScore = Math.max(prev.score, prev.highScore);
      localStorage.setItem('snakeHighScore', newHighScore.toString());
      return { ...prev, status: 'GAME_OVER', highScore: newHighScore };
    });
  }, []);

  const moveSnake = useCallback(() => {
    setGameState(prev => {
      if (prev.status !== 'PLAYING') return prev;

      const head = prev.snake[0];
      const newDirection = prev.nextDirection;
      const newHead = { ...head };

      switch (newDirection) {
        case 'UP': newHead.y -= 1; break;
        case 'DOWN': newHead.y += 1; break;
        case 'LEFT': newHead.x -= 1; break;
        case 'RIGHT': newHead.x += 1; break;
      }

      // Wall Collision
      if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
        gameOver();
        return prev;
      }

      // Self Collision
      if (prev.snake.some(p => p.x === newHead.x && p.y === newHead.y)) {
        gameOver();
        return prev;
      }

      // Obstacle Collision
      if (prev.obstacles.some(p => p.x === newHead.x && p.y === newHead.y)) {
        gameOver();
        return prev;
      }

      const newSnake = [newHead, ...prev.snake];
      let newFood = prev.food;
      let newScore = prev.score;
      let newLevel = prev.level;
      let newSpeed = prev.speed;
      let newPowerUp = prev.powerUp;
      let newIsDoublePoints = prev.isDoublePoints;
      let newObstacles = prev.obstacles;

      // Check Food
      if (newHead.x === prev.food.x && newHead.y === prev.food.y) {
        newScore += prev.isDoublePoints ? 20 : 10;
        newFood = getRandomPoint([...newSnake, ...newObstacles]);
        
        // Level Up
        if (Math.floor(newScore / 50) > Math.floor(prev.score / 50)) {
          newLevel += 1;
          newSpeed = Math.max(MIN_SPEED, INITIAL_SPEED - (newLevel - 1) * SPEED_INCREMENT);
          newObstacles = generateObstacles(newLevel, [...newSnake, newFood]);
        }

        // Spawn Power-up (10% chance)
        if (!newPowerUp && Math.random() < 0.1) {
          newPowerUp = {
            position: getRandomPoint([...newSnake, newFood, ...newObstacles]),
            type: 'GOLDEN_APPLE',
            expiresAt: Date.now() + 10000,
          };
        }
      } else {
        newSnake.pop();
      }

      // Check Power-up
      if (newPowerUp && newHead.x === newPowerUp.position.x && newHead.y === newPowerUp.position.y) {
        newIsDoublePoints = true;
        newPowerUp = null;
        setTimeout(() => {
          setGameState(s => ({ ...s, isDoublePoints: false }));
        }, 10000);
      }

      // Check Power-up Expiry
      if (newPowerUp && Date.now() > newPowerUp.expiresAt) {
        newPowerUp = null;
      }

      return {
        ...prev,
        snake: newSnake,
        food: newFood,
        powerUp: newPowerUp,
        obstacles: newObstacles,
        direction: newDirection,
        score: newScore,
        level: newLevel,
        speed: newSpeed,
        isDoublePoints: newIsDoublePoints,
      };
    });
  }, [gameOver]);

  useEffect(() => {
    if (gameState.status === 'PLAYING') {
      gameLoopRef.current = setInterval(moveSnake, gameState.speed);
    } else {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    }
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [gameState.status, gameState.speed, moveSnake]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setGameState(prev => {
        const key = e.key;
        let nextDir = prev.nextDirection;

        if (key === 'ArrowUp' && prev.direction !== 'DOWN') nextDir = 'UP';
        if (key === 'ArrowDown' && prev.direction !== 'UP') nextDir = 'DOWN';
        if (key === 'ArrowLeft' && prev.direction !== 'RIGHT') nextDir = 'LEFT';
        if (key === 'ArrowRight' && prev.direction !== 'LEFT') nextDir = 'RIGHT';
        if (key === ' ') {
          if (prev.status === 'PLAYING') return { ...prev, status: 'PAUSED' };
          if (prev.status === 'PAUSED') return { ...prev, status: 'PLAYING' };
          if (prev.status === 'START' || prev.status === 'GAME_OVER') {
            resetGame();
            return prev;
          }
        }

        return { ...prev, nextDirection: nextDir };
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [resetGame]);

  const handleControl = (dir: Direction) => {
    setGameState(prev => {
      if (dir === 'UP' && prev.direction !== 'DOWN') return { ...prev, nextDirection: 'UP' };
      if (dir === 'DOWN' && prev.direction !== 'UP') return { ...prev, nextDirection: 'DOWN' };
      if (dir === 'LEFT' && prev.direction !== 'RIGHT') return { ...prev, nextDirection: 'LEFT' };
      if (dir === 'RIGHT' && prev.direction !== 'LEFT') return { ...prev, nextDirection: 'RIGHT' };
      return prev;
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Header */}
      <div className="w-full max-w-md flex justify-between items-center mb-6">
        <div className="flex flex-col">
          <h1 className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600 uppercase italic">
            Neon Snake
          </h1>
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 uppercase tracking-widest">
            <Zap className={`w-3 h-3 ${gameState.isDoublePoints ? 'text-yellow-400 animate-pulse' : ''}`} />
            Level {gameState.level}
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-2xl font-bold">
            {gameState.score.toString().padStart(4, '0')}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-zinc-500 uppercase tracking-widest">
            <Trophy className="w-3 h-3" />
            Best: {gameState.highScore}
          </div>
        </div>
      </div>

      {/* Game Board */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-green-500 rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
        <div 
          className="relative bg-[#111] border border-zinc-800 rounded-lg overflow-hidden shadow-2xl"
          style={{ 
            width: 'min(90vw, 400px)', 
            height: 'min(90vw, 400px)',
            display: 'grid',
            gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
            gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`
          }}
        >
          {/* Grid Background */}
          {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => (
            <div key={i} className="border-[0.5px] border-zinc-900/30" />
          ))}

          {/* Snake */}
          {gameState.snake.map((p, i) => (
            <motion.div
              key={`${i}-${p.x}-${p.y}`}
              initial={false}
              animate={{ x: 0, y: 0 }}
              className="absolute rounded-sm shadow-[0_0_10px_rgba(16,185,129,0.3)]"
              style={{
                width: `${100 / GRID_SIZE}%`,
                height: `${100 / GRID_SIZE}%`,
                left: `${(p.x / GRID_SIZE) * 100}%`,
                top: `${(p.y / GRID_SIZE) * 100}%`,
                backgroundColor: i === 0 ? '#10b981' : '#065f46',
                zIndex: 10,
                scale: i === 0 ? 1.1 : 0.9,
              }}
            />
          ))}

          {/* Food */}
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="absolute bg-red-500 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.6)]"
            style={{
              width: `${100 / GRID_SIZE}%`,
              height: `${100 / GRID_SIZE}%`,
              left: `${(gameState.food.x / GRID_SIZE) * 100}%`,
              top: `${(gameState.food.y / GRID_SIZE) * 100}%`,
              zIndex: 5,
            }}
          />

          {/* Power-up */}
          {gameState.powerUp && (
            <motion.div
              animate={{ rotate: 360, scale: [1, 1.3, 1] }}
              transition={{ rotate: { repeat: Infinity, duration: 2, ease: "linear" }, scale: { repeat: Infinity, duration: 1 } }}
              className="absolute bg-yellow-400 rounded-sm shadow-[0_0_20px_rgba(250,204,21,0.8)]"
              style={{
                width: `${100 / GRID_SIZE}%`,
                height: `${100 / GRID_SIZE}%`,
                left: `${(gameState.powerUp.position.x / GRID_SIZE) * 100}%`,
                top: `${(gameState.powerUp.position.y / GRID_SIZE) * 100}%`,
                zIndex: 6,
              }}
            />
          )}

          {/* Obstacles */}
          {gameState.obstacles.map((p, i) => (
            <div
              key={`obs-${i}`}
              className="absolute bg-zinc-700 border border-zinc-600 rounded-sm"
              style={{
                width: `${100 / GRID_SIZE}%`,
                height: `${100 / GRID_SIZE}%`,
                left: `${(p.x / GRID_SIZE) * 100}%`,
                top: `${(p.y / GRID_SIZE) * 100}%`,
                zIndex: 4,
              }}
            >
              <ShieldAlert className="w-full h-full p-0.5 text-zinc-500" />
            </div>
          ))}

          {/* Overlay Screens */}
          <AnimatePresence>
            {gameState.status !== 'PLAYING' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center"
              >
                {gameState.status === 'START' && (
                  <>
                    <motion.div 
                      initial={{ y: 20 }}
                      animate={{ y: 0 }}
                      className="mb-6"
                    >
                      <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                        <Play className="w-8 h-8 text-emerald-500 fill-emerald-500" />
                      </div>
                      <h2 className="text-2xl font-bold mb-2">Ready to Hunt?</h2>
                      <p className="text-zinc-400 text-sm">Use arrows or D-pad to move. Eat apples to grow and level up.</p>
                    </motion.div>
                    <button 
                      onClick={resetGame}
                      className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-full transition-all active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                    >
                      START GAME
                    </button>
                  </>
                )}

                {gameState.status === 'PAUSED' && (
                  <>
                    <h2 className="text-3xl font-black mb-6 italic uppercase tracking-tighter">Paused</h2>
                    <button 
                      onClick={() => setGameState(s => ({ ...s, status: 'PLAYING' }))}
                      className="px-8 py-3 bg-emerald-500 text-black font-bold rounded-full"
                    >
                      RESUME
                    </button>
                  </>
                )}

                {gameState.status === 'GAME_OVER' && (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                  >
                    <h2 className="text-4xl font-black mb-2 text-red-500 italic uppercase tracking-tighter">Crushed</h2>
                    <p className="text-zinc-400 mb-6 font-mono">Final Score: {gameState.score}</p>
                    <button 
                      onClick={resetGame}
                      className="flex items-center gap-2 px-8 py-3 bg-white text-black font-bold rounded-full hover:bg-zinc-200 transition-all active:scale-95"
                    >
                      <RotateCcw className="w-5 h-5" />
                      TRY AGAIN
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-8 grid grid-cols-3 gap-2 w-full max-w-[200px]">
        <div />
        <ControlButton icon={<ChevronUp />} onClick={() => handleControl('UP')} />
        <div />
        <ControlButton icon={<ChevronLeft />} onClick={() => handleControl('LEFT')} />
        <ControlButton icon={gameState.status === 'PLAYING' ? <Pause /> : <Play />} onClick={() => {
          if (gameState.status === 'PLAYING') setGameState(s => ({ ...s, status: 'PAUSED' }));
          else if (gameState.status === 'PAUSED') setGameState(s => ({ ...s, status: 'PLAYING' }));
          else resetGame();
        }} />
        <ControlButton icon={<ChevronRight />} onClick={() => handleControl('RIGHT')} />
        <div />
        <ControlButton icon={<ChevronDown />} onClick={() => handleControl('DOWN')} />
        <div />
      </div>

      {/* Footer Info */}
      <div className="mt-8 flex gap-4 text-[10px] font-mono text-zinc-600 uppercase tracking-[0.2em]">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-red-500 rounded-full" /> Apple +10
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-yellow-400 rounded-sm" /> Gold x2
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-zinc-700 border border-zinc-500 rounded-sm" /> Wall = End
        </div>
      </div>
    </div>
  );
}

function ControlButton({ icon, onClick }: { icon: React.ReactNode, onClick: () => void }) {
  return (
    <button 
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      onTouchStart={(e) => { e.preventDefault(); onClick(); }}
      className="w-12 h-12 flex items-center justify-center bg-zinc-900 border border-zinc-800 rounded-xl active:bg-emerald-500 active:text-black transition-colors"
    >
      {icon}
    </button>
  );
}
