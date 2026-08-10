FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependências
COPY package.json package-lock.json* ./
RUN npm install

# Copiar código-fonte e buildar
COPY . .
RUN npm run build

# Imagem de produção
FROM node:20-alpine

WORKDIR /app

# Copiar apenas a build gerada pelo Nitro (TanStack Start)
COPY --from=builder /app/.output ./.output

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Iniciar o servidor Node (Nitro)
CMD ["node", ".output/server/index.mjs"]
