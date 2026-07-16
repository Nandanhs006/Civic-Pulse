export type Severity = 'critical' | 'moderate' | 'low' | 'resolved';

/** Anything with a priority_score + status can be bucketed (MapIssue, Suggestion). */
export interface Scored {
  priority_score: number;
  status: string;
}

export const SEVERITY_COLOR: Record<Severity, string> = {
  critical: '#ef4444', // red
  moderate: '#f59e0b', // amber
  low: '#3b82f6', // blue
  resolved: '#22c55e', // green
};

export const SEVERITY_ORDER: { key: Severity; labelKey: string }[] = [
  { key: 'critical', labelKey: 'sev.critical' },
  { key: 'moderate', labelKey: 'sev.moderate' },
  { key: 'low', labelKey: 'sev.low' },
  { key: 'resolved', labelKey: 'sev.resolved' },
];

// Anything past the initial "Submitted"/"Processing" stage counts as being acted on.
const RESOLVED_STATUSES = new Set([
  'Reviewed', 'Approved', 'Sanctioned', 'Work In Progress', 'Completed', 'Rejected',
]);

/** Single source of truth for score -> severity buckets (used everywhere). */
export function bucketOf(score: number): Exclude<Severity, 'resolved'> {
  if (score > 75) return 'critical';
  if (score >= 45) return 'moderate';
  return 'low';
}

/** Status-aware severity: acted-on issues are 'resolved' regardless of score. */
export function severityOf(issue: Scored): Severity {
  if (RESOLVED_STATUSES.has(issue.status)) return 'resolved';
  return bucketOf(issue.priority_score);
}

/** Convenience: the display colour for any scored item. */
export function colorOf(issue: Scored): string {
  return SEVERITY_COLOR[severityOf(issue)];
}
