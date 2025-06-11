#!/bin/bash

# Install Node.js and npm if not already installed
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install dependencies
npm install

# Build the TypeScript code
npx tsc

# Start the server using PM2
pm2 start dist/index.js --name "hand-cricket-server"

# Save PM2 process list and configure to start on system startup
pm2 save
pm2 startup