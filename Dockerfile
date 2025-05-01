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
EXPOSE 80 443 25


ENTRYPOINT ["npm", "start"]