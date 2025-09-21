FROM node:24-alpine

WORKDIR /app

RUN apk update && \
    apk add --no-cache \
    ffmpeg \
    build-base \
    python3 \
    git \
    && rm -rf /var/cache/apk/*

COPY package*.json ./

RUN npm install

COPY . .

ENV NODE_ENV=production

CMD ["node", "index.js"]