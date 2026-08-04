# Use Debian-based Node image as the base
FROM node:20-bookworm-slim

# Install compilation dependencies: g++ (C++), python3 (Python), and default-jdk (Java)
RUN apt-get update && apt-get install -y \
    g++ \
    python3 \
    default-jdk \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy the rest of the backend code
COPY . .

# Set environment variables
ENV PORT=5001
ENV NODE_ENV=production

# Expose the API port
EXPOSE 5001

# Start the server
CMD ["node", "index.js"]
