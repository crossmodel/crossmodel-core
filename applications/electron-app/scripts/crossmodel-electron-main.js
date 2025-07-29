/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
const path = require('path');
const os = require('os');

// Use a set of builtin plugins in our application.
process.env.THEIA_DEFAULT_PLUGINS = `local-dir:${path.resolve(__dirname, '../', 'plugins')}`;

// Handover to the auto-generated electron application handler.
require('../lib/backend/electron-main.js');
