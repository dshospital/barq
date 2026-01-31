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
RUN npm install --legacy-peer-deps
COPY . .
CMD ["npm", "run", "start:dev"]

# Build stage (تم الإصلاح هنا) 🛠️
FROM base AS build
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

# Production stage (تم الإصلاح هنا) 🛠️
FROM node:20-alpine AS production
ENV NODE_ENV=development
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production --legacy-peer-deps && npm cache clean --force
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/apps/api-gateway/main"]

# Webhook Handler stage (تم الإصلاح هنا) 🛠️
FROM node:20-alpine AS webhook
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production --legacy-peer-deps && npm cache clean --force
COPY --from=build /app/dist ./dist
EXPOSE 3001
CMD ["node", "dist/apps/webhook-handler/main"]

# Message Worker stage (كان سليمًا وتركناه كما هو) ✅
FROM node:20-alpine AS worker
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production --legacy-peer-deps && npm cache clean --force
COPY --from=build /app/dist ./dist
CMD ["node", "dist/apps/message-worker/main"]