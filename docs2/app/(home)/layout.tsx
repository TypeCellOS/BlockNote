import { Footer } from "@/components/Footer";
import { HomeLayout } from "fumadocs-ui/layouts/home";

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <>
      <HomeLayout nav={{ enabled: false }}>{children}</HomeLayout>
      <Footer />
    </>
  );
}
