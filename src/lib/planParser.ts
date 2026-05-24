import type { PlanPhase, PlanWeek, PlannedSession, TrainingPlan } from './types';

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

function parseDate(text: string): string | null {
  const patterns = [
    /(?:race\s*day|race\s*date)[:\s*]*\*{0,2}\s*([A-Za-z]+day)?,?\s*([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/i,
    /(\d{4})-(\d{2})-(\d{2})/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (!m) continue;
    if (m[0].includes('-') && m[1]?.length === 4) {
      return `${m[1]}-${m[2]}-${m[3]}`;
    }
    const monthNames =
      'january,february,march,april,may,june,july,august,september,october,november,december'.split(
        ',',
      );
    const monthStr = (m[2] ?? '').toLowerCase();
    const day = parseInt(m[3] ?? '', 10);
    const year = parseInt(m[4] ?? '', 10);
    const monthIdx = monthNames.findIndex((mn) => monthStr.startsWith(mn.slice(0, 3)));
    if (monthIdx >= 0 && day && year) {
      return `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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

function parsePhases(md: string): PlanPhase[] {
  const phases: PlanPhase[] = [];
  const tableMatch = md.match(/\|\s*Phase\s*\|\s*Weeks\s*\|[\s\S]*?(?=\n\n|\n## )/i);
  if (!tableMatch) return phases;

  const rows = tableMatch[0].split('\n').filter((r) => r.startsWith('|') && !r.includes('---'));
  for (const row of rows.slice(1)) {
    const cols = row
      .split('|')
      .map((c) => c.trim())
      .filter(Boolean);
    if (cols.length < 2) continue;
    const phaseCol = cols[0].replace(/\*\*/g, '').replace(/^\d+\s*[—–-]\s*/i, '').trim();
    const weekRange = cols[1].match(/(\d+)\s*[–—-]\s*(\d+)/);
    if (!weekRange) continue;
    phases.push({
      name: phaseCol,
      startWeek: parseInt(weekRange[1], 10),
      endWeek: parseInt(weekRange[2], 10),
      goal: cols[2]?.replace(/\*\*/g, '').trim(),
    });
  }
  return phases;
}

function parseWeeklyTable(md: string): PlanWeek[] {
  const weeks: PlanWeek[] = [];
  const tableMatch = md.match(/\|\s*Wk\s*\|\s*Phase[\s\S]*?(?=\n\n|\n## |\nYou never)/i);
  if (!tableMatch) return weeks;

  const rows = tableMatch[0].split('\n').filter((r) => r.startsWith('|') && !r.includes('---'));
  for (const row of rows.slice(1)) {
    const cols = row
      .split('|')
      .map((c) => c.trim().replace(/\*\*/g, ''))
      .filter(Boolean);
    if (cols.length < 7) continue;
    const week = parseInt(cols[0], 10);
    if (Number.isNaN(week)) continue;
    const keyFocus = cols[6] ?? '';
    const notes: string[] = [];
    if (/deload/i.test(keyFocus)) notes.push('Deload week');
    weeks.push({
      week,
      phase: cols[1],
      targetHours: parseFloat(cols[2]) || undefined,
      longRide: cols[3],
      longRun: cols[4],
      longSwim: cols[5],
      keyFocus,
      notes: notes.length ? notes : undefined,
    });
  }
  return weeks;
}

function parsePhaseTemplates(md: string): Map<string, PlannedSession[]> {
  const byPhase = new Map<string, PlannedSession[]>();
  const sectionRegex =
    /###\s+(\w+)\s+phase\s+week\s*\(example\)([\s\S]*?)(?=###|## |$)/gi;
  let match: RegExpExecArray | null;
  while ((match = sectionRegex.exec(md)) !== null) {
    const phaseKey = match[1].toLowerCase();
    const body = match[2];
    const sessions: PlannedSession[] = [];
    const dayLines = body.match(/^\s*-\s*\*\*(\w+)\*\*\s*[—–-]\s*(.+)$/gim);
    if (dayLines) {
      for (const line of dayLines) {
        const dm = line.match(/\*\*(\w+)\*\*\s*[—–-]\s*(.+)/i);
        if (!dm) continue;
        const dayKey = dm[1].slice(0, 3).toLowerCase();
        const details = dm[2].trim();
        sessions.push({
          day: dayKey,
          title: DAY_LABELS[dayKey] ?? dm[1],
          details,
          type: inferType(details),
        });
      }
    }
    if (sessions.length) byPhase.set(phaseKey, sessions);
  }
  return byPhase;
}

function inferType(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('swim')) return 'swim';
  if (t.includes('bike') || t.includes('ride')) return 'bike';
  if (t.includes('run') || t.includes('jog')) return 'run';
  if (t.includes('strength') || t.includes('lift')) return 'strength';
  if (t.includes('rest')) return 'rest';
  if (t.includes('brick')) return 'brick';
  return 'other';
}

function extractBulletSection(md: string, heading: RegExp): string[] {
  const m = md.match(heading);
  if (!m || m.index === undefined) return [];
  const start = m.index + m[0].length;
  const rest = md.slice(start);
  const end = rest.search(/\n## /);
  const section = end >= 0 ? rest.slice(0, end) : rest;
  return section
    .split('\n')
    .map((l) => l.replace(/^[-*]\s+/, '').replace(/\*\*/g, '').trim())
    .filter((l) => l.length > 10 && !l.startsWith('|'));
}

function extractTitle(md: string): string {
  const h1 = md.match(/^#\s+(.+)$/m);
  return h1?.[1]?.replace(/\*\*/g, '').trim() ?? 'Tempo Plan';
}

function inferSportTypes(md: string): string[] {
  const sports: string[] = [];
  const lower = md.toLowerCase();
  if (lower.includes('swim')) sports.push('swim');
  if (lower.includes('bike') || lower.includes('cycle')) sports.push('bike');
  if (lower.includes('run')) sports.push('run');
  if (lower.includes('strength') || lower.includes('lift')) sports.push('strength');
  return sports.length ? sports : ['swim', 'bike', 'run'];
}

export function validatePlan(plan: TrainingPlan): string[] {
  const errors: string[] = [];
  if (!plan.id) errors.push('Missing plan id');
  if (!plan.name) errors.push('Missing plan name');
  if (!plan.rawMarkdown) errors.push('Missing raw markdown');
  if (!plan.weeks?.length) errors.push('No weeks parsed');
  return errors;
}

export function parseTrainingPlanMarkdown(
  md: string,
  id?: string,
): { plan: TrainingPlan; warnings: string[] } {
  const warnings: string[] = [];
  const raceDate = parseDate(md);
  if (!raceDate) warnings.push('Could not parse race date.');
  const effectiveRace =
    raceDate ?? new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10);

  const phases = parsePhases(md);
  let weeks = parseWeeklyTable(md);
  if (!weeks.length) warnings.push('No weekly progression table found.');
  const totalWeeks = weeks.length || 21;
  const startDate = parsePlanStart(md, effectiveRace, totalWeeks);
  const templates = parsePhaseTemplates(md);

  weeks = weeks.map((w) => {
    const phaseKey = (w.phase ?? '').toLowerCase().replace(/phase\s*\d+\s*[—–-]\s*/i, '');
    const baseKey = ['base', 'build', 'peak', 'taper', 'race'].find((k) => phaseKey.includes(k));
    const sessions = baseKey ? templates.get(baseKey) : undefined;
    return sessions?.length ? { ...w, plannedSessions: sessions } : w;
  });

  if (!phases.length && weeks.length) {
    const inferred = new Map<string, { start: number; end: number }>();
    for (const w of weeks) {
      const name = w.phase ?? 'Base';
      const ex = inferred.get(name);
      if (!ex) inferred.set(name, { start: w.week, end: w.week });
      else ex.end = w.week;
    }
    for (const [name, range] of inferred) {
      phases.push({ name, startWeek: range.start, endWeek: range.end });
    }
  }

  const plan: TrainingPlan = {
    id: id ?? `plan-${Date.now()}`,
    name: extractTitle(md),
    raceName: extractTitle(md),
    raceDate: effectiveRace,
    startDate,
    totalWeeks,
    sportTypes: inferSportTypes(md),
    phases,
    weeks,
    rules: extractBulletSection(md, /##\s+When to back off/i),
    readinessWarnings: extractBulletSection(md, /##\s+When to back off/i).slice(0, 5),
    gearChecklist: extractBulletSection(md, /##\s+Gear/i),
    raceNotes: extractBulletSection(md, /##\s+Race-week/i),
    rawMarkdown: md,
    createdAt: new Date().toISOString(),
  };

  return { plan, warnings };
}

export function getTodaySession(
  plan: TrainingPlan,
  weekNumber: number,
  dayOfWeek: number,
): PlannedSession | null {
  const week = plan.weeks.find((w) => w.week === weekNumber);
  if (!week?.plannedSessions?.length) return null;
  const dayKey = DAY_ORDER[dayOfWeek === 0 ? 6 : dayOfWeek - 1];
  return week.plannedSessions.find((s) => s.day === dayKey) ?? null;
}

export function formatSession(s: PlannedSession | null): string | null {
  if (!s) return null;
  return s.details ?? s.title ?? null;
}

export function isDeloadWeek(week: PlanWeek | null): boolean {
  if (!week) return false;
  return (
    /deload/i.test(week.keyFocus ?? '') ||
    (week.notes ?? []).some((n) => /deload/i.test(n))
  );
}
