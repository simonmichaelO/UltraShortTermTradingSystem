import { Server } from 'lucide-react';
import { Pill } from './ui.jsx';

const APPEARANCE = {
  checking: { label: 'Checking', tone: 'neutral', detail: 'Waiting for the preview status API.' },
  online: { label: 'Online', tone: 'lime', detail: 'The web backend responded. No terminal is linked.' },
  unavailable: { label: 'Unavailable', tone: 'amber', detail: 'The web backend did not respond. Example data is still available.' },
  invalid: { label: 'Invalid response', tone: 'amber', detail: 'The response did not match the preview status contract.' },
  stale: { label: 'Status stale', tone: 'amber', detail: 'The most recent check failed. The previous response is not current.' },
};

export function WebStatusRow({ status }) {
  const { label, tone, detail } = APPEARANCE[status.phase];
  return <div className="engine-mode web-status-row">
    <span><span className="engine-label-icon"><Server size={15} /></span>Web API</span>
    <span className="web-status-indicator" role="status" aria-label={`Web API: ${label}`} title={detail}>
      <Pill tone={tone} dot>{label}</Pill>
    </span>
  </div>;
}

export function WebStatusDetails({ status }) {
  const { detail } = APPEARANCE[status.phase];
  return <div className="api-details">
    <WebStatusRow status={status} />
    <p>{detail}{status.phase === 'stale' && status.observedAt ? ` Last response: ${new Date(status.observedAt).toLocaleTimeString()}.` : ''}</p>
  </div>;
}
