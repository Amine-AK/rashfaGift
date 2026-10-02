/**
 * Create (or reset the PIN of) a staff member.
 *   npm run staff:create -- --name "Amine" --pin 482913 --role admin
 * Admin PINs must be at least 6 digits, barista PINs at least 4.
 */
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: { name: { type: "string" }, pin: { type: "string" }, role: { type: "string", default: "barista" } },
});
const { name, pin, role } = values;
if (!name || !pin || !/^\d+$/.test(pin)) throw new Error('Usage: --name "Name" --pin 123456 [--role admin|barista]');
if (role !== "admin" && role !== "barista") throw new Error("role must be admin or barista");
if (pin.length < (role === "admin" ? 6 : 4)) throw new Error(`${role} PIN is too short`);

async function main(name: string, pin: string, role: "admin" | "barista") {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });
  const hash = await bcrypt.hash(pin, 10);
  const [existing] = await sql`select id from staff where lower(name) = lower(${name})`;
  // Staff log in with their PIN only, so two people must never share one.
  for (const other of await sql`select id, name, pin_hash from staff where active`) {
    if (other.id !== existing?.id && (await bcrypt.compare(pin, other.pin_hash))) {
      throw new Error(`This PIN is already used by ${other.name}. Choose another one.`);
    }
}
if (existing) {
  await sql`update staff set pin_hash = ${hash}, role = ${role}, active = true where id = ${existing.id}`;
  console.log(`updated ${name} (${role})`);
} else {
  await sql`insert into staff (name, pin_hash, role) values (${name}, ${hash}, ${role})`;
  console.log(`created ${name} (${role})`);
}
await sql.end();
}

main(name, pin, role);
