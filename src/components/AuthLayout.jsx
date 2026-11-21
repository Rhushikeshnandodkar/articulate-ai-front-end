import { Link } from 'react-router-dom';
import { MicIcon, CheckIcon } from './icons';
import '../styles/auth.css';

export function BrandMark({ to = '/' }) {
  return (
    <Link to={to} className="auth-brand">
      <span className="app-brand-mark"><MicIcon /></span>
      <span>articulate<span className="app-brand-dot">.ai</span></span>
    </Link>
  );
}

/** Two-panel auth screen: brand + product preview on desktop, form only on phones. */
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth">
      <aside className="auth-aside" aria-hidden>
        <BrandMark />
        <div className="auth-aside-body">
          <h2 className="auth-aside-title">Speak clearly and confidently, one short session at a time.</h2>
          <ul className="auth-aside-points">
            <li><CheckIcon /> Practice real conversations with an AI coach</li>
            <li><CheckIcon /> See your pace, filler words and pauses</li>
            <li><CheckIcon /> Get specific tips after every session</li>
          </ul>
          <div className="auth-preview">
            <div className="auth-preview-head">
              <span>Session report</span>
              <span className="auth-preview-good">Good</span>
            </div>
            <div className="auth-preview-title">Explain one idea in simple words</div>
            <div className="auth-preview-stats">
              <div><strong>141</strong><span>wpm</span></div>
              <div><strong>3</strong><span>fillers</span></div>
              <div><strong>4m</strong><span>spoken</span></div>
            </div>
            <div className="auth-preview-bar"><span style={{ left: '40%', width: '20%' }} /><i style={{ left: '54%' }} /></div>
            <p className="auth-preview-tip">Clear structure. Pause after key points so they land.</p>
          </div>
        </div>
        <p className="auth-aside-foot">© {new Date().getFullYear()} articulate.ai</p>
      </aside>

      <main className="auth-main">
        <div className="auth-mobile-brand"><BrandMark /></div>
        <div className="auth-panel">
          <h1 className="auth-title">{title}</h1>
          {subtitle && <p className="auth-sub">{subtitle}</p>}
          {children}
          {footer && <div className="auth-footer">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
