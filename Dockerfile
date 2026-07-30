FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Used at build time for Next rewrites()
ARG BACKEND_URL=http://api:8000
ENV BACKEND_URL=$BACKEND_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Runtime rewrite target (same Docker network service name)
ENV BACKEND_URL=http://api:8000
# SSR self-calls inside container
ENV NEXT_INTERNAL_ORIGIN=http://127.0.0.1:3000

RUN mkdir -p ./public
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/messages ./messages

EXPOSE 3000
CMD ["node", "server.js"]
