"use client";

import { useState, useMemo } from "react";

/**
 * CountryStatusPivotTable:
 * Displays Country, Active, Suspended, Deleted, Total with client-side sorting.
 * Features a sticky footer calculating totals from all rows (including Other).
 */
export default function CountryStatusPivotTable({ data = [] }) {
  const [sortField, setSortField] = useState("total");
  const [sortAsc, setSortAsc] = useState(false);

  const sortedData = useMemo(() => {
    const list = [...data];
    list.sort((a, b) => {
      let va = a[sortField];
      let vb = b[sortField];
      if (typeof va === "string") {
        va = va.toLowerCase();
        vb = (vb || "").toLowerCase();
        return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      va = Number(va) || 0;
      vb = Number(vb) || 0;
      return sortAsc ? va - vb : vb - va;
    });
    return list;
  }, [data, sortField, sortAsc]);

  const totals = useMemo(() => {
    return data.reduce(
      (acc, row) => ({
        active: acc.active + (row.active || 0),
        suspended: acc.suspended + (row.suspended || 0),
        deleted: acc.deleted + (row.deleted || 0),
        total: acc.total + (row.total || 0),
      }),
      { active: 0, suspended: 0, deleted: 0, total: 0 }
    );
  }, [data]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // default descending for numbers
    }
  };

  const sortIndicator = (field) => {
    if (sortField !== field) return "↕";
    return sortAsc ? "↑" : "↓";
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <tr>
            <th
              className="th cursor-pointer select-none hover:text-slate-900"
              onClick={() => handleSort("countryName")}
            >
              <div className="flex items-center gap-1.5">
                <span>Country</span>
                <span className="text-[11px] text-slate-400">{sortIndicator("countryName")}</span>
              </div>
            </th>
            <th
              className="th text-right cursor-pointer select-none hover:text-slate-900"
              onClick={() => handleSort("active")}
            >
              <div className="flex items-center justify-end gap-1.5">
                <span>Active</span>
                <span className="text-[11px] text-slate-400">{sortIndicator("active")}</span>
              </div>
            </th>
            <th
              className="th text-right cursor-pointer select-none hover:text-slate-900"
              onClick={() => handleSort("suspended")}
            >
              <div className="flex items-center justify-end gap-1.5">
                <span>Suspended</span>
                <span className="text-[11px] text-slate-400">{sortIndicator("suspended")}</span>
              </div>
            </th>
            <th
              className="th text-right cursor-pointer select-none hover:text-slate-900"
              onClick={() => handleSort("deleted")}
            >
              <div className="flex items-center justify-end gap-1.5">
                <span>Deleted</span>
                <span className="text-[11px] text-slate-400">{sortIndicator("deleted")}</span>
              </div>
            </th>
            <th
              className="th text-right cursor-pointer select-none hover:text-slate-900"
              onClick={() => handleSort("total")}
            >
              <div className="flex items-center justify-end gap-1.5">
                <span>Total</span>
                <span className="text-[11px] text-slate-400">{sortIndicator("total")}</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sortedData.map((row, idx) => (
            <tr key={row.country || idx} className="hover:bg-slate-50/70 transition-colors">
              <td className="td font-medium text-slate-800">
                {row.countryName || row.country || "Unknown"}
              </td>
              <td className="td text-right tabular-nums text-slate-600">{row.active || 0}</td>
              <td className="td text-right tabular-nums text-slate-600">{row.suspended || 0}</td>
              <td className="td text-right tabular-nums text-slate-600">{row.deleted || 0}</td>
              <td className="td text-right tabular-nums font-semibold text-slate-800">{row.total || 0}</td>
            </tr>
          ))}
          {sortedData.length === 0 && (
            <tr>
              <td colSpan={5} className="td text-center text-slate-400 py-8">
                No country breakdown records available.
              </td>
            </tr>
          )}
        </tbody>
        {sortedData.length > 0 && (
          <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-900">
            <tr>
              <td className="td">Total</td>
              <td className="td text-right tabular-nums">{totals.active}</td>
              <td className="td text-right tabular-nums">{totals.suspended}</td>
              <td className="td text-right tabular-nums">{totals.deleted}</td>
              <td className="td text-right tabular-nums font-bold text-slate-900">{totals.total}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
