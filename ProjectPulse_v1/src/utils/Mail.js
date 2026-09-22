// mail.js — builds the two HTML mails (Audit team / Finance-PM-Management)
// and sends them through the SAME /auditflow flow via callAuditEmailFlow,
// which now just relays { to, cc, subject, body } straight through.
//
// FLOW EDIT REQUIRED (one-time, on the existing /auditflow flow):
//   1. Trigger schema -> replace entity/action/data/by/dateTime with:
//        { "to": "string", "cc": "string", "subject": "string", "body": "string" }
//   2. Send an email (V2) -> set:
//        To      = triggerBody()?['to']
//        Cc      = triggerBody()?['cc']
//        Subject = triggerBody()?['subject']
//        Body    = triggerBody()?['body']      (format: html)
//      Remove the old hardcoded To/Cc/Subject/Body values — the app now
//      builds and sends the full HTML for each audience.
import { callAuditEmailFlow } from "../api/flows";

const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function row(label, value) {
  return `<tr>
      <td style="padding: 12px 14px; background-color: #f5f7fa; border-bottom: 1px solid #d9dee7; font-weight: bold; color: #374151;">${esc(label)}</td>
      <td style="padding: 12px 14px; border-bottom: 1px solid #d9dee7; color: #111827; word-break: break-word;">${esc(value)}</td>
    </tr>`;
}

// Shared shell — only the header color/title/footer line change per audience.
function shell({ accent, title, rows, footer }) {
  return `<div style="font-family: Arial, Helvetica, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; color: #333; background-color: #ffffff;">
  <h2 style="margin: 0 0 4px 0; font-size: 20px; color: ${accent};">${esc(title)}</h2>
  <div style="height:3px;width:56px;background:${accent};border-radius:2px;margin-bottom:18px;"></div>
  <table cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; border: 1px solid #d9dee7; font-size: 14px;">
    <tbody>${rows}</tbody>
  </table>
  <p style="margin: 20px 0 0 0; font-size: 13px; color: #6b7280;">${esc(footer)}</p>
  <p style="margin: 8px 0 0 0; font-size: 13px; color: #6b7280;">Regards,<br><strong>Project Pulse Bot</strong></p>
</div>`;
}

// 1) AUDIT TEAM mail — same content/layout as the original flow template
// (Operation/Entity/Record Details/Performed By/Date & Time), neutral grey.
function auditTemplate({ screen, action, record, user, when }) {
  const rows = [row("Operation", action), row("Entity", screen), row("Record Details", record), row("Performed By", user), row("Date & Time", when)].join("");
  return shell({ accent: "#374151", title: "Audit Log Details", rows, footer: "This is an automated audit notification." });
}

// 2) FINANCE / PM / MANAGEMENT mail — FSD business-event name, distinct
// accent color per audience (see RECIPIENTS[role].theme).
function fsdTemplate({ event, recipientLabel, accent, screen, action, record, user, when, meta }) {
  const rows = [
    row("Event", event),
    row("Screen", screen),
    row("Action", action),
    row("Record", record),
    meta.fromStatus || meta.toStatus ? row("Status", `${meta.fromStatus || "—"} → ${meta.toStatus || "—"}`) : "",
    row("Performed By", user),
    row("Date & Time", when),
  ].join("");
  return shell({ accent, title: event, rows, footer: `This is an automated notification for the ${recipientLabel}.` });
}

function fmtWhen(timestamp) {
  return new Date(timestamp || Date.now()).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

// Kept as the ORIGINAL audit mail — same recipients, same content, unchanged.
export function sendAuditMail({ screen, action, record, user, timestamp }, recipients) {
  const when = fmtWhen(timestamp);
  callAuditEmailFlow({
    to: recipients.to,
    cc: recipients.cc,
    subject: `[${action}] ${screen} — Audit Alert`,
    body: auditTemplate({ screen, action, record, user, when }),
  });
}

// NEW — Finance/PM/Management mail, only for FSD-mapped screens/actions.
export function sendFsdMail({ event, recipientLabel, accent, to, screen, action, record, user, timestamp, meta }) {
  const when = fmtWhen(timestamp);
  callAuditEmailFlow({
    to,
    cc: "",
    subject: `[Project Pulse] ${event} — ${record || screen}`,
    body: fsdTemplate({ event, recipientLabel, accent, screen, action, record, user, when, meta }),
  });
}