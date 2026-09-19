import { db } from "@/lib/db/client";
import { ContentEditor } from "@/components/admin/content-editor";

export default async function AdminItineraries() {
  const list = await db.itinerary.findMany({ orderBy: { title: "asc" } });
  return (
    <>
      <h1 className="text-2xl font-bold">Itineraries</h1>
      <div className="space-y-3">
        {list.map((i) => (
          <ContentEditor
            key={i.id}
            kind="itineraries"
            id={i.id}
            title={i.title}
            status={i.status}
            fields={[
              { name: "title", label: "Title", type: "text", value: i.title },
              { name: "description", label: "Description", type: "textarea", value: i.description },
              { name: "seoTitle", label: "SEO title", type: "text", value: i.seoTitle },
              { name: "seoDescription", label: "SEO description", type: "textarea", value: i.seoDescription },
              { name: "status", label: "Status", type: "status", value: i.status },
            ]}
          />
        ))}
      </div>
    </>
  );
}
