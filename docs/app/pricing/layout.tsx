import { HomeLayout } from "@/components/fumadocs/layout/home";
import { baseOptions } from "@/lib/layout.shared";

export default function Layout({ children }: LayoutProps<"/pricing">) {
  return <HomeLayout {...baseOptions()}>{children}</HomeLayout>;
}
