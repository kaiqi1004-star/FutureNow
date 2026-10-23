export type ResourceAccess = 'free' | 'varies' | 'not-stated';
export type ResourceKind = 'course' | 'provider-catalogue';
export type ResourceMatchType = 'direct' | 'related' | 'catalogue-search';

export type LearningResource = {
  id: string;
  title: string;
  provider: string;
  url: string;
  kind: ResourceKind;
  access: ResourceAccess;
  accessNote: string;
  duration: string;
  credential: string;
  overview: string;
  lastVerifiedOn: string | null;
  verificationSource: string;
  matches: Array<{ patterns: string[]; type: ResourceMatchType; note?: string }>;
};

export type CandidateProvider = {
  name: string;
  url: string;
  verification: string;
  accessNote: string;
};

export type ResourceRecommendation = {
  resource: LearningResource;
  skills: Array<{ name: string; type: ResourceMatchType; note?: string }>;
};

export const resourceVerifiedOn = '2026-10-24';

export const candidateProviders: CandidateProvider[] = [
  {
    name: 'eLATiH',
    url: 'https://elatih.hrdcorp.gov.my/courses',
    verification: 'Catalogue link only. The course pages could not be read during this check, so no current course, cost, or availability is confirmed.',
    accessNote: 'Cost and access for a specific listing are not verified.',
  },
  {
    name: 'Microsoft Learn',
    url: 'https://learn.microsoft.com/en-us/training/browse/',
    verification: 'Official learning catalogue checked. Individual learning paths are described separately below where verified.',
    accessNote: 'Microsoft states its Learn training is free; exams or credentials are separate and not included in a learning path.',
  },
  {
    name: 'IBM SkillsBuild',
    url: 'https://skillsbuild.org/learning-catalog',
    verification: 'Official learning catalogue checked. No individual data course was confirmed in this check.',
    accessNote: 'IBM describes SkillsBuild learning as free, but verify eligibility and access for the exact listing.',
  },
  {
    name: 'AWS Skill Builder',
    url: 'https://skillbuilder.aws/search',
    verification: 'Official course search/catalogue link checked. The catalogue shows free and subscription access tiers; the selected course page was not readable in this check.',
    accessNote: 'Cost and access vary by listing; exams and subscriptions may be separate.',
  },
  {
    name: 'Cisco Networking Academy',
    url: 'https://www.netacad.com/catalogs/learn',
    verification: 'Official learning catalogue checked. Some free courses and their details are shown below; do not assume every listing or certification is free.',
    accessNote: 'Check the selected course and any certification separately.',
  },
  {
    name: 'Google Skillshop',
    url: 'https://skillshop.withgoogle.com/',
    verification: 'Official training catalogue checked. The Google Ads training page specifically states that its training is free and self-paced.',
    accessNote: 'The page does not give one duration for the catalogue; verify each course and credential.',
  },
  {
    name: 'HubSpot Academy',
    url: 'https://academy.hubspot.com/courses',
    verification: 'Official Academy catalogue and individual course pages checked.',
    accessNote: 'The verified courses below are labelled free; an account is offered to start.',
  },
  {
    name: 'freeCodeCamp',
    url: 'https://www.freecodecamp.org/learn/',
    verification: 'Official curriculum and certification pages checked.',
    accessNote: 'The verified certification announcements describe the learning and verified certification as free.',
  },
];

