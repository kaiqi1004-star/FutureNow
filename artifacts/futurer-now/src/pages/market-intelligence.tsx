import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetFutureReadyLabourMarket,
  useRefreshFutureReadyLabourMarket,
  getGetFutureReadyLabourMarketQueryKey,
  useGetFutureReadyJobs,
} from '@workspace/api-client-react';
import {
  Activity, AlertCircle, ArrowDownRight, ArrowUpRight, BriefcaseBusiness, CalendarDays,
  Check, ChevronDown, Clock3, ExternalLink, Info, RefreshCw, ShieldCheck,
} from 'lucide-react';
import {
  CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  buildLabourMarketIndicators, buildLabourMarketInterpretation, buildSuppliedJobSnapshot, selectLabourMarketWindow,
} from '../lib/market-intelligence-model';
import { aiWorkResearch } from '../lib/ai-work-research';
import { languageLocales, useTranslation } from '@/lib/i18n';
import { brandLogoUrl } from '@/lib/brand';
import './market-intelligence.css';

type T = (messageId: string, values?: Record<string, string | number>) => string;
const makeFormat = (locale: string, t: T) => {
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const million = new Intl.NumberFormat(locale, { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  const formatDate = (value?: string | null) => {
    if (!value) return t('Not supplied');
    const date = new Date(value.length === 7 ? `${value}-01T00:00:00` : value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  };
  const formatFullDate = (value: string) => {
    const date = new Date(`${value.slice(0, 10)}T00:00:00`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  };
  // Catalogue dates are shown exactly as listed by the source.
  const formatCatalogueDate = (value?: string | null) => value || t('Not supplied');
  const formatTimestamp = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : `${date.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kuala_Lumpur' })} ${t('MYT')}`;
  };
  const shortMonth = (value: string) => {
    const date = new Date(`${value.slice(0, 7)}-01T00:00:00`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(locale, { month: 'short', year: '2-digit' });
  };
  const signed = (value: number, unit: string) => {
    const sign = value > 0 ? '+' : value < 0 ? '−' : '';
    if (unit === 'percentage points') return `${sign}${number.format(Math.abs(value))} ${t('percentage points')}`;
    return `${sign}${million.format(Math.abs(value) / 1000)} ${t('million people')}`;
  };
  return { number, million, formatDate, formatFullDate, formatCatalogueDate, formatTimestamp, shortMonth, signed };
};
function useFormat() {
  const { t, language } = useTranslation();
  return useMemo(() => makeFormat(languageLocales[language], t), [language, t]);
}
const chartTick = { fill: 'var(--mi-muted)', fontSize: 13, fontFamily: 'inherit' };

function Delta({ change, unit }: { change: number | null; unit: string }) {
  const { t } = useTranslation();
  const { signed } = useFormat();
  if (change === null) return <span className="mi-no-comparison">{t('Exact month unavailable')}</span>;
  const Icon = change < 0 ? ArrowDownRight : change > 0 ? ArrowUpRight : Activity;
  return <span className={`mi-delta ${change === 0 ? 'mi-flat' : change < 0 ? 'mi-down' : 'mi-up'}`}><Icon size={14} />{signed(change, unit)}</span>;
}

function MetricCard({ indicator }: { indicator: ReturnType<typeof buildLabourMarketIndicators>[number] }) {
  const { t } = useTranslation();
  const { number, million } = useFormat();
  const isPopulationCount = indicator.unit === 'thousand persons';
  return <article className={`mi-metric mi-metric-${indicator.key}`}>
    <div className="mi-metric-label">{t(indicator.label)}</div>
    <div className="mi-metric-value">{isPopulationCount ? million.format(indicator.value / 1000) : number.format(indicator.value)}<small>{isPopulationCount ? t('million people') : t('percent')}</small></div>
    <div className="mi-comparison-row"><span>{t('vs prior month')}</span><Delta change={indicator.monthOverMonth?.change ?? null} unit={isPopulationCount ? 'thousand persons' : 'percentage points'} /></div>
    <div className="mi-comparison-row"><span>{t('vs same month last year')}</span><Delta change={indicator.yearOverYear?.change ?? null} unit={isPopulationCount ? 'thousand persons' : 'percentage points'} /></div>
  </article>;
}

function ChartTip({ active, payload }: { active?: boolean; payload?: Array<{ name?: string; payload?: { date?: string; [key: string]: unknown }; value?: number }> }) {
  const { t } = useTranslation();
  const { million, formatDate } = useFormat();
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  return <div className="mi-tooltip">
    <strong>{row?.date ? formatDate(row.date) : ''}</strong>
    {payload.map((item) => <span key={item.name}>{t(item.name ?? '')}: {million.format(Number(item.value ?? 0))} {t('million people')}</span>)}
  </div>;
}

function LabourChart({ rows }: { rows: ReturnType<typeof selectLabourMarketWindow> }) {
  const { t } = useTranslation();
  const { number, shortMonth } = useFormat();
  const chartRows = rows.map(row => ({ ...row, date: row.date.slice(0, 7), lf: row.lf / 1000, lf_employed: row.lf_employed / 1000 }));
  const hasReferenceBreak = chartRows.some(row => row.date === '2021-01');
  return <div className="mi-chart" role="img" aria-label={t('Monthly labour force and employed-person counts in million people{break}', { break: hasReferenceBreak ? t(', with the Census 2020 population-reference break marked at January 2021') : '' })}>
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartRows} margin={{ top: 14, right: 18, left: 2, bottom: 4 }}>
        <CartesianGrid stroke="var(--mi-grid)" vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortMonth} tick={chartTick} axisLine={false} tickLine={false} minTickGap={35} />
        <YAxis tickFormatter={(v: number) => number.format(v)} tick={chartTick} axisLine={false} tickLine={false} width={64} />
        <Tooltip content={<ChartTip />} />
        {hasReferenceBreak && <ReferenceLine x="2021-01" stroke="var(--mi-coral)" strokeDasharray="4 4" label={{ value: t('Census 2020 reference'), position: 'insideTopRight', fill: 'var(--mi-coral)', fontSize: 12, fontFamily: 'inherit' }} />}
        <Line type="monotone" dataKey="lf" name={t('Labour force')} stroke="var(--mi-teal)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
        <Line type="monotone" dataKey="lf_employed" name={t('Employed')} stroke="var(--mi-gold)" strokeWidth={2.2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  </div>;
}

export default function MarketIntelligencePage() {
  const { t } = useTranslation();
  const { number, formatDate, formatFullDate, formatCatalogueDate, formatTimestamp, signed } = useFormat();
  const queryClient = useQueryClient();
  const labour = useGetFutureReadyLabourMarket({ query: { staleTime: 300000, refetchOnWindowFocus: false } });
  const refresh = useRefreshFutureReadyLabourMarket({
    mutation: {
      onSuccess(data) {
        queryClient.setQueryData(getGetFutureReadyLabourMarketQueryKey(), data);
      },
    },
  });
  const jobsQuery = useGetFutureReadyJobs();
  const [windowMonths, setWindowMonths] = useState<number | 'all'>(36);
  const observations = labour.data?.observations ?? [];
  const indicators = useMemo(() => buildLabourMarketIndicators(observations), [observations]);
  const interpretation = useMemo(() => buildLabourMarketInterpretation(observations), [observations]);
  const windowRows = useMemo(() => selectLabourMarketWindow(observations, windowMonths), [observations, windowMonths]);
  const snapshot = useMemo(() => jobsQuery.data ? buildSuppliedJobSnapshot(jobsQuery.data) : null, [jobsQuery.data]);
  const topTechnicalSkill = snapshot?.topTechnicalSkills[0];
  const topSoftSkill = snapshot?.topSoftSkills[0];
  const aiStudy = aiWorkResearch[0];
  const aiFinding = aiStudy?.findings.find((finding) => finding.denominator.toLocaleLowerCase().includes('among ai users'))
    ?? aiStudy?.findings[0];

  return <div className="page-wrap mi-page">
    <header className="mi-hero">
      <div className="mi-hero-copy">
        <div className="mi-kicker"><span className="mi-kicker-mark"><Activity size={15} /></span> {t('MARKET INTELLIGENCE')} <i> / </i> {t('MALAYSIA')}</div>
        <h1>{t("Understand Malaysia's changing world of work.")}</h1>
        <p>{t('Explore official labour-market statistics, skills mentioned in supplied job listings, and research on how AI is changing work.')}</p>
        <div className="mi-evidence-line"><span><i className="mi-dot official" /> {t('Official statistics')}</span><span><i className="mi-dot sample" /> {t('Supplied records')}</span><span><i className="mi-dot research" /> {t('Publisher research')}</span></div>
      </div>
      <div className="mi-hero-stamp" aria-label={t('Three evidence sources')}><div className="mi-stamp-ring"><ShieldCheck size={23} /><span>{t('THREE')}<br />{t('SOURCES')}</span></div><small>{t('Each answers a different question.')}</small></div>
      <div className="mi-hero-index">01—03<br /><span>{t('EVIDENCE TYPES')}</span></div>
    </header>

    <section className="mi-overview" aria-labelledby="overview-heading">
      <div className="mi-overview-title"><div><span>{t('At a glance')}</span><h2 id="overview-heading">{t('Key findings')}</h2></div></div>
      <div className="mi-overview-grid">
        <article className="mi-overview-card mi-overview-official" data-testid="mi-overview-market">
          <div className="mi-overview-label"><i className="mi-dot official" />{t("Malaysia's Job Market")}</div>
          {interpretation ? <>
            <strong className="mi-overview-value">{number.format(interpretation.unemploymentRate)}%</strong>
            <p>{t('Unemployment rate in {date}.', { date: formatDate(interpretation.latestDate) })}{' '}
              {interpretation.monthOverMonth
                ? interpretation.monthOverMonth.change === 0
                  ? t('No change from {date}.', { date: formatDate(interpretation.monthOverMonth.date) })
                  : t('{direction} {amount} percentage points from {date}.', {
                      direction: t(interpretation.monthOverMonth.change < 0 ? 'down' : 'up'),
                      amount: number.format(Math.abs(interpretation.monthOverMonth.change)),
                      date: formatDate(interpretation.monthOverMonth.date),
                    })
                : t('An exact month-to-month comparison is unavailable.')}</p>
            <small>{t('What this cannot tell us: the national rate does not identify demand for a particular occupation.')}</small>
          </> : <p role="status">{labour.isError ? t('Official labour data is unavailable.') : t('Loading latest official data…')}</p>}
          <a href="#market-data">{t('Explore monthly data and chart')}</a>
        </article>

        <article className="mi-overview-card mi-overview-records" data-testid="mi-overview-records">
          <div className="mi-overview-label"><i className="mi-dot sample" />{t('Skills in the Supplied Job Listings')}</div>
          {topTechnicalSkill && snapshot ? <>
            <strong className="mi-overview-value">{topTechnicalSkill.name}</strong>
            <p>{t('{skill} appeared in {count} of {total} supplied job records.', {
              skill: topTechnicalSkill.name,
              count: number.format(topTechnicalSkill.jobCount),
              total: number.format(snapshot.totalRecords),
            })}</p>
            {topSoftSkill && <small>{t('Also mentioned: {skill} in {count} of {total} records.', {
              skill: topSoftSkill.name,
              count: number.format(topSoftSkill.jobCount),
              total: number.format(snapshot.totalRecords),
            })}</small>}
            <small>{t('What this cannot tell us: this finite snapshot is not representative of all Malaysian vacancies and shows no change over time.')}</small>
          </> : <p role="status">{jobsQuery.isError ? t('Supplied job records are unavailable.') : t('Loading supplied job records…')}</p>}
          <a href="#supplied-records">{t('Explore the supplied records')}</a>
        </article>

        <article className="mi-overview-card mi-overview-research" data-testid="mi-overview-research">
          <div className="mi-overview-label"><i className="mi-dot research" />{t('AI and the Changing Workplace')}</div>
          {aiStudy && aiFinding ? <>
            <strong className="mi-overview-value">{aiFinding.value}</strong>
            <p>{t(aiFinding.statement)}</p>
            <small>{t(aiFinding.denominator)} {t('Published {date} by {publisher}.', {
              date: formatFullDate(aiStudy.publishedOn),
              publisher: aiStudy.publisher,
            })}</small>
            <small>{t('Study scope: {scope}', { scope: t(aiStudy.scope) })}</small>
            <small>{t('What this cannot tell us: these survey findings do not represent every Malaysian worker.')}</small>
          </> : <p>{t('No dated AI research is available.')}</p>}
          <a href="#ai-study">{t('View study findings and source')}</a>
        </article>
      </div>
    </section>

    <section id="market-data" className="mi-section mi-official" aria-labelledby="official-heading">
      <div className="mi-section-head">
        <div><div className="mi-section-overline"><span>01</span> {t('Official statistics')}</div><h2 id="official-heading">{t("Malaysia's Job Market")}</h2><p>{t('OpenDOSM labour-force statistics describe national conditions, not demand for a particular occupation.')}</p></div>
        <button type="button" className="mi-refresh" onClick={() => refresh.mutate()} disabled={refresh.isPending} aria-busy={refresh.isPending}>
          <RefreshCw size={15} className={refresh.isPending ? 'mi-spin' : ''} />{refresh.isPending ? t('Refreshing') : t('Refresh data')}
        </button>
      </div>
      {labour.isLoading && !labour.data && <div className="mi-skeleton-grid" role="status" aria-label={t('Loading labour market data')}>{Array.from({ length: 7 }, (_, i) => <div className="mi-skeleton" key={i}><i /><i /><i /></div>)}</div>}
      {labour.isError && !labour.data && <div className="mi-state mi-state-error" role="alert"><AlertCircle size={19} /><div><strong>{t('Official labour data is unavailable.')}</strong><p>{t('No substitute values are shown. Try loading the source again.')}</p></div><button type="button" onClick={() => void labour.refetch()}>{t('Try again')}</button></div>}
      {labour.data && <>
        {(labour.data.cacheState === 'stale' || labour.isError) && <div className="mi-notice mi-notice-stale" role="status"><Clock3 size={16} /><span><strong>{t('Showing cached data.')}</strong> {labour.data.refreshError || t('The latest refresh could not be confirmed.')}</span></div>}
        {refresh.isError && <div className="mi-notice mi-notice-error" role="alert"><AlertCircle size={16} /><span>{t('Refresh failed. The previously cached observations are preserved.')}</span></div>}
        {refresh.isSuccess && refresh.data?.retrievalMode === 'external-fetch' && <div className="mi-notice mi-notice-success" role="status"><Check size={16} /><span>{t('OpenDOSM source refresh succeeded. Values may be unchanged from the previous retrieval.')}</span></div>}
        {indicators.length > 0 ? <div className="mi-metrics">{indicators.map(indicator => <MetricCard key={indicator.key} indicator={indicator} />)}</div> : <div className="mi-empty">{t('The source returned no valid monthly observations.')}</div>}
        {interpretation && <section className="mi-interpretation" aria-labelledby="interpretation-heading">
           <div className="mi-interpretation-heading"><Info size={16} /><div><span>{t('Official data')}</span><h3 id="interpretation-heading">{t('What changed?')}</h3></div></div>
          <div className="mi-interpretation-grid">
            <div><small>{t('Recent change')}</small><p>{t('Unemployment rate was')} <b>{number.format(interpretation.unemploymentRate)}%</b> {t('in')} {formatDate(interpretation.latestDate)}.
                {interpretation.monthOverMonth ? <> {t('Compared with {date} ({rate}%), that is {change}.', { date: formatDate(interpretation.monthOverMonth.date), rate: number.format(interpretation.monthOverMonth.value), change: signed(interpretation.monthOverMonth.change, 'percentage points') })}</> : <> {t('An exact prior-month comparison is unavailable.')}</>}
                {interpretation.yearOverYear ? <> {t('The same month last year was {rate}% ({change} year over year).', { rate: number.format(interpretation.yearOverYear.value), change: signed(interpretation.yearOverYear.change, 'percentage points') })}</> : <> {t('The exact same month last year is unavailable.')}</>}</p></div>
             <div><small>{t('Compared with five years ago')}</small><p>{interpretation.fiveYearEndpoint
               ? <>{t('The rate was {startRate}% in {startDate} and {endRate}% in {endDate} ({change}). This compares two endpoints; it does not establish a continuous trend or explain a cause.', { startRate: number.format(interpretation.fiveYearEndpoint.value), startDate: formatDate(interpretation.fiveYearEndpoint.date), endRate: number.format(interpretation.unemploymentRate), endDate: formatDate(interpretation.latestDate), change: signed(interpretation.fiveYearEndpoint.change, 'percentage points') })}</>
              : <>{t('The exact same-month observation five years earlier is unavailable, so no five-year comparison is shown.')}</>}
              {interpretation.fiveYearComparisonCrossesCensusBreak && <> {t('This comparison crosses the Census population-reference break; interpret it cautiously.')}</>}</p></div>
          </div>
        </section>}
        {windowRows.length > 0 && <div className="mi-chart-panel">
             <div className="mi-chart-head"><div><h3>{t('Monthly labour force and employment')}</h3><p>{t('People, in millions')}</p></div>
             <label className="mi-window-select">{t('Time window')} <span className="mi-select-wrap"><select value={windowMonths} onChange={e => setWindowMonths(e.target.value === 'all' ? 'all' : Number(e.target.value))} aria-label={t('Select chart time window')}><option value={12}>12 {t('months')}</option><option value={36}>36 {t('months')}</option><option value={60}>60 {t('months')}</option><option value="all">{t('All available')}</option></select><ChevronDown size={14} /></span></label>
          </div>
           <div className="mi-legend"><span><i className="mi-line-key labour" /> {t('Labour force')}</span><span><i className="mi-line-key employed" /> {t('Employed')}</span></div>
          <LabourChart rows={windowRows} />
             <div className="mi-chart-notes"><span><Info size={14} /> {t('Census 2020 population-reference break at January 2021 is marked when it is in the selected window; comparisons across the break need care.')}</span><span>{t('The chart shows labour force and employed people. Available observations are shown as supplied; gaps are not filled.')}</span></div>
        </div>}
         <details className="mi-source-details" data-testid="details-official-source">
            <summary><span>{t('Data Sources & Update Details')}</span><ChevronDown size={15} /></summary>
          <div className="mi-data-meta">
            <span className="mi-live-label"><i /> {t('Latest Official Data')}</span>
            <span><CalendarDays size={14} /> {t('Latest observation')} <b>{formatDate(labour.data.latestObservationDate)}</b></span>
            <span>{t('Catalogue last updated')} <b>{formatCatalogueDate(labour.data.catalogueLastUpdated)}</b></span>
            <span>{t('Last successful CSV retrieval')} <b>{formatTimestamp(labour.data.retrievedAt)}</b></span>
            <span className={`mi-cache-chip ${labour.data.cacheState}`}>{t('API cache')}: {labour.data.cacheState === 'fresh' ? t('within 6 hours') : t('stale')}</span>
            <span className={`mi-fetch-chip ${labour.data.retrievalMode}`}>
              {t(labour.data.retrievalMode === 'external-fetch' ? 'External CSV fetch succeeded' : labour.data.retrievalMode === 'cache-hit' ? 'Cache hit · no CSV request' : 'Refresh failed · stale cache')}
            </span>
          </div>
          {labour.data.catalogueMetadataError && <div className="mi-notice mi-notice-stale" role="status"><Info size={16} /><span>{t('Catalogue update metadata could not be retrieved: {error}', { error: labour.data.catalogueMetadataError })}</span></div>}
          <div className="mi-detail-method"><Info size={15} /><p>{t('Counts in the source are reported in thousand persons. This page converts them to million people by dividing by 1,000. Rates are percentages; changes between rates are percentage points. Exact comparisons appear only when the matching months exist. Source fields are rounded independently, so totals and rate calculations may not reconcile exactly.')}</p></div>
          <div className="mi-source-grid">
             <div><small>{t('Source')}</small><strong>{labour.data.sourceName}</strong></div><div><small>{t('Dataset')}</small><strong>{labour.data.datasetName}</strong></div>
             <div><small>{t('Catalogue last updated (as listed)')}</small><strong>{formatCatalogueDate(labour.data.catalogueLastUpdated)}</strong></div><div><small>{t('Next catalogue update (as listed)')}</small><strong>{formatCatalogueDate(labour.data.catalogueNextUpdate)}</strong></div>
             <div><small>{t('Rows received / valid')}</small><strong>{number.format(labour.data.rowsReceived)} / {number.format(labour.data.rowsValid)}</strong></div><div><small>{t('Rejected rows')}</small><strong>{number.format(labour.data.rejectedRows)}</strong></div>
             <div className="mi-source-links"><a href={labour.data.catalogueUrl} target="_blank" rel="noreferrer">{t('Open catalogue')} <ExternalLink size={13} /></a><a href={labour.data.csvUrl} target="_blank" rel="noreferrer">{t('Open CSV')} <ExternalLink size={13} /></a></div>
             {!!labour.data.ignoredColumns.length && <div className="mi-ignored"><small>{t('Ignored columns')}</small><strong>{labour.data.ignoredColumns.join(', ')}</strong></div>}
          </div>
        </details>
      </>}
    </section>

    <section id="supplied-records" className="mi-section mi-records" aria-labelledby="records-heading">
       <div className="mi-section-head"><div><div className="mi-section-overline"><span>02</span> {t('Skills Mentioned in These {count} Job Records', { count: snapshot ? number.format(snapshot.totalRecords) : '…' })}</div><h2 id="records-heading">{t('Skills in the Supplied Job Listings')}</h2><p>{t('Finite snapshot from {count} supplied SDC job records, not a live vacancy feed.', { count: snapshot ? number.format(snapshot.totalRecords) : '…' })}</p></div><div className="mi-sample-count"><BriefcaseBusiness size={16} /><b>{snapshot ? number.format(snapshot.totalRecords) : '—'}</b><span>{t('records')}</span></div></div>
       {jobsQuery.isLoading && !jobsQuery.data && <div className="mi-skeleton mi-snapshot-skeleton" role="status" aria-label={t('Loading supplied job records')}><i /><i /><i /><i /></div>}
       {jobsQuery.isError && !jobsQuery.data && <div className="mi-state mi-state-error" role="alert"><AlertCircle size={19} /><div><strong>{t('Supplied job records are unavailable.')}</strong><p>{t('The workbook snapshot could not be loaded.')}</p></div><button type="button" onClick={() => void jobsQuery.refetch()}>{t('Try again')}</button></div>}
      {snapshot && <>
        <div className="mi-snapshot-overview">
           <div className="mi-snapshot-stat"><small>{t('Distinct job titles')}</small><strong>{number.format(snapshot.distinctTitles)}</strong><span>{t('within supplied records')}</span></div>
           <div className="mi-snapshot-stat mi-date-stat"><small>{t('Posting dates')}</small><strong>{number.format(snapshot.jobsWithPostingDates)} <i>/</i> {number.format(snapshot.totalRecords)}</strong><span>{t('{count} records have no posting date; listing freshness is unknown.', { count: number.format(snapshot.jobsWithoutPostingDates) })}</span></div>
            <div className="mi-category-block"><h3>{t('Records by title-based career category')}</h3><div className="mi-category-list">{snapshot.categories.map((category, index) => <div className="mi-category-row" key={category.key}><span className="mi-category-rank">0{index + 1}</span><span className="mi-category-name">{t(category.label)}</span><span className="mi-category-track"><i style={{ width: `${snapshot.totalRecords ? category.count / snapshot.totalRecords * 100 : 0}%` }} /></span><b>{number.format(category.count)}</b></div>)}</div></div>
        </div>
        <div className="mi-skills-grid">
          <SkillList title={t('Technical Skills Listed Most Often')} items={snapshot.topTechnicalSkills} total={snapshot.totalRecords} kind="technical" />
          <SkillList title={t('Soft Skills Mentioned Most Often')} items={snapshot.topSoftSkills} total={snapshot.totalRecords} kind="soft" />
          <SkillList title={t('Domain-Specific Skills Mentioned Most Often')} items={snapshot.topDomainSkills} total={snapshot.totalRecords} kind="domain" />
        </div>
         <details className="mi-source-details mi-job-details" data-testid="details-job-source">
           <summary><span>{t('Data Sources & Update Details')}</span><ChevronDown size={15} /></summary>
           <div className="mi-detail-method"><Info size={15} /><p>{t('Original source names, dataset names and skill wording are shown as published.')} {t('Skill counts show how many distinct supplied records mention each skill. Excel groups Excel and Microsoft Excel; Payroll is counted as domain-specific. Original job wording is unchanged. Career categories are app groupings based on job titles, not the source Industry field.')}</p></div>
           <div className="mi-job-source-link"><a href="/jobs">{t('Browse all job records')} <ExternalLink size={13} /></a></div>
         </details>
      </>}
    </section>

    <section id="ai-study" className="mi-section mi-research" aria-labelledby="research-heading">
       <div className="mi-section-head"><div><div className="mi-section-overline"><span>03</span> {t('What the AI Study Found')}</div><h2 id="research-heading">{t('AI and the Changing Workplace')}</h2><p>{t('A dated Microsoft study with a defined Malaysian knowledge-worker sample.')}</p></div><div className="mi-research-badge"><span /> {t('Publisher research')}</div></div>
      {aiWorkResearch.map(item => <article className="mi-research-card" key={item.id}>
          <div className="mi-research-top"><span className="mi-publisher">{item.publisher}</span><span><CalendarDays size={14} /> {formatFullDate(item.publishedOn)}</span></div>
         <h3 lang="en" title={t('Publication title (original)')}>{item.title}</h3>
          <div className="mi-study-scope"><div className="mi-scope-mark">{t('Study scope')}</div><p>{t(item.scope)}</p></div>
        <div className="mi-findings">
          {item.findings.map(finding => <div className="mi-finding" key={`${finding.value}-${finding.statement}`}>
             <strong>{t(finding.value)}</strong><p>{t(finding.statement)}</p><small>{t(finding.denominator)}</small>
          </div>)}
        </div>
         <div className="mi-research-caveat"><Info size={16} /><p>{t(item.caveat)}</p></div>
         <a className="mi-study-link" href={item.url} target="_blank" rel="noreferrer">{t('Read the publisher’s study')} <ExternalLink size={14} /></a>
      </article>)}
    </section>

    <footer className="mi-footer"><img className="mi-footer-logo" src={brandLogoUrl} alt={t('FutureNow logo')} /><p><strong>{t('Different evidence answers different questions.')}</strong><br />{t('Official indicators describe national labour-force conditions. Workbook records show what was listed in a finite sample. Research reports what its defined respondents said.')}</p><span>FUTURENOW <i>·</i> MALAYSIA</span></footer>
  </div>;
}

function SkillList({ title, items, total, kind }: { title: string; items: Array<{ name: string; jobCount: number }>; total: number; kind: 'technical' | 'soft' | 'domain' }) {
  const { t } = useTranslation();
  const { number } = useFormat();
  return <div className={`mi-skill-panel mi-skill-${kind}`}><div className="mi-skill-heading"><h3>{title}</h3><span>{t('TOP MENTIONS')}</span></div>
    {items.length ? <ol>{items.map((skill, i) => <li key={skill.name}><span className="mi-skill-number">{String(i + 1).padStart(2, '0')}</span><span className="mi-skill-name">{skill.name}</span><span className="mi-skill-meter"><i style={{ width: `${total ? skill.jobCount / total * 100 : 0}%` }} /></span><b>{number.format(skill.jobCount)}</b></li>)}</ol> : <div className="mi-empty">{t('No skill mentions are available in this snapshot.')}</div>}
  </div>;
}
