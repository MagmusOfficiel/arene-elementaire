# Image de production : un seul conteneur sert le jeu (client compilé) et le serveur multijoueur
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci
COPY . .
RUN npm run build
ENV NODE_ENV=production PORT=10000
EXPOSE 10000
CMD ["npm", "start"]
