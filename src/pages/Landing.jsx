import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { getPlans } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { BrandMark } from '../components/AuthLayout';
import {
  ArrowRightIcon, BookIcon, ChartIcon, CheckIcon, FlameIcon, MicIcon, MoonIcon, SparkIcon, SunIcon, TrophyIcon,
} from '../components/icons';
import '../styles/landing.css';
import FAQ from '../landingFaq.json';

const steps = [
  { title: 'Pick a topic', desc: 'Choose from prompts matched to your goal: interviews, presentations, everyday conversation.' },
  { title: 'Talk with your partner', desc: 'Answer out loud. The AI listens, asks follow-ups and keeps the conversation going.' },
  { title: 'Read your report', desc: 'See your pace, filler words and pauses, with specific tips for your next session.' },
];

const features = [
  { Icon: MicIcon, title: 'Real voice practice', desc: 'Speak out loud with an AI partner that responds naturally, not a text chatbot.' },
  { Icon: ChartIcon, title: 'Measurable feedback', desc: 'Words per minute, filler words and pauses for every session, so progress is visible.' },
  { Icon: SparkIcon, title: 'Better ways to say it', desc: 'Tap any answer for a clearer version and spoken-grammar fixes.' },
  { Icon: BookIcon, title: 'Topics that fit you', desc: 'Prompts picked from your interests and goals, from casual to interview-level.' },
  { Icon: FlameIcon, title: 'Daily streaks', desc: 'A short daily topic and streak tracking help you build the habit.' },
  { Icon: TrophyIcon, title: 'Badges as you improve', desc: 'Move from Bronze to Diamond as your table-topic score grows.' },
];

