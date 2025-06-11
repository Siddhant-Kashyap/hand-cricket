import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import ReactConfetti from 'react-confetti';
import bg from '../assets/4796496.jpg';
import oneRun from '../assets/oneRun.jpg';
import twoRun from '../assets/twoRun.jpg';
import threeRun from '../assets/threeRun.jpg';
import fourRun from '../assets/fourRun.jpg';
import sixRun from '../assets/sixRun.jpg';

interface GameState {
  role: 'batsman' | 'bowler' | null;
  roomId: string | null;
  score: number;
  balls: number;
  currentInnings: 1 | 2;
  firstInningsScore: number;
  isOut: boolean;
  gameOver: boolean;
  message: string;
  showConfetti: boolean;
  isWinner: boolean;
  lastBatsmanSelection: number | null;
  lastBowlerSelection: number | null;
  timer: number;
  waitingForSelection: boolean;
}

const Game = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    role: null,
    roomId: null,
    score: 0,
    balls: 0,
    currentInnings: 1,
    firstInningsScore: 0,
    isOut: false,
    gameOver: false,
    message: 'Connecting...',
    showConfetti: false,
    isWinner: false,
    lastBatsmanSelection: null,
    lastBowlerSelection: null,
    timer: 5,
    waitingForSelection: false
  });

  // Timer effect
  useEffect(() => {
    let timerInterval: NodeJS.Timeout | null = null;

    if (gameState.waitingForSelection && gameState.timer > 0) {
      timerInterval = setInterval(() => {
        setGameState(prev => {
          if (prev.timer <= 1) {
            // Time's up - handle timeout
            if (socket && gameState.roomId && !gameState.gameOver) {
              if (gameState.role === 'batsman') {
                // Batsman timeout - counted as out
                socket.emit('makeSelection', {
                  roomId: gameState.roomId,
                  selection: 0, // Special value for timeout
                  role: gameState.role
                });
              } else {
                // Bowler timeout - reward batsman with 4 runs
                socket.emit('makeSelection', {
                  roomId: gameState.roomId,
                  selection: 4,
                  role: gameState.role
                });
              }
            }
            return { ...prev, timer: 5, waitingForSelection: false };
          }
          return { ...prev, timer: prev.timer - 1 };
        });
      }, 1000);
    }

    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [gameState.waitingForSelection, gameState.timer, socket, gameState.roomId, gameState.role, gameState.gameOver]);

  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('findMatch');
      setGameState(prev => ({ ...prev, message: 'Finding opponent...' }));
    });

    newSocket.on('waiting', () => {
      setGameState(prev => ({ ...prev, message: 'Waiting for opponent...' }));
    });

    newSocket.on('gameStart', ({ role, roomId, currentInnings }) => {
      setGameState(prev => ({
        ...prev,
        role,
        roomId,
        currentInnings,
        message: `You are the ${role}!`,
        waitingForSelection: true,
        timer: 5
      }));
    });

    newSocket.on('turnResult', (result) => {
      setGameState(prev => ({
        ...prev,
        score: result.score,
        balls: result.balls,
        isOut: result.isOut,
        lastBatsmanSelection: result.batsmanSelection,
        lastBowlerSelection: result.bowlerSelection,
        message: result.isOut 
          ? (result.batsmanSelection === 0 ? 'OUT! (Timeout)' : 'OUT!') 
          : `+${result.batsmanSelection} runs! (${result.score}/${result.balls})`,
        waitingForSelection: true,
        timer: 5
      }));
    });

    newSocket.on('inningsComplete', ({ firstInningsScore, newRoles }) => {
      const newRole = newRoles[newSocket.id].currentRole;
      setGameState(prev => ({
        ...prev,
        role: newRole,
        currentInnings: 2,
        firstInningsScore,
        score: 0,
        balls: 0,
        isOut: false,
        lastBatsmanSelection: null,
        lastBowlerSelection: null,
        message: `First innings: ${firstInningsScore} runs. You are now ${newRole}! ${
          newRole === 'batsman' 
            ? `Chase ${firstInningsScore + 1} runs to win!` 
            : `Defend ${firstInningsScore} runs!`
        }`
      }));
    });

    newSocket.on('gameOver', ({ firstInningsScore, secondInningsScore, winningTeam }) => {
      const isWinner = winningTeam === newSocket.id;
      const message = isWinner 
        ? '🎉 Congratulations! You won! 🎉' 
        : `Game Over! ${secondInningsScore}/${firstInningsScore} - Better luck next time!`;

      setGameState(prev => ({
        ...prev,
        gameOver: true,
        showConfetti: isWinner,
        isWinner,
        message
      }));
    });

    newSocket.on('playerDisconnected', () => {
      setGameState(prev => ({
        ...prev,
        message: 'Opponent disconnected. Game Over!',
        gameOver: true
      }));
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const runOptions = [
    { value: 1, image: oneRun },
    { value: 2, image: twoRun },
    { value: 3, image: threeRun },
    { value: 4, image: fourRun },
    { value: 6, image: sixRun },
  ];

  const handleSelection = (value: number) => {
    if (!socket || !gameState.roomId || gameState.gameOver) return;

    socket.emit('makeSelection', {
      roomId: gameState.roomId,
      selection: value,
      role: gameState.role
    });
    setGameState(prev => ({
      ...prev,
      waitingForSelection: false,
      timer: 5
    }));
  };

  return (
    <div
      className="w-screen min-h-screen flex justify-center items-center p-4"
      style={{
        backgroundImage: `url(${bg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {gameState.showConfetti && (
        <ReactConfetti
          width={window.innerWidth}
          height={window.innerHeight}
          numberOfPieces={200}
          recycle={false}
          onConfettiComplete={() => setGameState(prev => ({ ...prev, showConfetti: false }))}
        />
      )}

      <div className="flex flex-col md:flex-row gap-6 md:gap-12 bg-black/50 p-4 md:p-8 rounded-xl backdrop-blur-sm max-w-full">
        {/* Score Display Area */}
        <div className="w-full text-center bg-gray-800/50 p-6 rounded-lg">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Score Board</h2>
          <div className="text-white space-y-2">
            <p className="text-xl">Innings: {gameState.currentInnings}</p>
            {gameState.currentInnings === 2 && (
              <p className="text-xl">Target: {gameState.firstInningsScore + 1}</p>
            )}
            <p className="text-xl">Current Score: {gameState.score}</p>
            <p className="text-xl">Balls: {gameState.balls}/6</p>
            {gameState.lastBatsmanSelection && gameState.lastBowlerSelection && (
              <div className="mt-4 p-2 bg-gray-700/50 rounded">
                <p className="text-lg">Last Ball:</p>
                <p className="text-md">Batsman: {gameState.lastBatsmanSelection}</p>
                <p className="text-md">Bowler: {gameState.lastBowlerSelection}</p>
              </div>
            )}
            {gameState.waitingForSelection && (
              <div className="mt-4">
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-500 transition-all duration-1000"
                    style={{ width: `${(gameState.timer / 5) * 100}%` }}
                  ></div>
                </div>
                <p className="text-lg font-bold text-red-500 mt-2">
                  Time remaining: {gameState.timer}s
                  {gameState.role === 'batsman' 
                    ? ' (Out if time expires!)' 
                    : ' (Batsman gets 4 runs if time expires!)'}
                </p>
              </div>
            )}
            <p className="text-lg font-bold text-yellow-400 mt-4">{gameState.message}</p>
          </div>
        </div>

        {/* Game Area */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Player Side */}
          <div className="w-full md:w-[350px] bg-gray-900/90 p-4 rounded-lg">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-4 text-center">
              Your Side ({gameState.role || 'Connecting...'})
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
              {runOptions.map((option) => (
                <div 
                  key={option.value} 
                  className={`cursor-pointer transform transition-transform ${
                    gameState.gameOver ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
                  }`}
                  onClick={() => !gameState.gameOver && handleSelection(option.value)}
                >
                  <img 
                    src={option.image} 
                    alt={`${option.value} Run`} 
                    className="w-full md:w-20 h-20 object-cover rounded-lg shadow-lg"
                  />
                  <p className="text-white text-center mt-1 text-sm md:text-base">{option.value} Run</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {gameState.gameOver && (
        <button
          onClick={() => window.location.reload()}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold"
        >
          Play New Game
        </button>
      )}
    </div>
  );
};

export default Game;