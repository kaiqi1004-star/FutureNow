import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAnalyzeFutureReadySkillGap, useGetFutureReadyJobs } from '@workspace/api-client-react';
import type { SkillGapAnalysis } from '@workspace/api-client-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import {
  AlertCircle, ArrowDownRight, ArrowUpRight, Check, CheckCircle2, Circle,
  Clock3, ExternalLink, Info, LoaderCircle, RotateCcw, ShieldCheck,
} from 'lucide-react';
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/lib/i18n';

function parseSkills(value: string): string[] {
  return value.split(/[\n,;]+/).map((skill) => skill.trim()).filter(Boolean);
}

const createFormSchema = (t: (message: string) => string) => z.object({
  sector: z.enum(['software', 'mechanical']),
  jobId: z.string().min(1, t('Choose a listing to compare.')),
  skillsText: z.string().max(12000, t('Keep your skills list under 12,000 characters.')),
  experienceText: z.string().max(500, t('Keep your experience note under 500 characters.')),
}).superRefine(({ skillsText }, context) => {
  const skills = parseSkills(skillsText);
  if (skills.length > 100) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['skillsText'],
       message: t('Enter no more than 100 skill items.'),
    });
  }
  if (skills.some((skill) => skill.length > 120)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['skillsText'],
       message: t('Keep each skill name under 120 characters.'),
    });
  }
});

type FormValues = z.infer<ReturnType<typeof createFormSchema>>;

const completionKey = (jobId: string) => `futurenow-skill-gap-completed:${jobId}`;
const completionStepKey = (category: string, skill: string) => `${category}:${skill}`;
const money = (amount: number) => `RM ${new Intl.NumberFormat('en-MY').format(amount)}`;

function SkillChip({ children, kind = 'neutral' }: { children: string; kind?: 'matched' | 'missing' | 'neutral' }) {
  return <span className={`gap-skill-chip gap-skill-${kind}`}>{children}</span>;
}

function SkillGroup({ title, skills, kind, testId }: {
  title: string;
  skills: SkillGapAnalysis['matchedSkills'];
  kind: 'matched' | 'missing';
  testId: string;
}) {
  const { t } = useTranslation();
  return (
    <section className={`gap-skill-group gap-group-${kind}`} data-testid={testId}>
      <div className="gap-group-heading">
        <div><span className={`gap-group-mark ${kind}`} aria-hidden="true">{kind === 'matched' ? <Check size={13} /> : <ArrowDownRight size={14} />}</span><h3>{title}</h3></div>
        <span className="gap-group-count">{skills.length}</span>
      </div>
      {skills.length ? <ul className="gap-skill-list">{skills.map((item, index) => (
        <li key={`${item.category}-${item.skill}-${index}`} data-testid={`${kind}-skill-${index}`}>
          <SkillChip kind={kind}>{item.skill}</SkillChip>
          <span className="gap-skill-meta">{t(item.category === 'soft' ? 'Soft skill' : 'Technical')}{item.matchedBy ? ` · ${kind === 'matched' ? t('matched by “{skill}”', { skill: item.matchedBy }) : ''}` : ''}</span>
        </li>
      ))}</ul> : <p className="gap-group-empty">{t(kind === 'matched' ? 'No listed requirements matched your input yet.' : 'No listed skill gaps for this comparison.')}</p>}
    </section>
  );
}

