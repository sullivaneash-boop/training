import { type ReactNode, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';

type LandingPageProps = {
  onGetStarted: () => void;
};

type MotionProps = {
  delay?: number;
  children: ReactNode;
  className?: string;
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
      initial={{ opacity: 0, y: 10, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.62, ease, delay: delay / 1000 }}
    >
      {children}
    </motion.div>
  );
}

function AnimatedBackdrop() {
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const floatY = useTransform(scrollYProgress, [0, 1], [0, -24]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute left-1/2 top-[-92px] h-[340px] w-[340px] -translate-x-1/2 rounded-full bg-[#d7ece3]/40 blur-3xl"
        animate={reduceMotion ? undefined : { scale: [1, 1.035, 1], opacity: [0.35, 0.5, 0.35] }}
        transition={reduceMotion ? undefined : { duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute left-[-16%] top-52 h-[280px] w-[620px] rounded-[100%] border border-[#dbe6de]"
        style={reduceMotion ? undefined : { y: floatY }}
      />
      <motion.div
        className="absolute right-[-28%] top-[26rem] h-[320px] w-[680px] rounded-[100%] border border-[#e2e8e2]"
        style={reduceMotion ? undefined : { y: floatY }}
      />
      <motion.div
        className="absolute left-[12%] top-[33rem] h-28 w-28 rounded-full border border-[#deeadf] bg-white/55 backdrop-blur-sm"
        animate={reduceMotion ? undefined : { y: [0, -10, 0], opacity: [0.55, 0.8, 0.55] }}
        transition={reduceMotion ? undefined : { duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute right-[10%] top-[18.5rem] h-16 w-16 rounded-full border border-[#dde7de] bg-white/60 backdrop-blur-sm"
        animate={reduceMotion ? undefined : { y: [0, 8, 0], opacity: [0.5, 0.75, 0.5] }}
        transition={reduceMotion ? undefined : { duration: 5.8, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
      />
    </div>
  );
}

export function TempoWordmark() {
  return (
    <div className="flex items-center justify-between">
      <p className="text-[0.86rem] font-semibold tracking-[0.34em] text-[#5f6872]">TEMPO</p>
      <span className="rounded-full border border-[#dfe5dd] bg-[#f8faf7] px-3 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.09em] text-[#64717d]">
        Apple Health powered
      </span>
    </div>
  );
}

export function HeroCopy() {
  return (
    <div className="max-w-[34ch] space-y-4">
      <h1 className="text-[2.9rem] font-semibold leading-[0.97] tracking-[-0.03em] text-[#181a1b]">
        Know what to do today.
      </h1>
      <p className="text-[1.03rem] leading-relaxed text-[#5e6670]">
        Tempo turns your Apple Watch and health data into a clear daily briefing -
        readiness, recovery, today&apos;s session, and what to adjust.
      </p>
    </div>
  );
}

export function ReadinessRing({ value }: { value: number }) {
  const reduceMotion = useReducedMotion();
  const prefersReducedMotion = useReducedMotion();
  const [progress, setProgress] = useState(prefersReducedMotion ? value : 0);
  const normalizedValue = Math.max(0, Math.min(100, value));
  const radius = 43;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    if (prefersReducedMotion) {
      setProgress(normalizedValue);
      return;
    }
    const timeout = window.setTimeout(() => setProgress(normalizedValue), 170);
    return () => window.clearTimeout(timeout);
  }, [normalizedValue, prefersReducedMotion]);

  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="48" cy="48" r={radius} stroke="#dce7df" strokeWidth="9" fill="none" />
        <motion.circle
          cx="48"
          cy="48"
          r={radius}
          stroke="#2E8B6D"
          strokeWidth="9"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: progress / 100 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 0.86, ease: [0.22, 1, 0.36, 1], delay: 0.18 }
          }
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-[1.42rem] font-semibold leading-none text-[#181a1b]">{value}</p>
        <p className="mt-0.5 text-[0.72rem] font-medium text-[#5f6873]">Ready</p>
      </div>
    </div>
  );
}

export function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <motion.div
      className="rounded-xl border border-[#e4e8e3] bg-[#fbfcfa] px-2.5 py-2"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.07em] text-[#6d7884]">
        {label}
      </p>
      <p className="mt-0.5 text-[0.9rem] font-semibold text-[#1a232f]">{value}</p>
    </motion.div>
  );
}

export function MiniTrendChart() {
  const bars = [42, 58, 46, 65, 54, 60];
  return (
    <div className="mt-2 flex h-10 items-end gap-1.5 rounded-lg bg-[#f4f8f4] px-2 py-1.5">
      {bars.map((height, idx) => (
        <motion.span
          key={idx}
          className="w-2 rounded-sm bg-[#bfe5d7]"
          initial={{ height: '18%', opacity: 0 }}
          animate={{ height: `${height}%`, opacity: 1 }}
          transition={{
            duration: 0.55,
            ease: [0.22, 1, 0.36, 1],
            delay: 0.38 + idx * 0.08,
          }}
        />
      ))}
    </div>
  );
}

export function TodayBriefingCard() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="rounded-[1.7rem] border border-[#e2e8e2] bg-white p-4"
      initial={{ opacity: 0, y: 14, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: reduceMotion ? 0 : 0.68,
        ease: [0.22, 1, 0.36, 1],
        delay: reduceMotion ? 0 : 0.26,
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-[#1a232f]">Today</p>
          <p className="text-[0.78rem] text-[#6b7681]">Daily Briefing</p>
        </div>
        <p className="text-[0.75rem] font-medium text-[#7a8591]">May 12</p>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <ReadinessRing value={85} />
        <div>
          <p className="text-[1.12rem] font-semibold leading-tight text-[#2E8B6D]">Ready</p>
          <p className="mt-0.5 text-sm text-[#5e6670]">
            Recovery is strong and load is in range.
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-[#dfebe2] bg-[#f1f8f3] p-3">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[#61707d]">
          Today&apos;s guidance
        </p>
        <p className="mt-1 text-[1rem] font-semibold text-[#182331]">Tempo Run</p>
        <p className="text-[0.88rem] text-[#4f5e6a]">8 km aerobic</p>
      </div>

      <p className="mt-3 text-[0.84rem] text-[#5f6974]">
        Why this: Recovery is strong. Load is in range. Sleep was solid.
      </p>

      <div className="mt-3 grid grid-cols-4 gap-1.5">
        <MetricChip label="Sleep" value="7h 42m" />
        <MetricChip label="HRV" value="Stable" />
        <MetricChip label="Load" value="Optimal" />
        <MetricChip label="Recovery" value="78%" />
      </div>

      <MiniTrendChart />

      <motion.div
        className="mt-3 rounded-xl border border-[#e2e8e2] bg-[#fafcf9] p-2.5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45, delay: 0.6 }}
      >
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-[#65717d]">
          Coach note
        </p>
        <p className="mt-1 text-[0.84rem] text-[#293340]">
          Good day for quality work. Keep it aerobic unless soreness is high.
        </p>
      </motion.div>
    </motion.div>
  );
}

export function CoachPreviewCard() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="rounded-[1.45rem] border border-[#e2e8e2] bg-white p-4"
      initial={{ opacity: 0, y: 14, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: reduceMotion ? 0 : 0.62,
        ease: [0.22, 1, 0.36, 1],
        delay: reduceMotion ? 0 : 0.34,
      }}
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#ecf6ef] text-[#2E8B6D]">
          <span className="h-2.5 w-2.5 rounded-full bg-[#2E8B6D]" />
        </span>
        <div>
          <p className="text-sm font-semibold text-[#182331]">Tempo Coach</p>
          <p className="text-[0.77rem] text-[#6c7682]">Conversational guidance</p>
        </div>
      </div>

      <motion.div
        className="mt-3 rounded-xl border border-[#e0e7e1] bg-[#fafcf9] p-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.58 }}
      >
        <motion.p
          className="text-[0.9rem] text-[#2b3440]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.7 }}
        >
          You&apos;re trending well. Want me to adjust this week around your long run?
        </motion.p>
      </motion.div>

      <motion.div className="mt-3 flex flex-wrap gap-2" initial="hidden" animate="show">
        {['Adjust today', 'Explain readiness', 'Plan week', "I'm sore"].map((action, idx) => (
          <motion.button
            type="button"
            key={action}
            className="rounded-full border border-[#dbe3db] bg-white px-3 py-1.5 text-[0.74rem] font-medium text-[#33414f]"
            variants={{
              hidden: { opacity: 0, y: 6 },
              show: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.34, delay: 0.7 + idx * 0.08 }}
          >
            {action}
          </motion.button>
        ))}
      </motion.div>
    </motion.div>
  );
}

function BackgroundSignalCard({
  title,
  value,
  className,
  delay = 0,
}: {
  title: string;
  value: string;
  className: string;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={`absolute rounded-2xl border border-[#dfe7df] bg-white/78 px-3 py-2 backdrop-blur-sm ${className}`}
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{
        opacity: 1,
        y: reduceMotion ? 0 : [0, -8, 0],
        scale: 1,
      }}
      transition={{
        duration: reduceMotion ? 0.2 : 6.2,
        ease: 'easeInOut',
        repeat: reduceMotion ? 0 : Infinity,
        delay,
      }}
    >
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-[#6f7984]">{title}</p>
      <p className="mt-0.5 text-[0.88rem] font-semibold text-[#24303c]">{value}</p>
    </motion.div>
  );
}

export function ProductPreview() {
  return (
    <div className="relative space-y-3 overflow-visible">
      <BackgroundSignalCard title="Sleep" value="7h 42m" className="-left-4 top-20 w-24" delay={0.1} />
      <BackgroundSignalCard title="Load" value="Optimal" className="-right-3 top-10 w-24" delay={0.2} />
      <BackgroundSignalCard title="HRV" value="Stable" className="-right-2 bottom-20 w-24" delay={0.35} />
      <TodayBriefingCard />
      <CoachPreviewCard />
    </div>
  );
}

export function FeaturePill({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-[#e2e8e2] bg-white px-3 py-3">
      <p className="text-[0.79rem] font-semibold text-[#202a35]">{title}</p>
      <p className="mt-1 text-[0.76rem] leading-relaxed text-[#5f6872]">{description}</p>
    </div>
  );
}

export function PrimaryButton({
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
      className="w-full rounded-2xl bg-[#0E1A2A] px-5 py-4 text-[1.03rem] font-semibold text-white transition duration-200 hover:bg-[#12263f]"
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
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
      className="w-full rounded-2xl border border-[#d8e0d9] bg-white px-5 py-4 text-[1.03rem] font-semibold text-[#1e2732] transition duration-200 hover:border-[#c8d3ca]"
    >
      {children}
    </button>
  );
}

export function SetupCue() {
  return (
    <p className="text-center text-[0.78rem] font-medium text-[#6d7783]">
      Setup takes about 2 minutes.
    </p>
  );
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  const featuresRef = useRef<HTMLDivElement | null>(null);

  return (
    <div className="relative space-y-6 pb-2">
      <AnimatedBackdrop />

      <MotionReveal delay={30} className="relative">
        <TempoWordmark />
      </MotionReveal>

      <MotionReveal delay={120} className="relative">
        <HeroCopy />
      </MotionReveal>

      <MotionReveal delay={220} className="relative">
        <ProductPreview />
      </MotionReveal>

      <MotionReveal delay={340} className="space-y-3">
        <PrimaryButton onClick={onGetStarted}>Get started</PrimaryButton>
        <SecondaryButton
          onClick={() => featuresRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        >
          See how it works
        </SecondaryButton>
      </MotionReveal>

      <MotionReveal delay={430}>
        <SetupCue />
      </MotionReveal>

      <div ref={featuresRef} className="grid grid-cols-3 gap-2">
        <FeaturePill title="Today's guidance" description="Know whether to push, recover, or maintain." />
        <FeaturePill
          title="Adaptive coach"
          description="Ask why, adjust plans, and get clearer next steps."
        />
        <FeaturePill
          title="Apple Health sync"
          description="No manual workout logging required."
        />
      </div>

      <p className="pb-2 text-center text-sm text-[#66727d]">
        Built for Apple Health and Apple Watch.
      </p>
    </div>
  );
}
