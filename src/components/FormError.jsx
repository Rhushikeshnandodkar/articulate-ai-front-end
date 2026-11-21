import { useEffect, useRef } from 'react';

/**
 * Form error shown next to the submit button. When a new message appears it
 * scrolls itself into view, so on phones it is never hidden off-screen.
 */
export default function FormError({ message, style }) {
  const ref = useRef(null);
  useEffect(() => {
    if (message && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [message]);
  if (!message) return null;
  return (
    <div ref={ref} className="ui-alert ui-alert-error" role="alert" aria-live="assertive" style={style}>
      {message}
    </div>
  );
}

/** Turns API error payloads ({field: [msg]}, strings, arrays) into one readable line. */
export function formatApiError(err, fallback = 'Something went wrong. Please try again.') {
  if (!err) return '';
  if (typeof err === 'string') return err;
  if (Array.isArray(err)) return err.join(' ');
  if (typeof err === 'object') {
    if (err.error && typeof err.error === 'string') return err.error;
    if (err.detail && typeof err.detail === 'string') return err.detail;
    if (err.message && typeof err.message === 'string') return err.message;
    const parts = Object.values(err).map((v) => (Array.isArray(v) ? v.join(', ') : typeof v === 'string' ? v : '')).filter(Boolean);
    return parts.join(' ') || fallback;
  }
  return String(err);
}
