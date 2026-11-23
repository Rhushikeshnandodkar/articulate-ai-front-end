import { Link, NavLink, useLocation } from 'react-router-dom';
import { BrandMark } from '../components/AuthLayout';
import '../styles/landing.css';
import '../styles/legal.css';

/* Business details shown in the legal pages. Empty fields are simply not shown.
   Fill in the registered name, postal address and email once available. */
export const LEGAL_INFO = {
  brand: 'Articulate',
  website: 'https://articulateai.in',
  legalName: '',          // e.g. registered business or proprietor name
  address: '',            // registered postal address in India
  email: '',              // support / grievance email
  phoneDisplay: '+91 7620722083',
  phoneTel: '+917620722083',
  lastUpdated: '23 November 2026',
};

function Contact() {
  const i = LEGAL_INFO;
  return (
    <ul className="legal-contact">
      <li><strong>Grievance Officer, {i.brand}</strong></li>
      {i.legalName && <li>{i.legalName}</li>}
      {i.address && <li>{i.address}</li>}
      <li>Phone: <a href={`tel:${i.phoneTel}`}>{i.phoneDisplay}</a> (Monday to Saturday, 10 am to 6 pm IST)</li>
      {i.email && <li>Email: <a href={`mailto:${i.email}`}>{i.email}</a></li>}
      <li>Website: <a href={i.website}>{i.website.replace('https://', '')}</a></li>
    </ul>
  );
}

const operator = () => (LEGAL_INFO.legalName ? `${LEGAL_INFO.legalName} ("we", "us", "our")` : 'the team behind Articulate ("we", "us", "our")');

