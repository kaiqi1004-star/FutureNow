export interface ExperienceFit {
  status: "below_requirement" | "meets_numeric_minimum" | "not_comparable" | "not_provided";
  minimumYears: number | null;
  message: string;
}

/** A separate, deliberately conservative comparison. Never used in skill scores. */
export function assessExperience(years: number | "" | null | undefined, requirement?: string | null): ExperienceFit {
  if (years === "" || years == null || !Number.isFinite(years) || years < 0) {
    return { status: "not_provided", minimumYears: null, message: "Experience comparison unavailable: add your stated years of experience to your profile. The skill score is unchanged." };
  }
  const text = requirement?.normalize("NFKC").trim() ?? "";
  const matches = [...text.matchAll(/(\d+(?:\.\d+)?)\s*(?:[-–—]\s*(\d+(?:\.\d+)?))?\s*\+?\s*years?\b/gi)];
  if (matches.length !== 1 || /prefer|fresh grad|alternativ|less than|more than|up to|at most|maximum|may be considered|\bor\b/i.test(text)) {
    return { status: "not_comparable", minimumYears: null, message: "Experience needs manual comparison: the source is unspecified, non-numeric, preferred, conditional, or describes alternative paths. No numerical experience-fit conclusion is made." };
  }
  const minimumYears = Number(matches[0][1]);
  const below = years < minimumYears;
  return {
    status: below ? "below_requirement" : "meets_numeric_minimum",
    minimumYears,
    message: below
      ? `Experience-fit warning: you stated ${years} years; this listing states a minimum or range starting at ${minimumYears} years. Your total stated experience is below that threshold. The skill score is unchanged; review the original listing for exceptions and relevant-domain requirements.`
      : `Your stated ${years} years meets the numeric threshold of ${minimumYears} years only. This does not verify relevant-domain experience, leadership, portfolio requirements, or eligibility.`,
  };
}
