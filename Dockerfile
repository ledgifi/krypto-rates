FROM node:12-alpine

WORKDIR /app

COPY package.json lerna.json yarn.lock ./
COPY packages/common/package.json packages/common/
COPY packages/scripts/package.json packages/scripts/
COPY packages/server/package.json packages/server/
COPY packages/sources/package.json packages/sources/
COPY packages/utils/package.json packages/utils/

RUN yarn install

COPY tsconfig.json .prettierrc ./
COPY packages packages
COPY config config

EXPOSE $PORT

CMD ["yarn", "start", "--scope", "@raptorsystems/krypto-rates-server"]
