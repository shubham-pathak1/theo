import { Activity, Ban, CreditCard, Image, RefreshCw, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api.js";
import { imageStatuses, plans } from "../adminConstants.js";
import { Breakdown, LineChart } from "../components/AdminCharts.jsx";
import { AdminPageFrame, MetricCard, MiniStat, Panel } from "../components/AdminPageFrame.jsx";

export function AdminOverviewPage() {
  const [overview, setOverview] = useState(null);
  const [notice, setNotice] = useState("");

  async function loadOverview() {
    try {
      setNotice("");
      setOverview(await api.get("/api/admin/overview"));
    } catch (error) {
      setNotice(error.message);
    }
  }

  useEffect(() => {
    loadOverview();
  }, []);

  const planRows = useMemo(() => overview?.breakdowns?.usersByPlan || {}, [overview]);
  const statusRows = useMemo(() => overview?.breakdowns?.imagesByStatus || {}, [overview]);

  return (
    <AdminPageFrame
      eyebrow="Overview"
      title="Operations dashboard"
      subtitle="Aggregate product health, growth, billing, and image job signals."
      action={<button className="icon-btn" onClick={loadOverview}><RefreshCw size={16} /> Refresh</button>}
      notice={notice}
    >
      {overview && (
        <>
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard icon={Users} label="Users" value={overview.totals.users} note={`${overview.totals.verifiedUsers} verified`} />
            <MetricCard icon={Activity} label="Chats" value={overview.totals.conversations} note="aggregate count" />
            <MetricCard icon={Image} label="Images" value={overview.totals.images} note={`${overview.totals.publishedImages} published`} />
            <MetricCard icon={CreditCard} label="Active subs" value={overview.totals.activeSubscriptions} note="active records" />
            <MetricCard icon={Ban} label="Failures 24h" value={overview.activity.failedImages24h} note={`${overview.activity.images24h} jobs today`} />
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
            <Panel title="Growth">
              <LineChart
                series={[
                  { label: "Users", values: overview.charts.userGrowth },
                  { label: "Image jobs", values: overview.charts.imageJobs }
                ]}
              />
            </Panel>
            <Panel title="Plan distribution">
              <Breakdown rows={plans.map((plan) => [plan, planRows[plan] || 0])} />
            </Panel>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <Panel title="Image job health">
              <Breakdown rows={imageStatuses.filter((status) => status !== "all").map((status) => [status, statusRows[status] || 0])} />
            </Panel>
            <Panel title="24 hour activity">
              <div className="grid gap-3 sm:grid-cols-3">
                <MiniStat label="New users" value={overview.activity.newUsers24h} />
                <MiniStat label="Image jobs" value={overview.activity.images24h} />
                <MiniStat label="Failed jobs" value={overview.activity.failedImages24h} />
              </div>
            </Panel>
          </section>
        </>
      )}
    </AdminPageFrame>
  );
}
