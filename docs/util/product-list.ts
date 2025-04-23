export const PRODUCTS = {
  business: {
    id: "8049f66f-fd0a-4690-a0aa-442ac5b03040",
    name: "Business",
    slug: "business",
  } as const,
  starter: {
    id: "ab70fea5-172c-4aac-b3fc-0824f2a5b670",
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
