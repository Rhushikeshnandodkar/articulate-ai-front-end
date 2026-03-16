import '../styles/voice.css';
import { useState, useRef, useCallback, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { voiceChat, endConversation } from '../services/api';

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

function PlayIcon({ className }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon({ className }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
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
  const topic = location.state?.topic ?? '';
  const topicDescription = location.state?.topicDescription ?? '';

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
  const transcriptEndRef = useRef(null);
  const sessionStartRef = useRef(null);
  listeningRef.current = listening;

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  useEffect(() => {
    if (!conversationId) return;
    sessionStartRef.current = sessionStartRef.current ?? Date.now();
    const t = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - sessionStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [conversationId]);
  const elapsedDisplay = `${String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')}:${String(elapsedSeconds % 60).padStart(2, '0')}`;
  // Session progress: 10% per minute, assuming a 10-minute session target.
  const sessionProgress = Math.min(100, Math.floor(elapsedSeconds / 60) * 10);
  const lastAssistantMessage = transcriptLines.filter((l) => l.role === 'assistant').slice(-1)[0]?.content ?? '';
  const upcomingPlaceholders = [
    'Leadership experience and management style',
    'Problem-solving approach in challenging situations',
    'Career goals and professional development',
  ];

  const scrollToTranscriptEnd = () => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToTranscriptEnd();
  }, [transcriptLines, displayTranscript]);

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
      setError('Failed to play audio. Try "Play reply" below.');
      cleanup();
    };
    const doPlay = () => {
      audio.play().then(() => {}).catch((e) => {
        if (e.name === 'NotAllowedError') {
          setAutoplayBlocked(true);
          setPendingPlayUrl((prev) => prev || url);
          setError('Browser blocked auto-play. Click "Play reply" to hear the AI.');
        } else {
          setError(e?.message || 'Playback failed. Use "Play reply" to try again.');
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
        ? await voiceChat({ audioBlob: audioBlobOrText, conversationId, spokenDurationSeconds })
        : await voiceChat({ text: audioBlobOrText, conversationId, spokenDurationSeconds });
      let url = null;
      if (blob) {
        url = URL.createObjectURL(blob);
        setPendingPlayUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } else {
        // Text-only reply (builder plan) – clear any pending audio.
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
  }, [playAudio, conversationId]);

  useEffect(() => {
    if (!conversationId) return;
    if (transcriptLines.length > 0) return;
    let content;
    if (topic) {
      if (topicDescription) {
        content = `Today's topic: ${topic}.

Here is how you can start:
- First, briefly set the scene in 1–2 sentences (who, where, when).
- Then explain your thoughts, decisions, or feelings in 3–4 sentences.
- Finally, add one concrete example or short story related to this situation.

Use simple English and speak as if you are talking to a friend. When you're ready, click Start and begin with the first sentence.`;
      } else {
        content = `Welcome! Let's practice ${topic}. When you're ready, click Start and tell me in your own words what you'd like to work on.`;
      }
    } else {
      content = "Welcome! When you're ready, click Start and tell me what you would like to practice today.";
    }
    setTranscriptLines([{ role: 'assistant', content }]);
  }, [conversationId, topic, topicDescription, transcriptLines.length]);

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
  const turnStartRef = useRef(null);

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
      const recorder = mediaRecorderRef.current;

      if (recorder && recorder.state !== 'inactive') {
        // We are stopping a recording that was in progress.
        sentByPauseRef.current = true;
        // Compute how long the mic was on for this turn.
        const startedAt = turnStartRef.current;
        const now = performance.now();
        const spokenDurationSeconds =
          typeof startedAt === 'number' ? Math.max(0.2, (now - startedAt) / 1000) : 0;
        turnStartRef.current = null;
        // Attach this duration to the recorder instance so we can include it when sending.
        recorder._spokenDurationSeconds = spokenDurationSeconds;
        sentByPauseRef.current = true;
        recorder.stop();
      } else {
        try {
          recognitionRef.current?.abort();
        } catch (_) {}
        setListening(false);
        setDisplayTranscript('');
        if (text) {
          sendToBackend(text);
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
      setError(null);
      setDisplayTranscript('');
      accumulatedRef.current = '';
      audioChunksRef.current = [];
      // Start timing this turn from when the mic begins.
      turnStartRef.current = performance.now();
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
          sentByPauseRef.current = false;
          const blob = audioChunksRef.current.length > 0
            ? new Blob(audioChunksRef.current, { type: 'audio/webm' })
            : null;
          const text = accumulatedRef.current.trim();
          const spokenDurationSeconds =
            typeof recorder._spokenDurationSeconds === 'number'
              ? recorder._spokenDurationSeconds
              : 0;
          if (blob && blob.size > 1000) {
            sendToBackend(blob, spokenDurationSeconds);
          } else if (text) {
            sendToBackend(text, spokenDurationSeconds);
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

  // If user navigates away/closes the practice page without pressing "End Session",
  // automatically end the conversation so stats and minutes are updated.
  useEffect(() => {
    return () => {
      if (!conversationId) return;
      if (endedByUserRef.current) return;
      // Only auto-end if the user actually spoke / exchanged at least one turn,
      // to avoid creating 1-second empty conversations with "no speech" reports.
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

  // Intercept browser back button while on the practice page and show the end-session popup instead.
  useEffect(() => {
    if (!conversationId) return;

    const state = { articulateGuard: true };
    window.history.pushState(state, '');

    const onPopState = (event) => {
      if (event.state && event.state.articulateGuard) {
        // Stay on the page and show confirmation instead of navigating back.
        setShowEndConfirm(true);
        window.history.pushState(state, '');
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, [conversationId]);

  return (
    <div className="tw-voice-page">
      <header className="tw-voice-header">
        <div className="tw-voice-header-left">
          <div className="tw-voice-logo">AI</div>
          <h1 className="tw-voice-title">AI Communication Practice</h1>
        </div>
        <div className="tw-voice-header-actions">
          {conversationId && (
            <button
              type="button"
              className="tw-voice-end-btn"
              onClick={requestEndSession}
              disabled={ending}
            >
              {ending ? 'Ending…' : 'End Session'}
            </button>
          )}
        </div>
      </header>

      <div className="tw-voice-body">
        <aside className="tw-voice-sidebar">
          <h2 className="tw-voice-sidebar-title">Session Stats</h2>

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
            <p className="tw-voice-stat-label">Current Topic</p>
            <p className="tw-voice-stat-topic">{topic || 'Practice conversation'}</p>
            <p className="tw-voice-stat-desc">
              {topic ? 'Building meaningful connections' : 'Speak and get real-time feedback'}
            </p>
          </div>

          <div className="tw-voice-stat-card">
            <p className="tw-voice-stat-label">Session Progress</p>
            <div className="tw-voice-stat-row">
              <p className="tw-voice-stat-value" style={{ color: 'var(--accent)' }}>{sessionProgress}% Complete</p>
            </div>
            <div className="tw-voice-stat-bar">
              <div className="tw-voice-stat-bar-fill" style={{ width: `${sessionProgress}%`, background: 'var(--accent)' }} />
            </div>
          </div>
        </aside>

        <main className="tw-voice-main">
          <section className="tw-voice-card">
            <h3 className="tw-voice-card-title">Voice Practice Session</h3>
            <p className="tw-voice-card-sub">Speak naturally and receive real-time feedback</p>
            <div className={`tw-voice-wave-wrap ${listening && status === 'listening' ? 'tw-voice-wave-active' : ''}`}>
              <span /><span /><span /><span /><span /><span /><span />
            </div>
            <div className="tw-voice-controls">
              <button
                type="button"
                className={listening ? 'tw-voice-btn-pause' : 'tw-voice-btn-start'}
                onClick={toggleListening}
                disabled={status === 'sending' || status === 'playing'}
              >
                {listening ? (
                  <>
                    <PauseIcon style={{ width: 18, height: 18 }} />
                    Pause
                  </>
                ) : (
                  <>
                    <PlayIcon style={{ width: 18, height: 18 }} />
                    Start Speaking
                  </>
                )}
              </button>
            </div>
            {listening && status === 'listening' && (
              <div className="tw-voice-status-line">
                <span className="tw-voice-status-dot" aria-hidden />
                Listening…
              </div>
            )}
            {status === 'sending' && <div className="tw-voice-status-line">Getting reply…</div>}
            {status === 'playing' && <div className="tw-voice-status-line">Playing AI reply…</div>}
            {error && <div className="tw-voice-error">{error}</div>}
            {pendingPlayUrl && (
              <div className="tw-voice-play-reply">
                <button type="button" className="tw-btn-primary" onClick={playPendingReply}>
                  {autoplayBlocked ? 'Play reply' : 'Play reply again'}
                </button>
              </div>
            )}
          </section>

          <section className="tw-voice-card">
            <div className="tw-voice-followup-head">
              <h3 className="tw-voice-card-title">AI Follow-up Questions</h3>
              <span className="tw-voice-followup-badge">• Real-time</span>
            </div>
            <p className="tw-voice-current-q-label">Current Question:</p>
            <div className="tw-voice-current-q-box">
              <p className="tw-voice-current-q-text">
                {lastAssistantMessage || (topic ? `Let's practice ${topic}. When you're ready, click Start and tell me what you'd like to work on.` : "When you're ready, click Start and tell me what you would like to practice today.")}
              </p>
            </div>
            <p className="tw-voice-upcoming-title">Upcoming Topics:</p>
            <ul className="tw-voice-upcoming-list">
              {upcomingPlaceholders.map((text, i) => (
                <li key={i}>{text}</li>
              ))}
            </ul>
            <div className="tw-voice-transcript-area" style={{ marginTop: '1rem' }}>
              {transcriptLines.map((line, i) => (
                <div
                  key={i}
                  className={`tw-voice-transcript-line tw-voice-transcript-line-${line.role}`}
                >
                  <strong>{line.role === 'user' ? 'You' : 'AI'}</strong>
                  {line.content}
                </div>
              ))}
              {listening && displayTranscript && (
                <div className="tw-voice-live">
                  {displayTranscript}
                </div>
              )}
              <div ref={transcriptEndRef} />
            </div>
          </section>
        </main>
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
