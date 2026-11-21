import '../styles/profile.css';
import '../styles/pages.css';
import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { usePageNavbar } from '../contexts/PageNavbarContext';
import { useTheme } from '../contexts/ThemeContext';
import { useDispatch } from 'react-redux';
import ProfileForm, { PROFESSION_OPTIONS, GOAL_OPTIONS, LEVEL_OPTIONS } from '../components/ProfileForm';
import FormError, { formatApiError } from '../components/FormError';
import { CloseIcon } from '../components/icons';
import { logout } from '../store/slices/authSlice';
import { getProfile, updateProfile, getConversations, getPlans, getMe, subscribeToPlanWithPayment } from '../services/api';

/** Customer care (tel: uses E.164 without spaces). */
const CUSTOMER_CARE_DISPLAY = '+91 7620722083';
const CUSTOMER_CARE_TEL = '+917620722083';

const HELP_SECTION_HASH = '#help-customer-care';

export default function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
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
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({
    profession: 'student',
    goal: 'interview',
    communication_level: 'beginner',
    bio: '',
    interests_text: '',
  });

  const [profileCompleted, setProfileCompleted] = useState(false);
  const { setPageNavbar } = usePageNavbar();
  const { theme, setTheme } = useTheme();
  const dispatch = useDispatch();
  const handleLogout = () => {
    try { localStorage.removeItem('articulate_recommended_topics'); } catch { /* ignore */ }
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    setPageNavbar({ title: 'Settings' });
    return () => setPageNavbar({});
  }, [setPageNavbar]);

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
    if (loading) return;
    if (location.hash !== HELP_SECTION_HASH) return;
    const t = window.setTimeout(() => {
      const el = document.getElementById('help-customer-care');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
    return () => window.clearTimeout(t);
  }, [loading, location.hash, location.pathname]);

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

  useEffect(() => {
    getMe().then(setUser).catch(() => setUser(null));
  }, []);

  const onField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const interests = (form.interests_text || '').trim();
    if (!interests) {
      setError('Add at least one interest so we can pick topics for you.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const wasCompleted = profileCompleted;
      await updateProfile({ ...form, bio: (form.bio || '').trim() });
      const updated = await getProfile();
      setProfile(updated);
      setProfileCompleted(Boolean(updated.has_completed_profile));
      setModalOpen(false);
      if (!wasCompleted && updated.has_completed_profile) {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError(formatApiError(err, 'Could not save your profile. Please try again.'));
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

  const handlePlanSelect = (planId) => {
    setPlanError(null);
    setPlanSubmittingId(planId);
    const plan = plans.find((p) => p.id === planId);
    if (!plan) {
      setPlanSubmittingId(null);
      return;
    }
    subscribeToPlanWithPayment(
      planId,
      plan,
      user,
      async (data) => {
        setPlanSubmittingId(null);
        setPlanError(null);
        try {
          const updated = await getProfile();
          setProfile(updated);
        } catch (e) {
          setPlanError(e?.error || e?.detail || e?.message || 'Plan updated but failed to refresh. Please reload.');
        }
      },
      (err) => {
        setPlanSubmittingId(null);
        if (err?.error !== 'Payment cancelled') {
          const msg = err?.error || err?.detail || err?.message || (typeof err === 'string' ? err : '');
          setPlanError(msg || 'Failed to update plan. Please try again.');
        }
      }
    );
  };

  if (loading) {
    return (
      <div className="set">
        <div className="ui-skeleton" style={{ height: 96, borderRadius: 8, marginBottom: 16 }} />
        <div className="ui-skeleton" style={{ height: 220, borderRadius: 8 }} />
      </div>
    );
  }

  const currentPlanId =
    profile?.subscription_plan && typeof profile.subscription_plan === 'object'
      ? profile.subscription_plan.id
      : profile?.subscription_plan || null;
  const currentPlan = plans.find((p) => p.id === currentPlanId);
  const planName = currentPlan ? currentPlan.name : profile?.subscription_plan ? 'Active plan' : 'Free';
  const onFree = !currentPlan || currentPlan.price === 0;
  const minutesUsed = profile?.monthly_minutes_used ?? 0;
  const minutesLimit = profile?.minutes_limit ?? 10;
  const usagePct = minutesLimit > 0 ? Math.min(100, Math.round((minutesUsed / minutesLimit) * 100)) : 0;
  const displayName = user?.first_name || user?.username || 'Your account';
  const interests = (profile?.interests_text || '').split(',').map((s) => s.trim()).filter(Boolean);
  const planStatus = profile?.subscription_active && profile?.subscription_expiry
    ? (currentPlan?.plan_type === 'day_pass'
      ? 'Valid until midnight tonight'
      : `Renews or expires ${new Date(profile.subscription_expiry).toLocaleDateString()}`)
    : profile?.subscription_plan && !profile?.subscription_active
      ? 'Expired. Renew to keep practicing.'
      : `${minutesUsed} of ${minutesLimit} minutes used this month`;

  return (
    <div className="set">
      {/* Account */}
      <section className="ui-card set-account">
        <span className="set-avatar">{displayName.slice(0, 2).toUpperCase()}</span>
        <div className="set-account-text">
          <div className="set-account-name">{displayName}</div>
          {user?.email && <div className="set-account-email">{user.email}</div>}
        </div>
        <span className="ui-chip ui-chip-accent">{planName}</span>
      </section>

      {/* Plan */}
      <section className="set-section">
        <div className="set-section-head">
          <h2 className="set-section-title">Plan and usage</h2>
        </div>
        <div className="ui-card set-card">
          <div className="set-plan-current">
            <div>
              <div className="set-plan-name">{planName} plan</div>
              <div className={`set-muted ${profile?.subscription_plan && !profile?.subscription_active ? 'set-danger' : ''}`}>{planStatus}</div>
            </div>
            {onFree && <span className="set-plan-left">{Math.max(0, minutesLimit - minutesUsed)} min left</span>}
          </div>
          {onFree && (
            <div className={`ui-progress ${usagePct >= 100 ? 'is-danger' : usagePct >= 80 ? 'is-warn' : ''}`} style={{ marginTop: 12 }}>
              <span style={{ width: `${usagePct}%` }} />
            </div>
          )}

          {planError && <div className="ui-alert ui-alert-error" style={{ marginTop: 14 }}>{planError}</div>}

          {plansLoading ? (
            <div className="ui-skeleton" style={{ height: 120, marginTop: 16 }} />
          ) : plans.length > 0 && (
            <div className="set-plans">
              {plans.map((plan) => {
                const isCurrent = currentPlanId === plan.id || (!currentPlanId && plan.price === 0);
                const isSubmitting = planSubmittingId === plan.id;
                const isFreePlan = plan.price === 0;
                const isDayPass = plan.plan_type === 'day_pass';
                const isOnActivePaidPlan = Boolean(profile?.subscription_active) && currentPlan && currentPlan.price > 0;
                const hideSwitchToFree = isFreePlan && currentPlan && currentPlan.price > 0;
                const dayPassUnavailable = isDayPass && !isCurrent && isOnActivePaidPlan;
                const meta = isDayPass
                  ? 'Unlimited practice until midnight'
                  : typeof plan.limit_minutes === 'number'
                    ? `${plan.limit_minutes} practice minutes per month`
                    : '';
                return (
                  <div key={plan.id} className={`set-plan ${isCurrent ? 'is-current' : ''}`}>
                    <div className="set-plan-info">
                      <div className="set-plan-row">
                        <span className="set-plan-title">{plan.name}</span>
                        {isDayPass && !isCurrent && <span className="ui-chip ui-chip-accent">Best value</span>}
                        {isCurrent && <span className="ui-chip">Current</span>}
                      </div>
                      {meta && <div className="set-muted">{meta}</div>}
                      {plan.description && (
                        <details className="set-plan-details">
                          <summary>What&apos;s included</summary>
                          <div className="set-plan-desc" dangerouslySetInnerHTML={{ __html: plan.description }} />
                        </details>
                      )}
                    </div>
                    <div className="set-plan-buy">
                      <div className="set-plan-price">
                        {isFreePlan ? 'Free' : `₹${plan.price.toFixed(0)}`}
                        <span>{isDayPass ? ' / day' : ` / ${plan.duration} days`}</span>
                      </div>
                      {!isCurrent && !hideSwitchToFree && !dayPassUnavailable && (
                        <button
                          type="button"
                          className={`ui-btn ui-btn-sm ${isDayPass ? 'ui-btn-primary' : 'ui-btn-secondary'}`}
                          onClick={() => handlePlanSelect(plan.id)}
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? 'Updating…' : isDayPass ? 'Get Day Pass' : isFreePlan ? 'Switch' : 'Upgrade'}
                        </button>
                      )}
                      {hideSwitchToFree && <span className="set-muted">After billing period</span>}
                      {dayPassUnavailable && <span className="set-muted">Not needed</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Practice profile */}
      <section className="set-section">
        <div className="set-section-head">
          <h2 className="set-section-title">Practice profile</h2>
          <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={() => setModalOpen(true)}>Edit</button>
        </div>
        <div className="ui-card set-card set-rows">
          <div className="set-row"><span className="set-row-label">Profession</span><span className="set-row-value">{getLabel('profession', profile?.profession)}</span></div>
          <div className="set-row"><span className="set-row-label">Goal</span><span className="set-row-value">{getLabel('goal', profile?.goal)}</span></div>
          <div className="set-row"><span className="set-row-label">Level</span><span className="set-row-value">{getLabel('communication_level', profile?.communication_level)}</span></div>
          <div className="set-row">
            <span className="set-row-label">Interests</span>
            <span className="set-row-value">
              {interests.length > 0
                ? <span className="set-tags">{interests.map((i) => <span key={i} className="ui-chip">{i}</span>)}</span>
                : <span className="set-muted">Add interests to get better topics</span>}
            </span>
          </div>
          {profile?.bio && <div className="set-row"><span className="set-row-label">Bio</span><span className="set-row-value set-muted">{profile.bio}</span></div>}
        </div>
      </section>

      {/* Appearance */}
      <section className="set-section">
        <div className="set-section-head"><h2 className="set-section-title">Appearance</h2></div>
        <div className="ui-card set-card set-inline">
          <div>
            <div className="set-row-value">Theme</div>
            <div className="set-muted">Choose light or dark mode</div>
          </div>
          <div className="ui-segment" role="group" aria-label="Theme">
            <button type="button" className={theme === 'light' ? 'is-active' : ''} onClick={() => setTheme('light')}>Light</button>
            <button type="button" className={theme === 'dark' ? 'is-active' : ''} onClick={() => setTheme('dark')}>Dark</button>
          </div>
        </div>
      </section>

      {/* Help */}
      <section id="help-customer-care" className="set-section tw-profile-scroll-anchor" tabIndex={-1}>
        <div className="set-section-head"><h2 className="set-section-title">Help</h2></div>
        <div className="ui-card set-card set-inline">
          <div>
            <div className="set-row-value">Customer care</div>
            <div className="set-muted">Questions about your account, billing or practice</div>
          </div>
          <a href={`tel:${CUSTOMER_CARE_TEL}`} className="ui-btn ui-btn-secondary ui-btn-sm">{CUSTOMER_CARE_DISPLAY}</a>
        </div>
      </section>

      <button type="button" className="ui-btn ui-btn-danger set-logout" onClick={handleLogout}>Log out</button>

      {modalOpen && (
        <div className="ui-modal-overlay" onClick={() => setModalOpen(false)} role="dialog" aria-modal="true" aria-labelledby="edit-profile-title">
          <form className="ui-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
            <div className="ui-modal-head">
              <h2 id="edit-profile-title" className="ui-modal-title">Edit practice profile</h2>
              <button type="button" className="ui-icon-btn is-plain" onClick={() => setModalOpen(false)} aria-label="Close"><CloseIcon /></button>
            </div>
            <div className="ui-modal-body">
              <ProfileForm form={form} onField={onField} />
            </div>
            <div className="ui-modal-foot">
              <FormError message={error} />
              <div className="ui-modal-actions">
                <button type="button" className="ui-btn ui-btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="ui-btn ui-btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
