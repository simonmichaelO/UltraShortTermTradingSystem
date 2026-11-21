import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Database } from 'lucide-react';
import App from '../../src/App.jsx';
import { SavedHistoryView } from './SavedHistoryView.jsx';
import '../../src/styles.css';
import './history.css';

const HISTORY_PAGE = {
  id: 'sample-history', name: 'Sample History', icon: Database, view: SavedHistoryView,
  description: 'Browse saved simulated account snapshots from your local SQLite database.',
};

createRoot(document.getElementById('root')).render(<StrictMode>
  <App extraPage={HISTORY_PAGE} version="0.7" workspaceLabel="Tickframe local workspace" />
</StrictMode>);
