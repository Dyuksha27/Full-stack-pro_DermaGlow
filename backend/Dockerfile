# Use a lightweight, secure Node long-term support image
FROM node:20-alpine

# Establish our workspace environment inside the container
WORKDIR /app

# Copy package configuration files first to optimize Docker layer caching
COPY package*.json ./

# Install clean, locked dependencies
RUN npm install

# Explicitly ensure the destination directories for file uploads exist
RUN mkdir -p uploads/products

# Copy the remaining project execution scripts and assets
COPY . .

# Expose the specific network port our Express app listens on
EXPOSE 5000

# ⚡ CHANGED: Direct node invocation bypasses the missing npm start alias script error safely!
CMD ["node", "src/index.js"]