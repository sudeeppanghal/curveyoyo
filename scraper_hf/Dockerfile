FROM ghcr.io/puppeteer/puppeteer:22.12.0

WORKDIR /usr/src/app

COPY --chown=pptruser:pptruser package.json ./

RUN npm install

COPY --chown=pptruser:pptruser server.js ./

EXPOSE 7860

CMD [ "node", "server.js" ]
