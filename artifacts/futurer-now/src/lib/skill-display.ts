import { useCallback } from 'react';
import { translationCatalog, useTranslation, type Language } from './i18n';
import { localizeSkill, normalizeSkillKey } from './skill-gap-localization';

/**
 * Shared display-only skill labels for Modules 01/02.
 * Never changes stored names, IDs, matching inputs or API payloads.
 * - custom=true skills are always shown exactly as entered.
 * - Protected brands/tools/standards stay unchanged.
 * - Unknown names fall back to the original string.
 */
const EXTRA_PROTECTED = new Set(['typescript', 'java', 'github', 'api', 'chatgpt']);

// Broad areas and library terms not present in the skill-gap general dictionary,
// plus terminology-standard overrides (English retained where helpful).
const EXTRA_GENERAL: Record<string, readonly [string, string]> = {
  programming: ['Pengaturcaraan', '编程'],
  'web development': ['Pembangunan web', 'Web 开发'],
  'cloud computing': ['Pengkomputeran awan', '云计算'],
  cybersecurity: ['Keselamatan siber', '网络安全'],
  'engineering-related skills': ['Kemahiran berkaitan kejuruteraan', '工程相关技能'],
  'other technical skills': ['Kemahiran teknikal lain', '其他技术技能'],
  'digital literacy': ['Literasi digital', '数字素养'],
  'productivity tools': ['Alat produktiviti', '办公效率工具'],
  'online collaboration': ['Kerjasama dalam talian', '在线协作'],
  mandarin: ['Bahasa Mandarin', '普通话'],
  debugging: ['Penyahpepijatan (Debugging)', '调试（Debugging）'],
  'object-oriented programming (oop)': ['Pengaturcaraan berorientasikan objek (OOP)', '面向对象编程（OOP）'],
  'search engine optimization (seo)': ['Pengoptimuman enjin carian (SEO)', '搜索引擎优化（SEO）'],
};

export function displaySkillName(name: string, language: Language, custom = false): string {
  if (custom || language === 'EN') return name;
  const key = normalizeSkillKey(name);
  if (EXTRA_PROTECTED.has(key)) return name;
  const extra = EXTRA_GENERAL[key];
  if (extra) return extra[language === 'BM' ? 0 : 1];
  const localized = localizeSkill(name, language);
  if (localized.kind === 'general') return localized.label;
  if (localized.kind !== 'unknown') return name;
  const message = translationCatalog[name];
  return message?.[language === 'BM' ? 1 : 2]?.trim() || name;
}

/** Hook form: `skillLabel(name, custom?)`. */
export function useSkillLabel() {
  const { language } = useTranslation();
  return useCallback((name: string, custom = false) => displaySkillName(name, language, custom), [language]);
}