function ProductPreview() {
  return (
    <div className="lp-preview" aria-hidden>
      <div className="lp-preview-bar"><span /><span /><span /></div>
      <div className="lp-preview-body">
        <div className="lp-preview-head">
          <div>
            <div className="lp-preview-eyebrow">Session report</div>
            <div className="lp-preview-title">Tell me about a hard moment at work</div>
            <div className="lp-preview-meta">3m 30s · 4 answers</div>
          </div>
          <div className="lp-preview-verdict">Good</div>
        </div>
        <div className="lp-preview-feedback">
          <SparkIcon />
          <p>Strong example with a clear result. Replace &ldquo;um&rdquo; with a short silent pause when you switch ideas.</p>
        </div>
        <div className="lp-preview-stats">
          <div><span>Pace</span><strong>136 <small>wpm</small></strong></div>
          <div><span>Filler words</span><strong>4</strong></div>
          <div><span>Pauses</span><strong>3</strong></div>
        </div>
        <div className="lp-preview-pace">
          <div className="lp-preview-track"><span className="lp-ideal" /><span className="lp-marker" /></div>
          <div className="lp-preview-scale"><span>60</span><span>Ideal 120–150 wpm</span><span>210</span></div>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const { isAuthenticated } = useSelector((state) => state.auth);
  const { theme, toggleTheme } = useTheme();
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);

  useEffect(() => {
    getPlans()
      .then((data) => setPlans(Array.isArray(data?.plans) ? data.plans : []))
      .catch(() => setPlans([]))
      .finally(() => setPlansLoading(false));
  }, []);

  const dayPass = plans.find((p) => p.plan_type === 'day_pass');
  const hasFreePlan = plans.some((p) => Number(p.price) === 0);
  const bestValueId = plans
    .filter((p) => p.plan_type !== 'day_pass' && Number(p.price) > 0)
    .sort((a, b) => Number(a.price) - Number(b.price))[0]?.id;
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  const primaryCta = isAuthenticated
    ? <Link to="/dashboard" className="ui-btn ui-btn-primary lp-btn">Go to your dashboard <ArrowRightIcon /></Link>
    : <Link to="/signup" className="ui-btn ui-btn-primary lp-btn">Start practicing free <ArrowRightIcon /></Link>;

  return (
    <div className="lp">
      <header className="lp-nav">
        <div className="lp-container lp-nav-inner">
          <BrandMark />
          <nav className="lp-links" aria-label="Sections">
            <button type="button" onClick={() => scrollTo('how')}>How it works</button>
            <button type="button" onClick={() => scrollTo('features')}>Features</button>
            <button type="button" onClick={() => scrollTo('pricing')}>Pricing</button>
            <button type="button" onClick={() => scrollTo('faq')}>FAQ</button>
          </nav>
          <div className="lp-nav-actions">
            <button type="button" className="ui-icon-btn is-plain" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
            {isAuthenticated ? (
              <Link to="/dashboard" className="ui-btn ui-btn-primary ui-btn-sm">Dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="ui-btn ui-btn-ghost ui-btn-sm lp-login">Log in</Link>
                <Link to="/signup" className="ui-btn ui-btn-primary ui-btn-sm">Sign up</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-container lp-hero-grid">
            <div className="lp-hero-copy">
              <div className="lp-kicker">AI spoken English partner · Made for India</div>
              <h1 className="lp-h1">Practice spoken English out loud with an AI partner.</h1>
              <p className="lp-lead">
                Speak clearly and confidently, one short session at a time. Answer real questions out loud, then see
                your pace, filler words and simple tips, so you are ready for interviews, college and work.
              </p>
              <div className="lp-cta-row">
                {primaryCta}
                {!isAuthenticated && (
                  <button type="button" className="ui-btn ui-btn-secondary lp-btn" onClick={() => scrollTo('how')}>See how it works</button>
                )}
              </div>
              <ul className="lp-proof">
                <li><CheckIcon /> Free plan, no card needed</li>
                {dayPass && <li><CheckIcon /> Unlimited day pass for ₹{Number(dayPass.price).toFixed(0)}</li>}
                <li><CheckIcon /> Works on your phone</li>
              </ul>
            </div>
            <ProductPreview />
          </div>
        </section>

        <section id="how" className="lp-section">
          <div className="lp-container">
            <div className="lp-section-head">
              <h2 className="lp-h2">How it works</h2>
              <p className="lp-section-sub">Three steps, about five minutes a day.</p>
            </div>
            <ol className="lp-steps">
              {steps.map((s, i) => (
                <li key={s.title} className="lp-step">
                  <span className="lp-step-num">{i + 1}</span>
                  <h3 className="lp-h3">{s.title}</h3>
                  <p>{s.desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="features" className="lp-section lp-section-alt">
          <div className="lp-container">
            <div className="lp-section-head">
              <h2 className="lp-h2">Everything you need to improve</h2>
              <p className="lp-section-sub">Built around speaking out loud, with feedback you can act on.</p>
            </div>
            <div className="lp-features">
              {features.map(({ Icon, title, desc }) => (
                <div key={title} className="lp-feature">
                  <span className="ui-icon-tile"><Icon /></span>
                  <div>
                    <h3 className="lp-h3">{title}</h3>
                    <p>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="lp-section">
          <div className="lp-container">
            <div className="lp-section-head">
              <h2 className="lp-h2">Simple pricing</h2>
              <p className="lp-section-sub">Start free. Upgrade for a day or a month when you need more practice.</p>
            </div>
            {plansLoading ? (
              <div className="lp-plans">{[0, 1, 2, 3].map((i) => <div key={i} className="ui-skeleton" style={{ height: 260, borderRadius: 8 }} />)}</div>
            ) : plans.length === 0 ? (
              <p className="lp-section-sub" style={{ textAlign: 'center' }}>Plans are not available right now.</p>
            ) : (
              <div className="lp-plans">
                {!hasFreePlan && (
                  <div className="lp-plan">
                    <div className="lp-plan-top"><h3 className="lp-h3">Free</h3></div>
                    <div className="lp-plan-price">Free</div>
                    <p className="lp-plan-meta">10 practice minutes per month</p>
                    <div className="lp-plan-desc">
                      <ul>
                        <li>5 starter topics</li>
                        <li>Session report with pace and filler words</li>
                        <li>No card needed</li>
                      </ul>
                    </div>
                    <Link to={isAuthenticated ? '/dashboard' : '/signup'} className="ui-btn ui-btn-secondary lp-plan-btn">Start free</Link>
                  </div>
                )}
                {plans.map((plan) => {
                  const isDayPass = plan.plan_type === 'day_pass';
                  const isFree = Number(plan.price) === 0;
                  const isBest = plan.id === bestValueId;
                  const meta = isDayPass
                    ? 'Unlimited practice for 24 hours'
                    : isFree ? '10 practice minutes per month'
                      : typeof plan.limit_minutes === 'number' ? `${plan.limit_minutes} practice minutes per month` : '';
                  return (
                    <div key={plan.id} className={`lp-plan ${isBest ? 'is-featured' : ''}`}>
                      <div className="lp-plan-top">
                        <h3 className="lp-h3">{plan.name}</h3>
                        {isBest && <span className="ui-chip ui-chip-accent">Best value</span>}
                      </div>
                      <div className="lp-plan-price">
                        {isFree ? 'Free' : `₹${Number(plan.price).toFixed(0)}`}
                        <span>{isDayPass ? ' / day' : isFree ? '' : ` / ${plan.duration} days`}</span>
                      </div>
                      {meta && <p className="lp-plan-meta">{meta}</p>}
                      {plan.description && <div className="lp-plan-desc" dangerouslySetInnerHTML={{ __html: plan.description }} />}
                      <Link to={isAuthenticated ? '/profile' : '/signup'} className={`ui-btn ${isBest ? 'ui-btn-primary' : 'ui-btn-secondary'} lp-plan-btn`}>
                        {isFree ? 'Start free' : isDayPass ? 'Get a day pass' : `Choose ${plan.name}`}
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section id="faq" className="lp-section lp-section-alt">
          <div className="lp-container lp-faq-wrap">
            <div className="lp-section-head">
              <h2 className="lp-h2">Questions people ask</h2>
              <p className="lp-section-sub">Everything you need to know before your first practice session.</p>
            </div>
            <div className="lp-faq">
              {FAQ.map(([q, a], i) => (
                <details key={q} className="lp-faq-item" open={i === 0}>
                  <summary>{q}</summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-final">
          <div className="lp-container lp-final-inner">
            <div>
              <h2 className="lp-h2">Your next conversation starts here</h2>
              <p className="lp-section-sub">Create a free account and finish your first session in under five minutes.</p>
            </div>
            {primaryCta}
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <BrandMark />
          <div className="lp-footer-links">
            <button type="button" onClick={() => scrollTo('pricing')}>Pricing</button>
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/refund-policy">Refunds</Link>
            <a href="tel:+917620722083">Support: +91 7620722083</a>
          </div>
          <span>© {new Date().getFullYear()} Articulate</span>
        </div>
      </footer>
    </div>
  );
}
