FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Copy application
COPY . .

# Expose port
EXPOSE 8080

# Start service
CMD ["node", "index.js"]
