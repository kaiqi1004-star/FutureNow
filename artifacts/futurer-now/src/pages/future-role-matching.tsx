import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Link } from 'wouter';
import { useMatchFutureReadyRoles } from '@workspace/api-client-react';
import type { JobListing, RoleMatch } from '@workspace/api-client-react';
import { AlertTriangle, ArrowLeft, ChevronLeft, ChevronRight, Compass, ExternalLink, Info, Lock, RefreshCw, Sparkles, UserRound } from 'lucide-react';
import { loadProfile, type SavedProfile } from '@/lib/skills-profile';
import { matchingProfileInput } from '@/lib/matching-profile';
import { assessExperience } from '@/lib/experience-fit';
import { SdgTags, SdgDetail, UnassessedSdg } from '@/components/sdg-assessment';
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

function readProfile() {
  const r = loadProfile();
  return { saved: r.saved, error: r.error, key: JSON.stringify(matchingProfileInput(r.saved).currentSkills) };
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

  const generate = () => { setDetailId(null); setPage(1); setCategory('all'); match.mutate({ data: { currentSkills: skills } }); };
  const p = saved?.profile;

  return <div className="page-wrap rm-page">
    <div className="rm-head">
      <div><div className="rm-eyebrow">{t('Module 02 · Future-Role Matching')}</div><h1>{t('Which supplied roles fit your skills?')}</h1>
        <p>{t('FutureNow compares the skill names in your saved profile with the skills listed in real supplied job records. Results show an estimated skill fit, not a hiring prediction, job security signal or measure of national demand.')}</p></div>
      <div className="rm-privacy" data-testid="text-privacy-disclosure"><Lock size={16} /><span>{t('Only your skill names are sent to a stateless matcher. Your other answers stay in this browser and do not affect the score.')}</span></div>
    </div>

    {detail && data ? <Detail r={detail} experienceYears={saved?.profile.basic.years} formula={data.formula} sdgNotice={data.sdgNotice} rank={rankOf(detail)} headRef={detailHead} onBack={() => { returnFocus.current = detail.job.id; setDetailId(null); }} /> : <>
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
                <p className="rm-muted">{t('Profile terms are not yet assessed for SDG contribution here. Each job provides its own source-supported context.')}</p>
                <div className="rm-chips" data-testid="list-profile-skills">{saved.profile.skills.map((s) => <span key={s.id} className="rm-chip"><span>{s.name}</span><small>{t(s.proficiency)}</small><UnassessedSdg /></span>)}</div></div>
              <div className="rm-context"><h3>{t('Local context (not scored)')}</h3><dl>
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
        <section className="rm-card" aria-labelledby="rm-method-h">
           <div className="rm-eyebrow">{t('How the estimate works')}</div><h2 id="rm-method-h">{t('Estimated profile-to-job skill fit')}</h2>
           <div className="rm-method"><div><code data-testid="text-formula">{t(data.formula)}</code><p className="rm-muted">{t('Ranked in the order returned by the matcher across {count} supplied records using {skills} of your skills. This is not a hiring probability.', { count: data.totalJobs, skills: data.inputSkillCount })}</p></div>
             <ul data-testid="list-scoring-notes">{data.scoringNotes.map((n) => <li key={n}>{t(n)}</li>)}</ul></div>
          <div className="rm-note" style={{ marginTop: 14, marginBottom: 0 }} data-testid="text-sdg-notice"><Info size={16} /><p>{t(data.sdgNotice)}</p></div>
        </section>
         {!data.results.length ? <div className="rm-card rm-empty" data-testid="status-no-results"><Compass size={26} /><h3>{t('No roles returned')}</h3><p className="rm-muted">{t('The matcher returned no records for these skills.')}</p></div>
           : data.results.every((r) => r.matchedCount === 0) ? <div className="rm-note is-warn" data-testid="status-no-coverage"><AlertTriangle size={16} /><p>{t('None of your skill names matched any listed requirement. Roles are still listed below so you can see what the records ask for.')}</p></div> : null}
        {data.results.length > 0 && <section aria-labelledby="rm-results-h">
           <div className="rm-toolbar"><div><div className="rm-eyebrow">{t('Ranked results')}</div><h2 id="rm-results-h" ref={resultsHead} tabIndex={-1} style={{ margin: '4px 0 0' }}>{t('{count} roles', { count: filtered.length })}</h2></div>
             <div><label className="rm-label" htmlFor="rm-cat">{t('Career category')}</label><select id="rm-cat" className="rm-select" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} data-testid="select-match-category"><option value="all">{t('All categories')}</option>{categories.map((c) => <option key={c} value={c}>{t(categoryLabels[c] ?? c)}</option>)}</select></div></div>
          <ol className="rm-list">{visible.map((r) => <li key={r.job.id} className="rm-result" data-testid={`card-match-${r.job.id}`}>
            <span className="rm-rank" aria-label={t('Rank {rank}', { rank: rankOf(r) })}>#{rankOf(r)}</span>
             <div><h3 data-testid={`text-match-title-${r.job.id}`}>{r.job.title}</h3><div className="rm-meta">{r.job.company} · {t(categoryLabels[r.job.sector])}</div>
                <div className="rm-meta">{salaryLabel(r.job, t)}</div>
                <div className="rm-meta" title={r.job.experience}>{r.job.experience || t('Experience: not provided')}</div>
                {r.job.sourceUrl && <a className="rm-meta" href={r.job.sourceUrl} target="_blank" rel="noopener noreferrer" data-testid={`link-match-source-${r.job.id}`}>{t('Source listing')} <ExternalLink size={11} /></a>}
               <div className="rm-meta">{t('Role SDG:')} <SdgTags a={r.roleSdg} id={`role-${r.job.id}`} /></div></div>
             <div className="rm-fit"><strong data-testid={`text-match-score-${r.job.id}`}>{r.score === null ? 'n/a' : `${r.score}%`}</strong><small>{t('estimated skill fit')}</small>
              <div className="rm-bar" aria-hidden="true"><span style={{ transform: `scaleX(${(r.score ?? 0) / 100})` }} /></div>
               <small data-testid={`text-match-count-${r.job.id}`}>{t('{matched} of {required} listed skills', { matched: r.matchedCount, required: r.requiredCount })}</small>
               <button type="button" className="rm-btn" style={{ marginTop: 8 }} onClick={() => setDetailId(r.job.id)} data-testid={`button-view-details-${r.job.id}`}>{t('View details')}<ChevronRight size={14} /></button></div>
          </li>)}</ol>
           {filtered.length > PAGE_SIZE && <div className="rm-pager"><span>{t('Showing')} {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} {t('of')} {filtered.length}</span><div>
             <button type="button" className="rm-btn" aria-label={t('Previous page')} disabled={page === 1} onClick={() => setPage((x) => x - 1)} data-testid="button-matches-prev"><ChevronLeft size={15} /></button><span>{page} / {pages}</span>
             <button type="button" className="rm-btn" aria-label={t('Next page')} disabled={page === pages} onClick={() => setPage((x) => x + 1)} data-testid="button-matches-next"><ChevronRight size={15} /></button></div></div>}
        </section>}
      </>}
    </>}
  </div>;
}

