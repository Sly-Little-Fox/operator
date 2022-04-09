FROM node:16-bullseye-slim

RUN apt update && \
  apt upgrade -y && \
  apt clean

RUN useradd -m app

ADD --chown=app:app . /home/app

RUN chmod -R 777 /home/app/

RUN chown -R app:app /home/app/

WORKDIR /home/app/

USER app

RUN rm -rf node_modules

RUN NODE_ENV=production yarn install && yarn cache clean

CMD HTTPS_PROXY= ./node_modules/.bin/prisma db push --schema ./src/prisma/schema.prisma && \
  HTTPS_PROXY="$HTTPS_PROXY" node --experimental-json-modules --experimental-import-meta-resolve dist/index.js
