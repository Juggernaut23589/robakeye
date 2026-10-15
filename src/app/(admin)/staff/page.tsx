import { listStaff, listRoles, listBranchesForStaff } from "@/actions/staff-admin";
import { StaffList } from "@/components/admin/staff-list";
import { NewStaffForm } from "@/components/admin/new-staff-form";

export default async function StaffPage() {
  const [staff, roles, branches] = await Promise.all([listStaff(), listRoles(), listBranchesForStaff()]);

  return (
    <main className="p-8">
      <h1 className="mb-4 font-display text-2xl font-bold text-rk-navy">Staff</h1>

      <div className="mb-6">
        <StaffList staff={staff} roles={roles} branches={branches} />
      </div>

      <h2 className="mb-3 font-semibold text-rk-navy">Add staff account</h2>
      <NewStaffForm roles={roles} branches={branches} />
    </main>
  );
}
