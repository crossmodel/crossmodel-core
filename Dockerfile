# Stage 1: Builder stage
FROM node:20-alpine AS build-stage

# Install OS packages needed for building Theia.
# Packages can be searched here: https://pkgs.alpinelinux.org/packages
RUN apk add \
    yarn \
    libsecret-dev \
    libxkbfile-dev \
    make \
    g++ \
    python3 \
    py3-setuptools \
    unzip

# Set the working directory
WORKDIR /home/crossmodel

# Copy the current directory contents to the container
COPY . .

# Increase memory limit during build.
ENV NODE_OPTIONS=--max_old_space_size=4096

# Run the build commands.
# - Download plugins and build application
# - Use yarn autoclean to remove unnecessary files from package dependencies
# - Remove unnecessary files for the browser application
RUN yarn --pure-lockfile --skip-integrity-check --network-timeout 100000 && \
    yarn build:packages && \
    yarn package:extensions && \
    yarn theia:browser build && \
    unzip extensions/crossmodel-lang/*.vsix -d applications/browser-app/plugins/crossmodel-lang && \
    unzip extensions/crossmodel-theme/*.vsix -d applications/browser-app/plugins/crossmodel-theme && \
    yarn autoclean --init && \
    echo *.ts >> .yarnclean && \
    echo *.ts.map >> .yarnclean && \
    echo *.spec.* >> .yarnclean && \
    yarn autoclean --force && \
    yarn cache clean && \
    rm -rf .devcontainer .git .github .vscode applications/electron-app docs e2e-tests examples

# Stage 2: Production stage, using a slim image
FROM node:20-alpine AS production-stage

# Create a non-root user with a fixed user id and setup the environment
RUN addgroup -S crossmodel && \
    adduser --system --uid 101 crossmodel crossmodel && \
    chmod g+rw /home && \
    mkdir -p /home/crossmodel && \
    chown -R crossmodel:crossmodel /home/crossmodel && \
    mkdir -p /home/project

# Install required tools for application: Git, SSH, Bash
# Node is already available in base image
RUN apk add \
    bash \
    openssh-server \
    openssh-client-default \
    libsecret \
    git

# Copy the mapping example workspace into the project folder.
COPY examples/mapping-example /home/project

# Set the permission of the project folder.
RUN chown -R crossmodel:crossmodel /home/project

ENV HOME=/home/crossmodel
WORKDIR /home/crossmodel

# Copy the build output to the production environment
COPY --from=build-stage --chown=crossmodel:crossmodel /home/crossmodel /home/crossmodel

# Expose the default CrossModel port
EXPOSE 3000

# Specify default shell for Theia and the Built-In plugins directory
# Use installed git instead of dugite
ENV SHELL=/bin/bash \
    THEIA_DEFAULT_PLUGINS=local-dir:/home/crossmodel/applications/browser-app/plugins \
    USE_LOCAL_GIT=true

# Use the non-root user
USER crossmodel

# Set the working directory to the browser application
WORKDIR /home/crossmodel/applications/browser-app

# Start the application
ENTRYPOINT ["node", "/home/crossmodel/applications/browser-app/lib/backend/main.js"]

# Arguments passed to the application
CMD ["/home/project", "--hostname=0.0.0.0"]