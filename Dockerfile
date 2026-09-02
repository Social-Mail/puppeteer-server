FROM ghcr.io/puppeteer/puppeteer:latest

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# USER root
# Elevate privileges to root to install packages
USER root

# Install FFmpeg and clean up apt caches to minimize bloat
RUN apt-get update && \
    apt-get install -y ffmpeg --no-install-recommends && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

USER $PPTRUSER_UID

# RUN Server Now
# WORKDIR /app
COPY package*.json ./
COPY index.js ./
COPY src ./src
COPY dist ./dist
ENV HOST=0.0.0.0
ENV SELF_HOST=true
ENV PORT=8123
ENV NODE_TLS_REJECT_UNAUTHORIZED=0
EXPOSE 8123

USER root
RUN npm i --omit=dev

USER $PPTRUSER_UID

ENTRYPOINT ["npm", "start"]