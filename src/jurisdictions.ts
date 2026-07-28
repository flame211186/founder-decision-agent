export interface JurisdictionSource {
  id: string;
  title: string;
  url: string;
  authority: string;
  scope: string;
}

export interface JurisdictionGuidance {
  jurisdiction: string;
  recognized: boolean;
  reviewRequired: true;
  notes: string[];
  sources: JurisdictionSource[];
}

const UNITED_STATES_SOURCES: JurisdictionSource[] = [
  {
    id: "us-sec-capital-raising",
    title: "Capital-Raising Building Blocks",
    url: "https://www.sec.gov/resources-small-businesses/capital-raising-building-blocks",
    authority: "U.S. Securities and Exchange Commission",
    scope: "Official starting point for federal securities-law capital-raising pathways."
  },
  {
    id: "us-sba-loans",
    title: "SBA Loans",
    url: "https://www.sba.gov/funding-programs/loans",
    authority: "U.S. Small Business Administration",
    scope: "Official starting point for SBA-backed business loan programs."
  },
  {
    id: "us-sba-investment-capital",
    title: "Investment Capital",
    url: "https://www.sba.gov/funding-programs/investment-capital",
    authority: "U.S. Small Business Administration",
    scope: "Official starting point for SBA investment-capital information."
  }
];

const MAINLAND_CHINA_SOURCES: JurisdictionSource[] = [
  {
    id: "cn-company-law",
    title: "中华人民共和国公司法",
    url: "https://flk.npc.gov.cn/detail?fileId=&id=ff8081818c9108eb018cb6922f750c07&title=中华人民共和国公司法&type=",
    authority: "国家法律法规数据库",
    scope: "公司设立、治理和责任的一手法律入口；不替代针对具体融资安排的法律审查。"
  }
];

export function resolveJurisdictionGuidance(value: string | undefined): JurisdictionGuidance {
  const jurisdiction = (value ?? "unknown").trim() || "unknown";
  const normalized = jurisdiction.toLowerCase().replaceAll("_", " ").replaceAll("-", " ");
  const isUnitedStates =
    /\b(us|usa|united states|u\.s\.)\b/.test(normalized) ||
    normalized.includes("美国");
  const isMainlandChina =
    normalized.includes("mainland china") ||
    normalized.includes("中国大陆") ||
    normalized === "cn" ||
    normalized === "china" ||
    normalized === "中国";

  if (isUnitedStates) {
    return {
      jurisdiction,
      recognized: true,
      reviewRequired: true,
      notes: [
        "Federal and state requirements can both apply; the source list is a research starting point, not a legal conclusion.",
        "Fundraising structure, solicitation, investor eligibility, tax and filing duties require qualified U.S. professional review."
      ],
      sources: UNITED_STATES_SOURCES
    };
  }

  if (isMainlandChina) {
    return {
      jurisdiction,
      recognized: true,
      reviewRequired: true,
      notes: [
        "公司、融资、税务、数据和行业许可要求取决于主体、地区、投资人和业务模式；此处不自动推断具体合规结论。",
        "任何融资或受监管业务建议均需中国大陆具备相应资质的法律、税务或行业专业人士复核。"
      ],
      sources: MAINLAND_CHINA_SOURCES
    };
  }

  return {
    jurisdiction,
    recognized: false,
    reviewRequired: true,
    notes: [
      "No jurisdiction-specific source pack matched this request.",
      "Keep legal, tax, securities, data and licensing matters unknown until checked against current primary sources and qualified local advice."
    ],
    sources: []
  };
}

export function renderJurisdictionContext(value: string | undefined): string {
  const guidance = resolveJurisdictionGuidance(value);
  return [
    "Jurisdiction safety context:",
    `- Requested jurisdiction: ${guidance.jurisdiction}`,
    `- Recognized source pack: ${guidance.recognized ? "yes" : "no"}`,
    ...guidance.notes.map((note) => `- ${note}`),
    guidance.sources.length
      ? [
          "- Official research entry points (not pre-verified support for any report claim):",
          ...guidance.sources.map(
            (source) =>
              `  - ${source.authority}: ${source.title} — ${source.url} — ${source.scope}`
          )
        ].join("\n")
      : "- Official research entry points: none preselected; locate current primary sources in deep mode."
  ].join("\n");
}
