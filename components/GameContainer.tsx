
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  GROUND_Y, 
  GRAVITY, 
  JUMP_FORCE, 
  INITIAL_SPEED, 
  SPEED_INCREMENT,
  OBSTACLE_MIN_GAP,
  OBSTACLE_MAX_GAP,
  GRANNY_WIDTH,
  GRANNY_HEIGHT,
  GRANNY_DUCK_HEIGHT,
  TRASH_CAN_WIDTH,
  TRASH_CAN_HEIGHT,
  CAT_WIDTH,
  CAT_HEIGHT,
  CAT_FLYING_Y
} from '../constants';
import { GameStatus, Player, Obstacle, ObstacleType } from '../types';
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

interface GameContainerProps {
  status: GameStatus;
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
}

export interface GameContainerHandle {
  jump: () => void;
  startDuck: () => void;
  stopDuck: () => void;
}

const FAST_FALL_MULTIPLIER = 4; // Multiplier for gravity when ducking mid-air

const GameContainer = forwardRef<GameContainerHandle, GameContainerProps>(({ status, onGameOver, onScoreUpdate }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const scoreRef = useRef<number>(0);
  const speedRef = useRef<number>(INITIAL_SPEED);
  
  const playerRef = useRef<Player>({
    x: 50,
    y: GROUND_Y - GRANNY_HEIGHT,
    width: GRANNY_WIDTH,
    height: GRANNY_HEIGHT,
    vy: 0,
    isJumping: false,
    isDucking: false
  });

  const obstaclesRef = useRef<Obstacle[]>([]);
  const lastObstacleTimeRef = useRef<number>(0);
  const nextObstacleGapRef = useRef<number>(OBSTACLE_MIN_GAP);

  const resetGame = () => {
    scoreRef.current = 0;
    speedRef.current = INITIAL_SPEED;
    playerRef.current = {
      x: 50,
      y: GROUND_Y - GRANNY_HEIGHT,
      width: GRANNY_WIDTH,
      height: GRANNY_HEIGHT,
      vy: 0,
      isJumping: false,
      isDucking: false
    };
    obstaclesRef.current = [];
    lastObstacleTimeRef.current = 0;
    nextObstacleGapRef.current = Math.random() * (OBSTACLE_MAX_GAP - OBSTACLE_MIN_GAP) + OBSTACLE_MIN_GAP;
  };

  const stopDuck = () => {
    const p = playerRef.current;
    p.isDucking = false;
    p.height = GRANNY_HEIGHT;
    // If we're not jumping, reset Y to stand height. 
    // If we ARE jumping, the physics loop will handle height adjustments.
    if (!p.isJumping) {
      p.y = GROUND_Y - GRANNY_HEIGHT;
    }
  };

  const jump = () => {
    const p = playerRef.current;
    if (!p.isJumping && status === GameStatus.PLAYING) {
      // Chrome dino allows jumping from a duck. 
      // If ducking, we stop the duck visual height before the jump calculation if needed, 
      // but usually the jump force just takes over.
      p.vy = JUMP_FORCE;
      p.isJumping = true;
      // Note: we don't force stopDuck() here so that if the user is holding duck, 
      // they immediately enter the "fast fall" state or stay ducked.
    }
  };

  const startDuck = () => {
    const p = playerRef.current;
    if (status === GameStatus.PLAYING) {
      p.isDucking = true;
      p.height = GRANNY_DUCK_HEIGHT;
      // If on ground, adjust Y immediately. If in air, the physics loop will handle it.
      if (!p.isJumping) {
        p.y = GROUND_Y - GRANNY_DUCK_HEIGHT;
      }
    }
  };

  useImperativeHandle(ref, () => ({
    jump,
    startDuck,
    stopDuck
  }));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        jump();
      } else if (e.key === 'Shift' || e.code === 'ArrowDown') {
        e.preventDefault();
        startDuck();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift' || e.code === 'ArrowDown') {
        e.preventDefault();
        stopDuck();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [status]);

  const drawGranny = (ctx: CanvasRenderingContext2D, p: Player, time: number) => {
    ctx.save();
    const x = p.x;
    const y = p.y;
    const isDuck = p.isDucking;
    
    // Hair
    ctx.fillStyle = '#cccccc';
    if (isDuck) {
      ctx.fillRect(x + 25, y + 5, 12, 12);
    } else {
      ctx.fillRect(x + 20, y - 5, 15, 15);
    }

    // Head
    ctx.fillStyle = '#ffdbac';
    if (isDuck) {
      ctx.fillRect(x + 15, y + 10, 18, 15);
    } else {
      ctx.fillRect(x + 10, y + 5, 20, 20);
    }

    // Glasses
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    if (isDuck) {
        ctx.strokeRect(x + 18, y + 15, 6, 4);
        ctx.strokeRect(x + 26, y + 15, 6, 4);
    } else {
        ctx.strokeRect(x + 12, y + 10, 8, 5);
        ctx.strokeRect(x + 22, y + 10, 8, 5);
    }

    // Dress
    ctx.fillStyle = '#9b59b6';
    if (isDuck) {
      ctx.fillRect(x + 5, y + 20, 35, 10);
    } else {
      ctx.fillRect(x + 5, y + 25, 30, 15);
    }

    // Legs
    const legOffset = (p.isJumping || isDuck) ? 0 : Math.sin(time / 50) * 5;
    ctx.fillStyle = '#000';
    if (isDuck) {
        ctx.fillRect(x + 10, y + 28, 6, 4);
        ctx.fillRect(x + 24, y + 28, 6, 4);
    } else {
        ctx.fillRect(x + 10, y + 40, 6, 7 + legOffset);
        ctx.fillRect(x + 24, y + 40, 6, 7 - legOffset);
    }

    ctx.restore();
  };

  const drawObstacle = (ctx: CanvasRenderingContext2D, obs: Obstacle, time: number) => {
    ctx.save();
    const { x, y, width, height, type } = obs;

    if (type === ObstacleType.TRASH_CAN) {
      ctx.fillStyle = '#7f8c8d';
      ctx.fillRect(x, y, width, height);
      ctx.fillStyle = '#95a5a6';
      for (let i = 1; i < 4; i++) {
          ctx.fillRect(x + i * 5, y + 5, 2, height - 10);
      }
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(x - 2, y, width + 4, 8);
    } else {
      const tailWiggle = Math.sin(time / 20) * 8;
      
      const gradient = ctx.createLinearGradient(x, 0, x, height);
      gradient.addColorStop(0, 'rgba(52, 73, 94, 0.1)');
      gradient.addColorStop(0.8, 'rgba(52, 73, 94, 0.4)');
      gradient.addColorStop(1, 'rgba(52, 73, 94, 0.8)');
      ctx.fillStyle = gradient;
      ctx.fillRect(x, 0, width, height);

      ctx.fillStyle = '#2c3e50'; 
      ctx.fillRect(x + 5, height - 25, width - 10, 20);
      
      ctx.fillRect(x + width - 15, height - 35, 15, 15);
      
      ctx.beginPath();
      ctx.moveTo(x + width - 15, height - 35);
      ctx.lineTo(x + width - 20, height - 45);
      ctx.lineTo(x + width - 8, height - 35);
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(x + width - 5, height - 35);
      ctx.lineTo(x + width + 2, height - 45);
      ctx.lineTo(x + width, height - 35);
      ctx.fill();

      ctx.strokeStyle = '#2c3e50';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x + 5, height - 15);
      ctx.quadraticCurveTo(x - 15, height - 15 + tailWiggle, x - 10, height - 40);
      ctx.stroke();
    }
    ctx.restore();
  };

  const drawGround = (ctx: CanvasRenderingContext2D, time: number) => {
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
    ctx.stroke();

    const offset = (time * speedRef.current / 10) % 50;
    ctx.beginPath();
    for (let i = -50; i < CANVAS_WIDTH; i += 50) {
      ctx.moveTo(i + 50 - offset, GROUND_Y + 5);
      ctx.lineTo(i + 40 - offset, GROUND_Y + 5);
    }
    ctx.stroke();
  };

  const update = (time: number) => {
    if (status !== GameStatus.PLAYING) return;

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    speedRef.current += SPEED_INCREMENT;
    scoreRef.current += 0.15 * (speedRef.current / INITIAL_SPEED); 
    onScoreUpdate(scoreRef.current);

    const p = playerRef.current;
    if (p.isJumping) {
      // Apply gravity. If ducking mid-air, apply much more gravity for instant drop.
      const currentGravity = p.isDucking ? GRAVITY * FAST_FALL_MULTIPLIER : GRAVITY;
      p.vy += currentGravity;
      p.y += p.vy;

      if (p.y > GROUND_Y - p.height) {
        p.y = GROUND_Y - p.height;
        p.vy = 0;
        p.isJumping = false;
      }
    } else if (p.isDucking) {
      // Keep grounded if ducking
      p.y = GROUND_Y - p.height;
    }

    drawGround(ctx, time);

    if (time - lastObstacleTimeRef.current > nextObstacleGapRef.current) {
      const type = Math.random() > 0.6 ? ObstacleType.FLYING_CAT : ObstacleType.TRASH_CAN;
      const width = type === ObstacleType.TRASH_CAN ? TRASH_CAN_WIDTH : CAT_WIDTH;
      const height = type === ObstacleType.TRASH_CAN ? TRASH_CAN_HEIGHT : CAT_HEIGHT;
      const y = type === ObstacleType.TRASH_CAN ? GROUND_Y - height : CAT_FLYING_Y;

      obstaclesRef.current.push({
        x: CANVAS_WIDTH,
        y,
        width,
        height,
        speed: speedRef.current,
        type
      });
      lastObstacleTimeRef.current = time;
      
      const speedFactor = 10 / speedRef.current;
      nextObstacleGapRef.current = (Math.random() * (OBSTACLE_MAX_GAP - OBSTACLE_MIN_GAP) + OBSTACLE_MIN_GAP) * speedFactor;
    }

    for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
      const obs = obstaclesRef.current[i];
      obs.x -= speedRef.current;

      drawObstacle(ctx, obs, time);

      const margin = 5; 
      if (
        p.x + margin < obs.x + obs.width &&
        p.x + p.width - margin > obs.x &&
        p.y + margin < obs.y + obs.height &&
        p.y + p.height - margin > obs.y
      ) {
        onGameOver(Math.floor(scoreRef.current));
        return;
      }

      if (obs.x + obs.width < 0) {
        obstaclesRef.current.splice(i, 1);
      }
    }

    drawGranny(ctx, p, time);
    requestRef.current = requestAnimationFrame(update);
  };

  useEffect(() => {
    if (status === GameStatus.PLAYING) {
      resetGame();
      requestRef.current = requestAnimationFrame(update);
    } else if (status === GameStatus.GAMEOVER) {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    } else {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        drawGround(ctx, 0);
        drawGranny(ctx, playerRef.current, 0);
      }
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [status]);

  return (
    <div className="relative w-full h-full select-none">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="w-full h-full block"
        onClick={jump}
      />
    </div>
  );
});

export default GameContainer;
