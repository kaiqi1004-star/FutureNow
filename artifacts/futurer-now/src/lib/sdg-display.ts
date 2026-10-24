import type { Language } from './i18n';

/**
 * Display-only BM / Simplified Chinese labels for the curated SDG guidance
 * returned by the matching API. The API catalogue is not modified; unknown
 * text falls back to the original English. Source URLs and target IDs are
 * never changed. Job titles, industries and requirement names embedded in
 * composite explanations are kept as supplied (or passed through a skill
 * label resolver for requirements).
 */
type Pair = readonly [string, string];

const GOALS: Record<string, Pair> = {
  'Quality Education': ['Pendidikan Berkualiti', '优质教育'],
  'Gender Equality': ['Kesaksamaan Gender', '性别平等'],
  'Decent Work and Economic Growth': ['Pekerjaan Wajar dan Pertumbuhan Ekonomi', '体面工作和经济增长'],
  'Industry, Innovation and Infrastructure': ['Industri, Inovasi dan Infrastruktur', '产业、创新和基础设施'],
  'Responsible Consumption and Production': ['Penggunaan dan Pengeluaran Bertanggungjawab', '负责任消费和生产'],
};

const SENTENCES: Record<string, Pair> = {
  // Rule explanations
  'When applied to fair workplace practices, this activity may help reduce gender discrimination. The listing alone does not establish that an employer achieves equality.': ['Apabila digunakan dalam amalan tempat kerja yang adil, aktiviti ini mungkin membantu mengurangkan diskriminasi gender. Iklan kerja sahaja tidak membuktikan majikan mencapai kesaksamaan.', '如应用于公平的职场实践，此项活动可能有助于减少性别歧视。仅凭招聘信息无法证明雇主实现了平等。'],
  'Sharing practical knowledge or delivering training may help people develop skills for employment. Contribution depends on accessible, effective learning in practice.': ['Berkongsi pengetahuan praktikal atau menyampaikan latihan mungkin membantu orang membina kemahiran untuk pekerjaan. Sumbangan bergantung pada pembelajaran yang mudah diakses dan berkesan secara praktikal.', '分享实践知识或开展培训可能有助于他人培养就业技能。其贡献取决于实际中是否提供了可及且有效的学习。'],
  'Applied lawfully and fairly, this workplace activity may support worker protections and safe employment. A skill listing is not proof of an employer\'s labour practices.': ['Jika dilaksanakan secara sah dan adil, aktiviti tempat kerja ini mungkin menyokong perlindungan pekerja dan pekerjaan yang selamat. Senarai kemahiran bukan bukti amalan buruh majikan.', '如合法、公平地开展，此项职场活动可能有助于保障劳动者权益和安全就业。技能列表并不能证明雇主的劳动实践。'],
  'Fair, accessible recruitment may help people access productive employment and equal work opportunities. This depends on actual hiring practices, not the presence of the skill label.': ['Pengambilan pekerja yang adil dan mudah diakses mungkin membantu orang mendapat pekerjaan produktif dan peluang kerja yang sama rata. Ini bergantung pada amalan pengambilan sebenar, bukan kewujudan label kemahiran.', '公平、可及的招聘可能有助于人们获得生产性就业和平等的工作机会。这取决于实际招聘做法，而非是否出现该技能标签。'],
  'Responsible enterprise finance or market-access work may support productive business activity and entrepreneurship. This is conditional on ethical implementation, not a growth prediction.': ['Kerja kewangan perusahaan atau akses pasaran yang bertanggungjawab mungkin menyokong aktiviti perniagaan produktif dan keusahawanan. Ini bergantung pada pelaksanaan beretika, bukan ramalan pertumbuhan.', '负责任的企业财务或市场准入工作可能有助于生产性商业活动和创业。这取决于合乎道德的实施，并非增长预测。'],
  'Used in research, reliable systems, or sustainable industrial innovation, this technical capability may strengthen technological capacity. The tool or role itself does not guarantee sustainable outcomes.': ['Jika digunakan dalam penyelidikan, sistem yang boleh dipercayai atau inovasi industri mampan, keupayaan teknikal ini mungkin mengukuhkan kapasiti teknologi. Alat atau peranan itu sendiri tidak menjamin hasil yang mampan.', '如用于研究、可靠系统或可持续的产业创新，此项技术能力可能增强技术能力。工具或岗位本身并不保证可持续的成果。'],
  'When used to extend asset life, reduce avoidable material use, or prevent waste, this practice may support responsible production. Actual waste reduction must be demonstrated separately.': ['Apabila digunakan untuk memanjangkan hayat aset, mengurangkan penggunaan bahan yang boleh dielakkan atau mencegah pembaziran, amalan ini mungkin menyokong pengeluaran bertanggungjawab. Pengurangan sisa sebenar perlu dibuktikan secara berasingan.', '如用于延长资产寿命、减少可避免的材料使用或防止浪费，此项实践可能有助于负责任的生产。实际减废效果需另行证明。'],
  'Reliable sustainability reporting or resource monitoring may help organisations adopt and report sustainable practices. No such result is assumed from a listed skill alone.': ['Pelaporan kemampanan atau pemantauan sumber yang boleh dipercayai mungkin membantu organisasi menerima pakai dan melaporkan amalan mampan. Hasil sedemikian tidak diandaikan daripada senarai kemahiran sahaja.', '可靠的可持续发展报告或资源监测可能帮助组织采用并报告可持续实践。仅凭所列技能不能推定有此结果。'],
  // Rule conditions
  'The work must actually address discrimination against women or unequal opportunities, not merely use a generic HR label.': ['Kerja itu mesti benar-benar menangani diskriminasi terhadap wanita atau peluang yang tidak sama rata, bukan sekadar menggunakan label HR umum.', '工作必须切实应对针对女性的歧视或机会不平等，而不仅仅是使用笼统的人力资源标签。'],
  'Training must develop people\'s relevant skills, not refer to training a machine-learning model.': ['Latihan mesti membina kemahiran manusia yang berkaitan, bukan merujuk kepada melatih model pembelajaran mesin.', '培训必须是培养人的相关技能，而非指训练机器学习模型。'],
  'The activity must protect labour rights, safe working conditions, or lawful employee treatment in practice.': ['Aktiviti itu mesti melindungi hak buruh, keadaan kerja yang selamat atau layanan pekerja yang sah secara praktikal.', '该活动必须在实际中保护劳动权利、安全的工作条件或合法对待员工。'],
  'Recruitment must provide fair access to productive employment, with equal treatment and no assumed hiring outcome.': ['Pengambilan pekerja mesti memberi akses adil kepada pekerjaan produktif, dengan layanan sama rata dan tanpa andaian hasil pengambilan.', '招聘必须提供公平获得生产性就业的机会，平等对待，且不预设录用结果。'],
  'The activity must support responsible productive enterprise operations or entrepreneurship, not misleading reporting or outreach.': ['Aktiviti itu mesti menyokong operasi perusahaan produktif yang bertanggungjawab atau keusahawanan, bukan pelaporan atau jangkauan yang mengelirukan.', '该活动必须支持负责任的生产性企业运营或创业，而非误导性的报告或推广。'],
  'It must be applied to research, technological capability, or industrial innovation; the connection is potential, not proof of impact.': ['Ia mesti digunakan untuk penyelidikan, keupayaan teknologi atau inovasi industri; kaitan ini berpotensi, bukan bukti impak.', '必须应用于研究、技术能力或产业创新；该关联仅为潜在关联，并非影响的证明。'],
  'The practice must actually prevent waste or extend useful material or equipment life, rather than merely involve inventory or repairs.': ['Amalan itu mesti benar-benar mencegah pembaziran atau memanjangkan hayat bahan atau peralatan, bukan sekadar melibatkan inventori atau pembaikan.', '该实践必须切实防止浪费或延长材料、设备的使用寿命，而不仅仅涉及库存或维修。'],
  'Reporting must concern substantive sustainability practices; resource-efficiency work must feed into those practices and reporting.': ['Pelaporan mesti berkaitan amalan kemampanan yang substantif; kerja kecekapan sumber mesti menyumbang kepada amalan dan pelaporan tersebut.', '报告必须涉及实质性的可持续实践；资源效率工作必须服务于这些实践和报告。'],
  // Context conditions
  'Only when used for accurate, responsible enterprise finance and productive business activity; ordinary spreadsheet use or a job title alone is insufficient.': ['Hanya apabila digunakan untuk kewangan perusahaan yang tepat dan bertanggungjawab serta aktiviti perniagaan produktif; penggunaan hamparan biasa atau tajuk pekerjaan sahaja tidak mencukupi.', '仅在用于准确、负责任的企业财务和生产性商业活动时成立；普通的电子表格使用或仅凭职位名称不足以证明。'],
  'Only when supporting engineering research, validated design, or industrial technological development; no social or environmental outcome is assumed.': ['Hanya apabila menyokong penyelidikan kejuruteraan, reka bentuk yang disahkan atau pembangunan teknologi industri; tiada hasil sosial atau alam sekitar diandaikan.', '仅在支持工程研究、经验证的设计或产业技术发展时成立；不预设任何社会或环境成果。'],
  'Only when used to develop reliable technology, research tools, or industrial innovation; routine tool use does not itself establish SDG achievement.': ['Hanya apabila digunakan untuk membangunkan teknologi yang boleh dipercayai, alat penyelidikan atau inovasi industri; penggunaan alat secara rutin tidak dengan sendirinya membuktikan pencapaian SDG.', '仅在用于开发可靠技术、研究工具或产业创新时成立；日常使用工具本身并不构成实现 SDG。'],
  'Only when analysis informs research, technological innovation, or industrial development, with valid methods and responsible data use. The listing does not prove that application.': ['Hanya apabila analisis menyumbang kepada penyelidikan, inovasi teknologi atau pembangunan industri, dengan kaedah yang sah dan penggunaan data yang bertanggungjawab. Iklan kerja tidak membuktikan penggunaan tersebut.', '仅在分析以有效方法和负责任的数据使用服务于研究、技术创新或产业发展时成立。招聘信息并不能证明这种应用。'],
  'Only when truthful, responsible outreach supports productive businesses or entrepreneurship; no sales growth, fair practice, or employment outcome is assumed.': ['Hanya apabila jangkauan yang jujur dan bertanggungjawab menyokong perniagaan produktif atau keusahawanan; tiada pertumbuhan jualan, amalan adil atau hasil pekerjaan diandaikan.', '仅在真实、负责任的推广支持生产性企业或创业时成立；不预设销售增长、公平做法或就业成果。'],
  'Only when used to support fair employment access, accurate pay, and equal treatment. A recruitment or payroll skill alone does not prove decent work.': ['Hanya apabila digunakan untuk menyokong akses pekerjaan yang adil, gaji yang tepat dan layanan sama rata. Kemahiran pengambilan pekerja atau penggajian sahaja tidak membuktikan pekerjaan wajar.', '仅在用于支持公平就业机会、准确薪酬和平等待遇时成立。仅凭招聘或薪资技能并不能证明体面工作。'],
};

