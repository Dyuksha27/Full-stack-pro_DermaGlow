# Use a clean, optimized Node environment
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Expose Vite's default operational layout port
EXPOSE 5173

# Vite requires the explicitly passed --host flag to receive traffic outside localhost
CMD ["npm", "run", "dev", "--", "--host"]