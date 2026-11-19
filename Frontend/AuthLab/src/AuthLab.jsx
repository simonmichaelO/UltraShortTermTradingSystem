import { useEffect, useRef, useState } from 'react';
import { Activity, ArrowRight, Check, ChevronLeft, CircleAlert, Clipboard, Clock3, Eye, EyeOff,
  Fingerprint, KeyRound, LockKeyhole, LogOut, ScanLine, ShieldCheck, Smartphone, WifiOff } from 'lucide-react';
import { createTabLab, lab, readableLabError } from './auth-api.js';

const STEPS = [
  { label: 'Create a test account', detail: 'A temporary username and password.', icon: KeyRound },
  { label: 'Pair an authenticator', detail: 'Scan a QR code or enter a setup key.', icon: Smartphone },
  { label: 'Sign in with two factors', detail: 'Password first. A fresh code second.', icon: ShieldCheck },
];
const HISTORY = {
  test_account_created: 'Authenticator paired', password_rejected: 'Password rejected', code_rejected: 'Code rejected',
  sign_in_succeeded: 'Two-step sign-in verified', signed_out: 'Signed out',
};

function Brand() {
  return <header className="lab-header">
    <a href="/" className="lab-brand" aria-label="Tickframe Access Lab home">
      <span className="lab-brand-icon"><Activity size={23} strokeWidth={2.4} /></span>
      <span><strong>Tickframe<span>.</span></strong><small>ACCESS LAB</small></span>
    </a>
    <span className="lab-badge"><span /> Test only</span>
  </header>;
}

function Footnote() {
  return <footer className="lab-footer"><span><LockKeyhole size={13} /> ISOLATED PREVIEW</span><span>Sample data only · MT5 not connected</span></footer>;
}

function StepList({ stage = 0 }) {
  return <ol className="lab-steps" aria-label="Test sign-in steps">
    {STEPS.map(({ label, detail, icon: Icon }, index) => {
      const complete = index < stage;
      return <li key={label} className={index === stage ? 'step-current' : complete ? 'step-done' : ''} aria-current={index === stage ? 'step' : undefined}>
        <span className="step-icon">{complete ? <Check size={16} /> : <Icon size={16} />}</span>
        <span className="step-text"><strong>{label}</strong><small>{detail}</small></span>
        <span className="step-number" aria-hidden="true">0{index + 1}</span>
      </li>;
    })}
  </ol>;
}

function Launch() {
  return <main className="lab-layout launch-layout" id="lab-main">
    <div className="launch-copy">
      <span className="lab-kicker"><span /> WEB PREVIEW / 0.3.1</span>
      <h1>Test your<br className="launch-break" /> <span className="launch-title-line">two-step sign-in<span>.</span></span></h1>
      <p>Try a password and an authenticator code before we connect anything to the trading system.</p>
      <a className="lab-button lab-primary launch-button" href="/lab">
        Open sign-in lab <ArrowRight size={17} />
      </a>
      <small className="launch-note">Runs in this preview, separate from your regular workspace.</small>
    </div>
    <section className="launch-card" aria-label="What you will test">
      <div className="launch-emblem" aria-hidden="true"><div className="lab-ring ring-outer"/><div className="lab-ring ring-inner"/>
        <span><Fingerprint size={42} strokeWidth={1.25} /></span><i className="ring-marker"/><small>ACCESS / 02</small></div>
      <StepList />
      <div className="launch-disclaimer"><ShieldCheck size={16} /><span><strong>No broker credentials.</strong> The regular dashboard stays open and unchanged.</span></div>
    </section>
  </main>;
}

function Notice({ error, success }) {
  if (error) return <div className="lab-notice is-error" role="alert"><CircleAlert size={17} /> <span>{error}</span></div>;
  if (success) return <div className="lab-notice is-success" role="status"><Check size={17} /> <span>{success}</span></div>;
  return null;
}

