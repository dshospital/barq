# ==========================================
# Multi-stage Dockerfile for WhatsApp BSP Platform
# ==========================================

# Base stage
FROM node:20-alpine AS base
WORKDIR /app
RUN npm install -g @nestjs/cli

# Development stage
FROM base AS development
ENV NODE_ENV=development
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "start:dev"]

# Build stage
FROM base AS build
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/apps/api-gateway/main"]

# Webhook Handler stage
FROM node:20-alpine AS webhook
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY --from=build /app/dist ./dist
EXPOSE 3001
CMD ["node", "dist/apps/webhook-handler/main"]

# Message Worker stage
FROM node:20-alpine AS worker
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production --legacy-peer-deps && npm cache clean --force
COPY --from=build /app/dist ./dist
CMD ["node", "dist/apps/message-worker/main"]
