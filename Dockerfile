# ---- build ----
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- runtime ----
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
# Only what the migration script needs; the Nuxt server is self-contained in .output
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY --from=build /app/.output ./.output
COPY scripts ./scripts
COPY server/db/migrations ./server/db/migrations
EXPOSE 3000
# Apply pending migrations, then start. The admin user is seeded by a Nitro plugin on boot.
CMD ["sh", "-c", "node scripts/migrate.mjs && node .output/server/index.mjs"]
