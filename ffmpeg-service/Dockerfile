# FFmpeg Ping-Pong Service
# Deploys on Railway with FFmpeg pre-installed

FROM node:20-slim

# Install FFmpeg and curl
RUN apt-get update && \
    apt-get install -y ffmpeg curl && \
    rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev for build)
RUN npm install

# Copy source and build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --omit=dev

# Create temp directory for FFmpeg processing
RUN mkdir -p /tmp/ffmpeg

# Expose port
EXPOSE 3001

# Start the service
CMD ["npm", "start"]
