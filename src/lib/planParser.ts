import type {
  DayTemplate,
  PhaseDefinition,
  PhaseName,
  PhaseWeekTemplate,
  TrainingPlan,
  WeekPlan,
} from './types';

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const DAY_LABELS: Record<string, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

function normalizePhase(raw: string): PhaseName {
  const s = raw.toLowerCase().trim();
  if (s.includes('base')) return 'base';
  if (s.includes('build')) return 'build';
  if (s.includes('peak')) return 'peak';
  if (s.includes('taper')) return 'taper';
  if (s.includes('race')) return 'race';
  return 'unknown';
}

function parseDate(text: string): string | null {
  const patterns = [
    /(?:race\s*day|race\s*date)[:\s*]*\*{0,2}\s*([A-Za-z]+day)?,?\s*([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/i,
    /([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/,
    /(\d{4})-(\d{2})-(\d{2})/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      if (m[0].includes('-') && m[1]?.length === 4) {
        return `${m[1]}-${m[2]}-${m[3]}`;
      }
      const monthNames =
        'january,february,march,april,may,june,july,august,september,october,november,december'.split(
          ',',
        );
      const monthStr = (m[2] ?? m[1]).toLowerCase();
      const day = parseInt(m[3] ?? m[2], 10);
      const year = parseInt(m[4] ?? m[3], 10);
      const monthIdx = monthNames.findIndex((mn) => monthStr.startsWith(mn.slice(0, 3)));
      if (monthIdx >= 0 && day && year) {
        return `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
  }
  return null;
}

function parsePlanStart(md: string, raceDate: string, totalWeeks: number): string {
  const explicit = md.match(/plan\s*start[:\s*]*\*{0,2}\s*week\s+of\s+([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/i);
  if (explicit) {
    const monthNames =
      'january,february,march,april,may,june,july,august,september,october,november,december'.split(
        ',',
      );
    const monthStr = explicit[1].toLowerCase();
    const day = parseInt(explicit[2], 10);
    const year = parseInt(explicit[3], 10);
    const monthIdx = monthNames.findIndex((mn) => monthStr.startsWith(mn.slice(0, 3)));
    if (monthIdx >= 0) {
      const d = new Date(year, monthIdx, day);
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      return d.toISOString().slice(0, 10);
    }
  }
  const race = new Date(raceDate + 'T12:00:00');
  const start = new Date(race);
  start.setDate(start.getDate() - totalWeeks * 7);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start.toISOString().slice(0, 10);
}

function parsePhases(md: string): PhaseDefinition[] {
  const phases: PhaseDefinition[] = [];
  const tableMatch = md.match(
    /\|\s*Phase\s*\|\s*Weeks\s*\|[\s\S]*?(?=\n\n|\n## )/i,
  );
  if (!tableMatch) return phases;

  const rows = tableMatch[0].split('\n').filter((r) => r.startsWith('|') && !r.includes('---'));
  for (const row of rows.slice(1)) {
    const cols = row
      .split('|')
      .map((c) => c.trim())
      .filter(Boolean);
    if (cols.length < 2) continue;
    const phaseCol = cols[0].replace(/\*\*/g, '').replace(/^\d+\s*[—–-]\s*/i, '').trim();
    const weeksCol = cols[1];
    const goal = cols[2]?.replace(/\*\*/g, '').trim();
    const weekRange = weeksCol.match(/(\d+)\s*[–—-]\s*(\d+)/);
    if (!weekRange) continue;
    const name = normalizePhase(phaseCol);
    phases.push({
      name,
      label: phaseCol,
      startWeek: parseInt(weekRange[1], 10),
      endWeek: parseInt(weekRange[2], 10),
      goal,
    });
  }
  return phases;
}

function parseWeeklyTable(md: string, phases: PhaseDefinition[]): WeekPlan[] {
  const weeks: WeekPlan[] = [];
  const tableMatch = md.match(
    /\|\s*Wk\s*\|\s*Phase[\s\S]*?(?=\n\n|\n## |\nYou never)/i,
  );
  if (!tableMatch) return weeks;

  const rows = tableMatch[0].split('\n').filter((r) => r.startsWith('|') && !r.includes('---'));
  for (const row of rows.slice(1)) {
    const cols = row
      .split('|')
      .map((c) => c.trim().replace(/\*\*/g, ''))
      .filter(Boolean);
    if (cols.length < 7) continue;
    const weekNumber = parseInt(cols[0], 10);
    if (Number.isNaN(weekNumber)) continue;
    const phaseLabel = cols[1];
    const phase = normalizePhase(phaseLabel);
    const phaseDef = phases.find((p) => weekNumber >= p.startWeek && weekNumber <= p.endWeek);
    const keyFocus = cols[6] ?? '';
    weeks.push({
      weekNumber,
      phase,
      phaseLabel: phaseDef?.label ?? phaseLabel,
      targetHours: parseFloat(cols[2]) || 0,
      longRide: cols[3],
      longRun: cols[4],
      longSwim: cols[5],
      keyFocus,
      isDeload: /deload/i.test(keyFocus) || /deload/i.test(cols.join(' ')),
    });
  }
  return weeks;
}

function parsePhaseTemplates(md: string): PhaseWeekTemplate[] {
  const templates: PhaseWeekTemplate[] = [];
  const sectionRegex =
    /###\s+(\w+)\s+phase\s+week\s*\(example\)([\s\S]*?)(?=###|## |$)/gi;
  let match: RegExpExecArray | null;
  while ((match = sectionRegex.exec(md)) !== null) {
    const phase = normalizePhase(match[1]);
    const body = match[2];
    const days: DayTemplate[] = [];
    const dayLines = body.match(/^\s*-\s*\*\*(\w+)\*\*\s*[—–-]\s*(.+)$/gim);
    if (dayLines) {
      for (const line of dayLines) {
        const dm = line.match(/\*\*(\w+)\*\*\s*[—–-]\s*(.+)/i);
        if (!dm) continue;
        const dayKey = dm[1].slice(0, 3).toLowerCase();
        days.push({
          day: dayKey,
          label: DAY_LABELS[dayKey] ?? dm[1],
          description: dm[2].trim(),
        });
      }
    }
    if (days.length) templates.push({ phase, days });
  }
  return templates;
}

function extractTitle(md: string): string {
  const h1 = md.match(/^#\s+(.+)$/m);
  return h1?.[1]?.replace(/\*\*/g, '').trim() ?? 'Training Plan';
}

export function parseTrainingPlanMarkdown(
  md: string,
  id?: string,
): { plan: TrainingPlan; warnings: string[] } {
  const warnings: string[] = [];
  const raceDate = parseDate(md);
  if (!raceDate) warnings.push('Could not parse race date — using 6 months from today.');
  const effectiveRace =
    raceDate ?? new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10);

  const phases = parsePhases(md);
  let weeks = parseWeeklyTable(md, phases);
  if (!weeks.length) warnings.push('No weekly progression table found.');
  const totalWeeks = weeks.length || 21;
  const planStartDate = parsePlanStart(md, effectiveRace, totalWeeks);
  const phaseTemplates = parsePhaseTemplates(md);

  if (!phases.length && weeks.length) {
    const inferred = new Map<PhaseName, { start: number; end: number; label: string }>();
    for (const w of weeks) {
      const existing = inferred.get(w.phase);
      if (!existing) {
        inferred.set(w.phase, { start: w.weekNumber, end: w.weekNumber, label: w.phaseLabel });
      } else {
        existing.end = w.weekNumber;
      }
    }
    for (const [name, range] of inferred) {
      phases.push({
        name,
        label: range.label,
        startWeek: range.start,
        endWeek: range.end,
      });
    }
  }

  const plan: TrainingPlan = {
    id: id ?? `plan-${Date.now()}`,
    name: extractTitle(md),
    raceDate: effectiveRace,
    planStartDate,
    totalWeeks,
    rawMarkdown: md,
    phases,
    weeks,
    phaseTemplates,
    importedAt: new Date().toISOString(),
  };

  return { plan, warnings };
}

export function getTodaySession(
  plan: TrainingPlan,
  weekNumber: number,
  dayOfWeek: number,
): string | null {
  const week = plan.weeks.find((w) => w.weekNumber === weekNumber);
  if (!week) return null;
  const template = plan.phaseTemplates.find((t) => t.phase === week.phase);
  if (!template) return null;
  const dayKey = DAY_ORDER[dayOfWeek === 0 ? 6 : dayOfWeek - 1];
  const day = template.days.find((d) => d.day === dayKey);
  return day?.description ?? null;
}

export function getPhaseForWeek(plan: TrainingPlan, weekNumber: number): PhaseDefinition | null {
  return (
    plan.phases.find((p) => weekNumber >= p.startWeek && weekNumber <= p.endWeek) ?? null
  );
}