function CopyValue({ value, label, secret = false }) {
  const [visible, setVisible] = useState(!secret);
  const [message, setMessage] = useState('');
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setMessage('Copied');
    } catch {
      setVisible(true);
      setMessage('Select the text to copy it.');
    }
  }
  return <div className="copy-field">
    <span className="copy-label">{label}</span>
    <div className="copy-control">
      <code>{visible ? value : '••••••••••••'}</code>
      {secret && <button className="lab-icon-button" type="button" onClick={() => setVisible(x => !x)}
        aria-label={visible ? `Hide ${label}` : `Show ${label}`}>{visible ? <EyeOff size={15} /> : <Eye size={15} />}</button>}
      <button className="lab-icon-button" type="button" aria-label={`Copy ${label}`} onClick={copy}><Clipboard size={15} /></button>
    </div>
    {message && <small className="copy-feedback" role="status">{message}</small>}
  </div>;
}

function CodeField({ code, onCode }) {
  return <label className="lab-field" htmlFor="lab-code">Six-digit code
    <input id="lab-code" className="code-input" type="text" autoComplete="one-time-code" inputMode="numeric"
      spellCheck={false} pattern="[0-9]{6}" maxLength={6} placeholder="000000" required
      value={code} onChange={event => onCode(event.target.value.replace(/[^0-9]/g, '').slice(0, 6))} />
  </label>;
}

function SetupForm({ enrollment, busy, code, onCode, onPair, onBack }) {
  return <>
    <div className="lab-credentials">
      <div className="credentials-label"><KeyRound size={15} /><strong>Save your test credentials</strong></div>
      <CopyValue label="Test username" value={enrollment.username} />
      <CopyValue label="Test password" value={enrollment.password} secret />
      <p>Use these only here. Save the password and finish pairing within {enrollment.setup_minutes} minutes.</p>
    </div>
    <div className="lab-pairing">
      <img src={enrollment.qr_image} alt="QR code for your test authenticator" width="132" height="132" />
      <div><span className="pair-icon"><ScanLine size={17} /></span><h2>Scan in your authenticator app</h2>
        <p>In the app, add a new account and scan this code. On one device, use the manual key below instead.</p>
      </div>
    </div>
    <details className="manual-key">
      <summary>Use a manual setup key</summary>
      <p>Add a time-based account named Tickframe Access Lab in your app, then paste this key.</p>
      <CopyValue label="Setup key" value={enrollment.manual_key} secret />
    </details>
    <form className="lab-form" onSubmit={onPair} method="post">
      <CodeField code={code} onCode={onCode} />
      <button className="lab-button lab-primary" type="submit" disabled={busy || code.length !== 6}>
        {busy ? 'Checking code…' : 'Pair authenticator'} <ArrowRight size={16} />
      </button>
    </form>
    <button className="lab-text-button" type="button" onClick={onBack} disabled={busy}><ChevronLeft size={15} /> Start over</button>
  </>;
}

function PasswordForm({ username, onUsername, password, onPassword, onSubmit, generated, busy, onBack }) {
  const [visible, setVisible] = useState(false);
  return <>
    <form className="lab-form" onSubmit={onSubmit} method="post">
      <label className="lab-field" htmlFor="lab-username">Test username
        <input id="lab-username" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="lab-…"
          required maxLength={20} value={username} onChange={event => onUsername(event.target.value)} />
      </label>
      <label className="lab-field" htmlFor="lab-password">Test password</label>
      <div className="password-input">
        <input id="lab-password" type={visible ? 'text' : 'password'} autoComplete="current-password" placeholder="Generated test password"
          required maxLength={128} value={password} onChange={event => onPassword(event.target.value)} />
        <button className="lab-icon-button" type="button" aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible(flag => !flag)}>
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {generated && <button className="lab-text-button fill-password" type="button" disabled={busy} onClick={() => onPassword(generated)}>Use generated test password</button>}
      <button className="lab-button lab-primary" type="submit" disabled={busy || !username.trim() || !password}>
        {busy ? 'Checking password…' : 'Continue to authenticator'} <ArrowRight size={16} />
      </button>
    </form>
    <button className="lab-text-button" type="button" onClick={onBack} disabled={busy}><ChevronLeft size={15} /> Back to test account options</button>
  </>;
}

