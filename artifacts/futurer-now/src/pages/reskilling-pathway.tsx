import { useMemo, useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useGetFutureReadyJobs, useMatchFutureReadyRoles } from '@workspace/api-client-react';
import type { JobListing, RoleMatch } from '@workspace/api-client-react';
import { ArrowRight, BookOpen, Check, ChevronDown, ExternalLink, Info, LockKeyhole, RefreshCw, Route, ShieldCheck } from 'lucide-react';
import { loadProfile, type SavedProfile } from '@/lib/skills-profile';
import { matchingProfileInput } from '@/lib/matching-profile';
import { candidateProviders, buildResourceRecommendations, accessLabels, type LearningResource, type ResourceRecommendation } from '@/lib/reskilling-resources';
import './reskilling-pathway.css';

const categoryLabels: Record<JobListing['sector'], string> = {
  software: 'Software', mechanical: 'Mechanical', 'digital-marketing': 'Digital marketing',
  'human-resources': 'Human resources', 'accounting-finance': 'Accounting / finance', 'data-analytics': 'Data analytics',
};
const accessOrder = { free: 0, varies: 1, 'not-stated': 2 } as const;
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-');

function readSavedProfile() {
  const { saved, error } = loadProfile();
  return { saved, error, skillKey: matchingProfileInput(saved).currentSkills.join('|') };
}

