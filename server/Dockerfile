FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY server/ ./server/
COPY src/games/saboteur/ ./src/games/saboteur/

EXPOSE 4000
CMD ["node", "server/index.js"]
