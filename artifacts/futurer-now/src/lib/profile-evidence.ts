import type { EvidenceItem, SkillsProfile } from './skills-profile.ts';

const normalizeName = (value: string) => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();

export function evidenceHasContent(item: EvidenceItem): boolean {
  return Boolean(item.title.trim() || item.description.trim() || item.outcome.trim() || item.timing.trim() || item.reference.trim());
}

/**
 * Evidence is shown beside a match only when it is linked to the exact saved
 * profile skill returned by the matcher. Free text is never mined for skills.
 */
export function evidenceForMatchedSkill(profile: SkillsProfile | undefined, matchedBy: string | null): EvidenceItem[] {
  if (!profile || !matchedBy?.trim()) return [];
  const matchedName = normalizeName(matchedBy);
  const profileSkillIds = new Set(profile.skills
    .filter((skill) => normalizeName(skill.name) === matchedName)
    .map((skill) => skill.id));
  if (!profileSkillIds.size) return [];

  return profile.experience.evidenceItems.filter((item) =>
    evidenceHasContent(item) && item.skills.some((skill) => profileSkillIds.has(skill.skillId)));
}

/** Only web URLs may become links; certificate references remain plain text. */
export function safeEvidenceUrl(reference: string): string | null {
  try {
    const url = new URL(reference.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}
