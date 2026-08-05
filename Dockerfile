# Usar a imagem oficial do Node.js
FROM node:20-alpine

# Definir diretório de trabalho dentro do container
WORKDIR /app

# Copiar os arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm install --legacy-peer-deps

# Copiar todo o código do projeto
COPY . .

# Alterar o preset do Vite/Nitro para Node.js puro antes do build
# Usamos sed para substituir o preset: 'vercel' (se existir)
RUN sed -i "s/preset: 'vercel'/preset: 'node-server'/g" vite.config.ts

# Fazer o build do projeto com Nitro forçado para node-server sem usar cache antigo
RUN NITRO_PRESET=node-server npm run build && ls -la .output && ls -la .output/server

# Expor a porta 3000
EXPOSE 3000

# Comando para rodar o servidor em produção
CMD ["node", ".output/server/index.mjs"]
