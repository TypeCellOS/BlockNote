export const PRODUCTS = {
  business: {
    id:
      process.env.NODE_ENV === "production"
        ? "c7faaa4c-7805-4722-88d2-5a68f068d546"
        : "8049f66f-fd0a-4690-a0aa-442ac5b03040",
    name: "Business",
    slug: "business",
  } as const,
  starter: {
    id:
      process.env.NODE_ENV === "production"
        ? "ef89c65b-9b18-4091-8de6-264554aa027e"
        : "8049f66f-fd0a-4690-a0aa-442ac5b03040",
    name: "Starter",
    slug: "starter",
  } as const,
  free: {
    id: "00000000-0000-0000-0000-000000000000",
    name: "Free",
    slug: "free",
  } as const,
} as const;

export type ProductSlug = (typeof PRODUCTS)[keyof typeof PRODUCTS]["slug"];
