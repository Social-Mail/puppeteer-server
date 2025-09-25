FROM ghcr.io/puppeteer/puppeteer:latest

# USER root

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