function Roadmap({ analysis }: { analysis: SkillGapAnalysis }) {
  const { t } = useTranslation();
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const jobId = analysis.selectedJob.id;

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(completionKey(jobId));
      setCompleted(saved ? JSON.parse(saved) as Record<number, boolean> : {});
    } catch {
      setCompleted({});
    }
  }, [jobId]);

  const toggleStep = (key: string) => {
    setCompleted((current) => {
      const next = { ...current, [key]: !current[key] };
      try {
        window.localStorage.setItem(completionKey(jobId), JSON.stringify(next));
      } catch {
        // Progress remains usable in this view if local storage is unavailable.
      }
      return next;
    });
  };

  const doneCount = analysis.roadmap.filter((step) =>
    Boolean(completed[completionStepKey(step.category, step.skill)]),
  ).length;

  return (
    <section className="gap-roadmap panel" aria-labelledby="gap-roadmap-title" data-testid="roadmap-results">
      <div className="panel-heading">
         <div><div className="panel-kicker">{t('A PRACTICAL NEXT STEP')}</div><h2 id="gap-roadmap-title">{t('Your learning roadmap')}</h2></div>
         <div className="gap-progress-label" data-testid="roadmap-progress">{t('{count} marked complete', { count: doneCount })}</div>
      </div>
      {analysis.roadmapNote && <p className="gap-roadmap-note">{t(analysis.roadmapNote)}</p>}
      {analysis.estimateNote && <div className="gap-estimate-note"><Info size={15} /><p>{t(analysis.estimateNote)}</p></div>}
      {analysis.roadmap.length ? <ol className="gap-roadmap-list">
        {analysis.roadmap.map((step, index) => {
          const key = completionStepKey(step.category, step.skill);
          const isDone = Boolean(completed[key]);
          const resource = step.learningResource;
          return <li className={`gap-roadmap-step ${isDone ? 'is-complete' : ''}`} key={`${step.step}-${step.skill}`} data-testid={`roadmap-step-${step.step}`}>
            <div className="gap-step-marker"><span>{String(step.step).padStart(2, '0')}</span></div>
            <div className="gap-step-body">
              <div className="gap-step-topline">
                 <div><span className="gap-step-category">{t(step.category === 'soft' ? 'SOFT SKILL' : 'TECHNICAL')}</span><h3>{step.skill}</h3></div>
                 <div className="gap-step-hours" data-testid={`roadmap-estimate-${step.step}`}><Clock3 size={14} />{step.estimatedHoursMin}–{step.estimatedHoursMax} {t('hrs')}</div>
              </div>
              {resource ? <div className="gap-resource" data-testid={`roadmap-resource-${step.step}`}>
                 <div className="gap-resource-copy"><span className="gap-resource-kicker">{t('VERIFIED RESOURCE')} · {t(resource.resourceType.replaceAll('-', ' '))}</span><a href={resource.url} target="_blank" rel="noreferrer noopener" data-testid={`link-roadmap-resource-${step.step}`}>{resource.title}<ExternalLink size={13} /></a><span>{resource.provider}</span><span className="gap-cost-note" data-testid={`roadmap-cost-note-${step.step}`}>{resource.costNote}</span></div>
                 <span className={`gap-cost-status cost-${resource.costStatus}`} data-testid={`roadmap-cost-${step.step}`}>{t(resource.costStatus === 'not-stated' ? 'Cost not stated' : resource.costStatus === 'free' ? 'Free' : 'Paid')}</span>
               </div> : <p className="gap-no-resource" data-testid={`roadmap-no-resource-${step.step}`}>{t('No verified resource is linked for this item.')}</p>}
              <button type="button" className={`gap-complete-button ${isDone ? 'complete' : ''}`} onClick={() => toggleStep(key)} aria-pressed={isDone} data-testid={`button-complete-step-${step.step}`}>
                 {isDone ? <CheckCircle2 size={15} /> : <Circle size={15} />}{t(isDone ? 'Completed on this device' : 'Mark step complete')}
              </button>
            </div>
            {index < analysis.roadmap.length - 1 && <span className="gap-step-connector" aria-hidden="true" />}
          </li>;
        })}
       </ol> : <div className="gap-roadmap-empty" data-testid="empty-roadmap"><CheckCircle2 size={20} /><div><strong>{t(analysis.missingSkills.length === 0 ? 'No skill gaps in this comparison' : 'No roadmap steps returned')}</strong><p>{t(analysis.missingSkills.length === 0 ? 'Your entered skills matched every distinct skill requirement listed for this record.' : 'The comparison did not include learning steps for this listing.')}</p></div></div>}
       <p className="gap-local-note"><ShieldCheck size={14} /> {t('Completion marks stay on this device and are not sent to the API.')}</p>
    </section>
  );
}