function Terms() {
  return (
    <>
      <h1>Terms and Conditions</h1>
      <p className="legal-meta">Last updated: {LEGAL_INFO.lastUpdated}</p>
      <p>
        These Terms and Conditions ("Terms") govern your use of the Articulate website at articulateai.in, the Articulate
        mobile app and related services (together, the "Service"), operated by {operator()}. By creating an account or
        using the Service you agree to these Terms and to our <Link to="/privacy">Privacy Policy</Link> and{' '}
        <Link to="/refund-policy">Refund and Cancellation Policy</Link>. If you do not agree, please do not use the Service.
      </p>
      <p>
        These Terms are an electronic record under the Information Technology Act, 2000 and the rules made under it, and
        do not need a physical or digital signature.
      </p>

      <h2>1. Who can use Articulate</h2>
      <p>
        You must be at least 18 years old to create an account. If you are under 18, you may use Articulate only with the
        verifiable consent and supervision of a parent or legal guardian, who agrees to these Terms on your behalf. We do
        not knowingly track, profile or show targeted advertising to children.
      </p>

      <h2>2. What the Service does</h2>
      <p>
        Articulate is an AI-powered speaking practice tool. You speak answers out loud; the Service turns your speech into
        text, an AI coach replies with questions, and you receive feedback such as speaking pace, filler words and pauses.
        Feedback is generated automatically by software and may sometimes be inaccurate or incomplete. Articulate is a
        practice aid; it is not a certified course, language test, professional advice or a guarantee of any result in an
        exam, interview or job.
      </p>

      <h2>3. Your account</h2>
      <ul>
        <li>Give accurate information when you sign up and keep it up to date.</li>
        <li>Keep your password confidential. You are responsible for activity on your account.</li>
        <li>One account is for one person. Do not share, sell or transfer your account.</li>
        <li>Tell us promptly if you believe your account has been used without your permission.</li>
      </ul>

      <h2>4. Plans, prices and payment</h2>
      <ul>
        <li>We offer a free allowance and paid plans. Current prices, minutes and features are shown on our pricing section and in the app before you pay.</li>
        <li>Prices are in Indian Rupees (INR) and include applicable taxes unless stated otherwise.</li>
        <li>Monthly plans give access for 30 days from purchase. The Day Pass gives access for 24 hours from purchase.</li>
        <li>Practice minutes are counted while you are speaking. Unused minutes do not carry over and have no cash value.</li>
        <li>Plans bought on the website are one-time payments through Razorpay and do not renew automatically. Purchases in the Android app are processed by Google Play under its terms.</li>
        <li>We may change prices or plans in future. Changes do not affect a plan you have already paid for during its validity.</li>
      </ul>
      <p>Refunds are covered by our <Link to="/refund-policy">Refund and Cancellation Policy</Link>.</p>

      <h2>5. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>use the Service for anything unlawful, or to upload content that is obscene, defamatory, hateful, threatening, harmful to children, infringes anyone's rights, or is otherwise prohibited under Rule 3 of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021;</li>
        <li>impersonate another person or misrepresent your identity;</li>
        <li>attempt to break, overload, scrape, copy, reverse engineer or gain unauthorised access to the Service or its systems;</li>
        <li>use bots or automated tools to access the Service, or resell it without our written permission.</li>
      </ul>
      <p>We may suspend or close accounts that break these rules, and report unlawful activity to the authorities where required.</p>

      <h2>6. Your content</h2>
      <p>
        You own what you say and write in Articulate. You give us a limited licence to process your recordings, transcripts
        and profile details only to provide, secure and improve the Service, as described in our{' '}
        <Link to="/privacy">Privacy Policy</Link>. We do not sell your personal data. Voice recordings are processed to
        create a transcript and are not stored on our servers after that.
      </p>

      <h2>7. AI-generated content</h2>
      <p>
        Coach questions, suggestions, "better version" rewrites and grammar tips are generated by AI. Use your own judgement
        before relying on them. We are not responsible for decisions you make based on AI-generated content.
      </p>

      <h2>8. Intellectual property</h2>
      <p>
        The Articulate name, logo, software, design and content created by us are our property and are protected by Indian
        and international law. You may not use them without our written permission, except as needed to use the Service.
      </p>

      <h2>9. Availability and changes</h2>
      <p>
        We work to keep Articulate available, but it may sometimes be interrupted for maintenance, updates or reasons beyond
        our control. We may add, change or remove features. The Service is provided "as is" and "as available" to the extent
        permitted by law.
      </p>

      <h2>10. Limitation of liability</h2>
      <p>
        To the extent permitted by law, we are not liable for indirect, incidental or consequential losses, or for loss of
        data, opportunity or profit. Our total liability for any claim relating to the Service is limited to the amount you
        paid us in the three months before the claim arose. Nothing in these Terms limits your rights as a consumer under the
        Consumer Protection Act, 2019 or any liability that cannot be limited by law.
      </p>

      <h2>11. Ending your use</h2>
      <p>
        You can stop using Articulate at any time and ask us to delete your account by contacting us (see below). We may
        suspend or end your access if you break these Terms or if required by law. Sections that by their nature should
        continue (such as intellectual property, limitation of liability and governing law) survive termination.
      </p>

      <h2>12. Governing law and disputes</h2>
      <p>
        These Terms are governed by the laws of India. Please contact our Grievance Officer first so we can try to resolve any
        issue. Subject to that, disputes will be subject to the jurisdiction of the competent courts in India, without
        affecting your right to approach a consumer commission under the Consumer Protection Act, 2019.
      </p>

      <h2>13. Grievance redressal</h2>
      <p>
        In line with the Information Technology Act, 2000, its rules, and the Consumer Protection (E-Commerce) Rules, 2020,
        you can raise a complaint with our Grievance Officer. We will acknowledge your complaint within 48 hours and aim to
        resolve it within 30 days of receiving it.
      </p>
      <Contact />

      <h2>14. Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. We will show the new "Last updated" date here and, for important changes,
        tell you in the app or by email. Continuing to use the Service after changes take effect means you accept them.
      </p>
    </>
  );
}

