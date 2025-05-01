# puppeteer-server
Simple Puppeteer Server Build on Official Puppeteer Docker Container

This server starts a web server and provides a endpoint to run puppeteer.

Although this looks like a simple server, but lot of work was gone into redirecting requests from `127.0.0.1` to named localhost
so a container can connect to another container easily.

Since puppeteer runs in a separate user, it is not possible to pass unix socket path for easy communication.

# Configuration
```Dockerfile
# Following environment variable must be set to locally connect localhost by
# keeping same hostname for HTTP connection.
ENV LOCALHOST=app
ENV HTTPS_PORT=443
```
