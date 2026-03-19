// Backend origin: use port 8000 so requests hit Django (ElevenLabs, etc.). Override with VITE_API_ORIGIN.
const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? 'http://localhost:8000';
const API_BASE = `${API_ORIGIN}/api/auth`;

function getStoredToken() {
  return localStorage.getItem('accessToken');
}

export async function login(username, password) {
  const res = await fetch(`${API_BASE}/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

export async function register(payload) {
  const res = await fetch(`${API_BASE}/register/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  let data;
  try {
    data = await res.json();
  } catch (_) {
    if (res.ok || res.status === 201) return { success: true };
    throw { error: `Registration failed (${res.status})` };
  }
  if (!res.ok && res.status !== 201) throw data;
  return data;
}

export async function verifyEmailOtp({ email, otp }) {
  const res = await fetch(`${API_BASE}/verify-email/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

export async function resendEmailOtp({ email }) {
  const res = await fetch(`${API_BASE}/resend-email-otp/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

export async function refreshToken(refresh) {
  const res = await fetch(`${API_BASE}/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

export function getAuthHeaders() {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getMe() {
  const res = await fetch(`${API_BASE}/me/`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

/** Get current user profile (with suggested_topics). Creates default profile if none. */
export async function getProfile() {
  const res = await fetch(`${API_BASE}/profile/`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

/** Create or update profile (profession, goal, communication_level, bio). */
export async function updateProfile(payload) {
  const res = await fetch(`${API_BASE}/profile/`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

export async function getPlans() {
  const res = await fetch(`${API_BASE}/plans/`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

export async function subscribeToPlan(planId) {
  const res = await fetch(`${API_BASE}/subscription/subscribe/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ plan_id: planId }),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

/** Create Razorpay order for a paid plan. Returns { order_id, amount, key_id, plan }. */
export async function createRazorpayOrder(planId) {
  const res = await fetch(`${API_BASE}/subscription/create-order/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ plan_id: planId }),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

/** Verify Razorpay payment and activate subscription. */
export async function verifyRazorpayPayment({ razorpay_payment_id, razorpay_order_id, razorpay_signature, plan_id }) {
  const res = await fetch(`${API_BASE}/subscription/verify-payment/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      plan_id: Number(plan_id),
    }),
  });
  const data = await res.json().catch(() => ({ error: 'Invalid response from server' }));
  if (!res.ok) throw data;
  return data;
}

/**
 * Subscribe to a plan: free plans use direct subscribe; paid plans open Razorpay checkout.
 * Tries create-order first; falls back to subscribe only when backend says plan is free.
 * @param {number} planId - Plan ID
 * @param {object} plan - Plan object with name, price
 * @param {object} user - User object with first_name, last_name, email (for prefill)
 * @param {function} onSuccess - Called with response data on success
 * @param {function} onError - Called with error object on failure
 */
export function subscribeToPlanWithPayment(planId, plan, user, onSuccess, onError) {
  const price = Number(plan?.price);
  const isFree = !Number.isNaN(price) && price <= 0;

  if (isFree) {
    subscribeToPlan(planId)
      .then(onSuccess)
      .catch(onError);
    return;
  }

  createRazorpayOrder(planId)
    .then((result) => {
      const { order_id, amount, key_id, plan: planData } = result;
      const u = user || {};
      const userName = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || '';
      const options = {
        key: key_id,
        amount: amount,
        currency: 'INR',
        name: 'Articulate AI',
        description: `Subscription: ${planData?.name || plan?.name || 'Plan'}`,
        order_id,
        prefill: {
          name: userName,
          email: u.email || '',
        },
        handler: async (response) => {
          try {
            const data = await verifyRazorpayPayment({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              plan_id: planId,
            });
            await onSuccess(data);
          } catch (err) {
            onError(err);
          }
        },
        modal: {
          ondismiss: () => onError({ error: 'Payment cancelled' }),
        },
      };
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        onError({ error: response.error?.description || 'Payment failed' });
      });
      rzp.open();
    })
    .catch((err) => {
      const msg = String(err?.error || err?.detail || '');
      if (msg.includes('do not require payment') || msg.includes('Free plans')) {
        subscribeToPlan(planId).then(onSuccess).catch(onError);
        return;
      }
      onError(err);
    });
}

const ARTICULATE_BASE = `${API_ORIGIN}/api/articulate`;

