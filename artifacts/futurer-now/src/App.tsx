import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  useGetFutureReadyOverview,
  useGetFutureReadyJobs,
  useGetFutureReadyUnemployment,
  useGetFutureReadyWages,
  useGetFutureReadyUnderemployment,
  getGetFutureReadyOverviewQueryKey,
  getGetFutureReadyJobsQueryKey,
  getGetFutureReadyUnemploymentQueryKey,
  getGetFutureReadyWagesQueryKey,
  getGetFutureReadyUnderemploymentQueryKey,
} from '@workspace/api-client-react';
import type { JobListing } from '@workspace/api-client-react';
import { Link, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';
import {
  Activity, ArrowRight, Compass, Radar, Route as Route_, Telescope, UserRound, BriefcaseBusiness, ChartNoAxesCombined, ChevronDown, ChevronLeft,
  ChevronRight, CircleAlert, Database, Download, Filter, GraduationCap, Info, Layers3,
  Menu, Moon, Printer, RefreshCw, Search, ShieldCheck, SlidersHorizontal, Sun, X,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { languageLocales, LanguageProvider, LanguageSwitcher, useTranslation } from '@/lib/i18n';
import { brandLogoUrl } from '@/lib/brand';
import './index.css';

// Keep feature forms, matching UI and charting out of the initial app download.
const SkillGapPage = lazy(() => import('@/pages/skill-gap'));
const SkillsProfilePage = lazy(() => import('@/pages/skills-profile'));
const FutureRoleMatchingPage = lazy(() => import('@/pages/future-role-matching'));
const ReskillingPathwayPage = lazy(() => import('@/pages/reskilling-pathway'));
const MarketIntelligencePage = lazy(() => import('@/pages/market-intelligence'));
const ScenarioPlanningPage = lazy(() => import('@/pages/scenario-planning'));
const NotFound = lazy(() => import('@/pages/not-found'));
const OverviewChart = lazy(() => import('@/components/labor-charts').then((module) => ({ default: module.OverviewChart })));
const UnemploymentChart = lazy(() => import('@/components/labor-charts').then((module) => ({ default: module.UnemploymentChart })));
const WageChart = lazy(() => import('@/components/labor-charts').then((module) => ({ default: module.WageChart })));
const UnderemploymentChart = lazy(() => import('@/components/labor-charts').then((module) => ({ default: module.UnderemploymentChart })));

function PageLoadError() {
  const { t } = useTranslation();
  // React.lazy caches rejected imports; a full reload retries missing/stale chunks.
  return <div className="page-wrap"><div className="state-box error-state" role="alert"><div className="state-symbol"><CircleAlert size={21} /></div><div><strong>{t('Couldn’t load this page')}</strong><p>{t('Check your connection, then reload. Your saved browser profile has not been changed.')}</p></div><button type="button" className="text-button" onClick={() => window.location.reload()}>{t('Reload page')} <RefreshCw size={14} /></button></div></div>;
}

const careerCategoryLabels: Record<JobListing['sector'], string> = {
  software: 'Software',
  mechanical: 'Mechanical',
  'digital-marketing': 'Digital marketing',
  'human-resources': 'Human resources',
  'accounting-finance': 'Accounting / finance',
  'data-analytics': 'Data analytics',
};
const hasDisclosedSalary = (job: JobListing) =>
  job.salaryMonthlyRm !== null || /^\d+-\d+$/.test(job.salaryText?.trim() ?? '');
const jobSalaryLabel = (job: JobListing, locale = 'en-MY') => job.salaryMonthlyRm !== null
  ? money(job.salaryMonthlyRm, locale)
  : hasDisclosedSalary(job) ? `RM ${job.salaryText}` : 'Salary not disclosed';

const client = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false } },
});

const fmt = (n: number, locale = 'en-MY') => new Intl.NumberFormat(locale).format(n);
const money = (n: number, locale = 'en-MY') => `RM ${fmt(n, locale)}`;
const month = (s: string, locale = 'en-MY') => {
  const [y, m] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, 1).toLocaleDateString(locale, { month: 'short', year: '2-digit' });
};
function downloadCsv<T extends object>(filename: string, rows: T[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    const text = value === null || value === undefined ? '' : Array.isArray(value) ? value.join('; ') : String(value);
    return `"${text.replaceAll('"', '""')}"`;
  };
  const csv = [headers.map(escape).join(','), ...rows.map((row) => {
    const values = new Map(Object.entries(row));
    return headers.map((header) => escape(values.get(header))).join(',');
  })].join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function CsvDownload({ label, filename, rows, testId }: { label: string; filename: string; rows: object[]; testId: string }) {
  const { t } = useTranslation();
  return <button type="button" className="icon-button csv-button" aria-label={t(label)} title={t(label)} data-testid={testId} disabled={!rows.length} onClick={() => downloadCsv(filename, rows)}><Download size={15} /><span>CSV</span></button>;
}

function useRefresh() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: getGetFutureReadyOverviewQueryKey() });
    void qc.invalidateQueries({ queryKey: getGetFutureReadyJobsQueryKey() });
    void qc.invalidateQueries({ queryKey: getGetFutureReadyUnemploymentQueryKey() });
    void qc.invalidateQueries({ queryKey: getGetFutureReadyWagesQueryKey() });
    void qc.invalidateQueries({ queryKey: getGetFutureReadyUnderemploymentQueryKey() });
  };
}

