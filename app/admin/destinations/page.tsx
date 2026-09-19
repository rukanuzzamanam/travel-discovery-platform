import { db } from "@/lib/db/client";
import { ContentEditor } from "@/components/admin/content-editor";

export default async function AdminDestinations() {
  const list = await db.destination.findMany({ orderBy: { name: "asc" } });
  return (
    <>
      <h1 className="text-2xl font-bold">Destinations</h1>
      <p className="text-sm text-muted-foreground">Edit copy and publish state. Cost models and activities are managed in content/destinations and re-seeded.</p>
      <div className="space-y-3">
        {list.map((d) => (
          <ContentEditor
            key={d.id}
            kind="destinations"
            id={d.id}
            title={d.name}
            status={d.status}
            fields={[
              { name: "name", label: "Name", type: "text", value: d.name },
              { name: "tagline", label: "Tagline", type: "text", value: d.tagline },
              { name: "overview", label: "Overview", type: "textarea", value: d.overview },
              { name: "seoTitle", label: "SEO title", type: "text", value: d.seoTitle },
              { name: "seoDescription", label: "SEO description", type: "textarea", value: d.seoDescription },
              { name: "status", label: "Status", type: "status", value: d.status },
            ]}
          />
        ))}
      </div>
    </>
  );
}
