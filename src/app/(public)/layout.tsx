import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CompareTray } from "@/components/listing/compare-tray";
import { FloatingWhatsApp } from "@/components/layout/floating-whatsapp";
import { JsonLd, organizationLd, websiteLd } from "@/components/seo/jsonld";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={[organizationLd(), websiteLd()]} />
      <Header />
      <main id="main">{children}</main>
      <Footer />
      <CompareTray />
      <FloatingWhatsApp />
    </>
  );
}
