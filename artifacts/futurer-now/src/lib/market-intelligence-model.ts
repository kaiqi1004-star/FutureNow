import type {
  JobListing,
  LabourMarketObservation,
} from "@workspace/api-client-react";

export const labourMetricDefinitions = [
  { key: "lf", label: "Labour force", unit: "thousand persons", changeUnit: "thousand persons" },
  { key: "lf_employed", label: "Employed persons", unit: "thousand persons", changeUnit: "thousand persons" },
  { key: "lf_unemployed", label: "Unemployed persons", unit: "thousand persons", changeUnit: "thousand persons" },
  { key: "lf_outside", label: "Outside the labour force", unit: "thousand persons", changeUnit: "thousand persons" },
  { key: "p_rate", label: "Participation rate", unit: "%", changeUnit: "percentage points" },
  { key: "ep_ratio", label: "Employment-population ratio", unit: "%", changeUnit: "percentage points" },
  { key: "u_rate", label: "Unemployment rate", unit: "%", changeUnit: "percentage points" },
] as const satisfies ReadonlyArray<{
  key: keyof Omit<LabourMarketObservation, "date">;
  label: string;
  unit: string;
  changeUnit: string;
}>;

export type LabourMarketComparison = {
  date: string;
  value: number;
  change: number;
  unit: string;
};

export type LabourMarketIndicator = {
  key: (typeof labourMetricDefinitions)[number]["key"];
  label: string;
  value: number;
  unit: string;
  monthOverMonth: LabourMarketComparison | null;
  yearOverYear: LabourMarketComparison | null;
};

function shiftMonth(date: string, difference: number): string {
  const [year, month] = date.split("-").map(Number);
  const absoluteMonth = year! * 12 + month! - 1 + difference;
  const shiftedYear = Math.floor(absoluteMonth / 12);
  const shiftedMonth = (absoluteMonth % 12) + 1;
  return `${shiftedYear}-${String(shiftedMonth).padStart(2, "0")}-01`;
}

export function buildLabourMarketIndicators(
  observations: LabourMarketObservation[],
): LabourMarketIndicator[] {
  const sorted = [...observations].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted.at(-1);
  if (!latest) return [];
  const byDate = new Map(sorted.map((observation) => [observation.date, observation]));

  return labourMetricDefinitions.map((metric) => {
    const previousMonthDate = shiftMonth(latest.date, -1);
    const previousYearDate = shiftMonth(latest.date, -12);
    const comparison = (date: string): LabourMarketComparison | null => {
      const previous = byDate.get(date);
      if (!previous) return null;
      const previousValue = previous[metric.key];
      const rawChange = latest[metric.key] - previousValue;
      return {
        date,
        value: previousValue,
        change: Math.round(rawChange * 10) / 10,
        unit: metric.changeUnit,
      };
    };

    return {
      key: metric.key,
      label: metric.label,
      value: latest[metric.key],
      unit: metric.unit,
      monthOverMonth: comparison(previousMonthDate),
      yearOverYear: comparison(previousYearDate),
    };
  });
}

export function selectLabourMarketWindow(
  observations: LabourMarketObservation[],
  months: number | "all",
): LabourMarketObservation[] {
  const sorted = [...observations].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted.at(-1);
  if (!latest || months === "all") return sorted;

  const cutoffDate = shiftMonth(latest.date, -(months - 1));
  return sorted.filter((observation) => observation.date >= cutoffDate);
}

const categoryLabels: Record<string, string> = {
  software: "Software",
  mechanical: "Mechanical",
  "data-analytics": "Data Analytics",
  "accounting-finance": "Accounting / Finance",
  "digital-marketing": "Digital Marketing",
  "human-resources": "HR",
};

export type SkillFrequency = { name: string; jobCount: number };

export type SuppliedJobSnapshot = {
  totalRecords: number;
  distinctTitles: number;
  categories: Array<{ key: string; label: string; count: number }>;
  topTechnicalSkills: SkillFrequency[];
  topSoftSkills: SkillFrequency[];
  jobsWithPostingDates: number;
  jobsWithoutPostingDates: number;
};

function countSkillMentions(
  jobs: JobListing[],
  field: "technicalSkills" | "softSkills",
): SkillFrequency[] {
  const counts = new Map<string, SkillFrequency>();

  for (const job of jobs) {
    const skills = new Map<string, string>();
    for (const rawSkill of job[field] ?? []) {
      const name = rawSkill.trim();
      if (name && !skills.has(name.toLocaleLowerCase())) {
        skills.set(name.toLocaleLowerCase(), name);
      }
    }
    for (const [key, name] of skills) {
      const current = counts.get(key);
      if (current) current.jobCount += 1;
      else counts.set(key, { name, jobCount: 1 });
    }
  }

  return [...counts.values()]
    .sort((a, b) => b.jobCount - a.jobCount || a.name.localeCompare(b.name))
    .slice(0, 10);
}

export function buildSuppliedJobSnapshot(jobs: JobListing[]): SuppliedJobSnapshot {
  const counts = new Map<string, number>();
  for (const job of jobs) counts.set(job.sector, (counts.get(job.sector) ?? 0) + 1);

  const categories = [...counts.entries()]
    .map(([key, count]) => ({
      key,
      label: categoryLabels[key] ?? key.replaceAll("-", " "),
      count,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  return {
    totalRecords: jobs.length,
    distinctTitles: new Set(jobs.map((job) => job.title.trim().toLocaleLowerCase())).size,
    categories,
    topTechnicalSkills: countSkillMentions(jobs, "technicalSkills"),
    topSoftSkills: countSkillMentions(jobs, "softSkills"),
    jobsWithPostingDates: jobs.filter((job) => Boolean(job.postingDate?.trim())).length,
    jobsWithoutPostingDates: jobs.filter((job) => !job.postingDate?.trim()).length,
  };
}
