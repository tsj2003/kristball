import { ArcElement, Chart as ChartJS, Legend, Tooltip } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { Holding } from "../api/client";
import { EmptyState } from "./ui";

ChartJS.register(ArcElement, Tooltip, Legend);

const colors: Record<string, string> = {
  WEAPON: "#e8a54b",
  VEHICLE: "#7ec8c2",
  AMMUNITION: "#c9b089",
};

export function HoldingsChart({ rows }: { rows: Holding[] }) {
  const totals = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.category] = (acc[row.category] ?? 0) + row.available;
    return acc;
  }, {});
  const labels = Object.keys(totals);
  if (labels.length === 0) {
    return <EmptyState>No available stock to chart.</EmptyState>;
  }

  return (
    <div className="mx-auto h-56 max-w-xs">
      <Doughnut
        data={{
          labels,
          datasets: [
            {
              data: labels.map((label) => totals[label]),
              backgroundColor: labels.map((label) => colors[label] ?? "#9aa392"),
              borderColor: "#07090b",
              borderWidth: 2,
            },
          ],
        }}
        options={{
          plugins: {
            legend: {
              labels: { color: "#f3ead8", boxWidth: 12 },
            },
          },
        }}
      />
    </div>
  );
}
