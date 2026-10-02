import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { getCustomerSession } from "@/lib/auth/customer";
import { sql } from "@/lib/db";
import { tr, type I18nText } from "@/lib/i18n-text";

const TILES = ["#D9483B", "#1F4E9C", "#2F7D4F", "#E8B43A", "#2BA59B", "#E58FA6"];

function TileRow() {
  return (
    <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
      {Array.from({ length: 16 }, (_, i) => (
        <div key={i} style={{ width: 52, height: 52, borderRadius: 6, background: TILES[(i * 5) % TILES.length] }} />
      ))}
    </div>
  );
}

/** Story-sized (1080×1920) picture of a gift, for Instagram or WhatsApp. */
export async function GET(request: Request, ctx: RouteContext<"/api/share/[id]">) {
  const session = await getCustomerSession();
  if (!session) return new Response("unauthenticated", { status: 401 });
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("not found", { status: 404 });
  const [gift] = await sql<{ title: I18nText; source: string; revealedAt: Date | null }[]>`
    select title, source, revealed_at from customer_gifts where id = ${id} and customer_id = ${session.customerId}`;
  if (!gift || (gift.source === "mystery" && !gift.revealedAt)) return new Response("not found", { status: 404 });

  // The built-in image font has no Arabic glyphs, so Arabic shares use the French text.
  const requested = new URL(request.url).searchParams.get("locale") ?? "fr";
  const locale = requested === "en" ? "en" : "fr";
  const t = await getTranslations({ locale, namespace: "share" });
  const origin = new URL(request.url).origin;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#FBF6EE", padding: "90px 40px", color: "#3B2418" }}>
        <TileRow />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${origin}/icons/mascot.svg`} width={360} height={372} alt="" />
          <div style={{ marginTop: 50, fontSize: 44, color: "#8B5A2B", fontStyle: "italic" }}>{t("slogan")}</div>
          <div style={{ marginTop: 30, fontSize: 40, color: "#8B5A2B" }}>{t("gotGift")}</div>
          <div style={{ marginTop: 20, fontSize: 84, fontWeight: 700, color: "#2F5D3A", lineHeight: 1.1, maxWidth: 900 }}>{tr(gift.title, locale)}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 40 }}>
          <div style={{ fontSize: 72, fontWeight: 700, letterSpacing: 2 }}>Rashfa</div>
          <TileRow />
        </div>
      </div>
    ),
    { width: 1080, height: 1920, headers: { "Cache-Control": "private, no-store" } },
  );
}