function Detail({ r, rank, formula, sdgNotice, experienceYears, headRef, onBack }: { r: RoleMatch; rank: number; formula: string; sdgNotice: string; experienceYears: number | "" | undefined; headRef: RefObject<HTMLHeadingElement | null>; onBack: () => void }) {
  const { t } = useTranslation();
  const j = r.job;
  const experienceFit = assessExperience(experienceYears, j.experience);
  const experienceMessageKey = experienceFit.status === 'not_provided'
    ? 'Experience comparison unavailable: add your stated years of experience to your profile. The skill score is unchanged.'
    : experienceFit.status === 'not_comparable'
      ? 'Experience needs manual comparison: the source is unspecified, non-numeric, preferred, conditional, or describes alternative paths. No numerical experience-fit conclusion is made.'
      : experienceFit.status === 'below_requirement'
        ? 'Experience-fit warning: you stated {years} years; this listing states a minimum or range starting at {minimumYears} years. Your total stated experience is below that threshold. The skill score is unchanged; review the original listing for exceptions and relevant-domain requirements.'
        : 'Your stated {years} years meets the numeric threshold of {minimumYears} years only. This does not verify relevant-domain experience, leadership, portfolio requirements, or eligibility.';
  return <section className="rm-detail" aria-labelledby="rm-detail-h" data-testid={`detail-match-${j.id}`}>
     <button type="button" className="rm-btn" onClick={onBack} data-testid="button-back-to-results"><ArrowLeft size={14} />{t('Back to ranked results')}</button>
    <div className="rm-card" style={{ marginTop: 14 }}>
       <div className="rm-eyebrow">{t('Rank')} #{rank} · {t(categoryLabels[j.sector])}</div>
      <h2 id="rm-detail-h" ref={headRef} tabIndex={-1} data-testid="text-detail-title">{j.title}</h2>
      <div className="rm-meta" data-testid="text-detail-company">{j.company} · {j.industry}</div>
      <div className="rm-detail-grid">
         <div className="rm-fact"><span>{t('Estimated skill fit')}</span><div className="rm-score-line"><strong data-testid="text-detail-score">{r.score === null ? t('Not calculable') : `${r.score}%`}</strong><small>{t('{matched} of {required} listed skills', { matched: r.matchedCount, required: r.requiredCount })}</small></div></div>
         <div className="rm-fact"><span>{t('Experience (source wording)')}</span>{j.experience || t('Not specified')}</div>
         <div className="rm-fact"><span>{t('Education (source wording)')}</span>{j.education || t('Not specified')}</div>
          <div className="rm-fact"><span>{t('Salary (original)')}</span><span data-testid="text-detail-salary" style={{ textTransform: 'none', fontSize: 13, color: 'inherit', letterSpacing: 0 }}>{salaryLabel(j, t)}</span></div>
      </div>
      <div className={`rm-note ${experienceFit.status === 'below_requirement' ? 'is-warn' : ''}`} role={experienceFit.status === 'below_requirement' ? 'alert' : 'note'} data-testid="experience-fit" data-state={experienceFit.status}>
          {experienceFit.status === 'below_requirement' ? <AlertTriangle size={16} /> : <Info size={16} />}<p>{t(experienceMessageKey, { years: experienceYears ?? 0, minimumYears: experienceFit.minimumYears ?? 0 })}</p>
      </div>
       <p className="rm-muted" data-testid="text-detail-formula">{t(formula)} {t('The profile is self-reported; this is not a hiring probability. Experience, education, interests, proficiency and salary are not scored.')}</p>
       <div className="rm-actions">{j.sourceUrl ? <a className="rm-btn" href={j.sourceUrl} target="_blank" rel="noopener noreferrer" data-testid="link-detail-source">{t('View source listing')} ({j.source || t('source name not provided')})<ExternalLink size={13} /></a> : <span className="rm-muted">{t('Source:')} {j.source || t('not specified')}, {t('no URL supplied')}.</span>}</div>
    </div>
    <section className="rm-card" aria-labelledby="rm-role-sdg-h">
       <div className="rm-toolbar"><h3 id="rm-role-sdg-h">{t('Role SDG mapping')}</h3><SdgTags a={r.roleSdg} id={`detail-role-${j.id}`} /></div>
       <p className="rm-muted">{t(sdgNotice)}</p><SdgDetail a={r.roleSdg} id={`role-${j.id}`} />
    </section>
     <h3 className="rm-section-heading">{t('Individual skill SDG assessments')}</h3>
     <p className="rm-muted">{t('Compact tags show mapped goals. Open an assessment for its explanation, conditions, source context, and official UN reference. Neutral “Not assessed” labels are not review warnings.')}</p>
    <div className="rm-two">
       <div className="rm-card"><h3>{t('Matched skills ({count})', { count: r.matchedSkills.length })}</h3><p className="rm-muted">{t('Listed requirements that match a skill name in your profile.')}</p>
         {r.matchedSkills.length ? <ul className="rm-skill-table">{r.matchedSkills.map((s) => <li key={s.skill} className="rm-skill-row" data-testid={`row-matched-${slug(s.skill)}`}><header><strong>{s.skill}</strong><SdgTags a={s.sdg} id={`m-${slug(s.skill)}`} /></header><div className="rm-meta">{t(s.category)} {t('skill')}{s.matchedBy ? ` · ${t('matched by your "{skill}"', { skill: s.matchedBy })}` : ''}</div><SdgDetail a={s.sdg} id={`m-${slug(s.skill)}`} collapsed /></li>)}</ul> : <p className="rm-muted">{t('No listed skills matched.')}</p>}</div>
       <div className="rm-card"><h3>{t('Skills not found in your saved profile ({count})', { count: r.skillGaps.length })}</h3><p className="rm-muted">{t('This does not mean you definitely lack them; you may simply not have listed them.')}</p>
         {r.skillGaps.length ? <ul className="rm-skill-table">{r.skillGaps.map((s) => <li key={s.skill} className="rm-skill-row" data-testid={`row-gap-${slug(s.skill)}`}><header><strong>{s.skill}</strong><SdgTags a={s.sdg} id={`g-${slug(s.skill)}`} /></header><div className="rm-meta">{t(s.category)} {t('skill')}</div><SdgDetail a={s.sdg} id={`g-${slug(s.skill)}`} collapsed /></li>)}</ul> : <p className="rm-muted">{t('No gaps against listed skills.')}</p>}</div>
    </div>
    <div className="rm-card"><h3>{t('Suggested improvement')}</h3><p data-testid="text-detail-improvement">{t(r.improvement)}</p>
       {r.unmatchedProfileSkills.length > 0 && <><h3>{t('Your skills not listed for this role')}</h3><p className="rm-muted">{t("These terms do not contribute to this score and have not been assessed in this role's requirements.")}</p><div className="rm-chips">{r.unmatchedProfileSkills.map((s) => <span key={s} className="rm-chip is-plain"><span>{s}</span><UnassessedSdg /></span>)}</div></>}</div>
    <button type="button" className="rm-btn" onClick={onBack} data-testid="button-back-to-results-bottom"><ArrowLeft size={14} />{t('Back to ranked results')}</button>
  </section>;
}
