# Arkham Horror online server: serves the built app and the WebSocket rooms on one port.
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev
ENV PORT=8080 DATA_DIR=/data/rooms NODE_ENV=production
EXPOSE 8080
VOLUME /data
CMD ["npm", "start"]
