# Сборка и раздача приложения одним образом — для запуска без локального Node.js:
#   docker compose up --build   →   http://localhost:8080

# ---- build ----
FROM docker.io/library/node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# По умолчанию API — mock в браузере (MSW). Для реального бэкенда:
#   docker build --build-arg VITE_API_MOCKS=false --build-arg VITE_API_URL=https://api.example.com .
ARG VITE_API_MOCKS=true
ARG VITE_API_URL=
ENV VITE_API_MOCKS=$VITE_API_MOCKS \
    VITE_API_URL=$VITE_API_URL

RUN npm run build

# ---- serve ----
FROM docker.io/library/caddy:2-alpine

COPY --from=build /app/dist /srv/dist
COPY deploy/Caddyfile /etc/caddy/Caddyfile

EXPOSE 80
