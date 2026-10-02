"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import { createStaffAction, resetPinAction, setStaffActiveAction } from "@/app/[locale]/admin/actions";
import { StatusMessage, useAdminAction } from "./form";

export type StaffRow = { id: string; name: string; role: "barista" | "admin"; active: boolean };

function PinInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <Input inputMode="numeric" autoComplete="off" dir="ltr" maxLength={12} value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))} />;
}

export function TeamEditor({ staff, meId }: { staff: StaffRow[]; meId: string }) {
  const t = useTranslations("admin.team");
  const { pending, message, run } = useAdminAction();
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState<"barista" | "admin">("barista");
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [newPin, setNewPin] = useState("");

  return (
    <div className="space-y-4">
      <Card>
        <ul className="space-y-2">
          {staff.map((s) => (
            <li key={s.id} className={`rounded-2xl bg-cream p-4 ${s.active ? "" : "opacity-60"}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p>
                  <span className="font-bold">{s.name}</span> · {t(`role.${s.role}`)}
                  {!s.active && ` · ${t("inactive")}`}
                </p>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => (setResetFor(resetFor === s.id ? null : s.id), setNewPin(""))}>
                    {t("resetPin")}
                  </Button>
                  {s.id !== meId && (
                    <Button variant={s.active ? "danger" : "secondary"} disabled={pending} onClick={() => run(() => setStaffActiveAction(s.id, !s.active))}>
                      {s.active ? t("deactivate") : t("activate")}
                    </Button>
                  )}
                </div>
              </div>
              {resetFor === s.id && (
                <form
                  className="mt-3 flex items-end gap-2"
                  onSubmit={(e) => (e.preventDefault(), run(() => resetPinAction(s.id, newPin), () => setResetFor(null)))}
                >
                  <Field label={t("newPin")} hint={t(s.role === "admin" ? "pinHintAdmin" : "pinHint")}>
                    <PinInput value={newPin} onChange={setNewPin} />
                  </Field>
                  <Button type="submit" disabled={pending}>
                    {t("save")}
                  </Button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <h2 className="mb-3 font-serif text-xl font-bold">{t("add")}</h2>
        <form
          className="grid gap-4 sm:grid-cols-4 sm:items-end"
          onSubmit={(e) => (e.preventDefault(), run(() => createStaffAction({ name, pin, role }), () => (setName(""), setPin(""))))}
        >
          <Field label={t("name")}>
            <Input value={name} required maxLength={40} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label={t("pin")} hint={t(role === "admin" ? "pinHintAdmin" : "pinHint")}>
            <PinInput value={pin} onChange={setPin} />
          </Field>
          <Field label={t("roleLabel")}>
            <Select value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
              <option value="barista">{t("role.barista")}</option>
              <option value="admin">{t("role.admin")}</option>
            </Select>
          </Field>
          <Button type="submit" disabled={pending}>
            {t("create")}
          </Button>
        </form>
      </Card>
      <StatusMessage message={message} />
    </div>
  );
}
