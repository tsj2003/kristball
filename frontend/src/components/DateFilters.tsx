import { Base, EquipmentType } from "../api/client";
import { Field, fieldClass } from "./ui";

export type Filters = {
  startDate: string;
  endDate: string;
  baseId: string;
  equipmentTypeId: string;
};

export function DateFilters({
  filters,
  onChange,
  bases,
  equipment,
  showBase,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
  bases: Base[];
  equipment: EquipmentType[];
  showBase: boolean;
}) {
  function patch(partial: Partial<Filters>) {
    onChange({ ...filters, ...partial });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Start date">
        <input
          type="date"
          className={fieldClass}
          value={filters.startDate}
          onChange={(e) => patch({ startDate: e.target.value })}
        />
      </Field>
      <Field label="End date">
        <input
          type="date"
          className={fieldClass}
          value={filters.endDate}
          onChange={(e) => patch({ endDate: e.target.value })}
        />
      </Field>
      {showBase && (
        <Field label="Base">
          <select className={fieldClass} value={filters.baseId} onChange={(e) => patch({ baseId: e.target.value })}>
            <option value="">All bases</option>
            {bases.map((base) => (
              <option key={base.id} value={base.id}>
                {base.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label="Equipment">
        <select
          className={fieldClass}
          value={filters.equipmentTypeId}
          onChange={(e) => patch({ equipmentTypeId: e.target.value })}
        >
          <option value="">All types</option>
          {equipment.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}
