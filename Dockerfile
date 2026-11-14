# Imagem de produção em 3 etapas: dependências, build e uma imagem final enxuta (output standalone).

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
# o postinstall gera o cliente do Prisma a partir do schema
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# o cliente do Prisma fica em src/generated (fora do git), então gera de novo aqui
RUN npx prisma generate && npm run build

FROM node:22-alpine AS app
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S balcao && adduser -S balcao -G balcao
COPY --from=build --chown=balcao:balcao /app/.next/standalone ./
COPY --from=build --chown=balcao:balcao /app/.next/static ./.next/static
COPY --from=build --chown=balcao:balcao /app/public ./public
USER balcao
EXPOSE 3000
CMD ["node", "server.js"]