const CONTRIBUTIONS: Record<string, Pair> = {
  'Spreadsheet organisation, validation, and analysis can make work evidence more reliable': ['Penyusunan, pengesahan dan analisis hamparan boleh menjadikan bukti kerja lebih boleh dipercayai', '电子表格的整理、校验和分析可使工作依据更可靠'],
  'Clear communication can help colleagues understand findings, limitations, and decisions': ['Komunikasi yang jelas boleh membantu rakan sekerja memahami dapatan, batasan dan keputusan', '清晰的沟通可帮助同事理解结论、局限和决策'],
  'Collaboration can support joint review, knowledge exchange, and coordinated implementation': ['Kerjasama boleh menyokong semakan bersama, perkongsian pengetahuan dan pelaksanaan yang diselaraskan', '协作可支持共同审查、知识交流和协调实施'],
  'Structured problem-solving can support evidence-based investigation and correction of errors': ['Penyelesaian masalah yang berstruktur boleh menyokong siasatan berasaskan bukti dan pembetulan kesilapan', '结构化的问题解决可支持基于证据的调查和纠错'],
  'Careful checking can improve the reliability of records, calculations, and technical work': ['Semakan teliti boleh meningkatkan kebolehpercayaan rekod, pengiraan dan kerja teknikal', '仔细核查可提高记录、计算和技术工作的可靠性'],
};

