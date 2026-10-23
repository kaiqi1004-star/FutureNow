import Papa from "papaparse";

export const OPENDOSM_LABOUR_CATALOGUE_URL =
  "https://open.dosm.gov.my/data-catalogue/lfs_month";
export const OPENDOSM_LABOUR_CSV_URL =
  "https://storage.dosm.gov.my/labour/lfs_month.csv";
export const LABOUR_MARKET_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
export const LABOUR_MARKET_RETRY_COOLDOWN_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 15_000;

const requiredColumns = [
  "date",
  "lf",
  "lf_employed",
  "lf_unemployed",
  "lf_outside",
  "p_rate",
  "ep_ratio",
  "u_rate",
] as const;
const rateColumns = new Set(["p_rate", "ep_ratio", "u_rate"]);
const rowWidthErrors = new Set(["TooManyFields", "TooFewFields"]);

export type LabourMarketObservation = {
  date: string;
  lf: number;
  lf_employed: number;
  lf_unemployed: number;
  lf_outside: number;
  p_rate: number;
  ep_ratio: number;
  u_rate: number;
};

export type LabourMarketCsvResult = {
  observations: LabourMarketObservation[];
  rowsReceived: number;
  rowsValid: number;
  rejectedRows: number;
  ignoredColumns: string[];
};

export type LabourMarketData = LabourMarketCsvResult & {
  sourceName: string;
  datasetName: string;
  catalogueUrl: string;
  csvUrl: string;
  latestObservationDate: string;
  catalogueLastUpdated: string | null;
  catalogueNextUpdate: string | null;
  catalogueMetadataError: string | null;
  retrievedAt: string;
  cacheState: "fresh" | "stale";
  refreshError: string | null;
};

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;
type CatalogueMetadata = {
  catalogueLastUpdated: string | null;
  catalogueNextUpdate: string | null;
};

function isMonthStartDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-01$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function parseNonNegativeNumber(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseLabourMarketCsv(csv: string): LabourMarketCsvResult {
  if (!csv.trim()) throw new Error("The OpenDOSM CSV was empty.");

  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true,
    dynamicTyping: false,
    skipEmptyLines: "greedy",
  });
  const fields = parsed.meta.fields ?? [];
  if (!fields.length) throw new Error("The OpenDOSM CSV did not contain a header row.");

  const missingColumns = requiredColumns.filter((column) => !fields.includes(column));
  if (missingColumns.length) {
    throw new Error(`The OpenDOSM CSV is missing required columns: ${missingColumns.join(", ")}.`);
  }

  const structuralRowErrors = new Set<number>();
  const fatalErrors = parsed.errors.filter((error) => {
    if (rowWidthErrors.has(error.code) && typeof error.row === "number") {
      structuralRowErrors.add(error.row);
      return false;
    }
    return true;
  });
  if (fatalErrors.length) {
    throw new Error(`The OpenDOSM CSV could not be parsed: ${fatalErrors[0]?.message ?? "unknown CSV error"}.`);
  }

  const ignoredColumns = fields.filter(
    (field) => !requiredColumns.includes(field as (typeof requiredColumns)[number]),
  );
  const observations: LabourMarketObservation[] = [];
  const seenDates = new Set<string>();
  let rejectedRows = 0;

  parsed.data.forEach((row, rowIndex) => {
    if (structuralRowErrors.has(rowIndex)) {
      rejectedRows += 1;
      return;
    }

    const date = typeof row.date === "string" ? row.date.trim() : "";
    const values = new Map<string, number>();
    let valid = isMonthStartDate(date);

    for (const column of requiredColumns.slice(1)) {
      const value = parseNonNegativeNumber(row[column]);
      if (
        value === null ||
        (rateColumns.has(column) && value > 100)
      ) {
        valid = false;
      } else {
        values.set(column, value);
      }
    }

    if (!valid || seenDates.has(date)) {
      rejectedRows += 1;
      return;
    }
    seenDates.add(date);
    observations.push({
      date,
      lf: values.get("lf")!,
      lf_employed: values.get("lf_employed")!,
      lf_unemployed: values.get("lf_unemployed")!,
      lf_outside: values.get("lf_outside")!,
      p_rate: values.get("p_rate")!,
      ep_ratio: values.get("ep_ratio")!,
      u_rate: values.get("u_rate")!,
    });
  });

  observations.sort((a, b) => a.date.localeCompare(b.date));
  if (!observations.length) {
    throw new Error("The OpenDOSM CSV contained no valid monthly observations.");
  }

  return {
    observations,
    rowsReceived: parsed.data.length,
    rowsValid: observations.length,
    rejectedRows,
    ignoredColumns,
  };
}

function decodeHtmlText(value: string): string {
  return value
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'");
}

