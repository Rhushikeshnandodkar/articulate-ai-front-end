import '../styles/conversation-detail.css';
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePageNavbar } from '../contexts/PageNavbarContext';
import { getConversation, rephraseText, grammarCheck } from '../services/api';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const RATING_LABELS = {
  good: 'Good',
  needs_work: 'Needs work',
  poor: 'Poor',
};

function CloseIcon() {
  return (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default function ConversationDetail() {
  const { id } = useParams();
  const [conv, setConv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);
  const [loadingAction, setLoadingAction] = useState(null);

  useEffect(() => {
    getConversation(id)
      .then(setConv)
      .catch((e) => setError(e?.error || e?.message || 'Failed to load.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleRephrase = async (content) => {
    if (!content?.trim()) return;
    setLoadingAction('rephrase');
    setModal(null);
    try {
      const data = await rephraseText(content);
      setModal({ type: 'rephrase', data });
    } catch (e) {
      setModal({ type: 'error', message: e?.error || e?.message || 'Failed to get better version.' });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleGrammar = async (content) => {
    if (!content?.trim()) return;
    setLoadingAction('grammar');
    setModal(null);
    try {
      const data = await grammarCheck(content);
      setModal({ type: 'grammar', data });
    } catch (e) {
      setModal({ type: 'error', message: e?.error || e?.message || 'Failed to check grammar.' });
    } finally {
      setLoadingAction(null);
    }
  };

  const closeModal = () => setModal(null);
  const { setPageNavbar } = usePageNavbar();

  useEffect(() => {
    if (!modal) return;
    const onKey = (e) => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal]);

  useEffect(() => {
    const title = conv?.topic || 'Conversation';
    const backLink = (
      <Link to="/dashboard" className="tw-detail-nav-back">
        ← Back to dashboard
      </Link>
    );
    setPageNavbar({ title, rightActions: backLink });
    return () => setPageNavbar({});
  }, [conv?.topic, setPageNavbar]);

  if (loading) {
    return (
      <div className="tw-detail-page">
        <div className="tw-detail-loading">
          <p className="tw-muted">Loading conversation…</p>
        </div>
      </div>
    );
  }

  if (error || !conv) {
    return (
      <div className="tw-detail-page">
        <div className="tw-detail-error-wrap">
          <p className="tw-detail-error">{error || 'Conversation not found.'}</p>
          <Link to="/dashboard" className="tw-detail-back">← Back to dashboard</Link>
        </div>
      </div>
    );
  }

  const hasStats = conv.status === 'ended' && (conv.filler_words_count != null || conv.rating);
  const startedDate = conv.started_at ? new Date(conv.started_at) : null;
  const endedDate = conv.ended_at ? new Date(conv.ended_at) : null;
  const startedLabel = startedDate ? startedDate.toLocaleDateString() : null;
  const endedLabel = endedDate ? endedDate.toLocaleDateString() : null;

  const userPace = conv.speech_speed_wpm || 0;
  const targetPace = 140; // ideal conversational pace

  return (
    <div className="tw-detail-page">
      <div className="tw-detail-main">
      {hasStats && (
        <section className="tw-detail-section">
          <div className="tw-detail-section-head">
            <h2 className="tw-detail-section-title">Session stats</h2>
            {startedLabel && (
              <p className="tw-detail-section-date">
                {startedLabel && !endedLabel && `Practiced on ${startedLabel}`}
                {startedLabel && endedLabel && startedLabel === endedLabel && `Practiced on ${startedLabel}`}
                {startedLabel && endedLabel && startedLabel !== endedLabel && `${startedLabel} – ${endedLabel}`}
              </p>
            )}
          </div>
          <p className="tw-detail-section-desc">Use these insights to improve your next practice.</p>
          <div className="tw-detail-stats-grid">
            {conv.filler_words_count != null && (
              <div className="tw-detail-stat">
                <span className="tw-detail-stat-value">{conv.filler_words_count}</span>
                <span className="tw-detail-stat-label">Filler words</span>
                <span className="tw-detail-stat-hint">um, uh, like, etc.</span>
              </div>
            )}
            {conv.pauses_count != null && (
              <div className="tw-detail-stat">
                <span className="tw-detail-stat-value">{conv.pauses_count}</span>
                <span className="tw-detail-stat-label">Pauses</span>
                <span className="tw-detail-stat-hint">Noticeable pauses</span>
              </div>
            )}
            {conv.speech_speed_wpm != null && (
              <div className="tw-detail-stat">
                <span className="tw-detail-stat-value">{Math.round(conv.speech_speed_wpm)}</span>
                <span className="tw-detail-stat-label">Pace (wpm)</span>
                <span className="tw-detail-stat-hint">words per minute</span>
              </div>
            )}
            {conv.duration_seconds != null && (
              <div className="tw-detail-stat">
                <span className="tw-detail-stat-value">{Math.round(conv.duration_seconds)}s</span>
                <span className="tw-detail-stat-label">Duration</span>
              </div>
            )}
            {conv.rating && (
              <div className={`tw-detail-stat ${conv.rating === 'good' ? 'tw-detail-stat-good' : conv.rating === 'needs_work' ? 'tw-detail-stat-warn' : 'tw-detail-stat-poor'}`}>
                <span className="tw-detail-stat-value">{RATING_LABELS[conv.rating] || conv.rating}</span>
                <span className="tw-detail-stat-label">Overall</span>
              </div>
            )}
          </div>

          {(conv.filler_words_breakdown && Object.keys(conv.filler_words_breakdown).length > 0) || conv.speech_speed_wpm != null ? (
            <div className="tw-detail-row">
              {conv.filler_words_breakdown && Object.keys(conv.filler_words_breakdown).length > 0 && (
                <div className="tw-detail-card tw-detail-card-spaced tw-detail-card-half">
                  <h3 className="tw-detail-card-title">Filler words breakdown</h3>
                  <ul className="tw-detail-filler-list">
                    {Object.entries(conv.filler_words_breakdown)
                      .sort((a, b) => b[1] - a[1])
                      .map(([word, count]) => (
                        <li key={word}><strong>{word}</strong> {count}</li>
                      ))}
                  </ul>
                </div>
              )}
              {conv.speech_speed_wpm != null && (
                <div className="tw-detail-card tw-detail-card-spaced tw-detail-card-half">
                  <h3 className="tw-detail-card-title">Pace graph</h3>
                  <div className="tw-detail-pace-chart-wrap">
                    <Line
                      data={{
                        labels: ['Ideal pace', 'Your pace'],
                        datasets: [
                          {
                            label: 'Words per minute',
                            data: [targetPace, Math.round(userPace)],
                            borderColor: 'rgba(156, 163, 175, 0.4)',
                            backgroundColor: ['#22C55E', '#EF4444'],
                            pointBackgroundColor: ['#22C55E', '#EF4444'],
                            pointBorderColor: ['#22C55E', '#EF4444'],
                            pointRadius: 5,
                            pointHoverRadius: 6,
                            showLine: false,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            callbacks: {
                              label: (ctx) => `${ctx.parsed.y} wpm`,
                            },
                          },
                        },
                        scales: {
                          x: {
                            grid: { display: false },
                            ticks: { color: '#9CA3AF', font: { size: 11 } },
                          },
                          y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(148, 163, 184, 0.25)' },
                            ticks: { color: '#6B7280', font: { size: 10 } },
                          },
                        },
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </section>
      )}

      <section className="tw-detail-section">
        <h2 className="tw-detail-section-title">Transcript</h2>
        <p className="tw-detail-section-desc">Click “Make better” or “Grammar check” on your messages to get suggestions.</p>
        {conv.messages && conv.messages.length > 0 ? (
          <div className="tw-detail-transcript">
            {conv.messages.map((m) => (
              <div key={m.id} className={`tw-detail-msg tw-detail-msg-${m.role}`}>
                <p className="tw-detail-msg-role">{m.role === 'user' ? 'You' : 'AI'}</p>
                <p className="tw-detail-msg-content">{m.content}</p>
                {m.role === 'user' && (
                  <div className="tw-detail-msg-actions">
                    <button
                      type="button"
                      className="tw-detail-action-btn"
                      onClick={() => handleRephrase(m.content)}
                      disabled={loadingAction !== null}
                    >
                      {loadingAction === 'rephrase' ? '…' : '✨ Make better'}
                    </button>
                    <button
                      type="button"
                      className="tw-detail-action-btn grammar"
                      onClick={() => handleGrammar(m.content)}
                      disabled={loadingAction !== null}
                    >
                      {loadingAction === 'grammar' ? '…' : '✓ Grammar check'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="tw-muted">No messages in this conversation.</p>
        )}
      </section>

      {modal && (
        <div
          className="tw-detail-modal-overlay"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="detail-modal-title"
        >
          <div className="tw-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tw-detail-modal-header">
              <h2 id="detail-modal-title" className="tw-detail-modal-title">
                {modal.type === 'rephrase' && 'Better version'}
                {modal.type === 'grammar' && 'Grammar check'}
                {modal.type === 'error' && 'Something went wrong'}
              </h2>
              <button type="button" className="tw-detail-modal-close" onClick={closeModal} aria-label="Close">
                <CloseIcon />
              </button>
            </div>
            <div className="tw-detail-modal-body">
              {modal.type === 'error' && (
                <p className="tw-detail-error">{modal.message}</p>
              )}

              {modal.type === 'rephrase' && modal.data && (
                <>
                  <div className="tw-detail-modal-block">
                    <p className="tw-detail-modal-label">Your answer</p>
                    <p className="tw-detail-modal-text">{modal.data.original}</p>
                  </div>
                  <div className="tw-detail-modal-block tw-detail-modal-highlight">
                    <p className="tw-detail-modal-label">Better version</p>
                    <p className="tw-detail-modal-text">{modal.data.rephrased}</p>
                  </div>
                  {modal.data.explanation && (
                    <div className="tw-detail-modal-block">
                      <p className="tw-detail-modal-label">What changed</p>
                      <p className="tw-detail-modal-text">{modal.data.explanation}</p>
                    </div>
                  )}
                </>
              )}

              {modal.type === 'grammar' && modal.data && (
                <>
                  <div className="tw-detail-modal-block">
                    <p className="tw-detail-modal-label">Your text</p>
                    <p className="tw-detail-modal-text">{modal.data.original}</p>
                  </div>
                  {modal.data.mistake_count > 0 ? (
                    <>
                      <div className="tw-detail-modal-block">
                        <p className="tw-detail-modal-label">Mistakes ({modal.data.mistake_count})</p>
                        <ul className="tw-detail-modal-mistakes">
                          {modal.data.mistakes.map((err, i) => (
                            <li key={i}>
                              <span className="tw-detail-modal-wrong">“{err.wrong}”</span>
                              {' → '}
                              <span className="tw-detail-modal-correct">“{err.correct}”</span>
                              <span className="tw-detail-modal-rule">{err.rule}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="tw-detail-modal-block tw-detail-modal-highlight">
                        <p className="tw-detail-modal-label">Corrected sentence</p>
                        <p className="tw-detail-modal-text">{modal.data.corrected_sentence}</p>
                      </div>
                    </>
                  ) : (
                    <div className="tw-detail-modal-block tw-detail-modal-success">
                      No grammar mistakes found. Good job!
                    </div>
                  )}
                  {modal.data.summary && (
                    <div className="tw-detail-modal-block tw-detail-modal-summary">
                      <p className="tw-detail-modal-label">Tip</p>
                      <p className="tw-detail-modal-text">{modal.data.summary}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
