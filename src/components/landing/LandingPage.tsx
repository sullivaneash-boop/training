import { type ReactNode, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

type LandingPageProps = {
  onGetStarted: () => void;
};

type MotionProps = {
  delay?: number;
  children: ReactNode;
  className?: string;
};

type Scenario = {
  label: string;
  input: string;
  output: string;
  coach: string;
  tone: 'green' | 'navy' | 'amber' | 'mint';
};

const SCENARIOS: Scenario[] = [
  {
    label: 'Race link pasted',
    input: 'Half marathon on Oct 18. Goal: sub-1:45.',
    output: '16-week plan, taper, weekly mileage, strength days.',
    coach: 'I built the first block around 4 run days, 2 lift days, and a conservative long-run ramp.',
    tone: 'green',
  },
  {
    label: 'Travel week',
    input: 'No gym Thursday to Sunday. Only 30 minutes.',
    output: 'Moves intervals to Wednesday, swaps lift for hotel mobility.',
    coach: 'You keep the quality session without cramming the weekend. Friday becomes a short aerobic reset.',
    tone: 'navy',
  },
  {
    label: 'Low recovery',
    input: 'Sleep 5h 42m. Stress high. Legs heavy.',
    output: 'Tempo becomes easy aerobic with 4 relaxed strides.',
    coach: 'We protect the week. Today still counts, but it should leave you better tomorrow.',
    tone: 'amber',
  },
  {
    label: 'Motivation dip',
    input: 'Mood low. Skipped yesterday and feel behind.',
    output: 'Creates a smaller win and a reset note for the day.',
    coach: 'Do the short version, log it, and let momentum come back before intensity.',
    tone: 'mint',
  },
];

const toneClasses: Record<Scenario['tone'], string> = {
  green: 'border-[#b7decf] bg-[#eef8f4] text-[#17654b]',
  navy: 'border-[#cbd5dc] bg-[#f4f6f7] text-[#133046]',
  amber: 'border-[#e5ca94] bg-[#fff8e8] text-[#8a5f19]',
  mint: 'border-[#bfe5d7] bg-[#f3fbf8] text-[#1e6b55]',
};

function MotionReveal({ delay = 0, className = '', children }: MotionProps) {
  const reduceMotion = useReducedMotion();
  const ease = [0.22, 1, 0.36, 1] as const;

  if (reduceMotion) {
    return (
      <motion.div className={className} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.68, ease, delay: delay / 1000 }}
    >
      {children}
    </motion.div>
  );
}

