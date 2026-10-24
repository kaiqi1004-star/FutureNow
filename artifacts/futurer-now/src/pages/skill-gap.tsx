import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAnalyzeFutureReadySkillGap, useGetFutureReadyJobs } from '@workspace/api-client-react';
import type { JobListing, SkillGapAnalysis, SkillGapRoadmapStep } from '@workspace/api-client-react';
import { Activity, AlertCircle, ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, Clock3, ExternalLink, Info, LoaderCircle, RotateCcw, ShieldCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/lib/i18n';
import { loadProfile, PROFILE_KEY } from '@/lib/skills-profile';
import { matchingProfileInput } from '@/lib/matching-profile';
import { assessExperience } from '@/lib/experience-fit';
import { accessLabels, buildResourceRecommendations } from '@/lib/reskilling-resources';
import { defaultSkillAssessments, loadSkillGapPlan, saveSkillGapPlan, skillGapRequirementKey, type LearningProgress, type SkillAssessment, type SkillGapPlanState } from '@/lib/skill-gap-planner';

const parseSkills = (text: string) => [...new Set(text.split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean))];
type FormValues = { skillsText: string; yearsText: string };

function salaryContext(job: JobListing, undisclosed: string) {
  const raw = job.salaryText?.trim();
  if (raw) return /^undisclosed$/i.test(raw) ? undisclosed : /^rm/i.test(raw) ? raw.replace(/^rm\s*/i, 'RM ') : `RM ${raw}`;
  if (job.salaryMonthlyRm !== null) return `RM ${new Intl.NumberFormat('en-MY').format(job.salaryMonthlyRm)}`;
  return undisclosed;
}
function hasDisclosedSalary(job: JobListing) {
  const raw = job.salaryText?.trim();
  if (raw) return /\d/.test(raw) && !/(undisclosed|not disclosed|negotiable|competitive)/i.test(raw);
  return job.salaryMonthlyRm !== null;
}
function hasListedEducation(job: JobListing) {
  const value = job.education?.trim();
  return Boolean(value && !/^(?:n\/?a|not (?:specified|stated|available)|undisclosed|unknown|-)$/i.test(value));
}

function makeExercise(skill: string, category: string, t: (message: string, values?: Record<string, string | number>) => string) {
  return category === 'soft'
    ? t('Practise {skill} in a realistic team scenario: agree on a goal, explain your approach, invite feedback, and write down what changed.', { skill })
    : t('Build a small, portfolio-ready example using {skill}. Record the steps, one challenge, and how you tested or checked the result.', { skill });
}

function resourceFor(skill: string) {
  const matches = buildResourceRecommendations([skill]).flatMap((item) =>
    item.skills.filter((match) => match.name === skill).map((match) => ({ resource: item.resource, type: match.type, note: match.note })),
  );
  return matches.find((match) => match.type === 'direct') ?? matches.find((match) => match.type === 'catalogue-search') ?? null;
}

