import '../styles/voice.css';
import '../styles/pages.css';
import { useState, useRef, useCallback, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { voiceChat, endConversation, getConversation } from '../services/api';
import { PlayIcon, PauseIcon, MicIcon, ChatIcon, ClockIcon, StopIcon } from '../components/icons';

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

/** Session progress bar: 1 min speaking = 10%, 10 min = 100% (mic-on time only). */
const SESSION_PROGRESS_FULL_SECONDS = 10 * 60;

/** After this much mic silence the response is sent automatically (AI starts talking). */
const SILENCE_AUTO_SEND_MS = 4000;
/** RMS above this counts as speech for silence detection (AnalyserNode). */
const SPEECH_RMS_THRESHOLD = 0.02;
/** After the AI finishes speaking, auto-start the mic so the user can reply hands-free. */
const AUTO_LISTEN_AFTER_AI_MS = 2000;

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
  /* Freeze pause: mic + timers + recording are frozen (not sent) so the user can think. */
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;
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
  const lastUserMessage = transcriptLines.filter((l) => l.role === 'user').slice(-1)[0]?.content ?? '';

  const statusRef = useRef(status);
  statusRef.current = status;
  /** Assigned later; starts the mic ~2s after the AI finishes speaking. */
  const scheduleAutoListenRef = useRef(() => {});
  const autoListenTimerRef = useRef(null);

  const playAudio = useCallback((url, options = {}) => {
    if (!url) return;
    const { revokeOnEnd = false, autoListen = true } = options;
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
    audio.onended = () => {
      cleanup();
      if (autoListen) scheduleAutoListenRef.current();
    };
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
      if ((finalText && finalText.trim()) || (interim && interim.trim())) {
        heardSpeechRef.current = true;
        lastSpeechAtRef.current = Date.now();
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
      if (listeningRef.current && !pausedRef.current) {
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
  const lastSpeechAtRef = useRef(0);
  const heardSpeechRef = useRef(false);

  const getSpokenDuration = () => {
    if (!speakingStartRef.current) return 0;
    return (Date.now() - speakingStartRef.current) / 1000;
  };

  /** Stop the mic and send whatever was said. Used by the Pause button and the silence auto-send. */
  const stopListeningAndSend = () => {
    const text = accumulatedRef.current.trim();
    const duration = getSpokenDuration();
    if (Number.isFinite(duration) && duration > 0) {
      setAccumulatedPracticeSeconds((prev) => prev + duration);
    }
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
        setError('No speech detected. Speak for a moment, then pause — or wait 4 seconds of silence.');
        setStatus('idle');
      }
      return;
    }

    try {
      recognitionRef.current?.abort();
    } catch (_) {}
    setListening(false);
    setDisplayTranscript('');
  };
  const stopListeningAndSendRef = useRef(stopListeningAndSend);
  stopListeningAndSendRef.current = stopListeningAndSend;

  const startListening = () => {
    if (!SpeechRecognition || !window.isSecureContext) return;
    if (listeningRef.current) return;
    if (autoListenTimerRef.current) {
      clearTimeout(autoListenTimerRef.current);
      autoListenTimerRef.current = null;
    }
    sentByPauseRef.current = false;
    sentByPauseRef.duration = 0;
    heardSpeechRef.current = false;
    lastSpeechAtRef.current = Date.now();
    speakingStartRef.current = Date.now();
    setError(null);
    pausedRef.current = false;
    setPaused(false);
    setDisplayTranscript('');
    accumulatedRef.current = '';
    audioChunksRef.current = [];
    setStatus('listening');
    setListening(true);
  };

  /* Freeze pause: stop capturing without sending, so the user can think mid-answer. */
  const pauseListening = () => {
    if (!listeningRef.current || pausedRef.current) return;
    const d = getSpokenDuration();
    if (Number.isFinite(d) && d > 0) setAccumulatedPracticeSeconds((prev) => prev + d);
    speakingStartRef.current = null;
    setSegmentElapsedLive(0);
    pausedRef.current = true;
    setPaused(true);
    setStatus('paused');
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.pause();
      }
    } catch (_) {}
    try {
      recognitionRef.current?.stop();
    } catch (_) {}
  };

  /* Resume from a freeze pause: continue the same answer where the user left off. */
  const resumeListening = () => {
    if (!listeningRef.current || !pausedRef.current) return;
    pausedRef.current = false;
    setPaused(false);
    setStatus('listening');
    speakingStartRef.current = Date.now();
    lastSpeechAtRef.current = Date.now();
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
        mediaRecorderRef.current.resume();
      }
    } catch (_) {}
    try {
      recognitionRef.current?.start();
    } catch (_) {}
  };

  /* Auto-start the mic a short moment after the AI stops speaking (hands-free turn-taking). */
  const scheduleAutoListen = () => {
    if (autoListenTimerRef.current) clearTimeout(autoListenTimerRef.current);
    autoListenTimerRef.current = setTimeout(() => {
      autoListenTimerRef.current = null;
      if (listeningRef.current) return;
      if (endedByUserRef.current) return;
      if (statusRef.current === 'sending' || statusRef.current === 'playing') return;
      if (!SpeechRecognition || !window.isSecureContext) return;
      startListening();
    }, AUTO_LISTEN_AFTER_AI_MS);
  };
  scheduleAutoListenRef.current = scheduleAutoListen;

  useEffect(() => () => {
    if (autoListenTimerRef.current) clearTimeout(autoListenTimerRef.current);
  }, []);

  const toggleListening = () => {
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported. Use Chrome.');
      return;
    }
    if (!window.isSecureContext) {
      setError('Microphone requires https or localhost.');
      return;
    }
    if (!listening) {
      startListening();
    } else if (paused) {
      resumeListening();
    } else {
      pauseListening();
    }
  };

  useEffect(() => {
    if (!listening) return;
    let recorder;
    let audioContext;
    let silenceCheckId;
    let cancelled = false;
    let speechFrames = 0;

    const startRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        /* Mic-level silence detection: after speech + 4s quiet → auto-pause & AI replies. */
        try {
          const Ctx = window.AudioContext || window.webkitAudioContext;
          audioContext = new Ctx();
          if (audioContext.state === 'suspended') {
            try { await audioContext.resume(); } catch (_) {}
          }
          const source = audioContext.createMediaStreamSource(stream);
          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 2048;
          source.connect(analyser);
          const samples = new Uint8Array(analyser.fftSize);
          silenceCheckId = window.setInterval(() => {
            if (!listeningRef.current || pausedRef.current) return;
            analyser.getByteTimeDomainData(samples);
            let sum = 0;
            for (let i = 0; i < samples.length; i++) {
              const v = (samples[i] - 128) / 128;
              sum += v * v;
            }
            const rms = Math.sqrt(sum / samples.length);
            if (rms >= SPEECH_RMS_THRESHOLD) {
              speechFrames += 1;
              if (speechFrames >= 2) {
                heardSpeechRef.current = true;
                lastSpeechAtRef.current = Date.now();
              }
            } else {
              speechFrames = 0;
              if (
                heardSpeechRef.current &&
                Date.now() - lastSpeechAtRef.current >= SILENCE_AUTO_SEND_MS
              ) {
                heardSpeechRef.current = false;
                stopListeningAndSendRef.current();
              }
            }
          }, 100);
        } catch (_) {
          /* Fall back to SpeechRecognition-based lastSpeechAt updates only. */
          silenceCheckId = window.setInterval(() => {
            if (!listeningRef.current || pausedRef.current || !heardSpeechRef.current) return;
            if (Date.now() - lastSpeechAtRef.current >= SILENCE_AUTO_SEND_MS) {
              heardSpeechRef.current = false;
              stopListeningAndSendRef.current();
            }
          }, 250);
        }

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
            setError('No speech detected. Speak for a moment, then pause — or wait 4 seconds of silence.');
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
      cancelled = true;
      if (silenceCheckId) window.clearInterval(silenceCheckId);
      if (audioContext) {
        try {
          audioContext.close();
        } catch (_) {}
      }
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
  const isUserSpeaking = listening && !paused && status === 'listening';
  const isPaused = listening && paused;
  const isBootstrapping = Boolean(conversationId) && !openingReady;

  const transcriptRef = useRef(null);
  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [transcriptLines]);

  const stageState = isPaused
    ? 'paused'
    : isUserSpeaking
      ? 'listening'
      : isAiSpeaking
        ? 'speaking'
        : (isProcessing || isBootstrapping)
          ? 'thinking'
          : 'ready';
  const statusLabel = {
    paused: 'Paused',
    listening: 'Listening',
    speaking: 'Coach is speaking',
    thinking: isBootstrapping ? 'Preparing' : 'Thinking',
    ready: 'Your turn',
  }[stageState];
  const turns = transcriptLines.filter((l) => l.role === 'user').length;

  const hint = isPaused
    ? 'Paused. Take a moment to think, then tap Continue to pick up where you left off.'
    : isUserSpeaking
      ? 'Speak naturally. After 4 seconds of silence the coach replies. Need time to think? Tap Pause.'
      : isAiSpeaking
        ? 'Listen to the question. Your mic turns on automatically when the coach finishes.'
        : isProcessing
          ? 'Getting a reply…'
          : isBootstrapping
            ? 'Preparing your opening question and voice. This usually takes a few seconds.'
            : 'Tap Start speaking when you are ready. The mic also starts on its own after the coach asks.';

  return (
    <div className="agent-layout">
      <section className="ui-card agent-stage">
        <div className="agent-stage-head">
          <span className={`agent-status is-${stageState}`}>{statusLabel}</span>
          {topic && <span className="agent-topic">Topic: <strong>{topic}</strong></span>}
          <span className="agent-timer-chip" title="Speaking time"><ClockIcon /> {practiceDisplay}</span>
          {autoplayBlocked && pendingPlayUrl && (
            <button type="button" onClick={playPendingReply} className="ui-btn ui-btn-primary ui-btn-sm">
              <PlayIcon /> Play reply
            </button>
          )}
        </div>

        <div className="agent-stage-body">
          <div>
            <div className="agent-prompt-label">{isBootstrapping ? 'Getting ready' : 'Your coach'}</div>
            <p
              key={isBootstrapping ? 'bootstrap' : isProcessing ? 'processing' : lastAssistantMessage}
              className={`agent-prompt ${isBootstrapping || isProcessing ? 'is-muted' : ''}`}
            >
              {isBootstrapping
                ? 'Creating your opening question…'
                : isProcessing
                  ? 'Thinking about what you said…'
                  : (lastAssistantMessage
                    || (topic ? `Let's practice "${topic}". Tap Start speaking when you're ready.` : "Tap Start speaking when you're ready."))}
            </p>
          </div>

          <div className={`agent-visual is-${stageState}`} aria-hidden>
            <span className="agent-visual-ring" />
            <span className="agent-visual-ring" />
            <span className="agent-visual-ring" />
            <span className="agent-visual-core">{isAiSpeaking ? <ChatIcon /> : <MicIcon />}</span>
          </div>

          <p className="agent-hint">{hint}</p>
          {error && <div className="ui-alert ui-alert-error">{error}</div>}
        </div>

        <div className="agent-controls">
          <button
            type="button"
            className={`ui-btn ${isUserSpeaking ? 'ui-btn-secondary' : 'ui-btn-primary'}`}
            onClick={toggleListening}
            disabled={status === 'sending' || status === 'playing' || !openingReady}
          >
            {!listening
              ? (<><MicIcon /> Start speaking</>)
              : paused
                ? (<><PlayIcon /> Continue</>)
                : (<><PauseIcon /> Pause</>)}
          </button>
          {conversationId && (
            <button type="button" className="ui-btn ui-btn-danger" onClick={requestEndSession} disabled={ending}>
              <StopIcon /> {ending ? 'Ending…' : 'End and see report'}
            </button>
          )}
        </div>
      </section>

      <aside className="agent-side">
        <section className="ui-card agent-time-card">
          <div className="ui-card-head">
            <h3 className="ui-card-title">Speaking time</h3>
            <span className="ui-card-sub">{turns} {turns === 1 ? 'answer' : 'answers'}</span>
          </div>
          <div className="agent-timer">{practiceDisplay}</div>
          <div className="ui-progress" style={{ margin: '12px 0 8px' }}>
            <span style={{ width: `${sessionProgress}%` }} />
          </div>
          <p className="ui-card-sub">
            {sessionProgress >= 100 ? 'You reached the 10-minute goal. Great session.' : `${sessionProgress}% of a 10-minute session. Counts only while your mic is on.`}
          </p>
        </section>

        <section className="ui-card">
          <div className="ui-card-head">
            <h3 className="ui-card-title">Conversation</h3>
            <span className="ui-card-sub">{transcriptLines.length} messages</span>
          </div>
          <div className="agent-transcript" ref={transcriptRef}>
            {transcriptLines.length === 0 && <p className="ui-card-sub">Messages will appear here.</p>}
            {transcriptLines.map((line, i) => (
              <div key={i} className={`agent-msg ${line.role === 'user' ? 'agent-msg-user' : 'agent-msg-ai'}`}>
                <span className="agent-msg-who">{line.role === 'user' ? 'You' : 'Coach'}</span>
                {line.content === '(your speech)' ? <em>Spoken reply</em> : line.content}
              </div>
            ))}
          </div>
        </section>
      </aside>

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
