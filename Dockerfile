# Use Node 22 (Debian Bookworm Slim) as the base
FROM node:22-bookworm-slim

# Set the working directory inside the container
WORKDIR /app

# Install system dependencies required for 'canvas'
# libcairo2, libpango, libjpeg, etc are needed for the canvas package to build/run
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy package files first to leverage Docker layer caching
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy the rest of the application code
COPY . .

# Create an empty log file and give the 'node' user permission to write to it
RUN touch log.txt && chown node:node log.txt

# Use the non-root 'node' user for security
USER node

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]