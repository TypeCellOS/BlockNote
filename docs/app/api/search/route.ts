import { source } from "@/lib/source/docs";
import { createFromSource } from "fumadocs-core/search/server";

export const { GET } = createFromSource(source);
