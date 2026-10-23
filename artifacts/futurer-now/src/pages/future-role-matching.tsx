import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Link } from 'wouter';
import { useMatchFutureReadyRoles } from '@workspace/api-client-react';
import type { JobListing, RoleMatch } from '@workspace/api-client-react';
import { AlertTriangle, ArrowLeft, ChevronLeft, ChevronRight, Compass, ExternalLink, Info, Lock, RefreshCw, Sparkles, UserRound } from 'lucide-react';
import { loadProfile, type SavedProfile } from '@/lib/skills-profile';
import { matchingProfileInput } from '@/lib/matching-profile';
import { assessExperience } from '@/lib/experience-fit';
import { SdgTags, SdgDetail, UnassessedSdg } from '@/components/sdg-assessment';
import './future-role-matching.css';

const categoryLabels: Record<JobListing['sector'], string> = {
  software: 'Software', mechanical: 'Mechanical', 'digital-marketing': 'Digital marketing',
  'human-resources': 'Human resources', 'accounting-finance': 'Accounting / finance', 'data-analytics': 'Data analytics',
};
const PAGE_SIZE = 6;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const salaryLabel = (job: JobListing) => {
  const raw = job.salaryText?.trim();
  if (job.salaryMonthlyRm !== null) return `RM ${new Intl.NumberFormat('en-MY').format(job.salaryMonthlyRm)} monthly`;
  if (raw && /\d/.test(raw)) return `RM ${raw} monthly (as supplied)`;
  return raw ? `${raw} (as supplied)` : 'Salary not disclosed';
};

function readProfile() {
  const r = loadProfile();
  return { saved: r.saved, error: r.error, key: JSON.stringify(matchingProfileInput(r.saved).currentSkills) };
}

