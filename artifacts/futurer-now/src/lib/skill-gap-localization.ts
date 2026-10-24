import type { Language } from './i18n.tsx';

/**
 * Central display-only localization for listing skill names.
 *
 * Source skill names are never changed: matching, storage keys and API payloads
 * always use the original string. This module only decides what label to show.
 */

export type SkillTermKind = 'general' | 'protected' | 'source-fragment' | 'unknown';
export type LocalizedSkill = { label: string; original: string; kind: SkillTermKind; key: string };

/** Stable lookup key: NFKC, trimmed, lower-cased, collapsed whitespace. */
export function normalizeSkillKey(name: string): string {
  return name.normalize('NFKC').trim().toLocaleLowerCase('en').replace(/\s+/g, ' ');
}

/**
 * Brands, products, programming languages, standards, statutory bodies and
 * technical acronyms. These stay in their original form in every language.
 */
export const PROTECTED_SKILL_TERMS: ReadonlySet<string> = new Set([
  '.net core', 'adobe illustrator', 'adobe photoshop', 'ai', 'ajax', 'angular', 'asp.net', 'asp.net mvc',
  'aws/azure/google cloud', 'azure devops', 'azure sql', 'c#', 'canva', 'capcut', 'ci/cd', 'clean architecture',
  'creo direct', 'css', 'css3', 'dns', 'docker', 'docker/kubernetes', 'e-invoice', 'eis', 'epf', 'etl', 'etl/elt',
  'excel', 'express', 'facebook ads', 'figma', 'fomema', 'ga4', 'geo', 'git', 'github actions', 'gitlab',
  'google ads', 'google sheets', 'google tag manager', 'gtm', 'hadoop', 'html', 'html5', 'ifrs', 'indesign',
  'javascript', 'jquery', 'kafka', 'kubernetes', 'laravel',
  'linux', 'looker studio', 'meta ads', 'meta pixel', 'mfrs', 'microsoft azure', 'microsoft excel',
  'microsoft office', 'microsoft visual foxpro', 'microsoft word', 'ms excel', 'ms sql server', 'mvc', 'mysql',
  'next.js', 'node.js', 'numpy', 'oracle database', 'oracle/sap erp', 'orm', 'pandas', 'pcb', 'php', 'pl/sql',
  'postgresql', 'power bi', 'premiere pro', 'prisma', 'pwa', 'python', 'react', 'react js', 'react native',
  'react/angular', 'remix', 'rest', 'rest apis', 'restful apis', 'restify', 'sap', 'sap business one', 'sas base',
  'sas viya', 'sdlc', 'search console', 'sem', 'seo', 'seo/sem', 'sequelize', 'shell', 'socso', 'solid',
  'solidworks', 'splunk', 'sql', 'sql/nosql', 'sst', 't-sql', 'tableau', 'tfs', 'us gaap', 'ux', 'visual studio',
  'vue', 'web api',
]);

/**
 * Fragments produced by comma-splitting in the supplied source (for example
 * "AI tools (ChatGPT / Claude)"). They are shown exactly as supplied and are
 * intentionally not repaired, so evidence stays faithful to the record.
 */
export const SOURCE_FRAGMENT_TERMS: ReadonlySet<string> = new Set(['ai tools (chatgpt', 'claude)']);

