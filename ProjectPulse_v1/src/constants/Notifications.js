// notifications.js — recipients + FSD event map (DSS-QMS-PM-FSD-001).
// Both mails (Audit team, Finance/PM/Management) go through the SAME
// /auditflow flow (see utils/mail.js) — only `to`/`cc`/`subject`/`body`
// differ per call. Swap AUDIT / RECIPIENTS for a SQL lookup later;
// nothing else (mail.js, audit.js) needs to change.

// Existing audit-team recipients — moved here from the flow's hardcoded
// Send-email fields so the app controls them (unchanged values).
export const AUDIT_RECIPIENTS = {
  to: "santhoshkumar.saravanan@devoir.co.in",
  cc: "",
};

// FSD Finance/PM/Management recipients — one placeholder mailbox per role.
export const RECIPIENTS = {
  finance: { label: "Finance Team", to: "santhoshkumar.saravanan@devoir.co.in", theme: "#0F766E" },
  pm: { label: "Project Manager", to: "santhoshkumar.saravanan@devoir.co.in", theme: "#B45309" },
  management: { label: "Management Team", to: "santhoshkumar.saravanan@devoir.co.in", theme: "#6D28D9" },
};

// Only users with Create on the "Mail Notification" module trigger the
// second (Finance/PM/Management) mail. Set false to let every user trigger it.
export const REQUIRE_MAIL_PERMISSION = true;

// "<Screen>|<Action>" -> { event, to, fsd }. fsd = FSD reference; "CR" = not
// in FSD (change request: notify on every project create/update/delete).
const RES = (event) => ({ event, to: "finance", fsd: "4.4 (Pg 17)" });
const CR = (event, to = "finance") => ({ event, to, fsd: "CR" });

const EVENT_MAP = {
  "Project|Create": { event: "Project Created", to: "pm", fsd: "4.3 (Pg 15)" },
  "Project|Update": CR("Project Updated"),
  "Project|Delete": CR("Project Deleted"),

  "Project Approval|Approve": { event: "Project Approved", to: "pm", fsd: "4.3/4.5 (Pg 15,19)" },
  "Project Approval|Reject": { event: "Project Rejected", to: "pm", fsd: "4.3/4.5 (Pg 15,19)" },

  "Resource Allocation|Create": RES("Resource Allocated"),
  "Resource Allocation|Update": RES("Allocation Modified"),
  "Resource Allocation|Delete": RES("Resource Removed"),
  "Project Resources|Create": RES("Resource Allocated"),
  "Project Resources|Update": RES("Allocation Modified"),
  "Project Resources|Delete": RES("Resource Removed"),

  "Billing|Create": { event: "Billing Submitted", to: "finance", fsd: "4.6 (Pg 24)" },
  "Billing|Update": CR("Billing Updated"),
  "Billing|Delete": CR("Billing Deleted"),

  "Link Invoice|Create": { event: "Invoice Number Added", to: "management", fsd: "4.7 (Pg 25)" },
  "Link Invoice|Update": { event: "Invoice Details Updated", to: "management", fsd: "4.7 (Pg 25)" },
  "Link Invoice|Delete": CR("Invoice Deleted", "management"),

  "Pipeline Project|Create": CR("Pipeline Project Created"),
  "Pipeline Project|Update": CR("Pipeline Project Updated"),
  "Pipeline Project|Delete": CR("Pipeline Project Deleted"),
  "Pipeline Project|Convert to Project": CR("Pipeline Converted to Project"),

  "Timesheet Approval|Approve": { event: "Timesheet Approved", to: "pm", fsd: "4.5 Notifications (Pg 30)" },
  "Timesheet Approval|Reject": { event: "Timesheet Rejected", to: "pm", fsd: "4.5 Notifications (Pg 30)" },
};

// Status-driven overrides — Project/Billing saves pass meta.fromStatus/toStatus.
export function resolveEvent(screen, action, meta = {}) {
  const base = EVENT_MAP[`${screen}|${action}`] || null;
  const from = (meta.fromStatus || "").trim().toLowerCase();
  const to = (meta.toStatus || "").trim().toLowerCase();
  const changed = !!to && to !== from;

  if (screen === "Project" && action === "Update") {
    if (changed && to === "pending finance approval") return { event: "Project Submitted for Finance Approval", to: "finance", fsd: "4.3 (Pg 13,15)" };
    if (changed && to === "archived") return { event: "Project Archived", to: "management", fsd: "4.3 (Pg 15)" };
    if (from === "active") return { event: "Active Project Modified - Finance Review Required", to: "finance", fsd: "2.0/4.5 (Pg 4,19)" };
  }
  if (screen === "Billing" && action === "Update" && changed) {
    if (to.includes("approv")) return { event: "Billing Approved", to: "pm", fsd: "4.6 (Pg 24)" };
    if (to.includes("reject")) return { event: "Billing Rejected", to: "pm", fsd: "4.6 (Pg 24)" };
  }
  return base;
}