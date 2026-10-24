import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Link } from 'wouter';
import { useMatchFutureReadyRoles } from '@workspace/api-client-react';
import type { JobListing, RoleMatch } from '@workspace/api-client-react';
import { AlertTriangle, ArrowLeft, ChevronLeft, ChevronRight, Compass, ExternalLink, Info, Lock, RefreshCw, Sparkles, UserRound } from 'lucide-react';
import { loadProfile, type SavedProfile } from '@/lib/skills-profile';
import { matchingProfileInput } from '@/lib/matching-profile';
import { SdgTags, SdgDetail } from '@/components/sdg-assessment';
import { useTranslation } from '@/lib/i18n';
import './future-role-matching.css';

const categoryLabels: Record<JobListing['sector'], string> = {
  software: 'Software', mechanical: 'Mechanical', 'digital-marketing': 'Digital marketing',
  'human-resources': 'Human resources', 'accounting-finance': 'Accounting / finance', 'data-analytics': 'Data analytics',
};
const PAGE_SIZE = 6;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const salaryLabel = (job: JobListing, t: (key: string) => string) => {
  const raw = job.salaryText?.trim();
  if (job.salaryMonthlyRm !== null) return `RM ${new Intl.NumberFormat('en-MY').format(job.salaryMonthlyRm)} ${t('monthly')}`;
  if (raw && /\d/.test(raw)) return `RM ${raw} ${t('monthly')} (${t('as supplied')})`;
  return raw ? `${raw} (${t('as supplied')})` : t('Salary not disclosed');
};

function cardReason(r: RoleMatch): string | null {
  if (r.compatibilityTier === 1) {
    return r.experienceFit.status === 'not_required' ? r.experienceFit.summary : null;
  }
  return r.compatibilityReasons[0] ?? null;
}

function readProfile() {
  const r = loadProfile();
  const profile = r.saved?.profile;
  return {
    saved: r.saved,
    error: r.error,
    key: JSON.stringify({
      skills: matchingProfileInput(r.saved).currentSkills,
      years: typeof profile?.basic.years === 'number' ? profile.basic.years : null,
      education: profile?.basic.education || null,
    }),
  };
}