export default function SkillGapPage() {
  const { t } = useTranslation();
  const formSchema = useMemo(() => createFormSchema(t), [t]);
  const jobsQuery = useGetFutureReadyJobs();
  const analyze = useAnalyzeFutureReadySkillGap();
  const [analysis, setAnalysis] = useState<SkillGapAnalysis | null>(null);
  const [analysisFingerprint, setAnalysisFingerprint] = useState<string | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { sector: 'software', jobId: '', skillsText: '', experienceText: '' },
  });
  const sector = form.watch('sector');
  const selectedJobId = form.watch('jobId');
  const skillsText = form.watch('skillsText');
  const experienceText = form.watch('experienceText');
  const jobs = jobsQuery.data ?? [];
  const sectorJobs = useMemo(() => jobs.filter((job) => job.sector === sector), [jobs, sector]);
  const selectedJob = sectorJobs.find((job) => job.id === selectedJobId);
  const currentFingerprint = JSON.stringify({
    sector,
    jobId: selectedJobId,
    skills: parseSkills(skillsText),
  });
  const displayedAnalysis =
    analysisFingerprint === currentFingerprint ? analysis : null;
  const exactFormula = displayedAnalysis
    ? displayedAnalysis.requiredCount === 0
      ? t(displayedAnalysis.coverageFormula)
      : `${displayedAnalysis.matchedCount} ÷ ${displayedAnalysis.requiredCount} × 100 = ${displayedAnalysis.coveragePercent === null ? t('not available') : `${displayedAnalysis.coveragePercent}%`}. ${t(displayedAnalysis.coverageFormula)}`
    : '';

  useEffect(() => {
    if (!selectedJobId || !sectorJobs.some((job) => job.id === selectedJobId)) {
      form.setValue('jobId', '');
      setAnalysis(null);
      setAnalysisFingerprint(null);
    }
  }, [sectorJobs, selectedJobId, form]);

  const chooseSector = (value: FormValues['sector']) => {
    form.setValue('sector', value, { shouldDirty: true });
    form.setValue('jobId', '', { shouldValidate: true });
    setAnalysis(null);
    setAnalysisFingerprint(null);
  };

  const submit = (values: FormValues) => {
    const currentSkills = parseSkills(values.skillsText);
    const submittedFingerprint = JSON.stringify({
      sector: values.sector,
      jobId: values.jobId,
      skills: currentSkills,
    });
    setAnalysis(null);
    setAnalysisFingerprint(null);
    analyze.mutate({
      data: { sector: values.sector, jobId: values.jobId, currentSkills },
    }, {
      onSuccess: (result) => {
        setAnalysis(result);
        setAnalysisFingerprint(submittedFingerprint);
      },
    });
  };

  const retryJobs = () => { void jobsQuery.refetch(); };
  const retryAnalysis = () => form.handleSubmit(submit)();

  return <div className="page-wrap skill-gap-page">
    <div className="page-heading">
      <div>
        <div className="eyebrow">{t('04 / LISTING-LEVEL SKILL COMPARISON')}</div>
        <h1>{t('Find your next skill to build.')}</h1>
        <p>{t('Compare what you know with the requirements in one supplied software or mechanical job listing. Use the result as a planning aid, not a prediction.')}</p>
        <div className="source-badges"><span><ShieldCheck size={13} /> {t('Evidence from the selected job record')}</span><span><Info size={13} /> {t('No hiring-probability score')}</span></div>
      </div>
    </div>

    <div className="gap-intro-strip" data-testid="skill-gap-explainer">
      <span className="gap-intro-icon"><Info size={17} /></span>
      <p><strong>{t('What this comparison means')}</strong> {t('— listed skills are compared with the selected record’s technical and soft-skill requirements. Coverage is not a probability of being hired. Experience and salary are shown as context only.')}</p>
      <span className="gap-intro-rule" />
    </div>

    <div className="gap-layout">
      <section className="gap-form-panel panel" aria-labelledby="gap-form-title">
        <div className="panel-heading"><div><div className="panel-kicker">{t('START WITH ONE ROLE')}</div><h2 id="gap-form-title">{t('Set up your comparison')}</h2></div><span className="gap-step-stamp">01—03</span></div>
        {jobsQuery.isError ? <div className="gap-api-error" role="alert" data-testid="error-job-listings"><AlertCircle size={18} /><div><strong>{t('Job listings could not be loaded')}</strong><p>{t('Try again to retrieve the supplied records. No sample listings are shown.')}</p><button type="button" onClick={retryJobs} data-testid="button-retry-jobs"><RotateCcw size={14} /> {t('Try again')}</button></div></div>
          : jobsQuery.isLoading || jobsQuery.isFetching ? <div className="gap-form-skeleton" role="status" aria-label={t('Loading supplied job listings')}><i /><i /><i /></div>
            : !jobs.length ? <div className="gap-no-jobs" data-testid="empty-job-listings"><AlertCircle size={18} /><div><strong>{t('No job listings available')}</strong><p>{t('The job records endpoint returned no listings.')}</p></div></div>
              : <>
                <Form {...form}>
                  <form className="gap-form" onSubmit={form.handleSubmit(submit)}>
                    <FormField control={form.control} name="sector" render={({ field }) => (
                      <FormItem>
                         <FormLabel>{t('Sector')}</FormLabel>
                         <div className="gap-sector-picker" role="group" aria-label={t('Choose a sector')}>
                           <button type="button" className={field.value === 'software' ? 'selected' : ''} aria-pressed={field.value === 'software'} onClick={() => chooseSector('software')} data-testid="button-sector-software"><span className="gap-sector-index">A</span><span><b>{t('Software')}</b><small>{t('Digital products & systems')}</small></span>{field.value === 'software' && <Check size={15} />}</button>
                           <button type="button" className={field.value === 'mechanical' ? 'selected' : ''} aria-pressed={field.value === 'mechanical'} onClick={() => chooseSector('mechanical')} data-testid="button-sector-mechanical"><span className="gap-sector-index">B</span><span><b>{t('Mechanical')}</b><small>{t('Engineering & manufacturing')}</small></span>{field.value === 'mechanical' && <Check size={15} />}</button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="jobId" render={({ field }) => (
                      <FormItem>
                         <FormLabel>{t('Job listing')}</FormLabel>
                        <FormControl>
                          <select {...field} className="gap-job-select" data-testid="select-skill-gap-job" disabled={!sectorJobs.length}>
                             <option value="">{t('Choose a supplied {sector} listing…', { sector: t(sector) })}</option>
                            {sectorJobs.map((job) => <option key={job.id} value={job.id}>{job.title} · {job.company}</option>)}
                          </select>
                        </FormControl>
                         <FormDescription>{t('Choose from the actual records in the supplied job sample.')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {selectedJob && <div className="gap-selected-role" data-testid="selected-role-summary">
                      <div className="gap-selected-heading"><span className={`sector-pill ${selectedJob.sector}`}>{selectedJob.sector}</span><span className="job-id">RECORD / {selectedJob.id}</span></div>
                      <strong>{selectedJob.title}</strong><span>{selectedJob.company} · {selectedJob.industry}</span>
                      <div className="gap-role-context">
                         <div><small>{t('LISTING EXPERIENCE')}</small><b>{selectedJob.experience || t('Not specified')}</b></div>
                         <div><small>{t('SALARY IN SOURCE')}</small><b>{selectedJob.salaryMonthlyRm !== null ? money(selectedJob.salaryMonthlyRm) : t('Undisclosed')}</b><em>{selectedJob.salaryMonthlyRm !== null ? t('Disclosed · monthly RM · context only') : t('Undisclosed in this record')}</em></div>
                      </div>
                    </div>}

                    <FormField control={form.control} name="skillsText" render={({ field }) => (
                      <FormItem>
                         <FormLabel>{t('Your current skills')}</FormLabel>
                         <FormControl><Textarea {...field} rows={5} className="gap-skills-input" placeholder={'Python\nTroubleshooting\nTeam communication'} data-testid="textarea-current-skills" /></FormControl>
                         <FormDescription>{t('One skill per line, or separate skills with commas. Leave blank if you want to start from zero.')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="experienceText" render={({ field }) => (
                      <FormItem>
                         <FormLabel>{t('Your experience')} <span className="gap-optional">({t('Optional')})</span></FormLabel>
                         <FormControl><Input {...field} placeholder={t('e.g. 1 year in a workshop, internship, or personal projects')} data-testid="input-current-experience" /></FormControl>
                         <FormDescription>{t('Shown beside the listing’s stated experience. It does not affect skill coverage.')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <button type="submit" className="gap-submit-button" disabled={analyze.isPending || !selectedJobId} data-testid="button-analyze-skills">
                       {analyze.isPending ? <><LoaderCircle size={16} className="gap-loading-icon" /> {t('Comparing listed skills…')}</> : <>{t('Compare my skills')} <ArrowUpRight size={16} /></>}
                    </button>
                     {analyze.isError && <div className="gap-mutation-error" role="alert" data-testid="error-skill-analysis"><AlertCircle size={16} /><span>{t('That comparison could not be completed. Check your connection and try again.')}</span><button type="button" onClick={retryAnalysis} data-testid="button-retry-analysis">{t('Retry')}</button></div>}
                  </form>
                </Form>
              </>}
         <p className="gap-form-footnote"><ShieldCheck size={14} /> {t('Only your entered skills are submitted for comparison. Experience notes stay in this form.')}</p>
      </section>

      <div className="gap-results-column">
        {!displayedAnalysis && !analyze.isPending && !analyze.isError && <section className="gap-results-placeholder panel" data-testid="empty-skill-analysis">
          <div className="gap-placeholder-art"><span /><span /><span /><ArrowDownRight size={23} /></div>
           <div className="panel-kicker">{t('YOUR COMPARISON WILL APPEAR HERE')}</div>
           <h2>{t('Start with the skills you already use.')}</h2>
           <p>{t('Choose a role and list the skills you have practised. Matching is against that record only; the result does not estimate your hiring chances.')}</p>
           <div className="gap-placeholder-rule"><i />{t('One job record')}<i /></div>
        </section>}
        {analyze.isPending && <section className="gap-results-loading panel" role="status" aria-label={t('Comparing skills')} data-testid="loading-skill-analysis">
          <div className="panel-kicker">{t('COMPARING THE SELECTED RECORD')}</div><h2>{t('Putting the requirements side by side')}</h2><div className="gap-result-skeleton"><i /><i /><i /><i /></div>
        </section>}
        {displayedAnalysis && <div className="gap-result-stack" data-testid="skill-gap-analysis">
          <section className={`gap-coverage-card ${displayedAnalysis.missingSkills.length === 0 ? 'gap-no-gap' : ''}`} data-testid="coverage-result">
            <div className="gap-coverage-top"><div><div className="panel-kicker">{t('LISTING SKILL COVERAGE')}</div><h2>{t(displayedAnalysis.missingSkills.length === 0 ? 'No listed gaps found.' : 'A clear place to focus.')}</h2></div><span className="gap-coverage-mark">{displayedAnalysis.missingSkills.length === 0 ? <CheckCircle2 size={19} /> : <ArrowDownRight size={19} />}</span></div>
            <div className="gap-coverage-value" data-testid="text-coverage-percent">{displayedAnalysis.coveragePercent === null ? '—' : `${displayedAnalysis.coveragePercent}%`}<span>{t('of listed requirements matched')}</span></div>
            <div className="gap-coverage-bar" aria-hidden="true"><span style={{ width: `${Math.min(100, Math.max(0, displayedAnalysis.coveragePercent ?? 0))}%` }} /></div>
            <div className="gap-formula" data-testid="text-coverage-formula"><span>{t('EXACT FORMULA')}</span><code>{exactFormula}</code></div>
            <p className="gap-probability-note"><Info size={14} /> {t('This is a skill-coverage calculation, not a probability of being hired. Experience and salary are excluded.')}</p>
          </section>

          <div className="gap-experience-compare" data-testid="experience-context">
            <div className="gap-experience-icon"><Clock3 size={16} /></div>
            <div><span>{t('EXPERIENCE · CONTEXT ONLY')}</span><p><b>{t('Listing:')}</b> {displayedAnalysis.selectedJob.experience || t('Not specified')} <i>·</i> <b>{t('You:')}</b> {experienceText.trim() || t('Not provided')}</p></div>
            <small>{t('Not in score')}</small>
          </div>

          <section className="gap-skill-results panel" aria-label={t('Matched and missing skills')}>
            <div className="panel-heading"><div><div className="panel-kicker">{t('REQUIREMENTS, SIDE BY SIDE')}</div><h2>{t('What matches & what’s next')}</h2></div><span className="gap-count-summary" data-testid="text-requirement-count">{displayedAnalysis.matchedCount} / {displayedAnalysis.requiredCount}</span></div>
            <div className="gap-skill-groups">
              <SkillGroup title={t('Matched skills')} skills={displayedAnalysis.matchedSkills} kind="matched" testId="matched-skills" />
              <SkillGroup title={t('Skills to build')} skills={displayedAnalysis.missingSkills} kind="missing" testId="missing-skills" />
            </div>
            <div className="gap-unmatched" data-testid="unmatched-input-skills">
              <div><span>{t('YOUR INPUT · NOT MATCHED')}</span><p>{t('Kept as entered so you can review wording or add context.')}</p></div>
              {displayedAnalysis.unmatchedInputSkills.length ? <div className="gap-unmatched-list">{displayedAnalysis.unmatchedInputSkills.map((skill, index) => <SkillChip key={`${skill}-${index}`}>{skill}</SkillChip>)}</div> : <p className="gap-unmatched-none">{t('All entered skills were matched, or no skills were entered.')}</p>}
            </div>
          </section>
          <Roadmap analysis={displayedAnalysis} />
        </div>}
      </div>
    </div>
    <div className="gap-page-disclaimer"><Info size={15} /><p><strong>{t('Read the record, not the market.')}</strong> {t('These are supplied listings, not a complete measure of Malaysian hiring demand. Source salary is displayed only when disclosed and is never part of the coverage calculation.')}</p></div>
  </div>;
}
