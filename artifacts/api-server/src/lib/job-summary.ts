import type { FutureReadyOverview, JobListing } from "@workspace/api-zod";

function salaryBounds(job: JobListing): [number, number] | null {
  if (job.salaryMonthlyRm !== null) {
    return [job.salaryMonthlyRm, job.salaryMonthlyRm];
  }
  const band = /^(\d+)-(\d+)$/.exec(job.salaryText?.trim() ?? "");
  return band ? [Number(band[1]), Number(band[2])] : null;
}

export function isSalaryDisclosed(job: JobListing): boolean {
  return salaryBounds(job) !== null;
}

export function buildFutureReadyOverview(
  jobs: readonly JobListing[],
): FutureReadyOverview {
  const salaryRanges: FutureReadyOverview["salaryRanges"] = (
    ["software", "mechanical"] as const
  ).map((sector) => {
    const sectorJobs = jobs.filter((job) => job.sector === sector);
    const salaries = sectorJobs.flatMap((job) => {
      const bounds = salaryBounds(job);
      return bounds ? [bounds] : [];
    });

    return {
      sector,
      disclosedCount: salaries.length,
      undisclosedCount: sectorJobs.length - salaries.length,
      minimumMonthlyRm: salaries.length ? Math.min(...salaries.map(([low]) => low)) : null,
      maximumMonthlyRm: salaries.length ? Math.max(...salaries.map(([, high]) => high)) : null,
    };
  });

  const undisclosedSalaryCount = jobs.filter(
    (job) => !isSalaryDisclosed(job),
  ).length;
  const undisclosedSalaryNote =
    undisclosedSalaryCount === 1
      ? "1 record does not disclose salary."
      : `${undisclosedSalaryCount} records do not disclose salary.`;

  const categories = [...new Set(jobs.map((job) => job.sector))];
  const distinctJobTitles = new Set(
    jobs.map((job) => job.title.trim().replace(/\s+/g, " ").toLowerCase()),
  ).size;
  const sourceUrlCount = jobs.filter((job) => Boolean(job.sourceUrl)).length;
  const missingSourceCount = jobs.filter((job) => !job.source.trim()).length;
  return {
    totalJobs: jobs.length,
    softwareJobs: jobs.filter((job) => job.sector === "software").length,
    mechanicalJobs: jobs.filter((job) => job.sector === "mechanical").length,
    distinctJobTitles,
    careerCategoryCount: categories.length,
    careerCategories: categories.map((category) => ({
      category,
      count: jobs.filter((job) => job.sector === category).length,
    })),
    disclosedSalaryCount: jobs.length - undisclosedSalaryCount,
    undisclosedSalaryCount,
    salaryRanges,
    dataNotes: [
      `The workbook contains a ${jobs.length}-record sample, not a representative measure of national job demand.`,
      `Job salaries are monthly RM when disclosed; ${undisclosedSalaryNote}`,
      `There are ${distinctJobTitles} distinct job titles across ${categories.length} title-derived career categories, not ${jobs.length} unique careers.`,
      `Original salary text is preserved, including salary bands; no midpoint is inferred.`,
      `The workbook supplies ${sourceUrlCount} source URLs but no locations or posting dates. ${missingSourceCount} source-name cells are blank and remain blank.`,
      "The aggregate CSV files do not state wage currency/period or the scale of person counts.",
      "National labor-market series are broad context and do not measure demand for these sampled occupations.",
    ],
  };
}
