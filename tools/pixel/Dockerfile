# Headless Chromium for screenshots of the pixel world. Built on first use by shot.sh.
FROM mcr.microsoft.com/playwright:v1.65.1-noble@sha256:1507cbfc550a63a6b7396791ca4f00df17beb56342d2447b3f106c306f525579
WORKDIR /lab
# The package comes from the lock, at the image's own Playwright version (lab/package.json).
COPY lab/package.json lab/package-lock.json ./
RUN npm ci --ignore-scripts >/dev/null
ENTRYPOINT ["node", "/lab/shot.mjs"]
