import type { UnemploymentObservation, WageObservation } from '@workspace/api-client-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import { useTranslation } from '../lib/i18n';

type UnemploymentData = (UnemploymentObservation & { label: string })[];
type WageData = (WageObservation & { label: string })[];

// Rendering only: filtering, labels, units and data states remain with the pages.
export function OverviewChart({ data }: { data: UnemploymentData }) {
  const { t } = useTranslation();
  return <ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 10, right: 8, left: -24, bottom: 0 }}><CartesianGrid stroke="var(--chart-grid)" vertical={false} /><XAxis dataKey="label" tick={{ fill: 'var(--chart-tick)', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={28} /><YAxis tick={{ fill: 'var(--chart-tick)', fontSize: 10 }} axisLine={false} tickLine={false} unit="%" /><Tooltip contentStyle={{ background: 'var(--tooltip-bg)', border: '1px solid var(--border)', borderRadius: 9, fontSize: 12 }} /><Line type="monotone" dataKey="rateAge15To24" name={t('Age 15–24')} stroke="var(--teal)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} /><Line type="monotone" dataKey="rateAge15To30" name={t('Age 15–30')} stroke="var(--gold-deep)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} /></LineChart></ResponsiveContainer>;
}

export function UnemploymentChart({ data }: { data: UnemploymentData }) {
  const { t } = useTranslation();
  return <ResponsiveContainer width="100%" height={290}><LineChart data={data} margin={{ top: 10, right: 12, left: -12, bottom: 4 }}><CartesianGrid stroke="var(--chart-grid)" vertical={false} /><XAxis dataKey="label" tick={{ fill: 'var(--chart-tick)', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={32} /><YAxis tick={{ fill: 'var(--chart-tick)', fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: 'var(--tooltip-bg)', border: '1px solid var(--border)', borderRadius: 9, fontSize: 12 }} /><Line dataKey="rateAge15To24" name={t('Rate · age 15–24')} stroke="var(--teal)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} /><Line dataKey="rateAge15To30" name={t('Rate · age 15–30')} stroke="var(--gold-deep)" strokeWidth={2.3} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} /></LineChart></ResponsiveContainer>;
}

export function WageChart({ data }: { data: WageData }) {
  const { t } = useTranslation();
  return <ResponsiveContainer width="100%" height={310}><BarChart data={data} layout="vertical" margin={{ top: 2, right: 18, left: 8, bottom: 2 }}><CartesianGrid stroke="var(--chart-grid)" horizontal={false} /><XAxis type="number" tick={{ fill: 'var(--chart-tick)', fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="label" width={126} tick={{ fill: 'var(--chart-tick)', fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: 'var(--tooltip-bg)', border: '1px solid var(--border)', borderRadius: 9, fontSize: 12 }} /><Bar dataKey="medianWage" name={t('Median wage')} fill="var(--teal)" radius={[0, 4, 4, 0]} isAnimationActive={false} /><Bar dataKey="meanWage" name={t('Mean wage')} fill="var(--gold-deep)" radius={[0, 4, 4, 0]} isAnimationActive={false} /></BarChart></ResponsiveContainer>;
}

export function UnderemploymentChart({ data }: { data: Record<string, string | number>[] }) {
  const { t } = useTranslation();
  return <ResponsiveContainer width="100%" height={280}><AreaChart data={data} margin={{ top: 12, right: 10, left: -10, bottom: 2 }}><CartesianGrid stroke="var(--chart-grid)" vertical={false} /><XAxis dataKey="label" tick={{ fill: 'var(--chart-tick)', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={30} /><YAxis tick={{ fill: 'var(--chart-tick)', fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: 'var(--tooltip-bg)', border: '1px solid var(--border)', borderRadius: 9, fontSize: 12 }} /><Area type="monotone" dataKey="15-24" name={t('Age 15–24')} stroke="var(--teal)" fill="var(--teal-soft)" strokeWidth={2} dot={false} isAnimationActive={false} /><Area type="monotone" dataKey="25-34" name={t('Age 25–34')} stroke="var(--gold-deep)" fill="var(--gold-soft)" strokeWidth={2} dot={false} isAnimationActive={false} /><Area type="monotone" dataKey="35-44" name={t('Age 35–44')} stroke="var(--blue)" fill="var(--blue-soft)" strokeWidth={2} dot={false} isAnimationActive={false} /><Area type="monotone" dataKey="45+" name={t('Age 45+')} stroke="var(--coral)" fill="var(--coral-soft)" strokeWidth={2} dot={false} isAnimationActive={false} /><Area type="monotone" dataKey="overall" name={t('Overall')} stroke="var(--plum)" fill="var(--plum-soft)" strokeWidth={2.5} dot={false} isAnimationActive={false} /></AreaChart></ResponsiveContainer>;
}
