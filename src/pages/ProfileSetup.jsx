import '../styles/profile.css';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfile, updateProfile } from '../services/api';

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

export default function ProfileSetup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    profession: 'student',
    goal: 'interview',
    communication_level: 'beginner',
    bio: '',
    interests_text: '',
  });

  useEffect(() => {
    getProfile()
      .then((data) => {
        if (data.has_completed_profile) {
          // Profile already done; go straight to subscriptions
          navigate('/subscriptions', { replace: true });
        } else {
          setForm({
            profession: data.profession || 'student',
            goal: data.goal || 'interview',
            communication_level: data.communication_level || 'beginner',
            bio: data.bio || '',
            interests_text: data.interests_text || '',
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateProfile(form);
      const updated = await getProfile();
      if (updated.has_completed_profile) {
        navigate('/subscriptions', { replace: true });
      } else {
        setError('Please fill in your bio and interests to complete your profile.');
      }
    } catch (err) {
      setError(err?.error || err?.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <p className="tw-muted">Loading profile setup…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-wide">
        <div className="auth-card-header">
          <div>
            <div className="auth-brand">
              <div className="auth-logo-circle">ai</div>
              <div className="auth-brand-text">
                <span className="auth-brand-name">articulate.ai</span>
                <span className="auth-brand-sub">Voice communication coach</span>
              </div>
            </div>
            <h1 className="auth-card-title">Set up your profile</h1>
            <p className="auth-card-subtitle">
              Tell us a bit about you so we can personalize your practice.
            </p>
          </div>
        </div>

        {error && <p className="tw-error">{error}</p>}
        <form onSubmit={handleSubmit} className="tw-profile-setup-form">
          <label className="tw-modal-label">Profession</label>
          <select
            name="profession"
            value={form.profession}
            onChange={handleChange}
            className="tw-modal-field tw-modal-field-select"
          >
            {PROFESSION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <label className="tw-modal-label">Goal</label>
          <select
            name="goal"
            value={form.goal}
            onChange={handleChange}
            className="tw-modal-field tw-modal-field-select"
          >
            {GOAL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <label className="tw-modal-label">Level</label>
          <select
            name="communication_level"
            value={form.communication_level}
            onChange={handleChange}
            className="tw-modal-field tw-modal-field-select"
          >
            {LEVEL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <label className="tw-modal-label">Bio</label>
          <textarea
            name="bio"
            value={form.bio}
            onChange={handleChange}
            className="tw-modal-field tw-modal-textarea"
            placeholder="Tell us a bit about your background and what you want to improve."
          />

          <label className="tw-modal-label">Interests</label>
          <input
            type="text"
            name="interests_text"
            value={form.interests_text}
            onChange={handleChange}
            className="tw-modal-field"
            placeholder="e.g. interviews, presentations, networking"
          />

          <div className="tw-modal-actions">
            <button type="submit" className="tw-btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

