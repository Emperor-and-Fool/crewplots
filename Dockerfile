FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Expose the port the app runs on
EXPOSE 5000

# Make the custom start script executable
RUN chmod +x docker-start.sh

# Command to run the application with our custom start script that ensures Redis is ready
CMD ["./docker-start.sh"]