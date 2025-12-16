FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Vite's default port
EXPOSE 5173

# You must use --host for Vite to be reachable from outside the container
CMD ["npm", "run", "dev", "--", "--host"]