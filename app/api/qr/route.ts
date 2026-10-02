import QRCode from "qrcode";
import { getCustomerSession } from "@/lib/auth/customer";
import { sql } from "@/lib/db";
import { env } from "@/lib/env";
import { createQrToken } from "@/lib/qr";

export const dynamic = "force-dynamic";

/**
 * The customer's rotating personal code (or a gift's code with ?gift=<id>).
 * The token is signed server-side; the phone only ever sees a picture of it.
 */
export async function GET(request: Request) {
  const session = await getCustomerSession();
  if (!session) return Response.json({ error: "unauthenticated" }, { status: 401 });

  const giftId = new URL(request.url).searchParams.get("gift");
  let kind: "c" | "g" = "c";
  let id = session.customerId;
  if (giftId) {
    if (!/^[0-9a-f-]{36}$/i.test(giftId)) return Response.json({ error: "not_found" }, { status: 404 });
    const [gift] = await sql`
      select g.id from customer_gifts g join customers u on u.id = g.customer_id
      where g.id = ${giftId} and g.customer_id = ${session.customerId} and u.deleted_at is null`;
    if (!gift) return Response.json({ error: "not_found" }, { status: 404 });
    kind = "g";
    id = giftId;
  } else {
    const [me] = await sql`select 1 from customers where id = ${id} and deleted_at is null`;
    if (!me) return Response.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { token, expiresAt } = createQrToken(kind, id, env.qrSecret());
  const svg = await QRCode.toString(token, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#3B2418", light: "#FFFFFF" },
  });
  return Response.json({ svg, expiresAt }, { headers: { "Cache-Control": "no-store" } });
}
