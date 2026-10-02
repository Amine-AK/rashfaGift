import "server-only";
import postgres from "postgres";

type Sql = postgres.Sql;
export type Tx = postgres.TransactionSql;

const globalForDb = globalThis as unknown as { __rashfaSql?: Sql };

function create(): Sql {
  return postgres(process.env.DATABASE_URL ?? "", {
    // Supabase's pooler (transaction mode) does not support prepared statements.
    prepare: false,
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    idle_timeout: 20,
    transform: postgres.camel,
    types: {
      // numeric → JS number (prices and amounts are small, 2 decimals)
      numeric: { to: 1700, from: [1700], serialize: (v: number) => String(v), parse: (v: string) => Number(v) },
    },
  });
}

/** Shared connection pool. Created lazily so builds work without a database. */
export const sql: Sql = new Proxy(function () {} as unknown as Sql, {
  get(_target, prop) {
    globalForDb.__rashfaSql ??= create();
    const value = Reflect.get(globalForDb.__rashfaSql, prop);
    return typeof value === "function" ? value.bind(globalForDb.__rashfaSql) : value;
  },
  apply(_target, _this, args) {
    globalForDb.__rashfaSql ??= create();
    return Reflect.apply(globalForDb.__rashfaSql as unknown as (...a: unknown[]) => unknown, undefined, args);
  },
});
