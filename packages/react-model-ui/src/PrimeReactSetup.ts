/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import 'primeicons/primeicons.css';
import PrimeReact from 'primereact/api';
import 'primereact/resources/primereact.min.css';
import 'primereact/resources/themes/lara-light-indigo/theme.css';
import './style/primereact-overrides.css';

// Initialize PrimeReact configurations
PrimeReact.ripple = true;
PrimeReact.autoZIndex = true;
PrimeReact.inputStyle = 'outlined';
PrimeReact.appendTo = 'self';
