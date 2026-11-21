import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfile, updateProfile } from '../services/api';
import { BrandMark } from '../components/AuthLayout';
import ProfileForm from '../components/ProfileForm';
import FormError, { formatApiError } from '../components/FormError';

export default function ProfileSetup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
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
          return;
        }
        setForm({
          profession: data.profession || 'student',
          goal: data.goal || 'interview',
          communication_level: data.communication_level || 'beginner',
          bio: data.bio || '',
          interests_text: data.interests_text || '',
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [navigate]);

  const onField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!(form.interests_text || '').trim()) {
      setError('Add at least one interest so we can pick topics for you.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updateProfile({ ...form, bio: (form.bio || '').trim() });
      const updated = await getProfile();
      if (updated.has_completed_profile) {
        navigate('/dashboard', { replace: true });
      } else {
        setError('Add at least one interest so we can pick topics for you.');
      }
    } catch (err) {
      setError(formatApiError(err, 'Could not save your profile. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const interestCount = (form.interests_text || '').split(',').map((s) => s.trim()).filter(Boolean).length;

  return (
    <div className="onb">
      <header className="onb-top">
        <BrandMark to="/" />
        <span className="onb-step">Last step</span>
      </header>

      <form onSubmit={handleSubmit}>
        <main className="onb-main">
          <h1 className="onb-title">Personalize your practice</h1>
          <p className="onb-sub">A few quick choices so your topics and feedback fit you. You can change these later in Settings.</p>
          {loading ? (
            <div className="ui-form">
              {[0, 1, 2].map((i) => <div key={i} className="ui-skeleton" style={{ height: 72 }} />)}
            </div>
          ) : (
            <ProfileForm form={form} onField={onField} />
          )}
        </main>

        <div className="onb-foot">
          <div className="onb-foot-inner">
            <FormError message={error} />
            <div className="onb-foot-row">
              <span className="ui-hint">{interestCount > 0 ? `${interestCount} interest${interestCount > 1 ? 's' : ''} added` : 'Add at least one interest'}</span>
              <button type="submit" className="ui-btn ui-btn-primary" disabled={saving || loading}>
                {saving ? 'Saving…' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
