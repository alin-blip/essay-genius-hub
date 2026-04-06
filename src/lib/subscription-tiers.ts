export type PlanCategory = "student" | "agent";

export interface TierConfig {
  name: string;
  priceId: string;
  productId: string;
  category: PlanCategory;
  priceGBP: number;
  assignmentsPerMonth: number | null; // null = unlimited
  wordsPerMonth: number | null; // null = unlimited
  features: string[];
  highlighted?: boolean;
}

export const TIERS: Record<string, TierConfig> = {
  student_basic: {
    name: "Student Basic",
    priceId: "price_1TJ9LoBCjwwzvAvi4aesLkns",
    productId: "prod_UHinD1B3zVPt72",
    category: "student",
    priceGBP: 50,
    assignmentsPerMonth: 3,
    wordsPerMonth: 6000,
    features: [
      "3 assignments per month",
      "2,000 words per assignment",
      "Harvard referencing",
      "PDF & DOCX export",
    ],
  },
  student_plus: {
    name: "Student Plus",
    priceId: "price_1TJ9LoBCjwwzvAviPOcGrvAh",
    productId: "prod_UHin9GTCwtWlRV",
    category: "student",
    priceGBP: 100,
    assignmentsPerMonth: 7,
    wordsPerMonth: 14000,
    features: [
      "7 assignments per month",
      "2,000 words per assignment",
      "Harvard referencing",
      "PDF & DOCX export",
      "AI humanization",
    ],
    highlighted: true,
  },
  student_pro: {
    name: "Student Pro",
    priceId: "price_1TJ9LpBCjwwzvAvi8h9ZJqM8",
    productId: "prod_UHinvCKRWyHyHi",
    category: "student",
    priceGBP: 200,
    assignmentsPerMonth: 15,
    wordsPerMonth: 30000,
    features: [
      "15 assignments per month",
      "2,000 words per assignment",
      "Harvard referencing",
      "PDF & DOCX export",
      "AI humanization",
      "Priority generation",
    ],
  },
  agent_starter: {
    name: "Agent Starter",
    priceId: "price_1TJ9LqBCjwwzvAvi5yz1KOGb",
    productId: "prod_UHin4osqm95O10",
    category: "agent",
    priceGBP: 200,
    assignmentsPerMonth: 10,
    wordsPerMonth: 20000,
    features: [
      "10 assignments per month",
      "2,000 words per assignment",
      "Harvard referencing",
      "PDF & DOCX export",
      "AI humanization",
    ],
  },
  agent_pro: {
    name: "Agent Pro",
    priceId: "price_1TJ9LrBCjwwzvAvi58pYIAbJ",
    productId: "prod_UHinm0SYSKUfiv",
    category: "agent",
    priceGBP: 350,
    assignmentsPerMonth: 20,
    wordsPerMonth: 40000,
    features: [
      "20 assignments per month",
      "2,000 words per assignment",
      "Harvard referencing",
      "PDF & DOCX export",
      "AI humanization",
      "Priority generation",
    ],
    highlighted: true,
  },
  agent_unlimited: {
    name: "Agent Unlimited",
    priceId: "price_1TJ9LsBCjwwzvAvixZBSywAK",
    productId: "prod_UHinZVw3tUxMm8",
    category: "agent",
    priceGBP: 997,
    assignmentsPerMonth: null,
    wordsPerMonth: null,
    features: [
      "Unlimited assignments",
      "Unlimited words",
      "Harvard referencing",
      "PDF & DOCX export",
      "AI humanization",
      "Priority generation",
      "Dedicated support",
    ],
  },
};

export const MANAGER_ADDON = {
  name: "Assignment Manager",
  priceId: "price_1TJ9LtBCjwwzvAvijnb0ivSE",
  productId: "prod_UHinoHKxoNq82E",
  priceGBP: 100,
  description: "A real person manages your assignments — generates, exports, uploads to your university portal, and sends you status updates.",
};

export function getTierByProductId(productId: string): TierConfig | undefined {
  return Object.values(TIERS).find((t) => t.productId === productId);
}

export function getTierKey(productId: string): string | undefined {
  return Object.entries(TIERS).find(([, t]) => t.productId === productId)?.[0];
}

export function getStudentTiers(): TierConfig[] {
  return Object.values(TIERS).filter((t) => t.category === "student");
}

export function getAgentTiers(): TierConfig[] {
  return Object.values(TIERS).filter((t) => t.category === "agent");
}
