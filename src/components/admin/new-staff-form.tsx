"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createStaffAccount } from "@/actions/staff-admin";
import { Button } from "@/components/ui/button";

export function NewStaffForm({ roles, branches }: { roles: { id: string; name: string }[]; branches: { id: string; name: string }[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState(roles[0]?.id ?? "");
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function toggleBranch(id: string) {
    setBranchIds((b) => (b.includes(id) ? b.filter((x) => x !== id) : [...b, id]));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result = await createStaffAccount({ name, email, password, roleId, branchIds });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setName("");
    setEmail("");
    setPassword("");
    setBranchIds([]);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-rk-md border border-rk-n200 bg-white p-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs text-rk-n600">
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} required className="mt-0.5 block w-full rounded-rk-sm border border-rk-n200 px-2 py-1.5" />
        </label>
        <label className="text-xs text-rk-n600">
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-0.5 block w-full rounded-rk-sm border border-rk-n200 px-2 py-1.5" />
        </label>
        <label className="text-xs text-rk-n600">
          Temporary password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="mt-0.5 block w-full rounded-rk-sm border border-rk-n200 px-2 py-1.5" />
        </label>
      </div>

      <label className="text-xs text-rk-n600">
        Role
        <select value={roleId} onChange={(e) => setRoleId(e.target.value)} className="mt-0.5 block w-60 rounded-rk-sm border border-rk-n200 px-2 py-1.5">
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </label>

      <div>
        <p className="mb-1 text-xs text-rk-n600">Branch assignment (leave empty for a role scoped to all branches)</p>
        <div className="flex flex-wrap gap-2">
          {branches.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => toggleBranch(b.id)}
              className={`rounded-rk-pill border px-3 py-1 text-xs ${
                branchIds.includes(b.id) ? "border-rk-navy bg-rk-navy-tint text-rk-navy" : "border-rk-n200 text-rk-n600"
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-rk-alert">{error}</p>}

      <Button type="submit" loading={pending} className="w-fit">
        Create staff account
      </Button>
    </form>
  );
}