export default function FutureRoleMatchingPage() {
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
      <div><div className="rm-eyebrow">Module 02 · Future-Role Matching</div><h1>Which supplied roles fit your skills?</h1>
        <p>FutureNow compares the skill names in your saved profile with the skills listed in real supplied job records. Results show an estimated skill fit, not a hiring prediction, job security signal or measure of national demand.</p></div>
      <div className="rm-privacy" data-testid="text-privacy-disclosure"><Lock size={16} /><span>Only your skill names are sent to a stateless matcher. Your other answers stay in this browser and do not affect the score.</span></div>
    </div>

    {detail && data ? <Detail r={detail} experienceYears={saved?.profile.basic.years} formula={data.formula} sdgNotice={data.sdgNotice} rank={rankOf(detail)} headRef={detailHead} onBack={() => { returnFocus.current = detail.job.id; setDetailId(null); }} /> : <>
      <section className="rm-card" aria-labelledby="rm-profile-h">
        <div className="rm-toolbar"><div><div className="rm-eyebrow">Your saved profile</div><h2 id="rm-profile-h">Skills used for matching</h2></div>
          <button type="button" className="rm-btn" onClick={refresh} data-testid="button-refresh-profile"><RefreshCw size={14} />Reload saved profile</button></div>
        {state.error ? <div className="rm-note is-warn" role="alert" data-testid="status-profile-error"><AlertTriangle size={16} /><p>{state.error} <Link href="/skills-profile" data-testid="link-profile-fix">Open Skills Profile</Link></p></div>
          : !saved ? <div className="rm-empty" data-testid="status-no-profile"><UserRound size={26} /><h3>No saved profile yet</h3><p className="rm-muted">Save at least one skill in your Skills Profile, then come back. No skills are assumed for you.</p><Link href="/skills-profile" className="rm-btn rm-btn-primary" data-testid="link-build-profile">Build your skills profile</Link></div>
          : !skills.length ? <div className="rm-empty" data-testid="status-no-skills"><UserRound size={26} /><h3>Your profile has no skills yet</h3><p className="rm-muted">Add at least one skill to your saved profile to generate matches.</p><Link href="/skills-profile" className="rm-btn rm-btn-primary" data-testid="link-add-skills">Add skills</Link></div>
          : <>
            {incomplete > 0 && <div className="rm-note" data-testid="status-incomplete-profile"><Info size={16} /><p>This is a {input.isDraft ? 'draft' : 'saved'} profile with {incomplete} required {incomplete === 1 ? 'answer' : 'answers'} still missing ({input.missingFields.join(' ')}). Matching works with your skills, but <Link href="/skills-profile">completing your profile</Link> keeps your context accurate.</p></div>}
            <div className="rm-profile">
              <div><p className="rm-muted">{skills.length} skill {skills.length === 1 ? 'name' : 'names'} will be sent. Proficiency is shown for your reference and is not weighted.</p>
                <p className="rm-muted">Profile terms are not yet assessed for SDG contribution here. Each job provides its own source-supported context.</p>
                <div className="rm-chips" data-testid="list-profile-skills">{saved.profile.skills.map((s) => <span key={s.id} className="rm-chip"><span>{s.name}</span><small>{s.proficiency}</small><UnassessedSdg /></span>)}</div></div>
              <div className="rm-context"><h3>Local context (not scored)</h3><dl>
                <dt>Experience</dt><dd>{p?.basic.years === '' ? 'Not provided' : `${p?.basic.years} years`}</dd>
                <dt>Education</dt><dd>{p?.basic.education || 'Not provided'}</dd>
                <dt>Direction</dt><dd>{p?.basic.direction || 'Not provided'}</dd>
                <dt>Interests</dt><dd>{p?.interests.industries.join(', ') || 'Not provided'}</dd>
                <dt>Evidence</dt><dd>{p && Object.entries(p.experience).some(([k, v]) => k !== 'skipped' && typeof v === 'string' && v.trim()) ? 'Provided in profile' : 'Not provided'}</dd>
              </dl></div>
            </div>
            <div className="rm-actions"><button type="button" className="rm-btn rm-btn-primary" onClick={generate} disabled={match.isPending} data-testid="button-generate-matches"><Sparkles size={15} />{match.isPending ? 'Matching...' : data ? 'Regenerate matches' : 'Generate matches'}</button><Link href="/skills-profile" className="rm-btn" data-testid="link-edit-profile">Edit profile</Link></div>
          </>}
      </section>

      {match.isPending && <div className="rm-list" role="status" aria-label="Loading matches">{[0, 1, 2].map((i) => <div key={i} className="rm-skel" />)}</div>}
      {match.isError && <div className="rm-note is-warn" role="alert" data-testid="status-match-error"><AlertTriangle size={16} /><p>Matches could not be generated. No sample results are shown. <button type="button" className="rm-btn" onClick={generate} data-testid="button-retry-matches">Try again</button></p></div>}
      {data && !match.isPending && <>
        <section className="rm-card" aria-labelledby="rm-method-h">
          <div className="rm-eyebrow">How the estimate works</div><h2 id="rm-method-h">Estimated profile-to-job skill fit</h2>
          <div className="rm-method"><div><code data-testid="text-formula">{data.formula}</code><p className="rm-muted">Ranked in the order returned by the matcher across {data.totalJobs} supplied records using {data.inputSkillCount} of your skills. This is not a hiring probability.</p></div>
            <ul data-testid="list-scoring-notes">{data.scoringNotes.map((n) => <li key={n}>{n}</li>)}</ul></div>
          <div className="rm-note" style={{ marginTop: 14, marginBottom: 0 }} data-testid="text-sdg-notice"><Info size={16} /><p>{data.sdgNotice}</p></div>
        </section>
        {!data.results.length ? <div className="rm-card rm-empty" data-testid="status-no-results"><Compass size={26} /><h3>No roles returned</h3><p className="rm-muted">The matcher returned no records for these skills.</p></div>
          : data.results.every((r) => r.matchedCount === 0) ? <div className="rm-note is-warn" data-testid="status-no-coverage"><AlertTriangle size={16} /><p>None of your skill names matched any listed requirement. Roles are still listed below so you can see what the records ask for.</p></div> : null}
        {data.results.length > 0 && <section aria-labelledby="rm-results-h">
          <div className="rm-toolbar"><div><div className="rm-eyebrow">Ranked results</div><h2 id="rm-results-h" ref={resultsHead} tabIndex={-1} style={{ margin: '4px 0 0' }}>{filtered.length} roles</h2></div>
            <div><label className="rm-label" htmlFor="rm-cat">Career category</label><select id="rm-cat" className="rm-select" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} data-testid="select-match-category"><option value="all">All categories</option>{categories.map((c) => <option key={c} value={c}>{categoryLabels[c] ?? c}</option>)}</select></div></div>
          <ol className="rm-list">{visible.map((r) => <li key={r.job.id} className="rm-result" data-testid={`card-match-${r.job.id}`}>
            <span className="rm-rank" aria-label={`Rank ${rankOf(r)}`}>#{rankOf(r)}</span>
            <div><h3 data-testid={`text-match-title-${r.job.id}`}>{r.job.title}</h3><div className="rm-meta">{r.job.company} · {categoryLabels[r.job.sector]}</div>
               <div className="rm-meta">{salaryLabel(r.job)}</div>
               <div className="rm-meta" title={r.job.experience}>{r.job.experience || 'Experience: not provided'}</div>
               {r.job.sourceUrl && <a className="rm-meta" href={r.job.sourceUrl} target="_blank" rel="noopener noreferrer" data-testid={`link-match-source-${r.job.id}`}>Source listing <ExternalLink size={11} /></a>}
              <div className="rm-meta">Role SDG: <SdgTags a={r.roleSdg} id={`role-${r.job.id}`} /></div></div>
            <div className="rm-fit"><strong data-testid={`text-match-score-${r.job.id}`}>{r.score === null ? 'n/a' : `${r.score}%`}</strong><small>estimated skill fit</small>
              <div className="rm-bar" aria-hidden="true"><span style={{ transform: `scaleX(${(r.score ?? 0) / 100})` }} /></div>
              <small data-testid={`text-match-count-${r.job.id}`}>{r.matchedCount} of {r.requiredCount} listed skills</small>
              <button type="button" className="rm-btn" style={{ marginTop: 8 }} onClick={() => setDetailId(r.job.id)} data-testid={`button-view-details-${r.job.id}`}>View details<ChevronRight size={14} /></button></div>
          </li>)}</ol>
          {filtered.length > PAGE_SIZE && <div className="rm-pager"><span>Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span><div>
            <button type="button" className="rm-btn" aria-label="Previous page" disabled={page === 1} onClick={() => setPage((x) => x - 1)} data-testid="button-matches-prev"><ChevronLeft size={15} /></button><span>{page} / {pages}</span>
            <button type="button" className="rm-btn" aria-label="Next page" disabled={page === pages} onClick={() => setPage((x) => x + 1)} data-testid="button-matches-next"><ChevronRight size={15} /></button></div></div>}
        </section>}
      </>}
    </>}
  </div>;
}

