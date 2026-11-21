import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePageNavbar } from '../contexts/PageNavbarContext';
import { getConversations } from '../services/api';
import { ArrowRightIcon, ChartIcon, MicIcon } from '../components/icons';
import '../styles/pages.css';

const RATING = {
  good: { label: 'Good', tone: 'good' },
  needs_work: { label: 'Needs work', tone: 'warn' },
  poor: { label: 'Poor', tone: 'poor' },
};

function formatDuration(seconds) {
  if (seconds == null) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`;
}

function dayLabel(date) {
  const today = new Date();
  const d0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const d1 = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.round((d0 - d1) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

export default function Conversations() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const { setPageNavbar } = usePageNavbar();
  const navigate = useNavigate();

  useEffect(() => {
    setPageNavbar({ title: 'Sessions' });
    return () => setPageNavbar({});
  }, [setPageNavbar]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getConversations()
      .then((data) => {
        if (!mounted) return;
        setConversations(Array.isArray(data) ? data : data.results || []);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e?.error || e?.message || 'Failed to load sessions.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const ended = conversations.filter((c) => c.status === 'ended');
  const totalMinutes = Math.round(conversations.reduce((a, c) => a + (c.duration_seconds || 0), 0) / 60);
  const avgPace = ended.length > 0
    ? Math.round(ended.reduce((a, c) => a + (c.speech_speed_wpm || 0), 0) / ended.length)
    : 0;
  const avgFiller = ended.length > 0
    ? Math.round(ended.reduce((a, c) => a + (c.filler_words_count || 0), 0) / ended.length)
    : 0;

  const groups = useMemo(() => {
    const list = filter === 'completed' ? ended : filter === 'unfinished' ? conversations.filter((c) => c.status !== 'ended') : conversations;
    const map = new Map();
    list.forEach((c) => {
      const date = c.started_at ? new Date(c.started_at) : null;
      const key = date ? dayLabel(date) : 'Earlier';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(c);
    });
    return [...map.entries()];
  }, [conversations, ended, filter]);

  return (
    <div className="sess">
      <header className="ui-page-head">
        <div>
          <h1 className="ui-h1">Sessions</h1>
          <p className="ui-sub">Every practice session with its report. Tap one to see feedback.</p>
        </div>
        <Link to="/topics" className="ui-btn ui-btn-primary sess-new"><MicIcon /> New session</Link>
      </header>

      {conversations.length > 0 && (
        <section className="ui-card sess-summary" aria-label="Summary">
          <div className="sess-summary-item">
            <span className="sess-summary-label">Sessions</span>
            <span className="sess-summary-value">{conversations.length}</span>
            <span className="sess-summary-hint">{ended.length} completed</span>
          </div>
          <div className="sess-summary-item">
            <span className="sess-summary-label">Time spoken</span>
            <span className="sess-summary-value">{totalMinutes}<small> min</small></span>
          </div>
          <div className="sess-summary-item">
            <span className="sess-summary-label">Average pace</span>
            <span className="sess-summary-value">{avgPace}<small> wpm</small></span>
            <span className="sess-summary-hint">Aim for 120–150</span>
          </div>
          <div className="sess-summary-item">
            <span className="sess-summary-label">Filler words</span>
            <span className="sess-summary-value">{avgFiller}<small> per session</small></span>
          </div>
        </section>
      )}

      {error && <div className="ui-alert ui-alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {conversations.length > 0 && (
        <div className="sess-toolbar">
          <h2 className="sess-section-title">History</h2>
          <div className="ui-segment" role="group" aria-label="Filter sessions">
            {[['all', 'All'], ['completed', 'Completed'], ['unfinished', 'Unfinished']].map(([v, l]) => (
              <button key={v} type="button" className={filter === v ? 'is-active' : ''} onClick={() => setFilter(v)}>{l}</button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="ui-card sess-list">
          {[0, 1, 2].map((i) => <div key={i} className="sess-row"><div className="ui-skeleton" style={{ height: 40, width: '100%' }} /></div>)}
        </div>
      ) : conversations.length === 0 ? (
        <div className="ui-card ui-empty">
          <div className="ui-empty-icon"><ChartIcon /></div>
          <p className="ui-empty-title">No sessions yet</p>
          <p style={{ margin: '0 0 16px' }}>Finish a practice session and its report will show up here.</p>
          <Link to="/topics" className="ui-btn ui-btn-primary ui-btn-sm">Pick a topic</Link>
        </div>
      ) : groups.length === 0 ? (
        <div className="ui-card ui-empty"><p className="ui-empty-title">Nothing here</p><p style={{ margin: 0 }}>No sessions match this filter.</p></div>
      ) : (
        groups.map(([label, items]) => (
          <section key={label} className="sess-group">
            <div className="sess-group-label">{label}</div>
            <div className="ui-card sess-list">
              {items.map((c) => {
                const done = c.status === 'ended';
                const rating = done ? RATING[c.rating] : null;
                const time = c.started_at ? new Date(c.started_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '';
                return (
                  <button key={c.id} type="button" className="sess-row" onClick={() => navigate(`/conversations/${c.id}`)}>
                    <div className="sess-main">
                      <div className="sess-topic">{c.topic}</div>
                      <div className="sess-sub">
                        {time && <span>{time}</span>}
                        <span>{formatDuration(c.duration_seconds)}</span>
                        {done && c.speech_speed_wpm != null && <span className="sess-sub-mobile">{Math.round(c.speech_speed_wpm)} wpm</span>}
                        {done && c.filler_words_count != null && <span className="sess-sub-mobile">{c.filler_words_count} fillers</span>}
                      </div>
                    </div>
                    <div className="sess-metric">
                      <span>{done && c.speech_speed_wpm != null ? Math.round(c.speech_speed_wpm) : '—'}</span>
                      <small>wpm</small>
                    </div>
                    <div className="sess-metric">
                      <span>{done && c.filler_words_count != null ? c.filler_words_count : '—'}</span>
                      <small>fillers</small>
                    </div>
                    <span className={`sess-rating is-${rating ? rating.tone : done ? 'none' : 'open'}`}>
                      {rating ? rating.label : done ? 'No rating' : 'Unfinished'}
                    </span>
                    <ArrowRightIcon className="sess-chevron" />
                  </button>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