export default function FutureRoleMatchingPage() {
  const { t } = useTranslation();
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
  const data = match.data;
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
      experienceYears: typeof p?.basic.years === 'number' ? p.basic.years : undefined,
      educationLevel: p?.basic.education || undefined,
    } });
  };

  return <div className="page-wrap rm-page">
    <div className="rm-head">
      <div><div className="rm-eyebrow">{t('Module 02 · Future-Role Matching')}</div><h1>{t('Which supplied roles fit your skills?')}</h1>
        <p>{t('FutureNow compares your selected skills with real supplied job records and considers available experience and education information. Results estimate profile-to-role suitability; they are not hiring predictions, job security signals, or measures of national demand.')}</p></div>
      <div className="rm-privacy" data-testid="text-privacy-disclosure"><Lock size={16} /><span>{t('Only your selected skill names, stated years of experience, and education level are sent to a stateless matcher. Your other profile answers stay in this browser.')}</span></div>
    </div>

    {detail && data ? <Detail r={detail} rank={rankOf(detail)} headRef={detailHead} onBack={() => { returnFocus.current = detail.job.id; setDetailId(null); }} /> : <>
      <section className="rm-card" aria-labelledby="rm-profile-h">
        <div className="rm-toolbar"><div><div className="rm-eyebrow">{t('Your saved profile')}</div><h2 id="rm-profile-h">{t('Skills used for matching')}</h2></div>
          <button type="button" className="rm-btn" onClick={refresh} data-testid="button-refresh-profile"><RefreshCw size={14} />{t('Reload saved profile')}</button></div>
        {state.error ? <div className="rm-note is-warn" role="alert" data-testid="status-profile-error"><AlertTriangle size={16} /><p>{t(state.error)} <Link href="/skills-profile" data-testid="link-profile-fix">{t('Open Skills Profile')}</Link></p></div>
          : !saved ? <div className="rm-empty" data-testid="status-no-profile"><UserRound size={26} /><h3>{t('No saved profile yet')}</h3><p className="rm-muted">{t('Save at least one skill in your Skills Profile, then come back. No skills are assumed for you.')}</p><Link href="/skills-profile" className="rm-btn rm-btn-primary" data-testid="link-build-profile">{t('Build your skills profile')}</Link></div>
          : !skills.length ? <div className="rm-empty" data-testid="status-no-skills"><UserRound size={26} /><h3>{t('Your profile has no skills yet')}</h3><p className="rm-muted">{t('Add at least one skill to your saved profile to generate matches.')}</p><Link href="/skills-profile" className="rm-btn rm-btn-primary" data-testid="link-add-skills">{t('Add skills')}</Link></div>
          : <>
            {incomplete > 0 && <div className="rm-note" data-testid="status-incomplete-profile"><Info size={16} /><p>{t('This is a {status} profile with {count} required {answerLabel} still missing ({fields}). Matching works with your skills, but', { status: t(input.isDraft ? 'draft' : 'saved'), count: incomplete, answerLabel: t(incomplete === 1 ? 'answer' : 'answers'), fields: input.missingFields.join(' ') })} <Link href="/skills-profile">{t('completing your profile')}</Link> {t('keeps your context accurate.')}</p></div>}
            <div className="rm-profile">
              <div><p className="rm-muted">{t('{count} skill {label} will be sent. Proficiency is shown for your reference and is not weighted.', { count: skills.length, label: t(skills.length === 1 ? 'name' : 'names') })}</p>
                <div className="rm-chips" data-testid="list-profile-skills">{saved.profile.skills.map((s) => <span key={s.id} className="rm-chip"><span>{s.name}</span><small>{t(s.proficiency)}</small></span>)}</div></div>
               <div className="rm-context"><h3>{t('Profile context')}</h3><p className="rm-muted">{t('Years and education are used for the separate suitability estimate. Interests, direction, evidence, readiness, and proficiency do not affect scores.')}</p><dl>
                <dt>{t('Experience')}</dt><dd>{p?.basic.years === '' ? t('Not provided') : `${p?.basic.years} ${t('years')}`}</dd>
                <dt>{t('Education')}</dt><dd>{p?.basic.education ? t(p.basic.education) : t('Not provided')}</dd>
                <dt>{t('Direction')}</dt><dd>{p?.basic.direction || t('Not provided')}</dd>
                <dt>{t('Interests')}</dt><dd>{p?.interests.industries.map((industry) => t(industry)).join(', ') || t('Not provided')}</dd>
                <dt>{t('Evidence')}</dt><dd>{p && Object.entries(p.experience).some(([k, v]) => k !== 'skipped' && typeof v === 'string' && v.trim()) ? t('Provided in profile') : t('Not provided')}</dd>
              </dl></div>
            </div>
            <div className="rm-actions"><button type="button" className="rm-btn rm-btn-primary" onClick={generate} disabled={match.isPending} data-testid="button-generate-matches"><Sparkles size={15} />{match.isPending ? t('Matching...') : data ? t('Regenerate matches') : t('Generate matches')}</button><Link href="/skills-profile" className="rm-btn" data-testid="link-edit-profile">{t('Edit profile')}</Link></div>
          </>}
      </section>

       {match.isPending && <div className="rm-list" role="status" aria-label={t('Loading matches')}>{[0, 1, 2].map((i) => <div key={i} className="rm-skel" />)}</div>}
       {match.isError && <div className="rm-note is-warn" role="alert" data-testid="status-match-error"><AlertTriangle size={16} /><p>{t('Matches could not be generated. No sample results are shown.')} <button type="button" className="rm-btn" onClick={generate} data-testid="button-retry-matches">{t('Try again')}</button></p></div>}
      {data && !match.isPending && <>
         <details className="rm-card rm-method-disclosure" aria-label={t('How matching works')} data-testid="details-matching-method">
           <summary className="rm-method-summary">
             <span className="rm-eyebrow">{t('How matching works')}</span>
             <span className="rm-method-preview">
               <span><b>{t('Skills')}:</b> {t('Compares the skills in your saved profile with each role’s listed requirements.')}</span>
               <span><b>{t('Experience and education')}:</b> {t('Uses stated requirements and clearly labelled estimates based on role seniority.')}</span>
               <span><b>{t('Ranking')}:</b> {t('Prioritises career-stage compatibility, then overall suitability; skill coverage stays separate.')}</span>
               <span className="rm-muted">{t('Results are estimates based on available information, not hiring predictions. A skill not found in your profile is not proof that you lack it.')}</span>
             </span>
           </summary>
           <div className="rm-method-expanded">
             <p className="rm-muted">{t('These results compare your saved profile with {count} supplied records using {skills} selected skills.', { count: data.totalJobs, skills: data.inputSkillCount })}</p>
             <details className="rm-scoring-details" data-testid="details-scoring-details">
               <summary>{t('View scoring details')}</summary>
               <p><b>{t('Weights')}:</b> {t('Skills')} {data.weights.skillCoverage}%, {t('experience suitability')} {data.weights.experienceSuitability}%, {t('education suitability')} {data.weights.educationSuitability}%.</p>
               <p>{t('Unavailable dimensions are excluded and the remaining weights are proportionally redistributed; missing information is not treated as a pass or failure.')}</p>
               <p>{t('Internal experience guidelines when the source gives no comparable years: internship/entry 0, mid/senior 2, lead 3, manager 4. These are estimates, not employer requirements.')}</p>
               <p>{t('Tier 1: no unmet mandatory requirement identified. Tier 2: stretch or unresolved information. Tier 3: clear shortfall against a mandatory source requirement.')}</p>
               <p className="rm-muted"><b>{t('Skill coverage')}:</b> <code data-testid="text-formula">{t(data.formula)}</code></p>
               <p className="rm-muted"><b>{t('Overall score')}:</b> {t(data.overallFormula)}</p>
             </details>
           </div>
         </details>
         {!data.results.length ? <div className="rm-card rm-empty" data-testid="status-no-results"><Compass size={26} /><h3>{t('No roles returned')}</h3><p className="rm-muted">{t('The matcher returned no records for these skills.')}</p></div>
           : data.results.every((r) => r.matchedCount === 0) ? <div className="rm-note is-warn" data-testid="status-no-coverage"><AlertTriangle size={16} /><p>{t('None of your skill names matched any listed requirement. Roles are still listed below so you can see what the records ask for.')}</p></div> : null}
        {data.results.length > 0 && <section aria-labelledby="rm-results-h">
           <div className="rm-toolbar"><div><div className="rm-eyebrow">{t('Ranked results')}</div><h2 id="rm-results-h" ref={resultsHead} tabIndex={-1} style={{ margin: '4px 0 0' }}>{t('{count} roles', { count: filtered.length })}</h2></div>
             <div><label className="rm-label" htmlFor="rm-cat">{t('Career category')}</label><select id="rm-cat" className="rm-select" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} data-testid="select-match-category"><option value="all">{t('All categories')}</option>{categories.map((c) => <option key={c} value={c}>{t(categoryLabels[c] ?? c)}</option>)}</select></div></div>
           <ol className="rm-list">{visible.map((r) => <li key={r.job.id} className="rm-result" data-testid={`card-match-${r.job.id}`}>
             <span className="rm-rank" aria-label={t('Rank {rank}', { rank: rankOf(r) })}>#{rankOf(r)}</span>
              <div className="rm-result-main"><h3 data-testid={`text-match-title-${r.job.id}`}>{r.job.title}</h3><div className="rm-meta">{r.job.company} · {t(categoryLabels[r.job.sector])}</div></div>
              <div className="rm-fit">
                <div className="rm-overall">
                  <strong data-testid={`text-match-score-${r.job.id}`}>{r.overallScore === null ? 'n/a' : `${r.overallScore}%`}</strong>
                  <small>{t('estimated profile-to-role suitability')}</small>
                  <div className="rm-bar" aria-hidden="true"><span style={{ transform: `scaleX(${(r.overallScore ?? 0) / 100})` }} /></div>
                </div>
                <div className="rm-coverage" data-testid={`text-match-count-${r.job.id}`}>
                  <strong>{r.requiredCount ? t('{matched} of {required} listed skills matched', { matched: r.matchedCount, required: r.requiredCount }) : t('No listed skill requirements')}</strong>
                  {r.skillCoverage !== null && <small>{r.skillCoverage}% {t('skill coverage')}</small>}
                </div>
                <span className={`rm-tier rm-tier-${r.compatibilityTier}`} data-testid={`text-match-tier-${r.job.id}`} data-tier={r.compatibilityTier}>{t(r.compatibilityLabel)}</span>
                {cardReason(r) && <p className="rm-result-reason" data-testid={`text-match-reason-${r.job.id}`}>{t(cardReason(r)!)}</p>}
                <div className="rm-result-meta">
                  {(r.job.salaryText || typeof r.job.salaryMonthlyRm === 'number') && <span>{salaryLabel(r.job, t)}</span>}
                  {r.job.source && <span>{t('Source:')} {r.job.source}</span>}
                  {r.job.sourceUrl && <a href={r.job.sourceUrl} target="_blank" rel="noopener noreferrer" data-testid={`link-match-source-${r.job.id}`}>{t('Source listing')} <ExternalLink size={11} /></a>}
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

function Detail({ r, rank, headRef, onBack }: { r: RoleMatch; rank: number; headRef: RefObject<HTMLHeadingElement | null>; onBack: () => void }) {
  const { t } = useTranslation();
  const j = r.job;
  const hasMappedSkillSdgs = [...r.matchedSkills, ...r.skillGaps].some((skill) => skill.sdg.status === 'mapped');
  const statusLabel: Record<string, string> = {
    meets: 'Meets stated threshold',
    gap: 'Potential requirement gap',
    uncertain: 'Needs manual comparison',
    not_provided: 'Not provided in profile',
    not_stated: 'Not stated in source',
    not_required: 'No experience requirement stated',
    unavailable: 'Not comparable from available information',
  };
  const coverage = r.skillCoverage === null
    ? t('Not calculable')
    : `${r.matchedCount} / ${r.requiredCount} (${r.skillCoverage}%)`;
  const FitFact = ({ title, fit }: { title: string; fit: RoleMatch['experienceFit'] | RoleMatch['educationFit'] }) => (
    <div className="rm-fact" data-state={fit.status}>
      <span>{t(title)}</span>
      <strong>{t(statusLabel[fit.status] ?? 'Unavailable')}</strong>
      <p>{t(fit.summary)}</p>
      <small>{t(fit.reason)}</small>
    </div>
  );
  return <section className="rm-detail" aria-labelledby="rm-detail-h" data-testid={`detail-match-${j.id}`}>
    <button type="button" className="rm-btn" onClick={onBack} data-testid="button-back-to-results"><ArrowLeft size={14} />{t('Back to ranked results')}</button>
    <div className="rm-card" style={{ marginTop: 14 }}>
      <div className="rm-eyebrow">{t('Rank')} #{rank} · {t(categoryLabels[j.sector])}</div>
      <h2 id="rm-detail-h" ref={headRef} tabIndex={-1} data-testid="text-detail-title">{j.title}</h2>
      <div className="rm-meta" data-testid="text-detail-company">{j.company} · {j.industry}</div>
      <div className="rm-detail-grid">
        <div className="rm-fact"><span>{t('Estimated overall match score')}</span><strong data-testid="text-detail-score">{r.overallScore === null ? t('Not calculable') : `${r.overallScore}%`}</strong><small>{t('Estimate of profile-to-role suitability; not a probability of hiring.')}</small></div>
        <div className="rm-fact"><span>{t('Skill coverage')}</span><strong data-testid="text-detail-coverage">{coverage}</strong><small>{t('Distinct listed requirements found in your saved profile.')}</small></div>
        <div className="rm-fact"><span>{t('Career-stage compatibility')}</span><strong data-testid="text-detail-tier">{t(r.compatibilityLabel)}</strong>{r.compatibilityReasons.map((reason) => <small key={reason}>{t(reason)}</small>)}</div>
        <FitFact title="Experience suitability" fit={r.experienceFit} />
        <FitFact title="Education suitability" fit={r.educationFit} />
      </div>
      <div className="rm-detail-source" data-testid="section-original-job-information">
        <h3>{t('Original job information')}</h3>
        <dl>
          <dt>{t('Company')}</dt><dd>{j.company}</dd>
          <dt>{t('Industry (source)')}</dt><dd>{j.industry || t('Not specified')}</dd>
          <dt>{t('Career category')}</dt><dd>{t(categoryLabels[j.sector])}</dd>
          <dt>{t('Experience (original source wording)')}</dt><dd data-testid="text-detail-experience-source">{j.experience || t('Not specified')}</dd>
          <dt>{t('Education (original source wording)')}</dt><dd data-testid="text-detail-education-source">{j.education || t('Not specified')}</dd>
          <dt>{t('Salary (original)')}</dt><dd data-testid="text-detail-salary">{salaryLabel(j, t)}</dd>
          {j.location && <><dt>{t('Location (source)')}</dt><dd>{j.location}</dd></>}
          {j.postingDate && <><dt>{t('Posting date (source)')}</dt><dd>{j.postingDate}</dd></>}
          <dt>{t('Source')}</dt><dd>{j.source || t('Not specified')}{j.sourceUrl && <> · <a href={j.sourceUrl} target="_blank" rel="noopener noreferrer" data-testid="link-detail-source">{t('View source listing')} <ExternalLink size={13} /></a></>}</dd>
        </dl>
      </div>
    </div>
    <div className="rm-two">
      <div className="rm-card"><h3>{t('Matched skills ({count})', { count: r.matchedSkills.length })}</h3><p className="rm-muted">{t('Listed requirements that match a skill name in your profile.')}</p>
        {r.matchedSkills.length ? <ul className="rm-skill-table">{r.matchedSkills.map((s) => <li key={s.skill} className="rm-skill-row" data-testid={`row-matched-${slug(s.skill)}`}><header><strong>{s.skill}</strong></header><div className="rm-meta">{t(s.category)} {t('skill')}{s.matchedBy ? ` · ${t('matched by your "{skill}"', { skill: s.matchedBy })}` : ''}</div></li>)}</ul> : <p className="rm-muted">{t('No listed skills matched.')}</p>}</div>
      <div className="rm-card"><h3>{t('Skills not found in your saved profile ({count})', { count: r.skillGaps.length })}</h3><p className="rm-muted">{t('This does not mean you definitely lack them; you may simply not have listed them.')}</p>
        {r.skillGaps.length ? <ul className="rm-skill-table">{r.skillGaps.map((s) => <li key={s.skill} className="rm-skill-row" data-testid={`row-gap-${slug(s.skill)}`}><header><strong>{s.skill}</strong></header><div className="rm-meta">{t(s.category)} {t('skill')}</div></li>)}</ul> : <p className="rm-muted">{t('No gaps against listed skills.')}</p>}</div>
    </div>
    {r.roleSdg.status === 'mapped' && <section className="rm-card" aria-labelledby="rm-role-sdg-h" data-testid="section-role-sdg">
      <div className="rm-toolbar"><h3 id="rm-role-sdg-h">{t('Supported role-level SDG mapping')}</h3><SdgTags a={r.roleSdg} id={`detail-role-${j.id}`} /></div>
      <SdgDetail a={r.roleSdg} id={`role-${j.id}`} />
    </section>}
    {hasMappedSkillSdgs && <section className="rm-card" aria-labelledby="rm-skill-sdg-h" data-testid="section-skill-sdgs">
      <h3 id="rm-skill-sdg-h">{t('Supported individual skill SDG mappings')}</h3>
      <p className="rm-muted">{t('Only source-supported mapped goals are shown. Open a mapping for its explanation, conditions, source context, and official UN reference.')}</p>
      {[...r.matchedSkills, ...r.skillGaps].filter((skill) => skill.sdg.status === 'mapped').map((skill) => <div className="rm-sdg-skill" key={`${skill.category}:${skill.skill}`}><strong>{skill.skill}</strong><SdgTags a={skill.sdg} id={`detail-${slug(skill.skill)}`} /><SdgDetail a={skill.sdg} id={`detail-${slug(skill.skill)}`} collapsed /></div>)}
    </section>}
    <section className="rm-card" data-testid="section-next-steps">
      <h3>{t('Suggested next steps')}</h3><p data-testid="text-detail-improvement">{t(r.improvement)}</p>
      {r.unmatchedProfileSkills.length > 0 && <><h3>{t('Your skills not listed for this role')}</h3><p className="rm-muted">{t("These terms do not contribute to the skill coverage and were not found among this role's listed requirements.")}</p><div className="rm-chips">{r.unmatchedProfileSkills.map((skill) => <span key={skill} className="rm-chip is-plain"><span>{skill}</span></span>)}</div></>}
    </section>
    <button type="button" className="rm-btn" onClick={onBack} data-testid="button-back-to-results-bottom"><ArrowLeft size={14} />{t('Back to ranked results')}</button>
  </section>;
}