function Detail({ r, rank, formula, sdgNotice, experienceYears, headRef, onBack }: { r: RoleMatch; rank: number; formula: string; sdgNotice: string; experienceYears: number | "" | undefined; headRef: RefObject<HTMLHeadingElement | null>; onBack: () => void }) {
  const j = r.job;
  const experienceFit = assessExperience(experienceYears, j.experience);
  return <section className="rm-detail" aria-labelledby="rm-detail-h" data-testid={`detail-match-${j.id}`}>
    <button type="button" className="rm-btn" onClick={onBack} data-testid="button-back-to-results"><ArrowLeft size={14} />Back to ranked results</button>
    <div className="rm-card" style={{ marginTop: 14 }}>
      <div className="rm-eyebrow">Rank #{rank} · {categoryLabels[j.sector]}</div>
      <h2 id="rm-detail-h" ref={headRef} tabIndex={-1} data-testid="text-detail-title">{j.title}</h2>
      <div className="rm-meta" data-testid="text-detail-company">{j.company} · {j.industry}</div>
      <div className="rm-detail-grid">
        <div className="rm-fact"><span>Estimated skill fit</span><div className="rm-score-line"><strong data-testid="text-detail-score">{r.score === null ? 'Not calculable' : `${r.score}%`}</strong><small>{r.matchedCount} of {r.requiredCount} listed skills</small></div></div>
        <div className="rm-fact"><span>Experience (source wording)</span>{j.experience || 'Not specified'}</div>
        <div className="rm-fact"><span>Education (source wording)</span>{j.education || 'Not specified'}</div>
        <div className="rm-fact"><span>Salary (original)</span><span data-testid="text-detail-salary" style={{ textTransform: 'none', fontSize: 13, color: 'inherit', letterSpacing: 0 }}>{salaryLabel(j)}</span></div>
      </div>
      <div className={`rm-note ${experienceFit.status === 'below_requirement' ? 'is-warn' : ''}`} role={experienceFit.status === 'below_requirement' ? 'alert' : 'note'} data-testid="experience-fit" data-state={experienceFit.status}>
        {experienceFit.status === 'below_requirement' ? <AlertTriangle size={16} /> : <Info size={16} />}<p>{experienceFit.message}</p>
      </div>
      <p className="rm-muted" data-testid="text-detail-formula">{formula} The profile is self-reported; this is not a hiring probability. Experience, education, interests, proficiency and salary are not scored.</p>
      <div className="rm-actions">{j.sourceUrl ? <a className="rm-btn" href={j.sourceUrl} target="_blank" rel="noopener noreferrer" data-testid="link-detail-source">View source listing ({j.source || 'source name not provided'})<ExternalLink size={13} /></a> : <span className="rm-muted">Source: {j.source || 'not specified'}, no URL supplied.</span>}</div>
    </div>
    <section className="rm-card" aria-labelledby="rm-role-sdg-h">
      <div className="rm-toolbar"><h3 id="rm-role-sdg-h">Role SDG mapping</h3><SdgTags a={r.roleSdg} id={`detail-role-${j.id}`} /></div>
      <p className="rm-muted">{sdgNotice}</p><SdgDetail a={r.roleSdg} id={`role-${j.id}`} />
    </section>
    <h3 className="rm-section-heading">Individual skill SDG assessments</h3>
    <p className="rm-muted">Compact tags show mapped goals. Open an assessment for its explanation, conditions, source context, and official UN reference. Neutral “Not assessed” labels are not review warnings.</p>
    <div className="rm-two">
      <div className="rm-card"><h3>Matched skills ({r.matchedSkills.length})</h3><p className="rm-muted">Listed requirements that match a skill name in your profile.</p>
        {r.matchedSkills.length ? <ul className="rm-skill-table">{r.matchedSkills.map((s) => <li key={s.skill} className="rm-skill-row" data-testid={`row-matched-${slug(s.skill)}`}><header><strong>{s.skill}</strong><SdgTags a={s.sdg} id={`m-${slug(s.skill)}`} /></header><div className="rm-meta">{s.category} skill{s.matchedBy ? ` · matched by your "${s.matchedBy}"` : ''}</div><SdgDetail a={s.sdg} id={`m-${slug(s.skill)}`} collapsed /></li>)}</ul> : <p className="rm-muted">No listed skills matched.</p>}</div>
      <div className="rm-card"><h3>Skills not found in your saved profile ({r.skillGaps.length})</h3><p className="rm-muted">This does not mean you definitely lack them; you may simply not have listed them.</p>
        {r.skillGaps.length ? <ul className="rm-skill-table">{r.skillGaps.map((s) => <li key={s.skill} className="rm-skill-row" data-testid={`row-gap-${slug(s.skill)}`}><header><strong>{s.skill}</strong><SdgTags a={s.sdg} id={`g-${slug(s.skill)}`} /></header><div className="rm-meta">{s.category} skill</div><SdgDetail a={s.sdg} id={`g-${slug(s.skill)}`} collapsed /></li>)}</ul> : <p className="rm-muted">No gaps against listed skills.</p>}</div>
    </div>
    <div className="rm-card"><h3>Suggested improvement</h3><p data-testid="text-detail-improvement">{r.improvement}</p>
      {r.unmatchedProfileSkills.length > 0 && <><h3>Your skills not listed for this role</h3><p className="rm-muted">These terms do not contribute to this score and have not been assessed in this role's requirements.</p><div className="rm-chips">{r.unmatchedProfileSkills.map((s) => <span key={s} className="rm-chip is-plain"><span>{s}</span><UnassessedSdg /></span>)}</div></>}</div>
    <button type="button" className="rm-btn" onClick={onBack} data-testid="button-back-to-results-bottom"><ArrowLeft size={14} />Back to ranked results</button>
  </section>;
}
