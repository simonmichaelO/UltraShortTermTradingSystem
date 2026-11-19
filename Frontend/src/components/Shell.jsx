import { Activity, Bell, ChevronRight, ChevronsUpDown, FlaskConical, GalleryVerticalEnd, History,
  LayoutGrid, LineChart, Menu, Settings2, ShieldAlert, WifiOff, X } from 'lucide-react';
import { Pill } from './ui.jsx';

export const NAV_ITEMS = [
  { id: 'overview', name: 'Overview', icon: LayoutGrid },
  { id: 'positions', name: 'Positions', icon: GalleryVerticalEnd },
  { id: 'history', name: 'Trade history', icon: History },
  { id: 'analytics', name: 'Analytics', icon: LineChart },
  { id: 'shadow', name: 'Shadow mode', icon: FlaskConical },
  { id: 'settings', name: 'Settings', icon: Settings2 },
];

function Brand() {
  return <a className="brand" href="#overview" aria-label="Tickframe overview">
    <span className="brand-mark"><Activity size={24} strokeWidth={2.3} /></span>
    <span className="brand-text"><strong>Tickframe<span>.</span></strong><small>TRADING WORKSPACE</small></span>
  </a>;
}

export function Sidebar({ page, mobileOpen, onClose }) {
  return <>
    {mobileOpen && <button className="mobile-backdrop" onClick={onClose} aria-label="Close navigation" type="button" />}
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`} id="navigation" aria-label="Sidebar">
      <div className="brand-row"><Brand /><button type="button" aria-label="Close menu" className="icon-button close-menu" onClick={onClose}><X size={19} /></button></div>
      <nav className="nav-main" aria-label="Trading workspace">
        <span className="nav-eyebrow">WORKSPACE</span>
        {NAV_ITEMS.slice(0, 5).map(({ id, name, icon: Icon }) => <a className="nav-link" aria-current={id === page ? 'page' : undefined}
          href={`#${id}`} aria-label={name} title={name} key={id} onClick={onClose}><Icon size={17} strokeWidth={1.8} /> <span>{name}</span></a>)}
        <span className="nav-eyebrow nav-system">SYSTEM</span>
        <a className="nav-link" aria-current={page === 'settings' ? 'page' : undefined} href="#settings" aria-label="Settings" title="Settings" onClick={onClose}>
          <Settings2 size={17} strokeWidth={1.8} /> <span>Settings</span></a>
      </nav>
      <div className="sidebar-bottom">
        <div className="connection-card">
          <div className="connection-title"><WifiOff size={15} /><span>MT5 connection</span></div>
          <div className="connection-state"><span className="connection-dot" /> Disconnected</div>
          <p>No terminal linked</p>
        </div>
        <a className="operator" href="#settings" onClick={onClose} aria-label="Local operator settings">
          <span className="operator-avatar">TF</span><span className="operator-copy"><strong>Local operator</strong><small>Preview session</small></span>
          <ChevronsUpDown size={15} className="operator-arrow" />
        </a>
      </div>
    </aside>
  </>;
}

export function Topbar({ page, mobileOpen, onMenu, onAlerts, onStop, alertCount, emergency }) {
  const title = NAV_ITEMS.find(item => item.id === page)?.name ?? 'Overview';
  return <header className="topbar">
    <div className="topbar-trail">
      <button type="button" className="icon-button menu-button" onClick={onMenu} aria-label="Open navigation" aria-expanded={mobileOpen} aria-controls="navigation"><Menu size={20} /></button>
      <span className="breadcrumb-root">Workspace</span><ChevronRight size={13} className="breadcrumb-chevron"/><span className="breadcrumb-current">{title}</span>
    </div>
    <div className="topbar-actions">
      <Pill tone="amber" dot>Preview mode</Pill>
      <span className="topbar-divider" />
      <button type="button" className={`icon-button emergency-button ${emergency ? 'is-latched' : ''}`} aria-label="Emergency stop preview" title="Emergency stop (preview)" onClick={onStop}><ShieldAlert size={18} strokeWidth={1.7} /></button>
      <button type="button" className="icon-button bell-button" aria-label="Notifications" title="Notifications" onClick={onAlerts}>
        <Bell size={18} strokeWidth={1.7} />{alertCount > 0 && <span className="unread-dot" />}
      </button>
    </div>
  </header>;
}
