import { db } from "@/lib/db/client";
import { getCurrentUser, hasRole } from "@/lib/auth/session";
import { Table } from "@/components/admin/admin-ui";
import { RoleSelect } from "@/components/admin/content-editor";

export default async function AdminUsers() {
  const me = (await getCurrentUser())!;
  const users = await db.user.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { adminUser: true, _count: { select: { trips: true } } } });
  const canManage = hasRole(me.adminUser?.role, "ADMIN");
  return (
    <>
      <h1 className="text-2xl font-bold">Users</h1>
      {!canManage && <p className="text-sm text-muted-foreground">Only admins can change roles.</p>}
      <Table
        head={["Email", "Name", "Joined", "Trips", "Admin role"]}
        rows={users.map((u) => [
          u.email,
          u.name ?? "–",
          u.createdAt.toISOString().slice(0, 10),
          u._count.trips,
          canManage ? <RoleSelect key={u.id} userId={u.id} role={u.adminUser?.role ?? null} disabled={u.id === me.id} /> : (u.adminUser?.role ?? "–"),
        ])}
      />
    </>
  );
}
