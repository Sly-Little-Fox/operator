FROM node:16-bullseye-slim

RUN mkdir -p /usr/local/share/app/

RUN apt update && apt install tesseract-ocr tesseract-ocr-eng -y && apt clean

RUN useradd -m app

ADD --chown=app:app . /usr/local/share/app/

WORKDIR /usr/local/share/app/

RUN chmod -R 777 /usr/local/share/app/

RUN chown -R app:app /usr/local/share/app/

USER app

RUN echo '{"name":"ocr","private":true,"type":"module"}' > package.json

RUN yarn add xxhashjs lowdb && \
  yarn add -D typescript @types/node@^16 &&\ 
  yarn add tempy fastify fastify-allow \
  consola sharp @sapphire/fetch && \ 
  yarn cache clean --all

RUN ./node_modules/.bin/tsc --module esnext --moduleResolution node --target esnext --esModuleInterop index.ts

CMD ["node", "index.js"]