function findCatalogueDate(text: string, label: "Last updated" | "Next update"): string | null {
  const expression = new RegExp(
    `${label}\\s*:?\\s*(\\d{1,2}\\s+[A-Za-z]{3}\\s+\\d{4},?\\s+\\d{1,2}:\\d{2})`,
    "gi",
  );
  return expression.exec(text)?.[1]?.trim() ?? null;
}

export function parseOpenDosmCatalogueMetadata(html: string): CatalogueMetadata {
  const text = decodeHtmlText(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " "),
  );
  return {
    catalogueLastUpdated: findCatalogueDate(text, "Last updated"),
    catalogueNextUpdate: findCatalogueDate(text, "Next update"),
  };
}

function messageFor(error: unknown): string {
  return error instanceof Error ? error.message : "The source request failed unexpectedly.";
}

async function fetchText(fetcher: Fetcher, url: string, label: string): Promise<string> {
  let response: Response;
  try {
    response = await fetcher(url, {
      headers: { accept: "text/csv,text/html;q=0.9,*/*;q=0.8" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new Error(`${label} request failed: ${messageFor(error)}`);
  }
  if (!response.ok) throw new Error(`${label} request returned HTTP ${response.status}.`);
  try {
    return await response.text();
  } catch (error) {
    throw new Error(`${label} response could not be read: ${messageFor(error)}`);
  }
}

export function createLabourMarketRepository(
  fetcher: Fetcher = globalThis.fetch,
  now: () => Date = () => new Date(),
) {
  let cached: LabourMarketData | null = null;
  let inFlight: Promise<LabourMarketData> | null = null;
  let retryNotBefore = 0;
  let lastRefreshError: string | null = null;

  async function retrieveFreshData(): Promise<LabourMarketData> {
    const [csvResult, catalogueResult] = await Promise.allSettled([
      fetchText(fetcher, OPENDOSM_LABOUR_CSV_URL, "OpenDOSM CSV"),
      fetchText(fetcher, OPENDOSM_LABOUR_CATALOGUE_URL, "OpenDOSM catalogue"),
    ]);
    if (csvResult.status === "rejected") throw csvResult.reason;

    const parsed = parseLabourMarketCsv(csvResult.value);
    let catalogueLastUpdated: string | null = null;
    let catalogueNextUpdate: string | null = null;
    let catalogueMetadataError: string | null = null;

    if (catalogueResult.status === "fulfilled") {
      const metadata = parseOpenDosmCatalogueMetadata(catalogueResult.value);
      catalogueLastUpdated = metadata.catalogueLastUpdated;
      catalogueNextUpdate = metadata.catalogueNextUpdate;
      if (!catalogueLastUpdated) {
        catalogueMetadataError = "The catalogue response did not include a readable last-updated date.";
      }
    } else {
      catalogueMetadataError = `Catalogue update metadata is unavailable: ${messageFor(catalogueResult.reason)}`;
    }

    const observations = parsed.observations;
    return {
      sourceName: "Department of Statistics Malaysia (DOSM)",
      datasetName: "Monthly Principal Labour Force Statistics",
      catalogueUrl: OPENDOSM_LABOUR_CATALOGUE_URL,
      csvUrl: OPENDOSM_LABOUR_CSV_URL,
      latestObservationDate: observations[observations.length - 1]!.date,
      catalogueLastUpdated,
      catalogueNextUpdate,
      catalogueMetadataError,
      retrievedAt: now().toISOString(),
      cacheState: "fresh",
      refreshError: null,
      ...parsed,
    };
  }

  function staleCopy(error: unknown): LabourMarketData {
    lastRefreshError = messageFor(error);
    retryNotBefore = now().getTime() + LABOUR_MARKET_RETRY_COOLDOWN_MS;
    return {
      ...cached!,
      cacheState: "stale",
      refreshError: lastRefreshError,
    };
  }

  async function getData(forceRefresh = false): Promise<LabourMarketData> {
    const currentTime = now().getTime();
    if (
      !forceRefresh &&
      cached &&
      currentTime - Date.parse(cached.retrievedAt) < LABOUR_MARKET_CACHE_TTL_MS
    ) {
      return { ...cached, cacheState: "fresh", refreshError: null };
    }
    if (inFlight) return inFlight;
    if (!forceRefresh && cached && currentTime < retryNotBefore) {
      return { ...cached, cacheState: "stale", refreshError: lastRefreshError };
    }

    const request = retrieveFreshData()
      .then((data) => {
        cached = data;
        retryNotBefore = 0;
        lastRefreshError = null;
        return data;
      })
      .catch((error: unknown) => {
        if (cached) return staleCopy(error);
        throw error;
      });
    inFlight = request;

    try {
      return await request;
    } finally {
      if (inFlight === request) inFlight = null;
    }
  }

  return { getData };
}

export const labourMarketRepository = createLabourMarketRepository();
