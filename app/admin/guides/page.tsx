import { db } from "@/lib/db/client";
import { ContentEditor, NewGuideForm } from "@/components/admin/content-editor";

export default async function AdminGuides() {
  const list = await db.travelGuide.findMany({ orderBy: { updatedAt: "desc" } });
  return (
    <>
      <h1 className="text-2xl font-bold">Guides</h1>
      <NewGuideForm />
      <div className="space-y-3">
        {list.map((g) => (
          <ContentEditor
            key={g.id}
            kind="guides"
            id={g.id}
            title={g.title}
            status={g.status}
            fields={[
              { name: "title", label: "Title", type: "text", value: g.title },
              { name: "description", label: "Description", type: "textarea", value: g.description },
              { name: "content", label: "Content (Markdown)", type: "textarea", value: g.content },
              { name: "seoTitle", label: "SEO title", type: "text", value: g.seoTitle },
              { name: "seoDescription", label: "SEO description", type: "textarea", value: g.seoDescription },
              { name: "status", label: "Status", type: "status", value: g.status },
            ]}
          />
        ))}
      </div>
    </>
  );
}
