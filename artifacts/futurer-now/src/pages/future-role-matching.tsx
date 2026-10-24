import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Link } from 'wouter';
import { useMatchFutureReadyRoles } from '@workspace/api-client-react';
import type { JobListing, RoleMatch } from '@workspace/api-client-react';
import { AlertTriangle, ArrowLeft, ChevronLeft, ChevronRight, Compass, ExternalLink, Info, Lock, RefreshCw, Sparkles, UserRound } from 'lucide-react';
import { loadProfile, type SavedProfile, type SkillsProfile } from '@/lib/skills-profile';
import { matchingProfileInput } from '@/lib/matching-profile';
import { evidenceForMatchedSkill, evidenceHasContent, safeEvidenceUrl } from '@/lib/profile-evidence';
import { JobMatchFallback } from '@/components/job-match-fallback';
import { matchingFailureKind } from '@/lib/job-fallback';
import { languageLocales, useTranslation } from '@/lib/i18n';
import { useSkillLabel } from '@/lib/skill-display';
import './future-role-matching.css';

const categoryLabels: Record<JobListing['sector'], string> = {
  software: 'Software', mechanical: 'Mechanical', 'digital-marketing': 'Digital marketing',
  'human-resources': 'Human resources', 'accounting-finance': 'Accounting / finance', 'data-analytics': 'Data analytics',
};
const PAGE_SIZE = 6;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const salaryLabel = (job: JobListing, t: (key: string) => string, locale = 'en-MY') => {
  const raw = job.salaryText?.trim();
  if (raw) return raw;
  if (job.salaryMonthlyRm !== null) return `RM ${new Intl.NumberFormat(locale).format(job.salaryMonthlyRm)} ${t('monthly')}`;
  return t('Salary not disclosed');
};

function safeListingUrl(value: string | null | undefined): string | null {
  const candidate = value?.trim();
  if (!candidate) return null;
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? candidate : null;
  } catch {
    return null;
  }
}

function availableSourceText(value: string | null | undefined): string | null {
  const text = value?.trim();
  if (!text) return null;
  const comparable = text.replace(/[.!?]+$/, '').trim();
  return /^(?:not\s+(?:specified|stated|provided|available)(?:\s+(?:in|by)\s+(?:the\s+)?(?:source|listing|employer))?|n\/?a|unknown|[-—])$/i.test(comparable)
    ? null
    : text;
}

function readProfile() {
  const r = loadProfile();
  const profile = r.saved?.profile;
  return {
    saved: r.saved,
    error: r.error,
    key: JSON.stringify({
      skills: matchingProfileInput(r.saved).currentSkills,
      relevantYears: typeof profile?.basic.relevantYears === 'number' ? profile.basic.relevantYears : null,
      education: profile?.basic.education || null,
    }),
  };
}

function sdgGoalGroups(r: RoleMatch) {
  type Connection = RoleMatch['roleSdg']['connections'][number];
  const groups = new Map<number, { goalNumber: number; title: string; requirements: Set<string>; connections: Map<string, Connection> }>();
  const assessments = [
    r.roleSdg,
    ...r.matchedSkills.map((skill) => skill.sdg),
    ...r.skillGaps.map((skill) => skill.sdg),
  ];
  for (const assessment of assessments) {
    for (const connection of assessment.connections) {
      let group = groups.get(connection.goalNumber);
      if (!group) {
        group = { goalNumber: connection.goalNumber, title: connection.title, requirements: new Set(), connections: new Map() };
        groups.set(connection.goalNumber, group);
      }
      group.requirements.add(connection.evidence);
      const key = `${connection.target}|${connection.ruleId}|${connection.explanation}|${connection.conditions}`;
      group.connections.set(key, connection);
    }
  }
  return [...groups.values()]
    .sort((a, b) => a.goalNumber - b.goalNumber)
    .map((group) => ({ ...group, requirements: [...group.requirements], connections: [...group.connections.values()] }));
}

