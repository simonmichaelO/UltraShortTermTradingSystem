import { useEffect, useRef, useState } from 'react';
import { Check, FlaskConical, RefreshCcw, X } from 'lucide-react';
import { ALERTS, DEFAULT_CONFIG, loadConfig, saveConfig } from './services/preview-model.js';
import { usePreviewStatus } from './hooks/usePreviewStatus.js';
import { useSampleFeed } from './hooks/useSampleFeed.js';
import { NAV_ITEMS, Sidebar, Topbar } from './components/Shell.jsx';
import { SimulationBanner } from './components/Portfolio.jsx';
import { SampleFeed } from './components/SampleFeed.jsx';
import { AlertsDialog, ControlsDialog, EmergencyDialog, PositionDialog } from './components/Dialogs.jsx';
import { Dialog } from './components/ui.jsx';
import { AnalyticsView, ControlsButton, HistoryView, Overview, OverviewHero, PageHero, PositionsView, SettingsView, ShadowView } from './pages/Views.jsx';

const PAGE_INFO = {
  positions: ['Positions', 'Inspect the example positions and how their stops would be managed.'],
  history: ['Trade history', 'Review closed sample trades, estimated costs and exit reasons.'],
  analytics: ['Analytics', 'Explore the equity curve and per-instrument breakdown.'],
  shadow: ['Shadow mode', 'See how the dashboard separates hypothetical signals from broker executions.'],
  settings: ['Settings', 'Review the preview configuration and notification preferences.'],
};
const FEED_PAGES = new Set(['overview', 'positions', 'analytics']);
const NAV_IDS = new Set(NAV_ITEMS.map(item => item.id));
function readPage(extraPageId) {
  const hash = window.location.hash.slice(1);
  return (NAV_IDS.has(hash) || hash === extraPageId) ? hash : 'overview';
}
function previewStorage() {
  try { return window.localStorage; } catch { return undefined; }
}