// key|Bahasa Melayu|Simplified Chinese — general skills and professional concepts.
const GENERAL_TERMS_SOURCE = `
2d engineering drawings|Lukisan kejuruteraan 2D|2D 工程图纸
3d modelling|Pemodelan 3D|3D 建模
a/b testing|Ujian A/B|A/B 测试
ability to work under pressure|Keupayaan bekerja di bawah tekanan|抗压工作能力
account reconciliation|Penyesuaian akaun|账户对账
accountability|Akauntabiliti|责任担当
accounting software|Perisian perakaunan|会计软件
accounts payable|Akaun belum bayar|应付账款
accounts payable/receivable|Akaun belum bayar/belum terima|应付/应收账款
adaptability|Kebolehsuaian|适应能力
adaptability to travel|Kesediaan menyesuaikan diri untuk perjalanan kerja|适应出差
agile methodologies|Metodologi Agile|Agile 方法论
agile/scrum|Agile/Scrum|Agile/Scrum 方法
agile/scrum collaboration|Kerjasama Agile/Scrum|Agile/Scrum 协作
aldon migration tools|Alat migrasi Aldon|Aldon 迁移工具
agv research and product development|Penyelidikan dan pembangunan produk AGV|AGV 研究与产品开发
ai algorithms|Algoritma AI|AI 算法
ai marketing tools|Alat pemasaran AI|AI 营销工具
ai tools|Alat AI|AI 工具
ai-powered content creation|Penghasilan kandungan berkuasa AI|AI 驱动的内容创作
algorithms|Algoritma|算法
analytical thinking|Pemikiran analitikal|分析思维
analytics|Analitik|数据分析
application security|Keselamatan aplikasi|应用程序安全
as-built documentation|Dokumentasi as-built|竣工文档
assemblies|Pemasangan komponen|装配件
assembly|Pemasangan|装配
attention to detail|Ketelitian|注重细节
attention to quality|Mementingkan kualiti|注重质量
automated testing|Ujian automatik|自动化测试
automation systems|Sistem automasi|自动化系统
b2b marketing|Pemasaran B2B|B2B 营销
bank reconciliation|Penyesuaian bank|银行对账
bearings|Galas|轴承
branching|Percabangan kod|代码分支
business reporting|Pelaporan perniagaan|业务报告
business requirements documentation|Dokumentasi keperluan perniagaan|业务需求文档
cad drawings|Lukisan CAD|CAD 图纸
campaign analytics|Analitik kempen|营销活动分析
cash flow management|Pengurusan aliran tunai|现金流管理
centralized logging|Pengelogan berpusat|集中式日志
client communication|Komunikasi dengan pelanggan|客户沟通
client coordination|Penyelarasan pelanggan|客户协调
client/vendor communication|Komunikasi dengan pelanggan/vendor|客户/供应商沟通
cloud deployment|Penggunaan awan|云端部署
code quality|Kualiti kod|代码质量
code refactoring|Pemfaktoran semula kod|代码重构
code review|Semakan kod|代码审查
collaboration|Kerjasama|协作
collaboration with internal departments|Kerjasama dengan jabatan dalaman|与内部部门协作
commissioning|Pentauliahan|调试投运
communication|Komunikasi|沟通能力
communication in mandarin and english|Komunikasi dalam bahasa Mandarin dan Inggeris|中英文沟通
communication with end users|Komunikasi dengan pengguna akhir|与最终用户沟通
communication with technical and non-technical stakeholders|Komunikasi dengan pihak berkepentingan teknikal dan bukan teknikal|与技术及非技术利益相关方沟通
compliance|Pematuhan|合规
compliance with procedures and standards|Pematuhan prosedur dan piawaian|遵守程序与标准
confidentiality|Kerahsiaan|保密
construction documentation|Dokumentasi pembinaan|施工文档
content creation|Penghasilan kandungan|内容创作
content marketing|Pemasaran kandungan|内容营销
content optimisation|Pengoptimuman kandungan|内容优化
content writing|Penulisan kandungan|内容写作
continuous improvement|Penambahbaikan berterusan|持续改进
continuous learning|Pembelajaran berterusan|持续学习
control-m batch processing|Pemprosesan kelompok Control-M|Control-M 批处理
conversion rate optimisation (cro)|Pengoptimuman kadar penukaran (CRO)|转化率优化 (CRO)
coordination|Penyelarasan|协调
coordination with architects and engineers|Penyelarasan dengan arkitek dan jurutera|与建筑师及工程师协调
coordination with consultants and suppliers|Penyelarasan dengan perunding dan pembekal|与顾问及供应商协调
corporate tax|Cukai korporat|企业税务
cost accounting|Perakaunan kos|成本会计
costing|Pengekosan|成本核算
creativity|Kreativiti|创造力
critical thinking|Pemikiran kritis|批判性思维
cross-cultural collaboration|Kerjasama silang budaya|跨文化协作
cross-cultural communication|Komunikasi silang budaya|跨文化沟通
cross-functional collaboration|Kerjasama rentas fungsi|跨职能协作
curiosity|Sifat ingin tahu|好奇心
cutting|Pemotongan|切割
cv screening|Saringan CV|简历筛选
daily operational workflow coordination|Penyelarasan aliran kerja operasi harian|日常运营流程协调
daily/weekly/monthly reporting|Pelaporan harian/mingguan/bulanan|日报/周报/月报
dashboards|Papan pemuka|仪表板
data analysis|Analisis data|数据分析
data modelling|Pemodelan data|数据建模
data pipelines|Saluran data|数据管道
data structures|Struktur data|数据结构
data tracking|Penjejakan data|数据跟踪
data visualization|Visualisasi data|数据可视化
database design|Reka bentuk pangkalan data|数据库设计
database interaction|Interaksi pangkalan data|数据库交互
database management|Pengurusan pangkalan data|数据库管理
database schema design|Reka bentuk skema pangkalan data|数据库模式设计
databases|Pangkalan data|数据库
debugging|Penyahpepijatan|调试
decision-making|Membuat keputusan|决策能力
dedication|Dedikasi|敬业精神
design documentation|Dokumentasi reka bentuk|设计文档
design for manufacturing (dfm)|Reka bentuk untuk pembuatan (DFM)|面向制造的设计 (DFM)
design patterns|Corak reka bentuk|设计模式
design troubleshooting|Penyelesaian masalah reka bentuk|设计问题排查
development|Pembangunan|开发
diesel/petrol engines|Enjin diesel/petrol|柴油/汽油发动机
digital analytics|Analitik digital|数字分析
discipline|Disiplin|自律
distributed systems|Sistem teragih|分布式系统
documentation|Dokumentasi|文档编写
domain-driven design (ddd)|Reka bentuk dipacu domain (DDD)|领域驱动设计 (DDD)
dosh/jkkp compliance|Pematuhan DOSH/JKKP|DOSH/JKKP 合规
drawing revision tracking|Penjejakan semakan lukisan|图纸修订跟踪
drilling|Penggerudian|钻孔
employment law|Undang-undang pekerjaan|劳动法
end-to-end testing|Ujian hujung ke hujung|端到端测试
engineering and technical tasks|Tugasan kejuruteraan dan teknikal|工程与技术任务
engineering calculations|Pengiraan kejuruteraan|工程计算
engineering drawing interpretation|Tafsiran lukisan kejuruteraan|工程图纸解读
engineering drawings|Lukisan kejuruteraan|工程图纸
engineering solution design|Reka bentuk penyelesaian kejuruteraan|工程方案设计
english communication|Komunikasi bahasa Inggeris|英语沟通
entity framework (ef)|Entity Framework (EF)|Entity Framework (EF) 框架
equipment alignment|Penjajaran peralatan|设备对中
equipment qualification|Kelayakan peralatan|设备验证
erp systems|Sistem ERP|ERP 系统
estimation|Anggaran kerja|工作量估算
evaluation metrics|Metrik penilaian|评估指标
fabrication|Fabrikasi|制作加工
facilitation|Pemudahcaraan|引导协调
factory auditing|Pengauditan kilang|工厂审核
field testing|Ujian lapangan|现场测试
financial planning and analysis|Perancangan dan analisis kewangan|财务规划与分析
financial reporting|Pelaporan kewangan|财务报告
fitting|Pemasangan suai|装配调整
fixtures|Lekapan|夹具
flutter (added advantage)|Flutter (kelebihan tambahan)|Flutter（加分项）
full-set accounts|Akaun set penuh|全盘账务
gantt charts|Carta Gantt|甘特图
general ledger|Lejar am|总账
general ledger (gl)|Lejar am (GL)|总账 (GL)
generative ai|AI generatif|生成式 AI
government documentation|Dokumentasi kerajaan|政府文件
grinding|Pencanaian|磨削
guiding junior technical staff|Membimbing kakitangan teknikal junior|指导初级技术人员
heavy vehicle maintenance|Penyelenggaraan kenderaan berat|重型车辆维护
hosting|Pengehosan|托管
hr database|Pangkalan data HR|人力资源数据库
hr documentation|Dokumentasi HR|人力资源文档
hr software|Perisian HR|人力资源软件
html basics|Asas HTML|HTML 基础
html/css basics|Asas HTML/CSS|HTML/CSS 基础
hybrid drive systems|Sistem pacuan hibrid|混合驱动系统
hydraulic systems|Sistem hidraulik|液压系统
hydrostatic and pneumatic pressure testing|Ujian tekanan hidrostatik dan pneumatik|静水压与气压测试
hydrostatic drives|Pacuan hidrostatik|静液压驱动
immigration compliance|Pematuhan imigresen|移民合规
implementation|Pelaksanaan|实施
improvement-oriented thinking|Pemikiran berorientasikan penambahbaikan|改进导向思维
incident response|Tindak balas insiden|事件响应
independence|Berdikari|独立性
independent working|Bekerja secara berdikari|独立工作
infrastructure automation|Automasi infrastruktur|基础设施自动化
inspection|Pemeriksaan|检查
integration testing|Ujian integrasi|集成测试
integrity|Integriti|诚信
international accounting standards|Piawaian perakaunan antarabangsa|国际会计准则
interviewing|Temu duga|面试
inventory management|Pengurusan inventori|库存管理
issue tracking|Penjejakan isu|问题跟踪
japanese-english communication|Komunikasi Jepun-Inggeris|日英沟通
java/python/c#/javascript/typescript (at least one)|Java/Python/C#/JavaScript/TypeScript (sekurang-kurangnya satu)|Java/Python/C#/JavaScript/TypeScript（至少一种）
jigs|Jig|治具
keyword research|Penyelidikan kata kunci|关键词研究
knowledge sharing|Perkongsian pengetahuan|知识分享
leadership|Kepimpinan|领导力
leave records|Rekod cuti|休假记录
liaison with contractors and relevant authorities|Perhubungan dengan kontraktor dan pihak berkuasa berkaitan|与承包商及相关部门联络
line flushing|Pembilasan talian paip|管线冲洗
linkedin marketing|Pemasaran LinkedIn|LinkedIn 营销
linux command line|Baris arahan Linux|Linux 命令行
m&e drawings|Lukisan M&E|机电 (M&E) 图纸
machine mechanisms|Mekanisme mesin|机械机构
machinery inspection|Pemeriksaan jentera|机械设备检查
machinery troubleshooting|Penyelesaian masalah jentera|机械设备故障排查
maintainability|Kebolehselenggaraan|可维护性
maintenance|Penyelenggaraan|维护
maintenance support|Sokongan penyelenggaraan|维护支持
manufacturing processes|Proses pembuatan|制造工艺
marketing automation|Automasi pemasaran|营销自动化
material selection|Pemilihan bahan|材料选择
mechanical and electrical (m&e) design|Reka bentuk mekanikal dan elektrik (M&E)|机电 (M&E) 设计
mechanical components|Komponen mekanikal|机械部件
mechanical design|Reka bentuk mekanikal|机械设计
mechanical drawings|Lukisan mekanikal|机械图纸
mechanical maintenance|Penyelenggaraan mekanikal|机械维护
mechanical test certificates|Sijil ujian mekanikal|机械测试证书
mechanical troubleshooting|Penyelesaian masalah mekanikal|机械故障排查
meeting deadlines|Mematuhi tarikh akhir|按期完成
mentoring|Bimbingan|指导带教
merging|Penggabungan kod|代码合并
microservices|Perkhidmatan mikro|微服务
mig welding|Kimpalan MIG|MIG 焊接
monitoring|Pemantauan|监控
month-end closing|Penutupan akaun hujung bulan|月末结账
multitasking|Pelbagai tugas serentak|多任务处理
mvc frameworks|Rangka kerja MVC|MVC 框架
negotiation|Rundingan|谈判
numeracy|Kemahiran mengira|数理能力
object-oriented programming (oop)|Pengaturcaraan berorientasikan objek (OOP)|面向对象编程 (OOP)
onboarding|Orientasi pekerja baharu|新员工入职
operational readiness planning|Perancangan kesiapsiagaan operasi|运营就绪规划
organisation|Pengurusan organisasi kerja|条理性
organization|Pengurusan organisasi kerja|条理性
payroll|Penggajian|薪资核算
performance optimization|Pengoptimuman prestasi|性能优化
performance reporting|Pelaporan prestasi|绩效报告
performance tuning|Penalaan prestasi|性能调优
planning|Perancangan|规划
pneumatic systems|Sistem pneumatik|气动系统
positive attitude|Sikap positif|积极态度
practical engineering judgment|Pertimbangan kejuruteraan praktikal|实践工程判断
pre-commissioning|Pra-pentauliahan|预调试
pre-startup safety reviews (pssr)|Semakan keselamatan pra-permulaan (PSSR)|开车前安全审查 (PSSR)
precision manufacturing|Pembuatan kejituan|精密制造
presentation|Pembentangan|演示汇报
preventive maintenance|Penyelenggaraan pencegahan|预防性维护
prioritization|Penetapan keutamaan|优先级排序
proactiveness|Proaktif|积极主动
problem-solving|Penyelesaian masalah|解决问题
process analysis|Analisis proses|流程分析
process flow management|Pengurusan aliran proses|流程管理
production control|Kawalan pengeluaran|生产控制
production monitoring|Pemantauan pengeluaran|生产环境监控
production process planning|Perancangan proses pengeluaran|生产流程规划
production reporting|Pelaporan pengeluaran|生产报告
productivity improvement|Peningkatan produktiviti|生产力提升
progress monitoring|Pemantauan kemajuan|进度监控
project compliance|Pematuhan projek|项目合规
project coordination|Penyelarasan projek|项目协调
project cpm|CPM projek (kaedah laluan kritikal)|项目关键路径法 (CPM)
project leadership|Kepimpinan projek|项目领导
project management|Pengurusan projek|项目管理
project planning|Perancangan projek|项目规划
project support|Sokongan projek|项目支持
prototyping|Pembuatan prototaip|原型制作
pumps|Pam|泵
punch-list management|Pengurusan senarai kecacatan (punch list)|尾项清单管理
qa/qc inspections|Pemeriksaan QA/QC|QA/QC 检验
quality control|Kawalan kualiti|质量控制
quality focus|Fokus pada kualiti|注重质量
query optimization|Pengoptimuman pertanyaan|查询优化
recruitment|Pengambilan pekerja|招聘
relational and nosql databases|Pangkalan data hubungan dan NoSQL|关系型与 NoSQL 数据库
relational databases|Pangkalan data hubungan|关系型数据库
requirements analysis|Analisis keperluan|需求分析
requirements gathering|Pengumpulan keperluan|需求收集
resourcefulness|Kepintaran mencari jalan|善用资源
responsibility|Tanggungjawab|责任心
responsive web design|Reka bentuk web responsif|响应式网页设计
rest/api integration|Integrasi REST/API|REST/API 集成
robotics|Robotik|机器人技术
root-cause analysis|Analisis punca utama|根本原因分析
rotating equipment testing|Ujian peralatan berputar|旋转设备测试
safety coordination|Penyelarasan keselamatan|安全协调
salary administration|Pentadbiran gaji|薪酬管理
scalability|Kebolehskalaan|可扩展性
self-motivation|Motivasi kendiri|自我激励
server monitoring|Pemantauan pelayan|服务器监控
servo motors|Motor servo|伺服电机
shafts|Aci|轴
shell scripting|Skrip shell|Shell 脚本编写
shutdown planning|Perancangan penutupan loji|停机检修规划
site activity monitoring|Pemantauan aktiviti tapak|现场活动监控
site work planning|Perancangan kerja tapak|现场工作规划
social media marketing|Pemasaran media sosial|社交媒体营销
software and hardware installation/configuration|Pemasangan/konfigurasi perisian dan perkakasan|软硬件安装/配置
software design|Reka bentuk perisian|软件设计
software design principles|Prinsip reka bentuk perisian|软件设计原则
software design specifications|Spesifikasi reka bentuk perisian|软件设计规格
software development|Pembangunan perisian|软件开发
software development lifecycle (sdlc)|Kitaran hayat pembangunan perisian (SDLC)|软件开发生命周期 (SDLC)
software documentation|Dokumentasi perisian|软件文档
software implementation|Pelaksanaan perisian|软件实施
software testing|Ujian perisian|软件测试
sops|SOP (prosedur operasi standard)|标准作业程序 (SOP)
source control|Kawalan versi sumber|源代码管理
sox controls|Kawalan SOX|SOX 内控
spare-parts management|Pengurusan alat ganti|备件管理
specification translation|Penterjemahan spesifikasi|规格转换
sprint planning|Perancangan sprint|冲刺规划
startup procedures|Prosedur permulaan|启动程序
statistics|Statistik|统计学
stored procedures|Prosedur tersimpan|存储过程
storytelling|Penceritaan|叙事能力
strategic planning|Perancangan strategik|战略规划
strategic planning support|Sokongan perancangan strategik|战略规划支持
strategic thinking|Pemikiran strategik|战略思维
subcontractor coordination|Penyelarasan subkontraktor|分包商协调
subversion|Subversion (kawalan versi)|Subversion 版本控制
supplier coordination|Penyelarasan pembekal|供应商协调
supplier sourcing|Pencarian pembekal|供应商寻源
system integration|Integrasi sistem|系统集成
system integration testing (sit)|Ujian integrasi sistem (SIT)|系统集成测试 (SIT)
system maintenance|Penyelenggaraan sistem|系统维护
system testing|Ujian sistem|系统测试
system/network/server maintenance|Penyelenggaraan sistem/rangkaian/pelayan|系统/网络/服务器维护
taxation|Percukaian|税务
teamwork|Kerja berpasukan|团队合作
technical communication|Komunikasi teknikal|技术沟通
technical documentation|Dokumentasi teknikal|技术文档
technical drafting|Pelukisan teknikal|技术制图
technical drawings|Lukisan teknikal|技术图纸
technical guidance|Bimbingan teknikal|技术指导
technical leadership|Kepimpinan teknikal|技术领导力
technical problem-solving|Penyelesaian masalah teknikal|技术问题解决
technical quality review|Semakan kualiti teknikal|技术质量审查
technical reporting|Pelaporan teknikal|技术报告
technical reports|Laporan teknikal|技术报告
technical specifications|Spesifikasi teknikal|技术规格
technical troubleshooting|Penyelesaian masalah teknikal|技术故障排查
tender documentation|Dokumentasi tender|招标文件
test-driven development (tdd)|Pembangunan dipacu ujian (TDD)|测试驱动开发 (TDD)
testing and deployment|Ujian dan penggunaan|测试与部署
thai-language copywriting|Penulisan salinan bahasa Thai|泰语文案撰写
third-party api integration|Integrasi API pihak ketiga|第三方 API 集成
tiktok marketing|Pemasaran TikTok|TikTok 营销
time management|Pengurusan masa|时间管理
timely rectification|Pembetulan tepat pada masanya|及时整改
tolerance analysis|Analisis toleransi|公差分析
tooling|Perkakasan alat|工装
training coordination|Penyelarasan latihan|培训协调
troubleshooting|Penyelesaian masalah teknikal|故障排查
unit testing|Ujian unit|单元测试
user acceptance testing (uat)|Ujian penerimaan pengguna (UAT)|用户验收测试 (UAT)
user support|Sokongan pengguna|用户支持
user training|Latihan pengguna|用户培训
vendor coordination|Penyelarasan vendor|供应商协调
video content|Kandungan video|视频内容
web application development|Pembangunan aplikasi web|Web 应用开发
web services|Perkhidmatan web|Web 服务
willingness to learn|Kesediaan untuk belajar|学习意愿
willingness to learn quickly|Kesediaan untuk belajar dengan pantas|快速学习的意愿
willingness to research and propose improvements|Kesediaan menyelidik dan mencadangkan penambahbaikan|主动研究并提出改进建议
willingness to travel|Kesediaan untuk bergerak ke luar kawasan|愿意出差
windows scripting|Skrip Windows|Windows 脚本编写
work permit renewal|Pembaharuan permit kerja|工作准证续签
working under deadlines|Bekerja mengikut tarikh akhir|在截止期限内工作
written and spoken communication|Komunikasi bertulis dan lisan|书面与口头沟通
`;

