import type { JobListing } from '@workspace/api-client-react';

const normalize = (value: string) => value.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');

export function isJobDataset(value: unknown): value is JobListing[] {
  return Array.isArray(value) && value.every((job) => job && typeof job.id === 'string'
    && typeof job.title === 'string' && typeof job.company === 'string'
    && typeof job.source === 'string' && typeof job.experience === 'string'
    && typeof job.education === 'string'
    && (job.salaryMonthlyRm === null || typeof job.salaryMonthlyRm === 'number')
    && (job.salaryText === undefined || typeof job.salaryText === 'string')
    && (job.sourceUrl === null || typeof job.sourceUrl === 'string')
    && Array.isArray(job.technicalSkills) && job.technicalSkills.every((skill: unknown) => typeof skill === 'string')
    && Array.isArray(job.softSkills) && job.softSkills.every((skill: unknown) => typeof skill === 'string'));
}

/** Deliberately simpler than personalised matching. No inferred skills or scores. */
export function fallbackListingOrder(jobs: readonly JobListing[], skills: readonly string[]): JobListing[] {
  const selected = new Set(skills.map(normalize).filter(Boolean));
  const overlap = (job: JobListing) => new Set([...job.technicalSkills, ...job.softSkills].map(normalize).filter((skill) => selected.has(skill))).size;
  return [...jobs].sort((a, b) => overlap(b) - overlap(a) || a.id.localeCompare(b.id, 'en', { numeric: true }));
}

export function matchingFailureKind(error: unknown): 'profile' | 'data' | 'service' {
  if (!error || typeof error !== 'object') return 'service';
  const failure = error as { status?: number; data?: { code?: string } };
  if (failure.data?.code === 'JOB_DATA_UNAVAILABLE') return 'data';
  return failure.status === 400 ? 'profile' : 'service';
}