export default function FutureRoleMatchingPage() {
  const { t, language } = useTranslation();
  const skillLabel = useSkillLabel();
  const locale = languageLocales[language];
  const [state, setState] = useState(readProfile);
  const match = useMatchFutureReadyRoles();
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);
  const detailHead = useRef<HTMLHeadingElement>(null);
  const resultsHead = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef<string | null>(null);
  const resetRef = useRef(match.reset);
  resetRef.current = match.reset;
  const profileKeyRef = useRef(state.key);

  const refresh = useCallback(() => {
    const next = readProfile();
    if (next.key !== profileKeyRef.current) {
      profileKeyRef.current = next.key;
      resetRef.current(); setDetailId(null); setPage(1); setCategory('all');
    }
    setState(next);
  }, []);
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    document.addEventListener('visibilitychange', onVis);
    return () => { window.removeEventListener('focus', refresh); window.removeEventListener('storage', refresh); document.removeEventListener('visibilitychange', onVis); };
  }, [refresh]);

  const saved: SavedProfile | null = state.saved;
  const input = useMemo(() => matchingProfileInput(saved), [saved]);
  const skills = input.currentSkills;
  const incomplete = saved ? input.missingFields.length : 0;
  const data = match.isError ? undefined : match.data;
  const categories = useMemo(() => [...new Set((data?.results ?? []).map((r) => r.job.sector))], [data]);
  const filtered = useMemo(() => (data?.results ?? []).filter((r) => category === 'all' || r.job.sector === category), [data, category]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rankOf = (r: RoleMatch) => (data?.results.indexOf(r) ?? 0) + 1;
  const detail = detailId ? data?.results.find((r) => r.job.id === detailId) : undefined;

  useEffect(() => { if (detail) detailHead.current?.focus(); }, [detail]);
  useEffect(() => {
    if (!detailId && returnFocus.current) {
      const el = document.querySelector<HTMLElement>(`[data-testid="button-view-details-${returnFocus.current}"]`);
      (el ?? resultsHead.current)?.focus(); returnFocus.current = null;
    }
  }, [detailId]);

  const p = saved?.profile;
  const generate = () => {
    setDetailId(null); setPage(1); setCategory('all');
    match.mutate({ data: {
      currentSkills: skills,
      relevantExperienceYears: typeof p?.basic.relevantYears === 'number' ? p.basic.relevantYears : undefined,
      educationLevel: p?.basic.education || undefined,
    } });
  };

  return <div className="page-wrap rm-page">
    {!detail && <div className="rm-head">
      <div><div className="rm-eyebrow">{t('Module 02 · Future-Role Matching')}</div><h1>{t('Which supplied roles fit your skills?')}</h1>
        <p>{t('FutureNow compares your selected skills with real supplied job records and considers available experience and education information. Results estimate profile-to-role suitability; they are not hiring predictions, job security signals, or measures of national demand.')}</p></div>
      <div className="rm-privacy" data-testid="text-privacy-disclosure"><Lock size={16} /><span>{t('Matching uses specific skill names, optional relevant work years and education level. Total work years and other profile answers stay in this browser.')}</span></div>
    </div>}

    {detail && data ? <Detail r={detail} rank={rankOf(detail)} profile={p} headRef={detailHead} onBack={() => { returnFocus.current = detail.job.id; setDetailId(null); }} /> : <>
      <section className="rm-card" aria-labelledby="rm-profile-h">
        <div className="rm-toolbar"><div><div className="rm-eyebrow">{t('Your saved profile')}</div><h2 id="rm-profile-h">{t('Skills used for matching')}</h2></div>
          <button type="button" className="rm-btn" onClick={refresh} data-testid="button-refresh-profile"><RefreshCw size={14} />{t('Reload saved profile')}</button></div>
        {state.error ? <div className="rm-note is-warn" role="alert" data-testid="status-profile-error"><AlertTriangle size={16} /><p>{t(state.error)} <Link href="/skills-profile" data-testid="link-profile-fix">{t('Open Skills Profile')}</Link></p></div>
          : !saved ? <div className="rm-empty" data-testid="status-no-profile"><UserRound size={26} /><h3>{t('No saved profile yet')}</h3><p className="rm-muted">{t('Save at least one skill in your Skills Profile, then come back. No skills are assumed for you.')}</p><Link href="/skills-profile" className="rm-btn rm-btn-primary" data-testid="link-build-profile">{t('Build your skills profile')}</Link></div>
          : !skills.length ? <div className="rm-empty" data-testid="status-no-skills"><UserRound size={26} /><h3>{t(saved.profile.skills.length ? 'Only broad areas are selected' : 'Your profile has no skills yet')}</h3><p className="rm-muted">{t(saved.profile.skills.length ? 'Broad Technical Areas help you explore. Add a specific skill you have before generating matches; broad areas do not count as skills.' : 'Add at least one specific skill to your saved profile to generate matches.')}</p><Link href="/skills-profile" className="rm-btn rm-btn-primary" data-testid="link-add-skills">{t('Add skills')}</Link></div>
          : <>
            {incomplete > 0 && <div className="rm-note" data-testid="status-incomplete-profile"><Info size={16} /><p>{t('This is a {status} profile with {count} required {answerLabel} still missing ({fields}). Matching works with your skills, but', { status: t(input.isDraft ? 'draft' : 'saved'), count: incomplete, answerLabel: t(incomplete === 1 ? 'answer' : 'answers'), fields: input.missingFields.map((field) => t(field)).join(' ') })} <Link href="/skills-profile">{t('completing your profile')}</Link> {t('keeps your context accurate.')}</p></div>}
            <div className="rm-profile">
              <div><p className="rm-muted">{t('{count} skill {label} will be sent. Proficiency is shown for your reference and is not weighted.', { count: skills.length, label: t(skills.length === 1 ? 'name' : 'names') })}</p>
                <div className="rm-chips" data-testid="list-profile-skills">{saved.profile.skills.map((s) => <span key={s.id} className="rm-chip"><span>{skillLabel(s.name, s.custom)}</span><small>{t(s.proficiency)}</small></span>)}</div></div>
               <div className="rm-context"><h3>{t('Profile context')}</h3><p className="rm-muted">{t('Relevant years and education are compared separately; total work years, interests, direction, evidence, readiness, and proficiency do not affect the score.')}</p><dl>
                <dt>{t('Total work experience')}</dt><dd>{typeof p?.basic.years === 'number' ? `${p.basic.years} ${t('years')} · ${t('context only')}` : t('Not provided')}</dd>
                <dt>{t('Relevant work experience')}</dt><dd>{typeof p?.basic.relevantYears === 'number' ? `${p.basic.relevantYears} ${t('years')}` : t('Not provided')}</dd>
                <dt>{t('Education')}</dt><dd>{p?.basic.education ? t(p.basic.education) : t('Not provided')}</dd>
                <dt>{t('Direction')}</dt><dd>{p?.basic.direction || t('Not provided')}</dd>
                <dt>{t('Interests')}</dt><dd>{p?.interests.industries.map((industry) => t(industry)).join(', ') || t('Not provided')}</dd>
                 <dt>{t('Evidence')}</dt><dd>{p && (Object.entries(p.experience).some(([k, v]) => k !== 'skipped' && k !== 'evidenceItems' && typeof v === 'string' && v.trim()) || p.experience.evidenceItems.some(evidenceHasContent)) ? t('Provided in profile') : t('Not provided')}</dd>
              </dl></div>
            </div>
            <div className="rm-actions"><button type="button" className="rm-btn rm-btn-primary" onClick={generate} disabled={match.isPending} data-testid="button-generate-matches"><Sparkles size={15} />{match.isPending ? t('Matching...') : data ? t('Regenerate matches') : t('Generate matches')}</button><Link href="/skills-profile" className="rm-btn" data-testid="link-edit-profile">{t('Edit profile')}</Link></div>
          </>}
      </section>

       {match.isPending && <div className="rm-list" role="status" aria-label={t('Loading matches')}>{[0, 1, 2].map((i) => <div key={i} className="rm-skel" />)}</div>}
       {match.isError && <>
         <div className="rm-note is-warn" role="alert" data-testid="status-match-error"><AlertTriangle size={16} /><p>{t(matchingFailureKind(match.error) === 'profile'
           ? 'Your saved matching fields could not be validated. Review your skills, experience and education, then retry.'
           : matchingFailureKind(match.error) === 'data'
             ? 'The matching service could not load the supplied job data. Your saved profile is unchanged.'
             : 'Personalised matching is temporarily unavailable. This does not mean there are no suitable roles. Your saved profile is unchanged.')}
           <button type="button" className="rm-btn" onClick={generate} data-testid="button-retry-matches">{t('Try again')}</button></p></div>
         <JobMatchFallback skills={skills} />
       </>}
      {data && !match.isPending && <>
         <details className="rm-card rm-method-disclosure" aria-label={t('How matching works')} data-testid="details-matching-method">
           <summary className="rm-method-summary">
             <span className="rm-eyebrow">{t('How matching works')}</span>
             <span className="rm-method-preview">
               <span><b>{t('Skills')}:</b> {t('Compares the skills in your saved profile with each role’s listed requirements.')}</span>
                <span><b>{t('Experience and education')}:</b> {t('Uses relevant years only for clear source minimums; education is a separate level threshold.')}</span>
               <span><b>{t('Ranking')}:</b> {t('Ranks by overall score; exact ties use skill coverage, then record ID.')}</span>
               <span className="rm-muted">{t('Results are estimates based on available information, not hiring predictions. A skill not found in your profile is not proof that you lack it.')}</span>
             </span>
           </summary>
           <div className="rm-method-expanded">
             <p className="rm-muted">{t('The overall matching score is a weighted estimate: industry-specific skills 40%, technical skills 30%, digital skills 12.5%, soft skills 12.5% and relevant experience 5% where the listing states a clear minimum. Categories that do not apply to a role are left out and the remaining weights are rescaled. Education, evidence and broad technical areas do not add to the score; education is shown as a separate check. Skill coverage is a different number: the share of listed requirements found in your profile. The same ranking rule applies to every listed role.')}</p>
              <p className="rm-muted">{t('Skill coverage is separate from the overall matching score. Neither is a probability of being hired.')}</p>
           </div>
         </details>
         {!data.results.length ? <div className="rm-card rm-empty" data-testid="status-no-results"><Compass size={26} /><h3>{t('The supplied job dataset is empty')}</h3><p className="rm-muted">{t('The calculation received no source records. This is not a finding about your suitability.')}</p><button className="rm-btn" type="button" onClick={generate}>{t('Try again')}</button></div>
           : data.results.every((r) => r.matchedCount === 0) ? <div className="rm-note is-warn" data-testid="status-no-coverage"><AlertTriangle size={16} /><p>{t('None of your skill names matched any listed requirement. Roles are still listed below so you can see what the records ask for.')}</p></div> : null}
        {data.results.length > 0 && <section aria-labelledby="rm-results-h">
           <div className="rm-toolbar"><div><div className="rm-eyebrow">{t('Ranked results')}</div><h2 id="rm-results-h" ref={resultsHead} tabIndex={-1} style={{ margin: '4px 0 0' }}>{t('{count} roles', { count: filtered.length })}</h2></div>
             <div><label className="rm-label" htmlFor="rm-cat">{t('Career category')}</label><select id="rm-cat" className="rm-select" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} data-testid="select-match-category"><option value="all">{t('All categories')}</option>{categories.map((c) => <option key={c} value={c}>{t(categoryLabels[c] ?? c)}</option>)}</select></div></div>
           <p className="rm-metric-key" data-testid="text-score-coverage-definition">
             <span><b>{t('Overall score')}:</b> {t('A weighted profile-to-role suitability estimate.')}</span>
             <span><b>{t('Skill coverage')}:</b> {t('The share of distinct listed requirements matched in your saved profile.')}</span>
           </p>
           <ol className="rm-list">{visible.map((r) => <li key={r.job.id} className="rm-result" data-testid={`card-match-${r.job.id}`}>
             <span className="rm-rank" aria-label={t('Rank {rank}', { rank: rankOf(r) })}>#{rankOf(r)}</span>
              <div className="rm-result-main"><h3 data-testid={`text-match-title-${r.job.id}`}>{r.job.title}</h3><div className="rm-meta">{r.job.company} · {t(categoryLabels[r.job.sector])}</div></div>
              <div className="rm-fit">
                <div className="rm-overall">
                  <strong data-testid={`text-match-score-${r.job.id}`}>{r.overallScore === null ? t('Not calculable') : `${r.overallScore}%`}</strong>
                  <small>{t('weighted suitability estimate')}</small>
                  {r.overallScore !== null && <div className="rm-bar" role="img" aria-label={t('Overall suitability estimate {score} percent', { score: r.overallScore })}><span style={{ width: `${Math.max(0, Math.min(100, r.overallScore))}%` }} /></div>}
                </div>
                <div className="rm-coverage" data-testid={`text-match-count-${r.job.id}`}>
                  <strong>{r.requiredCount ? t('{matched} of {required} listed skills matched', { matched: r.matchedCount, required: r.requiredCount }) : t('No listed skill requirements')}</strong>
                  {r.skillCoverage !== null && <small>{r.skillCoverage}% {t('distinct-skill coverage')}</small>}
                </div>
                {r.requiredTechnicalCount > 0 && <small className="rm-technical-coverage" data-testid={`text-match-technical-coverage-${r.job.id}`}>{t('Technical')}: {r.matchedTechnicalCount} / {r.requiredTechnicalCount} ({r.technicalCoverage ?? 0}%)</small>}
                <div className="rm-gap-preview" data-testid={`text-match-gaps-${r.job.id}`}>
                  <b>{t('Skills to explore')}:</b>
                  {r.skillGaps.length
                    ? <span>{r.skillGaps.slice(0, 3).map((gap) => skillLabel(gap.skill)).join(', ')}{r.skillGaps.length > 3 ? ` · ${t('{count} more', { count: r.skillGaps.length - 3 })}` : ''}</span>
                    : <span>{t(r.requiredCount ? 'No gaps against listed skills.' : 'No listed skill requirements')}</span>}
                </div>
                <div className="rm-result-meta">
                  {(r.job.salaryText || typeof r.job.salaryMonthlyRm === 'number') && <span>{salaryLabel(r.job, t, locale)}</span>}
                   {r.job.source.trim() && <span>{t('Source platform')}: {r.job.source}</span>}
                  {safeListingUrl(r.job.sourceUrl) && <a href={safeListingUrl(r.job.sourceUrl)!} target="_blank" rel="noopener noreferrer" data-testid={`link-match-source-${r.job.id}`}>{t('View original listing')} <ExternalLink size={11} /></a>}
                </div>
                <button type="button" className="rm-btn" onClick={() => setDetailId(r.job.id)} data-testid={`button-view-details-${r.job.id}`}>{t('View details')}<ChevronRight size={14} /></button>
              </div>
          </li>)}</ol>
           {filtered.length > PAGE_SIZE && <div className="rm-pager"><span>{t('Showing')} {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} {t('of')} {filtered.length}</span><div>
             <button type="button" className="rm-btn" aria-label={t('Previous page')} disabled={page === 1} onClick={() => setPage((x) => x - 1)} data-testid="button-matches-prev"><ChevronLeft size={15} /></button><span>{page} / {pages}</span>
             <button type="button" className="rm-btn" aria-label={t('Next page')} disabled={page === pages} onClick={() => setPage((x) => x + 1)} data-testid="button-matches-next"><ChevronRight size={15} /></button></div></div>}
        </section>}
      </>}
    </>}
  </div>;
}

