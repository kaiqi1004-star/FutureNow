import { readFileSync } from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import { Router, type IRouter } from "express";
import {
  AnalyzeFutureReadySkillGapBody,
  AnalyzeFutureReadySkillGapResponse,
  MatchFutureReadyRolesBody,
  MatchFutureReadyRolesResponse,
  GetFutureReadyJobsResponse,
  GetFutureReadyOverviewResponse,
  GetFutureReadyUnderemploymentResponse,
  GetFutureReadyUnemploymentResponse,
  GetFutureReadyWagesResponse,
} from "@workspace/api-zod";
import { buildFutureReadyOverview } from "../lib/job-summary";
import { labourMarketRepository } from "../lib/labour-market";
import { calculateSkillGap } from "../lib/skill-gap";
import { matchRoles } from "../lib/role-matching";

const router: IRouter = Router();
const dataDirectory = path.resolve(process.cwd(), "data");

type CsvRow = Record<string, string>;

function readCsv(fileName: string): CsvRow[] {
  const csv = readFileSync(path.join(dataDirectory, fileName), "utf8");
  const parsed = Papa.parse<CsvRow>(csv, {
    header: true,
    dynamicTyping: false,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    throw new Error(
      `Could not parse ${fileName}: ${parsed.errors[0]?.message ?? "unknown CSV error"}`,
    );
  }

  return parsed.data;
}

function numberField(row: CsvRow, field: string): number {
  const value = Number(row[field]);
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid numeric value in ${field}`);
  }
  return value;
}

function isoDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  if (!match) throw new Error(`Unrecognized dataset date: ${value}`);

  const [, month, day, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function isoDayFirstDate(value: string): string {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  if (!match) throw new Error(`Unrecognized quarterly dataset date: ${value}`);

  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function loadJobs() {
  const contents = readFileSync(path.join(dataDirectory, "jobs.json"), "utf8");
  return GetFutureReadyJobsResponse.parse(JSON.parse(contents));
}

function loadUnemployment() {
  const rows = readCsv("youth-unemployment.csv");
  return rows.map((row) => ({
    date: isoDate(row.date),
    unemployedAge15To24: numberField(row, "unemployed_15_24"),
    unemployedAge15To30: numberField(row, "unemployed_15_30"),
    rateAge15To24: numberField(row, "u_rate_15_24"),
    rateAge15To30: numberField(row, "u_rate_15_30"),
  }));
}

function loadWages() {
  const occupationRows = readCsv("occupation-wages.csv").map((row) => ({
    date: isoDate(row.date),
    sex: row.sex,
    categoryType: "occupation" as const,
    category: row.occupation,
    recipients: numberField(row, "recipients"),
    medianWage: numberField(row, "wages_median"),
    meanWage: numberField(row, "wages_mean"),
  }));

  const skillRows = readCsv("skill-wages.csv").map((row) => ({
    date: isoDate(row.date),
    sex: row.sex,
    categoryType: "skill" as const,
    category: row.skill,
    recipients: numberField(row, "recipients"),
    medianWage: numberField(row, "wages_median"),
    meanWage: numberField(row, "wages_mean"),
  }));

  return [...occupationRows, ...skillRows];
}

function loadUnderemployment() {
  return readCsv("underemployment.csv").map((row) => ({
    date: isoDayFirstDate(row.date),
    measure: row.variable,
    age: row.age,
    value: numberField(row, "sru"),
  }));
}

router.get("/future-ready/overview", (_req, res): void => {
  res.json(
    GetFutureReadyOverviewResponse.parse(
      buildFutureReadyOverview(loadJobs()),
    ),
  );
});

router.get("/future-ready/jobs", (_req, res): void => {
  res.json(GetFutureReadyJobsResponse.parse(loadJobs()));
});

router.post("/future-ready/role-matches", (req, res): void => {
  const parsed = MatchFutureReadyRolesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Provide up to 150 saved skill names, each no longer than 100 characters." });
    return;
  }
  res.json(MatchFutureReadyRolesResponse.parse(matchRoles(loadJobs(), parsed.data.currentSkills, {
    experienceYears: parsed.data.experienceYears,
    educationLevel: parsed.data.educationLevel,
  })));
});

router.post("/future-ready/skill-gap", (req, res): void => {
  const parsed = AnalyzeFutureReadySkillGapBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn(
      { validationError: parsed.error.message },
      "Rejected invalid skill gap request",
    );
    res.status(400).json({ error: "The skill comparison request is invalid." });
    return;
  }

  const selectedJob = loadJobs().find((job) => job.id === parsed.data.jobId);
  if (!selectedJob) {
    res.status(404).json({ error: "The selected job record was not found." });
    return;
  }

  if (selectedJob.sector !== parsed.data.sector) {
    res.status(400).json({ error: "The selected job does not match the sector." });
    return;
  }

  res.json(
    AnalyzeFutureReadySkillGapResponse.parse(
      calculateSkillGap(selectedJob, parsed.data.currentSkills),
    ),
  );
});

router.get("/future-ready/unemployment", (_req, res): void => {
  res.json(
    GetFutureReadyUnemploymentResponse.parse(loadUnemployment()),
  );
});

router.get("/future-ready/wages", (_req, res): void => {
  res.json(GetFutureReadyWagesResponse.parse(loadWages()));
});

router.get("/future-ready/underemployment", (_req, res): void => {
  res.json(
    GetFutureReadyUnderemploymentResponse.parse(loadUnderemployment()),
  );
});

router.get("/future-ready/labour-market", async (req, res): Promise<void> => {
  try {
    res.json(await labourMarketRepository.getData());
  } catch (error) {
    req.log.error({ err: error }, "Could not retrieve OpenDOSM labour-force data");
    res.status(502).json({
      error: "OpenDOSM labour-force data could not be retrieved or validated. Try again later.",
    });
  }
});

router.post("/future-ready/labour-market/refresh", async (req, res): Promise<void> => {
  try {
    res.json(await labourMarketRepository.getData(true));
  } catch (error) {
    req.log.error({ err: error }, "OpenDOSM labour-force refresh failed");
    res.status(502).json({
      error: "OpenDOSM refresh failed and no successful cached data is available.",
    });
  }
});

export default router;
