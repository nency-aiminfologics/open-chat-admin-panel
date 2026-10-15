"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { useToast } from "@/lib/toast";
import {
  createSubAdmin,
  deleteSubAdmin,
  listPermissions,
  listSubAdmins,
  resendSubAdminInvitation,
  updateSubAdmin,
} from "@/lib/api";
import { PERMISSION_GROUPS, PERMISSION_LABELS } from "@/lib/permissions";
import { Badge, Empty, ErrorBanner, Field, Modal, PageHeader, Pagination, Spinner, fmtDate } from "@/components/ui";

const EMPTY_FORM = { name: "", email: "", access: [], isActive: true };

const ICON_TONE = {
  neutral: "border border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700",
  danger: "border border-danger/20 bg-white text-danger hover:bg-danger-tint",
  success: "border border-success/30 bg-white text-success hover:bg-success-tint",
};

function IconButton({ label, tone = "neutral", ...props }) {
  return (
    <button
      {...props}
      type="button"
      aria-label={label}
      className={`group relative flex h-9 w-9 items-center justify-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-50 ${ICON_TONE[tone]}`}
    >
      {props.children}
      <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100">
        {label}
      </span>
    </button>
  );
}

const EditIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]">
    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5v5.25a2.25 2.25 0 0 1-2.25 2.25H5.25a2.25 2.25 0 0 1-2.25-2.25V6.75a2.25 2.25 0 0 1 2.25-2.25h5.25" />
  </svg>
);

const BanIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]">
    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 1 1-12.728 0 9 9 0 0 1 12.728 0Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="m5.636 5.636 12.728 12.728" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]">
    <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const MailIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5 12 13l9-5.5M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]">
    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
  </svg>
);

/**
 * Grouped checkbox picker over the backend's resource scopes. Only scopes the API
 * returned from `GET /admin/permissions` are offered — page URLs are never sent.
 */
function AccessPicker({ allowed, selected, onChange }) {
  const groups = PERMISSION_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter(([value]) => allowed.includes(value)),
  })).filter((g) => g.items.length > 0);

  // Any scope the backend allows that this build has no label for is still selectable.
  const known = PERMISSION_GROUPS.flatMap((g) => g.items.map(([v]) => v));
  const extras = allowed.filter((p) => !known.includes(p));

  const toggle = (value) =>
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);

  const row = ([value, label]) => (
    <label
      key={value}
      className="flex items-start gap-2.5 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
    >
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 accent-brand-400"
        checked={selected.includes(value)}
        onChange={() => toggle(value)}
      />
      <span>
        <span className="block">{label}</span>
        <code className="text-[11px] text-slate-400">{value}</code>
      </span>
    </label>
  );

  return (
    <div className="scrollbar-custom max-h-72 overflow-y-auto rounded-lg border border-slate-200 p-2">
      {groups.map((g) => (
        <div key={g.label} className="mb-2">
          <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{g.label}</p>
          {g.items.map(row)}
        </div>
      ))}
      {extras.length > 0 && (
        <div className="mb-2">
          <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Other</p>
          {extras.map((p) => row([p, p]))}
        </div>
      )}
      {allowed.length === 0 && <p className="px-2 py-3 text-sm text-slate-400">No permissions available.</p>}
    </div>
  );
}

