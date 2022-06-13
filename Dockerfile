FROM debian:bookworm

RUN apt update && \
  apt upgrade -y && \
  apt install rsync libvips42 curl npm nodejs yarnpkg git   -y && \
  apt clean

RUN useradd -m app

ADD --chown=app:app . /home/app/data

RUN chmod -R 777 /home/app/

RUN chown -R app:app /home/app/

USER app

# RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | sh

# ENV NVM_DIR=/home/app/.nvm

WORKDIR /home/app/data/

ENV HOME=/home/app/ \
  NODE_ENV=production \
  USER=app

RUN rm -rf node_modules/

RUN NODE_ENV=development yarnpkg install && yarnpkg cache clean --mirror

RUN ./node_modules/.bin/tsc

RUN rsync --exclude *.ts -a ./src/data/ ./dist/data/

CMD \
  HTTPS_PROXY= ./node_modules/.bin/prisma db push --schema ./src/prisma/schema.prisma && \
  HTTPS_PROXY="$HTTPS_PROXY" node --experimental-json-modules --experimental-import-meta-resolve dist/index.js
