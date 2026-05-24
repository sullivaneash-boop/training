import type { ReadinessCheck, ReadinessResult } from './types';

export interface ReadinessInput {
  sleepHours: number;
  soreness: number;
  motivation: number;
  restingHr?: number;
  shoulderPain: boolean;
  kneePain: boolean;
  stress?: number;
}

export interface ReadinessEval {
  result: ReadinessResult;
  deterministicReason: string;
}

export function evaluateReadiness(input: ReadinessInput): ReadinessEval {
  const reasons: string[] = [];
  let score = 0;

  if (input.shoulderPain || input.kneePain) {
    score += 3;
    if (input.shoulderPain) reasons.push('Shoulder pain flagged — protect the joint.');
    if (input.kneePain) reasons.push('Knee/run pain flagged — don’t grind through gait changes.');
  }

  if (input.sleepHours < 5) {
    score += 2;
    reasons.push(`Sleep at ${input.sleepHours}h — under-recovered.`);
  } else if (input.sleepHours < 6.5) {
    score += 1;
    reasons.push(`Sleep at ${input.sleepHours}h — borderline.`);
  }

  if (input.soreness >= 8) {
    score += 2;
    reasons.push(`Soreness ${input.soreness}/10 — body is asking for easy.`);
  } else if (input.soreness >= 6) {
    score += 1;
    reasons.push(`Soreness ${input.soreness}/10 — moderate load.`);
  }

  if (input.motivation <= 3) {
    score += 1;
    reasons.push('Low motivation — keep it simple today.');
  }

  if (input.stress && input.stress >= 8) {
    score += 1;
    reasons.push(`Stress ${input.stress}/10 — life load matters.`);
  }

  if (input.restingHr && input.restingHr >= 8) {
    score += 1;
    reasons.push('Elevated resting HR — possible fatigue signal.');
  }

  let result: ReadinessResult;
  if (score >= 4 || input.shoulderPain || input.kneePain) {
    result = 'red';
    if (!reasons.length) reasons.push('Multiple recovery flags — recovery/mobility only.');
  } else if (score >= 2) {
    result = 'yellow';
    if (!reasons.length) reasons.push('Some flags — reduce volume or intensity.');
  } else {
    result = 'green';
    reasons.push('Signals look fine — train as planned.');
  }

  return { result, deterministicReason: reasons.join(' ') };
}

export function statusLabel(status: ReadinessResult): string {
  switch (status) {
    case 'green':
      return 'Train';
    case 'yellow':
      return 'Reduce';
    case 'red':
      return 'Back off';
  }
}

export function statusColor(status: ReadinessResult): string {
  switch (status) {
    case 'green':
      return 'text-[#1f7b5d]';
    case 'yellow':
      return 'text-[#8a6545]';
    case 'red':
      return 'text-[#9a4f47]';
  }
}

export function statusBg(status: ReadinessResult): string {
  switch (status) {
    case 'green':
      return 'bg-[#eef6f2] border-[#cde4da]';
    case 'yellow':
      return 'bg-[#faf4ee] border-[#efd7c3]';
    case 'red':
      return 'bg-[#f9efee] border-[#edcfcd]';
  }
}

export function getTodayReadiness(
  logs: ReadinessCheck[],
  date: string,
): ReadinessCheck | null {
  return logs.find((l) => l.date === date) ?? null;
}
