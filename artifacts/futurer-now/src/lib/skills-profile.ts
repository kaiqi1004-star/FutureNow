import { z } from 'zod';
import { skillCategories, skillGroups, type SkillCategory } from './skill-catalogue.ts';

export const PROFILE_KEY = 'futurenow.skills-profile.v1';
export const proficiencies = ['Beginner', 'Intermediate', 'Advanced', 'Expert'] as const;
export const categories = skillCategories;
const storedCategory = z.enum([...categories, 'Soft Skills & Languages']).transform((category): SkillCategory =>
  category === 'Soft Skills & Languages' ? 'Soft Skills' : category as SkillCategory,
);
const legacyLanguageNames = new Set([
  'arabic', 'bahasa melayu', 'bengali', 'burmese', 'cantonese', 'chinese', 'dutch',
  'english', 'french', 'german', 'hindi', 'hokkien', 'indonesian', 'italian',
  'japanese', 'khmer', 'korean', 'mandarin chinese', 'mandarin', 'nepali', 'persian',
  'portuguese', 'punjabi', 'russian', 'spanish', 'tagalog', 'tamil', 'thai', 'turkish',
  'urdu', 'vietnamese',
]);
const presetCategories = new Map<string, SkillCategory>();
for (const group of skillGroups) {
  for (const name of group.skills) presetCategories.set(name.normalize('NFKC').trim().toLocaleLowerCase('en'), group.category);
}
const savedSkillSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().trim().min(1).max(100),
  category: storedCategory,
  proficiency: z.enum(proficiencies),
  custom: z.boolean(),
}).transform((skill) => {
  if (skill.custom) {
    const normalizedName = skill.name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
    return skill.category === 'Soft Skills' && legacyLanguageNames.has(normalizedName)
      ? { ...skill, category: 'Languages' as const }
      : skill;
  }
  const migratedCategory = presetCategories.get(skill.name.normalize('NFKC').trim().toLocaleLowerCase('en'));
  return migratedCategory ? { ...skill, category: migratedCategory } : skill;
});
export const statuses = ['Student', 'Fresh Graduate', 'Employed', 'Unemployed', 'Career Changer'] as const;
export const educationLevels = ['Secondary school', 'Certificate', 'Diploma', "Bachelor’s degree", "Master’s degree", 'Doctorate', 'Other', 'Prefer not to say'] as const;
export const budgets = ['Free only', 'Low-cost', 'Open to paid programmes'] as const;
export const evidenceKinds = ['Academic project', 'Work or internship', 'Volunteering', 'Personal project', 'Practical example', 'Certification or training', 'Achievement', 'Other'] as const;
const evidenceSkillReference = z.object({
  skillId: z.string().min(1).max(100),
  skillName: z.string().trim().min(1).max(100),
});
export const evidenceItemSchema = z.object({
  id: z.string().min(1).max(100),
  kind: z.enum(evidenceKinds),
  title: z.string().max(200),
  skills: z.array(evidenceSkillReference).max(150),
  description: z.string().max(1500),
  outcome: z.string().max(500),
  timing: z.string().max(160),
  reference: z.string().max(2048),
});
export const skillOptions = Object.fromEntries(categories.map((category) => [
  category, skillGroups.filter((group) => group.category === category).flatMap((group) => group.skills),
])) as Record<(typeof categories)[number], string[]>;
const text = z.string().max(6000);
const selection = z.array(z.string().trim().min(1).max(200)).max(60);
const rating = z.union([z.literal(''), z.number().int().min(1).max(5)]);
export const profileSchema = z.object({
  basic: z.object({
    status: z.union([z.literal(''), z.enum(statuses)]), field: text, years: z.union([z.literal(''), z.number().min(0).max(80)]),
    // Optional so existing version-1 browser profiles remain valid.
    relevantYears: z.union([z.literal(''), z.number().min(0).max(80)]).optional(),
    education: z.union([z.literal(''), z.enum(educationLevels)]), direction: text,
  }),
  // Known values in the legacy combined category are separated on read; ambiguous
  // custom items stay editable. IDs, names, proficiency and evidence references stay unchanged.
  skills: z.array(savedSkillSchema).max(150),
  experience: z.object({
    academic: text, work: text, personal: text, examples: text, certifications: text, achievements: text, skipped: z.boolean(),
    // Optional for backward compatibility with profiles saved before structured evidence existed.
    evidenceItems: z.array(evidenceItemSchema).max(30).default([]),
  }),
  interests: z.object({
    industries: selection, activities: selection, priorities: selection,
    willingness: rating, weeklyHours: z.union([z.literal(''), z.number().min(0).max(168)]),
    budget: z.union([z.literal(''), z.enum(budgets)]),
  }),
  readiness: z.object({ technology: rating, problemApproach: text, adaptability: rating, realisticHours: z.union([z.literal(''), z.number().min(0).max(168)]) }),
});
export type SkillsProfile = z.infer<typeof profileSchema>;
export type ProfileSkill = SkillsProfile['skills'][number];
export type EvidenceItem = z.infer<typeof evidenceItemSchema>;
export type ProfileErrors = Record<string, string>;
export type TranslateMessage = (messageId: string, values?: Record<string, string | number>) => string;
export type ProfileMessage = {
  key: string;
  values?: Record<string, string | number>;
  localizedValues?: string[];
};
const identityTranslate: TranslateMessage = (messageId, values = {}) =>
  messageId.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? `{${name}}`));
