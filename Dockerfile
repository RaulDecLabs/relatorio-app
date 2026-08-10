FROM node:22-alpine AS builder

WORKDIR /app

# Instalar dependências completas para o build
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

# Copiar código-fonte e buildar
COPY . .
RUN npm run build

# Imagem de produção
FROM node:22-alpine

WORKDIR /app

# Copiar a build do Nitro
COPY --from=builder /app/.output ./.output

# Copiar package.json e instalar SOMENTE as dependências de produção
# Isso garante que openai, ws e qualquer outro pacote externo esteja disponível
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps --omit=dev

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Iniciar o servidor Node (Nitro)
CMD ["node", ".output/server/index.mjs"]
