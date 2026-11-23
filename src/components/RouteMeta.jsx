import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE = 'https://articulateai.in';
const DEFAULT_TITLE = 'Articulate – Practice Spoken English with an AI Coach';
const DEFAULT_DESC = 'Practice spoken English out loud with an AI coach and get instant feedback on pace, filler words and pauses. Made for learners across India. Start free, plans from ₹99 a month.';

/* Title and description per public page (what search engines show). App pages get a plain title. */
const META = {
  '/': [DEFAULT_TITLE, DEFAULT_DESC],
  '/login': ['Log in – Articulate', 'Log in to Articulate and continue practising spoken English with your AI coach.'],
  '/signup': ['Create a free account – Articulate', 'Sign up free and start practising spoken English with an AI speaking coach. Get feedback on pace, filler words and pauses.'],
  '/terms': ['Terms and Conditions – Articulate', 'Terms and Conditions for using Articulate, the AI spoken English practice app, under Indian law.'],
  '/privacy': ['Privacy Policy – Articulate', 'How Articulate collects, uses and protects your personal data under the Digital Personal Data Protection Act, 2023.'],
  '/refund-policy': ['Refund and Cancellation Policy – Articulate', 'How plans, cancellations and refunds work for Articulate purchases.'],
  '/dashboard': ['Home – Articulate'],
  '/topics': ['Topics – Articulate'],
  '/talking-agent': ['Free talk – Articulate'],
  '/conversations': ['Sessions – Articulate'],
  '/profile': ['Settings – Articulate'],
  '/voice': ['Practice session – Articulate'],
  '/profile-setup': ['Set up your profile – Articulate'],
  '/verify-email': ['Verify your email – Articulate'],
};

function setMeta(selector, attr, value) {
  const el = document.head.querySelector(selector);
  if (el) el.setAttribute(attr, value);
}

export default function RouteMeta() {
  const { pathname } = useLocation();
  useEffect(() => {
    const key = pathname.startsWith('/conversations/') ? '/conversations' : pathname;
    const [title, desc] = META[key] || [DEFAULT_TITLE];
    document.title = title;
    const description = desc || DEFAULT_DESC;
    setMeta('meta[name="description"]', 'content', description);
    setMeta('meta[property="og:title"]', 'content', title);
    setMeta('meta[property="og:description"]', 'content', description);
    setMeta('meta[property="og:url"]', 'content', SITE + (key === '/' ? '/' : key));
    setMeta('link[rel="canonical"]', 'href', SITE + (key === '/' ? '/' : key));
    /* Keep private app pages out of search results. */
    const isPublic = ['/', '/login', '/signup', '/terms', '/privacy', '/refund-policy'].includes(key);
    setMeta('meta[name="robots"]', 'content', isPublic ? 'index, follow' : 'noindex, nofollow');
  }, [pathname]);
  return null;
}
