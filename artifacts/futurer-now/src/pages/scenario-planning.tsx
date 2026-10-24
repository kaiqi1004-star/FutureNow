import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import {
  useGetFutureReadyJobs,
  useGetFutureReadyLabourMarket,
  useMatchFutureReadyRoles,
} from '@workspace/api-client-react';
import type { JobListing, RoleMatch } from '@workspace/api-client-react';
import {
  AlertCircle, ArrowRight, BookOpen, BriefcaseBusiness, Check, ChevronDown,
  ExternalLink, Info, RefreshCw, ShieldCheck, Sparkles,
} from 'lucide-react';
import { loadProfile, type SavedProfile } from '@/lib/skills-profile';
import { matchingProfileInput } from '@/lib/matching-profile';
import {
  accessLabels, buildResourceRecommendations, type ResourceRecommendation,
} from '@/lib/reskilling-resources';
import {
  adoptionScenarios, scenarioCategoryLabels, scenarioResearchSources,
  taskIllustrationDisclosure, taskIllustrationsBySector, type ScenarioStatement,
} from '@/lib/scenario-planning-model';
import { useTranslation } from '@/lib/i18n';
import { brandLogoUrl } from '@/lib/brand';
import './scenario-planning.css';

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const formatDate = (value: string) => {
  if (!value) return 'Not supplied';
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' });
};
const formatPublished = (value: string) => value;

function readProfile() {
  const { saved, error } = loadProfile();
  return { saved, error, skillKey: matchingProfileInput(saved).currentSkills.join('|') };
}

function EvidenceTag({ type }: { type: ScenarioStatement['evidenceType'] }) {
  const { t } = useTranslation();
  const labels = {
    'planning-assumption': 'Planning assumption',
    'source-finding': 'Source finding',
    'preparation-suggestion': 'Preparation suggestion',
  };
  return <span className={`sp-evidence sp-evidence-${type}`}>{t(labels[type])}</span>;
}

function SourceRefs({ ids }: { ids: ScenarioStatement['sourceIds'] }) {
  const { t } = useTranslation();
  if (!ids.length) return <span className="sp-no-source">{t('No external source cited')}</span>;
  return <span className="sp-source-refs">{t(ids.length > 1 ? 'Sources:' : 'Source:')} {ids.map((id) => {
    const source = scenarioResearchSources.find((item) => item.id === id);
    return source ? source.publisher : id;
  }).join(' · ')}</span>;
}

function Statement({ statement, id }: { statement: ScenarioStatement; id: string }) {
  const { t } = useTranslation();
  return <div className="sp-statement" data-testid={id}>
    <div className="sp-statement-top"><EvidenceTag type={statement.evidenceType} /><SourceRefs ids={statement.sourceIds} /></div>
    <p>{t(statement.text)}</p>
  </div>;
}

function ResearchSource({ source }: { source: typeof scenarioResearchSources[number] }) {
  const { t } = useTranslation();
  return <article className="sp-source-card" data-testid={`card-scenario-source-${source.id}`}>
     <div className="sp-source-meta"><span>{source.publisher}</span><span>{t(source.scope)} {t('scope')}</span><span>{t('Published')} {formatPublished(source.publishedOn)}</span></div>
    <h3>{source.title}</h3>
     <div className="sp-source-detail"><small>{t('FINDING')}</small><p>{t(source.finding)}</p></div>
     <div className="sp-source-detail"><small>{t('METHODOLOGY')}</small><p>{t(source.methodology)}</p></div>
     <div className="sp-source-foot"><span>{t('Verified')} {formatDate(source.verifiedOn)}</span><a href={source.originalUrl} target="_blank" rel="noopener noreferrer" data-testid={`link-scenario-source-${source.id}`}>{t('Original source')} <ExternalLink size={13} /></a></div>
  </article>;
}

