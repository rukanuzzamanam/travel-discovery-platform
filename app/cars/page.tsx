import { DestinationLinksPage } from "@/components/affiliate/destination-links-page";
import { buildMetadata } from "@/lib/seo/metadata";

export const revalidate = 3600;

export const metadata = buildMetadata({
  title: "Car rental in our destinations",
  description: "Find car rental options for popular destinations through our booking partners.",
  path: "/cars",
});

export default function CarsPage() {
  return <DestinationLinksPage kind="CAR" title="Car rental" intro="Compare car hire in popular destinations." path="/cars" cta="Find cars" />;
}
