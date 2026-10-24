import assert from 'node:assert/strict';
import { test } from 'node:test';
import { displaySkillName } from './skill-display.ts';
import { skillGroups } from './skill-catalogue.ts';

test('general professional concepts use shared localized display labels', () => {
  const concepts = [
    ['Communication', /komunikasi/i, '沟通能力'],
    ['Teamwork', /kerja berpasukan/i, '团队合作'],
    ['Problem-solving', /penyelesaian masalah/i, '解决问题'],
    ['Critical thinking', /pemikiran kritis/i, '批判性思维'],
    ['Attention to Detail', /ketelitian/i, '注重细节'],
    ['Time Management', /pengurusan masa/i, '时间管理'],
    ['Financial Reporting', /pelaporan kewangan/i, '财务报告'],
    ['General Ledger', /lejar am/i, '总账'],
    ['Recruitment', /pengambilan pekerja/i, '招聘'],
    ['Data visualization', /visualisasi data/i, '数据可视化'],
  ] as const;
  for (const [name, bm, cn] of concepts) {
    assert.equal(displaySkillName(name, 'EN'), name);
    assert.match(displaySkillName(name, 'BM'), bm);
    assert.equal(displaySkillName(name, 'CN'), cn);
  }
  assert.match(displaySkillName('debugging', 'CN'), /调试.*Debugging/);
  assert.equal(displaySkillName('object-oriented programming (OOP)', 'CN'), '面向对象编程（OOP）');
  assert.equal(displaySkillName('Search Engine Optimization (SEO)', 'CN'), '搜索引擎优化（SEO）');
});

test('technical names, brands, standards, custom skills and unknown names stay verbatim', () => {
  const protectedNames = [
    'Python', 'Java', 'JavaScript', 'TypeScript', 'C#', 'SQL', 'MySQL', 'PostgreSQL',
    'React', 'Angular', 'Next.js', 'Node.js', 'PHP', 'Git', 'GitHub', 'HTML', 'CSS',
    'API', 'CI/CD', 'Microsoft Excel', 'Google Sheets', 'Power BI', 'Tableau',
    'Microsoft Azure', 'Docker', 'Kubernetes', 'SAP', 'MFRS', 'IFRS', 'SST', 'EPF',
    'SOCSO', 'EIS', 'AI Tools (ChatGPT', 'Claude)',
  ];
  for (const language of ['EN', 'BM', 'CN'] as const) {
    for (const name of protectedNames) assert.equal(displaySkillName(name, language), name);
    for (const name of ['Communication', 'Recruitment', '技能自定义', 'Kemahiran Saya']) {
      assert.equal(displaySkillName(name, language, true), name);
    }
    assert.equal(displaySkillName('Uncatalogued specialist concept', language), 'Uncatalogued specialist concept');
  }
});

test('label lookup never rewrites canonical presets or their categories', () => {
  const before = JSON.stringify(skillGroups);
  for (const group of skillGroups) {
    for (const name of group.skills) {
      for (const language of ['EN', 'BM', 'CN'] as const) {
        assert.ok(displaySkillName(name, language).trim());
      }
    }
  }
  assert.equal(JSON.stringify(skillGroups), before);
});
