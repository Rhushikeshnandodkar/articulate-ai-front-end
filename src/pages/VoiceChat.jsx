import '../styles/voice.css';
import { useState, useRef, useCallback, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { usePageNavbar } from '../contexts/PageNavbarContext';
import { voiceChat, endConversation, getProfile, getPlans, getMe, subscribeToPlanWithPayment } from '../services/api';

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
  const topicOpeningQuestion = location.state?.topicOpeningQuestion ?? '';
  const soloMode = location.state?.solo ?? (searchParams.get('solo') === '1');
  const timeLimitSeconds = Number(location.state?.timeLimitSeconds ?? 180) || 180;

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
  const pendingSendRef = useRef(null);
  listeningRef.current = listening;

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [spokenTotalSeconds, setSpokenTotalSeconds] = useState(0);
  const [displaySeconds, setDisplaySeconds] = useState(0);

  const [showUpgradePopup, setShowUpgradePopup] = useState(false);
  const [upgradePlans, setUpgradePlans] = useState([]);
  const [upgradeUser, setUpgradeUser] = useState(null);
  const [upgradeSubmittingId, setUpgradeSubmittingId] = useState(null);
  const [conversationEndedId, setConversationEndedId] = useState(null);
  const isFreePlanRef = useRef(true);
  const upgradePlansRef = useRef([]);

  // Wall-clock elapsed timer for normal AI sessions (kept as before).
  useEffect(() => {
    if (!conversationId) return;
    if (soloMode) return;
    sessionStartRef.current = sessionStartRef.current ?? Date.now();
    const t = setInterval(() => {
      setElapsedSeconds((secs) => secs + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [conversationId, soloMode]);

  useEffect(() => {
    const loadPlanStatus = async () => {
      try {
        const [profileData, plansData, userData] = await Promise.all([
          getProfile().catch(() => null),
          getPlans().catch(() => ({ plans: [] })),
          getMe().catch(() => null),
        ]);
        const allPlans = Array.isArray(plansData?.plans) ? plansData.plans : [];
        setUpgradePlans(allPlans);
        upgradePlansRef.current = allPlans;
        setUpgradeUser(userData);
        const planId =
          profileData?.subscription_plan && typeof profileData.subscription_plan === 'object'
            ? profileData.subscription_plan.id
            : profileData?.subscription_plan || null;
        const plan = allPlans.find((p) => p.id === planId);
        isFreePlanRef.current = !plan || plan.price === 0;
        if (
          conversationId &&
          isFreePlanRef.current &&
          allPlans.length > 0 &&
          (profileData?.minutes_remaining ?? 0) <= 0
        ) {
          setShowUpgradePopup(true);
        }
      } catch (_) {
        isFreePlanRef.current = true;
      }
    };
    loadPlanStatus();
  }, [conversationId]);

  // In solo mode, drive the visible timer from total spoken time + live mic time.
  useEffect(() => {
    if (!soloMode) return;
    // Base display on accumulated spoken time when not listening.
    setDisplaySeconds(spokenTotalSeconds);
    if (!listening) return;
    const startAt = performance.now();
    const base = spokenTotalSeconds;
    const id = setInterval(() => {
      const now = performance.now();
      const live = Math.max(0, (now - startAt) / 1000);
      setDisplaySeconds(base + live);
    }, 500);
    return () => clearInterval(id);
  }, [soloMode, listening, spokenTotalSeconds]);

  const effectiveSeconds = soloMode ? displaySeconds : elapsedSeconds;
  const elapsedDisplay = `${String(Math.floor(effectiveSeconds / 60)).padStart(2, '0')}:${String(
    Math.floor(effectiveSeconds % 60),
  ).padStart(2, '0')}`;
  const sessionProgress = soloMode
    ? Math.min(100, Math.round((spokenTotalSeconds / timeLimitSeconds) * 100))
    : Math.min(100, Math.floor(elapsedSeconds / 60) * 10);
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
    if (!url || soloMode) return;
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
  }, [soloMode]);

  const playPendingReply = useCallback(() => {
    if (!pendingPlayUrl || soloMode) return;
    setError(null);
    setStatus('playing');
    playAudio(pendingPlayUrl, { revokeOnEnd: false });
  }, [pendingPlayUrl, playAudio, soloMode]);

  const sendToBackend = useCallback(async (audioBlobOrText, spokenDurationSeconds = 0) => {
    const isAudio = audioBlobOrText instanceof Blob;
    setStatus('sending');
    setError(null);
    const promise = (async () => {
      try {
        const { blob, text: aiText } = isAudio
          ? await voiceChat({ audioBlob: audioBlobOrText, conversationId, spokenDurationSeconds, solo: soloMode })
          : await voiceChat({ text: audioBlobOrText, conversationId, spokenDurationSeconds, solo: soloMode });
        let url = null;
        if (!soloMode && blob) {
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
          ...(!soloMode ? [{ role: 'assistant', content: aiText || '(reply)' }] : []),
        ]);

        if (soloMode && spokenDurationSeconds > 0) {
          setSpokenTotalSeconds((prev) => {
            const next = prev + spokenDurationSeconds;
            if (conversationId && next >= timeLimitSeconds) {
              endConversation(conversationId)
                .then(() => {
                  if (isFreePlanRef.current && upgradePlansRef.current.length > 0) {
                    setConversationEndedId(conversationId);
                    setShowUpgradePopup(true);
                  } else {
                    navigate(`/conversations/${conversationId}`, { replace: true });
                  }
                })
                .catch(() => {});
            }
            return next;
          });
        }

        hasSpokenRef.current = true;
        setStatus('idle');
        if (url) {
          playAudio(url);
        }
      } catch (err) {
        const errMsg = err?.error || err?.message || String(err);
        setError(errMsg);
        setStatus('error');
        if (
          typeof errMsg === 'string' &&
          (errMsg.includes('practice minutes') || errMsg.includes('monthly limit')) &&
          upgradePlansRef.current.length > 0
        ) {
          setShowUpgradePopup(true);
        }
      } finally {
        pendingSendRef.current = null;
      }
    })();
    pendingSendRef.current = promise;
    return promise;
  }, [playAudio, conversationId, soloMode, navigate, timeLimitSeconds]);

  useEffect(() => {
    if (!conversationId) return;
    if (transcriptLines.length > 0) return;
    if (soloMode) {
      const content = topicDescription
        ? topicDescription
        : topic
          ? `Speak for a few minutes about: ${topic}. Focus on fluency and clarity.`
          : 'Speak for a few minutes on any topic. Focus on fluency and clarity.';
      setTranscriptLines([{ role: 'assistant', content }]);
      return;
    }
    let content;
    if (topic) {
      if (topicDescription || topicOpeningQuestion) {
        const introLine = topicDescription
          ? topicDescription
          : `Today's topic: ${topic}.`;
        const openingQ = topicOpeningQuestion || `In your own words, what do you think about ${topic} in today’s world?`;
        content = `${introLine}
        
First question:
${openingQ}
        
When you're ready, click Start and answer in your own words.`;
      } else {
        content = `Welcome! Let's practice ${topic}. When you're ready, click Start and tell me in your own words what you'd like to work on.`;
      }
    } else {
      content = "Welcome! When you're ready, click Start and tell me what you would like to practice today.";
    }
    setTranscriptLines([{ role: 'assistant', content }]);
  }, [conversationId, soloMode, topic, topicDescription, topicOpeningQuestion, transcriptLines.length]);

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

    // If the mic is still on, stop recording so the last speech gets processed.
    if (listeningRef.current) {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        const startedAt = turnStartRef.current;
        const now = performance.now();
        const spokenDuration =
          typeof startedAt === 'number' ? Math.max(0.2, (now - startedAt) / 1000) : 0;
        turnStartRef.current = null;
        recorder._spokenDurationSeconds = spokenDuration;
        sentByPauseRef.current = true;
        recorder.stop();
      }
      try { recognitionRef.current?.abort(); } catch (_) {}
      setListening(false);
      setDisplayTranscript('');
    }

    // Wait for any in-flight sendToBackend to finish before ending the conversation.
    if (pendingSendRef.current) {
      try { await pendingSendRef.current; } catch (_) {}
    }

    // Small extra wait to let recorder.onstop fire and trigger a new send if needed.
    await new Promise((r) => setTimeout(r, 300));
    if (pendingSendRef.current) {
      try { await pendingSendRef.current; } catch (_) {}
    }

    try {
      await endConversation(conversationId);
      if (isFreePlanRef.current && upgradePlansRef.current.length > 0) {
        setConversationEndedId(conversationId);
        setShowUpgradePopup(true);
        setEnding(false);
      } else {
        navigate(`/conversations/${conversationId}`, { replace: true });
      }
    } catch (err) {
      setError(err?.error || err?.message || 'Failed to end conversation.');
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

  const requestEndSession = useCallback(() => {
    if (!conversationId) {
      navigate('/dashboard', { replace: true });
      return;
    }
    setShowEndConfirm(true);
  }, [conversationId, navigate]);

  const { setPageNavbar } = usePageNavbar();
  const isProcessing = status === 'sending';
  useEffect(() => {
    const title = soloMode ? 'Solo Speaking Practice' : 'AI Communication Practice';
    const endBtn = conversationId ? (
      <button
        type="button"
        className="tw-voice-end-btn"
        onClick={requestEndSession}
        disabled={ending}
      >
        {ending ? 'Processing & ending…' : 'End Session'}
      </button>
    ) : null;
    setPageNavbar({ title, rightActions: endBtn });
    return () => setPageNavbar({});
  }, [soloMode, conversationId, ending, requestEndSession, setPageNavbar]);

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

          <div className="tw-voice-stat-card tw-voice-stat-card--topic">
            <p className="tw-voice-stat-label">Current Topic</p>
            <p className="tw-voice-stat-topic">{topic || 'Practice conversation'}</p>
            <p className="tw-voice-stat-desc">
              {topicDescription ||
                (topic
                  ? 'Speak for the full time about this topic.'
                  : soloMode
                    ? 'Speak for a few minutes without interruptions.'
                    : 'Speak and get real-time feedback')}
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
            <h3 className="tw-voice-card-title">
              {soloMode ? 'Solo speaking timer' : 'Voice Practice Session'}
            </h3>
            <p className="tw-voice-card-sub">
              {soloMode
                ? 'Speak continuously until the timer ends. There is no AI audio in this mode.'
                : 'Speak naturally and receive real-time feedback'}
            </p>
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
            {status === 'sending' && !soloMode && <div className="tw-voice-status-line">Getting reply…</div>}
            {status === 'playing' && !soloMode && <div className="tw-voice-status-line">Playing AI reply…</div>}
            {error && <div className="tw-voice-error">{error}</div>}
            {pendingPlayUrl && !soloMode && (
              <div className="tw-voice-play-reply">
                <button type="button" className="tw-btn-primary" onClick={playPendingReply}>
                  {autoplayBlocked ? 'Play reply' : 'Play reply again'}
                </button>
              </div>
            )}
          </section>

          <section className="tw-voice-card tw-voice-card--scrollable">
            {soloMode ? (
              <>
                <h3 className="tw-voice-card-title">Topic & notes</h3>
                <div className="tw-voice-current-q-box">
                  <p className="tw-voice-current-q-text">
                    {topicDescription ||
                      (topic
                        ? `Speak freely about: ${topic}. Focus on structure, clarity, and confidence.`
                        : 'Speak freely on any topic.')}
                  </p>
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
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
              {ending
                ? 'Saving your speech and generating report…'
                : 'If you end now, we\'ll save your progress and generate a report for this practice session.'}
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
                {ending ? 'Processing & ending…' : 'End session'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showUpgradePopup && (
        <div
          className="tw-voice-leave-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            setShowUpgradePopup(false);
            if (conversationEndedId) {
              navigate(`/conversations/${conversationEndedId}`, { replace: true });
            } else {
              navigate('/dashboard', { replace: true });
            }
          }}
        >
          <div className="tw-voice-upgrade-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tw-voice-upgrade-header">
              <h2 className="tw-voice-upgrade-title">Great session! Ready to level up?</h2>
              <button
                type="button"
                className="tw-voice-upgrade-close"
                onClick={() => {
                  setShowUpgradePopup(false);
                  if (conversationEndedId) {
                    navigate(`/conversations/${conversationEndedId}`, { replace: true });
                  } else {
                    navigate('/dashboard', { replace: true });
                  }
                }}
              >
                ✕
              </button>
            </div>
            <p className="tw-voice-upgrade-desc">
              You're on the Free plan with limited practice minutes. Upgrade to get more practice time, AI-powered feedback, and premium features.
            </p>
            <div className="tw-voice-upgrade-plans">
              {upgradePlans.filter((p) => p.price > 0).map((plan) => (
                <div key={plan.id} className="tw-voice-upgrade-plan-card">
                  <h3 className="tw-voice-upgrade-plan-name">{plan.name}</h3>
                  <p className="tw-voice-upgrade-plan-price">
                    ₹{plan.price.toFixed(2)} <span>/ {plan.duration} days</span>
                  </p>
                  {plan.description && (
                    <div
                      className="tw-voice-upgrade-plan-desc"
                      dangerouslySetInnerHTML={{ __html: plan.description }}
                    />
                  )}
                  <button
                    type="button"
                    className="tw-btn-primary tw-voice-upgrade-plan-btn"
                    disabled={upgradeSubmittingId === plan.id}
                    onClick={() => {
                      setUpgradeSubmittingId(plan.id);
                      subscribeToPlanWithPayment(
                        plan.id,
                        plan,
                        upgradeUser,
                        () => {
                          setUpgradeSubmittingId(null);
                          setShowUpgradePopup(false);
                          if (conversationEndedId) {
                            navigate(`/conversations/${conversationEndedId}`, { replace: true });
                          } else {
                            navigate('/dashboard', { replace: true });
                          }
                        },
                        (err) => {
                          setUpgradeSubmittingId(null);
                          if (err?.error === 'Payment cancelled') return;
                        },
                      );
                    }}
                  >
                    {upgradeSubmittingId === plan.id ? 'Processing…' : `Get ${plan.name}`}
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="tw-voice-upgrade-skip"
              onClick={() => {
                setShowUpgradePopup(false);
                if (conversationEndedId) {
                  navigate(`/conversations/${conversationEndedId}`, { replace: true });
                } else {
                  navigate('/dashboard', { replace: true });
                }
              }}
            >
              Skip for now — View session report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
