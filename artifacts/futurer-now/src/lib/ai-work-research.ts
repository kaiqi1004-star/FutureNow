export type AIWorkResearchFinding = {
  value: string;
  statement: string;
  denominator: string;
};

export type AIWorkResearchItem = {
  id: string;
  title: string;
  publisher: string;
  publishedOn: string;
  url: string;
  scope: string;
  caveat: string;
  findings: AIWorkResearchFinding[];
  isLiveFeed: false;
};

export const aiWorkResearch: AIWorkResearchItem[] = [
  {
    id: "microsoft-work-trend-index-malaysia-2026",
    title: "Microsoft’s 2026 Work Trend Index: Malaysian workforce is ready for AI and organizations must keep pace",
    publisher: "Microsoft Source Asia",
    publishedOn: "2026-06-23",
    url: "https://news.microsoft.com/source/asia/features/microsofts-2026-work-trend-index-malaysian-workforce-is-ready-for-ai-and-organizations-must-keep-pace",
    scope: "Microsoft says the study surveyed 2,000 full-time employed and self-employed knowledge workers in Malaysia and analyzed anonymized Microsoft 365 productivity signals.",
    caveat: "This is a dated publisher-reported study, not an official national labour statistic or live feed. The knowledge-worker and AI-user findings should not be generalized to every Malaysian worker.",
    findings: [
      {
        value: "24%",
        statement: "of workers in Malaysia were classified by the study as Frontier Professionals.",
        denominator: "Microsoft reports 16% globally for the same study category.",
      },
      {
        value: "69%",
        statement: "of AI users in Malaysia said they are producing work they could not have created a year earlier.",
        denominator: "Among AI users surveyed in Malaysia.",
      },
      {
        value: "92%",
        statement: "of AI users in Malaysia said they treat AI output as a starting point rather than the final answer.",
        denominator: "Among AI users surveyed in Malaysia.",
      },
      {
        value: "32%",
        statement: "of AI users in Malaysia said leadership is clearly and consistently aligned on AI.",
        denominator: "Among AI users surveyed in Malaysia.",
      },
      {
        value: "19%",
        statement: "said they are rewarded for reinventing how work is done when efforts do not immediately produce results.",
        denominator: "Among AI users in Malaysia.",
      },
    ],
    isLiveFeed: false,
  },
];
