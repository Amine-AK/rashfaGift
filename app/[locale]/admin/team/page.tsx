import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { TeamEditor, type StaffRow } from "@/components/admin/TeamEditor";
import { sql } from "@/lib/db";
import { getCurrentStaff } from "@/lib/auth/staff";

export const dynamic = "force-dynamic";

export default async function TeamPage({ params }: PageProps<"/[locale]/admin/team">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, format, me] = await Promise.all([getTranslations("admin.team"), getFormatter(), getCurrentStaff()]);
  const staff = await sql<StaffRow[]>`select id, name, role, active from staff order by active desc, name`;
  const log = await sql<{ id: number; action: string; name: string | null; customer: string | null; createdAt: Date }[]>`
    select a.id, a.action, s.name, c.first_name as customer, a.created_at
    from audit_log a left join staff s on s.id = a.staff_id left join customers c on c.id = a.customer_id
    order by a.id desc limit 40`;
  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl font-bold">{t("title")}</h1>
      <TeamEditor staff={staff} meId={me!.id} />
      <Card>
        <h2 className="font-serif text-xl font-bold">{t("audit")}</h2>
        <p className="mb-3 text-sm text-wood-dark">{t("auditHint")}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {log.map((row) => (
                <tr key={row.id} className="border-t border-wood/15">
                  <td className="whitespace-nowrap py-1.5 pe-3 tabular-nums text-wood-dark">
                    {format.dateTime(row.createdAt, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="py-1.5 pe-3 font-bold">{row.name ?? "—"}</td>
                  <td className="py-1.5 pe-3">{t.has(`actions.${row.action}`) ? t(`actions.${row.action}`) : row.action}</td>
                  <td className="py-1.5">{row.customer ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
