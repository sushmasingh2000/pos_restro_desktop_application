import React, { useState } from "react";
import { useQuery, useQueryClient } from "react-query";
import { apiConnectorGet, apiConnectorPost } from "../../utils/APIConnector";
import { endpoint } from "../../utils/APIRoutes";
import { domain } from "../../domain";
import toast from "react-hot-toast";

const isImageFile = (url) => /\.(png|jpe?g|gif|webp)$/i.test(url || "");

const statusColors = {
  open: { bg: "#f59e0b22", color: "#f59e0b", label: "Open" },
  replied: { bg: "#3b82f622", color: "#3b82f6", label: "Replied" },
  closed: { bg: "#10b98122", color: "#10b981", label: "Closed" },
};

const MyTickets = () => {
  const queryClient = useQueryClient();
  const [showRaise, setShowRaise] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [activeTicketId, setActiveTicketId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replyAttachment, setReplyAttachment] = useState(null);
  const [replying, setReplying] = useState(false);

  const { data, isLoading } = useQuery(
    ["my_tickets"],
    () => apiConnectorGet(endpoint.ticket_my_tickets_api),
    { refetchOnWindowFocus: false }
  );
  const tickets = data?.data?.tickets || [];

  const { data: threadData, isLoading: threadLoading } = useQuery(
    ["ticket_thread", activeTicketId],
    () => apiConnectorGet(`${endpoint.ticket_thread_api}/${activeTicketId}`),
    { enabled: !!activeTicketId, refetchOnWindowFocus: false }
  );
  const ticket = threadData?.data?.ticket;
  const messages = threadData?.data?.messages || [];

  const handleRaise = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error("Please enter both subject and message");
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("subject", subject);
      formData.append("message", message);
      if (attachment) formData.append("attachment", attachment);
      const res = await apiConnectorPost(endpoint.ticket_create_api, formData);
      if (res?.data?.success) {
        toast.success("Ticket raised!");
        setShowRaise(false);
        setSubject("");
        setMessage("");
        setAttachment(null);
        queryClient.invalidateQueries(["my_tickets"]);
      } else {
        toast.error(res?.data?.message || "Failed to raise ticket");
      }
    } catch (err) {
      toast.error("Server error");
    }
    setSubmitting(false);
  };

  const handleReply = async () => {
    if (!replyText.trim() && !replyAttachment) return;
    setReplying(true);
    try {
      const formData = new FormData();
      formData.append("ticketId", activeTicketId);
      formData.append("message", replyText);
      if (replyAttachment) formData.append("attachment", replyAttachment);
      const res = await apiConnectorPost(endpoint.ticket_reply_api, formData);
      if (res?.data?.success) {
        setReplyText("");
        setReplyAttachment(null);
        queryClient.invalidateQueries(["ticket_thread", activeTicketId]);
        queryClient.invalidateQueries(["my_tickets"]);
      } else {
        toast.error(res?.data?.message || "Reply failed");
      }
    } catch (err) {
      toast.error("Server error");
    }
    setReplying(false);
  };

  const fmtDate = (v) => (v ? new Date(v).toLocaleString("en-IN") : "—");

  return (
    <div className="">
      <div className="main_cards">
        <div className="cards_header flex items-center justify-between">
          <div>
            <h3>Support Tickets</h3>
            <p>Have an issue? Raise a ticket here and our support team will get back to you.</p>
          </div>
          <button className="main_btn" onClick={() => setShowRaise(true)}>
            + Raise Ticket
          </button>
        </div>

        <div className="main_table_container border-0" style={{ borderRadius: "0px" }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Subject</th>
                  <th>Raised By</th>
                  <th>Status</th>
                  <th>Last Update</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan="6" className="text-center p-6">Loading...</td></tr>
                ) : tickets.length === 0 ? (
                  <tr><td colSpan="6" className="text-center p-6 text-white/60">No tickets yet</td></tr>
                ) : (
                  tickets.map((t) => {
                    const st = statusColors[t.dg048_status] || statusColors.open;
                    return (
                      <tr key={t.dg048_ticket_id} className="border-t border-white/10 hover:bg-white/5 transition">
                        <td>#{t.dg048_ticket_id}</td>
                        <td style={{ fontWeight: 600 }}>{t.dg048_subject}</td>
                        <td>{t.dg048_raised_by_name} <span style={{ opacity: 0.6, fontSize: 11 }}>({t.dg048_raised_by_role})</span></td>
                        <td>
                          <span style={{
                            padding: "2px 10px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                            background: st.bg, color: st.color,
                          }}>{st.label}</span>
                        </td>
                        <td>{fmtDate(t.dg048_updated_at)}</td>
                        <td>
                          <button className="main_btn_2" onClick={() => setActiveTicketId(t.dg048_ticket_id)}>
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Raise Ticket Modal */}
      {showRaise && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3 style={{ marginBottom: 12 }}>Raise a Support Ticket</h3>
            <label style={labelStyle}>Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Bill amount mismatch"
              style={inputStyle}
            />
            <label style={labelStyle}>Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your issue in detail..."
              rows={5}
              style={{ ...inputStyle, resize: "vertical" }}
            />
            <label style={labelStyle}>Attachment (optional)</label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setAttachment(e.target.files?.[0] || null)}
              style={inputStyle}
            />
            {attachment && (
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{attachment.name}</div>
            )}
            <div className="flex justify-end gap-2 mt-3">
              <button className="cancel_btn" onClick={() => { setShowRaise(false); setAttachment(null); }}>Cancel</button>
              <button className="main_btn" disabled={submitting} onClick={handleRaise}>
                {submitting ? "Submitting..." : "Submit Ticket"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thread Modal */}
      {activeTicketId && (
        <div style={overlayStyle}>
          <div style={{ ...modalStyle, maxWidth: 560 }}>
            <div className="flex items-center justify-between mb-2">
              <h3 style={{ margin: 0 }}>
                {ticket ? `#${ticket.dg048_ticket_id} — ${ticket.dg048_subject}` : "Loading..."}
              </h3>
              <button onClick={() => { setActiveTicketId(null); setReplyText(""); setReplyAttachment(null); }} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>

            {ticket && (
              <div style={{
                fontSize: 12, marginBottom: 10, padding: "4px 10px", borderRadius: 8,
                display: "inline-block",
                background: (statusColors[ticket.dg048_status] || statusColors.open).bg,
                color: (statusColors[ticket.dg048_status] || statusColors.open).color,
                fontWeight: 700,
              }}>
                {(statusColors[ticket.dg048_status] || statusColors.open).label}
              </div>
            )}

            <div style={{ maxHeight: 320, overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: 10, padding: 10, marginBottom: 12 }}>
              {threadLoading ? (
                <div className="text-center p-4">Loading...</div>
              ) : (
                messages.map((m) => {
                  const isMaster = m.dg049_sender_role === "master_admin";
                  return (
                    <div key={m.dg049_message_id} style={{
                      display: "flex", justifyContent: isMaster ? "flex-start" : "flex-end", marginBottom: 8,
                    }}>
                      <div style={{
                        maxWidth: "75%", padding: "8px 12px", borderRadius: 10,
                        background: isMaster ? "#eff6ff" : "#f3f4f6",
                        border: `1px solid ${isMaster ? "#bfdbfe" : "#e5e7eb"}`,
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: isMaster ? "#2563eb" : "#374151", marginBottom: 2 }}>
                          {m.dg049_sender_name}
                        </div>
                        {m.dg049_message && (
                          <div style={{ fontSize: 13, color: "#111827", whiteSpace: "pre-wrap" }}>{m.dg049_message}</div>
                        )}
                        {m.dg049_attachment_url && (
                          isImageFile(m.dg049_attachment_url) ? (
                            <a href={`${domain}${m.dg049_attachment_url}`} target="_blank" rel="noopener noreferrer">
                              <img
                                src={`${domain}${m.dg049_attachment_url}`}
                                alt="attachment"
                                style={{ maxWidth: 180, maxHeight: 180, borderRadius: 8, marginTop: 6, display: "block" }}
                              />
                            </a>
                          ) : (
                            <a
                              href={`${domain}${m.dg049_attachment_url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize: 12, color: "#2563eb", marginTop: 6, display: "inline-block" }}
                            >
                              📎 View attachment
                            </a>
                          )
                        )}
                        <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{fmtDate(m.dg049_created_at)}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {ticket?.dg048_status !== "closed" && (
              <div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type a reply..."
                    style={{ ...inputStyle, flex: 1 }}
                    onKeyDown={(e) => e.key === "Enter" && handleReply()}
                  />
                  <button className="main_btn" disabled={replying} onClick={handleReply}>
                    {replying ? "..." : "Send"}
                  </button>
                </div>
                <div className="flex items-center gap-2" style={{ marginTop: 6 }}>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setReplyAttachment(e.target.files?.[0] || null)}
                    style={{ fontSize: 12 }}
                  />
                  {replyAttachment && (
                    <span style={{ fontSize: 12, color: "#6b7280" }}>{replyAttachment.name}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const overlayStyle = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
};
const modalStyle = {
  background: "#fff", borderRadius: 14, padding: 20, width: "90%", maxWidth: 460,
  maxHeight: "85vh", overflowY: "auto", color: "#111827",
};
const labelStyle = { display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginTop: 10, marginBottom: 4 };
const inputStyle = {
  width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db",
  fontSize: 13, color: "#111827", outline: "none",
};

export default MyTickets;
