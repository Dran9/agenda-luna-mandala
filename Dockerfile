# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
WORKDIR /app

COPY apps ./apps
COPY server ./server
RUN npm run build

FROM node:20-bookworm-slim AS prod-deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node server ./server
COPY --from=build --chown=node:node /app/apps/booking/dist ./apps/booking/dist
COPY --from=build --chown=node:node /app/apps/admin/dist ./apps/admin/dist

USER node
EXPOSE 3000

CMD ["npm", "start"]

