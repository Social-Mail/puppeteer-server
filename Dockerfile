FROM ghcr.io/puppeteer/puppeteer:latest

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# 1. Elevate privileges to root to install system utilities
USER root

# 2. Install FFmpeg, Tini, and clean up apt caches to minimize layer size
RUN apt-get update && \
    apt-get install -y ffmpeg tini --no-install-recommends && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

USER pptruser
# 3. Establish a standard workspace in the user's home directory
WORKDIR /home/pptruser/app

# 4. Copy dependency configurations and fix ownership upfront
COPY --chown=pptruser:pptruser package*.json ./

# 5. Switch to the unprivileged Puppeteer user to install dependencies safely
USER pptruser
RUN npm i --omit=dev

# 6. Copy code files with explicit user permissions
COPY --chown=pptruser:pptruser index.js ./
COPY --chown=pptruser:pptruser src ./src
COPY --chown=pptruser:pptruser dist ./dist

# 7. Application Environments
ENV HOST=0.0.0.0
ENV SELF_HOST=true
ENV PORT=8123
ENV NODE_TLS_REJECT_UNAUTHORIZED=0
EXPOSE 8123

# 8. Platform Independent Init Strategy
# Tini registers as PID 1, forwards signals, and sweeps up orphaned Chromium threads.
ENTRYPOINT ["/usr/bin/tini", "--", "npm", "start"]
