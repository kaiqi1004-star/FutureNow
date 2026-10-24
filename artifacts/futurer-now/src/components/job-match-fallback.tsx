import { useState } from 'react';
import { useGetFutureReadyJobs } from '@workspace/api-client-react';
import { fallbackListingOrder, isJobDataset } from '@/lib/job-fallback';
import { useTranslation } from '@/lib/i18n';

export function JobMatchFallback({ skills }: { skills: string[] }) {
  const { t } = useTranslation();
  const query = useGetFutureReadyJobs({ query: { retry: false, staleTime: 0 } });
  const [page, setPage] = useState(1);
  if (query.isPending) return <section className="rm-card" role="status">{t('Loading the supplied job records…')}</section>;
  if (!isJobDataset(query.data)) return <section className="rm-card" role="alert" data-testid="status-job-data-error">
    <h3>{t('Job data unavailable')}</h3>
    <p>{t('The supplied job dataset could not be loaded. No example jobs or scores are shown.')}</p>
    <button className="rm-btn" type="button" onClick={() => void query.refetch()} data-testid="button-retry-job-data">{t('Retry job loading')}</button>
  </section>;
  if (!query.data.length) return <section className="rm-card" data-testid="status-empty-job-data"><h3>{t('The supplied job dataset is empty')}</h3><p>{t('No source records are available. This is not a finding about your suitability.')}</p><button className="rm-btn" type="button" onClick={() => void query.refetch()}>{t('Retry job loading')}</button></section>;
  const jobs = fallbackListingOrder(query.data, skills);
  const safePage = Math.min(page, Math.ceil(jobs.length / 6));
  return <section className="rm-card" data-testid="section-job-fallback">
    {query.isError && <p role="status">{t('Using the last successfully loaded supplied records; refreshing them failed.')} <button className="rm-btn" type="button" onClick={() => void query.refetch()}>{t('Retry job loading')}</button></p>}
    <h2>{t('General supplied job listings')} ({jobs.length})</h2>
    <p>{t('Fallback listing order: exact saved skill names first, then record ID. This is not the personalised suitability calculation. No overall scores or fit labels are assigned.')}</p>
    <ol className="rm-list">{jobs.slice((safePage - 1) * 6, safePage * 6).map((job) => <li className="rm-result" key={job.id} data-testid={`fallback-job-${job.id}`}>
      <div className="rm-result-main">
        <h3>{job.title}</h3><p>{t('Company')}: {job.company || t('Not supplied')}</p>
        <p>{t('Source platform')}: {job.source || t('Not supplied')}</p>
        <p>{t('Salary (original)')}: {job.salaryText || (job.salaryMonthlyRm !== null ? `RM ${job.salaryMonthlyRm}` : t('Not supplied'))}</p>
        <details><summary>{t('Original job requirements')}</summary><p>{t('Experience')}: {job.experience || t('Not supplied')}</p><p>{t('Education')}: {job.education || t('Not supplied')}</p><p>{t('Technical skills')}: {job.technicalSkills.join(', ') || t('Not supplied')}</p><p>{t('Soft skills')}: {job.softSkills.join(', ') || t('Not supplied')}</p></details>
        {job.sourceUrl && <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer">{t('Source listing')}</a>}
      </div>
    </li>)}</ol>
    <div className="rm-pager"><span>{t('Showing')} {(safePage - 1) * 6 + 1}–{Math.min(safePage * 6, jobs.length)} / {jobs.length}</span><div>
      <button type="button" className="rm-btn" disabled={safePage === 1} onClick={() => setPage(safePage - 1)}>{t('Previous page')}</button>
      <button type="button" className="rm-btn" disabled={safePage * 6 >= jobs.length} onClick={() => setPage(safePage + 1)}>{t('Next page')}</button>
    </div></div>
  </section>;
}
