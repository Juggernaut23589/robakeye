"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateStaffRole, toggleStaffActive, setStaffBranches } from "@/actions/staff-admin";
import { Badge } from "@/components/ui/badge";

type StaffRow = {
  id: string;
  isActive: boolean;
  user: { name: string; email: string };
  role: { name: string };
  branches: { branchId: string; branch: { name: string } }[];
};

export function StaffList({ staff, roles, branches }: {
  staff: StaffRow[];
  roles: { id: string; name: string }[];
  branches: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function onRoleChange(staffId: string, roleId: string) {
    setPendingId(staffId);
    await updateStaffRole(staffId, roleId);
    setPendingId(null);
    router.refresh();
  }

  async function onToggleActive(staffId: string) {
    setPendingId(staffId);
    await toggleStaffActive(staffId);
    setPendingId(null);
    router.refresh();
  }

  async function onBranchToggle(staffId: string, current: string[], branchId: string) {
    const next = current.includes(branchId) ? current.filter((b) => b !== branchId) : [...current, branchId];
    setPendingId(staffId);
    await setStaffBranches(staffId, next);
    setPendingId(null);
    router.refresh();
  }

  return (
    <div className="overflow-x-auto rounded-rk-md border border-rk-n200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-rk-n50 text-xs text-rk-n600">
          <tr>
            <th className="p-3">Name</th>
            <th className="p-3">Email</th>
            <th className="p-3">Role</th>
            <th className="p-3">Branches</th>
            <th className="p-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-rk-n200">
          {staff.map((s) => {
            const assignedBranchIds = s.branches.map((b) => b.branchId);
            return (
              <tr key={s.id}>
                <td className="p-3">{s.user.name}</td>
                <td className="p-3 text-xs">{s.user.email}</td>
                <td className="p-3">
                  <select
                    defaultValue={roles.find((r) => r.name === s.role.name)?.id}
                    disabled={pendingId === s.id}
                    onChange={(e) => onRoleChange(s.id, e.target.value)}
                    className="rounded-rk-sm border border-rk-n200 px-2 py-1 text-xs"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {branches.map((b) => {
                      const active = assignedBranchIds.includes(b.id);
                      return (
                        <button
                          key={b.id}
                          disabled={pendingId === s.id}
                          onClick={() => onBranchToggle(s.id, assignedBranchIds, b.id)}
                          className={`rounded-rk-pill border px-2 py-0.5 text-xs ${
                            active ? "border-rk-navy bg-rk-navy-tint text-rk-navy" : "border-rk-n200 text-rk-n600"
                          }`}
                        >
                          {b.name}
                        </button>
                      );
                    })}
                  </div>
                </td>
                <td className="p-3">
                  <button disabled={pendingId === s.id} onClick={() => onToggleActive(s.id)}>
                    <Badge variant={s.isActive ? "success" : "neutral"}>{s.isActive ? "Active" : "Inactive"}</Badge>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
