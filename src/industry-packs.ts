import type { IndustryPackId } from "./types.js";

export interface IndustryPack {
  id: IndustryPackId;
  label: { "zh-CN": string; en: string };
  questions: string[];
  metrics: string[];
  risks: string[];
  sourceGuidance: string[];
}

export const INDUSTRY_PACKS: Record<IndustryPackId, IndustryPack> = {
  b2b_saas: {
    id: "b2b_saas",
    label: { "zh-CN": "B2B SaaS", en: "B2B SaaS" },
    questions: [
      "Who owns the budget, who uses the product, and who can block purchase?",
      "What existing workflow or budget line will this replace?",
      "What is the shortest credible path from first contact to paid use?",
      "Which retention behavior demonstrates recurring value?"
    ],
    metrics: [
      "activation and time-to-value",
      "logo and revenue retention",
      "sales-cycle length",
      "gross margin and support burden",
      "customer acquisition payback"
    ],
    risks: [
      "founder-led sales does not become repeatable",
      "services work is hidden inside software margins",
      "buyer and user incentives are misaligned",
      "switching and integration costs block adoption"
    ],
    sourceGuidance: [
      "Prefer official competitor pricing and product documentation.",
      "Treat benchmark reports as contextual evidence, not ground truth for this idea."
    ]
  },
  ai_native: {
    id: "ai_native",
    label: { "zh-CN": "AI 原生产品", en: "AI-native product" },
    questions: [
      "What user outcome improves beyond adding an AI interface?",
      "How will the product measure and control model errors?",
      "Which data rights, model-provider dependencies, and safety boundaries matter?",
      "Does inference cost remain viable at the intended price and usage?"
    ],
    metrics: [
      "task success under representative evals",
      "human correction and escalation rate",
      "latency and inference cost per successful task",
      "retention after novelty fades",
      "provider concentration and model portability"
    ],
    risks: [
      "demo quality does not survive real inputs",
      "the model or provider can commoditize the feature",
      "unlicensed or sensitive data enters prompts or logs",
      "unit economics deteriorate with long context or retries",
      "automation causes unreviewed external actions"
    ],
    sourceGuidance: [
      "Use current model and provider documentation for capability claims.",
      "Require task-specific evals; model self-assessment is not sufficient evidence."
    ]
  }
};

export function renderIndustryContext(ids: IndustryPackId[] = []): string {
  return ids
    .map((id) => {
      const pack = INDUSTRY_PACKS[id];
      return [
        `Industry pack: ${pack.id}`,
        `Questions:\n- ${pack.questions.join("\n- ")}`,
        `Metrics:\n- ${pack.metrics.join("\n- ")}`,
        `Risks:\n- ${pack.risks.join("\n- ")}`,
        `Evidence guidance:\n- ${pack.sourceGuidance.join("\n- ")}`
      ].join("\n");
    })
    .join("\n\n");
}
