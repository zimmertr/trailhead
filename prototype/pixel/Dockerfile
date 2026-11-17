# Headless Chromium for screenshots of the prototype. Built on first use by shot.sh.
FROM mcr.microsoft.com/playwright:v1.49.1-noble@sha256:70e367e0cbf60340a5b5fd562f6247a34eb3196efab9f88a3dd56482d9fe09d2
WORKDIR /lab
# The package comes from the lock, at the image's own Playwright version (lab/package.json).
COPY lab/package.json lab/package-lock.json ./
RUN npm ci --ignore-scripts >/dev/null
ENTRYPOINT ["node", "/lab/shot.mjs"]
