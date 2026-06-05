import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import { AdminPageFrame, Panel } from "../components/AdminPageFrame.jsx";
import { AdminTable, StatusPill, UserCell, formatDate } from "../components/AdminTable.jsx";

export function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    api.get("/api/admin/subscriptions").then((data) => setSubscriptions(data.subscriptions || [])).catch((error) => setNotice(error.message));
  }, []);

  return (
    <AdminPageFrame eyebrow="Subscriptions" title="Billing records" subtitle="Subscription records from Razorpay and demo activation flows." notice={notice}>
      <Panel title="Latest records">
        <AdminTable
          columns={["Customer", "Plan", "Status", "Provider ID", "Created"]}
          rows={subscriptions.map((subscription) => [
            <UserCell key="user" user={subscription.user || { displayName: "Unknown", email: "No user linked" }} simple />,
            <span key="plan" className="capitalize">{subscription.plan}</span>,
            <StatusPill key="status" value={subscription.status} />,
            <span key="provider" className="block max-w-xs truncate text-xs text-[#8f887f]">{subscription.providerSubscriptionId}</span>,
            formatDate(subscription.createdAt)
          ])}
        />
      </Panel>
    </AdminPageFrame>
  );
}