function Workspace({ data, busy, onSignOut, error, tabOnly }) {
  return <main className="test-workspace" id="lab-main">
    <section className="workspace-intro">
      <div><span className="lab-kicker"><span /> BOTH FACTORS VERIFIED</span><h1>Test workspace<span>.</span></h1>
        <p>Signed in as <strong>{data.username}</strong>. This account can only view sample status and its own sign-in history.</p></div>
      <button className="lab-button lab-secondary" type="button" disabled={busy} onClick={onSignOut}>
        <LogOut size={16} /> {busy ? 'Signing out…' : 'Sign out'}
      </button>
    </section>
    <Notice error={error} />
    {tabOnly && <TabSessionNote />}
    <div className="workspace-metrics">
      <section><span><ShieldCheck size={17} /> Sign-in</span><strong>Verified</strong><p>Password + authenticator</p></section>
      <section><span><WifiOff size={17} /> MT5 connection</span><strong>Not connected</strong><p>No terminal linked</p></section>
      <section><span><LockKeyhole size={17} /> Live entries</span><strong>Locked</strong><p>No order path</p></section>
    </div>
    <section className="lab-card lab-history" aria-labelledby="history-title">
      <div><span className="card-label">TEST ACCOUNT ACTIVITY</span><h2 id="history-title">Sign-in history</h2><p>Recent events for this temporary account only.</p></div>
      <ul>{data.login_history.map((item, index) => <li key={`${item.at}-${index}`}>
        <span><Clock3 size={15} /> {HISTORY[item.event] ?? 'Test account event'}</span>
        <time dateTime={item.at}>{new Date(item.at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>
      </li>)}</ul>
    </section>
  </main>;
}

const COPY = {
  checking: ['SESSION CHECK', 'Checking this browser', 'One moment while the lab checks for a test session.'],
  start: ['SETUP / 01', 'Create a test account', 'Start with a generated username and password. You don’t need to enter any personal details.'],
  setup: ['SETUP / 02', 'Set up your authenticator', 'Save your test credentials, then pair an authenticator. Don’t share this QR code, key, or password.'],
  password: ['SIGN-IN / 01 OF 02', 'Enter your test credentials', 'Use only the username and password generated in this lab.'],
  code: ['SIGN-IN / 02 OF 02', 'Enter your authenticator code', 'Use the newest six-digit code. If you just paired the app, wait for its code to change.'],
  retry: ['SESSION CHECK', 'The lab is unavailable', 'The test workspace stays closed until the service confirms your session.'],
};

function TabSessionNote() {
  return <p className="tab-session-note"><LockKeyhole size={14} /> <span><strong>This tab only.</strong> Keep the lab open. If you reload or close it, you’ll need to sign in again.</span></p>;
}

function AuthFlow() {
  const tabAvailable = window.location.protocol === 'https:' && /^\d{1,5}-[a-z0-9-]+\.e2b\.app$/.test(window.location.hostname);
  const [tabLab] = useState(createTabLab);
  const [transport, setTransport] = useState('cookie');
  const auth = transport === 'tab' ? tabLab : lab;
  const [screen, setScreen] = useState('checking');
  const [enrollment, setEnrollment] = useState(null);
  const [flashPassword, setFlashPassword] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const heading = useRef(null);

  function showWorkspace(next) {
    if (next?.environment !== 'auth_lab' || next?.data_source !== 'test_only' || next?.live_entries !== 'locked'
        || next?.mt5_connection !== 'not_configured' || next?.role !== 'test_operator' || typeof next?.username !== 'string'
        || !Array.isArray(next.login_history)) throw new Error('Unexpected lab workspace.');
    setData(next);
    setUsername(next.username);
    setScreen('workspace');
  }

  async function restore(signal, client = lab) {
    try {
      const timer = AbortSignal.timeout(8000);
      const next = await client.workspace(signal ? AbortSignal.any([signal, timer]) : timer);
      if (!signal?.aborted) showWorkspace(next);
    } catch (problem) {
      if (signal?.aborted) return;
      if (problem?.code === 'signed_out') setScreen('start');
      else { setError(readableLabError(problem)); setScreen('retry'); }
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void restore(controller.signal);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (transport !== 'tab') return undefined;
    const forget = () => tabLab.clear();
    function clearRestoredPage(event) {
      if (!event.persisted) return;
      setData(null);
      goBack('start', 'cookie');
    }
    window.addEventListener('pagehide', forget);
    window.addEventListener('pageshow', clearRestoredPage);
    return () => {
      window.removeEventListener('pagehide', forget);
      window.removeEventListener('pageshow', clearRestoredPage);
    };
  }, [transport, tabLab]);

  useEffect(() => {
    if (['setup', 'password', 'code'].includes(screen)) heading.current?.focus();
    window.scrollTo(0, 0);
  }, [screen]);

  useEffect(() => {
    if (screen !== 'workspace') return undefined;
    let active = true;
    let timer;
    async function check() {
      try {
        const session = await auth.session();
        if (!active) return;
        if (session.username !== data.username || session.role !== 'test_operator') {
          setData(null);
          setError('The account in this browser changed. Check your session before continuing.');
          setScreen('retry');
          return;
        }
        timer = setTimeout(check, 15_000);
      } catch (problem) {
        if (!active) return;
        setData(null);
        setError(problem?.code === 'signed_out' ? 'The test session ended. Sign in again to continue.' : readableLabError(problem));
        if (problem?.code === 'signed_out') tabLab.clear();
        setScreen(problem?.code === 'signed_out' ? 'password' : 'retry');
      }
    }
    timer = setTimeout(check, 15_000);
    return () => { active = false; clearTimeout(timer); };
  }, [screen, data?.username, auth, tabLab]);

  async function run(action, onFailure) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    setSuccess('');
    try { await action(); } catch (problem) {
      onFailure?.(problem);
      setError(problem?.code === 'setup_cookie_unavailable' && tabAvailable
        ? 'This browser did not keep the test setup cookie. Choose Create test account without cookies below.'
        : readableLabError(problem));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  function goBack(next = 'start', mode = transport) {
    tabLab.clear();
    setTransport(mode);
    setCode(''); setPassword(''); setError(''); setSuccess('');
    setEnrollment(null); setFlashPassword(''); setScreen(next);
  }
  function beginSetup(mode) {
    return run(async () => {
      const client = mode === 'tab' ? tabLab : lab;
      tabLab.clear();
      const created = await client.enroll();
      if (!created?.username || !created.password || !created.manual_key || !created.qr_image?.startsWith('data:image/png;base64,')) {
        throw new Error('Unexpected enrollment response.');
      }
      await client.confirmSetup();
      setTransport(mode);
      setEnrollment(created); setCode(''); setScreen('setup');
    });
  }
  function pair(event) {
    event.preventDefault();
    return run(async () => {
      const result = await auth.pair(code);
      setUsername(result.username); setFlashPassword(enrollment.password);
      setEnrollment(null); setCode(''); setScreen('password');
      setSuccess('Authenticator paired. Now sign in with your test password.');
    }, problem => {
      setCode('');
      if (problem?.code === 'setup_expired') goBack();
    });
  }
  function verifyPassword(event) {
    event.preventDefault();
    return run(async () => {
      const name = username.trim().toLowerCase();
      await auth.password(name, password);
      setUsername(name); setPassword(''); setFlashPassword(''); setCode(''); setScreen('code');
    }, () => setPassword(''));
  }
  function verifyCode(event) {
    event.preventDefault();
    return run(async () => {
      await auth.code(code);
      setCode('');
      try { showWorkspace(await auth.workspace()); } catch (problem) {
        setData(null);
        setScreen(problem?.code === 'signed_out' ? 'password' : 'retry');
        setError(readableLabError(problem));
      }
    }, problem => {
      setCode('');
      if (['challenge_expired', 'signed_out'].includes(problem?.code)) setScreen('password');
    });
  }
  function signOut() {
    return run(async () => {
      await auth.logout();
      setData(null); goBack('password'); setSuccess('Signed out. Your test account can still be used until it expires.');
    });
  }

  if (screen === 'workspace' && data) return <Workspace data={data} busy={busy} onSignOut={signOut} error={error} tabOnly={transport === 'tab'} />;
  const [eyebrow, title, description] = COPY[screen];
  return <main className="lab-layout auth-layout" id="lab-main">
    <aside className="auth-context">
      <span className="lab-kicker"><span /> TICKFRAME / AUTHENTICATION</span>
      <p className="context-title">Test sign-in<span>.</span></p>
      <p>Practice access to the dashboard without linking a broker or changing your preview settings.</p>
      <StepList stage={screen === 'setup' ? 1 : ['password', 'code'].includes(screen) ? 2 : 0} />
      <p className="context-note"><Clock3 size={15} /> Test accounts expire after four hours or when the lab restarts.</p>
    </aside>
    <section className="lab-card" aria-labelledby="flow-title" aria-busy={busy}>
      <span className="card-mark">{screen === 'setup' || screen === 'code' ? <Smartphone size={22} /> : <LockKeyhole size={22} />}</span>
      <span className="card-label">{eyebrow}</span>
      <h1 id="flow-title" ref={heading} tabIndex={-1}>{title}</h1>
      <p className="card-description">{description}</p>
      <Notice error={error} success={success} />
      {transport === 'tab' && !['checking', 'start'].includes(screen) && <TabSessionNote />}
      {screen === 'checking' && <div className="loading-text" role="status"><span /> Checking session…</div>}
      {screen === 'retry' && <button className="lab-button lab-primary" type="button" disabled={busy} onClick={() => run(() => restore(undefined, auth))}>Retry session check <ArrowRight size={16} /></button>}
      {screen === 'start' && <div className="start-actions">
        <button className="lab-button lab-primary" type="button" disabled={busy} onClick={() => beginSetup('cookie')}>{busy ? 'Creating account…' : 'Create test account'} <ArrowRight size={17} /></button>
        <button className="lab-button lab-secondary" type="button" disabled={busy} onClick={() => goBack('password', 'cookie')}>I have test credentials</button>
      </div>}
      {screen === 'start' && tabAvailable && <section className="tab-only-option" aria-label="Continue without cookies">
        <p><strong>Preview cookies blocked?</strong> Keep your test sign-in in this tab only.</p>
        <button className="lab-button lab-secondary" type="button" disabled={busy} onClick={() => beginSetup('tab')}>Create test account without cookies</button>
        <button className="lab-text-button" type="button" disabled={busy} onClick={() => goBack('password', 'tab')}>Sign in without cookies</button>
      </section>}
      {screen === 'setup' && <SetupForm enrollment={enrollment} busy={busy} code={code} onCode={setCode} onPair={pair} onBack={() => goBack()} />}
      {screen === 'password' && <PasswordForm username={username} onUsername={setUsername} password={password} onPassword={setPassword}
        onSubmit={verifyPassword} generated={flashPassword} busy={busy} onBack={() => goBack()} />}
      {screen === 'code' && <>
        <form className="lab-form" onSubmit={verifyCode} method="post"><CodeField code={code} onCode={setCode} />
          <button className="lab-button lab-primary" type="submit" disabled={busy || code.length !== 6}>{busy ? 'Verifying code…' : 'Verify and sign in'} <ArrowRight size={16} /></button>
        </form>
        <button className="lab-text-button" type="button" disabled={busy} onClick={() => goBack('password')}><ChevronLeft size={15} /> Back to password</button>
      </>}
    </section>
  </main>;
}

export function AuthLab() {
  return <div className="lab-shell">
    <a href="#lab-main" className="lab-skip">Skip to content</a>
    <Brand />
    {window.location.pathname === '/lab' ? <AuthFlow /> : <Launch />}
    <Footnote />
  </div>;
}
