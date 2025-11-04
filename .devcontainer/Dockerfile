# We use the Node-22 on Debian Bookworm.
ARG VARIANT="22-bookworm"
FROM mcr.microsoft.com/devcontainers/typescript-node:${VARIANT}

# Install dependencies for installing PowerShell
RUN apt-get update \
    && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    wget \
    apt-transport-https \
    software-properties-common

# Get the version of Ubuntu in environment variables
# Download the Microsoft repository keys
# Register the Microsoft repository keys
# Delete the Microsoft repository keys file
RUN . /etc/os-release \
    && wget -q https://packages.microsoft.com/config/debian/$VERSION_ID/packages-microsoft-prod.deb \
    && dpkg -i packages-microsoft-prod.deb \
    && rm packages-microsoft-prod.deb

# Install OS packages needed for building Theia.
RUN apt-get update \
    && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    libsecret-1-dev \
    libxkbfile-dev \
    powershell
