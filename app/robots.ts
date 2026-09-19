import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private, transactional and infinite-combination URLs are kept out of search engines.
        disallow: ["/admin", "/account", "/api/", "/go/", "/trips/", "/discover", "/trip-planner", "/login", "/register"],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
