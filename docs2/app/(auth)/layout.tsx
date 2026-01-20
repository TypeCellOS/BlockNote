import { HomeLayout } from "@/components/fumadocs/layout/home";
import { baseOptions } from "@/lib/layout.shared";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <HomeLayout {...baseOptions()}>
      <div className="md:pt-8">{children}</div>
    </HomeLayout>
  );
}
