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
RUN . /etc/os-release

# Download the Microsoft repository keys
RUN wget -q https://packages.microsoft.com/config/debian/$VERSION_ID/packages-microsoft-prod.deb

# Register the Microsoft repository keys
RUN dpkg -i packages-microsoft-prod.deb

# Delete the Microsoft repository keys file
RUN rm packages-microsoft-prod.deb

# Update the list of packages after we added packages.microsoft.com
RUN apt-get update

# Install OS packages needed for building Theia.
RUN apt-get update \
    && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    libsecret-1-dev \
    libxkbfile-dev \
    powershell
