import '../styles/profile.css';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPlans, getProfile, getMe, subscribeToPlanWithPayment } from '../services/api';

export default function Subscriptions() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getProfile()
      .then((p) => {
        if (p.subscription_plan) {
          navigate('/dashboard', { replace: true });
        }
      })
      .catch(() => {})
      .finally(() => {});
  }, [navigate]);

  useEffect(() => {
    getMe().then(setUser).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    setLoading(true);
    getPlans()
      .then((data) => setPlans(Array.isArray(data.plans) ? data.plans : []))
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = (planId) => {
    setError(null);
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;
    setSubmitting(true);
    subscribeToPlanWithPayment(
      planId,
      plan,
      user,
      () => {
        setSubmitting(false);
        navigate('/dashboard', { replace: true });
      },
      (err) => {
        setSubmitting(false);
        if (err?.error !== 'Payment cancelled') {
          const msg = err?.error || err?.detail || err?.message || (typeof err === 'string' ? err : '');
          setError(msg || 'Failed to select plan. Please try again.');
        }
      }
    );
  };

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-wide tw-subscriptions-card">
        <div className="auth-card-header">
          <div>
            <div className="auth-brand">
              <div className="auth-logo-circle">ai</div>
              <div className="auth-brand-text">
                <span className="auth-brand-name">articulate.ai</span>
                <span className="auth-brand-sub">Voice communication coach</span>
              </div>
            </div>
            <h1 className="auth-card-title">Choose your plan</h1>
            <p className="auth-card-subtitle">
              Pick how you want to practice. You can switch plans anytime from your profile.
            </p>
          </div>
        </div>

        {error && <p className="tw-error">{error}</p>}
        {loading ? (
          <p className="tw-muted">Loading plans…</p>
        ) : plans.length === 0 ? (
          <p className="tw-muted">No plans configured yet.</p>
        ) : (
          <div className="tw-profile-plans-grid tw-subscriptions-plans">
            {plans.map((plan) => (
              <div key={plan.id} className="tw-profile-plan-card">
                <div className="tw-profile-plan-head">
                  <h3 className="tw-profile-plan-name">{plan.name}</h3>
                  <p className="tw-profile-plan-price">
                    {plan.price === 0 ? 'Free' : `₹${plan.price.toFixed(2)}`}{' '}
                    <span>/ {plan.duration} days</span>
                  </p>
                </div>
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
                  onClick={() => handleSelect(plan.id)}
                  disabled={submitting}
                >
                  {submitting ? 'Selecting…' : 'Select plan'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

