import '../styles/conversation-detail.css';
import '../styles/pages.css';
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePageNavbar } from '../contexts/PageNavbarContext';
import { ArrowLeftIcon, CheckIcon, MicIcon, SparkIcon } from '../components/icons';
import { getConversation, rephraseText, grammarCheck } from '../services/api';

const RATING = {
  good: { label: 'Good', tone: 'good' },
  needs_work: { label: 'Needs work', tone: 'warn' },
  poor: { label: 'Poor', tone: 'poor' },
};
const IDEAL_PACE = [120, 150];
const PACE_SCALE = [60, 210];

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
    setPageNavbar({ title: 'Session report' });
    return () => setPageNavbar({});
  }, [setPageNavbar]);

  if (loading) {
    return (
      <div className="rep">
        <div className="ui-skeleton" style={{ height: 120, borderRadius: 8, marginBottom: 16 }} />
        <div className="ui-skeleton" style={{ height: 200, borderRadius: 8 }} />
      </div>
    );
  }

  if (error || !conv) {
    return (
      <div className="rep">
        <div className="ui-card ui-empty">
          <p className="ui-empty-title">{error || 'Session not found.'}</p>
          <Link to="/conversations" className="ui-btn ui-btn-secondary ui-btn-sm" style={{ marginTop: 12 }}>Back to sessions</Link>
        </div>
      </div>
    );
  }

  const ended = conv.status === 'ended';
  const startedDate = conv.started_at ? new Date(conv.started_at) : null;
  const dateLabel = startedDate
    ? startedDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) + ' · ' + startedDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : '';
  const duration = conv.duration_seconds != null
    ? `${Math.floor(conv.duration_seconds / 60)}m ${String(Math.round(conv.duration_seconds % 60)).padStart(2, '0')}s`
    : null;
  const pace = conv.speech_speed_wpm != null ? Math.round(conv.speech_speed_wpm) : null;
  const paceVerdict = pace == null ? null : pace < IDEAL_PACE[0] ? 'A little slow' : pace > IDEAL_PACE[1] ? 'A little fast' : 'Right in the ideal range';
  const paceOk = pace != null && pace >= IDEAL_PACE[0] && pace <= IDEAL_PACE[1];
  const pacePos = pace == null ? 0 : Math.max(0, Math.min(100, ((pace - PACE_SCALE[0]) / (PACE_SCALE[1] - PACE_SCALE[0])) * 100));
  const idealLeft = ((IDEAL_PACE[0] - PACE_SCALE[0]) / (PACE_SCALE[1] - PACE_SCALE[0])) * 100;
  const idealWidth = ((IDEAL_PACE[1] - IDEAL_PACE[0]) / (PACE_SCALE[1] - PACE_SCALE[0])) * 100;
  const fillers = Object.entries(conv.filler_words_breakdown || {}).sort((a, b) => b[1] - a[1]);
  const maxFiller = fillers.length ? fillers[0][1] : 1;
  const rating = RATING[conv.rating];
  const userMessages = (conv.messages || []).filter((m) => m.role === 'user').length;

  return (
    <div className="rep">
      <Link to="/conversations" className="rep-back"><ArrowLeftIcon /> Sessions</Link>

      <section className="ui-card rep-hero">
        <div className="rep-hero-main">
          <div className="ui-eyebrow">Session report</div>
          <h1 className="rep-title">{conv.topic}</h1>
          <div className="rep-meta">
            {dateLabel && <span>{dateLabel}</span>}
            {duration && <span>{duration}</span>}
            <span>{userMessages} {userMessages === 1 ? 'answer' : 'answers'}</span>
          </div>
        </div>
        <div className={`rep-verdict is-${rating ? rating.tone : ended ? 'none' : 'open'}`}>
          <span className="rep-verdict-label">Overall</span>
          <span className="rep-verdict-value">{rating ? rating.label : ended ? 'Not rated' : 'Unfinished'}</span>
        </div>
      </section>

      {conv.feedback_summary && (
        <section className="ui-card rep-feedback">
          <div className="rep-feedback-head"><SparkIcon /> Coach feedback</div>
          <p>{conv.feedback_summary}</p>
        </section>
      )}

      {ended && (
        <section className="ui-card rep-metrics">
          <div className="rep-metric">
            <span className="rep-metric-label">Pace</span>
            <span className="rep-metric-value">{pace ?? '—'}<small> wpm</small></span>
          </div>
          <div className="rep-metric">
            <span className="rep-metric-label">Filler words</span>
            <span className="rep-metric-value">{conv.filler_words_count ?? '—'}</span>
          </div>
          <div className="rep-metric">
            <span className="rep-metric-label">Pauses</span>
            <span className="rep-metric-value">{conv.pauses_count ?? '—'}</span>
          </div>
          <div className="rep-metric">
            <span className="rep-metric-label">Duration</span>
            <span className="rep-metric-value">{duration ?? '—'}</span>
          </div>
        </section>
      )}

      {ended && (pace != null || fillers.length > 0) && (
        <div className="rep-grid">
          {pace != null && (
            <section className="ui-card">
              <div className="ui-card-head">
                <h2 className="ui-card-title">Speaking pace</h2>
                <span className={`rep-tag ${paceOk ? 'is-good' : 'is-warn'}`}>{paceVerdict}</span>
              </div>
              <div className="rep-pace">
                <div className="rep-pace-track">
                  <span className="rep-pace-ideal" style={{ left: `${idealLeft}%`, width: `${idealWidth}%` }} />
                  <span className="rep-pace-marker" style={{ left: `${pacePos}%` }}><span>{pace}</span></span>
                </div>
                <div className="rep-pace-scale">
                  <span>{PACE_SCALE[0]}</span>
                  <span>Ideal {IDEAL_PACE[0]}–{IDEAL_PACE[1]} wpm</span>
                  <span>{PACE_SCALE[1]}</span>
                </div>
              </div>
              <p className="ui-card-sub" style={{ marginTop: 14 }}>
                {paceOk
                  ? 'Easy to follow. Keep this rhythm.'
                  : pace < IDEAL_PACE[0]
                    ? 'Try shorter pauses between ideas and keep your sentences moving.'
                    : 'Slow down a little and pause after key points so they land.'}
              </p>
            </section>
          )}
          {fillers.length > 0 && (
            <section className="ui-card">
              <div className="ui-card-head">
                <h2 className="ui-card-title">Filler words</h2>
                <span className="ui-card-sub">{conv.filler_words_count} total</span>
              </div>
              <ul className="rep-fillers">
                {fillers.map(([word, count]) => (
                  <li key={word}>
                    <span className="rep-filler-word">“{word}”</span>
                    <span className="rep-filler-bar"><span style={{ width: `${(count / maxFiller) * 100}%` }} /></span>
                    <span className="rep-filler-count">{count}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <section className="rep-transcript-section">
        <div className="rep-section-head">
          <h2 className="ui-card-title">Transcript</h2>
          <span className="ui-card-sub">Tap Improve or Grammar on your answers</span>
        </div>
        {conv.messages && conv.messages.length > 0 ? (
          <div className="ui-card rep-transcript">
            {conv.messages.map((m) => (
              <div key={m.id} className={`rep-msg ${m.role === 'user' ? 'is-user' : 'is-ai'}`}>
                <div className="rep-msg-who">{m.role === 'user' ? 'You' : 'Coach'}</div>
                <p className="rep-msg-text">{m.content}</p>
                {m.role === 'user' && (
                  <div className="rep-msg-actions">
                    <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={() => handleRephrase(m.content)} disabled={loadingAction !== null}>
                      <SparkIcon /> {loadingAction === 'rephrase' ? 'Working…' : 'Improve'}
                    </button>
                    <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" onClick={() => handleGrammar(m.content)} disabled={loadingAction !== null}>
                      <CheckIcon /> {loadingAction === 'grammar' ? 'Checking…' : 'Grammar'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="ui-card ui-empty"><p style={{ margin: 0 }}>No messages in this session.</p></div>
        )}
      </section>

      <div className="rep-next">
        <Link to="/topics" className="ui-btn ui-btn-primary"><MicIcon /> Practice another topic</Link>
        <Link to="/conversations" className="ui-btn ui-btn-secondary">All sessions</Link>
      </div>

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
                {modal.type === 'grammar' && 'Speaking grammar'}
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
                    <p className="tw-detail-modal-label">What you said</p>
                    <p className="tw-detail-modal-text">{modal.data.original}</p>
                  </div>
                  {modal.data.mistake_count > 0 ? (
                    <>
                      <div className="tw-detail-modal-block">
                        <p className="tw-detail-modal-label">Spoken issues ({modal.data.mistake_count})</p>
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
                        <p className="tw-detail-modal-label">Smoother way to say it</p>
                        <p className="tw-detail-modal-text">{modal.data.corrected_sentence}</p>
                      </div>
                    </>
                  ) : (
                    <div className="tw-detail-modal-block tw-detail-modal-success">
                      {modal.data.summary || 'No spoken grammar issues stood out — sounds natural.'}
                    </div>
                  )}
                  {modal.data.mistake_count > 0 && modal.data.summary && (
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
  );
}
