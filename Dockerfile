FROM jrottenberg/ffmpeg:8-alpine AS ffmpeg

FROM node:current-alpine

COPY --from=ffmpeg /usr/local/bin/ffmpeg /usr/local/bin/
COPY --from=ffmpeg /usr/local/bin/ffprobe /usr/local/bin/

RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && npm install -g npm@latest

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

CMD ["node", "."]