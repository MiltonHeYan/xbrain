import {createRoot} from 'react-dom/client';
import {DesignGraph} from './DesignGraph.js';
import {App} from './App.js';
import './styles.css';
const root = document.getElementById('root');
if (!root) throw new Error('Missing application root.');
createRoot(root).render(
  new URLSearchParams(window.location.search).get('view') === 'graph' ? <DesignGraph /> : <App />,
);