export const sectionNames = ['Basic information', 'Current skills', 'Experience & evidence', 'Interests & preferences', 'Learning readiness'];
export function emptyProfile(): SkillsProfile {
  return {
    basic: { status: '', field: '', years: '', relevantYears: '', education: '', direction: '' }, skills: [],
    experience: { academic: '', work: '', personal: '', examples: '', certifications: '', achievements: '', skipped: false, evidenceItems: [] },
    interests: { industries: [], activities: [], priorities: [], willingness: '', weeklyHours: '', budget: '' },
    readiness: { technology: '', problemApproach: '', adaptability: '', realisticHours: '' },
  };
}
export function validateSection(p: SkillsProfile, section: number, translate: TranslateMessage = identityTranslate): ProfileErrors {
  const errors: ProfileErrors = {};
  const require = (key: string, value: unknown, label: string) => {
    if (value === '' || value === undefined || (typeof value === 'string' && !value.trim()) || (Array.isArray(value) && !value.length)) {
      errors[key] = translate('{field} is required.', { field: translate(label) });
    }
  };
  if (section === 0) {
    Object.entries(p.basic).filter(([key]) => key !== 'relevantYears').forEach(([key, value]) => require(`basic.${key}`, value, ({ status: 'Current status', field: 'Field of study or occupation', years: 'Years of work experience', education: 'Highest education level', direction: 'Preferred career direction' } as Record<string, string>)[key]));
    if (p.basic.years !== '' && (!Number.isFinite(p.basic.years) || p.basic.years < 0 || p.basic.years > 80)) errors['basic.years'] = translate('Enter years between 0 and 80.');
    if (p.basic.relevantYears !== undefined && p.basic.relevantYears !== '' && (!Number.isFinite(p.basic.relevantYears) || p.basic.relevantYears < 0 || p.basic.relevantYears > 80)) errors['basic.relevantYears'] = translate('Enter years between 0 and 80.');
  }
  if (section === 1) {
    require('skills', p.skills, 'At least one skill');
    const names = p.skills.map(s => s.name.trim().toLocaleLowerCase());
    if (new Set(names).size !== names.length) errors.skills = translate('Each skill must have a unique name.');
  }
  if (section === 3) {
    Object.entries(p.interests).forEach(([key, value]) => require(`interests.${key}`, value, ({ industries: 'An industry or career field', activities: 'A preferred activity', priorities: 'A career priority', willingness: 'Willingness to learn', weeklyHours: 'Weekly learning time', budget: 'Learning budget' } as Record<string, string>)[key]));
    if (p.interests.weeklyHours !== '' && (!Number.isFinite(p.interests.weeklyHours) || p.interests.weeklyHours < 0 || p.interests.weeklyHours > 168)) errors['interests.weeklyHours'] = translate('Enter hours between 0 and 168.');
  }
  if (section === 4) {
    Object.entries(p.readiness).forEach(([key, value]) => require(`readiness.${key}`, value, ({ technology: 'Technology learning comfort', problemApproach: 'Problem-solving approach', adaptability: 'Willingness to adapt', realisticHours: 'Realistic learning time' } as Record<string, string>)[key]));
    if (p.readiness.realisticHours !== '' && (!Number.isFinite(p.readiness.realisticHours) || p.readiness.realisticHours < 0 || p.readiness.realisticHours > 168)) errors['readiness.realisticHours'] = translate('Enter hours between 0 and 168.');
  }
  return errors;
}
export function validateProfile(p: SkillsProfile, translate: TranslateMessage = identityTranslate): ProfileErrors {
  return Object.assign({}, ...sectionNames.map((_, i) => validateSection(p, i, translate)));
}
export type TransferableStrength = {
  name: string;
  nameIsKey: boolean;
  explanation: ProfileMessage;
  source: ProfileMessage;
};
export function transferableStrengths(p: SkillsProfile): TransferableStrength[] {
  const strengths: TransferableStrength[] = p.skills.filter(s => s.category === 'Soft Skills').map(s => {
    const isPreset = !s.custom && skillOptions[s.category].includes(s.name);
    return {
      name: s.name,
      nameIsKey: isPreset,
      explanation: {
        key: 'You selected {skill} and rated your proficiency as {proficiency}. This is self-reported, not independently verified.',
        values: { skill: s.name, proficiency: s.proficiency },
        localizedValues: isPreset ? ['skill', 'proficiency'] : ['proficiency'],
      },
      source: { key: 'Current skills: {skill}', values: { skill: s.name }, localizedValues: isPreset ? ['skill'] : [] },
    };
  });
  if (typeof p.readiness.technology === 'number' && p.readiness.technology >= 4) strengths.push({
    name: 'Openness to technology learning',
    nameIsKey: true,
    explanation: {
      key: 'You rated your comfort with unfamiliar technologies {rating}/5. This suggests self-reported learning openness, not demonstrated technical ability.',
      values: { rating: p.readiness.technology },
    },
    source: { key: 'Learning readiness: technology comfort' },
  });
  if (typeof p.readiness.adaptability === 'number' && p.readiness.adaptability >= 4) strengths.push({
    name: 'Willingness to adapt',
    nameIsKey: true,
    explanation: {
      key: 'You rated your willingness to adapt to industry changes {rating}/5. This describes your stated willingness, not a prediction of success.',
      values: { rating: p.readiness.adaptability },
    },
    source: { key: 'Learning readiness: willingness to adapt' },
  });
  return strengths;
}
export function missingInformation(p: SkillsProfile, translate: TranslateMessage = identityTranslate): string[] {
  const missing = Object.values(validateProfile(p, translate));
  const fields = { academic: 'Academic projects', work: 'Work experience or internships', personal: 'Volunteering or personal projects', examples: 'Practical skill examples', certifications: 'Certifications or training', achievements: 'Achievements or outcomes' };
  for (const [key, label] of Object.entries(fields)) {
    if (!p.experience[key as keyof typeof fields].trim()) {
      missing.push(translate('{field}: not provided (optional).', { field: translate(label) }));
    }
  }
  if (p.experience.skipped) missing.unshift(translate('Experience section was skipped; any previously entered evidence is retained below.'));
  if (p.interests.weeklyHours !== '' && p.readiness.realisticHours !== '' && p.interests.weeklyHours !== p.readiness.realisticHours) {
    missing.push(translate('Learning time differs between preferences and self-assessment; review both values.'));
  }
  return missing;
}
const savedSchema = z.object({ version: z.literal(1), profile: profileSchema, step: z.number().int().min(0).max(4), submitted: z.boolean(), savedAt: z.string().datetime() });
export type SavedProfile = z.infer<typeof savedSchema>;
export type ProfileStorage = Pick<Storage, 'getItem' | 'setItem'>;
export function loadProfile(storage?: ProfileStorage): { saved: SavedProfile | null; error: string | null } {
  try {
    const raw = (storage ?? window.localStorage).getItem(PROFILE_KEY);
    if (!raw) return { saved: null, error: null };
    const result = savedSchema.safeParse(JSON.parse(raw));
    if (!result.success) return { saved: null, error: 'The saved profile is damaged or uses an unsupported format. It has not been changed. You can start a new profile and explicitly save to replace it.' };
    return { saved: result.data, error: null };
  } catch {
    return { saved: null, error: 'Your saved profile could not be read. Browser storage may be blocked or the saved data may be damaged. Answers entered now remain in memory until you leave this page.' };
  }
}
export function saveProfile(profile: SkillsProfile, step: number, submitted: boolean, storage?: ProfileStorage): { saved: SavedProfile | null; error: string | null } {
  try {
    const saved = savedSchema.parse({ version: 1, profile, step, submitted, savedAt: new Date().toISOString() });
    (storage ?? window.localStorage).setItem(PROFILE_KEY, JSON.stringify(saved));
    return { saved, error: null };
  } catch {
    return { saved: null, error: 'Profile not saved. Browser storage may be blocked or full. Your current answers remain on this page; enable storage or free space, then try saving again before leaving.' };
  }
}