function Privacy() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="legal-meta">Last updated: {LEGAL_INFO.lastUpdated}</p>
      <p>
        This Privacy Policy explains how {operator()} collects, uses, shares and protects your personal data when you use the
        Articulate website, app and services. We process personal data in line with the Digital Personal Data Protection Act,
        2023 ("DPDP Act"), the Information Technology Act, 2000 and the Information Technology (Reasonable Security Practices
        and Procedures and Sensitive Personal Data or Information) Rules, 2011.
      </p>

      <h2>1. Data we collect</h2>
      <ul>
        <li><strong>Account details:</strong> username, email address and password (stored only in encrypted, hashed form). If you sign in with Google, we receive your name and email address from Google.</li>
        <li><strong>Practice profile:</strong> your profession, goal, speaking level, interests and optional bio.</li>
        <li><strong>Voice and transcripts:</strong> your spoken answers are sent for transcription. We keep the text transcripts, the AI coach's replies and the feedback for your session reports. The audio itself is not stored on our servers after transcription.</li>
        <li><strong>Practice activity:</strong> sessions, minutes used, streaks, scores and topics practised.</li>
        <li><strong>Payments:</strong> plan purchased, amount, date and payment or order IDs. Card, UPI and bank details are entered directly with Razorpay or Google Play; we never see or store them.</li>
        <li><strong>Device and usage data:</strong> browser and device type, pages visited, approximate location from IP address and how you use the site, collected through cookies and similar technologies.</li>
      </ul>

      <h2>2. Why we use it</h2>
      <ul>
        <li>To create and run your account and provide practice sessions, transcripts and feedback.</li>
        <li>To personalise topics and suggestions to your interests and level.</li>
        <li>To process payments, activate plans and prevent fraud.</li>
        <li>To send essential messages such as verification codes and account notices.</li>
        <li>To provide support and handle complaints.</li>
        <li>To keep the Service secure and to understand and improve how it works.</li>
        <li>To meet legal obligations.</li>
      </ul>
      <p>
        We process your data on the basis of the consent you give when you create an account, and for legitimate uses allowed
        under the DPDP Act, such as providing a service you asked for and complying with law.
      </p>

      <h2>3. Who we share it with</h2>
      <p>We do not sell your personal data. We share it only with service providers who process it for us under contract:</p>
      <ul>
        <li><strong>Groq</strong>: speech-to-text, AI coach replies and the AI voice.</li>
        <li><strong>Razorpay</strong> and <strong>Google Play</strong>: payments.</li>
        <li><strong>Google</strong>: Google Sign-In, Google Analytics (website usage statistics) and Google Fonts.</li>
        <li><strong>Microsoft Clarity</strong>: anonymised usage insights such as heatmaps and session replays, used to improve the design.</li>
        <li><strong>DigitalOcean</strong>: hosting of our servers in Bengaluru, India.</li>
        <li><strong>Email delivery provider</strong>: sending verification codes and account emails.</li>
      </ul>
      <p>
        Some of these providers may process data outside India. Such transfers are made as permitted under the DPDP Act. We may
        also disclose data where required by law, court order or a government authority.
      </p>

      <h2>4. How long we keep it</h2>
      <p>
        We keep your account data, transcripts and reports while your account is active. If you ask us to delete your account,
        we delete or anonymise your personal data within 30 days, except records we must keep by law (such as payment records
        for tax purposes).
      </p>

      <h2>5. Your rights</h2>
      <p>Under the DPDP Act you have the right to:</p>
      <ul>
        <li>get a summary of the personal data we hold about you and how it is used;</li>
        <li>correct, complete or update your data (you can edit your practice profile in Settings at any time);</li>
        <li>ask us to erase your data and close your account;</li>
        <li>withdraw your consent at any time (this does not affect processing already done);</li>
        <li>nominate another person to exercise your rights in case of death or incapacity;</li>
        <li>raise a grievance with us and, if not resolved, with the Data Protection Board of India.</li>
      </ul>
      <p>To use any of these rights, contact our Grievance Officer below. We may need to verify your identity first.</p>

      <h2>6. Children</h2>
      <p>
        If you are under 18, you may use Articulate only with the verifiable consent of a parent or legal guardian. We do not
        track, profile or target advertising at children. If you believe a child has signed up without consent, contact us and
        we will delete the account.
      </p>

      <h2>7. Security</h2>
      <p>
        We use reasonable security practices, including encrypted connections (HTTPS), hashed passwords, access controls and
        limited staff access. No system is completely secure, but we work to protect your data and will notify you and the
        authorities of a personal data breach as required by law.
      </p>

      <h2>8. Cookies and local storage</h2>
      <p>
        We use cookies and local storage to keep you signed in, remember your theme and measure usage through Google Analytics
        and Microsoft Clarity. You can block or delete cookies in your browser settings, though some features may not work
        properly without them.
      </p>

      <h2>9. Grievance Officer and contact</h2>
      <p>For questions, requests or complaints about your personal data, contact:</p>
      <Contact />
      <p>We will acknowledge your request within 48 hours and respond within 30 days.</p>

      <h2>10. Changes to this policy</h2>
      <p>
        We may update this policy. We will change the "Last updated" date above and, for important changes, tell you in the app
        or by email.
      </p>
    </>
  );
}

