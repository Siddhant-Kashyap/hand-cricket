import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

interface GameRoom {
  id: string;
  players: string[];
  gameState: {
    currentInnings: 1 | 2;
    firstInningsScore: number;
    score: number;
    balls: number;
    currentBatsman: string | null;
    currentBowler: string | null;
    batsmanSelection: number | null;
    bowlerSelection: number | null;
    roles: {
      [playerId: string]: {
        firstInnings: 'batsman' | 'bowler';
        currentRole: 'batsman' | 'bowler';
      };
    };
  };
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // We'll update this later with specific domains
    methods: ["GET", "POST"]
  }
});

app.use(cors());

const rooms = new Map<string, GameRoom>();
let totalPlayers = 0;

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  totalPlayers++;
  io.emit('playersUpdate', { totalPlayers });

  socket.on('findMatch', () => {
    let joinedRoom = false;
    
    for (const [roomId, room] of rooms) {
      if (room.players.length < 2) {
        room.players.push(socket.id);
        socket.join(roomId);
        joinedRoom = true;
        
        if (room.players.length === 2) {
          // Assign initial roles
          const firstPlayerIsBatsman = Math.random() > 0.5;
          room.gameState.roles = {
            [room.players[0]]: {
              firstInnings: firstPlayerIsBatsman ? 'batsman' : 'bowler',
              currentRole: firstPlayerIsBatsman ? 'batsman' : 'bowler'
            },
            [room.players[1]]: {
              firstInnings: firstPlayerIsBatsman ? 'bowler' : 'batsman',
              currentRole: firstPlayerIsBatsman ? 'bowler' : 'batsman'
            }
          };

          // Notify players of their roles
          room.players.forEach(playerId => {
            io.to(playerId).emit('gameStart', {
              role: room.gameState.roles[playerId].currentRole,
              roomId,
              currentInnings: 1
            });
          });
        }
        break;
      }
    }

    if (!joinedRoom) {
      const roomId = `room_${Date.now()}`;
      rooms.set(roomId, {
        id: roomId,
        players: [socket.id],
        gameState: {
          currentInnings: 1,
          firstInningsScore: 0,
          score: 0,
          balls: 0,
          currentBatsman: null,
          currentBowler: null,
          batsmanSelection: null,
          bowlerSelection: null,
          roles: {}
        }
      });
      socket.join(roomId);
      socket.emit('waiting');
    }
  });

  socket.on('makeSelection', ({ roomId, selection, role }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    if (role === 'batsman') {
      room.gameState.batsmanSelection = selection;
      room.gameState.currentBatsman = socket.id;
    } else {
      room.gameState.bowlerSelection = selection;
      room.gameState.currentBowler = socket.id;
    }

    // Only process the turn if both players have made their selections
    if (room.gameState.batsmanSelection !== null && room.gameState.bowlerSelection !== null) {
      // Handle timeout scenarios
      const isBatsmanTimeout = room.gameState.batsmanSelection === 0;
      const isBowlerRewardingRun = role === 'bowler' && selection === 4;
      
      let isBatsmanOut = isBatsmanTimeout || 
        (!isBowlerRewardingRun && room.gameState.batsmanSelection === room.gameState.bowlerSelection);
      
      const newBalls = room.gameState.balls + 1;
      let runsScored = isBatsmanOut ? 0 : 
        (isBowlerRewardingRun ? 4 : room.gameState.batsmanSelection);
      const newScore = room.gameState.score + runsScored;
      const isInningsComplete = isBatsmanOut || newBalls >= 6;

      // Second innings special conditions
      const isSecondInnings = room.gameState.currentInnings === 2;
      const targetReached = isSecondInnings && newScore > room.gameState.firstInningsScore;
      const gameOver = isSecondInnings && (isInningsComplete || targetReached);

      if (isInningsComplete && !isSecondInnings) {
        // First innings is complete
        room.gameState.firstInningsScore = newScore;
        room.gameState.currentInnings = 2;
        room.gameState.score = 0;
        room.gameState.balls = 0;
        room.gameState.batsmanSelection = null;
        room.gameState.bowlerSelection = null;

        // Switch roles for second innings
        for (const playerId in room.gameState.roles) {
          room.gameState.roles[playerId].currentRole = 
            room.gameState.roles[playerId].currentRole === 'batsman' ? 'bowler' : 'batsman';
        }

        // Notify players of innings completion and role switch
        io.to(roomId).emit('inningsComplete', {
          firstInningsScore: room.gameState.firstInningsScore,
          newRoles: room.gameState.roles
        });
      } else if (gameOver) {
        // Game is complete
        const winner = newScore > room.gameState.firstInningsScore ? 'second' : 'first';
        const winningTeam = winner === 'first'
          ? Object.entries(room.gameState.roles).find(([_, role]) => role.firstInnings === 'batsman')?.[0]
          : Object.entries(room.gameState.roles).find(([_, role]) => role.firstInnings === 'bowler')?.[0];

        io.to(roomId).emit('gameOver', {
          firstInningsScore: room.gameState.firstInningsScore,
          secondInningsScore: newScore,
          winner,
          winningTeam
        });

        // Clean up the room
        rooms.delete(roomId);
      } else {
        // Continue the current innings
        room.gameState.score = newScore;
        room.gameState.balls = newBalls;
        room.gameState.batsmanSelection = null;
        room.gameState.bowlerSelection = null;

        // Send turn result to both players
        io.to(roomId).emit('turnResult', {
          batsmanSelection: room.gameState.batsmanSelection,
          bowlerSelection: room.gameState.bowlerSelection,
          score: newScore,
          balls: newBalls,
          isOut: isBatsmanOut,
          currentInnings: room.gameState.currentInnings,
          gameOver: false
        });
      }
    }
  });

  socket.on('disconnect', () => {
    totalPlayers--;
    io.emit('playersUpdate', { totalPlayers });
    for (const [roomId, room] of rooms) {
      if (room.players.includes(socket.id)) {
        io.to(roomId).emit('playerDisconnected');
        rooms.delete(roomId);
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});