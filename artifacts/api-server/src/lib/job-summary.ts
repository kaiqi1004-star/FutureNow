import type { FutureReadyOverview, JobListing } from "@workspace/api-zod";

export function buildFutureReadyOverview(
  jobs: readonly JobListing[],
): FutureReadyOverview {
  const salaryRanges: FutureReadyOverview["salaryRanges"] = (
    ["software", "mechanical"] as const
  ).map((sector) => {
    const sectorJobs = jobs.filter((job) => job.sector === sector);
    const salaries = sectorJobs.flatMap((job) =>
      job.salaryMonthlyRm === null ? [] : [job.salaryMonthlyRm],
    );

    return {
      sector,
      disclosedCount: salaries.length,
      undisclosedCount: sectorJobs.length - salaries.length,
      minimumMonthlyRm: salaries.length ? Math.min(...salaries) : null,
      maximumMonthlyRm: salaries.length ? Math.max(...salaries) : null,
    };
  });

  const undisclosedSalaryCount = jobs.filter(
    (job) => job.salaryMonthlyRm === null,
  ).length;
  const undisclosedSalaryNote =
    undisclosedSalaryCount === 1
      ? "1 record does not disclose salary."
      : `${undisclosedSalaryCount} records do not disclose salary.`;

  return {
    totalJobs: jobs.length,
    softwareJobs: jobs.filter((job) => job.sector === "software").length,
    mechanicalJobs: jobs.filter((job) => job.sector === "mechanical").length,
    disclosedSalaryCount: jobs.filter(
      (job) => job.salaryMonthlyRm !== null,
    ).length,
    undisclosedSalaryCount,
    salaryRanges,
    dataNotes: [
      `The workbook contains a ${jobs.length}-record sample, not a representative measure of national job demand.`,
      `Job salaries are monthly RM when disclosed; ${undisclosedSalaryNote}`,
      "The workbook does not provide job locations, posting dates, or source URLs.",
      "The aggregate CSV files do not state wage currency/period or the scale of person counts.",
      "National labor-market series are broad context and do not measure demand for these sampled occupations.",
    ],
  };
}
