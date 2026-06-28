# Pinned to Node 22 LTS for reproducible builds (host may run newer).
FROM node:22-slim

WORKDIR /app

# Install deps first (layer cached unless package manifests change).
COPY package.json package-lock.json* ./
RUN npm install

# Copy the rest of the source.
COPY . .

EXPOSE 3000

# Dev server with reload. In compose, source is bind-mounted and node_modules is an
# anonymous volume so the host mount doesn't clobber the installed packages.
CMD ["npm", "run", "dev"]
