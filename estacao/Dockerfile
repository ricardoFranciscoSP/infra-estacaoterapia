# ============================================
# Stage 1: Builder
# ============================================
FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache libc6-compat

ENV NEXT_TELEMETRY_DISABLED=1

# Copiar package.json e lock files (opcionais)
COPY package.json yarn.lock* package-lock.json* ./

# Detectar e instalar dependências com o gerenciador apropriado
RUN echo "[BUILD] Detectando gerenciador de pacotes..." && \
    if [ -f yarn.lock ]; then \
        echo "[BUILD] Usando Yarn (yarn.lock encontrado)" && \
        corepack enable && \
        yarn install --frozen-lockfile --non-interactive; \
    elif [ -f package-lock.json ]; then \
        echo "[BUILD] Usando NPM (package-lock.json encontrado)" && \
        npm ci --prefer-offline --no-audit; \
    else \
        echo "[BUILD] Nenhum lock file encontrado, usando npm install" && \
        npm install --prefer-offline --no-audit; \
    fi

COPY . .

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WEBSITE_URL
ARG NEXT_PUBLIC_SOCKET_URL
ARG NEXT_PUBLIC_VINDI_PUBLIC_KEY
ARG NEXT_PUBLIC_URL_VINDI_API

ENV NODE_ENV=production \
    NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_PUBLIC_WEBSITE_URL=${NEXT_PUBLIC_WEBSITE_URL} \
    NEXT_PUBLIC_SOCKET_URL=${NEXT_PUBLIC_SOCKET_URL} \
    NEXT_PUBLIC_VINDI_PUBLIC_KEY=${NEXT_PUBLIC_VINDI_PUBLIC_KEY} \
    NEXT_PUBLIC_URL_VINDI_API=${NEXT_PUBLIC_URL_VINDI_API}

# Build usando o gerenciador de pacotes apropriado
RUN echo "[BUILD] Iniciando build do Next.js..." && \
    if [ -f yarn.lock ]; then \
        echo "[BUILD] Executando: yarn build" && \
        yarn build; \
    else \
        echo "[BUILD] Executando: npm run build" && \
        npm run build; \
    fi && \
    echo "[BUILD] Build concluído com sucesso!"


# ============================================
# Stage 2: Runner
# ============================================
FROM node:22-alpine AS runner

ENV NODE_ENV=production \
    PORT=3001 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache dumb-init wget

WORKDIR /app

# Criar usuário deploy
RUN addgroup -g 1001 -S deploy && \
    adduser -S deploy -u 1001 -G deploy

COPY --from=builder /app/.next/standalone /app
COPY --from=builder /app/.next/static /app/.next/static
COPY --from=builder /app/public /app/public

# Permissões corretas para cache e arquivos
RUN mkdir -p /app/.next/cache && \
    chown -R deploy:deploy /app && \
    chmod -R 755 /app

USER deploy

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/ || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]

CMD ["node", "/app/server.js"]
