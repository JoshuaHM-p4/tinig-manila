// Small formatting helpers shared across the dashboard.

export function formatDuration(seconds) {
  if (!seconds || seconds < 0) return '0s';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export function formatTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function timeAgo(date) {
  const d = date instanceof Date ? date : new Date(date);
  const diff = Math.max(0, Date.now() - d.getTime());
  const sec = Math.round(diff / 1000);
  if (sec < 5) return 'now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ago`;
}

// Friendly intent labels for analytics tags.
export const INTENT_LABELS = {
  general_inquiry: 'Pangkalahatang Tanong',
  identity_verification: 'Pag-verify ng Identity',
  senior_benefits: 'Senior Benefits',
  health_services: 'Health Services',
  appointment_booking: 'Appointment Booking',
  barangay_services: 'Barangay Services',
  egovph_registration: 'eGovPH Registration',
  emergency: 'Emergency',
  complaint: 'Reklamo',
  thank_you: 'Pasasalamat',
};

export function intentLabel(intent) {
  return INTENT_LABELS[intent] || intent || 'Unknown';
}

// Sentiment color mapping. Score 0-100.
export function sentimentColor(score) {
  if (score >= 70) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  if (score >= 45) return 'text-sky-700 bg-sky-50 border-sky-200';
  if (score >= 25) return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-rose-700 bg-rose-50 border-rose-200';
}
