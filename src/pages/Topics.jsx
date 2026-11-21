import '../styles/voice.css';
import '../styles/pages.css';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { getTopics, createConversation, getProfile, getPlans, getMe, subscribeToPlanWithPayment } from '../services/api';
import { usePageNavbar } from '../contexts/PageNavbarContext';
import { SearchIcon, ClockIcon, MicIcon, CheckIcon, LockIcon } from '../components/icons';
import { categoryColor } from '../utils/topicColors';

const LEVEL_LABEL = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export default function Topics() {
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const { setPageNavbar } = usePageNavbar();

  useEffect(() => {
    setPageNavbar({ title: 'Topics' });
    return () => setPageNavbar({});
  }, [setPageNavbar]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('all');
  const [category, setCategory] = useState('all');
  const [startingId, setStartingId] = useState(null);
  const [attemptFilter, setAttemptFilter] = useState('all');
  const [profile, setProfile] = useState(null);
  const [plans, setPlans] = useState([]);
  const [showQuotaExceededModal, setShowQuotaExceededModal] = useState(false);
  const [upgradeUser, setUpgradeUser] = useState(null);
  const [upgradeSubmittingId, setUpgradeSubmittingId] = useState(null);
  const [showFiltersOnMobile, setShowFiltersOnMobile] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }
    let isActive = true;
    setLoading(true);
    getTopics()
      .then((data) => {
        if (!isActive) return;
        setTopics(Array.isArray(data) ? data : []);
        setError(null);
      })
      .catch((err) => {
        if (!isActive) return;
        setError(err?.error || err?.message || 'Failed to load topics.');
      })
      .finally(() => {
        if (!isActive) return;
        setLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    getProfile().then(setProfile).catch(() => {});
    getPlans().then((data) => setPlans(Array.isArray(data?.plans) ? data.plans : [])).catch(() => {});
    getMe().then(setUpgradeUser).catch(() => {});
  }, [isAuthenticated]);

  const minutesRemaining = profile?.minutes_remaining ?? Math.max(0, (profile?.minutes_limit ?? 10) - (profile?.monthly_minutes_used ?? 0));
  const currentPlanId = profile?.subscription_plan && typeof profile.subscription_plan === 'object'
    ? profile.subscription_plan.id
    : profile?.subscription_plan || null;
  const currentPlan = plans.find((p) => p.id === currentPlanId);
  const isFreePlan = !currentPlan || currentPlan.price === 0;

  const categories = useMemo(() => {
    const set = new Set();
    topics.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [topics]);

  const filtered = useMemo(() => {
    const limited = isFreePlan ? topics.slice(0, 5) : topics;
    const query = search.trim().toLowerCase();
    const list = limited.filter((t) => {
      if (level !== 'all' && t.level !== level) return false;
      if (category !== 'all' && t.category !== category) return false;
      if (attemptFilter === 'attempted' && !t.completed) return false;
      if (attemptFilter === 'not_attempted' && t.completed) return false;
      if (!query) return true;
      const haystack = `${t.title} ${t.category ?? ''} ${t.description ?? ''}`.toLowerCase();
      return haystack.includes(query);
    });
    return [...list].sort((a, b) => {
      const aDone = !!a.completed;
      const bDone = !!b.completed;
      if (aDone === bDone) return 0;
      return aDone ? 1 : -1;
    });
  }, [topics, search, level, category, attemptFilter, isFreePlan]);

  const handleStart = async (topicObj) => {
    if (!topicObj?.title) return;
    if (isFreePlan && minutesRemaining <= 0) {
      setShowQuotaExceededModal(true);
      return;
    }
    setError(null);
    setStartingId(topicObj.id);
    try {
      const conv = await createConversation(
        topicObj.title,
        topicObj.id,
        topicObj.description || undefined,
      );
      const timeLimitSeconds = topicObj.time_limit_seconds || 180;
      navigate(`/voice?conversation=${conv.id}&solo=1`, {
        state: {
          conversationId: conv.id,
          topic: topicObj.title,
          topicDescription: topicObj.description || '',
          solo: true,
          timeLimitSeconds,
        },
      });
    } catch (err) {
      const errMsg = err?.error || err?.message || 'Failed to start session.';
      setError(errMsg);
      if (typeof errMsg === 'string' && (errMsg.includes('practice minutes') || errMsg.includes('monthly limit'))) {
        setShowQuotaExceededModal(true);
      }
    } finally {
      setStartingId(null);
    }
  };

  const hasActiveFilters = search.trim() !== '' || level !== 'all' || category !== 'all' || attemptFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setLevel('all');
    setCategory('all');
    setAttemptFilter('all');
  };

  const lockedCount = isFreePlan ? Math.max(0, topics.length - 5) : 0;
  const visibleTopics = isFreePlan ? topics.slice(0, 5) : topics;
  const categoryCounts = visibleTopics.reduce((acc, t) => {
    const c = t.category || 'General';
    acc[c] = (acc[c] || 0) + 1;
    return acc;
  }, {});
  const doneCount = visibleTopics.filter((t) => t.completed).length;

  return (
    <div className="topics">
      <header className="ui-page-head topics-head">
        <div>
          <h1 className="ui-h1">Topics</h1>
          <p className="ui-sub">Short prompts to practice speaking. Pick one and talk for a few minutes.</p>
        </div>
        {!loading && visibleTopics.length > 0 && (
          <div className="topics-progress">
            <span><strong>{doneCount}</strong> of {visibleTopics.length} practiced</span>
            <div className="ui-progress"><span style={{ width: `${Math.round((doneCount / visibleTopics.length) * 100)}%` }} /></div>
          </div>
        )}
      </header>

      <nav className="topics-tabs" aria-label="Categories">
        <button type="button" className={category === 'all' ? 'is-active' : ''} onClick={() => setCategory('all')}>
          All <span>{visibleTopics.length}</span>
        </button>
        {categories.map((c) => (
          <button key={c} type="button" className={category === c ? 'is-active' : ''} onClick={() => setCategory(c)}>
            {c} <span>{categoryCounts[c] || 0}</span>
          </button>
        ))}
      </nav>

      <div className="topics-filterbar">
        <div className="ui-input-wrap topics-search">
          <SearchIcon />
          <input
            type="search"
            className="ui-input"
            placeholder="Search topics"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search topics"
          />
        </div>
        <select className="ui-select" value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Level">
          <option value="all">All levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
        <select className="ui-select" value={attemptFilter} onChange={(e) => setAttemptFilter(e.target.value)} aria-label="Status">
          <option value="all">Any status</option>
          <option value="not_attempted">Not practiced</option>
          <option value="attempted">Practiced</option>
        </select>
        {hasActiveFilters && (
          <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" onClick={clearFilters}>Clear</button>
        )}
      </div>

      {lockedCount > 0 && (
        <div className="ui-alert" style={{ marginBottom: 16 }}>
          <LockIcon style={{ width: 17, height: 17, color: 'var(--accent-ink)', flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{lockedCount} more topics are available on paid plans.</span>
          <button type="button" className="ui-btn ui-btn-primary ui-btn-sm" onClick={() => navigate('/profile')}>Upgrade</button>
        </div>
      )}

      {loading ? (
        <div className="ui-card topics-list">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="topics-row"><div className="ui-skeleton" style={{ height: 40, gridColumn: '1 / -1' }} /></div>
          ))}
        </div>
      ) : error ? (
        <div className="ui-card ui-empty">
          <p className="ui-empty-title">Couldn&apos;t load topics</p>
          <p style={{ margin: 0 }}>{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="ui-card ui-empty">
          <div className="ui-empty-icon"><SearchIcon /></div>
          <p className="ui-empty-title">No topics match your filters</p>
          <p style={{ margin: '0 0 16px' }}>Try a different search or clear the filters.</p>
          {hasActiveFilters && <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={clearFilters}>Clear filters</button>}
        </div>
      ) : (
        <div className="ui-card topics-list">
          <div className="topics-row topics-row-head" aria-hidden>
            <span />
            <span>Topic</span>
            <span>Level</span>
            <span>Time</span>
            <span />
          </div>
          {filtered.map((t) => {
            const categoryLabel = t.category || 'General';
            const limitMinutes = Math.round((t.time_limit_seconds || 180) / 60);
            const attempted = t.completed;
            const levelLabel = LEVEL_LABEL[t.level] || 'All levels';
            const attempts = t.attempts || 1;
            return (
              <div key={t.id} className={`topics-row ${attempted ? 'is-done' : ''}`}>
                <span className={`topics-status ${attempted ? 'is-done' : ''}`} title={attempted ? 'Practiced' : 'Not practiced yet'}>
                  {attempted ? <CheckIcon /> : <MicIcon />}
                </span>
                <div className="topics-main">
                  <div className="topics-title">{t.title}</div>
                  <div className="topics-desc">{t.description || 'Practice your communication skills.'}</div>
                  <div className="topics-meta">
                    <span className="topics-cat"><span className="ui-dot" style={{ background: categoryColor(categoryLabel) }} />{categoryLabel}</span>
                    <span className="topics-meta-mobile">{levelLabel}</span>
                    <span className="topics-meta-mobile">{limitMinutes} min</span>
                    {attempted && <span>{attempts} session{attempts > 1 ? 's' : ''}{typeof t.best_score === 'number' ? ` · best ${t.best_score}` : ''}</span>}
                  </div>
                </div>
                <span className="topics-col">{levelLabel}</span>
                <span className="topics-col"><ClockIcon /> {limitMinutes} min</span>
                <div className="topics-action">
                  <button
                    type="button"
                    onClick={() => handleStart(t)}
                    disabled={startingId === t.id}
                    className={`ui-btn ui-btn-sm ${attempted ? 'ui-btn-secondary' : 'ui-btn-primary'}`}
                  >
                    {startingId === t.id ? 'Starting…' : attempted ? 'Retry' : 'Start'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}


      {showQuotaExceededModal && (
        <div
          className="tw-voice-leave-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowQuotaExceededModal(false)}
        >
          <div className="tw-voice-upgrade-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tw-voice-upgrade-header">
              <h2 className="tw-voice-upgrade-title">Monthly practice limit reached</h2>
              <button
                type="button"
                className="tw-voice-upgrade-close"
                onClick={() => setShowQuotaExceededModal(false)}
              >
                ✕
              </button>
            </div>
            <p className="tw-voice-upgrade-desc">
              You&apos;ve used all your free minutes this month. Upgrade to get more practice time and premium features.
            </p>
            <div className="tw-voice-upgrade-plans">
              {plans.filter((p) => p.price > 0).map((plan) => (
                <div key={plan.id} className="tw-voice-upgrade-plan-card">
                  <h3 className="tw-voice-upgrade-plan-name">{plan.name}</h3>
                  <p className="tw-voice-upgrade-plan-price">
                    ₹{plan.price.toFixed(2)} <span>/ {plan.duration} days</span>
                  </p>
                  {plan.description && (
                    <div
                      className="tw-voice-upgrade-plan-desc"
                      dangerouslySetInnerHTML={{ __html: plan.description }}
                    />
                  )}
                  <button
                    type="button"
                    className="tw-btn-primary tw-voice-upgrade-plan-btn"
                    disabled={upgradeSubmittingId === plan.id}
                    onClick={() => {
                      setUpgradeSubmittingId(plan.id);
                      subscribeToPlanWithPayment(
                        plan.id,
                        plan,
                        upgradeUser,
                        () => {
                          setUpgradeSubmittingId(null);
                          setShowQuotaExceededModal(false);
                          getProfile().then(setProfile).catch(() => {});
                        },
                        (err) => {
                          setUpgradeSubmittingId(null);
                          if (err?.error === 'Payment cancelled') return;
                        },
                      );
                    }}
                  >
                    {upgradeSubmittingId === plan.id ? 'Processing…' : `Get ${plan.name}`}
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="tw-voice-upgrade-skip"
              onClick={() => setShowQuotaExceededModal(false)}
            >
              Maybe later
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
