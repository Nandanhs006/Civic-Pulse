import { MapIssue } from '../../../types';

export type Severity = 'critical' | 'moderate' | 'low' | 'resolved';

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

export function severityOf(issue: MapIssue): Severity {
  if (RESOLVED_STATUSES.has(issue.status)) return 'resolved';
  if (issue.priority_score > 75) return 'critical';
  if (issue.priority_score >= 45) return 'moderate';
  return 'low';
}
