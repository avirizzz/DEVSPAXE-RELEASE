FROM node:20-alpine

# Install Python 3 and GCC (C++ compiler)
RUN apk update && \
    apk add --no-cache python3 g++ build-base

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy all source files
COPY . .

# Expose the port the app runs on
EXPOSE 5001

# Command to run the backend
CMD ["node", "index.js"]