export default function App({ extraPage, version = '0.4', workspaceLabel = 'Tickframe preview' }) {
  const extraPageId = extraPage?.id;
  const navItems = extraPage
    ? NAV_ITEMS.flatMap(item => item.id === 'history' ? [item, extraPage] : [item])
    : NAV_ITEMS;
  const webStatus = usePreviewStatus();
  const sampleFeed = useSampleFeed();
  const [page, setPage] = useState(() => readPage(extraPageId));
  const [config, setConfig] = useState(() => loadConfig(previewStorage()));
  const [dialog, setDialog] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [alerts, setAlerts] = useState(ALERTS);
  const [unread, setUnread] = useState(2);
  const [toast, setToast] = useState(null);
  const eventId = useRef(0);

  useEffect(() => {
    const onHash = () => { setPage(readPage(extraPageId)); setMobileOpen(false); setDialog(null); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [extraPageId]);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onEscape = event => { if (event.key === 'Escape') setMobileOpen(false); };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [mobileOpen]);

  const notify = text => setToast({ text, id: ++eventId.current });
  const closeDialog = () => setDialog(null);
  const showControls = () => setDialog({ type: 'controls' });
  const showStop = () => setDialog({ type: 'stop' });
  const showPosition = position => setDialog({ type: 'position', id: position.id });
  const selectedPosition = dialog?.type === 'position' ? sampleFeed.snapshot?.positions.find(position => position.id === dialog.id) : null;

  function applyConfig(next, message) {
    setConfig(next);
    const persisted = saveConfig(previewStorage(), next);
    notify(persisted ? message : `${message} (this session only)`);
  }
  function selectSymbol(symbol) {
    if (symbol !== config.symbol) applyConfig({ ...config, symbol }, `${symbol} is the active preview instrument.`);
  }
  function changeStop() {
    const latched = !config.emergency;
    const title = latched ? 'Preview emergency stop applied' : 'Preview emergency stop cleared';
    applyConfig({ ...config, emergency: latched }, `${title}. No MT5 command sent.`);
    const localEvent = { id: `L-${++eventId.current}`, title, summary: 'Local interface event only. Sample positions were not changed.', time: 'This session', tone: latched ? 'amber' : 'neutral' };
    setAlerts(items => [localEvent, ...items].slice(0, 20));
    setUnread(count => Math.min(20, count + 1));
    closeDialog();
  }
  function resetPreview() {
    applyConfig({ ...DEFAULT_CONFIG }, 'Preview preferences reset.');
    setAlerts(ALERTS);
    setUnread(2);
    closeDialog();
  }

  const isExtraPage = page === extraPageId;
  const [pageTitle, pageDescription] = isExtraPage ? [extraPage.name, extraPage.description] : (PAGE_INFO[page] ?? []);
  const ExtraView = extraPage?.view;

  return <div className="app-shell">
    <a href="#main-content" className="skip-link" onClick={event => { event.preventDefault(); document.querySelector('main')?.focus(); }}>Skip to content</a>
    <Sidebar items={navItems} page={page} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
    <div className="app-main">
      <Topbar items={navItems} page={page} mobileOpen={mobileOpen} onMenu={() => setMobileOpen(true)} onAlerts={() => setDialog({ type: 'alerts' })}
        alertCount={config.dashboardAlerts ? unread : 0} onStop={showStop} emergency={config.emergency} />
      <main className="workspace" id="main-content" tabIndex={-1}>
        {page === 'overview' ? <OverviewHero onControls={showControls} /> : <PageHero title={pageTitle} description={pageDescription}
          action={page === 'shadow' ? <ControlsButton onClick={showControls} /> : undefined} />}
        <SimulationBanner />
        {FEED_PAGES.has(page) && <SampleFeed feed={sampleFeed} />}
        {page === 'overview' && <Overview config={config} webStatus={webStatus} sampleFeed={sampleFeed} onControls={showControls} onSymbol={selectSymbol} onPosition={showPosition} />}
        {page === 'positions' && <PositionsView sampleFeed={sampleFeed} onPosition={showPosition} />}
        {page === 'history' && <HistoryView />}
        {isExtraPage && ExtraView && <ExtraView />}
        {page === 'analytics' && <AnalyticsView sampleFeed={sampleFeed} />}
        {page === 'shadow' && <ShadowView config={config} onControls={showControls} />}
        {page === 'settings' && <SettingsView config={config} webStatus={webStatus} onControls={showControls} onReset={() => setDialog({ type: 'reset' })}
          onAlertsToggle={dashboardAlerts => applyConfig({ ...config, dashboardAlerts }, dashboardAlerts ? 'Dashboard indicators on.' : 'Dashboard indicators off.')} />}
        <footer className="workspace-footer"><span><FlaskConical size={13} /> {workspaceLabel} <span>·</span> v{version}</span><span>Sample data <span>·</span> No broker connection</span></footer>
      </main>
    </div>
    {dialog?.type === 'controls' && <ControlsDialog config={config} onClose={closeDialog} onEmergency={showStop}
      onApply={next => { applyConfig(next, 'Preview settings applied.'); closeDialog(); }} />}
    {dialog?.type === 'stop' && <EmergencyDialog latched={config.emergency} onToggle={changeStop} onClose={closeDialog} />}
    {dialog?.type === 'position' && (selectedPosition ? <PositionDialog position={selectedPosition} phase={sampleFeed.phase} onClose={closeDialog} /> :
      <Dialog title="Sample position unavailable" subtitle="Read-only preview" onClose={closeDialog}>
        <div className="drawer-body"><p>This position is not in the latest available sample.</p></div>
      </Dialog>)}
    {dialog?.type === 'alerts' && <AlertsDialog alerts={alerts} unread={unread} enabled={config.dashboardAlerts} onRead={() => setUnread(0)} onClose={closeDialog} />}
    {dialog?.type === 'reset' && <Dialog title="Reset preview settings?" subtitle="This browser only" type="modal" icon={RefreshCcw} onClose={closeDialog}>
      <div className="drawer-body modal-body"><p>Restore the initial fixture preferences, including the selected symbol, intensity, preview stop and dashboard indicators. No account or broker settings are affected.</p></div>
      <div className="dialog-actions"><button className="btn btn-secondary" type="button" onClick={closeDialog}>Cancel</button><button className="btn btn-primary" type="button" onClick={resetPreview}>Reset preview</button></div>
    </Dialog>}
    {toast && <div className="toast" key={toast.id} role="status"><span className="toast-mark"><Check size={16} /></span><span>{toast.text}</span><button type="button" className="icon-button" onClick={() => setToast(null)} aria-label="Dismiss notice"><X size={16} /></button></div>}
  </div>;
}
