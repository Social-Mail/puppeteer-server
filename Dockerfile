FROM ghcr.io/puppeteer/puppeteer:latest

# USER root

# RUN Server Now
# WORKDIR /app
COPY package*.json ./
COPY index.js ./
COPY src ./src
COPY dist ./dist
COPY node_modules ./node_modules
ENV HOST=0.0.0.0
ENV SELF_HOST=true
ENV PORT=8123
EXPOSE 8123


ENTRYPOINT ["npm", "start"]