import type { ReactNode } from "react";
import { Header } from "./Header";

export function PageShell({ children, homeHref, wide = false }: { children: ReactNode; homeHref?: string; wide?: boolean }) {
  return (
    <>
      <Header href={homeHref} />
      <main className={`mx-auto w-full ${wide ? "max-w-5xl" : "max-w-xl"} px-4 pb-16 pt-5`}>{children}</main>
    </>
  );
}
