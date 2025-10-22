FROM node:18-alpine

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./
RUN npm install --production

# Copy source code
COPY . .

EXPOSE 8002

# Use node directly instead of npm for better signal handling
CMD ["node", "server.js"]