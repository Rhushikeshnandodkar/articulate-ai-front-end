import '../styles/voice.css';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { talkingAgentVoiceChat, startTalkingAgent, endConversation, getConversation } from '../services/api';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

/** Session progress bar: 1 min speaking = 10%, 10 min = 100% (mic-on time only). */
const SESSION_PROGRESS_FULL_SECONDS = 10 * 60;

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

function SparkIcon({ className }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2l1.2 4.2L17 8l-3.8 1.8L12 14l-1.2-4.2L7 8l3.8-1.8L12 2z" />
      <path d="M5 13l.8 2.8L8 17l-2.2 1.2L5 21l-.8-2.8L2 17l2.2-1.2L5 13z" />
      <path d="M19 13l.8 2.8L22 17l-2.2 1.2L19 21l-.8-2.8L16 17l2.2-1.2L19 13z" />
    </svg>
  );
}

export default function TalkingAgent() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);

  const [conversationId, setConversationId] = useState(() => (
    location.state?.conversationId ??
    (searchParams.get('conversation') ? Number(searchParams.get('conversation')) : null)
  ));
  const [topic, setTopic] = useState(() => location.state?.topic ?? '');
  const [openingReady, setOpeningReady] = useState(false);

  const [listening, setListening] = useState(false);
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

  /** Total seconds with mic on this session (only while Start Speaking → Pause). */
  const [accumulatedPracticeSeconds, setAccumulatedPracticeSeconds] = useState(0);
  /** Current mic segment length (updates while listening for a smooth clock). */
  const [segmentElapsedLive, setSegmentElapsedLive] = useState(0);

  useEffect(() => {
    if (!listening) {
      setSegmentElapsedLive(0);
      return undefined;
    }
    const tick = () => {
      if (speakingStartRef.current) {
        setSegmentElapsedLive((Date.now() - speakingStartRef.current) / 1000);
      }
    };
    tick();
    const id = window.setInterval(tick, 500);
    return () => {
      window.clearInterval(id);
      setSegmentElapsedLive(0);
    };
  }, [listening]);

  /* If mic stops due to error (not normal Pause), still count practice time. */
  useEffect(() => {
    if (listening || !speakingStartRef.current) return;
    const d = (Date.now() - speakingStartRef.current) / 1000;
    if (d > 0) setAccumulatedPracticeSeconds((prev) => prev + d);
    speakingStartRef.current = null;
  }, [listening]);

  listeningRef.current = listening;

  const displayPracticeSeconds = Math.floor(
    accumulatedPracticeSeconds + (listening ? segmentElapsedLive : 0),
  );
  const practiceDisplay = `${String(Math.floor(displayPracticeSeconds / 60)).padStart(2, '0')}:${String(displayPracticeSeconds % 60).padStart(2, '0')}`;

  const sessionProgress = Math.min(
    100,
    Math.round((displayPracticeSeconds / SESSION_PROGRESS_FULL_SECONDS) * 100),
  );

  const lastAssistantMessage = transcriptLines.filter((l) => l.role === 'assistant').slice(-1)[0]?.content ?? '';

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
        ? await talkingAgentVoiceChat({ audioBlob: audioBlobOrText, conversationId, spokenDurationSeconds })
        : await talkingAgentVoiceChat({ text: audioBlobOrText, conversationId, spokenDurationSeconds });
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
      if (url) playAudio(url);
    } catch (err) {
      setError(err?.error || err?.message || String(err));
      setStatus('error');
    }
  }, [playAudio, conversationId]);

  // Bootstrap: if no conversation_id, create a new talking agent session; then load messages.
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setOpeningReady(false);
      setError(null);
      try {
        let cid = conversationId;
        if (!cid) {
          setStatus('sending');
          const started = await startTalkingAgent();
          if (cancelled) return;
          cid = Number(started?.conversation_id);
          if (!cid) throw new Error('Failed to start talking agent.');
          setConversationId(cid);
          setTopic(started?.topic || '');
          // Also reflect in URL for refresh persistence
          navigate(`/talking-agent?conversation=${cid}`, { replace: true, state: { conversationId: cid, topic: started?.topic || '' } });
        }

        const conv = await getConversation(cid);
        if (cancelled) return;
        if (conv.topic) setTopic(conv.topic);

        const msgs = [...(conv.messages || [])].sort(
          (a, b) => (a.sequence ?? 0) - (b.sequence ?? 0),
        );
        if (msgs.length > 0) {
          setTranscriptLines(msgs.map((m) => ({ role: m.role, content: m.content })));
        } else {
          setTranscriptLines([
            { role: 'assistant', content: 'What do you want to talk about today? If you’re not sure, can we start with your favorite book?' },
          ]);
        }
        setOpeningReady(true);
        setStatus('idle');
      } catch (e) {
        if (cancelled) return;
        const msg = e?.error || e?.message || String(e);
        setError(msg);
        setTranscriptLines([
          { role: 'assistant', content: 'What do you want to talk about today? If you’re not sure, can we start with your favorite book?' },
        ]);
        setOpeningReady(true);
        setStatus('idle');
      }
    }

    bootstrap();
    return () => { cancelled = true; };
  }, [conversationId, navigate]);

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
      if (finalText) accumulatedRef.current = (accumulatedRef.current + ' ' + finalText).trim();
      // Reuse VoiceChat's approach: show live transcript in the UI only when listening (we keep it minimal here)
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
        try { recognition.start(); } catch (_) {}
      }
    };

    recognitionRef.current = recognition;
    if (listening) {
      try {
        recognition.start();
      } catch (e) {
        const msg = e?.message || 'Failed to start microphone';
        const isPermission = /not allowed|denied|permission|secure context/i.test(msg);
        setError(isPermission ? 'Microphone blocked. Use Chrome, allow the mic when prompted.' : msg);
        setListening(false);
      }
    }
    return () => {
      try { recognition.abort(); } catch (_) {}
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
      if (Number.isFinite(duration) && duration > 0) setAccumulatedPracticeSeconds((prev) => prev + duration);
      speakingStartRef.current = null;

      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        sentByPauseRef.current = true;
        sentByPauseRef.duration = duration;
        recorder.stop();
      } else {
        try { recognitionRef.current?.abort(); } catch (_) {}
        setListening(false);
        if (text) {
          sendToBackend(text, duration);
        } else {
          setError('No speech detected. Say something, then click Pause.');
          setStatus('idle');
        }
        return;
      }

      try { recognitionRef.current?.abort(); } catch (_) {}
      setListening(false);
    } else {
      sentByPauseRef.current = false;
      sentByPauseRef.duration = 0;
      speakingStartRef.current = Date.now();
      setError(null);
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
        try { recorder.stop(); } catch (_) {}
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
      // Do not auto-end sessions. Only end when user explicitly clicks "End Session".
    };
  }, [conversationId]);

  const requestEndSession = () => {
    if (!conversationId) {
      navigate('/dashboard', { replace: true });
      return;
    }
    setShowEndConfirm(true);
  };

  const isAiSpeaking = status === 'playing';
  const isProcessing = status === 'sending';
  const isUserSpeaking = listening && status === 'listening';
  const isBootstrapping = !openingReady;

  return (
    <div className="tw-voice-page">
      <div className="tw-voice-body">
        <main className="tw-voice-main">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/70 shadow-sm ring-1 ring-black/5">
                <SparkIcon className="text-slate-800" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">Random Talking Agent</p>
              </div>
            </div>
            {autoplayBlocked && pendingPlayUrl && (
              <button
                type="button"
                onClick={playPendingReply}
                className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
              >
                Tap to play reply
              </button>
            )}
          </div>

          <section className="tw-voice-card tw-voice-card--unified">
            <div className={`tw-voice-ai-display ${isAiSpeaking ? 'tw-voice-ai-display--speaking' : ''} ${isBootstrapping ? 'tw-voice-ai-display--loading' : ''}`}>
              <div className="tw-voice-ai-display-label">
                <span className={`tw-voice-ai-dot ${isAiSpeaking ? 'tw-voice-ai-dot--active' : ''} ${isBootstrapping ? 'tw-voice-ai-dot--loading' : ''}`} />
                {isBootstrapping ? 'Loading' : isAiSpeaking ? 'AI is speaking…' : isProcessing ? 'AI is thinking…' : 'AI Partner'}
              </div>
              <p key={isBootstrapping ? 'bootstrap' : lastAssistantMessage} className="tw-voice-ai-display-text tw-voice-message-zoom">
                {isBootstrapping ? (
                  <>
                    <span className="tw-voice-loading-lead">Starting your talking agent…</span>
                    <span className="tw-voice-loading-detail">We’ll pick a topic based on your interests and begin with a short prompt.</span>
                  </>
                ) : isProcessing ? (
                  'Processing your response…'
                ) : (
                  lastAssistantMessage || 'What do you want to talk about today?'
                )}
              </p>
            </div>

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

            <div className="tw-voice-user-display">
              {isUserSpeaking ? (
                <p className="tw-voice-user-display-placeholder tw-voice-user-display--listening">
                  <span className="tw-voice-listening-icon" aria-hidden>🎧</span>
                  I&apos;m listening to you — speak naturally.
                </p>
              ) : (
                <p className="tw-voice-user-display-placeholder tw-voice-user-display--start-cta">
                  {isBootstrapping
                    ? <>Loading in progress. When the prompt appears, tap <strong>Start Speaking</strong>.</>
                    : <>Click <strong>Start Speaking</strong> when you&apos;re ready.</>}
                </p>
              )}
            </div>

            <div className="tw-voice-controls">
              <button
                type="button"
                className={listening ? 'tw-voice-btn-pause' : 'tw-voice-btn-start'}
                onClick={toggleListening}
                disabled={status === 'sending' || status === 'playing' || !openingReady}
              >
                {listening ? (<><PauseIcon style={{ width: 18, height: 18 }} /> Pause</>) : (<><PlayIcon style={{ width: 18, height: 18 }} /> Start Speaking</>)}
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

            {isProcessing && !isBootstrapping && <div className="tw-voice-status-line">Getting reply…</div>}
            {isAiSpeaking && <div className="tw-voice-status-line tw-voice-status-line--ai">Playing AI reply…</div>}
            {error && <div className="tw-voice-error">{error}</div>}
          </section>
        </main>
      </div>

      {showEndConfirm && (
        <div className="tw-voice-leave-overlay" role="dialog" aria-modal="true">
          <div className="tw-voice-leave-modal">
            <h2 className="tw-voice-leave-title">End session?</h2>
            <p className="tw-voice-leave-text">If you end now, we&apos;ll save your progress and generate a report for this practice session.</p>
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

