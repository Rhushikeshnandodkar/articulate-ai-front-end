import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { getPlans } from '../services/api';
import AuthLogo from '../components/AuthLogo';
import { Flame, Layers, Sparkles, FileText, Mic, BarChart3, Menu, X } from "lucide-react";
import './Landing.css';

const features = [
  {
    icon: <Mic size={22} />,
    title: "AI Voice Practice",
    desc: "Practice anytime with an intelligent AI partner that adapts to your skill level and responds naturally.",
    color: "bg-[#A7ED02]/10 text-[#A7ED02]",
  },
  {
    icon: <Layers size={22} />,
    title: "Personalized Topics",
    desc: "Choose from topics tailored to your interests — tech, career, sports, business, and more.",
    color: "bg-[#A7ED02]/10 text-[#A7ED02]",
  },
  {
    icon: <BarChart3 size={22} />,
    title: "Real-time Feedback",
    desc: "Get instant analysis on filler words, speaking pace (WPM), and confidence metrics after each session.",
    color: "bg-[#A7ED02]/10 text-[#A7ED02]",
  },
  {
    icon: <Sparkles size={22} />,
    title: "Badge System",
    desc: "Earn achievements from Bronze to Diamond as you progress. Celebrate milestones and stay motivated.",
    color: "bg-[#A7ED02]/10 text-[#A7ED02]",
  },
  {
    icon: <Flame size={22} />,
    title: "Streak Tracking",
    desc: "Build daily practice habits with streak tracking. Never lose momentum with gentle reminders.",
    color: "bg-[#A7ED02]/10 text-[#A7ED02]",
  },
  {
    icon: <FileText size={22} />,
    title: "Practice History",
    desc: "Review past sessions, transcripts, and track your improvement over time with detailed analytics.",
    color: "bg-[#A7ED02]/10 text-[#A7ED02]",
  },
];

const steps = [
  {
    number: "1",
    icon: <Layers size={20} />,
    title: "Choose Your Topic",
    desc: "Select from personalized topics based on your goals—interview prep, public speaking, sales pitches, or casual conversation practice.",
    color: "bg-[#A7ED02]/10 text-[#A7ED02]",
  },
  {
    number: "2",
    icon: <Mic size={20} />,
    title: "Speak with AI",
    desc: "Have a natural conversation with our AI coach. Practice interviews, presentations, or difficult discussions in a safe environment.",
    color: "bg-[#A7ED02]/10 text-[#A7ED02]",
  },
  {
    number: "3",
    icon: <BarChart3 size={20} />,
    title: "Get Detailed Feedback",
    desc: "Receive actionable insights on your filler words, speaking pace, confidence levels, and personalized tips to improve.",
    color: "bg-[#A7ED02]/10 text-[#A7ED02]",
  },
];

