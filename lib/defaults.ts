import type { OfferProfileInput } from "@/lib/types";

export const defaultOffers: OfferProfileInput[] = [
  {
    name: "Data Dashboard Agency",
    seller_description: "Sells Tableau dashboards, SQL pipelines, and executive reporting.",
    target_customers: "BI, Data, Analytics, RevOps, and Tableau teams.",
    keywords: ["Tableau", "Power BI", "BI Analyst", "Data Engineer", "Analytics Engineer", "SQL", "Dashboard", "Reporting", "RevOps"],
    negative_keywords: ["intern", "student", "unpaid"]
  },
  {
    name: "Cloud Infrastructure Consultancy",
    seller_description: "Helps companies modernize cloud platforms, DevOps workflows, SRE practices, and Kubernetes operations.",
    target_customers: "Cloud, DevOps, SRE, platform engineering, and infrastructure leaders.",
    keywords: ["Cloud", "DevOps", "SRE", "Platform", "Infrastructure", "Kubernetes", "AWS", "Azure"],
    negative_keywords: ["intern", "student", "unpaid"]
  },
  {
    name: "Cyber Risk Studio",
    seller_description: "Supports security operations, compliance readiness, IAM projects, and SOC modernization.",
    target_customers: "Security, SOC, compliance, risk, and identity teams.",
    keywords: ["SOC", "Security", "Compliance", "IAM", "Risk", "Incident", "Identity"],
    negative_keywords: ["intern", "student", "unpaid"]
  }
];

export const defaultOpenAIModel = "gpt-5.4-nano";