export const GENERAL_SKILL_TERMS: Readonly<Record<string, readonly [string, string]>> = Object.freeze(
  Object.fromEntries(
    GENERAL_TERMS_SOURCE.trim().split('\n').map((line) => {
      const [key, bm, cn] = line.split('|');
      return [normalizeSkillKey(key), [bm.trim(), cn.trim()] as const];
    }),
  ),
);

export function classifySkillTerm(name: string): SkillTermKind {
  const key = normalizeSkillKey(name);
  if (SOURCE_FRAGMENT_TERMS.has(key)) return 'source-fragment';
  if (PROTECTED_SKILL_TERMS.has(key)) return 'protected';
  if (GENERAL_SKILL_TERMS[key]) return 'general';
  return 'unknown';
}

const reportedMissing = new Set<string>();
/** Unknown skill keys seen at runtime (development audit aid). */
export function missingSkillTranslationKeys(): string[] {
  return [...reportedMissing].sort();
}

function isDevelopment() {
  try {
    return Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV);
  } catch {
    return false;
  }
}

/** Display label for a source skill name. The original value is always returned alongside it. */
export function localizeSkill(name: string, language: Language): LocalizedSkill {
  const key = normalizeSkillKey(name);
  const kind = classifySkillTerm(name);
  const original = name.trim();
  if (kind === 'unknown' && !reportedMissing.has(key)) {
    reportedMissing.add(key);
    if (isDevelopment()) console.warn(`[skill-gap i18n] Missing skill translation key: "${key}"`);
  }
  if (language === 'EN' || kind !== 'general') return { label: original, original, kind, key };
  const entry = GENERAL_SKILL_TERMS[key];
  return { label: entry[language === 'BM' ? 0 : 1], original, kind, key };
}

