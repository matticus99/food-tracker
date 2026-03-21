# ── Stage 1: Build client ──
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npx vite build

# ── Stage 2: Server deps (all, including dev for drizzle-kit) ──
FROM node:20-alpine AS server-deps
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server/ ./

# ── Stage 3: Build server TypeScript ──
FROM server-deps AS server-build
RUN npm run build

# ── Stage 4: Server production deps only ──
FROM node:20-alpine AS server-prod-deps
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

# ── Stage 5: Production API server ──
FROM node:20-alpine AS production
WORKDIR /app/server
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=server-build /app/server/dist ./dist
COPY --from=server-prod-deps /app/server/node_modules ./node_modules
COPY server/package.json ./
USER appuser
EXPOSE 3001
CMD ["node", "dist/index.js"]

# ── Stage 6: Nginx for serving client + reverse proxy ──
FROM nginx:stable-alpine AS nginx
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=client-build /app/client/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
