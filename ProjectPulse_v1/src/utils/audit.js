import { callAuditLogFlow } from "../api/flows";
import { LS_CURRENT_USER, LS_PERMISSIONS_CACHE } from "../constants/storage-keys";
import { lsGet } from "./storage";
import { AUDIT_RECIPIENTS, RECIPIENTS, REQUIRE_MAIL_PERMISSION, resolveEvent } from "../constants/Notifications";
import { MAIL_MODULES } from "../constants/modules";
import { sendAuditMail, sendFsdMail } from "./mail";

function canSendFsdMail() {
  if (!REQUIRE_MAIL_PERMISSION) return true;
  const cache = lsGet(LS_PERMISSIONS_CACHE, null);
  if (!cache) return false;
  if (cache.isAdmin) return true;
  const row = cache.permissions?.[MAIL_MODULES[0].key];
  return !!(row && row.canView && row.canCreate);
}

/* ============================================================
    Every Create/Update/Delete/Approve/Reject across the app calls
    logAudit(screen, action, record[, meta]) — same signature as
    before (meta = { fromStatus, toStatus }, used by Project/Billing).

    TWO fire-and-forget mails, both through the SAME /auditflow flow
    (see utils/mail.js), each with its own recipients + HTML:
      1) sendAuditMail  -> Audit team, unchanged content/recipients.
      2) sendFsdMail    -> Finance/PM/Management, only when this
         screen/action is FSD-mapped in constants/notifications.js.
    A failure in either never blocks the screen or the other mail.
    ============================================================ */
export function logAudit(screen, action, record, meta) {
  const session = lsGet(LS_CURRENT_USER, null);
  const currentUsername = typeof session === "string" ? session : session?.username || "Administrator";

  const entry = {
    screen,
    action,
    record: record || "—",
    user: currentUsername,
    timestamp: new Date().toISOString(),
  };

  callAuditLogFlow("CREATE", entry).catch((e) => console.warn("Audit log SQL write failed:", e.message));

  sendAuditMail(entry, AUDIT_RECIPIENTS); // (1) Audit team — unchanged

  const ev = resolveEvent(screen, action, meta || {});
  if (ev && canSendFsdMail()) {
    const r = RECIPIENTS[ev.to] || RECIPIENTS.finance;
    sendFsdMail({ ...entry, event: ev.event, recipientLabel: r.label, accent: r.theme, to: r.to, meta: meta || {} }); // (2) Finance/PM/Management
  }
}
