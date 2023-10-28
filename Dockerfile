# syntax=docker/dockerfile:1

# Start from Node.js
FROM node:20-alpine

# Run in production mode
ENV NODE_ENV=production

# Copy the artifact files
COPY --chown=1000:1000 . /app

# Switch to the regular user in the project directory
USER 1000:1000
WORKDIR /app

# Install production dependencies
RUN yarn install --non-interactive --prod --frozen-lockfile

# Configure the project
ENV PACKAGE_FILE=/app/package.json \
	EXPRESS_LISTEN_ADDRESS=0.0.0.0 \
	EXPRESS_LISTEN_PORT=5000

# Publish the Express port
EXPOSE 5000/tcp

# Launch the project
ENTRYPOINT [ "node" ]
CMD [ "/app" ]
