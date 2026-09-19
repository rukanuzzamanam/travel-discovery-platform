import { buildMetadata } from "@/lib/seo/metadata";
import { NewsletterForm } from "@/components/layout/newsletter-form";

export const metadata = buildMetadata({
  title: "Travel newsletter: deals, weekend trips and inspiration",
  description: "Get travel deals, weekend getaway ideas, destination inspiration and budget travel tips in your inbox.",
  path: "/newsletter",
});

export default function NewsletterPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-3xl font-bold sm:text-4xl">The Tripora newsletter</h1>
      <p className="mb-8 mt-3 text-muted-foreground">Pick what you want to hear about. We only send useful trips, deals and budget tips.</p>
      <NewsletterForm source="newsletter-page" showPreferences />
    </div>
  );
}