export default function SubAdminsPage() {
  const { token, fullAdmin } = useStore();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [allowed, setAllowed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const loadedPermissions = useRef(false);

  const load = () => {
    if (!token) return;
    setLoading(true);
    setError("");
    listSubAdmins(token, { page, limit: 20 })
      .then((d) => setResult(Array.isArray(d) ? { items: d } : d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token, page]);

  useEffect(() => {
    if (!token || loadedPermissions.current) return;
    loadedPermissions.current = true;
    listPermissions(token)
      .then((d) => setAllowed(d?.items || []))
      .catch((e) => setError(e.message));
  }, [token]);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setFormError("");
    setModal({});
  };

  const openEdit = (item) => {
    setForm({ name: item.name || "", email: item.email || "", access: item.access || [], isActive: !!item.isActive });
    setFormError("");
    setModal(item);
  };

  const save = async () => {
    const name = form.name.trim();
    const email = form.email.trim();
    if (!name || (!modal.id && !email)) {
      setFormError("Name and email are required");
      return;
    }
    if (form.access.length === 0) {
      setFormError("Select at least one permission this sub admin needs");
      return;
    }
    setFormError("");
    setSaving(true);
    try {
      if (modal.id) {
        // Email changes are not supported — PATCH takes name, access and isActive only.
        await updateSubAdmin(token, modal.id, { name, access: form.access, isActive: form.isActive });
        toast("Sub admin updated — their existing sessions were invalidated", "success");
      } else {
        const created = await createSubAdmin(token, { name, email, access: form.access, isActive: form.isActive });
        toast(
          created?.invitationSent === false
            ? "Account created, but the invitation email failed — use Resend invitation"
            : "Sub admin added and a setup link was emailed",
          created?.invitationSent === false ? "info" : "success"
        );
      }
      setModal(null);
      load();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item) => {
    setBusyId(item.id);
    try {
      await updateSubAdmin(token, item.id, { isActive: !item.isActive });
      toast(item.isActive ? "Sub admin deactivated" : "Sub admin activated", "success");
      load();
    } catch (e) {
      setError(e.message);
      toast(e.message, "error");
    } finally {
      setBusyId(null);
    }
  };

  const resendInvite = async (item) => {
    setBusyId(item.id);
    try {
      await resendSubAdminInvitation(token, item.id);
      toast("A fresh setup link was emailed", "success");
      load();
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteSubAdmin(token, deleteTarget.id);
      toast("Sub admin deleted", "success");
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setDeleting(false);
    }
  };

  const items = result?.items || [];

  if (!fullAdmin) {
    return (
      <>
        <PageHeader title="Sub Admins" subtitle="Only full admins can manage staff accounts" />
        <Empty text="You do not have access to sub-admin management." />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Sub Admins" subtitle="Staff accounts scoped to specific backend permissions">
        <button className="btn-primary" onClick={openAdd}>
          + Add sub admin
        </button>
      </PageHeader>

      <ErrorBanner error={error} onRetry={load} />

      <div className="card scrollbar-hide overflow-x-auto">
        {loading ? (
          <Spinner />
        ) : (
          <>
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="th">Name</th>
                  <th className="th">Email</th>
                  <th className="th">Permissions</th>
                  <th className="th">Password</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-50">
                    <td className="td">
                      <p className="font-medium text-slate-800">{i.name}</p>
                      {i.createdAt && <p className="text-xs text-slate-400">Added {fmtDate(i.createdAt)}</p>}
                    </td>
                    <td className="td text-slate-600">{i.email}</td>
                    <td className="td">
                      <div className="flex max-w-xs flex-wrap gap-1">
                        {(i.access || []).slice(0, 3).map((a) => (
                          <span
                            key={a}
                            title={PERMISSION_LABELS[a] || a}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                          >
                            {a}
                          </span>
                        ))}
                        {(i.access || []).length > 3 && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                            +{i.access.length - 3} more
                          </span>
                        )}
                        {(i.access || []).length === 0 && <span className="text-xs text-slate-400">None</span>}
                      </div>
                    </td>
                    <td className="td">
                      {/* mustChangePassword means the setup link has not been used yet. */}
                      <Badge status={i.mustChangePassword ? "pending" : "active"} />
                      {i.mustChangePassword && <p className="mt-1 text-xs text-slate-400">Invitation pending</p>}
                    </td>
                    <td className="td">
                      <Badge status={i.isActive ? "active" : "suspended"} />
                    </td>
                    <td className="td text-right">
                      <div className="flex justify-end gap-2">
                        <IconButton label="Edit" onClick={() => openEdit(i)}>
                          <EditIcon />
                        </IconButton>
                        {i.mustChangePassword && (
                          <IconButton
                            label="Resend invitation"
                            disabled={busyId === i.id}
                            onClick={() => resendInvite(i)}
                          >
                            <MailIcon />
                          </IconButton>
                        )}
                        {i.isActive ? (
                          <IconButton
                            tone="danger"
                            label="Deactivate"
                            disabled={busyId === i.id}
                            onClick={() => toggleActive(i)}
                          >
                            <BanIcon />
                          </IconButton>
                        ) : (
                          <IconButton
                            tone="success"
                            label="Activate"
                            disabled={busyId === i.id}
                            onClick={() => toggleActive(i)}
                          >
                            <CheckCircleIcon />
                          </IconButton>
                        )}
                        <IconButton tone="danger" label="Delete" onClick={() => setDeleteTarget(i)}>
                          <TrashIcon />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {items.length === 0 && <Empty text="No sub admins yet" />}
            {result?.totalPages > 1 && (
              <Pagination
                page={result.page}
                totalPages={result.totalPages}
                hasPreviousPage={result.hasPreviousPage}
                hasNextPage={result.hasNextPage}
                onChange={setPage}
              />
            )}
          </>
        )}
      </div>

      <Modal
        open={!!modal}
        onClose={() => {
          setModal(null);
          setFormError("");
        }}
        title={`${modal?.id ? "Edit" : "Add"} sub admin`}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModal(null)}>
              Cancel
            </button>
            <button className="btn-primary" disabled={saving} onClick={save}>
              {saving ? "Saving…" : "Save"}
            </button>
          </>
        }
      >
        {modal && (
          <>
            <Field label="Name">
              <input
                type="text"
                className="input"
                maxLength={120}
                autoFocus
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field
              label="Email"
              hint={modal.id ? "Email cannot be changed after the account is created" : "Must be unique across all accounts"}
            >
              <input
                type="email"
                className="input"
                value={form.email}
                disabled={!!modal.id}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field
              label="Permissions"
              hint="Changing permissions logs this sub admin out of existing sessions"
            >
              <AccessPicker
                allowed={allowed}
                selected={form.access}
                onChange={(access) => setForm({ ...form, access })}
              />
            </Field>
            <label className="mb-1 flex items-center gap-2.5 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 accent-brand-400"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              Active
            </label>
            {!modal.id && (
              <p className="mt-3 text-xs text-slate-400">
                They receive a single-use setup link valid for 24 hours — no password is ever emailed. Sub admins can
                never manage other sub admins.
              </p>
            )}
          </>
        )}
        {formError && <p className="mt-2 text-xs text-danger-ink">{formError}</p>}
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete sub admin"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </button>
            <button className="btn-danger" disabled={deleting} onClick={confirmDelete}>
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Delete <b>{deleteTarget?.name}</b>? This blocks their login, invalidates their tokens and removes any pending
          invitation.
        </p>
      </Modal>
    </>
  );
}
