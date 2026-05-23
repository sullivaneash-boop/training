import type { PlanPatch, TrainingPlan } from './types';

const MONTHS: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

/** Local fallback when API JSON fails but user clearly confirmed a date change. */
export function inferPlanPatchFromText(
  text: string,
  plan: TrainingPlan,
): PlanPatch | null {
  const lower = text.toLowerCase();
  const patch: PlanPatch = {};

  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) {
    patch.startDate = `${iso[1]}-${iso[2]}-${iso[3]}`;
    patch.adaptationNote = `Start date set to ${patch.startDate} (confirmed in chat).`;
    return patch;
  }

  if (/june\s*1|june\s*1st|start\s+june\s+1/i.test(lower)) {
    const year = inferYear(plan, 5);
    return {
      startDate: `${year}-06-01`,
      adaptationNote: 'Start date set to June 1 (confirmed in chat).',
    };
  }

  for (const [name, idx] of Object.entries(MONTHS)) {
    const re = new RegExp(
      `\\b${name}\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(20\\d{2}))?`,
      'i',
    );
    const m = lower.match(re);
    if (m) {
      const day = parseInt(m[1], 10);
      const year = m[2] ? parseInt(m[2], 10) : inferYear(plan, idx);
      patch.startDate = `${year}-${String(idx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      patch.adaptationNote = `Start postponed to ${patch.startDate} (confirmed in chat).`;
      return patch;
    }
    const short = new RegExp(`\\b${name.slice(0, 3)}\\s+(\\d{1,2})`, 'i');
    const sm = lower.match(short);
    if (sm && /push|start|june|july|aug|sep|oct|nov|dec/i.test(lower)) {
      const day = parseInt(sm[1], 10);
      const year = inferYear(plan, idx);
      patch.startDate = `${year}-${String(idx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      patch.adaptationNote = `Start date set to ${patch.startDate} (confirmed in chat).`;
      return patch;
    }
  }

  if (/push.*back|postpone|delay|later than|can't start until|cannot start until/i.test(lower)) {
    if (plan.startDate) {
      const d = new Date(plan.startDate + 'T12:00:00');
      d.setDate(d.getDate() + 7);
      patch.startDate = d.toISOString().slice(0, 10);
      patch.adaptationNote = 'Start pushed back ~1 week (inferred from chat).';
      return patch;
    }
  }

  return null;
}

function inferYear(plan: TrainingPlan, monthIdx: number): number {
  const raceYear = plan.raceDate
    ? parseInt(plan.raceDate.slice(0, 4), 10)
    : new Date().getFullYear();
  const startYear = plan.startDate
    ? parseInt(plan.startDate.slice(0, 4), 10)
    : new Date().getFullYear();
  return monthIdx >= 4 && monthIdx <= 9 ? startYear : raceYear;
}

export function normalizePlanPatch(raw: unknown): PlanPatch | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  const patch: PlanPatch = {};
  if (typeof p.startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.startDate)) {
    patch.startDate = p.startDate;
  }
  if (typeof p.raceDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.raceDate)) {
    patch.raceDate = p.raceDate;
  }
  if (typeof p.totalWeeks === 'number' && p.totalWeeks > 0) {
    patch.totalWeeks = Math.round(p.totalWeeks);
  }
  if (typeof p.shiftPhasesWeeksBy === 'number') {
    patch.shiftPhasesWeeksBy = Math.round(p.shiftPhasesWeeksBy);
  }
  if (typeof p.adaptationNote === 'string') {
    patch.adaptationNote = p.adaptationNote.slice(0, 500);
  }
  if (Object.keys(patch).length === 0) return null;
  return patch;
}