// ---- Career categories -------------------------------------------------------

export const KNOWN_CAREER_CATEGORIES = [
  'software', 'mechanical', 'data-analytics', 'accounting-finance', 'digital-marketing', 'human-resources',
] as const;

/** English message IDs (translated through the i18n catalog). */
export const careerCategoryMessages: Record<string, { label: string; description: string; symbol: string }> = {
  software: { label: 'Software', description: 'Digital products & systems', symbol: 'SW' },
  mechanical: { label: 'Mechanical', description: 'Engineering & manufacturing', symbol: 'ME' },
  'data-analytics': { label: 'Data Analytics', description: 'Data, reporting & insight', symbol: 'DA' },
  'accounting-finance': { label: 'Accounting / Finance', description: 'Accounts, tax & reporting', symbol: 'AF' },
  'digital-marketing': { label: 'Digital Marketing', description: 'Campaigns, content & search', symbol: 'DM' },
  'human-resources': { label: 'Human Resources', description: 'People, payroll & compliance', symbol: 'HR' },
};

/** Fallback label for a category value not yet in the catalog: humanized raw value. */
export function categoryMessage(category: string) {
  return careerCategoryMessages[category] ?? {
    label: category.split(/[-_\s]+/).filter(Boolean).map((part) => part[0].toUpperCase() + part.slice(1)).join(' '),
    description: 'Supplied career category',
    symbol: category.slice(0, 2).toUpperCase(),
  };
}

export type CategoryCount = { category: string; count: number };
/** Categories derived from the actual records, known order first, then any others alphabetically. */
export function deriveCategoryCounts(jobs: Array<{ sector: string }>): CategoryCount[] {
  const counts = new Map<string, number>();
  for (const job of jobs) counts.set(job.sector, (counts.get(job.sector) ?? 0) + 1);
  const order = (value: string) => {
    const index = (KNOWN_CAREER_CATEGORIES as readonly string[]).indexOf(value);
    return index < 0 ? KNOWN_CAREER_CATEGORIES.length : index;
  };
  return [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => order(a.category) - order(b.category) || a.category.localeCompare(b.category));
}

// ---- Locale formatting -------------------------------------------------------

const locales: Record<Language, string> = { EN: 'en-MY', BM: 'ms-MY', CN: 'zh-CN' };

export function formatNumber(value: number, language: Language) {
  return new Intl.NumberFormat(locales[language], { maximumFractionDigits: 1 }).format(value);
}

/** Formats an ISO calendar date (YYYY-MM-DD) without shifting it across time zones. */
export function formatIsoDate(value: string, language: Language) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat(locales[language], { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(date);
}
