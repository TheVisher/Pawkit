'use client';

import { Link } from '@tanstack/react-router';
import { motion, useReducedMotion } from 'framer-motion';
import { ParticleField } from './particle-field';
import {
  Layers,
  Calendar,
  BookOpen,
  Sparkles,
  ArrowRight,
  Check,
  Shield,
  Search,
  Zap
} from 'lucide-react';

const features = [
  {
    icon: Layers,
    title: 'Capture anything',
    description: 'Save links, notes, highlights, and files in seconds. No friction, no clutter.'
  },
  {
    icon: Search,
    title: 'Find instantly',
    description: 'Tags, smart filters, and focused search help you pull the exact thing you need.'
  },
  {
    icon: Calendar,
    title: 'Plan with context',
    description: 'Tasks and events live alongside your knowledge so planning feels effortless.'
  },
  {
    icon: Sparkles,
    title: 'Daily focus',
    description: 'A calm dashboard keeps the most important items front and center.'
  }
];

const steps = [
  {
    title: 'Collect',
    description: 'Clip a link, jot a note, or paste a thought the moment it lands.'
  },
  {
    title: 'Shape',
    description: 'Tag, group, and enrich with just enough structure to stay organized.'
  },
  {
    title: 'Use',
    description: 'Turn ideas into projects, plans, and decisions when it matters most.'
  }
];

const trustPoints = [
  {
    icon: Shield,
    title: 'Account scoped workspaces',
    description: 'Your workspaces stay tied to your account with clear ownership boundaries.'
  },
  {
    icon: Zap,
    title: 'Real-time sync',
    description: 'Convex keeps your data in sync across devices without extra setup.'
  },
  {
    icon: BookOpen,
    title: 'Soft delete safety',
    description: 'Items move to trash before they are removed so you can recover quickly.'
  }
];

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.25),transparent_70%)]">
        <div className="h-4 w-4 rounded-md bg-gradient-to-br from-cyan-300 via-sky-300 to-violet-400" />
      </div>
      <div className="leading-tight">
        <div className="text-lg font-semibold text-text-primary font-[var(--font-landing-display)]">Pawkit</div>
        <div className="text-xs uppercase tracking-[0.2em] text-text-muted">workspace</div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-6 shadow-[var(--glass-shadow)] backdrop-blur-[var(--glass-blur)]">
      <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{
        background: 'linear-gradient(140deg, rgba(56,189,248,0.18), transparent 60%)'
      }} />
      <div className="relative">
        <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/5">
          <Icon className="h-5 w-5 text-sky-200" />
        </div>
        <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
        <p className="mt-2 text-sm text-text-secondary leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function StepCard({ index, title, description }: { index: string; title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-panel-bg)] p-6 shadow-[var(--glass-shadow)] backdrop-blur-[var(--glass-blur)]">
      <div className="text-xs uppercase tracking-[0.25em] text-text-muted">{index}</div>
      <div className="mt-3 text-lg font-semibold text-text-primary">{title}</div>
      <p className="mt-2 text-sm text-text-secondary leading-relaxed">{description}</p>
    </div>
  );
}