export const learningResources: LearningResource[] = [
  {
    id: 'microsoft-data-analytics',
    title: 'Get started with Microsoft data analytics',
    provider: 'Microsoft Learn',
    url: 'https://learn.microsoft.com/en-us/training/paths/data-analytics-microsoft/',
    kind: 'course',
    access: 'free',
    accessNote: 'Microsoft Learn says its training is free. Any certification exam is separate.',
    duration: '1 hr 28 min',
    credential: 'This learning path says it can help prepare for Microsoft Certified: Data Analyst Associate. The path itself does not award that certification.',
    overview: 'Four-module Power BI learning path introducing the data analyst role and how analytics tools support reports and dashboards.',
    lastVerifiedOn: resourceVerifiedOn,
    verificationSource: 'https://learn.microsoft.com/en-us/training/support/faq?pivots=general',
    matches: [{
      patterns: ['\\bdata analytics?\\b', '\\bdata analyst\\b', '\\bpower\\s*bi\\b', '\\bbusiness intelligence\\b', '\\bdata visualization\\b'],
      type: 'direct',
    }],
  },
  {
    id: 'microsoft-powerbi-prepare',
    title: 'Prepare data for analysis with Power BI',
    provider: 'Microsoft Learn',
    url: 'https://learn.microsoft.com/en-us/training/paths/prepare-data-power-bi/',
    kind: 'course',
    access: 'free',
    accessNote: 'Microsoft Learn says its training is free. Any certification exam is separate.',
    duration: '4 hr 33 min',
    credential: 'This learning path says it can help prepare for Microsoft Certified: Data Analyst Associate. The path itself does not award that certification.',
    overview: 'Three-module Power BI path covering Power Query, data sources, profiling, cleaning, and loading data.',
    lastVerifiedOn: resourceVerifiedOn,
    verificationSource: 'https://learn.microsoft.com/en-us/training/support/faq?pivots=general',
    matches: [{
      patterns: ['\\bpower\\s*bi\\b', '\\bpower query\\b', '\\bdata preparation\\b', '\\bdata cleaning\\b', '\\bdata analysis\\b'],
      type: 'direct',
    }],
  },
  {
    id: 'ibm-data-catalogue',
    title: 'IBM SkillsBuild course catalogue',
    provider: 'IBM SkillsBuild',
    url: 'https://skillsbuild.org/learning-catalog',
    kind: 'provider-catalogue',
    access: 'varies',
    accessNote: 'IBM describes SkillsBuild learning as free, but verify eligibility and access for the exact listing.',
    duration: 'Not stated for the catalogue.',
    credential: 'Not verified for a selected course.',
    overview: 'The IBM SkillsBuild catalogue is a starting point; an exact course covering this skill was not confirmed.',
    lastVerifiedOn: resourceVerifiedOn,
    verificationSource: 'https://skillsbuild.org/learning-catalog',
    matches: [{
      patterns: ['\\bdata preparation\\b', '\\bdata cleaning\\b', '\\bdata analysis\\b', '\\bdata analytics\\b', '\\bdata sets?\\b'],
      type: 'catalogue-search',
      note: 'A catalogue starting point only; verify that a current listing covers this skill.',
    }],
  },
  {
    id: 'cisco-python-essentials',
    title: 'Python Essentials 1',
    provider: 'Cisco Networking Academy',
    url: 'https://www.netacad.com/courses/python-essentials-1?courseLang=en-US',
    kind: 'course',
    access: 'free',
    accessNote: 'The Cisco course listing labels it free. Self-paced online and instructor-led options are shown.',
    duration: '30 hours',
    credential: 'The page lists a Python Essentials 1 achievement badge; check the current completion requirements with Cisco.',
    overview: 'Beginner course covering fundamental programming concepts with the Python language.',
    lastVerifiedOn: resourceVerifiedOn,
    verificationSource: 'https://www.netacad.com/courses/python-essentials-1?courseLang=en-US',
    matches: [{
      patterns: ['\\bpython\\b'],
      type: 'direct',
    }],
  },
  {
    id: 'cisco-intro-cybersecurity',
    title: 'Introduction to Cybersecurity',
    provider: 'Cisco Networking Academy',
    url: 'https://www.netacad.com/courses/introduction-to-cybersecurity?courseLang=en-US',
    kind: 'course',
    access: 'free',
    accessNote: 'The Cisco course listing labels this introductory course free.',
    duration: '6 hours',
    credential: 'The page lists an Introduction to Cybersecurity achievement badge; check the current completion requirements with Cisco.',
    overview: 'Introductory overview of cybersecurity basics and organizational security challenges; it is not an application-security specialization.',
    lastVerifiedOn: resourceVerifiedOn,
    verificationSource: 'https://www.netacad.com/courses/introduction-to-cybersecurity?courseLang=en-US',
    matches: [
      { patterns: ['\\bcyber\\s*security\\b', '\\bcybersecurity\\b'], type: 'direct' },
      { patterns: ['\\bapplication security\\b'], type: 'related', note: 'A broad introductory cybersecurity course, not a specialist application-security course.' },
    ],
  },
  {
    id: 'google-ads-catalogue',
    title: 'Google Ads training catalogue',
    provider: 'Google Skillshop',
    url: 'https://skillshop.withgoogle.com/googleads',
    kind: 'provider-catalogue',
    access: 'free',
    accessNote: 'The official page describes Google Ads training as free.',
    duration: 'Not stated for the catalogue.',
    credential: 'The page advertises Google Ads certifications; requirements and duration depend on the selected learning item.',
    overview: 'Google Ads training catalogue with self-paced e-learning and certification options. This is a catalogue page, not one selected course.',
    lastVerifiedOn: resourceVerifiedOn,
    verificationSource: 'https://skillshop.withgoogle.com/googleads',
    matches: [
      { patterns: ['\\bgoogle ads?\\b', '\\bpaid search\\b', '\\bsearch ads?\\b'], type: 'direct' },
      { patterns: ['\\bsem\\b', '\\bsearch engine marketing\\b'], type: 'related', note: 'Google Ads is one search-ad platform; this catalogue does not cover every SEM tool or task.' },
    ],
  },
  {
    id: 'hubspot-social-media',
    title: 'Social Media Marketing Certification Course',
    provider: 'HubSpot Academy',
    url: 'https://academy.hubspot.com/courses/social-media',
    kind: 'course',
    access: 'free',
    accessNote: 'The course page labels it a free certification course; HubSpot offers account sign-up to begin.',
    duration: '5 hours',
    credential: 'HubSpot Academy certification course.',
    overview: 'Social-media strategy, engaging content, audience reach, and measuring return on investment.',
    lastVerifiedOn: resourceVerifiedOn,
    verificationSource: 'https://academy.hubspot.com/certification-overview',
    matches: [{
      patterns: ['\\bsocial media\\b', '\\bsocial-media\\b'],
      type: 'direct',
    }],
  },
  {
    id: 'hubspot-digital-marketing',
    title: 'Digital Marketing Certification Course',
    provider: 'HubSpot Academy',
    url: 'https://academy.hubspot.com/courses/digital-marketing',
    kind: 'course',
    access: 'free',
    accessNote: 'The course page labels it a free certification course; HubSpot offers account sign-up to begin.',
    duration: '3 hours',
    credential: 'HubSpot Academy certification course.',
    overview: 'A digital marketing strategy course that includes SEO, social media, email, and content for users and search engines.',
    lastVerifiedOn: resourceVerifiedOn,
    verificationSource: 'https://academy.hubspot.com/certification-overview',
    matches: [
      { patterns: ['\\bdigital marketing\\b', '\\bseo\\b', '\\bsearch engine optimization\\b'], type: 'direct' },
      { patterns: ['\\bemail marketing\\b'], type: 'direct' },
    ],
  },
  {
    id: 'hubspot-content-marketing',
    title: 'Content Marketing Certification Course',
    provider: 'HubSpot Academy',
    url: 'https://academy.hubspot.com/courses/content-marketing',
    kind: 'course',
    access: 'free',
    accessNote: 'HubSpot labels this a free certification course.',
    duration: '8 hours',
    credential: 'HubSpot Academy certification course.',
    overview: 'HubSpot course on content marketing.',
    lastVerifiedOn: resourceVerifiedOn,
    verificationSource: 'https://academy.hubspot.com/certification-overview',
    matches: [{
      patterns: ['\\bcontent marketing\\b'],
      type: 'direct',
    }],
  },
  {
    id: 'fcc-responsive-web-design',
    title: 'Responsive Web Design Certification',
    provider: 'freeCodeCamp',
    url: 'https://www.freecodecamp.org/learn/responsive-web-design-v9/',
    kind: 'course',
    access: 'free',
    accessNote: 'freeCodeCamp states that its verified certification is free.',
    duration: 'Not stated by the provider.',
    credential: 'Free verified certification after five required projects and the certification exam.',
    overview: 'HTML and CSS fundamentals, accessible design, modern layout, and responsive web development.',
    lastVerifiedOn: resourceVerifiedOn,
    verificationSource: 'https://www.freecodecamp.org/news/freecodecamps-new-responsive-web-design-certification-is-now-live',
    matches: [{
      patterns: ['\\bhtml\\b', '\\bhtml5\\b', '\\bcss\\b', '\\bweb design\\b', '\\bresponsive design\\b'],
      type: 'direct',
    }],
  },
  {
    id: 'fcc-javascript',
    title: 'JavaScript Certification',
    provider: 'freeCodeCamp',
    url: 'https://www.freecodecamp.org/learn/javascript-v9/',
    kind: 'course',
    access: 'free',
    accessNote: 'freeCodeCamp states that its verified certifications are free.',
    duration: 'Not stated by the provider.',
    credential: 'The course page requires five projects and a certification exam.',
    overview: 'JavaScript programming fundamentals and practical interactive curriculum.',
    lastVerifiedOn: resourceVerifiedOn,
    verificationSource: 'https://www.freecodecamp.org/learn/',
    matches: [{
      patterns: ['\\bjavascript\\b', '\\bjs\\b'],
      type: 'direct',
    }],
  },
  {
    id: 'fcc-python',
    title: 'Python Certification',
    provider: 'freeCodeCamp',
    url: 'https://www.freecodecamp.org/learn/python-v9/',
    kind: 'course',
    access: 'free',
    accessNote: 'freeCodeCamp states that this verified certification is free.',
    duration: 'Not stated by the provider.',
    credential: 'Free verified certification after five required projects and the certification exam.',
    overview: 'Python programming fundamentals and project-based practice.',
    lastVerifiedOn: resourceVerifiedOn,
    verificationSource: 'https://www.freecodecamp.org/news/freecodecamps-new-python-certification-is-now-live/',
    matches: [{
      patterns: ['\\bpython\\b'],
      type: 'direct',
    }],
  },
  {
    id: 'fcc-relational-databases',
    title: 'Relational Databases Certification',
    provider: 'freeCodeCamp',
    url: 'https://www.freecodecamp.org/learn/relational-databases-v9/',
    kind: 'course',
    access: 'free',
    accessNote: 'freeCodeCamp states that this verified certification is free.',
    duration: 'Not stated by the provider.',
    credential: 'Free verified certification after five required projects and the certification exam.',
    overview: 'Relational database fundamentals, including SQL and database projects.',
    lastVerifiedOn: resourceVerifiedOn,
    verificationSource: 'https://www.freecodecamp.org/news/freecodecamps-new-relational-databases-certification-is-now-live',
    matches: [{
      patterns: ['\\bsql\\b', '\\bdatabase\\b', '\\bpostgres(?:ql)?\\b', '\\bmysql\\b', '\\brelational database\\b'],
      type: 'direct',
    }],
  },
  {
    id: 'elatih-catalogue',
    title: 'eLATiH course catalogue',
    provider: 'eLATiH',
    url: 'https://elatih.hrdcorp.gov.my/courses',
    kind: 'provider-catalogue',
    access: 'not-stated',
    accessNote: 'The current catalogue listing and its course pricing could not be verified in this check. Confirm the exact course before planning around it.',
    duration: 'Not stated.',
    credential: 'Not verified.',
    overview: 'Browse the provider catalogue for the exact source-listed skill. This is an unverified search starting point, not a confirmed course recommendation.',
    lastVerifiedOn: null,
    verificationSource: 'https://elatih.hrdcorp.gov.my/courses',
    matches: [{ patterns: ['.*'], type: 'catalogue-search', note: 'The catalogue page was not readable in this check; a relevant course may not be available.' }],
  },
  {
    id: 'aws-catalogue',
    title: 'AWS Skill Builder course catalogue',
    provider: 'AWS Skill Builder',
    url: 'https://skillbuilder.aws/search',
    kind: 'provider-catalogue',
    access: 'varies',
    accessNote: 'The catalogue shows free and subscription access tiers; check the cost and access tier of the exact selected listing.',
    duration: 'Not stated for the catalogue.',
    credential: 'Not verified for a selected course.',
    overview: 'Search AWS learning content for the exact AWS/cloud skill listed in the job record. This is a catalogue link, not a verified course.',
    lastVerifiedOn: resourceVerifiedOn,
    verificationSource: 'https://skillbuilder.aws/search',
    matches: [{
      patterns: ['\\baws\\b', '\\bamazon web services\\b', '\\bcloud computing\\b', '\\bcloud infrastructure\\b'],
      type: 'catalogue-search',
      note: 'A catalogue starting point only; no exact course was verified.',
    }],
  },
];

export const accessLabels: Record<ResourceAccess, string> = {
  free: 'Free',
  varies: 'Varies by listing',
  'not-stated': 'Not verified',
};

export function findResourceMatch(resource: LearningResource, skill: string) {
  return resource.matches.find((match) =>
    match.patterns.some((pattern) => new RegExp(pattern, 'i').test(skill)),
  );
}

export function buildResourceRecommendations(
  skills: string[],
  options: { provider?: string; access?: ResourceAccess | 'all' } = {},
): ResourceRecommendation[] {
  const recommendations = new Map<string, ResourceRecommendation>();
  for (const skill of skills) {
    for (const resource of learningResources) {
      if (options.provider && options.provider !== 'all' && resource.provider !== options.provider) continue;
      if (options.access && options.access !== 'all' && resource.access !== options.access) continue;
      const match = findResourceMatch(resource, skill);
      if (!match) continue;
      const recommendation = recommendations.get(resource.id) ?? { resource, skills: [] };
      if (!recommendation.skills.some((item) => item.name === skill)) {
        recommendation.skills.push({ name: skill, type: match.type, note: match.note });
      }
      recommendations.set(resource.id, recommendation);
    }
  }
  return [...recommendations.values()];
}
