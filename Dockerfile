FROM node:24-bookworm-slim AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
COPY schemas ./schemas
COPY README.md LICENSE NOTICE ./
RUN npm run build
RUN npm prune --omit=dev

FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV FOUNDER_DECISION_HOST=0.0.0.0
ENV FOUNDER_DECISION_DB=/data/founder-decision.sqlite
WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/schemas ./schemas
COPY --from=build --chown=node:node /app/package.json ./
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 8787
VOLUME ["/data"]
CMD ["node", "dist/server.js"]
