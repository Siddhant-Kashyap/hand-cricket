# Hand Cricket Game

A multiplayer hand cricket game built with React, TypeScript, and Socket.IO.

## Project Structure

This is a monorepo containing both the client and server applications:

- `Client/hand-cricket/` - React frontend application
- `Server/` - Node.js/Express backend with Socket.IO

## Prerequisites

- Node.js (v16 or higher)
- Yarn

## Getting Started

1. Install dependencies:
```bash
yarn install
```

2. Start both client and server in development mode:
```bash
yarn dev
```

Or run them separately:
- Client: `yarn dev:client`
- Server: `yarn dev:server`

## Features

- Real-time multiplayer gameplay
- Two innings cricket match
- Role switching between innings
- Victory celebrations
- Responsive design

## Tech Stack

### Frontend
- React
- TypeScript
- Vite
- TailwindCSS
- Socket.IO Client
- React Router DOM

### Backend
- Node.js
- Express
- TypeScript
- Socket.IO

## Game Rules

1. Each match has two innings
2. Players take turns as batsman and bowler
3. Each innings consists of 6 balls
4. Players select numbers (1-6)
5. If numbers match, batsman is out
6. If numbers don't match, batsman's number is added to score
7. Second innings team chases the target set in first innings