# CrossModel on Windows

## Pre-requisites for Windows

To install the pre-requisites on Windows, follow the steps below.

### Install Visual Studio 2022

In order to build CrossModel for Windows you need to have Visual Studio installed with the workload "Desktop development with C++" and "Spectre-mitigated libs'.
Also on the .

#### If you already have a Visual Studio 2022 installed

- Start the "Visual Studio Installer"
- Choose "Modify" on the Visual Studio 2022 installation
- Enable the workload "Desktop development with C++".
- On the 'Individual components' tab, enable installation of "MSVC v143 - VS 2022 C++ x64/x86 Spectre-mitigated libs (Latest)"
- Click "Modify" so your existing Visual Studio installation is extended with the dependencies for CrossModel.

#### If you don't have Visual Studio 2022 installed

- Download and install the installer from on the following page:
   - <https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022>
- Make sure to enable the workload "Desktop development with C++" and the individual component "MSVC v143 - VS 2022 C++ x64/x86 Spectre-mitigated libs (Latest)" during the installation.

### Setup Scoop

Open a PowerShell command window and execute the following commands:

```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser # Optional: Needed to run a remote script the first time
irm get.scoop.sh | iex
```

### Install Python & Node.js

Open a new PowerShell window (this is needed after installing scoop) and execute the following commands:

```powershell
scoop install python@3.11.4
scoop install nvm
nvm install 22
nvm use 22
npm config edit
```

In the editor which opens, add a line at the end with the following contents:

```
msvs_version=2022
```

Save the file and close it.

## Troubleshooting

### Node-Gyp issue

When you get errors when building (using npm) and the error is about node-gyp (for example: common.gypi not found), try removing the C:\Users\{username}\AppData\Local\node-gyp folder.
