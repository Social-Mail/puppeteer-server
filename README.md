# puppeteer-server
Simple Puppeteer Server Build on Official Puppeteer Docker Container

This server starts a web server and provides a endpoint to run puppeteer.

# Configuration
```Dockerfile
# Following environment variable must be set to locally connect localhost by
# keeping same hostname for HTTP connection.
ENV LOCALHOST=app
ENV HTTPS_PORT=443
```
