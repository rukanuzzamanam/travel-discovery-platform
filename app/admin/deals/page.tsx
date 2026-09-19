import { db } from "@/lib/db/client";
import { ContentEditor } from "@/components/admin/content-editor";

export default async function AdminDeals() {
  const list = await db.deal.findMany({ orderBy: { title: "asc" } });
  return (
    <>
      <h1 className="text-2xl font-bold">Deals</h1>
      <p className="text-sm text-muted-foreground">Prices here are shown to visitors as typical fares (estimates). Only enter provider-confirmed figures if you also change the price kind in the database.</p>
      <div className="space-y-3">
        {list.map((d) => (
          <ContentEditor
            key={d.id}
            kind="deals"
            id={d.id}
            title={d.title}
            status={d.status}
            fields={[
              { name: "title", label: "Title", type: "text", value: d.title },
              { name: "description", label: "Description", type: "textarea", value: d.description },
              { name: "fromPriceUsd", label: "Typical fare (USD)", type: "number", value: d.fromPriceUsd },
              { name: "status", label: "Status", type: "status", value: d.status },
            ]}
          />
        ))}
      </div>
    </>
  );
}
