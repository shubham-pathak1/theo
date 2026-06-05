import { BadgeCheck, Ban, Search } from "lucide-react";

export function AdminTable({ columns, rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="text-xs uppercase tracking-[0.16em] text-[#8f887f]">
          <tr>
            {columns.map((column) => (
              <th key={column} className="border-b border-white/10 px-3 py-3 font-semibold">{column}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-4 align-top text-[#c9c3ba]">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function UserCell({ user, simple = false }) {
  return (
    <div>
      <div className="font-semibold text-[#f4f1ea]">{user.displayName}</div>
      <div className="mt-1 flex items-center gap-2 text-xs text-[#8f887f]">
        <span>{user.email}</span>
        {!simple && (user.emailVerified ? <BadgeCheck size={14} className="text-emerald-300" /> : <Ban size={14} className="text-[#d9895f]" />)}
      </div>
    </div>
  );
}

export function SearchField({ value, onChange, onSubmit }) {
  return (
    <label className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8f887f]" size={16} />
      <input
        className="h-10 w-64 border border-white/10 bg-[#11110f] pl-9 pr-3 text-sm outline-none placeholder:text-[#8f887f] focus:border-white/30"
        placeholder="Search users"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => event.key === "Enter" && onSubmit()}
      />
    </label>
  );
}

export function FilterSelect({ value, options, onChange, compact = false }) {
  return (
    <select
      className={`${compact ? "h-9" : "h-10"} border border-white/10 bg-[#11110f] px-3 text-sm capitalize text-[#f4f1ea] outline-none focus:border-white/30`}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
  );
}

export function StatusPill({ value }) {
  const good = ["done", "active", "activated", "authenticated", "published"].includes(value);
  const bad = ["failed", "cancelled"].includes(value);

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs capitalize ${good ? "bg-emerald-400/10 text-emerald-200" : bad ? "bg-[#d9895f]/15 text-[#f0b58c]" : "bg-white/10 text-[#c9c3ba]"}`}>
      {value}
    </span>
  );
}

export function formatDate(value) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}
