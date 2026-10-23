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
import './market-intelligence.css';

const number = new Intl.NumberFormat('en-MY', { maximumFractionDigits: 1 });
const formatDate = (value?: string | null) => {
  if (!value) return 'Not supplied';
  const date = new Date(value.length === 7 ? `${value}-01T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-MY', { month: 'long', year: 'numeric' });
};
const formatFullDate = (value: string) => {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' });
};
const formatCatalogueDate = (value?: string | null) => value || 'Not supplied';
const formatTimestamp = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : `${date.toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kuala_Lumpur' })} MYT`;
};
const shortMonth = (value: string) => {
  const date = new Date(`${value.slice(0, 7)}-01T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-MY', { month: 'short', year: '2-digit' });
};
const signed = (value: number, unit: string) => `${value > 0 ? '+' : ''}${number.format(value)}${unit === 'percentage points' ? ' pp' : ''}`;

function Delta({ change, unit }: { change: number | null; unit: string }) {
  if (change === null) return <span className="mi-no-comparison">Exact month unavailable</span>;
  const Icon = change < 0 ? ArrowDownRight : ArrowUpRight;
  return <span className={`mi-delta ${change === 0 ? 'mi-flat' : change < 0 ? 'mi-down' : 'mi-up'}`}><Icon size={14} />{signed(change, unit)}</span>;
}

function MetricCard({ indicator }: { indicator: ReturnType<typeof buildLabourMarketIndicators>[number] }) {
  return <article className={`mi-metric mi-metric-${indicator.key}`}>
    <div className="mi-metric-label">{indicator.label}</div>
    <div className="mi-metric-value">{number.format(indicator.value)}<small>{indicator.unit}</small></div>
    <div className="mi-comparison-row"><span>vs prior month</span><Delta change={indicator.monthOverMonth?.change ?? null} unit={indicator.unit === '%' ? 'percentage points' : 'thousand persons'} /></div>
    <div className="mi-comparison-row"><span>vs same month last year</span><Delta change={indicator.yearOverYear?.change ?? null} unit={indicator.unit === '%' ? 'percentage points' : 'thousand persons'} /></div>
  </article>;
}

function ChartTip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: { date?: string; [key: string]: unknown }; value?: number }> }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  return <div className="mi-tooltip"><strong>{row?.date ? formatDate(row.date) : ''}</strong><span>{number.format(Number(payload[0]?.value ?? 0))} thousand persons</span></div>;
}

function LabourChart({ rows }: { rows: ReturnType<typeof selectLabourMarketWindow> }) {
  const chartRows = rows.map(row => ({ ...row, date: row.date.slice(0, 7) }));
  const hasReferenceBreak = chartRows.some(row => row.date === '2021-01');
  return <div className="mi-chart" role="img" aria-label={`Monthly labour force and employed-person counts in thousand persons${hasReferenceBreak ? ', with the Census 2020 population-reference break marked at January 2021' : ''}`}>
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartRows} margin={{ top: 14, right: 18, left: 2, bottom: 4 }}>
        <CartesianGrid stroke="var(--mi-grid)" vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortMonth} tick={{ fill: 'var(--mi-muted)', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={35} />
        <YAxis tickFormatter={(v: number) => number.format(v)} tick={{ fill: 'var(--mi-muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={52} />
        <Tooltip content={<ChartTip />} />
        {hasReferenceBreak && <ReferenceLine x="2021-01" stroke="var(--mi-coral)" strokeDasharray="4 4" label={{ value: 'Census 2020 reference', position: 'insideTopRight', fill: 'var(--mi-coral)', fontSize: 10 }} />}
        <Line type="monotone" dataKey="lf" name="Labour force" stroke="var(--mi-teal)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
        <Line type="monotone" dataKey="lf_employed" name="Employed" stroke="var(--mi-gold)" strokeWidth={2.2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  </div>;
}

export default function MarketIntelligencePage() {
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

  return <div className="page-wrap mi-page">
    <header className="mi-hero">
      <div className="mi-hero-copy">
        <div className="mi-kicker"><span className="mi-kicker-mark"><Activity size={15} /></span> MARKET INTELLIGENCE <i> / </i> MALAYSIA</div>
        <h1>Work is changing.<br /><em>Read the evidence.</em></h1>
        <p>Three distinct lenses on work: official labour-force measures, a finite snapshot of supplied job records, and dated workforce research.</p>
        <div className="mi-evidence-line"><span><i className="mi-dot official" /> Official statistics</span><span><i className="mi-dot sample" /> Supplied records</span><span><i className="mi-dot research" /> Publisher research</span></div>
      </div>
      <div className="mi-hero-stamp" aria-label="Evidence, not prediction"><div className="mi-stamp-ring"><ShieldCheck size={23} /><span>NO<br />FORECASTS</span></div><small>Evidence types<br />kept separate</small></div>
      <div className="mi-hero-index">01—03<br /><span>THE SIGNALS</span></div>
    </header>

    <section className="mi-section mi-official" aria-labelledby="official-heading">
      <div className="mi-section-head">
        <div><div className="mi-section-overline"><span>01</span> OFFICIAL MALAYSIAN STATISTICS</div><h2 id="official-heading">The labour force, month by month.</h2><p>OpenDOSM labour-force series · seven indicators · no extrapolation.</p></div>
        <button type="button" className="mi-refresh" onClick={() => refresh.mutate()} disabled={refresh.isPending} aria-busy={refresh.isPending}>
          <RefreshCw size={15} className={refresh.isPending ? 'mi-spin' : ''} />{refresh.isPending ? 'Refreshing' : 'Refresh data'}
        </button>
      </div>
      {labour.isLoading && !labour.data && <div className="mi-skeleton-grid" role="status" aria-label="Loading labour market data">{Array.from({ length: 7 }, (_, i) => <div className="mi-skeleton" key={i}><i /><i /><i /></div>)}</div>}
      {labour.isError && !labour.data && <div className="mi-state mi-state-error" role="alert"><AlertCircle size={19} /><div><strong>Official labour data is unavailable.</strong><p>No substitute values are shown. Try loading the source again.</p></div><button type="button" onClick={() => void labour.refetch()}>Try again</button></div>}
      {labour.data && <>
        {(labour.data.cacheState === 'stale' || labour.isError) && <div className="mi-notice mi-notice-stale" role="status"><Clock3 size={16} /><span><strong>Showing cached data.</strong> {labour.data.refreshError || 'The latest refresh could not be confirmed.'}</span></div>}
        {refresh.isError && <div className="mi-notice mi-notice-error" role="alert"><AlertCircle size={16} /><span>Refresh failed. The previously cached observations are preserved.</span></div>}
        {refresh.isSuccess && refresh.data?.retrievalMode === 'external-fetch' && <div className="mi-notice mi-notice-success" role="status"><Check size={16} /><span>OpenDOSM CSV fetch succeeded at {formatTimestamp(refresh.data.retrievedAt)}. Values may be unchanged from the previous retrieval.</span></div>}
        {labour.data.catalogueMetadataError && <div className="mi-notice mi-notice-stale" role="status"><Info size={16} /><span>Catalogue update metadata could not be retrieved: {labour.data.catalogueMetadataError}</span></div>}
        <div className="mi-data-meta">
          <span className="mi-live-label"><i /> SOURCE OBSERVATIONS</span>
          <span><CalendarDays size={14} /> Latest observation <b>{formatDate(labour.data.latestObservationDate)}</b></span>
          <span>Catalogue last updated <b>{formatCatalogueDate(labour.data.catalogueLastUpdated)}</b></span>
          <span>Last successful CSV retrieval <b>{formatTimestamp(labour.data.retrievedAt)}</b></span>
          <span className={`mi-cache-chip ${labour.data.cacheState}`}>API cache: {labour.data.cacheState === 'fresh' ? 'within 6 hours' : 'stale'}</span>
          <span className={`mi-fetch-chip ${labour.data.retrievalMode}`}>
            {labour.data.retrievalMode === 'external-fetch' ? 'External CSV fetch succeeded' : labour.data.retrievalMode === 'cache-hit' ? 'Cache hit · no CSV request' : 'Refresh failed · stale cache'}
          </span>
        </div>
        {indicators.length > 0 ? <div className="mi-metrics">{indicators.map(indicator => <MetricCard key={indicator.key} indicator={indicator} />)}</div> : <div className="mi-empty">The source returned no valid monthly observations.</div>}
        {interpretation && <section className="mi-interpretation" aria-labelledby="interpretation-heading">
          <div className="mi-interpretation-heading"><Info size={16} /><div><span>OBSERVED VALUES ONLY</span><h3 id="interpretation-heading">What this means</h3></div></div>
          <div className="mi-interpretation-grid">
            <div><small>SHORT-TERM MOVEMENT</small><p>Unemployment rate was <b>{number.format(interpretation.unemploymentRate)}%</b> in {formatDate(interpretation.latestDate)}.
              {interpretation.monthOverMonth ? <> Compared with {formatDate(interpretation.monthOverMonth.date)} ({number.format(interpretation.monthOverMonth.value)}%), that is <b>{signed(interpretation.monthOverMonth.change, 'percentage points')}</b>.</> : <> An exact prior-month comparison is unavailable.</>}
              {interpretation.yearOverYear ? <> The same month last year was {number.format(interpretation.yearOverYear.value)}% ({signed(interpretation.yearOverYear.change, 'percentage points')} year over year).</> : <> The exact same month last year is unavailable.</>}</p></div>
            <div><small>FIVE-YEAR ENDPOINT</small><p>{interpretation.fiveYearEndpoint
              ? <>The rate was {number.format(interpretation.fiveYearEndpoint.value)}% in {formatDate(interpretation.fiveYearEndpoint.date)} and {number.format(interpretation.unemploymentRate)}% in {formatDate(interpretation.latestDate)} ({signed(interpretation.fiveYearEndpoint.change, 'percentage points')}). This compares two endpoints; it does not establish a continuous trend or explain a cause.</>
              : <>The exact same-month observation five years earlier is unavailable, so no five-year comparison is shown.</>}
              {interpretation.fiveYearComparisonCrossesCensusBreak && <> This comparison crosses the Census population-reference break; interpret it cautiously.</>}</p></div>
          </div>
          <p className="mi-interpretation-footnote">National unemployment rates do not identify occupational demand or its causes. The 50 supplied job records are not a representative sample of all Malaysian vacancies.</p>
        </section>}
        {windowRows.length > 0 && <div className="mi-chart-panel">
           <div className="mi-chart-head"><div><h3>Monthly labour-force and employment counts</h3><p>Actual source observations · thousand persons</p></div>
            <label className="mi-window-select">Time window <span className="mi-select-wrap"><select value={windowMonths} onChange={e => setWindowMonths(e.target.value === 'all' ? 'all' : Number(e.target.value))} aria-label="Select chart time window"><option value={12}>12 months</option><option value={36}>36 months</option><option value={60}>60 months</option><option value="all">All available</option></select><ChevronDown size={14} /></span></label>
          </div>
           <div className="mi-legend"><span><i className="mi-line-key labour" /> Labour force</span><span><i className="mi-line-key employed" /> Employed</span></div>
          <LabourChart rows={windowRows} />
           <div className="mi-chart-notes"><span><Info size={14} /> Census 2020 population-reference break at January 2021 is marked when it is in the selected window; comparisons across the break need care.</span><span>Unemployed-person values remain above; only available observations are plotted, with no gaps filled.</span></div>
        </div>}
        <div className="mi-caveat"><Info size={16} /><p><strong>How to read comparisons.</strong> Exact prior-month and same-month-last-year values appear only when those exact months exist in the source. Counts are thousand persons; rates are percent and their changes are percentage points. Each field is rounded independently by the source, so totals and rate calculations may not reconcile exactly.</p></div>
        <details className="mi-source-details">
          <summary><span>Source, coverage &amp; ingestion details</span><ChevronDown size={15} /></summary>
          <div className="mi-source-grid">
            <div><small>Source</small><strong>{labour.data.sourceName}</strong></div><div><small>Dataset</small><strong>{labour.data.datasetName}</strong></div>
             <div><small>Catalogue last updated (as listed)</small><strong>{formatCatalogueDate(labour.data.catalogueLastUpdated)}</strong></div><div><small>Next catalogue update (as listed)</small><strong>{formatCatalogueDate(labour.data.catalogueNextUpdate)}</strong></div>
            <div><small>Rows received / valid</small><strong>{number.format(labour.data.rowsReceived)} / {number.format(labour.data.rowsValid)}</strong></div><div><small>Rejected rows</small><strong>{number.format(labour.data.rejectedRows)}</strong></div>
            <div className="mi-source-links"><a href={labour.data.catalogueUrl} target="_blank" rel="noreferrer">Open catalogue <ExternalLink size={13} /></a><a href={labour.data.csvUrl} target="_blank" rel="noreferrer">Open CSV <ExternalLink size={13} /></a></div>
            {!!labour.data.ignoredColumns.length && <div className="mi-ignored"><small>Ignored columns</small><strong>{labour.data.ignoredColumns.join(', ')}</strong></div>}
          </div>
        </details>
      </>}
    </section>

    <section className="mi-section mi-records" aria-labelledby="records-heading">
      <div className="mi-section-head"><div><div className="mi-section-overline"><span>02</span> SUPPLIED JOB SNAPSHOT</div><h2 id="records-heading">What appears in this workbook.</h2><p>A source-level view of the supplied SDC records—not a vacancy feed.</p></div><div className="mi-sample-count"><BriefcaseBusiness size={16} /><b>{snapshot ? snapshot.totalRecords : '—'}</b><span>records</span></div></div>
      {jobsQuery.isLoading && !jobsQuery.data && <div className="mi-skeleton mi-snapshot-skeleton" role="status" aria-label="Loading supplied job records"><i /><i /><i /><i /></div>}
      {jobsQuery.isError && !jobsQuery.data && <div className="mi-state mi-state-error" role="alert"><AlertCircle size={19} /><div><strong>Supplied job records are unavailable.</strong><p>The workbook snapshot could not be loaded.</p></div><button type="button" onClick={() => void jobsQuery.refetch()}>Try again</button></div>}
      {snapshot && <>
        <div className="mi-snapshot-warning"><Info size={16} /><span>These 50 existing records describe only this dataset. Category and skill counts are not live vacancies or measures of market demand.</span></div>
        <div className="mi-snapshot-overview">
          <div className="mi-snapshot-stat"><small>Distinct job titles</small><strong>{snapshot.distinctTitles}</strong><span>within supplied records</span></div>
          <div className="mi-snapshot-stat mi-date-stat"><small>Posting dates</small><strong>{snapshot.jobsWithPostingDates} <i>/</i> {snapshot.totalRecords}</strong><span>{snapshot.jobsWithoutPostingDates} records have no posting date; listing freshness is unknown.</span></div>
          <div className="mi-category-block"><h3>Records by career category</h3><div className="mi-category-list">{snapshot.categories.map((category, index) => <div className="mi-category-row" key={category.key}><span className="mi-category-rank">0{index + 1}</span><span className="mi-category-name">{category.label}</span><span className="mi-category-track"><i style={{ width: `${snapshot.totalRecords ? category.count / snapshot.totalRecords * 100 : 0}%` }} /></span><b>{category.count}</b></div>)}</div></div>
        </div>
        <div className="mi-skills-grid">
          <SkillList title="Technical skills mentioned" items={snapshot.topTechnicalSkills} total={snapshot.totalRecords} kind="technical" />
          <SkillList title="Soft skills mentioned" items={snapshot.topSoftSkills} total={snapshot.totalRecords} kind="soft" />
          <SkillList title="Domain-specific skills" items={snapshot.topDomainSkills} total={snapshot.totalRecords} kind="domain" />
        </div>
        <p className="mi-skills-footnote"><Info size={14} /> Counts show records that mention each displayed skill; equivalent mentions within one record count once. “Excel” groups “Excel” and “Microsoft Excel”; “Payroll” is shown as domain-specific. Original source wording remains unchanged in the records.</p>
      </>}
    </section>

    <section className="mi-section mi-research" aria-labelledby="research-heading">
      <div className="mi-section-head"><div><div className="mi-section-overline"><span>03</span> DATED WORKFORCE RESEARCH</div><h2 id="research-heading">A study with a defined scope.</h2><p>Publisher-reported findings are useful context, not national labour-force estimates.</p></div><div className="mi-research-badge"><span /> DATED RESEARCH</div></div>
      {aiWorkResearch.map(item => <article className="mi-research-card" key={item.id}>
        <div className="mi-research-top"><span className="mi-publisher">{item.publisher}</span><span><CalendarDays size={14} /> {formatFullDate(item.publishedOn)}</span><span className="mi-not-live"><i /> Not a live feed</span></div>
        <h3>{item.title}</h3>
        <div className="mi-study-scope"><div className="mi-scope-mark">SCOPE</div><p>{item.scope}</p></div>
        <div className="mi-findings">
          {item.findings.map(finding => <div className="mi-finding" key={`${finding.value}-${finding.statement}`}>
            <strong>{finding.value}</strong><p>{finding.statement}</p><small>{finding.denominator}</small>
          </div>)}
        </div>
        <div className="mi-research-caveat"><Info size={16} /><p>{item.caveat}</p></div>
        <a className="mi-study-link" href={item.url} target="_blank" rel="noreferrer">Read the publisher’s study <ExternalLink size={14} /></a>
      </article>)}
    </section>

    <footer className="mi-footer"><div className="mi-footer-mark">FN</div><p><strong>Different evidence answers different questions.</strong><br />Official indicators describe national labour-force conditions. Workbook records show what was listed in a finite sample. Research reports what its defined respondents said.</p><span>FUTURENOW <i>·</i> MALAYSIA</span></footer>
  </div>;
}

function SkillList({ title, items, total, kind }: { title: string; items: Array<{ name: string; jobCount: number }>; total: number; kind: 'technical' | 'soft' | 'domain' }) {
  return <div className={`mi-skill-panel mi-skill-${kind}`}><div className="mi-skill-heading"><h3>{title}</h3><span>TOP MENTIONS</span></div>
    {items.length ? <ol>{items.map((skill, i) => <li key={skill.name}><span className="mi-skill-number">{String(i + 1).padStart(2, '0')}</span><span className="mi-skill-name">{skill.name}</span><span className="mi-skill-meter"><i style={{ width: `${total ? skill.jobCount / total * 100 : 0}%` }} /></span><b>{skill.jobCount}</b></li>)}</ol> : <div className="mi-empty">No skill mentions are available in this snapshot.</div>}
  </div>;
}