/**
 * Send user speech (text or audio) to backend; returns { blob, text } for AI reply.
 * AI speaks only when this is called (user clicked Pause). No auto-send.
 * - text: transcript from live display (optional if sending audio).
 * - conversationId: optional; if provided, messages are saved and prompt uses conversation topic.
 * - audioBlob: optional; if provided, backend uses ElevenLabs STT to transcribe (captures um, uh, etc.).
 * - welcome: if true and conversationId set, returns AI welcome message (first message for new conversation).
 */
export async function voiceChat({ text = '', conversationId = null, audioBlob = null, welcome = false, spokenDurationSeconds = 0, solo = false }) {
  let res;
  if (audioBlob != null) {
    const form = new FormData();
    form.append('audio', audioBlob, 'audio.webm');
    if (conversationId != null) form.append('conversation_id', String(conversationId));
    if (solo) form.append('solo', '1');
    if (spokenDurationSeconds && Number.isFinite(spokenDurationSeconds) && spokenDurationSeconds > 0) {
      form.append('spoken_duration_seconds', String(spokenDurationSeconds.toFixed(2)));
    }
    res = await fetch(`${ARTICULATE_BASE}/voice/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: form,
    });
  } else {
    const baseBody = welcome && conversationId != null
      ? { conversation_id: conversationId, welcome: true }
      : { text: (text || '').trim(), ...(conversationId != null && { conversation_id: conversationId }) };
    const body = {
      ...baseBody,
      ...(spokenDurationSeconds && Number.isFinite(spokenDurationSeconds) && spokenDurationSeconds > 0
        ? { spoken_duration_seconds: spokenDurationSeconds }
        : {}),
      ...(solo ? { solo: true } : {}),
    };
    res = await fetch(`${ARTICULATE_BASE}/voice/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(body),
    });
  }
  const contentType = (res.headers.get('Content-Type') || '').toLowerCase();
  if (!res.ok) {
    const err = contentType.includes('application/json')
      ? await res.json().catch(() => ({ error: res.statusText }))
      : { error: res.statusText };
    throw err;
  }
  // Backend returns raw audio (audio/wav from Groq, or audio/mpeg) and AI text in header
  if (contentType.includes('audio/') || res.headers.get('X-AI-Response-Text')) {
    const buf = await res.arrayBuffer();
    const blobType = contentType.includes('audio/') ? contentType.split(';')[0].trim() : 'audio/wav';
    const blob = new Blob([buf], { type: blobType });
    if (blob.size === 0) {
      throw { error: 'Server returned empty audio. Check backend and TTS service.' };
    }
    let text = '';
    const textB64 = res.headers.get('X-AI-Response-Text');
    if (textB64) {
      try {
        const binary = atob(textB64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
        text = new TextDecoder('utf-8').decode(bytes);
      } catch (_) {}
    }
    return { blob, text };
  }
  // JSON response (builder plan returns text-only)
  const data = await res.json().catch(() => null);
  if (data && typeof data.text === 'string') {
    return { blob: null, text: data.text };
  }
  // JSON error response
  if (data && data.error) {
    throw data;
  }
  throw { error: 'Invalid response from voice API.' };
}

/** Get today's daily practice topic (one per user per day). */
export async function getDailyTopic() {
  const res = await fetch(`${ARTICULATE_BASE}/daily-topic/`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data || { error: 'Failed to fetch daily topic.' };
  return data;
}

/** Get 3-5 personalized topic suggestions from LLM based on user profile. */
export async function getSuggestedTopics() {
  const res = await fetch(`${ARTICULATE_BASE}/suggested-topics/`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

export async function getTopics() {
  const res = await fetch(`${ARTICULATE_BASE}/topics/`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

export async function getConversations() {
  const res = await fetch(`${ARTICULATE_BASE}/conversations/`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

export async function createConversation(topic, topicId = null) {
  const body = { topic: (typeof topic === 'string' ? topic : topic?.title || '').trim() };
  if (topicId != null) body.topic_id = topicId;
  const res = await fetch(`${ARTICULATE_BASE}/conversations/create/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

export async function getConversation(id) {
  const res = await fetch(`${ARTICULATE_BASE}/conversations/${id}/`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

export async function endConversation(id) {
  const res = await fetch(`${ARTICULATE_BASE}/conversations/${id}/end/`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

/** Get a better, rephrased version of the user's answer (for transcript click). */
export async function rephraseText(text) {
  const res = await fetch(`${ARTICULATE_BASE}/rephrase/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ text }),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

/** Grammar check: mistakes, corrected sentence, and confusion analysis. */
export async function grammarCheck(text) {
  const res = await fetch(`${ARTICULATE_BASE}/grammar-check/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ text }),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}