export default function Landing() {
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setPlansLoading(true);
    getPlans()
      .then((data) => {
        setPlans(Array.isArray(data?.plans) ? data.plans : []);
      })
      .catch(() => setPlans([]))
      .finally(() => setPlansLoading(false));
  }, []);

  const starterPlan = plans.find((p) => Number(p.price) === 0) || plans[0];

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white pb-[env(safe-area-inset-bottom)]">
      <div className="w-full">
      {/* NAVBAR */}
      <nav className="w-full border-b border-gray-800">
        <div className="w-[95%] md:w-[85%] mx-auto flex items-center justify-between px-4 md:px-8 py-4 md:py-5">
        <div className="flex items-center gap-2 md:gap-3">
          <AuthLogo className="w-7 h-7 md:w-8 md:h-8 text-[#A7ED02]" />
          <span className="text-lg md:text-xl font-semibold">
            articulate<span className="text-[#A7ED02]">.ai</span>
          </span>
        </div>

        <div className="hidden md:flex gap-8 text-gray-300 text-base">
          <button type="button" onClick={() => scrollToSection('features')} className="hover:text-white cursor-pointer bg-transparent border-none p-0">
            Features
          </button>
          <button type="button" onClick={() => scrollToSection('how-it-works')} className="hover:text-white cursor-pointer bg-transparent border-none p-0">
            How It Works
          </button>
          <button type="button" onClick={() => scrollToSection('pricing')} className="hover:text-white cursor-pointer bg-transparent border-none p-0">
            Pricing
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white"
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
          <Link
            to="/signup"
            className="hidden md:inline-block bg-[#A7ED02] hover:opacity-90 text-black font-medium px-5 py-2 rounded-lg text-base"
          >
            Start Practicing Free
          </Link>
        </div>
        </div>
      </nav>

      {/* MOBILE SIDEBAR */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="fixed top-0 right-0 bottom-0 w-64 max-w-[85vw] bg-[#0A0A0A] border-l border-gray-800 z-50 md:hidden flex flex-col p-6">
            <div className="flex justify-between items-center mb-6">
              <span className="text-lg font-semibold">Menu</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              <button type="button" onClick={() => scrollToSection('features')} className="text-left py-3 px-4 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white font-medium">
                Features
              </button>
              <button type="button" onClick={() => scrollToSection('how-it-works')} className="text-left py-3 px-4 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white font-medium">
                How It Works
              </button>
              <button type="button" onClick={() => scrollToSection('pricing')} className="text-left py-3 px-4 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white font-medium">
                Pricing
              </button>
            </nav>
            <Link
              to="/signup"
              onClick={() => setMobileMenuOpen(false)}
              className="mt-6 bg-[#A7ED02] hover:opacity-90 text-black font-medium py-3 rounded-lg text-center"
            >
              Start Practicing Free
            </Link>
          </aside>
        </>
      )}

      {/* HERO SECTION */}
    {/* HERO SECTION */}
<div className="w-[95%] md:w-[85%] mx-auto py-12 md:py-20 text-center flex flex-col items-center px-2">

{/* TOP BADGE */}
<span className="text-xs md:text-sm bg-gray-800 text-gray-300 px-2.5 md:px-3 py-1 rounded-full">
Improve Your Communication and Public Speaking Skills.
</span>

{/* HEADING */}
<h1 className="mt-4 md:mt-6 text-[1.75rem] sm:text-[2rem] md:text-[3.25rem] font-bold leading-tight max-w-7xl">
Improve Your Communication Skills. <br />
  <span className="text-[#A7ED02]">Speak Clearly & Confidently.</span> <br />
  Grow Your Personality.
</h1>

{/* DESCRIPTION */}
<p className="mt-4 md:mt-6 text-gray-400 max-w-2xl text-sm md:text-lg">
  Stop rehearsing alone in front of mirrors. Practice with AI that
  gives you real feedback on filler words, pace, and confidence —
  so you’re ready when it matters.
</p>

{/* BUTTONS */}
<div className="flex flex-col sm:flex-row gap-3 md:gap-4 mt-6 md:mt-8 w-full sm:w-auto">
  {isAuthenticated ? (
    <Link
      to="/dashboard"
      className="bg-[#A7ED02] hover:opacity-90 text-black px-5 py-2.5 md:px-6 md:py-3 rounded-lg font-medium text-sm md:text-base text-center"
    >
      Go to Dashboard →
    </Link>
  ) : (
    <>
      <Link
        to="/signup"
        className="bg-[#A7ED02] hover:opacity-90 text-black px-5 py-2.5 md:px-6 md:py-3 rounded-lg font-medium text-sm md:text-base text-center"
      >
        Start Free Practice →
      </Link>

      <button
        type="button"
        onClick={() => scrollToSection('how-it-works')}
        className="border border-gray-700 px-5 py-2.5 md:px-6 md:py-3 rounded-lg text-gray-300 hover:bg-gray-800 text-sm md:text-base"
      >
        See How It Works
      </button>
    </>
  )}
</div>