function Refund() {
  return (
    <>
      <h1>Refund and Cancellation Policy</h1>
      <p className="legal-meta">Last updated: {LEGAL_INFO.lastUpdated}</p>
      <p>
        We want every rupee you spend on Articulate to be worth it. This policy explains how plans, cancellations and refunds
        work for purchases made on articulateai.in through Razorpay.
      </p>

      <h2>1. How plans work</h2>
      <ul>
        <li>Monthly plans are valid for 30 days from purchase. The Day Pass is valid for 24 hours from purchase.</li>
        <li>Plans bought on the website are one-time payments. They do not renew automatically, so you are never charged again without choosing to buy.</li>
        <li>Unused minutes expire at the end of the plan and are not refunded.</li>
      </ul>

      <h2>2. Cancellation</h2>
      <p>
        Because plans do not renew automatically, there is nothing to cancel: your plan simply ends when its validity is over.
        You can stop using the Service at any time.
      </p>

      <h2>3. When you can get a refund</h2>
      <ul>
        <li><strong>Within 7 days, if you have barely used it:</strong> if you bought a monthly plan and have used 15 practice minutes or less, you can ask for a full refund within 7 days of purchase.</li>
        <li><strong>Charged twice:</strong> duplicate payments for the same plan are refunded in full.</li>
        <li><strong>Payment taken but plan not activated:</strong> if money was deducted but your plan did not start, and we cannot activate it, we refund in full.</li>
        <li><strong>Service not working for you:</strong> if a technical problem on our side stopped you from using the plan and we could not fix it within a reasonable time, we will refund the unused part or the full amount.</li>
      </ul>
      <p>
        The Day Pass is not refundable once it has been used, because it is valid for only 24 hours. Failed payments where money
        was debited are usually reversed automatically by your bank or Razorpay within 5 to 7 working days.
      </p>

      <h2>4. How to ask for a refund</h2>
      <p>
        Contact us with your registered email or username, the date of payment and the payment ID shown in your Razorpay
        receipt. We will review your request within 3 working days. Approved refunds are sent to your original payment method,
        and usually reach your account within 5 to 7 working days, depending on your bank.
      </p>
      <Contact />

      <h2>5. Purchases made through Google Play</h2>
      <p>
        Plans bought inside the Android app are processed by Google Play. Refunds and cancellations for those purchases follow
        Google Play's refund policy and can be requested through Google Play.
      </p>
    </>
  );
}

const DOCS = {
  '/terms': { label: 'Terms and Conditions', Component: Terms },
  '/privacy': { label: 'Privacy Policy', Component: Privacy },
  '/refund-policy': { label: 'Refund Policy', Component: Refund },
};

export default function Legal() {
  const { pathname } = useLocation();
  const doc = DOCS[pathname] || DOCS['/terms'];
  const { Component } = doc;
  return (
    <div className="lp legal">
      <header className="lp-nav">
        <div className="lp-container lp-nav-inner">
          <BrandMark />
          <div className="lp-nav-actions">
            <Link to="/login" className="ui-btn ui-btn-ghost ui-btn-sm lp-login">Log in</Link>
            <Link to="/signup" className="ui-btn ui-btn-primary ui-btn-sm">Sign up</Link>
          </div>
        </div>
      </header>
      <div className="lp-container legal-layout">
        <nav className="legal-nav" aria-label="Legal documents">
          {Object.entries(DOCS).map(([path, d]) => (
            <NavLink key={path} to={path} className={({ isActive }) => (isActive ? 'is-active' : '')}>{d.label}</NavLink>
          ))}
        </nav>
        <article className="legal-doc">
          <Component />
        </article>
      </div>
      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <span>© {new Date().getFullYear()} Articulate</span>
          <div className="lp-footer-links">
            <Link to="/">Home</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/refund-policy">Refunds</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