function AnimatedBackdrop() {
  const reduceMotion = useReducedMotion();
  const tiles = [
    { label: 'Week 1', className: 'left-1 top-[42rem] w-20' },
    { label: 'Build', className: 'right-2 top-[50rem] w-24' },
    { label: 'Peak', className: 'left-6 top-[70rem] w-20' },
    { label: 'Taper', className: 'right-6 top-[78rem] w-20' },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute inset-x-[-72px] top-12 h-[520px] opacity-70"
        animate={reduceMotion ? undefined : { y: [0, -10, 0] }}
        transition={reduceMotion ? undefined : { duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="absolute left-8 right-8 top-10 h-px rotate-[-14deg] bg-[#d9e2db]" />
        <div className="absolute left-0 right-0 top-44 h-px rotate-[10deg] bg-[#e0e3df]" />
        <div className="absolute left-16 right-12 top-72 h-px rotate-[-8deg] bg-[#d3e4dc]" />
        <div className="absolute left-8 right-8 top-[26rem] h-px rotate-[13deg] bg-[#e8dfd0]" />
      </motion.div>

      {tiles.map((tile, idx) => (
        <motion.div
          key={tile.label}
          className={`absolute rounded-[8px] border border-[#e3e7df] bg-white/50 px-2.5 py-2 text-[0.72rem] font-semibold text-[#78838f] backdrop-blur-sm ${tile.className}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 0.34, y: reduceMotion ? 0 : [0, -5, 0] }}
          transition={{
            duration: reduceMotion ? 0.2 : 6 + idx,
            repeat: reduceMotion ? 0 : Infinity,
            ease: 'easeInOut',
            delay: idx * 0.2,
          }}
        >
          {tile.label}
        </motion.div>
      ))}
    </div>
  );
}

function TempoWordmark() {
  return (
    <div className="relative flex items-center justify-between pt-5">
      <div className="flex items-center gap-3">
        <img
          src="/pwa-192.png"
          alt="Tempo app icon"
          className="h-10 w-10 rounded-[8px] shadow-[0_10px_24px_rgba(20,35,48,0.16)]"
        />
        <div>
          <p className="text-sm font-semibold text-[#181a1b]">Tempo</p>
          <p className="text-xs font-medium text-[#68737f]">AI training coach</p>
        </div>
      </div>
      <span className="rounded-[8px] border border-[#dce5dd] bg-white/82 px-3 py-1.5 text-xs font-semibold text-[#2e8b6d]">
        Plan-first
      </span>
    </div>
  );
}

function HeroCopy() {
  return (
    <section className="relative space-y-4 pt-3">
      <div className="space-y-3">
        <h1 className="text-[4.15rem] font-semibold leading-[0.9] text-[#151a1f]">Tempo</h1>
        <p className="max-w-[34ch] text-[1.08rem] leading-relaxed text-[#5e6670]">
          Paste your race, event, link, or training notes. Tempo builds the plan,
          tracks the work, and adjusts your week around sleep, stress, soreness,
          travel, and real life.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {['Custom plan', 'Workout log', 'Live coach'].map((item) => (
          <div
            key={item}
            className="rounded-[8px] border border-[#e2e7df] bg-white/86 px-2.5 py-2 text-center text-[0.75rem] font-semibold text-[#27323d]"
          >
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}

function PlanBars() {
  const bars = [
    { label: 'Base', width: '38%', color: 'bg-[#2e8b6d]' },
    { label: 'Build', width: '58%', color: 'bg-[#133046]' },
    { label: 'Peak', width: '76%', color: 'bg-[#2e8b6d]' },
    { label: 'Taper', width: '48%', color: 'bg-[#b9821b]' },
  ];

  return (
    <div className="space-y-2.5">
      {bars.map((bar, idx) => (
        <div key={bar.label} className="grid grid-cols-[3.1rem_1fr] items-center gap-2">
          <p className="text-[0.68rem] font-semibold text-[#66717c]">{bar.label}</p>
          <div className="h-2.5 rounded-full bg-[#eef1ed]">
            <motion.div
              className={`h-2.5 rounded-full ${bar.color}`}
              initial={{ width: '12%' }}
              animate={{ width: bar.width }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.35 + idx * 0.08 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function TrainingWeek({ scenario }: { scenario: Scenario }) {
  const week = [
    { day: 'M', label: 'Easy', active: false },
    { day: 'T', label: 'Lift', active: false },
    { day: 'W', label: 'Quality', active: true },
    { day: 'T', label: 'Reset', active: scenario.tone !== 'green' },
    { day: 'F', label: 'Mobility', active: scenario.tone === 'navy' },
    { day: 'S', label: 'Long', active: true },
    { day: 'S', label: 'Off', active: false },
  ];

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {week.map((item, idx) => (
        <motion.div
          key={`${item.day}-${idx}`}
          className={`min-h-[54px] rounded-[8px] border px-1.5 py-2 text-center ${
            item.active
              ? toneClasses[scenario.tone]
              : 'border-[#e5e9e1] bg-[#fafbf8] text-[#67727d]'
          }`}
          animate={item.active ? { y: [0, -3, 0] } : undefined}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: idx * 0.08 }}
        >
          <p className="text-[0.68rem] font-semibold">{item.day}</p>
          <p className="mt-1 text-[0.58rem] font-medium leading-tight">{item.label}</p>
        </motion.div>
      ))}
    </div>
  );
}

function ProductPreview({
  scenario,
  activeIndex,
}: {
  scenario: Scenario;
  activeIndex: number;
}) {
  return (
    <div className="relative pt-2">
      <motion.div
        className="relative z-10 mx-auto w-full rounded-[32px] border border-[#cfd8d0] bg-[#133046] p-2.5 shadow-[0_28px_60px_rgba(19,48,70,0.24)]"
        initial={{ opacity: 0, y: 18, rotateX: 8 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.18 }}
      >
        <div className="overflow-hidden rounded-[24px] bg-[#f7f7f4]">
          <div className="flex items-center justify-between border-b border-[#e4e8e0] bg-white px-4 py-3">
            <div>
              <p className="text-[0.7rem] font-semibold text-[#68737f]">Plan builder</p>
              <p className="text-sm font-semibold text-[#1d2832]">Your next block</p>
            </div>
            <div className={`rounded-[8px] border px-2.5 py-1 text-[0.68rem] font-semibold ${toneClasses[scenario.tone]}`}>
              Live
            </div>
          </div>

          <div className="space-y-3 px-4 py-4">
            <motion.div
              key={`input-${activeIndex}`}
              className="rounded-[8px] border border-[#e0e6df] bg-white p-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="text-[0.68rem] font-semibold text-[#68737f]">{scenario.label}</p>
              <p className="mt-1 text-[0.88rem] font-semibold leading-snug text-[#202b36]">
                {scenario.input}
              </p>
            </motion.div>

            <div className="rounded-[8px] border border-[#e0e6df] bg-white p-3">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-[0.68rem] font-semibold text-[#68737f]">Generated plan</p>
                  <p className="text-[0.86rem] font-semibold text-[#202b36]">{scenario.output}</p>
                </div>
                <span className="text-[0.72rem] font-semibold text-[#2e8b6d]">16 wk</span>
              </div>
              <PlanBars />
            </div>

            <div className="rounded-[8px] border border-[#e0e6df] bg-white p-3">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[0.78rem] font-semibold text-[#202b36]">This week</p>
                <p className="text-[0.68rem] font-semibold text-[#68737f]">Adjusted</p>
              </div>
              <TrainingWeek scenario={scenario} />
            </div>

            <motion.div
              key={`coach-${activeIndex}`}
              className={`rounded-[8px] border p-3 ${toneClasses[scenario.tone]}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="text-[0.68rem] font-semibold">Coach note</p>
              <p className="mt-1 text-[0.85rem] font-semibold leading-snug">{scenario.coach}</p>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function PrimaryButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-[12px] bg-[#133046] px-5 py-4 text-[1.03rem] font-semibold text-white shadow-[0_14px_30px_rgba(19,48,70,0.22)] transition duration-200 hover:bg-[#1b405f] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e8b6d]/40"
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-[12px] border border-[#d8e1d8] bg-white/88 px-5 py-4 text-[1.03rem] font-semibold text-[#1e2732] transition duration-200 hover:border-[#c6d2c8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e8b6d]/30"
    >
      {children}
    </button>
  );
}

function ScenarioSelector({
  activeIndex,
  onSelect,
}: {
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {SCENARIOS.map((scenario, idx) => {
        const active = activeIndex === idx;
        return (
          <button
            key={scenario.label}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(idx)}
            className={`rounded-[8px] border px-3 py-3 text-left transition ${
              active ? toneClasses[scenario.tone] : 'border-[#e1e6df] bg-white text-[#33404c]'
            }`}
          >
            <p className="text-[0.78rem] font-semibold">{scenario.label}</p>
            <p className="mt-1 text-[0.72rem] leading-snug opacity-80">{scenario.output}</p>
          </button>
        );
      })}
    </div>
  );
}

function FlowStep({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[8px] border border-[#e1e6df] bg-white p-4 shadow-[0_10px_24px_rgba(20,35,48,0.05)]">
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#133046] text-sm font-semibold text-white">
        {number}
      </div>
      <p className="text-[1rem] font-semibold text-[#1d2832]">{title}</p>
      <p className="mt-1.5 text-[0.86rem] leading-relaxed text-[#5b6671]">{body}</p>
    </div>
  );
}

function HowItWorks() {
  return (
    <section className="relative space-y-3">
      <div>
        <p className="text-sm font-semibold text-[#2e8b6d]">From goal to daily guidance</p>
        <h2 className="mt-1 text-[1.85rem] font-semibold leading-tight text-[#151a1f]">
          The plan starts custom and stays alive.
        </h2>
      </div>
      <div className="space-y-2">
        <FlowStep
          number="1"
          title="Paste the target"
          body="Race page, event date, current training, old plan, injury notes, availability, or just a plain-language goal."
        />
        <FlowStep
          number="2"
          title="Get a real training block"
          body="Tempo builds phases, weekly structure, workout intent, strength work, recovery space, and race-specific focus."
        />
        <FlowStep
          number="3"
          title="Let the coach adapt it"
          body="Miss a workout, travel, sleep poorly, feel flat, or need a boost. Tempo adjusts the week without losing the goal."
        />
      </div>
    </section>
  );
}

function SignalGrid() {
  const signals = [
    ['Workouts', 'Log what happened and compare it to the plan.'],
    ['Readiness', 'Sleep, energy, stress, soreness, and mood guide daily load.'],
    ['Schedule', 'Travel, busy weeks, equipment limits, and last-minute changes.'],
    ['Coach chat', 'Ask for explanations, changes, motivation, and next steps.'],
  ];

  return (
    <section className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-[#2e8b6d]">Personal context</p>
        <h2 className="mt-1 text-[1.85rem] font-semibold leading-tight text-[#151a1f]">
          More than a workout calendar.
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {signals.map(([title, body]) => (
          <div key={title} className="rounded-[8px] border border-[#e1e6df] bg-white p-3">
            <p className="text-[0.9rem] font-semibold text-[#202b36]">{title}</p>
            <p className="mt-1 text-[0.74rem] leading-relaxed text-[#5f6a75]">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FinalCta({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <section className="rounded-[8px] border border-[#dce5dd] bg-[#133046] p-5 text-white shadow-[0_18px_40px_rgba(19,48,70,0.22)]">
      <p className="text-[1.55rem] font-semibold leading-tight">Start with the race you care about.</p>
      <p className="mt-2 text-sm leading-relaxed text-[#d7e0dc]">
        Tempo turns the details into a plan, then keeps coaching you through the messy weeks.
      </p>
      <button
        type="button"
        onClick={onGetStarted}
        className="mt-4 w-full rounded-[12px] bg-white px-5 py-3.5 text-base font-semibold text-[#133046] transition hover:bg-[#f1f4ef] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      >
        Create my plan
      </button>
    </section>
  );
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  const featuresRef = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion();
  const [activeScenario, setActiveScenario] = useState(0);
  const scenario = SCENARIOS[activeScenario];

  useEffect(() => {
    if (reduceMotion) return;
    const interval = window.setInterval(() => {
      setActiveScenario((index) => (index + 1) % SCENARIOS.length);
    }, 3300);
    return () => window.clearInterval(interval);
  }, [reduceMotion]);

  return (
    <div className="relative space-y-6 pb-4">
      <AnimatedBackdrop />

      <MotionReveal delay={20}>
        <TempoWordmark />
      </MotionReveal>

      <MotionReveal delay={110}>
        <HeroCopy />
      </MotionReveal>

      <MotionReveal delay={210} className="relative space-y-3">
        <PrimaryButton onClick={onGetStarted}>Create my training plan</PrimaryButton>
        <SecondaryButton
          onClick={() => featuresRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        >
          See how Tempo adapts
        </SecondaryButton>
        <p className="text-center text-[0.8rem] font-medium text-[#68737f]">
          Setup takes about 2 minutes. Health and readiness signals can be added after.
        </p>
      </MotionReveal>

      <MotionReveal delay={320}>
        <ProductPreview scenario={scenario} activeIndex={activeScenario} />
      </MotionReveal>

      <div ref={featuresRef} className="relative space-y-7 pt-1">
        <MotionReveal delay={120}>
          <ScenarioSelector activeIndex={activeScenario} onSelect={setActiveScenario} />
        </MotionReveal>

        <MotionReveal delay={180}>
          <HowItWorks />
        </MotionReveal>

        <MotionReveal delay={240}>
          <SignalGrid />
        </MotionReveal>

        <MotionReveal delay={300}>
          <FinalCta onGetStarted={onGetStarted} />
        </MotionReveal>
      </div>
    </div>
  );
}
