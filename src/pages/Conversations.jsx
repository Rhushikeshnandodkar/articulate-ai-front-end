import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageNavbar } from '../contexts/PageNavbarContext';
import { getConversations } from '../services/api';
import '../styles/conversations.css';

const RATING_CLASS = {
  good: 'tw-conv-badge--good',
  needs_work: 'tw-conv-badge--warn',
  poor: 'tw-conv-badge--poor',
};

const RATING_LABEL = {
  good: 'Good',
  needs_work: 'Needs work',
  poor: 'Poor',
};

export default function Conversations() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { setPageNavbar } = usePageNavbar();
  const navigate = useNavigate();

  useEffect(() => {
    setPageNavbar({ title: 'Conversations' });
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
        setError(e?.error || e?.message || 'Failed to load conversations.');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const ended = conversations.filter((c) => c.status === 'ended');
  const totalSessions = conversations.length;
  const totalMinutes = Math.round(
    conversations.reduce((a, c) => a + (c.duration_seconds || 0), 0) / 60
  );
  const completedSessions = ended.length;
  const avgPace =
    ended.length > 0
      ? Math.round(ended.reduce((a, c) => a + (c.speech_speed_wpm || 0), 0) / ended.length)
      : 0;
  const avgFiller =
    ended.length > 0
      ? Math.round(ended.reduce((a, c) => a + (c.filler_words_count || 0), 0) / ended.length)
      : 0;

  return (
    <div className="tw-conv-page">
      <div className="tw-conv-overview">
        <div className="tw-conv-overview-box tw-conv-overview-box--1">
          <span className="tw-conv-overview-val">{totalSessions}</span>
          <span className="tw-conv-overview-label">Sessions</span>
        </div>
        <div className="tw-conv-overview-box tw-conv-overview-box--2">
          <span className="tw-conv-overview-val">{completedSessions}</span>
          <span className="tw-conv-overview-label">Completed</span>
        </div>
        <div className="tw-conv-overview-box tw-conv-overview-box--3">
          <span className="tw-conv-overview-val">{totalMinutes}<small> min</small></span>
          <span className="tw-conv-overview-label">Total spoken</span>
        </div>
        <div className="tw-conv-overview-box tw-conv-overview-box--4">
          <span className="tw-conv-overview-val">{avgPace}<small> wpm</small></span>
          <span className="tw-conv-overview-label">Avg pace</span>
        </div>
        <div className="tw-conv-overview-box tw-conv-overview-box--5">
          <span className="tw-conv-overview-val">{avgFiller}</span>
          <span className="tw-conv-overview-label">Avg filler words</span>
        </div>
      </div>

      {error && <p className="tw-error" style={{ marginTop: '0.5rem' }}>{error}</p>}

      <section className="tw-conv-table-wrap">
        <h3 className="tw-conv-table-title">Practice History</h3>

        {loading ? (
          <p className="tw-muted">Loading…</p>
        ) : conversations.length === 0 ? (
          <p className="tw-muted">No conversations yet. Start one from the dashboard.</p>
        ) : (
          <div className="tw-conv-table-scroll">
            <table className="tw-conv-table">
              <thead>
                <tr>
                  <th className="tw-conv-th tw-conv-th--topic">Topic</th>
                  <th className="tw-conv-th tw-conv-th--num">Pace</th>
                  <th className="tw-conv-th tw-conv-th--num">Fillers</th>
                  <th className="tw-conv-th tw-conv-th--num">Duration</th>
                  <th className="tw-conv-th tw-conv-th--num">Rating</th>
                </tr>
              </thead>
              <tbody>
                {conversations.map((c, idx) => {
                  const pace = c.speech_speed_wpm != null ? `${Math.round(c.speech_speed_wpm)}` : '—';
                  const filler = c.filler_words_count != null ? c.filler_words_count : '—';
                  const dur = c.duration_seconds != null ? `${Math.round(c.duration_seconds / 60)} min` : '—';
                  const ratingLabel = c.status === 'ended'
                    ? (RATING_LABEL[c.rating] || '—')
                    : 'Disrupted';
                  const ratingCls = c.status === 'ended'
                    ? (RATING_CLASS[c.rating] || '')
                    : 'tw-conv-badge--disrupted';
                  return (
                    <tr
                      key={c.id}
                      className={`tw-conv-row ${idx % 2 === 0 ? 'tw-conv-row--even' : ''}`}
                      onClick={() => navigate(`/conversations/${c.id}`)}
                    >
                      <td className="tw-conv-td tw-conv-td--topic">{c.topic}</td>
                      <td className="tw-conv-td tw-conv-td--num">{pace}</td>
                      <td className="tw-conv-td tw-conv-td--num">{filler}</td>
                      <td className="tw-conv-td tw-conv-td--num">{dur}</td>
                      <td className="tw-conv-td tw-conv-td--num">
                        <span className={`tw-conv-badge ${ratingCls}`}>{ratingLabel}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
