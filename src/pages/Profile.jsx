import '../styles/profile.css';
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getProfile, updateProfile, getConversations, getPlans, subscribeToPlan } from '../services/api';

const PROFESSION_OPTIONS = [
  { value: 'student', label: 'Student' },
  { value: 'professional', label: 'Professional' },
  { value: 'business owner', label: 'Business Owner' },
];

const GOAL_OPTIONS = [
  { value: 'interview', label: 'Interview Preparation' },
  { value: 'public_speaking', label: 'Public Speaking' },
  { value: 'confidence', label: 'Confidence Building' },
  { value: 'sales', label: 'Sales Communication' },
  { value: 'networking', label: 'Networking' },
  { value: 'english speaking', label: 'English Speaking' },
];

const LEVEL_OPTIONS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const LABELS = {
  profession: 'Profession',
  goal: 'Goal',
  communication_level: 'Level',
};

function PencilIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [planSubmittingId, setPlanSubmittingId] = useState(null);
  const [planError, setPlanError] = useState(null);
  const [form, setForm] = useState({
    profession: 'student',
    goal: 'interview',
    communication_level: 'beginner',
    bio: '',
    interests_text: '',
  });

  const [profileCompleted, setProfileCompleted] = useState(false);

  const loadProfile = () => {
    getProfile()
      .then((data) => {
        setProfile(data);
        setProfileCompleted(Boolean(data.has_completed_profile));
        setForm({
          profession: data.profession || 'student',
          goal: data.goal || 'interview',
          communication_level: data.communication_level || 'beginner',
          bio: data.bio || '',
          interests_text: data.interests_text || '',
        });
      })
      .catch(() => setProfile({}))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    setConversationsLoading(true);
    getConversations()
      .then(setConversations)
      .catch(() => setConversations([]))
      .finally(() => setConversationsLoading(false));
  }, []);

  useEffect(() => {
    setPlansLoading(true);
    getPlans()
      .then((data) => setPlans(Array.isArray(data.plans) ? data.plans : []))
      .catch(() => setPlans([]))
      .finally(() => setPlansLoading(false));
  }, []);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const wasCompleted = profileCompleted;
      await updateProfile(form);
      const updated = await getProfile();
      setProfile(updated);
      setProfileCompleted(Boolean(updated.has_completed_profile));
      setModalOpen(false);
      // If profile just became complete for the first time, go to subscriptions
      if (!wasCompleted && updated.has_completed_profile) {
        navigate('/subscriptions', { replace: true });
      }
    } catch (err) {
      setError(err?.error || err?.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const getLabel = (key, value) => {
    if (key === 'profession') return PROFESSION_OPTIONS.find((o) => o.value === value)?.label || value;
    if (key === 'goal') return GOAL_OPTIONS.find((o) => o.value === value)?.label || value;
    if (key === 'communication_level') return LEVEL_OPTIONS.find((o) => o.value === value)?.label || value;
    return value || '—';
  };

  const handlePlanSelect = async (planId) => {
    setPlanError(null);
    setPlanSubmittingId(planId);
    try {
      await subscribeToPlan(planId);
      const updated = await getProfile();
      setProfile(updated);
    } catch (err) {
      setPlanError(err?.error || err?.detail || 'Failed to update plan. Please try again.');
    } finally {
      setPlanSubmittingId(null);
    }
  };

  if (loading) {
    return (
      <div className="tw-profile-loading">
        <p>Loading profile…</p>
      </div>
    );
  }

  const stats = profile
    ? {
        total_sessions: profile.total_sessions ?? 0,
        total_minutes_spoken: profile.total_minutes_spoken ?? 0,
        average_filler_words: profile.average_filler_words ?? 0,
        average_pace_wpm: profile.average_pace_wpm ?? 0,
        confidence_score: profile.confidence_score ?? 0,
        clarity_score: profile.clarity_score ?? 0,
      }
    : null;

  const currentPlanId =
    profile?.subscription_plan && typeof profile.subscription_plan === 'object'
      ? profile.subscription_plan.id
      : profile?.subscription_plan || null;
  const currentPlan = plans.find((p) => p.id === currentPlanId);

  return (
    <div className="tw-profile-page">
      <div className="tw-profile-header">
        <h1 className="tw-profile-title">Profile</h1>
        <button
          type="button"
          className="tw-profile-edit-btn"
          onClick={() => setModalOpen(true)}
          title="Edit profile"
          aria-label="Edit profile"
        >
          <PencilIcon />
        </button>
      </div>

      <section className="tw-profile-card">
        <h2 className="tw-profile-card-title">About</h2>
        <div className="tw-profile-row">
          <span className="tw-profile-label">Profession</span>
          <span className="tw-profile-value">{getLabel('profession', profile?.profession)}</span>
        </div>
        <div className="tw-profile-row">
          <span className="tw-profile-label">Goal</span>
          <span className="tw-profile-value">{getLabel('goal', profile?.goal)}</span>
        </div>
        <div className="tw-profile-row">
          <span className="tw-profile-label">Level</span>
          <span className="tw-profile-value">{getLabel('communication_level', profile?.communication_level)}</span>
        </div>
        {profile?.interests_text && (
          <div className="tw-profile-row">
            <span className="tw-profile-label">Interests</span>
            <span className="tw-profile-value">{profile.interests_text}</span>
          </div>
        )}
        {profile?.bio && (
          <div className="tw-profile-row">
            <span className="tw-profile-label">Bio</span>
            <p className="tw-profile-bio">{profile.bio}</p>
          </div>
        )}
      </section>

      {stats && (
        <section className="tw-profile-card">
          <h2 className="tw-profile-card-title">Practice stats</h2>
          <div className="tw-profile-stats-grid">
            <div className="tw-profile-stat">
              <span className="tw-profile-stat-label">Sessions</span>
              <span className="tw-profile-stat-value">{stats.total_sessions}</span>
            </div>
            <div className="tw-profile-stat">
              <span className="tw-profile-stat-label">Minutes spoken</span>
              <span className="tw-profile-stat-value">{stats.total_minutes_spoken}</span>
            </div>
            <div className="tw-profile-stat">
              <span className="tw-profile-stat-label">This month</span>
              <span className="tw-profile-stat-value">
                {profile?.monthly_minutes_used ?? 0}/{profile?.minutes_limit ?? 10}
              </span>
            </div>
            <div className="tw-profile-stat">
              <span className="tw-profile-stat-label">Avg. filler words</span>
              <span className="tw-profile-stat-value">{stats.average_filler_words}</span>
            </div>
            <div className="tw-profile-stat">
              <span className="tw-profile-stat-label">Pace (wpm)</span>
              <span className="tw-profile-stat-value">{stats.average_pace_wpm}</span>
            </div>
            <div className="tw-profile-stat">
              <span className="tw-profile-stat-label">Confidence</span>
              <span className="tw-profile-stat-value">{stats.confidence_score}</span>
            </div>
            <div className="tw-profile-stat">
              <span className="tw-profile-stat-label">Clarity</span>
              <span className="tw-profile-stat-value">{stats.clarity_score}</span>
            </div>
          </div>
        </section>
      )}

      <section className="tw-profile-card">
        <h2 className="tw-profile-card-title">Your subscription</h2>
        {plansLoading ? (
          <p className="tw-muted">Loading plans…</p>
        ) : plans.length === 0 ? (
          <p className="tw-muted">Subscription plans are not configured yet.</p>
        ) : (
          <>
            <p className="tw-profile-plan-current-line">
              Current plan:{' '}
              <strong>{currentPlan ? currentPlan.name : profile?.subscription_plan ? 'Active plan' : 'None'}</strong>
            </p>
            {planError && <p className="tw-error">{planError}</p>}
            <div className="tw-profile-plans-grid">
              {plans.map((plan) => {
                const isCurrent = currentPlanId === plan.id;
                const isSubmitting = planSubmittingId === plan.id;
                return (
                  <div
                    key={plan.id}
                    className={`tw-profile-plan-card${isCurrent ? ' tw-profile-plan-card--current' : ''}`}
                  >
                    <div className="tw-profile-plan-head">
                      <h3 className="tw-profile-plan-name">{plan.name}</h3>
                      {isCurrent && <span className="tw-profile-plan-badge">Current</span>}
                    </div>
                    <p className="tw-profile-plan-price">
                      {plan.price === 0 ? 'Free' : `₹${plan.price.toFixed(2)}`}{' '}
                      <span>/ {plan.duration} days</span>
                    </p>
                    <div
                      className="tw-profile-plan-desc"
                      dangerouslySetInnerHTML={{ __html: plan.description }}
                    />
                    {typeof plan.limit_minutes === 'number' && (
                      <p className="tw-profile-plan-meta">
                        Includes <strong>{plan.limit_minutes}</strong> minutes of practice per month
                      </p>
                    )}
                    <button
                      type="button"
                      className="tw-profile-plan-btn"
                      onClick={() => !isCurrent && handlePlanSelect(plan.id)}
                      disabled={isCurrent || isSubmitting}
                    >
                      {isCurrent ? 'Current plan' : isSubmitting ? 'Updating…' : 'Switch to this plan'}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {modalOpen && (
        <div className="tw-modal-overlay" onClick={() => setModalOpen(false)} role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="tw-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tw-modal-header">
              <h2 id="modal-title" className="tw-modal-title">Edit profile</h2>
              <button type="button" className="tw-modal-close" onClick={() => setModalOpen(false)} aria-label="Close">
                <CloseIcon />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="tw-modal-body">
              <label className="tw-modal-label">Profession</label>
              <select name="profession" value={form.profession} onChange={handleChange} className="tw-modal-field tw-modal-field-select">
                {PROFESSION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              <label className="tw-modal-label">Goal</label>
              <select name="goal" value={form.goal} onChange={handleChange} className="tw-modal-field tw-modal-field-select">
                {GOAL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              <label className="tw-modal-label">Communication level</label>
              <select name="communication_level" value={form.communication_level} onChange={handleChange} className="tw-modal-field tw-modal-field-select">
                {LEVEL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              <label className="tw-modal-label">Interests (comma-separated)</label>
              <input type="text" name="interests_text" value={form.interests_text} onChange={handleChange} className="tw-modal-field" placeholder="e.g. technology, interviews" />

              <label className="tw-modal-label">Bio (optional)</label>
              <textarea name="bio" value={form.bio} onChange={handleChange} className="tw-modal-field tw-modal-textarea" placeholder="What you'd like to improve…" rows={3} />

              {error && <p className="tw-error">{error}</p>}

              <div className="tw-modal-actions">
                <button type="button" className="tw-btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="tw-btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