export function LandingPage() {
  const reduceMotion = useReducedMotion();
  const container = {
    hidden: { opacity: 0, y: 18 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.12,
        when: 'beforeChildren'
      }
    }
  };
  const item = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-bg-base text-text-primary">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-[-12%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,rgba(45,212,191,0.28),transparent_70%)] blur-3xl" />
        <div className="absolute top-10 right-[-8%] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle_at_center,rgba(147,197,253,0.25),transparent_70%)] blur-3xl" />
        <div className="absolute bottom-[-20%] left-[10%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.18),transparent_70%)] blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)',
            backgroundSize: '26px 26px'
          }}
        />
      </div>

      <ParticleField />

      <div className="relative z-10">
        <header className="fixed top-0 left-0 right-0 z-50">
          <div className="mx-auto max-w-6xl px-6 py-4">
            <div className="flex items-center justify-between rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-panel-bg)] px-6 py-3 shadow-[var(--glass-shadow)] backdrop-blur-[var(--glass-blur)]">
              <Logo />
              <nav className="hidden md:flex items-center gap-8 text-sm text-text-secondary" aria-label="Primary">
                <a href="#features" className="transition-colors hover:text-text-primary">Features</a>
                <a href="#workflow" className="transition-colors hover:text-text-primary">Workflow</a>
                <a href="#trust" className="transition-colors hover:text-text-primary">Trust</a>
              </nav>
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors px-4 py-2"
                >
                  Sign in
                </Link>
                <Link
                  to="/signup"
                  className="text-sm font-medium text-slate-900 px-4 py-2 rounded-xl bg-white hover:bg-slate-100 transition-colors"
                >
                  Get started
                </Link>
              </div>
            </div>
          </div>
        </header>

        <main className="pt-32">
          <section className="px-6 pb-20">
            <motion.div
              className="mx-auto max-w-6xl grid gap-12 lg:grid-cols-[1.1fr_0.9fr] items-center"
              variants={container}
              initial={reduceMotion ? 'show' : 'hidden'}
              animate="show"
            >
              <motion.div variants={item} className="text-left">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.2em] text-text-secondary">
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-300" />
                  Built for calm, modern knowledge work
                </div>
                <h1 className="mt-6 text-5xl md:text-6xl lg:text-7xl font-[var(--font-landing-display)] leading-[1.05]">
                  Your second brain, tuned for momentum.
                </h1>
                <p className="mt-6 text-lg md:text-xl text-text-secondary max-w-xl">
                  Pawkit captures everything you care about and keeps it organized, searchable, and ready to use.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <Link
                    to="/signup"
                    className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 via-sky-300 to-violet-400 px-7 py-4 text-sm font-semibold text-slate-900 transition-transform hover:-translate-y-0.5"
                  >
                    Start for free
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <a
                    href="#workflow"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-7 py-4 text-sm font-semibold text-text-primary transition-colors hover:bg-white/10"
                  >
                    See the workflow
                  </a>
                </div>
                <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-text-secondary">
                  {[
                    'No credit card required',
                    'Password strength enforced',
                    'Syncs across devices'
                  ].map((itemText) => (
                    <div key={itemText} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-300" />
                      <span>{itemText}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div variants={item} className="relative">
                <div className="absolute inset-0 -z-10 rounded-[32px] bg-gradient-to-br from-white/10 via-transparent to-transparent blur-2xl" />
                <div className="rounded-[32px] border border-[var(--glass-border)] bg-[var(--glass-panel-bg)] p-6 shadow-[var(--glass-shadow)] backdrop-blur-[var(--glass-blur)]">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-text-muted">
                    <span>Today</span>
                    <span>Workspace</span>
                  </div>
                  <div className="mt-6 grid gap-4">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-sm font-semibold">Launch plan</div>
                      <p className="mt-2 text-sm text-text-secondary">Outline launch notes, checklist, and stakeholder updates.</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-sm font-semibold">Saved article</div>
                      <p className="mt-2 text-sm text-text-secondary">Extracted summary and key highlights ready for review.</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-sm font-semibold">Next steps</div>
                      <ul className="mt-2 space-y-2 text-sm text-text-secondary">
                        <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-sky-300" />Share beta invite</li>
                        <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-violet-300" />Publish landing update</li>
                        <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-amber-300" />Schedule onboarding call</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </section>

          <section id="features" className="px-6 py-20">
            <div className="mx-auto max-w-6xl">
              <div className="max-w-2xl">
                <h2 className="text-3xl md:text-4xl font-[var(--font-landing-display)]">Everything you need, in one calm workspace.</h2>
                <p className="mt-4 text-text-secondary">
                  Stop switching between tabs. Pawkit keeps your ideas, tasks, and references together without the noise.
                </p>
              </div>
              <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {features.map((feature) => (
                  <FeatureCard key={feature.title} {...feature} />
                ))}
              </div>
            </div>
          </section>

          <section id="workflow" className="px-6 py-20">
            <div className="mx-auto max-w-6xl grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.2em] text-text-secondary">
                  Simple workflow
                </div>
                <h2 className="mt-6 text-3xl md:text-4xl font-[var(--font-landing-display)]">From capture to clarity in minutes.</h2>
                <p className="mt-4 text-text-secondary">
                  The flow stays the same whether you are saving a quick link or building a deep project archive.
                </p>
                <div className="mt-8 flex items-center gap-3 text-sm text-text-secondary">
                  <Sparkles className="h-4 w-4 text-sky-200" />
                  Flexible enough for creators, teams, and solo operators.
                </div>
              </div>
              <div className="grid gap-4">
                {steps.map((step, index) => (
                  <StepCard key={step.title} index={`0${index + 1}`} title={step.title} description={step.description} />
                ))}
              </div>
            </div>
          </section>

          <section id="trust" className="px-6 py-20">
            <div className="mx-auto max-w-6xl">
              <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
                <div>
                  <h2 className="text-3xl md:text-4xl font-[var(--font-landing-display)]">Built for trust and staying power.</h2>
                  <p className="mt-4 text-text-secondary">
                    The core experience is designed to be stable, secure, and reliable from day one.
                  </p>
                </div>
                <div className="grid gap-4">
                  {trustPoints.map((point) => (
                    <div key={point.title} className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-5 shadow-[var(--glass-shadow)] backdrop-blur-[var(--glass-blur)]">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                          <point.icon className="h-4 w-4 text-emerald-200" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-text-primary">{point.title}</div>
                          <p className="mt-1 text-sm text-text-secondary">{point.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="px-6 pb-24">
            <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-12 text-center shadow-[var(--glass-shadow)] backdrop-blur-[var(--glass-blur)]">
              <h2 className="text-3xl md:text-4xl font-[var(--font-landing-display)]">Ready to build your knowledge engine?</h2>
              <p className="mt-4 text-text-secondary">Create your Pawkit workspace and start collecting what matters.</p>
              <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-sm font-semibold text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  Create your account
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-8 py-4 text-sm font-semibold text-text-primary hover:bg-white/10 transition-colors"
                >
                  I already have an account
                </Link>
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t border-white/5 px-6 py-10">
          <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-6">
            <Logo />
            <div className="flex items-center gap-6 text-sm text-text-muted">
              <a href="#features" className="hover:text-text-primary">Features</a>
              <a href="#workflow" className="hover:text-text-primary">Workflow</a>
              <a href="#trust" className="hover:text-text-primary">Trust</a>
            </div>
            <div className="text-sm text-text-muted">(c) {new Date().getFullYear()} Pawkit</div>
          </div>
        </footer>
      </div>
    </div>
  );
}