export default function ReskillingPathwayPage() {
  const jobsQuery = useGetFutureReadyJobs();
  const matcher = useMatchFutureReadyRoles();
  const [profileState, setProfileState] = useState(readSavedProfile);
  const [category, setCategory] = useState('all');
  const [jobId, setJobId] = useState('');
  const [skillFilter, setSkillFilter] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const [accessFilter, setAccessFilter] = useState<'all' | 'free' | 'varies' | 'not-stated'>('all');
  const [comparedSkillKey, setComparedSkillKey] = useState('');

  useEffect(() => {
    const refresh = () => {
      const next = readSavedProfile();
      if (next.skillKey !== profileState.skillKey) {
        matcher.reset();
        setComparedSkillKey('');
      }
      setProfileState(next);
    };
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    return () => { window.removeEventListener('focus', refresh); window.removeEventListener('storage', refresh); };
  }, [profileState.skillKey, matcher.reset]);

  const saved: SavedProfile | null = profileState.saved;
  const skills = useMemo(() => matchingProfileInput(saved).currentSkills, [saved]);
  const jobs = jobsQuery.data ?? [];
  const categories = useMemo(() => [...new Set(jobs.map((job) => job.sector))], [jobs]);
  const categoryJobs = jobs.filter((job) => category === 'all' || job.sector === category);
  const selectedJob = jobs.find((job) => job.id === jobId);
  const matchedRole: RoleMatch | undefined = matcher.data?.results.find((result) => result.job.id === jobId);
  const gaps = matchedRole?.skillGaps ?? [];
  const gapNames = useMemo(() => [...new Set(gaps.map((gap) => gap.skill))], [gaps]);
  const recommendations = useMemo(() => {
    const matchedResources = buildResourceRecommendations(gapNames, {
      provider: providerFilter,
      access: accessFilter,
    });
    const coveredBySpecificResource = new Set(matchedResources
      .filter((item) => item.resource.id !== 'elatih-catalogue')
      .flatMap((item) => item.skills.map((skill) => skill.name)));
    const base = matchedResources.flatMap((item) => {
      if (item.resource.id !== 'elatih-catalogue') return [item];
      const remainingSkills = item.skills.filter((skill) => !coveredBySpecificResource.has(skill.name));
      return remainingSkills.length ? [{ ...item, skills: remainingSkills }] : [];
    });
    const prioritizeFree = saved?.profile.interests.budget === 'Free only' || saved?.profile.interests.budget === 'Low-cost';
    return [...base].sort((a, b) => prioritizeFree
      ? accessOrder[a.resource.access] - accessOrder[b.resource.access]
      : 0);
  }, [gapNames, providerFilter, accessFilter, saved]);
  const visibleRecommendations = recommendations.filter((item) =>
    skillFilter === 'all' || item.skills.some((skill) => skill.name === skillFilter),
  );
  const hasComparedSelection = Boolean(matcher.data && matchedRole && comparedSkillKey === profileState.skillKey);

  const chooseCategory = (value: string) => {
    setCategory(value);
    setJobId('');
    matcher.reset();
    setComparedSkillKey('');
    setSkillFilter('all');
  };
  const compareRole = () => {
    if (!selectedJob || !skills.length) return;
    setComparedSkillKey(profileState.skillKey);
    matcher.mutate({ data: { currentSkills: skills } });
  };
  const retryJobs = () => { void jobsQuery.refetch(); };

  return <main className="page-wrap pathway-page">
    <header className="page-heading pathway-heading">
      <div>
        <div className="eyebrow">FEATURE 03 / LEARNING ROUTE</div>
        <h1>Turn one role into<br className="pathway-desktop-break" /> a practical next step.</h1>
        <p>Start with a real supplied listing. See which stated requirements are missing, then explore learning resources matched only to those gaps.</p>
      </div>
      <div className="pathway-heading-mark" aria-hidden="true"><Route size={31} strokeWidth={1.4} /><span>03</span></div>
    </header>

    <div className="pathway-trust" role="note">
      <ShieldCheck size={18} />
      <p><strong>Your profile stays yours.</strong> Only the explicitly saved skill names are sent to FutureNow’s existing stateless matcher for comparison. Other profile details remain in this browser; the matcher does not store your profile.</p>
    </div>

    {profileState.error && <div className="pathway-message pathway-error" role="alert" data-testid="status-profile-error"><Info size={17} /><div><strong>Could not read your saved profile</strong><p>{profileState.error}</p><Link href="/skills-profile" data-testid="link-review-skills-profile">Review skills profile <ArrowRight size={14} /></Link></div></div>}
    {!saved && !profileState.error && <div className="pathway-message pathway-empty" role="status" data-testid="status-no-profile"><div className="pathway-message-icon"><BookOpen size={19} /></div><div><strong>Start with your saved skills</strong><p>Save a profile with at least one skill name before comparing it with job requirements. Nothing is inferred from your background or interests.</p><Link href="/skills-profile" data-testid="link-open-skills-profile">Open skills profile <ArrowRight size={14} /></Link></div></div>}
    {saved && !skills.length && <div className="pathway-message pathway-empty" role="status" data-testid="status-profile-no-skills"><div className="pathway-message-icon"><BookOpen size={19} /></div><div><strong>Your profile has no saved skill names yet</strong><p>Add skills explicitly in your browser profile. Other answers cannot be used as skills in this comparison.</p><Link href="/skills-profile" data-testid="link-add-skills-to-profile">Add skills to your profile <ArrowRight size={14} /></Link></div></div>}

    <section className="pathway-builder" aria-labelledby="pathway-builder-title">
      <div className="pathway-step-heading">
        <span className="pathway-step-number">01</span>
        <div><div className="pathway-kicker">CHOOSE A REAL LISTING</div><h2 id="pathway-builder-title">Where would you like to go?</h2></div>
        <span className="pathway-record-note" data-testid="text-pathway-record-count">{jobs.length ? `${jobs.length} supplied records` : 'Supplied records'}</span>
      </div>
      {jobsQuery.isError ? <div className="pathway-message pathway-error" role="alert" data-testid="status-pathway-jobs-error"><Info size={18} /><div><strong>Job records could not be loaded</strong><p>No sample listings are shown in their place. Check your connection and retry.</p><button type="button" onClick={retryJobs} data-testid="button-retry-pathway-jobs"><RefreshCw size={14} /> Try again</button></div></div>
        : jobsQuery.isLoading || jobsQuery.isFetching ? <div className="pathway-loading" role="status" aria-label="Loading supplied job records" data-testid="status-pathway-jobs-loading"><i /><i /><i /></div>
        : !jobs.length ? <div className="pathway-message pathway-empty" role="status" data-testid="status-pathway-no-jobs"><strong>No supplied job records are available.</strong><p>Try again later to load the current records.</p><button type="button" onClick={retryJobs} data-testid="button-retry-pathway-jobs"><RefreshCw size={14} /> Retry</button></div>
        : <div className="pathway-select-grid">
          <div className="pathway-field">
            <label htmlFor="pathway-category">Career category</label>
            <div className="pathway-select"><select id="pathway-category" value={category} onChange={(event) => chooseCategory(event.target.value)} data-testid="select-pathway-category"><option value="all">All categories</option>{categories.map((item) => <option value={item} key={item}>{categoryLabels[item]}</option>)}</select><ChevronDown size={16} /></div>
          </div>
          <div className="pathway-field">
            <label htmlFor="pathway-job">Specific job listing</label>
            <div className="pathway-select"><select id="pathway-job" value={jobId} onChange={(event) => { setJobId(event.target.value); matcher.reset(); setComparedSkillKey(''); }} data-testid="select-pathway-job"><option value="">Choose a supplied role…</option>{categoryJobs.map((job) => <option key={job.id} value={job.id}>{job.title} — {job.company}</option>)}</select><ChevronDown size={16} /></div>
            {!categoryJobs.length && <small>No supplied listings in this category.</small>}
          </div>
          {selectedJob && <article className="pathway-role-card" aria-label="Selected job listing" data-testid={`card-pathway-job-${slug(selectedJob.id)}`}>
            <div className="pathway-role-top"><span>{categoryLabels[selectedJob.sector]}</span><span>RECORD / {selectedJob.id}</span></div>
            <h3 data-testid="text-pathway-job-title">{selectedJob.title}</h3><p data-testid="text-pathway-job-company">{selectedJob.company} <span>·</span> {selectedJob.industry}</p>
            <div className="pathway-requirements">
              <div><small>TECHNICAL SKILLS</small><span data-testid="text-pathway-job-technical-skills">{selectedJob.technicalSkills.length ? selectedJob.technicalSkills.join(' · ') : 'Not specified in this record'}</span></div>
              <div><small>SOFT SKILLS</small><span data-testid="text-pathway-job-soft-skills">{selectedJob.softSkills.length ? selectedJob.softSkills.join(' · ') : 'Not specified in this record'}</span></div>
            </div>
            {selectedJob.sourceUrl && <a className="pathway-source" href={selectedJob.sourceUrl} target="_blank" rel="noopener noreferrer" data-testid={`link-pathway-job-source-${slug(selectedJob.id)}`}>View source listing <ExternalLink size={14} /></a>}
            <button type="button" className="pathway-compare" disabled={!skills.length || matcher.isPending} onClick={compareRole} data-testid="button-compare-pathway">
              {matcher.isPending ? <><span className="pathway-button-pulse" /> Comparing requirements…</> : <>Compare saved skills <ArrowRight size={16} /></>}
            </button>
          </article>}
        </div>}
      {saved?.profile.interests.weeklyHours !== '' && saved?.profile.interests.weeklyHours !== undefined && <div className="pathway-hours" data-testid="text-pathway-weekly-hours"><span className="hours-mark">H</span><span><strong>Your learning context</strong><small>{saved.profile.interests.weeklyHours} hours available per week, as saved in your profile. This is context only; no course completion timeline is estimated.</small></span></div>}
      {matcher.isError && <div className="pathway-inline-error" role="alert" data-testid="status-pathway-match-error"><Info size={16} /><span>The comparison could not be completed. Your saved profile has not been changed.</span><button type="button" onClick={compareRole} data-testid="button-retry-pathway-match">Retry comparison</button></div>}
    </section>

    {hasComparedSelection && matchedRole && <section className="pathway-results" aria-live="polite">
      <div className="pathway-result-title">
        <div><div className="pathway-kicker">02 / YOUR LEARNING ROUTE</div><h2>Requirements to explore</h2><p>Based on skills named in this listing and names explicitly saved in your profile.</p></div>
        <div className="pathway-result-count"><strong data-testid="text-pathway-gap-count">{gaps.length.toString().padStart(2, '0')}</strong><span>{gaps.length === 1 ? 'listed gap' : 'listed gaps'}</span></div>
      </div>
      <div className="pathway-result-context"><Check size={16} /><span>Compared <strong>{skills.length} saved skill {skills.length === 1 ? 'name' : 'names'}</strong> with <strong>{selectedJob?.title}</strong>. This is a requirements comparison, not a skill-fit score or hiring prediction.</span></div>
      {gaps.length ? <div className="pathway-gap-list" aria-label="Missing requirements" data-testid="list-pathway-gaps">
        {gaps.map((gap, index) => <div className="pathway-gap-item" key={`${gap.category}-${gap.skill}`} data-testid={`text-pathway-gap-${slug(gap.skill)}`}><span className="pathway-gap-index">{String(index + 1).padStart(2, '0')}</span><span className="pathway-gap-name">{gap.skill}</span><span className="pathway-gap-type">{gap.category === 'technical' ? 'Technical requirement' : 'Soft-skill requirement'}</span></div>)}
      </div> : <div className="pathway-no-gaps"><Check size={20} /><div><strong>No listed skill gaps in this comparison</strong><p>The matcher found no missing requirements among the selected record’s listed skills and saved skill names.</p></div></div>}

      {gaps.length > 0 && <section className="pathway-resources" aria-labelledby="resources-heading">
        <div className="pathway-resource-heading"><div><div className="pathway-kicker">MATCHED TO THE GAPS ABOVE</div><h3 id="resources-heading">Learning resources</h3><p>Recommendations are for missing requirements only. Course details below reflect the catalogue’s checked information.</p></div><span className="pathway-resource-total" data-testid="text-pathway-resource-count">{visibleRecommendations.length} {visibleRecommendations.length === 1 ? 'resource' : 'resources'}</span></div>
        <div className="pathway-filters">
          <div className="pathway-field"><label htmlFor="pathway-skill-filter">Missing skill</label><div className="pathway-select"><select id="pathway-skill-filter" value={skillFilter} onChange={(event) => setSkillFilter(event.target.value)} data-testid="select-pathway-skill"><option value="all">All missing skills</option>{gapNames.map((skill) => <option key={skill} value={skill}>{skill}</option>)}</select><ChevronDown size={15} /></div></div>
          <div className="pathway-field"><label htmlFor="pathway-provider-filter">Provider</label><div className="pathway-select"><select id="pathway-provider-filter" value={providerFilter} onChange={(event) => setProviderFilter(event.target.value)} data-testid="select-pathway-provider"><option value="all">All providers</option>{candidateProviders.map((provider) => <option key={provider.name} value={provider.name}>{provider.name}</option>)}</select><ChevronDown size={15} /></div></div>
          <div className="pathway-field"><label htmlFor="pathway-access-filter">Access status</label><div className="pathway-select"><select id="pathway-access-filter" value={accessFilter} onChange={(event) => setAccessFilter(event.target.value as typeof accessFilter)} data-testid="select-pathway-access"><option value="all">Any access status</option><option value="free">Free</option><option value="varies">Varies</option><option value="not-stated">Not verified</option></select><ChevronDown size={15} /></div></div>
        </div>
        {(saved?.profile.interests.budget === 'Free only' || saved?.profile.interests.budget === 'Low-cost') && <div className="pathway-budget-note"><Info size={15} />Free resources are prioritised because your saved budget is {saved.profile.interests.budget}. Other access statuses remain available below.</div>}
        {visibleRecommendations.length ? <div className="pathway-resource-list">{visibleRecommendations.map((recommendation) => <ResourceCard key={recommendation.resource.id} recommendation={recommendation} />)}</div>
           : <div className="pathway-no-resources" role="status" data-testid="status-no-pathway-resources"><BookOpen size={20} /><div><strong>No resources match these filters</strong><p>Try another missing skill, provider, or access status. A catalogue search is not a verified course.</p><button type="button" onClick={() => { setSkillFilter('all'); setProviderFilter('all'); setAccessFilter('all'); }} data-testid="button-clear-pathway-filters">Clear resource filters</button></div></div>}
      </section>}
    </section>}

    <section className="pathway-providers">
      <div className="pathway-providers-heading"><div><div className="pathway-kicker">OFFICIAL STARTING POINTS</div><h2>Provider catalogues</h2><p>Eight provider links are included for further browsing. These links are not proof of a specific course match.</p></div><span>08 / PROVIDERS</span></div>
       <div className="pathway-provider-list">{candidateProviders.map((provider, index) => <article className="pathway-provider" key={provider.name} data-testid={`card-pathway-provider-${slug(provider.name)}`}><span className="pathway-provider-index">{String(index + 1).padStart(2, '0')}</span><div><h3>{provider.name}</h3><p>{provider.verification}</p><small>{provider.accessNote}</small></div><a href={provider.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${provider.name} official catalogue`} data-testid={`link-pathway-provider-${slug(provider.name)}`}><ExternalLink size={15} /></a></article>)}</div>
    </section>
    <footer className="pathway-footnote"><LockKeyhole size={15} /><p>Resource details are a checked snapshot, not a guarantee of current availability. Verify course requirements, access and any credential with the provider before enrolling.</p></footer>
  </main>;
}

function ResourceCard({ recommendation }: { recommendation: ResourceRecommendation }) {
  const resource: LearningResource = recommendation.resource;
  const catalogueOnly = resource.kind === 'provider-catalogue';
  return <article className={`pathway-resource-card ${catalogueOnly ? 'catalogue-only' : ''}`} data-testid={`card-learning-resource-${slug(resource.id)}`}>
    <div className="pathway-resource-top"><span className={`pathway-access access-${resource.access}`}>{accessLabels[resource.access]}</span><span className="pathway-resource-kind">{catalogueOnly ? 'Catalogue search · not a verified course' : 'Verified course / learning item'}</span></div>
  <div className="pathway-resource-main"><div><h4>{resource.title}</h4><p className="pathway-resource-provider">{resource.provider}</p><p className="pathway-resource-overview">{resource.overview}</p></div><a href={resource.url} target="_blank" rel="noopener noreferrer" className="pathway-resource-link" data-testid={`link-learning-resource-${slug(resource.id)}`}>Visit resource <ExternalLink size={14} /></a></div>
    <div className="pathway-resource-skills"><span>For missing skills</span>{recommendation.skills.map((skill) => <span className="pathway-skill-tag" key={skill.name}>{skill.name}{skill.type === 'related' ? ' · related' : skill.type === 'catalogue-search' ? ' · search only' : ''}</span>)}</div>
    {recommendation.skills.some((skill) => skill.note) && <p className="pathway-resource-note">{recommendation.skills.filter((skill) => skill.note).map((skill) => `${skill.name}: ${skill.note}`).join(' ')}</p>}
    <dl className="pathway-resource-facts"><div><dt>Duration</dt><dd>{resource.duration}</dd></div><div><dt>Credential</dt><dd>{resource.credential}</dd></div><div><dt>Access note</dt><dd>{resource.accessNote}</dd></div></dl>
     <div className="pathway-resource-verified">{resource.lastVerifiedOn ? `Information verified ${resource.lastVerifiedOn}` : 'Catalogue content not verified'} <span>·</span> <a href={resource.verificationSource} target="_blank" rel="noopener noreferrer" data-testid={`link-verification-source-${slug(resource.id)}`}>Verification source <ExternalLink size={11} /></a></div>
  </article>;
}
