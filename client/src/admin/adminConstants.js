import { BarChart3, CreditCard, Home, Image, Users } from "lucide-react";

export const plans = ["free", "pro", "max"];
export const roles = ["user", "admin"];
export const imageStatuses = ["all", "queued", "processing", "done", "failed", "cancelled"];

export const adminNav = [
  { to: "/admin", label: "Overview", icon: Home, end: true },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/images", label: "Image jobs", icon: Image },
  { to: "/admin/subscriptions", label: "Billing", icon: CreditCard }
];
