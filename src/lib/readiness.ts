import type { ReadinessLog, ReadinessStatus } from './types';

export interface ReadinessInput {
  sleep: number;
  soreness: number;
  motivation: number;
  restingHr?: number;
  shoulderPain: boolean;
  kneePain: boolean;
}

export interface ReadinessResult {
  status: ReadinessStatus;
  why: string;
}

export function evaluateReadiness(input: ReadinessInput): ReadinessResult {
  const reasons: string[] = [];
  let score = 0;

  if (input.shoulderPain || input.kneePain) {
    score += 3;
    if (input.shoulderPain) reasons.push('Shoulder pain flagged — protect the joint.');
    if (input.kneePain) reasons.push('Knee/run pain flagged — don’t grind through gait changes.');
  }

  if (input.sleep < 5) {
    score += 2;
    reasons.push(`Sleep at ${input.sleep}h — under-recovered.`);
  } else if (input.sleep < 6.5) {
    score += 1;
    reasons.push(`Sleep at ${input.sleep}h — borderline.`);
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

  if (input.restingHr && input.restingHr >= 10) {
    score += 1;
    reasons.push('Elevated resting HR — possible fatigue signal.');
  }

  let status: ReadinessStatus;
  if (score >= 4 || input.shoulderPain || input.kneePain) {
    status = 'red';
    if (!reasons.length) reasons.push('Multiple recovery flags — recovery/mobility only.');
  } else if (score >= 2) {
    status = 'yellow';
    if (!reasons.length) reasons.push('Some flags — reduce volume or intensity.');
  } else {
    status = 'green';
    reasons.push('Signals look fine — train as planned.');
  }

  return { status, why: reasons.join(' ') };
}

export function statusColor(status: ReadinessStatus): string {
  switch (status) {
    case 'green':
      return 'text-emerald-400';
    case 'yellow':
      return 'text-amber-400';
    case 'red':
      return 'text-red-400';
  }
}

export function statusBg(status: ReadinessStatus): string {
  switch (status) {
    case 'green':
      return 'bg-emerald-500/15 border-emerald-500/30';
    case 'yellow':
      return 'bg-amber-500/15 border-amber-500/30';
    case 'red':
      return 'bg-red-500/15 border-red-500/30';
  }
}

export function getTodayReadiness(logs: ReadinessLog[], date: string): ReadinessLog | null {
  return logs.find((l) => l.date === date) ?? null;
}
