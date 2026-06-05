import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import { AreaBars } from "../components/AdminCharts.jsx";
import { AdminPageFrame, Panel } from "../components/AdminPageFrame.jsx";

export function AdminAnalyticsPage() {
  const [overview, setOverview] = useState(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    api.get("/api/admin/overview").then(setOverview).catch((error) => setNotice(error.message));
  }, []);

  return (
    <AdminPageFrame
      eyebrow="Analytics"
      title="Usage and reliability"
      subtitle="Fourteen-day aggregate trends for operations review."
      notice={notice}
    >
      {overview && (
        <section className="grid gap-4">
          <Panel title="User growth">
            <AreaBars data={overview.charts.userGrowth} />
          </Panel>
          <Panel title="Image jobs">
            <AreaBars data={overview.charts.imageJobs} />
          </Panel>
          <Panel title="Subscriptions">
            <AreaBars data={overview.charts.subscriptionGrowth} />
          </Panel>
          <Panel title="Image failures">
            <AreaBars data={overview.charts.imageFailures} tone="warning" />
          </Panel>
        </section>
      )}
    </AdminPageFrame>
  );
}
