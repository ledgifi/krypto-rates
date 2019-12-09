FROM node:12

WORKDIR /app

COPY package.json lerna.json yarn.lock ./
COPY packages/common/package.json packages/common/
COPY packages/server/package.json packages/server/
COPY packages/sources/package.json packages/sources/

RUN yarn install

COPY tsconfig.json .
COPY packages packages

ENV DATABASE_URL postgres
RUN yarn generate

COPY config config

EXPOSE 4000

CMD ["yarn", "start", "--scope", "@raptorsystems/krypto-rates-server"]