function Detail({ r, rank, profile, headRef, onBack }: { r: RoleMatch; rank: number; profile?: SkillsProfile; headRef: RefObject<HTMLHeadingElement | null>; onBack: () => void }) {
  const { t, language } = useTranslation();
  const skillLabel = useSkillLabel();
  const withOriginal = (name: string) => {
    const label = skillLabel(name);
    return label === name ? <strong>{name}</strong> : <><strong lang={language === 'BM' ? 'ms' : 'zh-CN'}>{label}</strong> <small className="rm-original" lang="en">{t('Original: {name}', { name })}</small></>;
  };
  const j = r.job;
  const groups = sdgGoalGroups(r);
  const experienceLabels: Record<string, string> = {
    meets: 'Meets the listed minimum',
    gap: 'Below the listed minimum',
    uncertain: 'Not directly comparable',
    not_provided: 'Relevant experience not provided',
    not_stated: 'Not stated in the listing',
    not_required: 'No prior experience required',
    unavailable: 'Not available in this listing',
  };
  const educationStatus = r.educationFit.status === 'meets'
    ? 'Meets listed education level'
    : r.educationFit.status === 'gap'
      ? 'Below listed education level'
      : 'Not specified / unclear';
  const categoryLabel: Partial<Record<RoleMatch['scoreBreakdown'][number]['category'], string>> = {
    'industry-specific': 'Industry-Specific Skills',
    technical: 'Technical Skills',
    digital: 'Digital Skills',
    soft: 'Soft Skills',
    experience: 'Experience',
  };
  const roleLevelLabels: Record<RoleMatch['experienceFit']['roleLevel'], string> = {
    internship: 'Internship-level title',
    entry: 'Entry-level title',
    mid: 'Mid-level title',
    senior: 'Senior-level title',
    lead: 'Lead-level title',
    manager: 'Manager-level title',
    unspecified: 'Not specified by the title',
  };
  const yearsText = (years: number | null) => years === null
    ? t('Not provided')
    : `${years} ${t(years === 1 ? 'year' : 'years')}`;
  const originalListingUrl = safeListingUrl(j.sourceUrl);
  const coverageRows = r.scoreBreakdown.filter((item) =>
    item.category !== 'experience'
    && item.category !== 'evidence'
    && item.category !== 'broad-technical-areas'
    && item.status === 'scored'
    && item.coverage !== null,
  );
  const experienceSource = availableSourceText(r.experienceFit.sourceText);
  const educationSource = availableSourceText(r.educationFit.sourceText);
  const hasLinkedEvidence = r.matchedSkills.some((skill) => evidenceForMatchedSkill(profile, skill.matchedBy).length > 0);
  return <section className="rm-detail" aria-labelledby="rm-detail-h" data-testid={`detail-match-${j.id}`}>
    <header className="rm-detail-heading rm-card">
      <h2 id="rm-detail-h" ref={headRef} tabIndex={-1} data-testid="text-detail-title">{j.title}</h2>
       <p className="rm-meta" data-testid="text-detail-company">{j.company}{j.source.trim() && <> · {t('Source platform')}: {j.source}</>}</p>
      <div className="rm-eyebrow">{t('Rank')} #{rank} · {t(categoryLabels[j.sector])}</div>
    </header>

    <section className="rm-detail-metrics" aria-label={t('Match summary')}>
      <article className="rm-detail-metric rm-detail-metric-primary">
        <span>{t('Estimated overall match score')}</span>
        <strong data-testid="text-detail-score">{r.overallScore === null ? t('Not calculable') : `${r.overallScore}%`}</strong>
        {r.overallScore !== null && <div className="rm-bar" role="img" aria-label={t('Overall suitability estimate {score} percent', { score: r.overallScore })}><span data-testid="bar-detail-overall" style={{ width: `${Math.max(0, Math.min(100, r.overallScore))}%` }} /></div>}
        <small>{t('Weighted estimate, not a hiring probability.')}</small>
      </article>
      <article className="rm-detail-metric">
        <span>{t('Skill coverage')}</span>
        <strong data-testid="text-detail-coverage">{r.skillCoverage === null ? t('Not available in this listing') : `${r.matchedCount} / ${r.requiredCount} (${r.skillCoverage}%)`}</strong>
      </article>
      {r.requiredTechnicalCount > 0 && <article className="rm-detail-metric">
        <span>{t('Technical skill coverage')}</span>
        <strong data-testid="text-detail-technical-coverage">{r.matchedTechnicalCount} / {r.requiredTechnicalCount} ({r.technicalCoverage ?? 0}%)</strong>
      </article>}
    </section>

    <section className="rm-detail-section" aria-labelledby="rm-matched-h">
      <div className="rm-detail-section-head"><div><h3 id="rm-matched-h">{t('Matched skills')}</h3></div></div>
      {r.matchedSkills.length
        ? <div className="rm-skill-preview" data-testid="list-matched-skill-preview">{r.matchedSkills.slice(0, 4).map((skill) => <span className="rm-chip" key={skill.skill} title={skill.skill}>{skillLabel(skill.skill)}</span>)}{r.matchedSkills.length > 4 && <span className="rm-chip is-plain">+{r.matchedSkills.length - 4}</span>}</div>
        : <p className="rm-muted">{t(r.requiredCount ? 'No listed skills matched.' : 'Not available in this listing')}</p>}
      <details className="rm-detail-disclosure" data-testid="details-matched-skills">
        <summary>{t(hasLinkedEvidence ? 'Matched skills and linked evidence' : 'Matched skills')}</summary>
        {r.matchedSkills.length ? <ul className="rm-skill-table">{r.matchedSkills.map((s) => {
          const evidence = evidenceForMatchedSkill(profile, s.matchedBy);
          return <li key={s.skill} className="rm-skill-row" data-testid={`row-matched-${slug(s.skill)}`}><header>{withOriginal(s.skill)}</header><div className="rm-meta">{t(categoryLabel[s.scoreCategory] ?? s.scoreCategory)}</div>
            {evidence.length > 0 && <div className="rm-linked-evidence" data-testid={`evidence-for-${slug(s.skill)}`}>
              <strong>{t('User-provided evidence — not independently verified')}</strong>
              <ul>{evidence.map((item) => {
                const url = safeEvidenceUrl(item.reference);
                return <li key={item.id}>
                  <b>{item.title || t(item.kind)}</b><span>{t(item.kind)}</span>
                  {item.description && <p>{item.description}</p>}
                  {item.outcome && <p><b>{t('Outcome')}:</b> {item.outcome}</p>}
                  {item.timing && <small>{item.timing}</small>}
                  {item.reference && <small>{url ? <a href={url} target="_blank" rel="noopener noreferrer">{t('Open reference')} <ExternalLink size={11} /></a> : `${t('Reference')}: ${item.reference}`}</small>}
                </li>;
              })}</ul>
              <small>{t('This evidence does not change the suitability score.')}</small>
            </div>}
          </li>;
        })}</ul> : <p className="rm-muted">{t('No listed skills matched.')}</p>}
      </details>
    </section>

    <section className="rm-detail-section" aria-labelledby="rm-explore-h">
      <div className="rm-detail-section-head"><div><h3 id="rm-explore-h">{t('Skills to explore')}</h3><p className="rm-muted">{t('A missing profile skill is not proof that you lack it.')}</p></div></div>
      {r.skillGaps.length
        ? <div className="rm-skill-preview is-gap" data-testid="list-skill-gaps-preview">{r.skillGaps.slice(0, 4).map((skill) => <span className="rm-chip is-gap" key={skill.skill} title={skill.skill}>{skillLabel(skill.skill)}</span>)}{r.skillGaps.length > 4 && <span className="rm-chip is-plain">+{r.skillGaps.length - 4}</span>}</div>
        : <p className="rm-muted">{t(r.requiredCount ? 'No gaps against listed skills.' : 'No listed skill requirements')}</p>}
      {r.skillGaps.length > 0 && <details className="rm-detail-disclosure" data-testid="details-missing-skills">
        <summary>{t('View all {count} listed requirements to explore', { count: r.skillGaps.length })}</summary>
        <ul className="rm-skill-table">{r.skillGaps.map((skill) => <li key={skill.skill} className="rm-skill-row" data-testid={`row-gap-${slug(skill.skill)}`}><header>{withOriginal(skill.skill)}</header><div className="rm-meta">{t(categoryLabel[skill.scoreCategory] ?? skill.scoreCategory)} · {t(skill.category)} {t('source requirement')}</div></li>)}</ul>
      </details>}
       {(r.titleSignals.length > 0 || r.relatedSkills.length > 0 || r.unmatchedProfileSkills.length > 0) && <details className="rm-detail-disclosure rm-context-disclosure" data-testid="details-additional-match-context">
          <summary>{t('Other matching context')}</summary>
        {r.titleSignals.length > 0 && <section data-testid="section-title-signals"><h4>{t('Separate title-based signals')}</h4>{r.titleSignals.map((signal) => <p key={signal.profileSkill}><strong>{signal.profileSkill}</strong> · {signal.sourceText}<br />{t(signal.explanation)}</p>)}</section>}
        {r.relatedSkills.length > 0 && <section data-testid="section-related-skills"><h4>{t('Related skills — not confirmed matches')}</h4><p className="rm-muted">{t('These connections do not add to coverage. The listed requirement remains a gap.')}</p><ul>{r.relatedSkills.map((skill) => <li key={`${skill.profileSkill}:${skill.requirement}`}>{skill.profileSkill} → {skillLabel(skill.requirement)}</li>)}</ul></section>}
        {r.unmatchedProfileSkills.length > 0 && <section data-testid="details-unlisted-profile-skills"><h4>{t('Your skills not listed for this role')}</h4><p className="rm-muted">{t('These terms were not found among this role’s listed requirements.')}</p><div className="rm-chips">{r.unmatchedProfileSkills.map((skill) => <span key={skill} className="rm-chip is-plain">{skill}</span>)}</div></section>}
      </details>}
    </section>

    <section className="rm-detail-section rm-assessment-section" aria-labelledby="rm-assessment-h">
      <div className="rm-detail-section-head"><div><h3 id="rm-assessment-h">{t('Experience and education')}</h3></div></div>
      <div className="rm-assessment-grid">
        <article className="rm-assessment-card" data-testid="section-experience-assessment">
          <h4>{t('Relevant experience')}</h4>
          <strong data-testid="text-experience-assessment">{t(experienceLabels[r.experienceFit.status] ?? 'Not directly comparable')}</strong>
          <p><span>{t('Your relevant experience')}:</span> <b>{yearsText(r.experienceFit.userYears)}</b></p>
          {experienceSource && <p><span>{t('Listed requirement')}:</span> <b>{experienceSource}</b></p>}
        </article>
        <article className="rm-assessment-card" data-testid="section-education-assessment">
          <h4>{t('Education')}</h4>
          <strong data-testid="text-education-assessment">{t(educationStatus)}</strong>
          <p><span>{t('Your education')}:</span> <b>{r.educationFit.userEducation ? t(r.educationFit.userEducation) : t('Not provided')}</b></p>
          {educationSource && <p><span>{t('Listed education level')}:</span> <b>{educationSource}</b></p>}
        </article>
        <article className="rm-assessment-card" data-testid="section-role-level-context">
          <h4>{t('Role level context')}</h4>
          <strong>{t(roleLevelLabels[r.experienceFit.roleLevel])}</strong>
          <small>{t('Title-based description only; not used to rank or score.')}</small>
        </article>
      </div>
    </section>

    <section className="rm-card rm-breakdown" aria-labelledby="rm-breakdown-heading" data-testid="section-score-breakdown">
      <div className="rm-breakdown-head">
        <div><h3 id="rm-breakdown-heading">{t('Coverage by skill category')}</h3><p className="rm-muted">{t('Bars show within-category skill coverage only; they do not represent score contributions.')}</p></div>
      </div>
      {coverageRows.length ? <ul className="rm-coverage-list">
        {coverageRows.map((item) => {
          const label = t(categoryLabel[item.category] ?? item.category);
          const coverage = item.coverage ?? 0;
          return <li className="rm-coverage-row" data-category={item.category} key={item.category} data-testid={`coverage-row-${item.category}`}>
            <div className="rm-coverage-row-head">
              <span className="rm-coverage-label"><i aria-hidden="true" />{label}</span>
              <strong data-testid={`coverage-value-${item.category}`}>{t('{matched} / {required} matched requirements · {coverage}%', { matched: item.matchedCount, required: item.requiredCount, coverage })}</strong>
            </div>
            <div className="rm-coverage-track" role="progressbar" aria-label={t('{category} coverage', { category: label })} aria-valuemin={0} aria-valuemax={100} aria-valuenow={coverage}>
              <span style={{ width: `${Math.max(0, Math.min(100, coverage))}%` }} />
            </div>
          </li>;
        })}
      </ul> : <p className="rm-muted" data-testid="text-no-category-coverage">{t('No comparable skill requirements are listed for category coverage.')}</p>}
    </section>

    {groups.length > 0 && <section className="rm-card rm-sdg-groups" aria-label={t('SDG Connections')} data-testid="section-sdg-connections">
      <h3>{t('SDG Connections')}</h3>
      <p className="rm-muted">{t('Potential relevance only. A mapping does not show a demonstrated outcome or verified impact.')}</p>
      {groups.map((group) => <article className="rm-sdg-goal" key={group.goalNumber} data-testid={`sdg-goal-${group.goalNumber}`}>
        <h4>SDG {group.goalNumber} · {group.title}</h4>
        <p><strong>{t('Related listed requirements')}:</strong> {group.requirements.join(', ')}</p>
        <details><summary>{t('View explanation')}</summary>
          {group.connections.map((connection, index) => <div key={`${connection.ruleId}-${connection.target}-${index}`}>
            <p><b>{t('Target')} {connection.target}:</b> {connection.explanation}</p>
            <p>{t('Conditions')} {connection.conditions}</p>
            <small><a href={connection.url} target="_blank" rel="noopener noreferrer">{t('UN Sustainable Development Goal reference')} <ExternalLink size={11} /></a></small>
          </div>)}
        </details>
      </article>)}
    </section>}
    <details className="rm-card rm-original-source" data-testid="section-original-job-information">
      <summary>{t('Original job details, salary and source')}</summary>
      <div className="rm-detail-source">
        <dl>
          <dt>{t('Company')}</dt><dd>{j.company}</dd>
          <dt>{t('Career category')}</dt><dd>{t(categoryLabels[j.sector])}</dd>
          <dt>{t('Industry (source)')}</dt><dd>{j.industry || t('Not specified')}</dd>
          <dt>{t('Experience (original source wording)')}</dt><dd data-testid="text-detail-experience-source">{j.experience || t('Not provided in listing')}</dd>
          <dt>{t('Education (original source wording)')}</dt><dd data-testid="text-detail-education-source">{j.education || t('Not provided in listing')}</dd>
          <dt>{t('Salary (original)')}</dt><dd data-testid="text-detail-salary">{j.salaryText?.trim() || (j.salaryMonthlyRm !== null ? salaryLabel(j, t, languageLocales[language]) : t('Salary not disclosed'))}</dd>
          {j.location && <><dt>{t('Location (source)')}</dt><dd>{j.location}</dd></>}
          {j.postingDate && <><dt>{t('Posting date (source)')}</dt><dd>{j.postingDate}</dd></>}
          {(j.source.trim() || originalListingUrl) && <><dt>{j.source.trim() ? t('Source platform') : t('Original listing')}</dt><dd>{j.source.trim() ? j.source : null}{originalListingUrl && <>{j.source.trim() ? ' · ' : null}<a href={originalListingUrl} target="_blank" rel="noopener noreferrer" data-testid="link-detail-source">{t('View original listing')} <ExternalLink size={13} /></a></>}</dd></>}
        </dl>
      </div>
    </details>
    <button type="button" className="rm-btn" onClick={onBack} data-testid="button-back-to-results-bottom"><ArrowLeft size={14} />{t('Back to ranked results')}</button>
  </section>;
}