</div>
      <section id="features" className="bg-[#0A0A0A] text-white px-4 md:px-16 py-12 md:py-20">
      
      {/* TOP TEXT */}
      <div className="w-[95%] md:w-[85%] mx-auto text-center max-w-2xl">
        <span className="text-xs md:text-sm bg-[#A7ED02]/10 text-[#A7ED02] px-3 md:px-4 py-1 rounded-full">
          Powerful Features
        </span>

        <h2 className="mt-4 md:mt-6 text-2xl md:text-4xl font-bold">
          Everything You Need to{" "}
          <span className="text-[#A7ED02]">Improve</span>
        </h2>

        <p className="mt-3 md:mt-4 text-gray-400 text-sm md:text-lg">
          Our AI-powered platform gives you the tools and insights to become a
          more confident communicator
        </p>
      </div>

      {/* GRID */}
      <div className="w-[95%] md:w-[85%] mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mt-10 md:mt-14">
        {features.map((feature, i) => (
          <div
            key={i}
            className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-4 md:p-6 hover:border-[#A7ED02]/40 transition"
          >
            {/* ICON */}
            <div
              className={`w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-lg ${feature.color}`}
            >
              {feature.icon}
            </div>

            {/* TITLE */}
            <h3 className="mt-3 md:mt-4 text-base md:text-lg font-semibold">
              {feature.title}
            </h3>

            {/* DESC */}
            <p className="mt-1.5 md:mt-2 text-gray-400 text-sm md:text-base">
              {feature.desc}
            </p>
          </div>
        ))}
      </div>

      {/* BOTTOM CTA */}
      <div className="w-[95%] md:w-[85%] mx-auto text-center mt-8 md:mt-12">
        <Link
          to="/signup"
          className="text-[#A7ED02] hover:opacity-90 text-base font-medium inline-block"
        >
          View All Features →
        </Link>
      </div>
    </section>


    <section id="how-it-works" className="bg-[#0A0A0A] text-white px-4 md:px-16 py-12 md:py-20">
      
      {/* TOP TEXT */}
      <div className="w-[95%] md:w-[85%] mx-auto text-center max-w-2xl">
        <span className="text-xs md:text-sm bg-[#A7ED02]/10 text-[#A7ED02] px-3 md:px-4 py-1 rounded-full">
          Simple Process
        </span>

        <h2 className="mt-4 md:mt-6 text-2xl md:text-4xl font-bold">
          How It Works
        </h2>

        <p className="mt-3 md:mt-4 text-gray-400 text-sm md:text-lg">
          Get started in minutes and begin improving your communication skills today
        </p>
      </div>

      {/* STEPS */}
      <div className="relative w-[95%] md:w-[85%] mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 mt-10 md:mt-16">
        
        {steps.map((step, i) => (
          <div
            key={i}
            className="relative bg-[#0A0A0A] border border-gray-800 rounded-xl p-4 md:p-6 hover:border-[#A7ED02]/40 transition"
          >
            {/* STEP NUMBER */}
            <div className="absolute -top-3 md:-top-4 left-4 md:left-6 bg-[#A7ED02] text-black text-xs md:text-sm font-semibold px-2 md:px-3 py-0.5 md:py-1 rounded-md">
              {step.number}
            </div>

            {/* ICON */}
            <div
              className={`w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-lg ${step.color}`}
            >
              {step.icon}
            </div>

            {/* TITLE */}
            <h3 className="mt-3 md:mt-4 text-base md:text-lg font-semibold">
              {step.title}
            </h3>

            {/* DESC */}
            <p className="mt-1.5 md:mt-2 text-gray-400 text-sm md:text-base">
              {step.desc}
            </p>

            {/* ARROW (only for md+) */}
            {i !== steps.length - 1 && (
              <div className="hidden md:block absolute top-1/2 -right-6 transform -translate-y-1/2 text-gray-600 text-2xl">
                →
              </div>
            )}
          </div>
        ))}
      </div>

      {/* CTA BUTTON */}
      <div className="w-[95%] md:w-[85%] mx-auto text-center mt-10 md:mt-14">
        <Link
          to="/signup"
          className="inline-block bg-[#A7ED02] hover:opacity-90 text-black px-6 py-2.5 md:px-8 md:py-3 rounded-lg font-medium shadow-lg transition text-sm md:text-base"
        >
          Start Your First Session →
        </Link>
      </div>
    </section>
    <section id="pricing" className="bg-[#0A0A0A] text-white py-12 md:py-24">
      <div className="w-[95%] md:w-[75%] mx-auto">
        
        {/* HEADER */}
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-xl md:text-3xl font-bold">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-2 md:mt-3 text-gray-400 text-xs md:text-sm">
            Choose the plan that fits your journey
          </p>
        </div>

        {/* CARDS */}
        {plansLoading ? (
          <p className="mt-12 md:mt-16 text-gray-400 text-center text-sm">Loading plans…</p>
        ) : plans.length === 0 ? (
          <p className="mt-12 md:mt-16 text-gray-400 text-center text-sm">
            No plans available at the moment.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mt-8 md:mt-12 w-full mx-auto">
            {plans.map((plan) => {
              const isStarter = Number(plan.price) === 0 || plan.id === starterPlan?.id;
              const priceLabel = Number(plan.price) === 0 ? 'Free' : `₹${Number(plan.price).toFixed(2)}`;

              return (
                <div
                  key={plan.id}
                  className={`relative bg-[#0A0A0A] border rounded-xl p-3 md:p-4 flex flex-col justify-between
              ${isStarter ? 'border-[#A7ED02]' : 'border-gray-800'}`}
                >
                  {/* BADGE */}
                  {isStarter && (
                    <div className="absolute top-2 right-2 md:top-3 md:right-3 bg-[#A7ED02] text-black text-[0.65rem] md:text-xs px-1.5 md:px-2 py-0.5 rounded-full font-semibold">
                      Starter
                    </div>
                  )}

                  {/* TITLE */}
                  <div>
                    <h3 className="text-base md:text-lg font-semibold">{plan.name}</h3>

                    <p className="mt-1 text-[#A7ED02] font-medium text-sm md:text-base">
                      {priceLabel} / month
                    </p>

                    <div
                      className="mt-3 md:mt-4 landing-plan-description"
                      dangerouslySetInnerHTML={{ __html: plan.description || '' }}
                    />
                  </div>

                  {/* CTA */}
                  <Link
                    to="/signup"
                    className={`mt-3 md:mt-4 w-full py-2 md:py-2.5 rounded-lg font-medium transition block text-center text-xs md:text-sm
                ${
                  isStarter
                    ? 'bg-[#A7ED02] hover:opacity-90 text-black'
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700'
                }`}
                  >
                    {isStarter ? 'Starter Plan' : 'Get Started'}
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
    </div>
    <section className="relative w-screen max-w-none left-1/2 -translate-x-1/2 bg-[#0B0F19] text-white py-12 md:py-24 px-4 md:px-16 overflow-hidden">
      
      {/* BACKGROUND GLOW */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#A7ED02]/10 via-[#A7ED02]/6 to-[#A7ED02]/10 blur-3xl opacity-40"></div>

      <div className="relative max-w-3xl mx-auto text-center px-2">
        
        {/* TOP BADGE */}
        <span className="text-xs md:text-sm bg-gray-800 text-gray-300 px-3 md:px-4 py-1 rounded-full">
          ✨ Free to start. No credit card required.
        </span>

        {/* HEADING */}
        <h2 className="mt-4 md:mt-6 text-2xl md:text-5xl font-bold leading-tight">
          Ready to Transform Your <br />
          <span className="text-[#A7ED02]">Communication Skills?</span>
        </h2>

        {/* DESCRIPTION */}
        <p className="mt-4 md:mt-6 text-gray-400 max-w-2xl mx-auto text-sm md:text-lg">
          Join thousands of professionals, students, and leaders who are
          practicing daily to become more confident speakers. Your first
          session is free.
        </p>

        {/* BUTTONS */}
        <div className="flex flex-col sm:flex-row justify-center gap-3 md:gap-4 mt-6 md:mt-8">
          <Link
            to="/signup"
            className="bg-[#A7ED02] hover:opacity-90 text-black px-6 py-2.5 md:px-8 md:py-3 rounded-lg font-medium shadow-lg transition text-center text-sm md:text-base"
          >
            Start Practicing Free →
          </Link>

          <button
            type="button"
            onClick={() => scrollToSection('pricing')}
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-6 py-2.5 md:px-8 md:py-3 rounded-lg font-medium border border-gray-700 text-sm md:text-base"
          >
            View Pricing
          </button>
        </div>

        {/* TRUST TEXT */}
        <p className="mt-6 md:mt-8 text-xs md:text-sm text-gray-500">
          Trusted by professionals from companies like Google, Amazon, and Microsoft
        </p>
      </div>
    </section>
    </div>
  );
}