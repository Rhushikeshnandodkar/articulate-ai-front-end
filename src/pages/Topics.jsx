import '../styles/topics.css';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { getTopics, createConversation } from '../services/api';
import { usePageNavbar } from '../contexts/PageNavbarContext';

function SearchIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

const LEVEL_LABEL = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

function BookIcon() {
  return (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}

export default function Topics() {
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const { setPageNavbar } = usePageNavbar();

  useEffect(() => {
    setPageNavbar({ title: 'Practice Topics' });
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

  const categories = useMemo(() => {
    const set = new Set();
    topics.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [topics]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return topics.filter((t) => {
      if (level !== 'all' && t.level !== level) return false;
      if (category !== 'all' && t.category !== category) return false;
      if (attemptFilter === 'attempted' && !t.completed) return false;
      if (attemptFilter === 'not_attempted' && t.completed) return false;
      if (!query) return true;
      const haystack = `${t.title} ${t.category ?? ''} ${t.description ?? ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [topics, search, level, category, attemptFilter]);

  const handleStart = async (topicObj) => {
    if (!topicObj?.title) return;
    setError(null);
    setStartingId(topicObj.id);
    try {
      const conv = await createConversation(topicObj.title);
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
      setError(err?.error || err?.message || 'Failed to start session.');
    } finally {
      setStartingId(null);
    }
  };

  const getTagVariant = (cat) => {
    const c = (cat || 'General').toLowerCase();
    if (['tech', 'social', 'sales'].some((x) => c.includes(x))) return 'tw-topics-card-tag--blue';
    if (['career', 'business', 'leadership', 'interview', 'networking'].some((x) => c.includes(x))) return 'tw-topics-card-tag--purple';
    return 'tw-topics-card-tag--green';
  };

  return (
    <div className="tw-topics-page">
      <div className="tw-topics-filters-bar">
        <div className="tw-topics-search-wrap">
          <span className="tw-input-icon">
            <SearchIcon />
          </span>
          <input
            type="text"
            className="tw-topics-search-input"
            placeholder="Search topics, categories…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="tw-topics-filter-pills">
          <span className="tw-topics-filter-label">Level</span>
          <select
            id="topics-level"
            className="tw-topics-filter-select"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          >
            <option value="all">All levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
        <div className="tw-topics-filter-pills">
          <span className="tw-topics-filter-label">Category</span>
          <select
            id="topics-category"
            className="tw-topics-filter-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="tw-topics-filter-pills">
          <span className="tw-topics-filter-label">Status</span>
          <select
            id="topics-attempt"
            className="tw-topics-filter-select"
            value={attemptFilter}
            onChange={(e) => setAttemptFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="attempted">Attempted</option>
            <option value="not_attempted">Not attempted</option>
          </select>
        </div>
      </div>

      <div className="tw-topics-section-head">
        <h2 className="tw-topics-section-title">Choose your challenge</h2>
        <span className="tw-topics-count-badge">
          {filtered.length} of {topics.length} challenges
        </span>
      </div>

      {loading ? (
        <div className="tw-topics-empty">
          <div className="tw-topics-empty-icon">
            <BookIcon />
          </div>
          <p className="tw-topics-empty-title">Loading topics…</p>
          <p className="tw-topics-empty-desc">Finding the best practice sessions for you</p>
        </div>
      ) : error ? (
        <div className="tw-topics-empty">
          <p className="tw-topics-empty-title tw-error">{error}</p>
          <p className="tw-topics-empty-desc">Please try again later</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="tw-topics-empty">
          <div className="tw-topics-empty-icon">
            <SearchIcon />
          </div>
          <p className="tw-topics-empty-title">No topics match your filters</p>
          <p className="tw-topics-empty-desc">Try adjusting your search or filters to find more topics</p>
        </div>
      ) : (
        <div className="tw-topics-grid">
          {filtered.map((t) => {
            const categoryLabel = t.category || 'General';
            const limitMinutes = Math.round((t.time_limit_seconds || 180) / 60);
            const attempted = t.completed;
            return (
              <article key={t.id} className="tw-topics-card">
                <div className="tw-topics-card-head">
                  <h3 className="tw-topics-card-title">{t.title}</h3>
                  <div className="tw-topics-card-tags">
                    {!attempted && <span className="tw-topics-card-new">New</span>}
                    <span className={`tw-topics-card-tag ${getTagVariant(categoryLabel)}`}>
                      {categoryLabel}
                    </span>
                  </div>
                </div>
                <p className="tw-topics-card-desc">
                  {t.description || 'Practice your communication skills.'}
                </p>
                <div className="tw-topics-card-meta">
                  <span>⏱ {limitMinutes} min</span>
                  {attempted && typeof t.best_score === 'number' && (
                    <span>Best: {t.best_score}</span>
                  )}
                  {attempted && typeof t.last_score === 'number' && t.last_score > 0 && (
                    <span>Last: {t.last_score}</span>
                  )}
                </div>
                <p className={`tw-topics-card-status ${attempted ? 'tw-topics-card-status--done' : 'tw-topics-card-status--pending'}`}>
                  {attempted ? `✓ Attempted · ${t.attempts || 1} session${(t.attempts || 1) > 1 ? 's' : ''}` : 'Not attempted yet'}
                </p>
                <button
                  type="button"
                  onClick={() => handleStart(t)}
                  disabled={startingId === t.id}
                  className="tw-topics-card-btn"
                >
                  {startingId === t.id ? 'Starting…' : 'Start talking'}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

