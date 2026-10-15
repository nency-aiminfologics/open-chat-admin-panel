"use client";

import { useEffect, useState } from "react";
import { listUserCountries } from "@/lib/api";

/**
 * Country filter fed by `GET /admin/users/countries`. Only countries that actually have
 * users are listed, highest count first, and the stored value is sent back as the filter
 * (matching is exact/case-insensitive on the backend, so "IN" and "India" are one country).
 */
export default function CountrySelect({ token, value, onChange, className = "input !w-auto" }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    let alive = true;
    listUserCountries(token)
      .then((d) => alive && setItems(d?.items || []))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [token]);

  // A value that came from a URL or a stale list stays selectable even if it is not in the response.
  const hasValue = !value || items.some((i) => i.country === value);

  return (
    <select
      className={className}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      title={error || undefined}
    >
      <option value="">All countries</option>
      {!hasValue && <option value={value}>{value}</option>}
      {items.map((i) => (
        <option key={i.country} value={i.country}>
          {i.countryName || i.country} ({i.count})
        </option>
      ))}
    </select>
  );
}