function Shell({ children }: { children: ReactNode }) {
  const [path] = useLocation();
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => { try { return typeof window !== 'undefined' && window.localStorage.getItem('futureready-my-theme') === 'dark'; } catch { return false; } });
  const refresh = useRefresh();
  const pageDetails: Record<string, { title: string; description: string }> = {
    '/': {
      title: t('Overview'),
      description: t('Explore supplied job records and Malaysian labour-market context with FutureNow.'),
    },
    '/jobs': {
      title: t('Job Record Explorer'),
      description: t('Search supplied job records across workbook career categories in FutureNow.'),
    },
    '/workforce-data': {
      title: t('National context'),
      description: t('Explore the supplied national unemployment, wage, and underemployment datasets in FutureNow.'),
    },
    '/skill-gap': {
      title: t('Skill Gap Navigator'),
      description: t('Compare your skills with requirements listed in supplied job records with FutureNow.'),
    },
    '/skills-profile': { title: t('Skills Profile'), description: t('Build Your Skills Profile') },
    '/future-role-matching': { title: t('Future-Role Matching'), description: t('Which supplied roles fit your skills?') },
    '/reskilling-pathway': { title: t('Reskilling Pathway'), description: t('Turn one role into a practical next step.') },
    '/market-intelligence': { title: t('AI & Market Intelligence'), description: t('Work is changing.') },
    '/scenario-planning': { title: t('Scenario Planning'), description: t('Two possible paces.') },
  };
  const currentPage = pageDetails[path] ?? { title: t('Page not found'), description: t('This FutureNow page is not available.') };
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    try { window.localStorage.setItem('futureready-my-theme', isDark ? 'dark' : 'light'); } catch { /* storage unavailable: theme kept in memory */ }
  }, [isDark]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
      if (e.key === 'Tab' && window.matchMedia('(max-width: 760px)').matches) {
        const controls = [...document.querySelectorAll<HTMLElement>('.sidebar a[href], .sidebar button')].filter(el => el.getClientRects().length > 0 && getComputedStyle(el).display !== 'none');
        const first = controls[0], last = controls[controls.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener('keydown', onKey);
    document.querySelector<HTMLElement>('.sidebar .mobile-close')?.focus();
    return () => { window.removeEventListener('keydown', onKey); document.querySelector<HTMLElement>('.mobile-menu')?.focus(); };
  }, [menuOpen]);
  useEffect(() => {
    document.title = `${currentPage.title} | FutureNow`;
    document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute('content', currentPage.description);
    document.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.setAttribute('content', currentPage.description);
    document.querySelector<HTMLMetaElement>('meta[name="twitter:description"]')?.setAttribute('content', currentPage.description);
  }, [currentPage.title, currentPage.description]);
  const modules = [
    { href: '/skills-profile', label: t('Skills Profile'), icon: UserRound, soon: false },
    { href: '/future-role-matching', label: t('Future-Role Matching'), icon: Compass, soon: false },
    { href: '/reskilling-pathway', label: t('Reskilling Pathway'), icon: Route_, soon: false },
    { href: '/market-intelligence', label: t('AI & Market Intelligence'), icon: Radar, soon: false },
    { href: '/scenario-planning', label: t('Scenario Planning'), icon: Telescope, soon: false },
  ];
  const nav = [
    { href: '/', label: t('Overview'), icon: Layers3 },
    { href: '/jobs', label: t('Job records'), icon: BriefcaseBusiness },
    { href: '/workforce-data', label: t('National context'), icon: ChartNoAxesCombined },
    { href: '/skill-gap', label: t('Skill Gap Navigator'), icon: GraduationCap },
  ];
  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`} id="app-sidebar" aria-label={t('Features')}>
        <div className="brand-lockup">
          <img className="brand-logo" src={brandLogoUrl} alt={t('FutureNow logo')} />
          <div><div className="brand-name">FutureNow</div><div className="brand-caption">{t('WORKFORCE SKILLS NAVIGATOR')}</div></div>
          <button className="mobile-close" aria-label={t('Close navigation')} data-testid="button-close-navigation" onClick={() => setMenuOpen(false)}><X size={18} /></button>
        </div>
        <div className="sidebar-kicker sidebar-kicker-modules text-[13px] font-extrabold">{t('Features')}</div>
        <nav className="primary-nav" aria-label={t('FutureNow modules')}>
          {modules.map(({ href, label, icon: Icon, soon }, i) => (
            <Link key={href} href={href} data-testid={`link-module-${href.slice(1)}`} aria-current={path === href ? 'page' : undefined} className={`nav-link ${path === href ? 'nav-active' : ''}`} onClick={() => setMenuOpen(false)}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>{soon ? <span className="nav-soon">{t('Soon')}</span> : <span className="nav-index">0{i + 1}</span>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-kicker">{t('DATA WORKSPACE')}</div>
        <nav className="primary-nav" aria-label={t('Primary navigation')}>
          {nav.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} data-testid={`link-nav-${href === '/' ? 'overview' : href.slice(1)}`} className={`nav-link ${path === href ? 'nav-active' : ''}`} onClick={() => setMenuOpen(false)}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="integrity-card"><ShieldCheck size={18} /><div><strong>{t('Evidence, in context')}</strong><p>{t('Job records and national indicators stay separate.')}</p></div></div>
          <div className="sidebar-meta"><span>FutureNow </span><span className="sidebar-version">{t('MALAYSIA · DATA VIEW')}</span></div>
        </div>
      </aside>
      {menuOpen && <button aria-label={t('Close navigation overlay')} className="nav-scrim" onClick={() => setMenuOpen(false)} />}
      <main className="main-shell">
        <header className="topbar">
          <button className="mobile-menu" aria-label={t('Open navigation')} aria-expanded={menuOpen} aria-controls="app-sidebar" data-testid="button-open-navigation" onClick={() => setMenuOpen(true)}><Menu size={20} /></button>
          <div className="breadcrumb"><span>SDC</span><span className="crumb-slash">/</span><span>FutureNow</span><span className="crumb-slash">/</span><strong>{currentPage.title}</strong></div>
          <div className="topbar-actions">
            <LanguageSwitcher />
            <div className="live-status"><span /> {t('Supplied datasets')}</div>
            <button className="icon-button refresh-button" aria-label={t('Refresh all data')} data-testid="button-refresh-data" onClick={refresh}><RefreshCw size={16} /><span>{t('Refresh')}</span></button>
            <button className="icon-button utility-button" type="button" aria-label={t('Print or save this page as PDF')} title={t('Print or save this page as PDF')} data-testid="button-print-pdf" onClick={() => window.print()}><Printer size={15} /></button>
            <button className="icon-button utility-button" type="button" aria-label={t(isDark ? 'Switch to light theme' : 'Switch to dark theme')} aria-pressed={isDark} title={t(isDark ? 'Switch to light theme' : 'Switch to dark theme')} data-testid="button-theme-toggle" onClick={() => setIsDark((value) => !value)}>{isDark ? <Sun size={15} /> : <Moon size={15} />}</button>
          </div>
        </header>
        <div className="page-content">{children}</div>
        <footer className="page-footer"><span>{t('FutureNow · SDC 2026 workforce explorer')}</span><span>{t('Evidence first. Context always.')}</span></footer>
      </main>
    </div>
  );
}

function PageHeading({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children: ReactNode }) {
  const { t } = useTranslation();
  return <div className="page-heading"><div><div className="eyebrow">{t(eyebrow)}</div><h1>{title}</h1><p>{children}</p><div className="source-badges" aria-label={t('Data sources')}><span data-testid="badge-source-job-workbook"><BriefcaseBusiness size={13} /> {t('Supplied job workbook')}</span><span data-testid="badge-source-csv-datasets"><Database size={13} /> {t('Supplied labor-market CSV datasets')}</span></div></div></div>;
}

function QueryError({ retry, label }: { retry: () => void; label: string }) {
  const { t } = useTranslation();
  return <div className="state-box error-state" role="alert"><div className="state-symbol"><CircleAlert size={21} /></div><div><strong>{t('Couldn’t load')} {t(label)}</strong><p>{t('Check your connection, then try again. No sample data is shown in its place.')}</p></div><button className="text-button" onClick={retry} data-testid={`button-retry-${label.replaceAll(' ', '-')}`}>{t('Try again')} <ArrowRight size={14} /></button></div>;
}

function LoadingLines({ count = 4 }: { count?: number }) {
  const { t } = useTranslation();
  return <div className="skeleton-stack" aria-label={t('Loading data')} role="status">{Array.from({ length: count }, (_, i) => <div className="skeleton-line" key={i} />)}</div>;
}

function EmptyState({ title, text }: { title: string; text: string }) {
  const { t } = useTranslation();
  return <div className="empty-state"><div className="empty-symbol"><Database size={20} /></div><strong>{t(title)}</strong><p>{t(text)}</p></div>;
}

function Metric({ label, value, note, icon: Icon, accent = '' }: { label: string; value: ReactNode; note: string; icon: typeof Layers3; accent?: string }) {
  const { t } = useTranslation();
  return <article className={`metric-card ${accent}`} data-testid={`metric-${label.toLowerCase().replaceAll(' ', '-')}`}><div className="metric-top"><span>{t(label)}</span><Icon size={17} /></div><div className="metric-value">{value}</div><div className="metric-note">{t(note)}</div></article>;
}

function Panel({ title, kicker, action, children, className = '' }: { title: string; kicker?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  const { t } = useTranslation();
  return <section className={`panel ${className}`}><div className="panel-heading"><div>{kicker && <div className="panel-kicker">{t(kicker)}</div>}<h2>{t(title)}</h2></div>{action}</div>{children}</section>;
}

function OverviewPage() {
  const { t, language } = useTranslation();
  const locale = languageLocales[language];
  const summary = useGetFutureReadyOverview();
  const unemployment = useGetFutureReadyUnemployment();
  const refresh = useRefresh();
  const latest = unemployment.data?.[unemployment.data.length - 1];
  const lastMonth = unemployment.data?.slice(-12).map((d) => ({ ...d, label: month(d.date, locale) })) ?? [];
  return <div className="page-wrap overview-page">
    <PageHeading eyebrow="01 / supplied records + national indicators" title={t('A clearer view of workforce readiness.')}>
      {t('Explore the supplied job records across career categories alongside national labor-market context. Different datasets answer different questions.')}
    </PageHeading>
    <div className="hero-note"><div className="hero-note-icon"><Info size={17} /></div><p><strong>{t('Important distinction')}</strong> {t('— these job postings are a small supplied sample, not a measure of national demand. National indicators below are shown independently.')}</p><span className="note-rule" /></div>
    {summary.isError && <QueryError label="overview summary" retry={refresh} />}
    <div className="metrics-grid">
      {summary.isLoading || summary.isFetching ? <><div className="metric-skeleton" /><div className="metric-skeleton" /><div className="metric-skeleton" /><div className="metric-skeleton" /></> : summary.data ? <>
        <Metric label="Supplied job records" value={fmt(summary.data.totalJobs, locale)} note="A finite workbook sample" icon={BriefcaseBusiness} accent="metric-featured" />
        <Metric label="Distinct job titles" value={fmt(summary.data.distinctJobTitles, locale)} note="Whitespace-normalized titles, not records" icon={Layers3} />
        <Metric label="Career categories" value={fmt(summary.data.careerCategoryCount, locale)} note="Derived from the supplied job titles" icon={Activity} />
        <Metric label="Salary disclosed" value={`${fmt(summary.data.disclosedSalaryCount, locale)} / ${fmt(summary.data.totalJobs, locale)}`} note={`${fmt(summary.data.undisclosedSalaryCount, locale)} records without salary`} icon={Database} />
      </> : null}
    </div>
    {summary.isSuccess && !summary.data && <EmptyState title="No overview available" text="The overview endpoint returned no data." />}
    <div className="overview-grid">
      <Panel title="Youth unemployment" kicker="NATIONAL CONTEXT" action={<Link href="/workforce-data" className="panel-link" data-testid="link-view-labor-trends">{t('Explore trends')} <ArrowRight size={14} /></Link>} className="unemployment-panel">
        {unemployment.isError ? <QueryError label="unemployment data" retry={refresh} /> : unemployment.isLoading || unemployment.isFetching ? <LoadingLines /> : unemployment.data?.length ? <>
           <div className="chart-intro"><div><span className="chart-big">{latest ? fmt(latest.rateAge15To24, locale) : '—'}</span><span className="chart-descriptor">15–24 {t('unemployment rate')}<br />{t('latest supplied value · unit as supplied')}</span></div><div className="chart-legend"><span><i className="legend-dot teal" />{t('Age 15–24')}</span><span><i className="legend-dot gold" />{t('Age 15–30')}</span></div></div>
           <div className="chart-area chart-short" role="img" aria-label={t('Line chart showing unemployment rates for ages 15 to 24 and 15 to 30')}>
            <Suspense fallback={<LoadingLines />}><OverviewChart data={lastMonth} /></Suspense>
          </div><div className="chart-footnote">{t('Monthly observations · rate units as supplied')}</div>
        </> : <EmptyState title="No unemployment observations" text="No national unemployment series is currently available." />}
      </Panel>
      <Panel title="What the records can tell you" kicker="READ THE SAMPLE" className="reading-panel">
        <div className="reading-item"><span className="reading-number">01</span><div><strong>{t('Compare career categories')}</strong><p>{t('Review the supplied roles, their stated education, experience and skills.')}</p></div></div>
        <div className="reading-item"><span className="reading-number">02</span><div><strong>{t('Check what is reported')}</strong><p>{t('Job salaries are monthly RM. Some records do not disclose salary.')}</p></div></div>
        <div className="reading-item"><span className="reading-number">03</span><div><strong>{t('Keep context in its lane')}</strong><p>{t('National labor indicators describe broader trends; they are not derived from these postings.')}</p></div></div>
        <Link className="reading-cta" href="/jobs" data-testid="link-explore-job-records"><span>{t('Browse all job records')}</span><ArrowRight size={17} /></Link>
        <Link className="reading-cta" href="/skills-profile" data-testid="link-start-skills-profile"><span>{t('New: build your skills profile')}</span><ArrowRight size={17} /></Link>
      </Panel>
    </div>
    <section className="limits-strip"><div className="limits-title"><ShieldCheck size={18} /><span>{t('Coverage notes')}</span></div><div className="limit-chip"><b>01</b><span>{t('Source URLs are supplied; locations and posting dates are not.')}</span></div><div className="limit-chip"><b>02</b><span>{t('Aggregate CSV wage and count units are not specified.')}</span></div><div className="limit-chip"><b>03</b><span>{t('Small job sample ≠ national labor demand.')}</span></div></section>
    {summary.data?.dataNotes?.length ? <details className="source-notes"><summary>{t('Dataset notes from the supplied overview')} <ChevronDown size={15} /></summary><ul>{summary.data.dataNotes.map((note, i) => <li key={`${i}-${note}`}>{note}</li>)}</ul></details> : null}
  </div>;
}

function JobCard({ job }: { job: JobListing }) {
  const { t, language } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const salaryLabel = jobSalaryLabel(job, languageLocales[language]);
  return <article className="job-card" data-testid={`card-job-${job.id}`}>
     <div className="job-card-top"><span className={`sector-pill ${job.sector}`}>{t(careerCategoryLabels[job.sector])}</span><span className="job-id">{t('RECORD')} / {job.id}</span></div>
    <div className="job-title-line"><div><h3>{job.title}</h3><p className="job-company">{job.company} <span>·</span> {job.industry}</p></div><button className={`expand-button ${expanded ? 'is-expanded' : ''}`} aria-label={`${t(expanded ? 'Hide' : 'Show')} ${t('details for')} ${job.title}`} aria-expanded={expanded} data-testid={`button-job-details-${job.id}`} onClick={() => setExpanded(!expanded)}>{expanded ? <ChevronDown size={17} /> : <ChevronRight size={17} />}</button></div>
     <div className="job-summary"><span><GraduationCap size={14} />{job.education || t('Education not specified')}</span><span><Activity size={14} />{job.experience || t('Experience not specified')}</span><strong>{salaryLabel === 'Salary not disclosed' ? t(salaryLabel) : salaryLabel}<small>{hasDisclosedSalary(job) ? t('monthly') : t('in supplied record')}</small></strong></div>
    <div className="job-tags">{job.technicalSkills?.slice(0, 4).map((skill) => <span key={skill}>{skill}</span>)}{(job.technicalSkills?.length ?? 0) > 4 && <span className="tag-more">+{job.technicalSkills.length - 4}</span>}</div>
    {expanded && <div className="job-details"><div className="detail-column"><div className="detail-label">{t('Technical skills')}</div><div className="detail-copy">{job.technicalSkills?.length ? job.technicalSkills.join(' · ') : t('Not specified')}</div></div><div className="detail-column"><div className="detail-label">{t('Soft skills')}</div><div className="detail-copy">{job.softSkills?.length ? job.softSkills.join(' · ') : t('Not specified')}</div></div><div className="detail-column"><div className="detail-label">{t('Source')}</div><div className="detail-copy">{job.source || t('Not specified')}{job.sourceUrl && <><br /><a href={job.sourceUrl} target="_blank" rel="noopener noreferrer">{t('View source listing')}</a></>}</div></div></div>}
  </article>;
}

function JobsPage() {
  const { t } = useTranslation();
  const query = useGetFutureReadyJobs();
  const refresh = useRefresh();
  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('all');
  const [salary, setSalary] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const allJobs = query.data ?? [];
  const careerCategories = [...new Set(allJobs.map((job) => job.sector))];
  const distinctTitles = new Set(allJobs.map((job) => job.title.trim().replace(/\s+/g, ' ').toLowerCase())).size;
  const filtered = useMemo(() => allJobs.filter((job) => {
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || [job.title, job.company, job.industry, job.education, job.experience, job.source, ...job.technicalSkills, ...job.softSkills].join(' ').toLowerCase().includes(term);
    return matchesSearch && (sector === 'all' || job.sector === sector) && (salary === 'all' || (salary === 'disclosed' ? hasDisclosedSalary(job) : !hasDisclosedSalary(job)));
  }), [allJobs, search, sector, salary]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const updateSearch = (v: string) => { setSearch(v); setPage(1); };
  const reset = () => { setSearch(''); setSector('all'); setSalary('all'); setPage(1); };
  return <div className="page-wrap jobs-page">
    <PageHeading eyebrow="02 / supplied workbook" title={t('Job record explorer')}>{t('Search the supplied listings. Use the filters to inspect what is in this sample — not to infer national demand.')}</PageHeading>
     <div className="sample-banner"><div className="banner-emblem"><BriefcaseBusiness size={18} /></div><div><strong>{query.data ? t('{count} supplied records', { count: query.data.length }) : t('Supplied job records')}</strong><p>{t('Job-level evidence only · Salary values shown as monthly RM')}</p></div><div className="banner-sectors">{query.data && <span>{t('{titleCount} distinct job titles · {categoryCount} career categories', { titleCount: distinctTitles, categoryCount: careerCategories.length })}</span>}</div></div>
    <div className="explorer-layout">
      <aside className="filter-panel">
        <div className="filter-heading"><div><SlidersHorizontal size={16} /><h2>{t('Refine records')}</h2></div><button onClick={reset} className="reset-button" data-testid="button-reset-filters">{t('Reset')}</button></div>
        <label className="field-label" htmlFor="job-search">{t('Search roles')}</label>
        <div className="search-field"><Search size={16} /><input id="job-search" type="search" value={search} onChange={(e) => updateSearch(e.target.value)} placeholder={t('Title, company, skill…')} data-testid="input-search-jobs" /></div>
        <label className="field-label" htmlFor="sector-filter">{t('Career category')}</label>
        <div className="select-wrap"><select id="sector-filter" value={sector} onChange={(e) => { setSector(e.target.value); setPage(1); }} data-testid="select-sector-filter"><option value="all">{t('All categories')}</option>{careerCategories.map((category) => <option key={category} value={category}>{t(careerCategoryLabels[category])}</option>)}</select><ChevronDown size={15} /></div>
        <label className="field-label" htmlFor="salary-filter">{t('Salary disclosure')}</label>
        <div className="select-wrap"><select id="salary-filter" value={salary} onChange={(e) => { setSalary(e.target.value); setPage(1); }} data-testid="select-salary-filter"><option value="all">{t('Any disclosure')}</option><option value="disclosed">{t('Salary disclosed')}</option><option value="undisclosed">{t('Not disclosed')}</option></select><ChevronDown size={15} /></div>
        <div className="filter-footnote"><Info size={14} /><span>{t('Categories are title-derived. Source URLs are supplied; locations and posting dates are absent.')}</span></div>
         <div className="filter-vertical-label">{t('JOB-LEVEL RECORDS')}</div>
      </aside>
      <div className="results-column">
        <div className="results-head"><div><div className="results-eyebrow"><Filter size={14} /> {t('FILTERED VIEW')}</div><h2>{t('Matching records')} <span>{query.data ? `${filtered.length} / ${allJobs.length}` : ''}</span></h2></div><div className="results-head-actions"><div className="results-sort-note">{t('Browse the source-level evidence')}</div><CsvDownload label="Download filtered job records as CSV" filename="future-ready-filtered-job-records.csv" rows={filtered} testId="button-download-filtered-jobs-csv" /></div></div>
        {query.isError ? <QueryError label="job records" retry={refresh} /> : query.isLoading || query.isFetching ? <div className="job-list">{Array.from({ length: 4 }, (_, i) => <div className="job-skeleton" key={i}><div className="skeleton-line" /><div className="skeleton-line" /><div className="skeleton-line" /></div>)}</div> : !allJobs.length ? <EmptyState title="No job records available" text="The job records endpoint returned no listings." /> : !filtered.length ? <div className="no-results"><div className="empty-symbol"><Search size={19} /></div><strong>{t('No records match these filters')}</strong><p>{t('Try a different search term or clear the filters.')}</p><button className="outline-button" onClick={reset} data-testid="button-clear-empty-filters">{t('Clear filters')}</button></div> : <div className="job-list">{visible.map((job) => <JobCard key={job.id} job={job} />)}</div>}
        {filtered.length > pageSize && <div className="pagination"><span>{t('Showing')} <b>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)}</b> {t('of')} <b>{filtered.length}</b></span><div><button aria-label={t('Previous page')} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} data-testid="button-previous-page"><ChevronLeft size={17} /></button><span className="page-count">{page} / {pages}</span><button aria-label={t('Next page')} onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} data-testid="button-next-page"><ChevronRight size={17} /></button></div></div>}
      </div>
    </div>
    <div className="salary-note"><Info size={16} /><p><strong>{t('Salary interpretation:')}</strong> {t('job listing salaries are monthly RM where disclosed. Aggregate CSV wage and count units are unspecified; do not compare them as if they were verified against job salaries.')}</p></div>
  </div>;
}

function WorkforcePage() {
  const { t, language } = useTranslation();
  const locale = languageLocales[language];
  const unemployment = useGetFutureReadyUnemployment();
  const wages = useGetFutureReadyWages();
  const underemployment = useGetFutureReadyUnderemployment();
  const refresh = useRefresh();
  const [wageType, setWageType] = useState<'occupation' | 'skill'>('occupation');
  const [wageYear, setWageYear] = useState('');
  const [measure, setMeasure] = useState<'rate' | 'persons'>('rate');
  const jobless = unemployment.data ?? [];
  const wageYears = useMemo(
    () => [...new Set((wages.data ?? []).filter((row) => row.categoryType === wageType && row.sex === 'both').map((row) => row.date.slice(0, 4)))].sort(),
    [wages.data, wageType],
  );
  const selectedWageYear = wageYears.includes(wageYear) ? wageYear : wageYears.at(-1) ?? '';
  const wageRows = (wages.data ?? []).filter((row) =>
    row.categoryType === wageType && row.sex === 'both' && row.date.startsWith(`${selectedWageYear}-`),
  );
  const underRows = (underemployment.data ?? []).filter((d) => d.measure === measure && d.age === 'overall').slice(-24);
  const underByDate = useMemo(() => {
    const dates = [...new Set((underemployment.data ?? []).filter((d) => d.measure === measure).map((d) => d.date))].sort();
    return dates.map((date) => {
      const row: Record<string, string | number> = { date, label: month(date, locale) };
      (underemployment.data ?? []).filter((d) => d.measure === measure && d.date === date).forEach((d) => { row[d.age] = d.value; });
      return row;
    });
  }, [underemployment.data, measure]);
  const chartLoading = unemployment.isLoading || unemployment.isFetching;
  return <div className="page-wrap workforce-page">
    <PageHeading eyebrow="03 / aggregate labor-market data" title={t('National context, on its own terms.')}>{t('Explore the supplied unemployment, wage and underemployment observations. These aggregate datasets are distinct from the job-record sample.')}</PageHeading>
     <div className="context-caution"><div className="caution-mark"><Info size={18} /></div><div><strong>{t('Units and coverage are not fully specified.')}</strong><p>{t('Aggregate CSV wage and count units have not been specified. Values are shown as supplied; do not compare them with monthly RM salaries from job listings. These indicators are a separate dataset from the 50 supplied job records.')}</p></div></div>
    <div className="data-section-label"><span>01</span><div><h2>{t('Unemployment')}</h2><p>{t('Monthly youth measures across two age bands')}</p></div><span className="section-source">{t('NATIONAL SERIES')}</span></div>
    <Panel title="Youth unemployment over time" kicker="MONTHLY OBSERVATIONS" action={<CsvDownload label="Download unemployment observations as CSV" filename="future-ready-unemployment-observations.csv" rows={jobless} testId="button-download-unemployment-csv" />}>
      {unemployment.isError ? <QueryError label="unemployment data" retry={refresh} /> : chartLoading ? <LoadingLines count={5} /> : jobless.length ? <div className="wide-chart" role="img" aria-label={t('Unemployment rates and counts for age groups 15 to 24 and 15 to 30')}>
        <div className="chart-legend"><span><i className="legend-dot teal" />{t('Rate · age 15–24')}</span><span><i className="legend-dot gold" />{t('Rate · age 15–30')}</span></div>
          <Suspense fallback={<LoadingLines count={5} />}><UnemploymentChart data={jobless.map((d) => ({ ...d, label: month(d.date, locale) }))} /></Suspense>
        <div className="supporting-series"><div><span className="mini-label">{t('UNEMPLOYED · AGE 15–24')}</span><b>{fmt(jobless.at(-1)?.unemployedAge15To24 ?? 0, locale)}</b></div><div><span className="mini-label">{t('UNEMPLOYED · AGE 15–30')}</span><b>{fmt(jobless.at(-1)?.unemployedAge15To30 ?? 0, locale)}</b></div><span className="units-inline">{t('Counts and rates are distinct measures · units as supplied')}</span></div>
      </div> : <EmptyState title="No unemployment observations" text="No observations are available for this national series." />}
    </Panel>
      <div className="data-section-label section-spaced"><span>02</span><div><h2>{t('Wages by category')}</h2><p>{t('Median and mean values for the selected category type and year')}</p></div><span className="section-source">{t('AGGREGATE CSV')}</span></div>
      <Panel title="Wage observations" kicker={`${selectedWageYear || 'YEAR'} · ${t('UNIT UNSPECIFIED')}`} action={<div className="panel-actions"><CsvDownload label={`Download displayed ${wageType} wage chart data as CSV`} filename={`future-ready-${wageType}-wages-${selectedWageYear || 'all-years'}.csv`} rows={wageRows} testId="button-download-wages-csv" /><label className="sr-only" htmlFor="wage-year">{t('Wage data year')}</label><select className="year-select" id="wage-year" aria-label={t('Select wage data year')} data-testid="select-wage-year" value={selectedWageYear} onChange={(event) => setWageYear(event.target.value)}>{wageYears.map((year) => <option key={year} value={year}>{year}</option>)}</select><div className="segmented-control" aria-label={t('Wage category type')}><button className={wageType === 'occupation' ? 'segment-active' : ''} onClick={() => setWageType('occupation')} data-testid="button-wage-occupation">{t('Occupation')}</button><button className={wageType === 'skill' ? 'segment-active' : ''} onClick={() => setWageType('skill')} data-testid="button-wage-skill">{t('Skill')}</button></div></div>}>
      {wages.isError ? <QueryError label="wage data" retry={refresh} /> : wages.isLoading || wages.isFetching ? <LoadingLines count={5} /> : wageRows.length ? <div className="wage-layout">
         <div className="wage-chart" role="img" aria-label={t('Mean and median {category} wage values for {year}; units unspecified', { category: t(wageType), year: selectedWageYear })}><Suspense fallback={<LoadingLines count={5} />}><WageChart data={wageRows.map((d) => ({ ...d, label: d.category.length > 20 ? `${d.category.slice(0, 18)}…` : d.category }))} /></Suspense></div>
         <div className="wage-aside"><div className="unit-warning"><Info size={15} /><span>{t('Wage units are not specified in the supplied CSV. Values are shown without a currency or time-period label.')}</span></div><div className="wage-table-wrap"><table className="data-table"><thead><tr><th>{t('Category')}</th><th>{t('Median')}</th><th>{t('Mean')}</th></tr></thead><tbody>{wageRows.slice(0, 8).map((row, i) => <tr key={`${row.date}-${row.category}-${i}`} data-testid={`row-wage-${i}`}><td>{row.category}</td><td>{fmt(row.medianWage, locale)}</td><td>{fmt(row.meanWage, locale)}</td></tr>)}</tbody></table></div></div>
      </div> : <EmptyState title="No wage observations" text="No observations are available for this category." />}
    </Panel>
    <div className="data-section-label section-spaced"><span>03</span><div><h2>{t('Skills-related underemployment')}</h2><p>{t('Supplied measures by age group')}</p></div><span className="section-source">{t('QUARTERLY SERIES')}</span></div>
    <Panel title="Underemployment by age" kicker="AGE GROUP COMPARISON" action={<div className="panel-actions"><CsvDownload label={`Download displayed underemployment ${measure} chart data as CSV`} filename={`future-ready-underemployment-${measure}.csv`} rows={underByDate.map(({ label: _label, ...row }) => row)} testId="button-download-underemployment-csv" /><div className="segmented-control" aria-label={t('Underemployment measure')}><button className={measure === 'rate' ? 'segment-active' : ''} onClick={() => setMeasure('rate')} data-testid="button-underemployment-rate">{t('Rate')}</button><button className={measure === 'persons' ? 'segment-active' : ''} onClick={() => setMeasure('persons')} data-testid="button-underemployment-persons">{t('Persons')}</button></div></div>}>
       {underemployment.isError ? <QueryError label="underemployment data" retry={refresh} /> : underemployment.isLoading || underemployment.isFetching ? <LoadingLines count={5} /> : underByDate.length ? <div className="under-chart" role="img" aria-label={t('Skills-related underemployment {measure} by age group', { measure: t(measure) })}>
        <div className="chart-legend"><span><i className="legend-dot teal" />15–24</span><span><i className="legend-dot gold" />25–34</span><span><i className="legend-dot blue" />35–44</span><span><i className="legend-dot coral" />45+</span><span><i className="legend-dot plum" />{t('Overall')}</span></div>
        <Suspense fallback={<LoadingLines count={5} />}><UnderemploymentChart data={underByDate} /></Suspense>
        <div className="under-table-wrap"><table className="data-table"><thead><tr><th>{t('Period')}</th><th>{t('Age 15–24')}</th><th>25–34</th><th>35–44</th><th>45+</th><th>{t('Overall')}</th></tr></thead><tbody>{underByDate.slice(-6).map((row, i) => <tr key={String(row.date)} data-testid={`row-underemployment-${i}`}><td>{String(row.label)}</td>{['15-24', '25-34', '35-44', '45+', 'overall'].map((age) => <td key={age}>{typeof row[age] === 'number' ? fmt(row[age] as number, locale) : '—'}</td>)}</tr>)}</tbody></table></div>
      </div> : <EmptyState title="No underemployment observations" text={`No ${measure} observations are available for this series.`} />}
       {underRows.length > 0 && <div className="chart-footnote">{t('Measure: {measure} · Age groups and values as supplied · CSV units not further specified', { measure: t(measure) })}</div>}
    </Panel>
     <div className="end-note"><ShieldCheck size={17} /><span>{t('National trend data is presented independently from the supplied job listings. No relationship between these datasets is implied.')}</span></div>
  </div>;
}

function Router() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><Shell><ErrorBoundary resetKey={location} FallbackComponent={PageLoadError}><Suspense key={location} fallback={<div className="page-wrap"><LoadingLines /></div>}><Switch><Route path="/" component={OverviewPage} /><Route path="/jobs" component={JobsPage} /><Route path="/workforce-data" component={WorkforcePage} /><Route path="/skill-gap" component={SkillGapPage} /><Route path="/skills-profile" component={SkillsProfilePage} /><Route path="/future-role-matching" component={FutureRoleMatchingPage} /><Route path="/reskilling-pathway" component={ReskillingPathwayPage} /><Route path="/market-intelligence" component={MarketIntelligencePage} /><Route path="/scenario-planning" component={ScenarioPlanningPage} /><Route component={NotFound} /></Switch></Suspense></ErrorBoundary></Shell></ErrorBoundary>;
}

function App() {
  return <LanguageProvider><QueryClientProvider client={client}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider></LanguageProvider>;
}

export default App;