const CONTEXT_NAMES: Record<string, Pair> = {
  'accounting and responsible business operations': ['perakaunan dan operasi perniagaan bertanggungjawab', '会计与负责任的企业运营'],
  'engineering and industrial development': ['kejuruteraan dan pembangunan industri', '工程与产业发展'],
  'software and digital systems development': ['pembangunan perisian dan sistem digital', '软件与数字系统开发'],
  'data analysis and technological research': ['analisis data dan penyelidikan teknologi', '数据分析与技术研究'],
  'responsible enterprise outreach and market access': ['jangkauan perusahaan dan akses pasaran yang bertanggungjawab', '负责任的企业推广与市场准入'],
  'fair recruitment and employment administration': ['pengambilan pekerja dan pentadbiran pekerjaan yang adil', '公平招聘与雇佣管理'],
};

const idx = (language: Language) => (language === 'BM' ? 0 : 1);

export function localizeSdgGoalTitle(title: string, language: Language): string {
  if (language === 'EN') return title;
  return GOALS[title]?.[idx(language)] ?? title;
}

function localizeCore(text: string, language: Language): string {
  const exact = SENTENCES[text];
  if (exact) return exact[idx(language)];
  const contextual = /^(.+) in (.+)\. This is a potential enabling contribution, not evidence that the job achieves the goal\.$/.exec(text);
  if (contextual && CONTRIBUTIONS[contextual[1]] && CONTEXT_NAMES[contextual[2]]) {
    const c = CONTRIBUTIONS[contextual[1]][idx(language)];
    const n = CONTEXT_NAMES[contextual[2]][idx(language)];
    return language === 'BM'
      ? `${c} dalam ${n}. Ini ialah sumbangan pemboleh yang berpotensi, bukan bukti bahawa pekerjaan ini mencapai matlamat tersebut.`
      : `在${n}领域，${c}。这只是潜在的促进作用，并不证明该职位实现了该目标。`;
  }
  return text;
}

/** Localizes curated SDG explanation/condition text. Unknown text returns unchanged. */
export function localizeSdgText(text: string, language: Language, requirementLabel: (name: string) => string = (n) => n): string {
  if (language === 'EN' || !text) return text;
  const role = /^For “(.+)” \(source industry: (.+)\), this potential connection is grounded in the listed requirement “(.+)”, not the title alone\. (.+)$/s.exec(text);
  if (role) {
    const [, title, industryRaw, requirement, rest] = role;
    const industry = industryRaw === 'not provided' ? (language === 'BM' ? 'tidak dinyatakan' : '未提供') : industryRaw;
    const req = requirementLabel(requirement);
    const prefix = language === 'BM'
      ? `Bagi “${title}” (industri sumber: ${industry}), kaitan berpotensi ini berasaskan keperluan tersenarai “${req}”, bukan tajuk sahaja.`
      : `对于“${title}”（来源行业：${industry}），此潜在关联基于所列要求“${req}”，而非仅凭职位名称。`;
    return `${prefix} ${localizeCore(rest, language)}`;
  }
  return localizeCore(text, language);
}
