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
  'Technology', 'Coding', 'AI', 'Startups', 'Politics', 'Religion', 'Philosophy', 'Music',
  'Sports', 'Cricket', 'Music', 'Travel', 'Food', 'Movies',
  'Reading', 'Poetry', 'Public speaking', 'Science', 'History', 'Networking', 'Sales',
  'Interview prep', 'Psychology', 'Finance',
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
      <div className="min-h-screen bg-[rgb(10,10,10)] text-white flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-3xl bg-[rgb(26,26,26)] border border-white/10 rounded-2xl p-8 shadow-xl">
          <p className="text-gray-400 text-center">Loading profile setup…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[rgb(10,10,10)] text-white flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-3xl bg-[rgb(26,26,26)] border border-white/10 rounded-2xl p-8 shadow-xl">
        {/* HEADER */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <AuthLogo className="w-8 h-8 text-primary" />
            <div>
              <p className="text-lg font-semibold">
                articulate<span className="text-primary">.ai</span>
              </p>
              <p className="text-xs text-gray-400">
                Voice communication coach
              </p>
            </div>
          </div>

          <h1 className="mt-6 text-2xl font-bold">
            Set up your profile
          </h1>

          <p className="text-gray-400 text-sm mt-2">
            Tell us a bit about you so we can personalize your practice.
          </p>
        </div>

        {/* ERROR */}
        {error && (
          <p className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-md">
            {error}
          </p>
        )}

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ROW */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* PROFESSION */}
            <div>
              <label className="text-sm text-gray-300">
                <span className="text-red-400">*</span> Profession
              </label>
              <select
                name="profession"
                value={form.profession}
                onChange={handleChange}
                className="w-full mt-1 bg-[rgb(26,26,26)] border border-white/10 rounded-md px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none text-white"
              >
                {PROFESSION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* GOAL */}
            <div>
              <label className="text-sm text-gray-300">
                <span className="text-red-400">*</span> Goal
              </label>
              <select
                name="goal"
                value={form.goal}
                onChange={handleChange}
                className="w-full mt-1 bg-[rgb(26,26,26)] border border-white/10 rounded-md px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none text-white"
              >
                {GOAL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* LEVEL */}
            <div>
              <label className="text-sm text-gray-300">
                <span className="text-red-400">*</span> Level
              </label>
              <select
                name="communication_level"
                value={form.communication_level}
                onChange={handleChange}
                className="w-full mt-1 bg-[rgb(26,26,26)] border border-white/10 rounded-md px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none text-white"
              >
                {LEVEL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* BIO */}
          <div>
            <label className="text-sm text-gray-300">Bio</label>
            <textarea
              name="bio"
              value={form.bio}
              onChange={handleChange}
              placeholder="Tell us a bit about your background and what you want to improve."
              rows={3}
              className="w-full mt-1 bg-[rgb(26,26,26)] border border-white/10 rounded-md px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none text-white placeholder-gray-500"
            />
          </div>

          {/* INTERESTS */}
          <div>
            <label className="text-sm text-gray-300">
              <span className="text-red-400">*</span> Interests
            </label>

            <p className="text-xs text-gray-500 mt-1">
              Click to add or type your own below.
            </p>

            {/* CHIPS */}
            <div className="flex flex-wrap gap-2 mt-3">
              {EXAMPLE_INTERESTS.map((item) => {
                const current = (form.interests_text || "")
                  .split(",")
                  .map((s) => s.trim().toLowerCase());
                const isAdded = current.includes(item.toLowerCase());

                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => addInterest(item)}
                    disabled={isAdded}
                    className={`px-3 py-1 text-xs rounded-full border transition
                      ${
                        isAdded
                          ? "bg-primary/20 text-primary border-primary/30"
                          : "bg-[rgb(26,26,26)] text-gray-300 border-white/10 hover:bg-[rgb(35,35,35)]"
                      }`}
                  >
                    {isAdded ? "✓ " : ""}
                    {item}
                  </button>
                );
              })}
            </div>

            {/* INPUT */}
            <input
              type="text"
              name="interests_text"
              value={form.interests_text}
              onChange={handleChange}
              placeholder="e.g. cricket, music, coding, relationships"
              required
              className="w-full mt-4 bg-[rgb(26,26,26)] border border-white/10 rounded-md px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none text-white placeholder-gray-500"
            />
          </div>

          {/* BUTTON */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={saving || !(form.interests_text || "").trim()}
              className="w-full bg-primary hover:bg-primary/90 text-slate py-3 rounded-md font-medium transition disabled:opacity-50"
            >
              {saving ? "Saving…" : "Continue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
