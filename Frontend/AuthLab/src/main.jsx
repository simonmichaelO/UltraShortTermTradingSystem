import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import brandIcon from '../../public/tickframe.svg';
import { AuthLab } from './AuthLab.jsx';
import './lab.css';

const favicon = document.createElement('link');
favicon.rel = 'icon';
favicon.href = brandIcon;
document.head.appendChild(favicon);

createRoot(document.getElementById('root')).render(<StrictMode><AuthLab /></StrictMode>);
