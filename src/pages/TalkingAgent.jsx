import '../styles/voice.css';
import '../styles/pages.css';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { talkingAgentVoiceChat, startTalkingAgent, endConversation, getConversation } from '../services/api';
import { PlayIcon, MicIcon, ChatIcon, ClockIcon, StopIcon } from '../components/icons';

/* We only record audio; the server transcribes it (Whisper). The browser speech recognizer is not
   used: on Android it stops after every short pause, and restarting it plays the system beep. */
const MIC_SUPPORTED = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof window !== 'undefined' && !!window.MediaRecorder;

/** Session progress bar: 1 min speaking = 10%, 10 min = 100% (mic-on time only). */
const SESSION_PROGRESS_FULL_SECONDS = 10 * 60;

/** After this much mic silence the response is sent automatically (AI starts talking). */
const SILENCE_AUTO_SEND_MS = 4000;
/** RMS above this counts as speech for silence detection (AnalyserNode). */
const SPEECH_RMS_THRESHOLD = 0.015;
/** Upper bound for the calibrated threshold, so a noisy room never hides normal speech. */
const MAX_SPEECH_RMS = 0.05;
/** After the AI finishes speaking, auto-start the mic so the user can reply hands-free. */
const AUTO_LISTEN_AFTER_AI_MS = 2000;


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
  /* Don't create a session on mount. Only after the user clicks Start (unless resuming an existing one). */
  const [sessionStarted, setSessionStarted] = useState(() => Boolean(
    location.state?.conversationId ??
    (searchParams.get('conversation') ? Number(searchParams.get('conversation')) : null),
  ));

  const [listening, setListening] = useState(false);
  /* Freeze pause: mic + timers + recording are frozen (not sent) so the user can think. */
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;
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

  // Bootstrap: only after the user starts the session. Create the session (if new), then load messages.
  useEffect(() => {
    if (!sessionStarted) return undefined;
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
          (a, b) => (a?.sequence ?? 0) - (b?.sequence ?? 0),
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
  }, [sessionStarted, conversationId, navigate]);


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
        setError("We didn't catch anything. Tap Start speaking and try again.");
        setStatus('idle');
      }
      return;
    }

    try { recognitionRef.current?.abort(); } catch (_) {}
    setListening(false);
  };
  const stopListeningAndSendRef = useRef(stopListeningAndSend);
  stopListeningAndSendRef.current = stopListeningAndSend;

  const startListening = () => {
    if (!MIC_SUPPORTED || !window.isSecureContext) return;
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
    accumulatedRef.current = '';
    audioChunksRef.current = [];
    setStatus('listening');
    setListening(true);
  };



  /* Auto-start the mic a short moment after the AI stops speaking (hands-free turn-taking). */
  const scheduleAutoListen = () => {
    if (autoListenTimerRef.current) clearTimeout(autoListenTimerRef.current);
    autoListenTimerRef.current = setTimeout(() => {
      autoListenTimerRef.current = null;
      if (listeningRef.current) return;
      if (endedByUserRef.current) return;
      if (statusRef.current === 'sending' || statusRef.current === 'playing') return;
      if (!MIC_SUPPORTED || !window.isSecureContext) return;
      startListening();
    }, AUTO_LISTEN_AFTER_AI_MS);
  };
  scheduleAutoListenRef.current = scheduleAutoListen;

  useEffect(() => () => {
    if (autoListenTimerRef.current) clearTimeout(autoListenTimerRef.current);
  }, []);

  /* One button: start the mic, or (while talking) finish the answer and send it right away. */
  const toggleListening = () => {
    if (!MIC_SUPPORTED) {
      setError('This browser cannot record audio. Use an up-to-date Chrome, Edge or Safari.');
      return;
    }
    if (!window.isSecureContext) {
      setError('Microphone requires https or localhost.');
      return;
    }
    if (!listening) {
      startListening();
    } else {
      stopListeningAndSend();
    }
  };

  useEffect(() => {
    if (!listening) return;
    let recorder;
    let audioContext;
    let silenceCheckId;
    let cancelled = false;
    let speechFrames = 0;
    const calibration = [];
    let threshold = SPEECH_RMS_THRESHOLD;

    const startRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
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
            /* Calibrate on the first ~0.5 s after the mic opens (room noise), then keep the
               threshold fixed for this answer. Capped so quiet voices still count as speech. */
            if (calibration.length < 5) {
              calibration.push(rms);
              if (calibration.length === 5) {
                const sorted = [...calibration].sort((x, y) => x - y);
                threshold = Math.min(MAX_SPEECH_RMS, Math.max(SPEECH_RMS_THRESHOLD, sorted[2] * 2.5));
              }
              return;
            }
            if (rms >= threshold) {
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
            ? new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' })
            : null;
          const text = accumulatedRef.current.trim();
          if (blob && blob.size > 1000) {
            sendToBackend(blob, duration);
          } else if (text) {
            sendToBackend(text, duration);
          } else {
            setError("We didn't catch anything. Tap Start speaking and try again.");
            setStatus('idle');
          }
        };
        recorder.start(1000);
        mediaRecorderRef.current = recorder;
      } catch (e) {
        setError(e?.name === 'NotAllowedError' || e?.name === 'SecurityError'
          ? 'Microphone access is blocked. Allow the microphone for this site in your browser settings, then tap Start speaking.'
          : e?.name === 'NotFoundError'
            ? 'No microphone was found on this device.'
            : (e?.message || 'Could not access the microphone.'));
        setListening(false);
      }
    };
    startRecording();
    return () => {
      cancelled = true;
      if (silenceCheckId) window.clearInterval(silenceCheckId);
      if (audioContext) {
        try { audioContext.close(); } catch (_) {}
      }
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
  const isUserSpeaking = listening && !paused && status === 'listening';
  const isPaused = listening && paused;
  const isBootstrapping = !openingReady;

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
    speaking: 'AI is speaking',
    thinking: isBootstrapping ? 'Preparing' : 'Thinking',
    ready: 'Your turn',
  }[stageState];

  if (!sessionStarted) {
    return (
      <div className="ui-card agent-intro">
        <div className="agent-orb"><MicIcon /></div>
                <h1 className="agent-intro-title">Talk with your AI partner</h1>
        <p className="agent-intro-sub">An open conversation with no script. The easiest way to warm up and build confidence.</p>
        <div className="agent-steps">
          <div className="agent-step">
            <div className="agent-step-num">1</div>
            <div><div className="agent-step-title">We pick a topic</div>
            <div className="agent-step-desc">Based on the interests in your profile.</div></div>
          </div>
          <div className="agent-step">
            <div className="agent-step-num">2</div>
            <div><div className="agent-step-title">Talk naturally</div>
            <div className="agent-step-desc">The AI listens and replies when you pause.</div></div>
          </div>
          <div className="agent-step">
            <div className="agent-step-num">3</div>
            <div><div className="agent-step-title">Get your report</div>
            <div className="agent-step-desc">See pace, filler words and tips when you finish.</div></div>
          </div>
        </div>
        <button type="button" className="ui-btn ui-btn-primary" onClick={() => setSessionStarted(true)}>
          <PlayIcon /> Start conversation
        </button>
        <p className="agent-note">Uses your microphone. Speaking time counts toward your monthly minutes.</p>
        {error && <div className="ui-alert ui-alert-error" style={{ marginTop: 16 }}>{error}</div>}
      </div>
    );
  }

  const hint = isUserSpeaking
      ? 'The mic stays on while you talk. Stop for 4 seconds and the AI replies, or tap Done to send now.'
      : isAiSpeaking
        ? 'Listen to the reply. Your mic turns on automatically when the AI finishes.'
        : isProcessing
          ? 'Getting a reply…'
          : isBootstrapping
            ? 'Picking a topic from your interests…'
            : 'Tap Start speaking when you are ready. The mic also starts on its own after the AI asks.';

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
            <div className="agent-prompt-label">{isBootstrapping ? 'Getting ready' : 'AI partner'}</div>
            <p
              key={isBootstrapping ? 'bootstrap' : isProcessing ? 'processing' : lastAssistantMessage}
              className={`agent-prompt ${isBootstrapping || isProcessing ? 'is-muted' : ''}`}
            >
              {isBootstrapping
                ? 'Starting your conversation…'
                : isProcessing
                  ? 'Thinking about what you said…'
                  : (lastAssistantMessage || 'What do you want to talk about today?')}
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
            className={`ui-btn ${'ui-btn-primary'}`}
            onClick={toggleListening}
            disabled={status === 'sending' || status === 'playing' || !openingReady}
          >
            {!listening
              ? (<><MicIcon /> Start speaking</>)
              : paused
                ? (<><StopIcon /> Done, send</>)
                : (<><StopIcon /> Done, send</>)}
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
            <ClockIcon style={{ width: 18, height: 18, color: 'var(--text-dim)' }} />
          </div>
          <div className="agent-timer">{practiceDisplay}</div>
          <div className="ui-progress" style={{ margin: '12px 0 8px' }}>
            <span style={{ width: `${sessionProgress}%` }} />
          </div>
          <p className="ui-card-sub">
            {sessionProgress >= 100 ? 'You reached the 10-minute goal. Great session.' : `${sessionProgress}% of a 10-minute session`}
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
                <span className="agent-msg-who">{line.role === 'user' ? 'You' : 'AI partner'}</span>
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
