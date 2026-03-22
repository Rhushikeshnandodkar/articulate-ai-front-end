import '../styles/voice.css';
import { useState, useRef, useCallback, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { voiceChat, endConversation, getConversation } from '../services/api';

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

function PlayIcon({ className, style, ...props }) {
  return (
    <svg className={className} style={style} fill="currentColor" viewBox="0 0 24 24" width="18" height="18" {...props}>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon({ className, style, ...props }) {
  return (
    <svg className={className} style={style} fill="currentColor" viewBox="0 0 24 24" width="18" height="18" {...props}>
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}

function ClockIcon({ className }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

export default function VoiceChat() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const conversationId =
    location.state?.conversationId ??
    (searchParams.get('conversation') ? Number(searchParams.get('conversation')) : null);
  const solo = Boolean(location.state?.solo) || searchParams.get('solo') === '1';
  const [topic, setTopic] = useState(() => location.state?.topic ?? '');
  const [openingReady, setOpeningReady] = useState(false);

  const [listening, setListening] = useState(false);
  const [displayTranscript, setDisplayTranscript] = useState('');
  const [transcriptLines, setTranscriptLines] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [ending, setEnding] = useState(false);
  const [endedByUser, setEndedByUser] = useState(false);
  const endedByUserRef = useRef(false);
  endedByUserRef.current = endedByUser;
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [pendingPlayUrl, setPendingPlayUrl] = useState(null);
  const accumulatedRef = useRef('');
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const listeningRef = useRef(false);
  const hasSpokenRef = useRef(false);
  const speakingStartRef = useRef(null);
  listeningRef.current = listening;

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  useEffect(() => {
    if (!conversationId) return;
    const start = Date.now();
    const t = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [conversationId]);
  const elapsedDisplay = `${String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')}:${String(elapsedSeconds % 60).padStart(2, '0')}`;
  const sessionProgress = Math.min(100, Math.floor(elapsedSeconds / 60) * 10);

  const lastAssistantMessage = transcriptLines.filter((l) => l.role === 'assistant').slice(-1)[0]?.content ?? '';
  const lastUserMessage = transcriptLines.filter((l) => l.role === 'user').slice(-1)[0]?.content ?? '';

  const playAudio = useCallback((url, options = {}) => {
    if (!url) return;
    const { revokeOnEnd = false } = options;
    const audio = new Audio(url);
    audio.volume = 1;
    let cleaned = false;
    let safetyId = null;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      if (safetyId) clearTimeout(safetyId);
      if (revokeOnEnd) URL.revokeObjectURL(url);
      setStatus('idle');
      setAutoplayBlocked(false);
    };
    audio.onended = cleanup;
    audio.onerror = () => {
      setError('Failed to play audio.');
      cleanup();
    };
    const doPlay = () => {
      audio.play().then(() => {}).catch((e) => {
        if (e.name === 'NotAllowedError') {
          setAutoplayBlocked(true);
          setPendingPlayUrl((prev) => prev || url);
          setError('Browser blocked auto-play.');
        } else {
          setError(e?.message || 'Playback failed.');
          cleanup();
        }
        setStatus('idle');
      });
    };
    if (audio.readyState >= 2) {
      doPlay();
    } else {
      const onCanPlay = () => doPlay();
      audio.addEventListener('canplaythrough', onCanPlay, { once: true });
      audio.addEventListener('canplay', onCanPlay, { once: true });
      const t = setTimeout(() => {
        audio.removeEventListener('canplaythrough', onCanPlay);
        audio.removeEventListener('canplay', onCanPlay);
        if (!cleaned) doPlay();
      }, 600);
      audio.addEventListener('error', () => clearTimeout(t), { once: true });
    }
    safetyId = setTimeout(() => {
      if (!cleaned) setStatus('idle');
    }, 5000);
  }, []);

  const playPendingReply = useCallback(() => {
    if (!pendingPlayUrl) return;
    setError(null);
    setStatus('playing');
    playAudio(pendingPlayUrl, { revokeOnEnd: false });
  }, [pendingPlayUrl, playAudio]);

  const sendToBackend = useCallback(async (audioBlobOrText, spokenDurationSeconds = 0) => {
    const isAudio = audioBlobOrText instanceof Blob;
    setStatus('sending');
    setError(null);
    try {
      const { blob, text: aiText } = isAudio
        ? await voiceChat({ audioBlob: audioBlobOrText, conversationId, spokenDurationSeconds, solo })
        : await voiceChat({ text: audioBlobOrText, conversationId, spokenDurationSeconds, solo });
      let url = null;
      if (blob) {
        url = URL.createObjectURL(blob);
        setPendingPlayUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } else {
        setPendingPlayUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
      }
      const userDisplay = isAudio ? '(your speech)' : audioBlobOrText;
      setTranscriptLines((prev) => [
        ...prev,
        { role: 'user', content: userDisplay },
        { role: 'assistant', content: aiText || '(reply)' },
      ]);
      hasSpokenRef.current = true;
      setStatus('idle');
      if (url) {
        playAudio(url);
      }
    } catch (err) {
      setError(err?.error || err?.message || String(err));
      setStatus('error');
    }
  }, [playAudio, conversationId, solo]);

  useEffect(() => {
    if (!conversationId) return undefined;
    const fallbackTopic = location.state?.topic ?? '';
    let cancelled = false;

    async function bootstrap() {
      setOpeningReady(false);
      setError(null);
      try {
        const conv = await getConversation(conversationId);
        if (cancelled) return;
        if (conv.topic) setTopic(conv.topic);

        const msgs = [...(conv.messages || [])].sort(
          (a, b) => (a.sequence ?? 0) - (b.sequence ?? 0),
        );
        if (msgs.length > 0) {
          setTranscriptLines(msgs.map((m) => ({ role: m.role, content: m.content })));
          setOpeningReady(true);
          return;
        }

        setStatus('sending');
        let blob;
        let text;
        try {
          const res = await voiceChat({ conversationId, welcome: true, solo });
          blob = res.blob;
          text = res.text;
        } catch (welcomeErr) {
          const errMsg = String(welcomeErr?.error || welcomeErr?.message || '').toLowerCase();
          if (errMsg.includes('welcome already')) {
            const conv2 = await getConversation(conversationId);
            if (cancelled) return;
            if (conv2.topic) setTopic(conv2.topic);
            const msgs2 = [...(conv2.messages || [])].sort(
              (a, b) => (a.sequence ?? 0) - (b.sequence ?? 0),
            );
            setTranscriptLines(msgs2.map((m) => ({ role: m.role, content: m.content })));
            setOpeningReady(true);
            setStatus('idle');
            return;
          }
          throw welcomeErr;
        }
        if (cancelled) return;
        setTranscriptLines([
          { role: 'assistant', content: text || 'What is your take on this topic? Say whatever you want to explore out loud.' },
        ]);
        setOpeningReady(true);
        setStatus('idle');
        if (blob) {
          const url = URL.createObjectURL(blob);
          setPendingPlayUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
          playAudio(url, { revokeOnEnd: true });
        }
      } catch (e) {
        if (cancelled) return;
        const msg = e?.error || e?.message || String(e);
        setError(msg);
        const t = fallbackTopic || 'this topic';
        setTranscriptLines([
          {
            role: 'assistant',
            content: `What are your views on "${t}"? Feel free to go deep—say whatever comes to mind.`,
          },
        ]);
        setOpeningReady(true);
        setStatus('idle');
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [conversationId, solo, playAudio, location.state?.topic]);

  useEffect(() => {
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interim = '';
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcript;
        } else {
          interim += transcript;
        }
      }
      if (finalText) {
        accumulatedRef.current = (accumulatedRef.current + ' ' + finalText).trim();
      }
      setDisplayTranscript(accumulatedRef.current + (interim ? ' ' + interim : ''));
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech') return;
      if (event.error === 'aborted') return;
      let msg = event.error || 'Speech recognition error';
      if (event.error === 'not-allowed' || (typeof msg === 'string' && msg.toLowerCase().includes('not allowed'))) {
        msg = 'Microphone blocked. Use Chrome, allow the mic when prompted, and use https or localhost.';
      }
      setError(msg);
      setListening(false);
    };

    recognition.onend = () => {
      if (listeningRef.current) {
        try {
          recognition.start();
        } catch (_) {}
      }
    };

    recognitionRef.current = recognition;
    if (listening) {
      try {
        recognition.start();
      } catch (e) {
        const msg = e?.message || 'Failed to start microphone';
        const isPermission = /not allowed|denied|permission|secure context/i.test(msg);
        setError(isPermission
          ? 'Microphone blocked. Use Chrome, allow the mic when prompted.'
          : msg);
        setListening(false);
      }
    }
    return () => {
      try {
        recognition.abort();
      } catch (_) {}
    };
  }, [listening]);

  const sentByPauseRef = useRef(false);

  const getSpokenDuration = () => {
    if (!speakingStartRef.current) return 0;
    return (Date.now() - speakingStartRef.current) / 1000;
  };

  const toggleListening = () => {
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported. Use Chrome.');
      return;
    }
    if (!window.isSecureContext) {
      setError('Microphone requires https or localhost.');
      return;
    }
    if (listening) {
      const text = accumulatedRef.current.trim();
      const duration = getSpokenDuration();
      speakingStartRef.current = null;
      const recorder = mediaRecorderRef.current;

      if (recorder && recorder.state !== 'inactive') {
        sentByPauseRef.current = true;
        sentByPauseRef.duration = duration;
        recorder.stop();
      } else {
        try {
          recognitionRef.current?.abort();
        } catch (_) {}
        setListening(false);
        setDisplayTranscript('');
        if (text) {
          sendToBackend(text, duration);
          setDisplayTranscript(text);
        } else {
          setError('No speech detected. Say something, then click Pause.');
          setStatus('idle');
        }
        return;
      }

      try {
        recognitionRef.current?.abort();
      } catch (_) {}
      setListening(false);
      setDisplayTranscript('');
    } else {
      sentByPauseRef.current = false;
      sentByPauseRef.duration = 0;
      speakingStartRef.current = Date.now();
      setError(null);
      setDisplayTranscript('');
      accumulatedRef.current = '';
      audioChunksRef.current = [];
      setStatus('listening');
      setListening(true);
    }
  };

  useEffect(() => {
    if (!listening) return;
    let recorder;
    const startRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        recorder = new MediaRecorder(stream);
        audioChunksRef.current = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        recorder.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          if (!sentByPauseRef.current) return;
          const duration = sentByPauseRef.duration || 0;
          sentByPauseRef.current = false;
          sentByPauseRef.duration = 0;
          const blob = audioChunksRef.current.length > 0
            ? new Blob(audioChunksRef.current, { type: 'audio/webm' })
            : null;
          const text = accumulatedRef.current.trim();
          if (blob && blob.size > 1000) {
            sendToBackend(blob, duration);
          } else if (text) {
            sendToBackend(text, duration);
          } else {
            setError('No speech detected. Say something, then click Pause.');
            setStatus('idle');
          }
        };
        recorder.start(1000);
        mediaRecorderRef.current = recorder;
      } catch (e) {
        setError(e?.message || 'Could not access microphone.');
        setListening(false);
      }
    };
    startRecording();
    return () => {
      if (recorder && recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch (_) {}
      }
    };
  }, [listening, sendToBackend]);

  const handleEndConversation = async () => {
    if (!conversationId) return;
    setEnding(true);
    setEndedByUser(true);
    try {
      await endConversation(conversationId);
      navigate(`/conversations/${conversationId}`, { replace: true });
    } catch (err) {
      setError(err?.error || err?.message || 'Failed to end conversation.');
    } finally {
      setEnding(false);
    }
  };

  useEffect(() => {
    return () => {
      if (!conversationId) return;
      if (endedByUserRef.current) return;
      if (hasSpokenRef.current) {
        endConversation(conversationId).catch(() => {});
      }
    };
  }, [conversationId]);

  const requestEndSession = () => {
    if (!conversationId) {
      navigate('/dashboard', { replace: true });
      return;
    }
    setShowEndConfirm(true);
  };

  useEffect(() => {
    if (!conversationId) return;
    const state = { articulateGuard: true };
    window.history.pushState(state, '');
    const onPopState = (event) => {
      if (event.state && event.state.articulateGuard) {
        setShowEndConfirm(true);
        window.history.pushState(state, '');
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [conversationId]);

  /* Screen Wake Lock: keep phone screen on during voice session (like video playback) */
  useEffect(() => {
    if (!navigator.wakeLock) return;
    let wakeLock = null;
    const acquire = async () => {
      try {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
      } catch (_) {
        /* Wake lock not supported or failed (e.g. low battery, user disabled) */
      }
    };
    acquire();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        acquire();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (wakeLock) {
        try {
          wakeLock.release();
        } catch (_) {}
        wakeLock = null;
      }
    };
  }, []);

  const isAiSpeaking = status === 'playing';
  const isProcessing = status === 'sending';
  const isUserSpeaking = listening && status === 'listening';
  const isBootstrapping = Boolean(conversationId) && !openingReady;

  return (
    <div className="tw-voice-page">
      <div className="tw-voice-body">
        <main className="tw-voice-main">
          {/* Single unified card */}
          <section className="tw-voice-card tw-voice-card--unified">
            {/* AI message display */}
            <div
              className={`tw-voice-ai-display ${isAiSpeaking ? 'tw-voice-ai-display--speaking' : ''} ${isBootstrapping ? 'tw-voice-ai-display--loading' : ''}`}
            >
              <div className="tw-voice-ai-display-label">
                <span
                  className={`tw-voice-ai-dot ${isAiSpeaking ? 'tw-voice-ai-dot--active' : ''} ${isBootstrapping ? 'tw-voice-ai-dot--loading' : ''}`}
                />
                {isBootstrapping
                  ? 'Loading'
                  : isAiSpeaking
                    ? 'AI is speaking…'
                    : isProcessing
                      ? 'AI is thinking…'
                      : 'AI Partner'}
              </div>
              <p key={isBootstrapping ? 'bootstrap' : lastAssistantMessage} className="tw-voice-ai-display-text tw-voice-message-zoom">
                {isBootstrapping ? (
                  <>
                    <span className="tw-voice-loading-lead">Creating your opening question…</span>
                    <span className="tw-voice-loading-detail">
                      The AI is generating what you&apos;ll hear first and preparing the voice audio. This usually takes a few seconds — hang tight.
                    </span>
                  </>
                ) : isProcessing ? (
                  'Processing your response…'
                ) : (
                  lastAssistantMessage
                    || (topic ? `Let's practice "${topic}". Click Start Speaking when you're ready.` : "Click Start Speaking when you're ready.")
                )}
              </p>
            </div>

            {/* Waveform + listening status + hint */}
            <div className={`tw-voice-wave-wrap ${isUserSpeaking ? 'tw-voice-wave-active' : ''}`}>
              <span /><span /><span /><span /><span /><span /><span />
            </div>
            {isUserSpeaking && (
              <div className="tw-voice-wave-status">
                <div className="tw-voice-status-line">
                  <span className="tw-voice-status-dot" aria-hidden />
                  Listening…
                </div>
                <p className="tw-voice-hint">When you&apos;re done speaking, click <strong>Pause</strong> to send your response.</p>
              </div>
            )}

            {/* User's speech display - when listening, show reassurance; when idle, show start CTA */}
            <div className="tw-voice-user-display">
              {isUserSpeaking ? (
                <p className="tw-voice-user-display-placeholder tw-voice-user-display--listening">
                  <span className="tw-voice-listening-icon" aria-hidden>🎧</span>
                  I&apos;m listening to you — speak naturally.
                </p>
              ) : (
                <p className="tw-voice-user-display-placeholder tw-voice-user-display--start-cta">
                  {isBootstrapping ? (
                    <>
                      <span className="tw-voice-user-display--loading-note">Loading in progress.</span>
                      When the question appears, listen first — then tap <strong>Start Speaking</strong> to answer.
                    </>
                  ) : (
                    <>Click <strong>Start Speaking</strong> when you&apos;re ready to respond.</>
                  )}
                </p>
              )}
            </div>

            {/* Controls row */}
            <div className="tw-voice-controls">
              <button
                type="button"
                className={listening ? 'tw-voice-btn-pause' : 'tw-voice-btn-start'}
                onClick={toggleListening}
                disabled={status === 'sending' || status === 'playing' || !openingReady}
              >
                {listening ? (
                  <><PauseIcon style={{ width: 18, height: 18 }} /> Pause</>
                ) : (
                  <><PlayIcon style={{ width: 18, height: 18 }} /> Start Speaking</>
                )}
              </button>

              {conversationId && (
                <button
                  type="button"
                  className="tw-voice-end-btn"
                  onClick={requestEndSession}
                  disabled={ending}
                >
                  {ending ? 'Ending…' : 'End Session to See Report'}
                </button>
              )}
            </div>

            {/* Status indicators */}
            {isBootstrapping && (
              <div className="tw-voice-status-line tw-voice-status-line--loading" role="status" aria-live="polite">
                <span className="tw-voice-loading-bar" aria-hidden />
                Connecting to the coach…
              </div>
            )}
            {isProcessing && !isBootstrapping && <div className="tw-voice-status-line">Getting reply…</div>}
            {isAiSpeaking && <div className="tw-voice-status-line tw-voice-status-line--ai">Playing AI reply…</div>}
            {error && <div className="tw-voice-error">{error}</div>}
          </section>
        </main>

        <aside className="tw-voice-sidebar">
          <h2 className="tw-voice-sidebar-title">Session Stats</h2>
          <div className="tw-voice-stats-grid">
            <div className="tw-voice-stat-card tw-voice-stat-card--topic">
              <p className="tw-voice-stat-label">Current Topic</p>
              <p className="tw-voice-stat-topic">{topic || 'Practice conversation'}</p>
            </div>

            <div className="tw-voice-stat-card">
              <p className="tw-voice-stat-label">Time Elapsed</p>
              <div className="tw-voice-stat-row">
                <p className="tw-voice-stat-value">{elapsedDisplay}</p>
                <span className="tw-voice-stat-icon" style={{ background: 'rgba(30, 58, 138, 0.15)', color: 'var(--accent)' }}><ClockIcon /></span>
              </div>
              <div className="tw-voice-stat-bar">
                <div className="tw-voice-stat-bar-fill" style={{ width: `${Math.min(100, (elapsedSeconds / 60) * 5)}%` }} />
              </div>
            </div>

            <div className="tw-voice-stat-card">
              <p className="tw-voice-stat-label">Session Progress</p>
              <div className="tw-voice-stat-row">
                <p className="tw-voice-stat-value" style={{ color: 'var(--accent)' }}>{sessionProgress}%</p>
              </div>
              <div className="tw-voice-stat-bar">
                <div className="tw-voice-stat-bar-fill" style={{ width: `${sessionProgress}%`, background: 'var(--accent)' }} />
              </div>
            </div>

            <div className="tw-voice-stat-card">
              <p className="tw-voice-stat-label">Turns</p>
              <p className="tw-voice-stat-value">{transcriptLines.filter(l => l.role === 'user').length}</p>
            </div>
          </div>
        </aside>
      </div>

      {showEndConfirm && (
        <div className="tw-voice-leave-overlay" role="dialog" aria-modal="true">
          <div className="tw-voice-leave-modal">
            <h2 className="tw-voice-leave-title">End session?</h2>
            <p className="tw-voice-leave-text">
              If you end now, we&apos;ll save your progress and generate a report for this practice session.
            </p>
            <div className="tw-voice-leave-actions">
              <button
                type="button"
                className="tw-voice-leave-cancel"
                onClick={() => setShowEndConfirm(false)}
                disabled={ending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="tw-voice-leave-danger"
                onClick={handleEndConversation}
                disabled={ending}
              >
                {ending ? 'Ending…' : 'End session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