function ResourceCard({ item }: { item: ResourceRecommendation }) {
  const { t } = useTranslation();
  const resource = item.resource;
  return <article className={`sp-resource ${resource.kind === 'provider-catalogue' ? 'catalogue' : ''}`} data-testid={`card-scenario-resource-${slug(resource.id)}`}>
     <div className="sp-resource-top"><span>{t(accessLabels[resource.access])}</span><small>{t(resource.kind === 'provider-catalogue' ? 'Catalogue search · not a verified course' : 'Existing checked learning item')}</small></div>
    <h4>{resource.title}</h4><p className="sp-resource-provider">{resource.provider}</p><p>{resource.overview}</p>
     <div className="sp-resource-tags"><span>{t('Matched requirement')}</span>{item.skills.map((skill) => <b key={skill.name}>{skill.name}{skill.type === 'related' ? ` · ${t('related')}` : skill.type === 'catalogue-search' ? ` · ${t('search only')}` : ''}</b>)}</div>
     <dl><div><dt>{t('Duration')}</dt><dd>{resource.duration}</dd></div><div><dt>{t('Credential')}</dt><dd>{resource.credential}</dd></div><div><dt>{t('Access')}</dt><dd>{resource.accessNote}</dd></div></dl>
     <div className="sp-resource-link">{resource.lastVerifiedOn ? t('Information verified {date}', { date: resource.lastVerifiedOn }) : t('Catalogue content not verified')} <a href={resource.url} target="_blank" rel="noopener noreferrer">{t('Visit resource')} <ExternalLink size={12} /></a></div>
  </article>;
}

