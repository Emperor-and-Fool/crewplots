# Use Node.js 18 Alpine as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Set environment for Docker deployment
ENV DOCKER_ENV=true

# Expose port
EXPOSE 5000

# Start the application
CMD ["npm", "run", "dev"]