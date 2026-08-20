import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CompareTray } from "@/components/listing/compare-tray";
import { FloatingWhatsApp } from "@/components/layout/floating-whatsapp";
import { JsonLd, organizationLd, websiteLd } from "@/components/seo/jsonld";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Public pages only — tracking the admin would mix staff
          sessions into the traffic numbers. */}
      <GoogleAnalytics />
      <JsonLd data={[organizationLd(), websiteLd()]} />
      <Header />
      <main id="main">{children}</main>
      <Footer />
      <CompareTray />
      <FloatingWhatsApp />
    </>
  );
}