export default function ScenarioPlanningPage() {
  const { t } = useTranslation();
  const jobsQuery = useGetFutureReadyJobs();
  const labourQuery = useGetFutureReadyLabourMarket();
  const matcher = useMatchFutureReadyRoles();
  const [profileState, setProfileState] = useState(readProfile);
  const [sector, setSector] = useState<JobListing['sector']>('software');
  const [jobId, setJobId] = useState('');
  const [comparedSkillKey, setComparedSkillKey] = useState('');

  useEffect(() => {
    const refreshProfile = () => {
      const next = readProfile();
      if (next.skillKey !== profileState.skillKey) {
        matcher.reset();
        setComparedSkillKey('');
      }
      setProfileState(next);
    };
    window.addEventListener('focus', refreshProfile);
    window.addEventListener('storage', refreshProfile);
    return () => {
      window.removeEventListener('focus', refreshProfile);
      window.removeEventListener('storage', refreshProfile);
    };
  }, [profileState.skillKey, matcher.reset]);

  const saved: SavedProfile | null = profileState.saved;
  const skills = useMemo(() => matchingProfileInput(saved).currentSkills, [saved]);
  const jobs = jobsQuery.data ?? [];
  const categoryJobs = jobs.filter((job) => job.sector === sector);
  const selectedJob = categoryJobs.find((job) => job.id === jobId);
  const matchedRole: RoleMatch | undefined = matcher.data?.results.find((result) => result.job.id === selectedJob?.id);
  const gaps = matchedRole?.skillGaps ?? [];
  const gapNames = useMemo(() => [...new Set(gaps.map((gap) => gap.skill))], [gaps]);
  const recommendations = useMemo(() => buildResourceRecommendations(gapNames), [gapNames]);
  const hasPlan = Boolean(matchedRole && comparedSkillKey === profileState.skillKey);
  const national = labourQuery.data?.observations?.at(-1);

  const resetComparison = () => {
    matcher.reset();
    setComparedSkillKey('');
  };
  const chooseSector = (value: string) => {
    setSector(value as JobListing['sector']);
    setJobId('');
    resetComparison();
  };
  const chooseJob = (value: string) => {
    setJobId(value);
    resetComparison();
  };
  const buildPlan = () => {
    if (!selectedJob || !skills.length) return;
    setComparedSkillKey(profileState.skillKey);
    matcher.mutate({ data: { currentSkills: skills } });
  };
  const retryJobs = () => { void jobsQuery.refetch(); };

  return <main className="page-wrap scenario-page">
    <header className="sp-hero">
      <div className="sp-hero-copy">
        <div className="sp-kicker"><span className="sp-kicker-mark"><BriefcaseBusiness size={15} /></span> {t('SCENARIO PLANNING')} <i>/</i> {t('MALAYSIA')}</div>
        <h1>{t('Two possible paces.')}<br /><em>{t('One practical next step.')}</em></h1>
        <p>{t('Compare qualitative planning cases for a career category, grounded in dated research and kept separate from what a supplied job record actually says.')}</p>
        <div className="sp-hero-legend"><span><i className="assumption" /> {t('Hypothetical assumptions')}</span><span><i className="finding" /> {t('Published findings')}</span><span><i className="suggestion" /> {t('Practical suggestions')}</span></div>
      </div>
      <div className="sp-hero-seal" aria-label={t('Planning cases, not predictions')}><div><ShieldCheck size={24} /><strong>{t('NO')}<br />{t('FORECASTS')}</strong></div><small>{t('Evidence kept')}<br />{t('in context')}</small></div>
      <span className="sp-hero-index">05 — {t('FUTURE')}<br /><b>{t('PLANNING LENSES')}</b></span>
    </header>

    <div className="sp-caveat" role="note" data-testid="notice-scenario-caveat">
      <Info size={18} /><p><strong>{t('These are hypothetical planning cases, not validated predictions.')}</strong> {t('Exposure is not displacement. Global evidence is not automatically evidence about a Malaysian occupation, and none of the findings below estimates job loss, demand, or your personal replacement probability.')}</p>
    </div>

    <section className="sp-context" aria-label={t('Selection and national context')}>
      <div className="sp-context-controls">
        <div className="sp-field"><label htmlFor="scenario-sector">{t('Career category')}</label><div className="sp-select-wrap"><select id="scenario-sector" value={sector} onChange={(event) => chooseSector(event.target.value)} data-testid="select-scenario-category">
          {Object.entries(scenarioCategoryLabels).map(([key, label]) => <option key={key} value={key}>{t(label)}</option>)}
        </select><ChevronDown size={15} /></div><small>{t('Choose one of the six supplied workbook categories.')}</small></div>
        <div className="sp-field"><label htmlFor="scenario-job">{t('Supplied job record')} <span>({t('Optional').toLowerCase()})</span></label><div className="sp-select-wrap"><select id="scenario-job" value={jobId} onChange={(event) => chooseJob(event.target.value)} disabled={jobsQuery.isLoading || jobsQuery.isError || !categoryJobs.length} data-testid="select-scenario-job">
          <option value="">{t('Explore category only')}</option>{categoryJobs.map((job) => <option value={job.id} key={job.id}>{job.title} — {job.company}</option>)}
        </select><ChevronDown size={15} /></div><small>{t('A small source sample; not a measure of national demand.')}</small></div>
      </div>
      <div className="sp-national" data-testid="status-scenario-national-context">
        <span className="sp-national-mark"><Info size={16} /></span>
        <div><small>{t('NATIONAL CONTEXT ONLY')}</small><strong>{labourQuery.isLoading ? t('Loading official indicator…') : national ? `${t('Unemployment rate:')} ${national.u_rate}%` : t('Official indicator unavailable')}</strong>
          <p>{national ? <>{t('OpenDOSM national labour-force observation')} · {formatDate(labourQuery.data?.latestObservationDate ?? national.date)}. {labourQuery.data?.cacheState === 'stale' && <span data-testid="status-scenario-national-stale">{t('Last refresh failed; showing the cached snapshot.')} </span>}{t('This does not describe demand for {category} roles.', { category: t(scenarioCategoryLabels[sector]) })} {labourQuery.data?.catalogueUrl && <a href={labourQuery.data.catalogueUrl} target="_blank" rel="noopener noreferrer" data-testid="link-scenario-national-source">{t('Official dataset')} <ExternalLink size={12} /></a>}</> : t('The national indicator could not be loaded. Scenario exploration remains available; no substitute value is shown.')}</p>
        </div>
      </div>
    </section>
    {labourQuery.isError && <div className="sp-inline-state" role="status" data-testid="status-scenario-labour-error"><AlertCircle size={15} /> {t('National context is unavailable. The scenario comparison is still usable.')}</div>}

    {jobsQuery.isError && <div className="sp-state sp-state-error" role="alert" data-testid="status-scenario-jobs-error"><AlertCircle size={18} /><div><strong>{t('Supplied job records could not be loaded.')}</strong><p>{t('Category-level scenario exploration is still available. No substitute listing is shown.')}</p></div><button type="button" onClick={retryJobs} data-testid="button-retry-scenario-jobs"><RefreshCw size={14} /> {t('Try again')}</button></div>}
    {jobsQuery.isLoading && <div className="sp-jobs-loading" role="status" aria-label={t('Loading job records')} data-testid="status-scenario-jobs-loading"><i /><i /></div>}
    {jobsQuery.isSuccess && !jobs.length && <div className="sp-inline-state" role="status" data-testid="status-scenario-no-jobs"><BriefcaseBusiness size={15} /> {t('No supplied job records are available. You can still compare the category-level planning cases.')}</div>}

    {selectedJob && <article className="sp-role-card" aria-labelledby="sp-role-title" data-testid={`card-scenario-role-${slug(selectedJob.id)}`}>
       <div className="sp-role-head"><div><div className="sp-section-kicker">{t('SELECTED SOURCE RECORD')} <span>{t('RECORD')} / {selectedJob.id}</span></div><h2 id="sp-role-title">{selectedJob.title}</h2><p>{selectedJob.company} <i>·</i> {selectedJob.industry}</p></div>
        <a href={selectedJob.sourceUrl || undefined} target="_blank" rel="noopener noreferrer" className={`sp-role-source ${selectedJob.sourceUrl ? '' : 'disabled'}`} aria-disabled={!selectedJob.sourceUrl} onClick={(event) => { if (!selectedJob.sourceUrl) event.preventDefault(); }} data-testid="link-scenario-role-source">{selectedJob.sourceUrl ? <>{t('View original listing')} <ExternalLink size={14} /></> : t('Source link not supplied')}</a>
      </div>
      <div className="sp-role-facts"><div><small>{t('COMPANY')}</small><span data-testid="text-scenario-role-company">{selectedJob.company}</span></div><div><small>{t('SOURCE')}</small><span data-testid="text-scenario-role-source-name">{selectedJob.source || t('Not specified in this record')}</span></div><div><small>{t('EXPERIENCE · ORIGINAL WORDING')}</small><span data-testid="text-scenario-role-experience">{selectedJob.experience || t('Not specified in this record')}</span></div></div>
      <div className="sp-requirement-grid">
        <div><h3>{t('Technical skills')} <small>{t('AS LISTED')}</small></h3><p data-testid="text-scenario-role-technical">{selectedJob.technicalSkills.length ? selectedJob.technicalSkills.join(' · ') : t('Not specified in this record')}</p></div>
        <div><h3>{t('Soft skills')} <small>{t('AS LISTED')}</small></h3><p data-testid="text-scenario-role-soft">{selectedJob.softSkills.length ? selectedJob.softSkills.join(' · ') : t('Not specified in this record')}</p></div>
      </div>
    </article>}

    <section className="sp-scenarios" aria-labelledby="sp-compare-title">
      <div className="sp-section-head"><div><div className="sp-section-kicker">{t('01 / QUALITATIVE COMPARISON')}</div><h2 id="sp-compare-title">{t('Consider both paces, without scoring either.')}</h2><p>{t('Same evidence boundary. Different hypothetical adoption pace.')}</p></div><span className="sp-not-score"><ShieldCheck size={15} /> {t('NO SCENARIO SCORES')}</span></div>
      <div className="sp-scenario-grid">
        {adoptionScenarios.map((scenario) => {
          const illustration = taskIllustrationsBySector[sector];
          return <article className={`sp-scenario-card sp-${scenario.id}`} key={scenario.id} data-testid={`card-scenario-${scenario.id}`}>
            <header><span className="sp-scenario-number">{scenario.id === 'moderate' ? 'A' : 'B'}</span><div><span className="sp-pace">{t(scenario.paceLabel)}</span><h3>{t(scenario.title)}</h3></div><span className="sp-hypothetical">{t('HYPOTHETICAL')}</span></header>
            <p className="sp-scenario-summary">{t(scenario.summary)}</p>
            <div className="sp-scenario-block"><h4>{t('Working assumptions')}</h4>{scenario.assumptions.map((statement, index) => <Statement key={index} statement={statement} id={`text-${scenario.id}-assumption-${index + 1}`} />)}</div>
            <div className="sp-scenario-block"><h4>{t('Possible task-level changes')}</h4>
              {(['automation', 'assistance', 'humanInvolvement'] as const).map((key) => <div className="sp-task-row" key={key}><span>{t(key === 'automation' ? 'Automation' : key === 'assistance' ? 'AI assistance' : 'Human role')}</span><Statement statement={scenario.taskChanges[key]} id={`text-${scenario.id}-${key}`} /></div>)}
            </div>
            <div className="sp-scenario-block"><h4>{t('Opportunity')}</h4>{scenario.opportunities.map((statement, index) => <Statement key={index} statement={statement} id={`text-${scenario.id}-opportunity-${index + 1}`} />)}</div>
            <div className="sp-scenario-block"><h4>{t('Challenge')}</h4>{scenario.challenges.map((statement, index) => <Statement key={index} statement={statement} id={`text-${scenario.id}-challenge-${index + 1}`} />)}</div>
            <div className="sp-illustration"><div><Sparkles size={14} /><strong>{t('Illustrative task prompt')} · {t(scenarioCategoryLabels[sector])}</strong></div>
              <p><b>{t('Automation')}</b> {t(illustration.automation)}</p><p><b>{t('Assistance')}</b> {t(illustration.assistance)}</p><p><b>{t('Human involvement')}</b> {t(illustration.humanInvolvement)}</p>
              <small>{t(taskIllustrationDisclosure)}</small>
            </div>
            <div className="sp-scenario-block"><h4>{t('Skill implications')}</h4>{scenario.skillImplications.map((statement, index) => <Statement key={index} statement={statement} id={`text-${scenario.id}-skill-${index + 1}`} />)}</div>
            <div className="sp-scenario-block sp-actions"><h4>{t('Preparation that stays useful')}</h4>{scenario.preparationActions.map((statement, index) => <Statement key={index} statement={statement} id={`text-${scenario.id}-action-${index + 1}`} />)}</div>
          </article>;
        })}
      </div>
    </section>

    <section className="sp-plan-section" aria-labelledby="sp-plan-title">
      <div className="sp-plan-intro"><div className="sp-section-kicker">{t('02 / OPTIONAL PERSONAL PREPARATION')}</div><h2 id="sp-plan-title">{t('Start from the record, not a guess.')}</h2><p>{t('With a saved skills profile and selected listing, you can compare the listing’s existing requirements against explicitly saved skill names.')}</p></div>
      <div className="sp-profile-note"><ShieldCheck size={18} /><p><strong>{t('Profile skills are self-reported.')}</strong> {t('Only saved skill names are sent when you choose to build a plan. No interests, experience text, or other profile fields are sent. Unmatched requirements mean “not found in saved profile,” not proof you lack a capability.')}</p></div>
      {profileState.error && <div className="sp-state sp-state-error" role="alert" data-testid="status-scenario-profile-error"><AlertCircle size={17} /><div><strong>{t('Saved profile could not be read.')}</strong><p>{t(profileState.error)} {t('Scenario comparison remains available.')}</p></div></div>}
      {!profileState.error && !saved && <div className="sp-state sp-state-empty" role="status" data-testid="status-scenario-no-profile"><BookOpen size={18} /><div><strong>{t('No saved skills profile found.')}</strong><p>{t('That says nothing about your capability. Explore both scenarios now, or add skill names explicitly in your browser profile to build a personal preparation plan.')}</p><Link href="/skills-profile" data-testid="link-scenario-create-profile">{t('Open skills profile')} <ArrowRight size={14} /></Link></div></div>}
      {!profileState.error && saved && !skills.length && <div className="sp-state sp-state-empty" role="status" data-testid="status-scenario-empty-skills"><BookOpen size={18} /><div><strong>{t('Your saved profile has no skill names.')}</strong><p>{t('No comparison will be inferred from other profile answers. Add skills explicitly to enable the optional plan.')}</p><Link href="/skills-profile" data-testid="link-scenario-add-skills">{t('Add saved skills')} <ArrowRight size={14} /></Link></div></div>}
      <div className="sp-plan-action">
        <div><strong>{selectedJob ? selectedJob.title : t('Choose a supplied job record')}</strong><span>{skills.length ? t('{count} self-reported skill {label} available', { count: skills.length, label: t(skills.length === 1 ? 'name' : 'names') }) : t('A saved skill name is needed for comparison')}</span></div>
        <button type="button" onClick={buildPlan} disabled={!selectedJob || !skills.length || matcher.isPending} data-testid="button-build-scenario-plan">
          {matcher.isPending ? t('Comparing saved names…') : <>{t('Build personal preparation plan')} <ArrowRight size={16} /></>}
        </button>
      </div>
      {!selectedJob && <p className="sp-plan-hint" data-testid="text-scenario-select-role">{t('Select an actual listing above to compare its stated requirements. Category-level scenario guidance does not require a listing.')}</p>}
      {matcher.isError && <div className="sp-inline-error" role="alert" data-testid="status-scenario-match-error"><AlertCircle size={16} /><span>{t('The requirements comparison could not be completed. Your browser profile was not changed.')}</span><button type="button" onClick={buildPlan} disabled={!selectedJob || !skills.length || matcher.isPending} data-testid="button-retry-scenario-plan">{t('Try again')}</button></div>}
      {hasPlan && matchedRole && <div className="sp-plan-results" aria-live="polite" data-testid="section-scenario-plan-results">
        <div className="sp-plan-result-head"><div><span className="sp-section-kicker">{t('MATCHER RESULT · REQUIREMENTS ONLY')}</span><h3>{t('Requirements not found in saved skills')}</h3><p>{t('Compared the selected record with only the skill names explicitly saved in your browser profile.')}</p></div><span>{gaps.length} {t(gaps.length === 1 ? 'requirement' : 'requirements')}</span></div>
        <div className="sp-profile-skills"><small>{t('SELF-REPORTED SAVED SKILLS')}</small><p>{skills.join(' · ')}</p></div>
        <div className="sp-listed-skills"><small>{t('SELECTED SOURCE-LISTED REQUIREMENTS')}</small><p><b>{t('Technical:')}</b> {selectedJob?.technicalSkills.length ? selectedJob.technicalSkills.join(' · ') : t('Not specified')}<br /><b>{t('Soft skills:')}</b> {selectedJob?.softSkills.length ? selectedJob.softSkills.join(' · ') : t('Not specified')}</p></div>
        {gaps.length ? <div className="sp-gap-list" data-testid="list-scenario-skill-gaps">{gaps.map((gap, index) => <div key={`${gap.category}-${gap.skill}`} data-testid={`text-scenario-gap-${slug(gap.skill)}`}><span>{String(index + 1).padStart(2, '0')}</span><strong>{gap.skill}</strong><small>{t(gap.category === 'technical' ? 'Technical requirement' : 'Soft-skill requirement')} · {t('not found in saved profile')}</small></div>)}</div>
          : <div className="sp-no-gaps" data-testid="status-scenario-no-gaps"><Check size={17} /><span>{t('No selected-record requirements were returned as gaps. This is a comparison result, not verification of proficiency.')}</span></div>}
        {gaps.length > 0 && <div className="sp-resource-section"><div><h4>{t('Existing learning resources for these requirements')}</h4><p>{t('Only resources matched by Feature 3 to the requirements above are shown. They are suggestions to review, not a prescribed route.')}</p></div>
          {recommendations.length ? <div className="sp-resource-grid" data-testid="list-scenario-resources">{recommendations.map((item) => <ResourceCard key={item.resource.id} item={item} />)}</div>
             : <div className="sp-no-resources" role="status" data-testid="status-scenario-no-resources"><BookOpen size={18} /><div><strong>{t('No existing resource matches these requirements.')}</strong><p>{t('No course has been invented or substituted. You can still use the requirements list to guide a project, peer discussion, or provider catalogue search.')}</p></div></div>}
        </div>}
        <div className="sp-broader-suggestions"><span>{t('SEPARATE FROM LISTED REQUIREMENTS')}</span><p>{t('Broader research-based preparation: practise checking sources, context, calculations, and edge cases in any AI-assisted work. This is a general suggestion—not a requirement from the selected listing.')}</p></div>
      </div>}
    </section>

    <section className="sp-research" aria-labelledby="sp-research-heading">
      <div className="sp-section-head"><div><div className="sp-section-kicker">{t('03 / DATED RESEARCH')}</div><h2 id="sp-research-heading">{t('Read each finding within its scope.')}</h2><p>{t('Published evidence is presented as reported, not converted into scenario scores.')}</p></div><span className="sp-verified-mark"><ShieldCheck size={15} /> {t('SOURCE DETAILS VERIFIED')}</span></div>
      <div className="sp-source-grid">{scenarioResearchSources.map((source) => <ResearchSource key={source.id} source={source} />)}</div>
      <div className="sp-research-reading"><Info size={16} /><p>{t('The World Bank’s approximately 45% task-exposure estimate, the ILO’s one-in-four global exposure finding, and WEF survey figures of 85% and 63% are source findings only. They are not scenario scores, job-loss estimates, occupational demand, or personal probabilities. Exposure describes potential task overlap; it does not establish displacement.')}</p></div>
    </section>

    <footer className="sp-footer"><img className="sp-footer-logo" src={brandLogoUrl} alt={t('FutureNow logo')} /><p><strong>{t('Evidence first. Context always.')}</strong><br />{t('Official indicators, supplied job requirements, dated research, hypothetical assumptions, and practical suggestions remain distinct.')}</p><span>FUTURENOW <i>·</i> SDC 2026</span></footer>
  </main>;
}
