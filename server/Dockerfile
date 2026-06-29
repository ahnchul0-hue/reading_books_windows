FROM node:22-slim

WORKDIR /app

# 의존성 (better-sqlite3는 node:22 리눅스 prebuilt 사용)
COPY package.json ./
RUN npm install --omit=dev

COPY src ./src

ENV PORT=4000
ENV DB_FILE=/data/reading.db
VOLUME ["/data"]
EXPOSE 4000

CMD ["node", "src/server.js"]
