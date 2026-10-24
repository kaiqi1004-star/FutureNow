export const skillCategories = [
  'Broad Technical Areas',
  'Technical Skills',
  'Industry-Specific Skills',
  'Digital Skills',
  'Soft Skills',
  'Languages',
] as const;

export type SkillCategory = (typeof skillCategories)[number];

// Presets are grounded in the supplied job requirements where possible.
// Broad areas help users browse but are deliberately excluded from scoring.
export const skillGroups = [
  { label: 'Broad Technical Areas', category: 'Broad Technical Areas', broad: true, skills: ['Programming', 'Web development', 'Database management', 'Data analysis', 'AI tools', 'Cloud computing', 'Cybersecurity', 'Engineering-related skills', 'Other technical skills'] },
  { label: 'Programming and software', category: 'Technical Skills', skills: ['Python', 'JavaScript', 'TypeScript', 'Java', 'C#', 'HTML', 'CSS', 'React', 'Angular', 'Next.js', 'Node.js', 'PHP', 'Laravel', '.NET Core', 'ASP.NET MVC', 'object-oriented programming (OOP)', 'software development', 'debugging', 'software testing', 'unit testing', 'software implementation', 'technical documentation', 'Git', 'RESTful APIs', 'CI/CD'] },
  { label: 'Data and databases', category: 'Technical Skills', skills: ['SQL', 'MySQL', 'PostgreSQL', 'MS SQL Server', 'database design', 'Data Modelling', 'data visualization', 'Power BI', 'Tableau', 'Data Pipelines', 'ETL', 'Statistics', 'Pandas', 'NumPy', 'Looker Studio'] },
  { label: 'AI, cloud and infrastructure', category: 'Technical Skills', skills: ['Generative AI', 'AI Algorithms', 'AI-powered Content Creation', 'cloud deployment', 'Microsoft Azure', 'Linux', 'Shell scripting', 'Docker', 'Kubernetes', 'Azure DevOps', 'application security', 'system/network/server maintenance'] },
  { label: 'Engineering and industrial work', category: 'Industry-Specific Skills', skills: ['SolidWorks', 'CAD drawings', 'mechanical design', 'automation systems', 'robotics', 'maintenance', 'troubleshooting', 'technical drawings', 'quality control', 'project coordination', '3D modelling', 'mechanical drawings', 'preventive maintenance', 'manufacturing processes', 'Design for Manufacturing (DFM)', 'engineering calculations', 'PCB'] },
  { label: 'Digital marketing', category: 'Industry-Specific Skills', skills: ['SEO', 'SEM', 'Google Ads', 'Meta Ads', 'GA4', 'Google Tag Manager', 'Campaign Analytics', 'Content Marketing', 'Social Media Marketing', 'Canva', 'Adobe Photoshop', 'Adobe Illustrator', 'A/B Testing', 'Marketing Automation', 'Thai-language Copywriting'] },
  { label: 'Human resources', category: 'Industry-Specific Skills', skills: ['Recruitment', 'Payroll', 'Employment Law', 'Onboarding', 'CV Screening', 'Interviewing', 'HR Software', 'EPF', 'SOCSO', 'EIS', 'Training Coordination'] },
  { label: 'Accounting and finance', category: 'Industry-Specific Skills', skills: ['Full-set Accounts', 'Financial Reporting', 'General Ledger', 'Account Reconciliation', 'Taxation', 'SST', 'E-Invoice', 'Accounting Software', 'ERP Systems', 'MFRS', 'IFRS', 'Cash Flow Management', 'Month-end Closing'] },
  { label: 'Digital productivity', category: 'Digital Skills', skills: ['Digital literacy', 'Productivity tools', 'Online collaboration', 'Microsoft Office', 'Microsoft Word', 'Microsoft Excel', 'Google Sheets', 'Gantt charts'] },
  { label: 'Soft skills', category: 'Soft Skills', skills: ['Communication', 'Teamwork', 'Problem-solving', 'Critical thinking', 'Leadership', 'Creativity', 'Adaptability', 'Analytical Thinking', 'Attention to Detail', 'Independent working', 'Time Management', 'Mentoring', 'technical communication', 'Client communication', 'Project Management', 'Organisation', 'Confidentiality', 'Negotiation'] },
  { label: 'Languages', category: 'Languages', skills: ['Bahasa Melayu', 'English Communication', 'Mandarin', 'communication in Mandarin and English', 'Japanese-English communication'] },
] satisfies Array<{ label: string; category: SkillCategory; broad?: boolean; skills: string[] }>;

export const BROAD_TECHNICAL_AREAS = new Set(skillGroups.find((group) => group.broad)?.skills ?? []);

export function isBroadTechnicalArea(name: string): boolean {
  const normalized = name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
  return [...BROAD_TECHNICAL_AREAS].some((area) =>
    area.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en') === normalized,
  );
}
