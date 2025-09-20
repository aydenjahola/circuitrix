FROM node:24-alpine

WORKDIR /app

RUN apt-get update && \
    apt-get install -y \
    ffmpeg \
    build-essential \
    python3 \
    git \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm install

COPY . .

ENV NODE_ENV=production

CMD ["node", "index.js"]