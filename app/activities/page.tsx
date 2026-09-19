import { DestinationLinksPage } from "@/components/affiliate/destination-links-page";
import { buildMetadata } from "@/lib/seo/metadata";

export const revalidate = 3600;

export const metadata = buildMetadata({
  title: "Tours and activities in our destinations",
  description: "Find tours, tickets and activities for popular destinations through our booking partners.",
  path: "/activities",
});

export default function ActivitiesPage() {
  return <DestinationLinksPage kind="ACTIVITY" title="Tours and activities" intro="Browse tours and tickets in popular destinations." path="/activities" cta="Find activities" />;
}
