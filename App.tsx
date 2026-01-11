
import React, { useState, useCallback, useRef } from 'react';
import { GameStatus, GameState } from './types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants';
import GameContainer, { GameContainerHandle } from './components/GameContainer';
import { getGrannyCommentary } from './services/gemini';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    status: GameStatus.START,
    score: 0,
    highScore: parseInt(localStorage.getItem('grannyHighscore') || '0'),
    commentary: ''
  });
  const [loadingCommentary, setLoadingCommentary] = useState(false);
  const gameRef = useRef<GameContainerHandle>(null);

  const handleGameOver = useCallback(async (finalScore: number) => {
    setGameState(prev => {
      const newHighScore = Math.max(prev.highScore, finalScore);
      localStorage.setItem('grannyHighscore', newHighScore.toString());
      return {
        ...prev,
        status: GameStatus.GAMEOVER,
        score: finalScore,
        highScore: newHighScore
      };
    });

    setLoadingCommentary(true);
    const text = await getGrannyCommentary(finalScore);
    setGameState(prev => ({ ...prev, commentary: text }));
    setLoadingCommentary(false);
  }, []);

  const handleRestart = () => {
    setGameState(prev => ({
      ...prev,
      status: GameStatus.PLAYING,
      score: 0,
      commentary: ''
    }));
  };

  const handleStart = () => {
    setGameState(prev => ({ ...prev, status: GameStatus.PLAYING }));
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-start py-8 px-4 overflow-y-auto">
      <div className="max-w-3xl w-full bg-white rounded-xl shadow-2xl overflow-hidden border-4 border-gray-800 flex-shrink-0">
        
        {/* Header / HUD */}
        <div className="bg-gray-800 p-4 flex justify-between items-center text-white font-mono text-sm sm:text-base">
          <div className="flex items-center gap-2">
            <span className="text-yellow-400">★</span>
            <span>SCORE: {Math.floor(gameState.score)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-blue-400">🏆</span>
            <span>HI: {gameState.highScore}</span>
          </div>
        </div>

        {/* Game Area */}
        <div className="relative bg-[#f7f7f7] cursor-pointer overflow-hidden" style={{ height: CANVAS_HEIGHT }}>
          <GameContainer 
            ref={gameRef}
            status={gameState.status} 
            onGameOver={handleGameOver} 
            onScoreUpdate={(s) => setGameState(prev => ({ ...prev, score: s }))}
          />

          {/* Overlays */}
          {gameState.status === GameStatus.START && (
            <div 
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm transition-all animate-pulse"
              onClick={handleStart}
            >
              <h1 className="text-white text-2xl mb-4 drop-shadow-lg text-center px-4">GRANNY RUN</h1>
              <p className="text-white text-xs animate-bounce">PRESS SPACE OR CLICK TO START</p>
            </div>
          )}

          {gameState.status === GameStatus.GAMEOVER && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm p-6 text-center z-10">
              <h2 className="text-red-500 text-2xl mb-2">GAME OVER!</h2>
              
              <div className="bg-white/10 p-4 rounded-lg mb-6 max-w-md">
                <p className="text-white text-sm italic">
                  {loadingCommentary ? "Granny is thinking of a witty insult..." : `"${gameState.commentary}"`}
                </p>
              </div>

              <button 
                onClick={handleRestart}
                className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 px-6 py-3 rounded-full font-bold transition-transform active:scale-95 text-xs sm:text-sm"
              >
                TRY AGAIN, DEARIE
              </button>
            </div>
          )}
        </div>

        {/* Desktop Controls Info */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 hidden sm:block">
          <div className="text-gray-500 text-[10px] sm:text-xs flex justify-between uppercase">
            <div className="flex gap-4">
              <span>SPACE / UP: JUMP</span>
              <span>SHIFT: CROUCH</span>
            </div>
            <span>WATCH OUT FOR FLYING CATS!</span>
          </div>
        </div>
      </div>

      {/* Credit Text - Now above buttons */}
      <div className="mt-8 mb-6 text-gray-500 text-sm font-bold tracking-widest text-center uppercase">
        <p>(A GAME BY AL-HDAD)</p>
      </div>

      {/* Mobile Controls - Moved below the credit text and made larger */}
      {gameState.status === GameStatus.PLAYING && (
        <div className="w-full max-w-3xl flex justify-between items-center gap-6 sm:hidden mt-2 pb-8">
          <button
            className="flex-1 h-32 rounded-3xl bg-gray-800 border-b-8 border-gray-950 text-white font-black flex flex-col items-center justify-center active:bg-gray-700 active:border-b-0 active:translate-y-2 transition-all text-2xl shadow-xl"
            onTouchStart={(e) => { e.preventDefault(); gameRef.current?.startDuck(); }}
            onTouchEnd={(e) => { e.preventDefault(); gameRef.current?.stopDuck(); }}
            onMouseDown={(e) => { e.preventDefault(); gameRef.current?.startDuck(); }}
            onMouseUp={(e) => { e.preventDefault(); gameRef.current?.stopDuck(); }}
            onMouseLeave={(e) => { e.preventDefault(); gameRef.current?.stopDuck(); }}
          >
            <span className="text-xs text-gray-400 mb-1 opacity-50">HOLD TO</span>
            DUCK
          </button>
          
          <button
            className="flex-1 h-32 rounded-3xl bg-blue-600 border-b-8 border-blue-900 text-white font-black flex flex-col items-center justify-center active:bg-blue-500 active:border-b-0 active:translate-y-2 transition-all text-2xl shadow-xl"
            onTouchStart={(e) => { e.preventDefault(); gameRef.current?.jump(); }}
            onMouseDown={(e) => { e.preventDefault(); gameRef.current?.jump(); }}
          >
            <span className="text-xs text-blue-200 mb-1 opacity-50">TAP TO</span>
            JUMP
          </button>
        </div>
      )}

      {gameState.status !== GameStatus.PLAYING && (
          <div className="sm:hidden text-gray-400 text-[10px] text-center mt-4">
              CONTROLS WILL APPEAR WHEN GAME STARTS
          </div>
      )}
    </div>
  );
};

export default App;
