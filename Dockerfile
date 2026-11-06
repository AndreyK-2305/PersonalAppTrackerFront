# syntax=docker/dockerfile:1

# ---- Build: compila la SPA ----
FROM node:24.22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# ---- Runtime: nginx sin privilegios sirve los estáticos y hace de proxy de la API ----
FROM nginxinc/nginx-unprivileged:1.30-alpine

# URL del backend dentro de la red de contenedores; se sustituye en default.conf.template.
ENV BACKEND_URL=http://backend:8080

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY nginx/security-headers.conf nginx/proxy-headers.conf /etc/nginx/snippets/
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
