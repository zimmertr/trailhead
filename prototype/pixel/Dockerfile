# Headless Chromium for screenshots of the prototype. Built on first use by shot.sh.
FROM mcr.microsoft.com/playwright:v1.49.1-noble
WORKDIR /lab
RUN npm init -y >/dev/null && npm i playwright@1.49.1 >/dev/null
ENTRYPOINT ["node", "/lab/shot.mjs"]
