# Stage 1: Build the Vite frontend
FROM node:22-bookworm-slim AS frontend-builder
WORKDIR /app

# Install frontend dependencies using root lockfile
COPY package.json package-lock.json ./
RUN npm ci

# Copy frontend source and build production bundle
COPY index.html vite.config.js eslint.config.js ./
COPY src/ ./src/
RUN npm run build

# Stage 2: Production backend runtime
FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app

# Install backend production dependencies using backend lockfile
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci --omit=dev

# Copy backend application source
COPY backend/src/ ./backend/src/

# Copy mock transactions for manual demo database seeding
COPY data/mock_transactions.csv ./data/mock_transactions.csv

# Copy compiled frontend distribution from builder stage
COPY --from=frontend-builder /app/dist ./dist

# Expose server port
EXPOSE 3001

# Start the Express production server
CMD ["node", "backend/src/server.js"]
