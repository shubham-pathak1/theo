import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import { plans, roles } from "../adminConstants.js";
import { AdminPageFrame, Panel } from "../components/AdminPageFrame.jsx";
import { AdminTable, FilterSelect, SearchField, UserCell, formatDate } from "../components/AdminTable.jsx";

export function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ q: "", plan: "all", role: "all" });
  const [notice, setNotice] = useState("");

  async function loadUsers() {
    try {
      const params = new URLSearchParams();
      if (filters.q.trim()) params.set("q", filters.q.trim());
      params.set("plan", filters.plan);
      params.set("role", filters.role);
      const data = await api.get(`/api/admin/users?${params.toString()}`);
      setUsers(data.users || []);
    } catch (error) {
      setNotice(error.message);
    }
  }

  useEffect(() => {
    loadUsers();
  }, [filters.plan, filters.role]);

  async function updateUser(userId, patch) {
    try {
      const data = await api.patch(`/api/admin/users/${userId}`, patch);
      setUsers((current) => current.map((user) => (user.id === userId ? { ...user, ...data.user } : user)));
      setNotice("User updated.");
    } catch (error) {
      setNotice(error.message);
    }
  }

  return (
    <AdminPageFrame eyebrow="Users" title="User management" subtitle="Review accounts, plans, roles, and verification status." notice={notice}>
      <Panel
        title="Accounts"
        action={
          <div className="flex flex-wrap gap-2">
            <SearchField value={filters.q} onChange={(q) => setFilters((current) => ({ ...current, q }))} onSubmit={loadUsers} />
            <FilterSelect value={filters.plan} options={["all", ...plans]} onChange={(plan) => setFilters((current) => ({ ...current, plan }))} />
            <FilterSelect value={filters.role} options={["all", ...roles]} onChange={(role) => setFilters((current) => ({ ...current, role }))} />
          </div>
        }
      >
        <AdminTable
          columns={["User", "Plan", "Role", "Usage", "Joined"]}
          rows={users.map((user) => [
            <UserCell key="user" user={user} />,
            <FilterSelect key="plan" value={user.plan} options={plans} onChange={(plan) => updateUser(user.id, { plan })} compact />,
            <FilterSelect key="role" value={user.role} options={roles} onChange={(role) => updateUser(user.id, { role })} compact />,
            <span key="usage">{user.conversations} chats / {user.images} images</span>,
            formatDate(user.createdAt)
          ])}
        />
      </Panel>
    </AdminPageFrame>
  );
}
