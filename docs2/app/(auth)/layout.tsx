import { HomeLayout } from "@/components/fumadocs/layout/home";
import { baseOptions } from "@/lib/layout.shared";

export default function Layout({ children }: LayoutProps<any>) {
  return (
    <HomeLayout {...baseOptions()}>
      <div className="md:pt-8">{children}</div>
    </HomeLayout>
  );
}