export default function SkillGapPage() {
  const { t } = useTranslation();
  const formSchema = useMemo(() => z.object({
    skillsText: z.string().max(12000, t('Keep the skills list under 12,000 characters.')),
    yearsText: z.string().refine((value) => value === '' || (Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 80), t('Enter a number from 0 to 80.')),
  }), [t]);
  const jobsQuery = useGetFutureReadyJobs();
  const analyze = useAnalyzeFutureReadySkillGap();
  const jobs = jobsQuery.data ?? [];
  const [sector, setSector] = useState<'software' | 'mechanical'>('software');
  const [jobId, setJobId] = useState('');
  const form = useForm<FormValues>({ resolver: zodResolver(formSchema), mode: 'onChange', defaultValues: { skillsText: '', yearsText: '' } });
  const skillsText = form.watch('skillsText');
  const yearsText = form.watch('yearsText');
  const years: number | '' = yearsText === '' ? '' : Number(yearsText);
  const [activeStep, setActiveStep] = useState(1);
  const [analysis, setAnalysis] = useState<SkillGapAnalysis | null>(null);
  const [resultFingerprint, setResultFingerprint] = useState('');
  const [roadmapBuilt, setRoadmapBuilt] = useState(false);
  const [planState, setPlanState] = useState<SkillGapPlanState>({ version: 2, assessments: {}, progress: {} });
  const [storageError, setStorageError] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileFeedbackValues, setProfileFeedbackValues] = useState<Record<string, string | number>>({});
  const selectedJob = jobs.find((job) => job.id === jobId);
  const sectorJobs = useMemo(() => jobs.filter((job) => job.sector === sector), [jobs, sector]);
  const currentSkills = useMemo(() => parseSkills(skillsText), [skillsText]);
  const inputIssue = skillsText.length > 12000
    ? t('Keep the skills list under 12,000 characters.')
    : currentSkills.length > 100
    ? t('Enter no more than 100 skill names (currently {count}).', { count: currentSkills.length })
    : currentSkills.some((skill) => skill.length > 120)
      ? t('Each skill name must be 120 characters or fewer.')
      : '';
  const fingerprint = JSON.stringify({ sector, jobId, currentSkills });
  const result = analysis && fingerprint === resultFingerprint ? analysis : null;
  const requirements = useMemo(() => result ? [...result.matchedSkills, ...result.missingSkills] : [], [result]);
  const baselineAssessments = useMemo(
    () => result ? defaultSkillAssessments(result.matchedSkills, result.missingSkills) : {},
    [result],
  );
  const practiceSkills = useMemo(() => requirements
    .filter((item) => planState.assessments[skillGapRequirementKey(item.category, item.skill)] === 'practice')
    .map((item) => item.skill), [requirements, planState.assessments]);

  useEffect(() => {
    if (!jobs.length) return;
    if (!jobs.some((job) => job.id === jobId && job.sector === sector)) {
      setJobId('');
      setAnalysis(null);
      setResultFingerprint('');
      setRoadmapBuilt(false);
    }
  }, [jobs, jobId, sector]);

  useEffect(() => {
    if (!jobId) return;
    const loaded = loadSkillGapPlan(jobId);
    setPlanState(loaded.state);
    setStorageError(loaded.error ?? '');
  }, [jobId]);

  useEffect(() => {
    const profile = loadProfile();
    const rawYears = profile.saved?.profile.basic.relevantYears;
    if (typeof rawYears === 'number') form.setValue('yearsText', String(rawYears));
    if (profile.error) setProfileError(profile.error);
  }, []);

  const updatePlan = (next: SkillGapPlanState) => {
    setPlanState(next);
    if (!storageError && jobId) setStorageError(saveSkillGapPlan(jobId, next) ?? '');
  };
  const setAssessment = (category: string, skill: string, value: SkillAssessment) => {
    const key = skillGapRequirementKey(category, skill);
    const assessments = { ...planState.assessments };
    if (value === 'practice') assessments[key] = value;
    else delete assessments[key];
    updatePlan({ ...planState, assessments });
  };
  const setProgress = (step: SkillGapRoadmapStep, value: LearningProgress) => {
    const key = skillGapRequirementKey(step.category, step.skill);
    updatePlan({ ...planState, progress: { ...planState.progress, [key]: value } });
  };

  const useProfile = () => {
    const loaded = loadProfile();
    setProfileError(loaded.error ?? '');
    setProfileFeedbackValues({});
    if (!loaded.saved) {
      if (!loaded.error) setProfileError('No saved skills profile was found on this device.');
      return;
    }
    const safeInput = matchingProfileInput(loaded.saved);
    const merged = [...currentSkills];
    const seen = new Set(merged.map((name) => name.toLocaleLowerCase('en')));
    for (const name of safeInput.currentSkills) {
      if (!seen.has(name.toLocaleLowerCase('en'))) {
        merged.push(name);
        seen.add(name.toLocaleLowerCase('en'));
      }
    }
    if (!safeInput.currentSkills.length) {
      setProfileError('No explicitly saved, comparable skills are available to copy from this profile.');
    } else {
      form.setValue('skillsText', merged.join('\n'));
      setProfileError('Merged {added} saved skill names; {total} skill names are now in your list.');
      setProfileFeedbackValues({ added: merged.length - currentSkills.length, total: merged.length });
    }
    const savedYears = loaded.saved.profile.basic.relevantYears;
    if (typeof savedYears === 'number') form.setValue('yearsText', String(savedYears));
  };

  const runAnalysis = (forRoadmap = false) => {
    if (!selectedJob) return;
    const sentSkills = parseSkills(skillsText);
    const sentPractice = forRoadmap ? [...new Set(practiceSkills)] : [];
    analyze.mutate({ data: { sector, jobId: selectedJob.id, currentSkills: sentSkills, ...(forRoadmap ? { practiceSkills: sentPractice } : {}) } }, {
      onSuccess: (response) => {
        setAnalysis(response);
        setResultFingerprint(JSON.stringify({ sector, jobId, currentSkills: sentSkills }));
        const loaded = loadSkillGapPlan(selectedJob.id);
        const explicitPractice = Object.fromEntries(
          Object.entries(loaded.state.assessments).filter(([, status]) => status === 'practice'),
        );
        const state = { ...loaded.state, assessments: explicitPractice };
        setPlanState(state);
        setStorageError(loaded.error ?? '');
        if (!loaded.error) setStorageError(saveSkillGapPlan(selectedJob.id, state) ?? '');
        setRoadmapBuilt(forRoadmap);
        setActiveStep(forRoadmap ? 4 : 3);
      },
    });
  };

  const chooseSector = (next: 'software' | 'mechanical') => {
    setSector(next);
    setJobId('');
    setAnalysis(null);
    setResultFingerprint('');
    setRoadmapBuilt(false);
  };
  const goToStep = (step: number) => {
    if (step === 3 && !result) return;
    if (step === 4 && (!result || !roadmapBuilt)) return;
    setActiveStep(step);
  };
  const experienceFit = selectedJob ? assessExperience(years, selectedJob.experience) : null;
  const experienceSummary = experienceFit ? ({
    not_provided: experienceFit.minimumYears == null
      ? t('Cannot compare: the listing does not provide one clear numeric experience threshold. Skill coverage is unchanged.')
      : t('Add your relevant years to compare experience separately. Skill coverage is unchanged.'),
    not_comparable: t('Cannot compare: the listing does not provide one clear numeric experience threshold. Skill coverage is unchanged.'),
    below_requirement: t('Your stated {years} years is below the listing threshold of {minimum} years. This is not an eligibility decision; skill coverage is unchanged.', { years, minimum: experienceFit.minimumYears ?? '' }),
    meets_numeric_minimum: t('Your stated {years} years meets the numeric threshold only; it does not verify relevance or eligibility.', { years }),
  }[experienceFit.status]) : '';
  const exactFormula = result?.requiredCount
    ? `${result.matchedCount} ÷ ${result.requiredCount} × 100 = ${result.coveragePercent === null ? t('not available') : `${result.coveragePercent}%`}`
    : result ? t('{matched} matched / {required} distinct listed requirements', { matched: result.matchedCount, required: result.requiredCount }) : '';

  const listedRoadmap = useMemo(() => {
    if (!result) return [];
    const wanted = new Map<string, { skill: string; category: string }>();
    for (const item of [...result.missingSkills, ...requirements.filter((req) => practiceSkills.includes(req.skill))]) {
      wanted.set(skillGapRequirementKey(item.category, item.skill), item);
    }
    const apiSteps = result.roadmap.filter((step) => wanted.has(skillGapRequirementKey(step.category, step.skill)));
    const included = new Set(apiSteps.map((step) => skillGapRequirementKey(step.category, step.skill)));
    const fallback = [...wanted.entries()].filter(([key]) => !included.has(key)).map(([key, item], index) => ({
      step: apiSteps.length + index + 1, skill: item.skill, category: item.category as SkillGapRoadmapStep['category'],
      estimatedHoursMin: 0, estimatedHoursMax: 0, learningResource: null,
    }));
    return [...apiSteps, ...fallback].map((step, index) => ({ ...step, step: index + 1 }));
  }, [result, requirements, practiceSkills]);
  const flowSteps = [t('Choose a career goal'), t('Assess skills'), t('Review gaps'), t('Build roadmap')];

  return <div className="page-wrap skill-gap-page gap-navigator">
    <header className="page-heading">
      <div><div className="eyebrow">{t('04 / FUTURENOW SKILL GAP NAVIGATOR')}</div><h1>{t('Make the next step visible.')}</h1>
        <p>{t('Compare the skills you have recorded with one supplied SDC listing, then shape a practical learning plan at your pace.')}</p>
      </div>
    </header>

    <div className="gap-disclaimer" data-testid="skill-gap-disclaimer"><Info size={16} /><p>{t('This comparison is based on one supplied listing and does not predict hiring.')}</p></div>

    <nav className="gap-flow" aria-label={t('Skill gap planning steps')} data-testid="navigator-progress">
      {flowSteps.map((label, index) => {
        const number = index + 1;
        const complete = number < activeStep || (number === 3 && Boolean(result)) || (number === 4 && roadmapBuilt);
        return <button type="button" key={label} className={`gap-flow-step ${activeStep === number ? 'active' : ''} ${complete ? 'complete' : ''}`}
          aria-current={activeStep === number ? 'step' : undefined} onClick={() => goToStep(number)} data-testid={`button-flow-step-${number}`}>
          <span>{complete ? <Check size={14} /> : `0${number}`}</span><b>{label}</b>
        </button>;
      })}
      <div className="gap-flow-track"><span style={{ width: `${((activeStep - 1) / 3) * 100}%` }} /></div>
    </nav>

    <div className="gap-wizard-layout">
      <main className="gap-wizard-main">
        {jobsQuery.isLoading ? <section className="gap-wizard-card panel" role="status" aria-label={t('Loading supplied job listings')} data-testid="loading-job-listings"><i className="gap-skeleton" /><i className="gap-skeleton" /><i className="gap-skeleton short" /></section>
          : jobsQuery.isError ? <section className="gap-state panel" role="alert" data-testid="error-job-listings"><AlertCircle /><div><strong>{t('Job records could not be loaded')}</strong><p>{t('No sample roles are substituted.')}</p><button type="button" onClick={() => void jobsQuery.refetch()} data-testid="button-retry-jobs"><RotateCcw size={14} /> {t('Try again')}</button></div></section>
            : !jobs.length ? <section className="gap-state panel" data-testid="empty-job-listings"><AlertCircle /><div><strong>{t('No supplied listings are available')}</strong><p>{t('Try again later when job records are available.')}</p></div></section>
              : <>
                {activeStep === 1 && <section className="gap-wizard-card panel" aria-labelledby="goal-title" data-testid="step-choose-goal">
                  <div className="gap-step-overline"><span>{t('STEP 01')}</span><span>{t('One role at a time')}</span></div><h2 id="goal-title">{t('Choose a career goal')}</h2><p className="gap-step-intro">{t('Start with a real record from the supplied job sample.')}</p>
                  <label className="gap-field-label">{t('Career area')}</label>
                  <div className="gap-sector-picker" role="group" aria-label={t('Choose career area')}>
                    {(['software', 'mechanical'] as const).map((value) => <button type="button" key={value} className={sector === value ? 'selected' : ''} aria-pressed={sector === value} onClick={() => chooseSector(value)} data-testid={`button-sector-${value}`}><span className="gap-sector-symbol">{value === 'software' ? 'S' : 'M'}</span><span><b>{t(value)}</b><small>{t(value === 'software' ? 'Digital products & systems' : 'Engineering & manufacturing')}</small></span>{sector === value && <Check size={16} />}</button>)}
                  </div>
                  <label className="gap-field-label" htmlFor="skill-job-select">{t('Supplied job listing')}</label>
                  <select id="skill-job-select" className="gap-select" value={jobId} onChange={(event) => { setJobId(event.target.value); setAnalysis(null); setResultFingerprint(''); setRoadmapBuilt(false); }} data-testid="select-skill-gap-job">
                    <option value="">{t('Choose a {sector} listing…', { sector: t(sector === 'software' ? 'Software' : 'Mechanical') })}</option>
                    {sectorJobs.map((job) => <option key={job.id} value={job.id}>{job.title} — {job.company} · {t('Record')} {job.id}</option>)}
                  </select>
                  {selectedJob && <article className="gap-role-card" data-testid="selected-role-summary">
                    <div className="gap-role-top"><span>{t(selectedJob.sector === 'software' ? 'Software' : 'Mechanical')}</span><code>{t('RECORD / {id}', { id: selectedJob.id })}</code></div><h3>{selectedJob.title}</h3><p>{selectedJob.company} · {selectedJob.industry}</p>
                    <div className="gap-context-grid">
                      <div><small>{t('LISTED EXPERIENCE')}</small><b>{selectedJob.experience || t('Not stated')}</b></div>
                      {hasListedEducation(selectedJob) && <div><small>{t('EDUCATION')}</small><b>{selectedJob.education}</b></div>}
                      {hasDisclosedSalary(selectedJob) && <div><small>{t('SALARY · CONTEXT ONLY')}</small><b>{salaryContext(selectedJob, t('Not disclosed'))}</b></div>}
                    </div>
                    {(selectedJob.source || selectedJob.sourceUrl) && <div className="gap-source-row"><span>{selectedJob.source || t('Supplied listing source')}</span>{selectedJob.sourceUrl && <a href={selectedJob.sourceUrl} target="_blank" rel="noreferrer noopener" data-testid="link-selected-job-source">{t('Open listing')} <ExternalLink size={13} /></a>}</div>}
                  </article>}
                  <div className="gap-step-actions"><button className="gap-primary-action" type="button" disabled={!selectedJob} onClick={() => setActiveStep(2)} data-testid="button-next-assess">{t('Continue to skills')} <ArrowRight size={16} /></button></div>
                </section>}

                {activeStep === 2 && <section className="gap-wizard-card panel" aria-labelledby="assess-title" data-testid="step-assess-skills">
                  <div className="gap-step-overline"><span>{t('STEP 02')}</span><span>{selectedJob?.title ?? t('Selected listing')}</span></div><h2 id="assess-title">{t('Assess your skills')}</h2>
                  <p className="gap-step-intro">{t('Add skills you have used or practised. Anything not listed in your profile stays unrecorded—not assumed missing.')}</p>
                  <Form {...form}><form className="gap-data-form" onSubmit={(event) => event.preventDefault()}>
                    <FormField control={form.control} name="skillsText" render={({ field }) => <FormItem>
                      <FormLabel className="gap-field-label" htmlFor="current-skills">{t('Skills you have practised')}</FormLabel>
                      <FormControl><Textarea {...field} id="current-skills" rows={6} placeholder={t('e.g. Python, SQL; troubleshooting')} className="gap-textarea" data-testid="textarea-current-skills" /></FormControl>
                      <div className="gap-input-hint">{t('Separate skill names with commas, semicolons, or line breaks.')}</div><FormMessage />
                    </FormItem>} />
                    {inputIssue && <p className="gap-storage-alert" role="alert" data-testid="status-skill-input-validation">{inputIssue}</p>}
                    <button className="gap-profile-button" type="button" onClick={useProfile} data-profile-key={PROFILE_KEY} data-testid="button-use-my-profile"><ShieldCheck size={15} /> {t('Use my profile')}</button>
                  {profileError && <p className="gap-storage-alert" role="status" data-testid="status-profile-read">{t(profileError, profileFeedbackValues)}</p>}
                  <p className="gap-self-report-note"><Info size={14} /> {t('Saved profile skills are self-reported, not verified. Your profile is not changed.')}</p>
                    <div className="gap-years-field"><FormField control={form.control} name="yearsText" render={({ field }) => <FormItem>
                      <FormLabel className="gap-field-label" htmlFor="relevant-years">{t('Relevant experience years')} <span>({t('optional')})</span></FormLabel>
                      <FormControl><Input {...field} id="relevant-years" type="number" min="0" max="80" step="0.5" data-testid="input-relevant-years" /></FormControl><FormMessage />
                    </FormItem>} /><p>{t('Used only for a separate conservative context check; it never changes skill coverage.')}</p></div>
                  </form></Form>
                  <div className="gap-step-actions"><button className="gap-back-action" type="button" onClick={() => setActiveStep(1)} data-testid="button-back-goal"><ArrowLeft size={15} /> {t('Back')}</button><button className="gap-primary-action" type="button" disabled={!selectedJob || analyze.isPending || Boolean(inputIssue) || Boolean(form.formState.errors.yearsText)} onClick={() => runAnalysis()} data-testid="button-analyze-skills">{analyze.isPending ? <><LoaderCircle className="gap-spinner" size={16} /> {t('Comparing…')}</> : <>{t('Compare listed skills')} <ArrowRight size={16} /></>}</button></div>
                  {analyze.isError && <div className="gap-inline-error" role="alert" data-testid="error-skill-analysis"><AlertCircle size={15} /> {t('Comparison did not complete.')} <button type="button" onClick={() => runAnalysis()} data-testid="button-retry-analysis">{t('Retry')}</button></div>}
                </section>}

                {activeStep === 3 && result && <section className="gap-wizard-card panel" aria-labelledby="review-title" data-testid="step-review-gaps">
                  <div className="gap-step-overline"><span>{t('STEP 03')}</span><span>{t('Coverage is not a score of you')}</span></div><h2 id="review-title">{t('Review the listed requirements')}</h2>
                  <div className="gap-result-hero" data-testid="coverage-result"><div><small>{t('LISTING SKILL COVERAGE')}</small><strong data-testid="text-coverage-percent">{result.coveragePercent === null ? '—' : `${result.coveragePercent}%`}</strong><span>{t('{matched} matched · {other} not matched', { matched: result.matchedCount, other: Math.max(0, result.requiredCount - result.matchedCount) })}</span></div><div className="gap-coverage-ring" aria-hidden="true"><span>{result.coveragePercent === null ? '—' : `${result.coveragePercent}%`}</span></div></div>
                  <div className="gap-coverage-formula" data-testid="text-coverage-formula"><span>{t('EXACT MATCH FORMULA')}</span><code>{exactFormula}</code></div>
                  <div className="gap-count-line" data-testid="text-requirement-count"><span>{t('Distinct requirements')}</span><b>{t('{matched} matched / {required} total', { matched: result.matchedCount, required: result.requiredCount })}</b></div>
                  <p className="gap-coverage-note"><Info size={14} /> {t('Only listed technical and soft skills are counted. Aliases follow the supplied comparison; education, experience, and salary are context only.')}</p>

                  <div className="gap-experience-card" data-testid="experience-context"><div className="gap-context-icon"><Clock3 size={16} /></div><div><small>{t('EXPERIENCE · SEPARATE CONTEXT')}</small><p><b>{t('Listing:')}</b> {result.selectedJob.experience || t('Not stated')} <span>·</span> <b>{t('Your stated years:')}</b> {years === '' ? t('Not provided') : t('{years} years', { years })}</p>{experienceFit && <p className="gap-experience-message">{experienceSummary}</p>}</div></div>

                  <section className="gap-assessment-groups" aria-label={t('Self-assessed requirement groups')}>
                    {(['in-profile', 'practice', 'unrecorded'] as const).map((status) => {
                       const items = requirements.filter((item) => (planState.assessments[skillGapRequirementKey(item.category, item.skill)] ?? baselineAssessments[skillGapRequirementKey(item.category, item.skill)] ?? 'unrecorded') === status);
                      return <div className={`gap-assessment-group group-${status}`} key={status} data-testid={`assessment-group-${status}`}>
                         <div className="gap-assessment-heading"><span className="gap-assessment-dot" /><h3>{t(status === 'in-profile' ? 'In your skill list' : status === 'practice' ? 'Selected to practise' : 'Not yet recorded')}</h3><b>{items.length}</b></div>
                        {items.length ? <ul>{items.map((item) => {
                          const key = skillGapRequirementKey(item.category, item.skill);
                          return <li key={key} data-testid={`requirement-${item.category}-${item.skill.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
                            <div className="gap-requirement-copy"><strong>{item.skill}</strong><span>{t(item.category === 'soft' ? 'Soft skill requirement' : 'Technical requirement')}</span>{item.matchedBy && <small>{t('Matched by “{skill}”', { skill: item.matchedBy })}</small>}</div>
                             <button type="button" className="gap-practice-toggle" onClick={() => setAssessment(item.category, item.skill, status === 'practice' ? (baselineAssessments[key] ?? 'unrecorded') : 'practice')} data-testid={`button-practice-${item.category}-${item.skill.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>{t(status === 'practice' ? 'Undo practice' : 'Practise this')}</button>
                          </li>;
                        })}</ul> : <p className="gap-empty-group">{t(status === 'in-profile' ? 'No listed requirements were found in your skill list.' : status === 'practice' ? 'Choose any listed requirement to add it to your practice plan.' : 'No other requirements remain unrecorded.')}</p>}
                      </div>;
                    })}
                  </section>
                  <details className="gap-evidence-details" data-testid="listing-evidence"><summary><BookOpen size={15} /> {t('Listing and source evidence')}</summary>
                     <div className="gap-evidence-body"><p><b>{result.selectedJob.title}</b> · {result.selectedJob.company} · {t('Record')} {result.selectedJob.id}</p><p><b>{t('Technical skills:')}</b> {result.selectedJob.technicalSkills.length ? result.selectedJob.technicalSkills.join(' · ') : t('None listed in this record')}</p><p><b>{t('Soft skills:')}</b> {result.selectedJob.softSkills.length ? result.selectedJob.softSkills.join(' · ') : t('None listed in this record')}</p>{hasListedEducation(result.selectedJob) && <p><b>{t('Education:')}</b> {result.selectedJob.education}</p>}<p><b>{t('Experience:')}</b> {result.selectedJob.experience || t('Not stated')}{hasDisclosedSalary(result.selectedJob) && <> · <b>{t('Salary · context only:')}</b> {salaryContext(result.selectedJob, t('Not disclosed'))}</>}</p><p><b>{t('Source:')}</b> {result.selectedJob.source || t('Not specified')} {result.selectedJob.sourceUrl && <a href={result.selectedJob.sourceUrl} target="_blank" rel="noreferrer noopener" data-testid="link-evidence-source">{t('View supplied source')} <ExternalLink size={13} /></a>}</p><p><b>{t('Input skills not matched:')}</b> {result.unmatchedInputSkills.length ? result.unmatchedInputSkills.join(' · ') : t('None')}</p><p className="gap-unmatched-note">{t('Unmatched input skills are not counted as listed requirements and do not change coverage.')}</p></div>
                  </details>
                  <div className="gap-step-actions"><button className="gap-back-action" type="button" onClick={() => setActiveStep(2)} data-testid="button-back-assess"><ArrowLeft size={15} /> {t('Back to skills')}</button><button className="gap-primary-action" type="button" disabled={analyze.isPending} onClick={() => runAnalysis(true)} data-testid="button-build-roadmap">{analyze.isPending ? <><LoaderCircle className="gap-spinner" size={16} /> {t('Preparing…')}</> : <>{t('Build learning roadmap')} <ArrowRight size={16} /></>}</button></div>
                  {analyze.isError && <div className="gap-inline-error" role="alert">{t('Roadmap could not be prepared.')} <button type="button" onClick={() => runAnalysis(true)} data-testid="button-retry-roadmap">{t('Retry')}</button></div>}
                  {storageError && <p className="gap-storage-alert" role="status" data-testid="status-plan-storage">{t(storageError)}</p>}
                </section>}

                {activeStep === 4 && result && roadmapBuilt && <section className="gap-wizard-card panel" aria-labelledby="roadmap-title" data-testid="step-build-roadmap">
                  <div className="gap-step-overline"><span>{t('STEP 04')}</span><span>{t('Suggested sequence, not a ranking')}</span></div><h2 id="roadmap-title">{t('Build at your own pace')}</h2>
                  <p className="gap-step-intro">{t('Ordering is a system suggestion based on known prerequisites and source order—not employer priority. Any time shown is an estimate.')}</p>
                  {listedRoadmap.length ? <ol className="gap-roadmap-list" data-testid="roadmap-results">{listedRoadmap.map((step, index) => {
                    const key = skillGapRequirementKey(step.category, step.skill);
                    const recommendation = resourceFor(step.skill);
                    const resource = recommendation?.resource;
                    const type = recommendation?.type;
                    const progress = planState.progress[key] ?? 'not-started';
                    return <li key={key} className="gap-roadmap-task" data-testid={`roadmap-step-${index + 1}`}>
                      <div className="gap-task-number">{String(index + 1).padStart(2, '0')}</div><div className="gap-task-content">
                        <div className="gap-task-head"><div><small>{t(step.category === 'soft' ? 'SOFT SKILL' : 'TECHNICAL SKILL')}</small><h3>{step.skill}</h3></div>{step.estimatedHoursMax > 0 && <span className="gap-effort-estimate"><Clock3 size={13} /> {t('Estimate: {min}–{max} hrs', { min: step.estimatedHoursMin, max: step.estimatedHoursMax })}</span>}</div>
                        <p className="gap-why"><b>{t('Why it appears:')}</b> {t('The selected listing names “{skill}” as a requirement.', { skill: step.skill })}</p>
                        <div className="gap-exercise"><b>{t('Try this:')}</b><p>{makeExercise(step.skill, step.category, t)}</p></div>
                        {resource ? <div className={`gap-resource-card ${type === 'catalogue-search' ? 'catalogue' : ''}`} data-testid={`roadmap-resource-${index + 1}`}>
                          <div><small>{t(type === 'catalogue-search' ? 'PROVIDER-CATALOGUE SEARCH' : type === 'direct' ? 'DIRECT SKILL MATCH' : 'RELATED RESOURCE')}</small><a href={resource.url} target="_blank" rel="noreferrer noopener" data-testid={`link-roadmap-resource-${index + 1}`}>{resource.title} <ExternalLink size={13} /></a><span>{resource.provider} · {resource.duration} · {t(accessLabels[resource.access])}</span><p>{resource.overview}</p><p>{resource.accessNote}</p>{resource.credential && <p>{resource.credential}</p>}{resource.lastVerifiedOn && <small>{t('Verified {date}', { date: resource.lastVerifiedOn })} · <a href={resource.verificationSource} target="_blank" rel="noreferrer noopener">{t('verification source')}</a></small>}{!resource.lastVerifiedOn && <small>{t('Verification date not available')}</small>}{recommendation?.note && <p>{recommendation.note}</p>}</div>
                        </div> : <p className="gap-no-resource" data-testid={`roadmap-no-resource-${index + 1}`}>{t('No suitable provider resource matched this listed skill. Use the practice exercise above.')}</p>}
                        <label className="gap-progress-label" htmlFor={`progress-${index}`}><span>{t('Progress · saved on this device')}</span><select id={`progress-${index}`} value={progress} onChange={(event) => setProgress(step, event.target.value as LearningProgress)} data-testid={`select-roadmap-progress-${index + 1}`}><option value="not-started">{t('Not started')}</option><option value="in-progress">{t('In progress')}</option><option value="completed">{t('Completed')}</option></select></label>
                      </div>
                    </li>;
                  })}</ol> : <div className="gap-empty-roadmap" data-testid="empty-roadmap"><CheckCircle2 size={21} /><div><b>{t('No practice tasks selected')}</b><p>{t('There are no unmatched requirements or practice-selected skills for this listing.')}</p><button type="button" onClick={() => setActiveStep(3)} data-testid="button-return-review">{t('Review requirements')}</button></div></div>}
                  {storageError && <p className="gap-storage-alert" role="status" data-testid="status-plan-storage">{t(storageError)}</p>}
                  {analyze.isError && <div className="gap-inline-error" role="alert" data-testid="error-roadmap-refresh">{t('Roadmap refresh did not complete. Your current plan remains available.')}</div>}
                  <p className="gap-local-note"><ShieldCheck size={14} /> {t('Assessments and progress are stored locally on this device. They are not sent with your comparison.')}</p>
                  <div className="gap-step-actions"><button className="gap-back-action" type="button" onClick={() => setActiveStep(3)} data-testid="button-back-review"><ArrowLeft size={15} /> {t('Review gaps')}</button><button className="gap-outline-action" type="button" onClick={() => runAnalysis(true)} disabled={analyze.isPending} data-testid="button-refresh-roadmap"><RotateCcw size={14} /> {t('Refresh roadmap')}</button></div>
                </section>}
                {analyze.isPending && activeStep === 3 && !result && <section className="gap-wizard-card panel" role="status" aria-label={t('Comparing skills')} data-testid="loading-skill-analysis"><i className="gap-skeleton" /><i className="gap-skeleton" /><i className="gap-skeleton short" /></section>}
                {!result && activeStep > 2 && !analyze.isPending && <section className="gap-wizard-card panel gap-result-empty" data-testid="empty-skill-analysis"><Activity size={24} /><h2>{t('Your comparison will appear here')}</h2><p>{t('Enter skills and compare them with the selected supplied listing.')}</p><button className="gap-primary-action" type="button" onClick={() => setActiveStep(2)} data-testid="button-return-to-assess">{t('Return to skill assessment')}</button></section>}
              </>}
      </main>

      <aside className="gap-side-rail">
        <section className="gap-side-card" data-testid="selected-goal-context"><div className="gap-side-kicker">{t('YOUR CAREER GOAL')}</div>{selectedJob ? <><b>{selectedJob.title}</b><span>{selectedJob.company} · {t('Record')} {selectedJob.id}</span></> : <p>{t('Choose one supplied listing to begin.')}</p>}</section>
      </aside>
    </div>
  </div>;
}
