import '../styles/profile.css';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfile, updateProfile } from '../services/api';
import AuthLogo from '../components/AuthLogo';

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

const EXAMPLE_INTERESTS = [
  'Technology', 'Coding', 'AI', 'Startups', 'Leadership', 'Management',
  'Sports', 'Cricket', 'Football', 'Fitness', 'Music', 'Travel',
  'Books', 'Writing', 'Public speaking', 'Networking', 'Sales',
  'Interview prep', 'Career growth', 'Psychology', 'Finance',
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
          navigate('/dashboard', { replace: true });
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

  const addInterest = (interest) => {
    const current = (form.interests_text || '').trim();
    const parts = current ? current.split(',').map((s) => s.trim()).filter(Boolean) : [];
    const lower = interest.toLowerCase();
    if (parts.some((p) => p.toLowerCase() === lower)) return;
    const next = parts.length ? [...parts, interest].join(', ') : interest;
    setForm((prev) => ({ ...prev, interests_text: next }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const interests = (form.interests_text || '').trim();
    if (!interests) {
      setError('Please add your interests. The more interests you add, the better we can personalize your practice topics.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateProfile(form);
      const updated = await getProfile();
      if (updated.has_completed_profile) {
        navigate('/dashboard', { replace: true });
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
    <div className="auth-page auth-page-setup">
      <div className="auth-card auth-card-wide">
        <div className="auth-card-header">
          <div>
            <div className="auth-brand">
              <div className="auth-logo-wrap">
                <AuthLogo className="auth-logo-icon" />
              </div>
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
          <div className="tw-profile-setup-row">
            <div className="tw-profile-setup-field">
              <label className="tw-modal-label"><span className="tw-required-star">*</span> Profession</label>
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
            </div>
            <div className="tw-profile-setup-field">
              <label className="tw-modal-label"><span className="tw-required-star">*</span> Goal</label>
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
            </div>
            <div className="tw-profile-setup-field">
              <label className="tw-modal-label"><span className="tw-required-star">*</span> Level</label>
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
            </div>
          </div>

          <div className="tw-profile-setup-field">
            <label className="tw-modal-label">Bio</label>
            <textarea
              name="bio"
              value={form.bio}
              onChange={handleChange}
              className="tw-modal-field tw-modal-textarea tw-modal-textarea-compact"
              placeholder="Tell us a bit about your background and what you want to improve."
              rows={2}
            />
          </div>

          <div className="tw-interests-field">
            <label className="tw-modal-label"><span className="tw-required-star">*</span> Interests</label>
            <p className="tw-modal-helper">Click to add or type your own below.</p>
            <div className="tw-interests-suggestions">
              <div className="tw-interests-chips">
                {EXAMPLE_INTERESTS.map((item) => {
                  const current = (form.interests_text || '').split(',').map((s) => s.trim().toLowerCase());
                  const isAdded = current.includes(item.toLowerCase());
                  return (
                    <button
                      key={item}
                      type="button"
                      className={`tw-interest-chip ${isAdded ? 'tw-interest-chip--added' : ''}`}
                      onClick={() => addInterest(item)}
                      disabled={isAdded}
                    >
                      {isAdded ? '✓ ' : ''}{item}
                    </button>
                  );
                })}
              </div>
            </div>
            <input
              type="text"
              name="interests_text"
              value={form.interests_text}
              onChange={handleChange}
              className="tw-modal-field tw-interests-input"
              placeholder="e.g. cricket, music, coding, relationships"
              required
            />
          </div>

          <div className="tw-modal-actions">
            <button type="submit" className="tw-btn-primary" disabled={saving || !(form.interests_text || '').trim()}>
              {saving ? 'Saving…' : 'Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

