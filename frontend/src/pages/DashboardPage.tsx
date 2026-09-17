import { useEffect, useMemo, useState } from "react";
import { api, apiError, Base, EquipmentType, Holding, PersonnelHolding, Summary } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { DateFilters, Filters } from "../components/DateFilters";
import { ErrorBanner, Panel } from "../components/ui";
import { HoldingsChart } from "../components/HoldingsChart";
import { HoldingsTable } from "../components/HoldingsTable";
import { MetricCards } from "../components/MetricCards";
import { NetMovementModal } from "../components/NetMovementModal";
import { PageHeader } from "../components/PageHeader";
import { PersonnelHoldings } from "../components/PersonnelHoldings";
import { SkeletonRow } from "../components/SkeletonRow";
import { formatQty, toDateInput } from "../lib/format";

const yearStart = `${new Date().getFullYear()}-01-01`;
const today = toDateInput();

export function DashboardPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<Filters>({
    startDate: yearStart,
    endDate: today,
    baseId: "",
    equipmentTypeId: "",
  });
  const [bases, setBases] = useState<Base[]>([]);
  const [equipment, setEquipment] = useState<EquipmentType[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [people, setPeople] = useState<PersonnelHolding[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [netOpen, setNetOpen] = useState(false);
  const [breakdown, setBreakdown] = useState<null | {
    purchases: { total: number; rows: Array<Record<string, unknown>> };
    transfersIn: { total: number; rows: Array<Record<string, unknown>> };
    transfersOut: { total: number; rows: Array<Record<string, unknown>> };
    netMovement: number;
  }>(null);

  const isAdmin = user?.role === "ADMIN";
  const isCommander = user?.role === "BASE_COMMANDER";
  const isLogistics = user?.role === "LOGISTICS_OFFICER";

  const query = useMemo(() => {
    const params: Record<string, string> = {};
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (isAdmin && filters.baseId) params.baseId = filters.baseId;
    if (filters.equipmentTypeId) params.equipmentTypeId = filters.equipmentTypeId;
    return params;
  }, [filters, isAdmin]);

  useEffect(() => {
    api.get("/bases").then((res) => setBases(res.data.bases)).catch(() => undefined);
    api.get("/equipment-types").then((res) => setEquipment(res.data.equipmentTypes)).catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.get("/dashboard/summary", { params: query }),
      api.get("/dashboard/holdings", { params: query }),
      api.get("/dashboard/personnel-holdings", { params: query }),
    ])
      .then(([s, h, p]) => {
        if (cancelled) return;
        setSummary(s.data.summary);
        setHoldings(h.data.holdings);
        setPeople(p.data.assignments);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(apiError(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  async function openNet() {
    setNetOpen(true);
    setBreakdown(null);
    try {
      const res = await api.get("/dashboard/net-movement", { params: query });
      setBreakdown(res.data.breakdown);
    } catch (err) {
      setError(apiError(err));
    }
  }

  const headline = isCommander
    ? `${user?.base?.name ?? "Your station"} — cage stock and remaining on issue`
    : isLogistics
      ? "Inbound, outbound, and what is still in the cage"
      : "Force-wide ledger. Opening, net, closing — computed, not stored.";

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="ARMIGER // SITREP"
        title={isCommander ? "Station sitrep" : isLogistics ? "Movement desk" : "Force sitrep"}
      >
        {headline}
      </PageHeader>

      <Panel title="Window">
        <DateFilters
          filters={filters}
          onChange={setFilters}
          bases={bases}
          equipment={equipment}
          showBase={Boolean(isAdmin)}
        />
        <p className="mt-3 text-xs text-muted">
          Closing = Opening + Net movement − Assigned − Expended. Opening is computed from activity before the start
          date. Net movement = Purchases + Transfers in − Transfers out.
        </p>
      </Panel>

      <ErrorBanner message={error} />

      {loading && !summary ? <SkeletonRow rows={3} /> : summary && <MetricCards summary={summary} onNetClick={openNet} />}

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title={isLogistics ? "Cage available" : "On hand now"}>
          <HoldingsTable rows={holdings} showBase={Boolean(isAdmin && !filters.baseId)} />
        </Panel>
        <Panel title="Available by class">
          <HoldingsChart rows={holdings} />
        </Panel>
      </div>
      <div className="grid gap-6">
        <Panel title={isCommander ? "Remaining on issue" : "Issued to personnel"}>
          {isLogistics ? (
            <div className="space-y-3">
              <p className="text-sm text-muted">
                Issued equipment is no longer in the cage. Remaining figures update when commanders record expenditure.
              </p>
              <PersonnelHoldings rows={people} />
            </div>
          ) : (
            <PersonnelHoldings rows={people} />
          )}
        </Panel>
      </div>

      {isCommander && (
        <Panel title="Watch">
          {people
            .filter((row) => row.category === "AMMUNITION")
            .slice(0, 3)
            .map((row) => (
              <div key={row.assignmentId} className="plate px-4 py-3">
                <div className="text-sm">
                  {row.rank} {row.personnelName} holds {formatQty(row.remaining, row.unit)} of {row.equipmentName}{" "}
                  remaining
                  {row.expended > 0 ? ` after expending ${formatQty(row.expended, row.unit)}` : ""}.
                </div>
              </div>
            ))}
        </Panel>
      )}

      <NetMovementModal open={netOpen} onClose={() => setNetOpen(false)} breakdown={breakdown} />
    </div>
  );
}
