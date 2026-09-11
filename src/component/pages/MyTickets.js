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
          <div className="Order_Details_modal_header">
            <h2 className="mb-0">Raise a Support Ticket</h2>
          </div>
            <div className="main_input px-3">
              <label>Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Bill amount mismatch"
              />
          </div>
          <div className="main_input px-3">
            <label>Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your issue in detail..."
              rows={5}
              style={{ resize: "vertical" }}
            />
            </div>
            <div className="main_input px-3">
            <label>Attachment (optional)</label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setAttachment(e.target.files?.[0] || null)}
            />
            </div>
            {attachment && (
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{attachment.name}</div>
            )}
            <div className="flex justify-between gap-3 modal_footer px-3 py-3 mt-3">
              <button className="cancel_btn" onClick={() => { setShowRaise(false); setAttachment(null); }}>Cancel</button>
              <button className="update_btn" disabled={submitting} onClick={handleRaise}>
                {submitting ? "Submitting..." : "Submit Ticket"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thread Modal */}
      {activeTicketId && (
        <div style={overlayStyle}>
          <div className="chait_box_main">

  {/* Header */}
  <div className="chai_head">
    <div className="bot-av">
      <svg viewBox="0 0 24 24">
        <rect x="4" y="8" width="16" height="11" rx="3"></rect>
        <path d="M12 4v4M9 13v1.5M15 13v1.5"></path>
        <path d="M2 12v3M22 12v3"></path>
      </svg>
    </div>

    <div>
      <h1>
        {ticket
          ? `#${ticket.dg048_ticket_id} — ${ticket.dg048_subject}`
          : "Loading..."}
      </h1>
    </div>

    <div className="acts">
      <button
        onClick={() => {
          setActiveTicketId(null);
          setReplyText("");
          setReplyAttachment(null);
        }}
        className="iconbtn"
      >
        ✕
      </button>
    </div>
  </div>

  {/* Ticket Status */}
  {ticket && (
    <div className="flex items-center gap-2 mb-2">
      <span
        style={{
          fontSize: 12,
          padding: "4px 10px",
          borderRadius: 8,
          background:
            (statusColors[ticket.dg048_status] ||
              statusColors.open).bg,
          color:
            (statusColors[ticket.dg048_status] ||
              statusColors.open).color,
          fontWeight: 700,
        }}
      >
        {(statusColors[ticket.dg048_status] ||
          statusColors.open).label}
      </span>
    </div>
  )}

  {/* Chat Body */}
  <div className="chait_body">

    {threadLoading ? (
      <div className="text-center p-4">
        Loading...
      </div>
    ) : messages.length === 0 ? (
      <div className="text-center p-4">
        No messages yet.
      </div>
    ) : (
      messages.map((m) => {

        const isMaster =
          m.dg049_sender_role === "master_admin";

        return (
          <React.Fragment key={m.dg049_message_id}>

            {/* Date Separator */}
            <div className="daysplit">
              {new Date(
                m.dg049_created_at
              ).toLocaleDateString("en-GB")}
            </div>

            {/* Message Row */}
            <div
              className={`chait_row ${
                isMaster
                  ? "master-message"
                  : "user-message"
              }`}
            >

              {/* Dynamic Initials */}
              <span className="mini_name">
                {m.dg049_sender_name
                  ?.split(" ")
                  .filter(Boolean)
                  .map((name) => name[0])
                  .join("")
                  .toUpperCase()}
              </span>

              <div className="chait_text_name">

                {/* Sender Name */}
                <h6>
                  {m.dg049_sender_name}
                </h6>

                {/* Text Message */}
                {m.dg049_message && (
                  <div className="chait_text">

                    <p>
                      {m.dg049_message}
                    </p>

                    <div className="time_chait">
                      {new Date(
                        m.dg049_created_at
                      ).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </div>

                  </div>
                )}

                {/* Attachment */}
                {m.dg049_attachment_url && (
                  isImageFile(
                    m.dg049_attachment_url
                  ) ? (
                    <a
                      href={`${domain}${m.dg049_attachment_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img
                        src={`${domain}${m.dg049_attachment_url}`}
                        alt="attachment"
                        style={{
                          maxWidth: 180,
                          maxHeight: 180,
                          borderRadius: 8,
                          marginTop: 6,
                          display: "block",
                        }}
                      />

                      <div className="time_chait">
                        {new Date(
                          m.dg049_created_at
                        ).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </div>
                    </a>
                  ) : (
                    <a
                      href={`${domain}${m.dg049_attachment_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 12,
                        color: "#59371c",
                        marginTop: 6,
                        display: "inline-block",
                      }}
                    >
                      📎 View attachment
                    </a>
                  )
                )}

              </div>
            </div>

          </React.Fragment>
        );
      })
    )}

  </div>

  {/* Reply Footer */}
  {ticket?.dg048_status !== "closed" && (
    <div className="chait_footer">

      {/* Reply Input */}
      <input
        className="input_chait"
        type="text"
        value={replyText}
        onChange={(e) =>
          setReplyText(e.target.value)
        }
        placeholder="Type a reply..."
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleReply();
          }
        }}
      />

      {/* Attachment */}
      <div className="file_attachment">

        <input
          type="file"
          accept="image/*,.pdf"
          onChange={(e) =>
            setReplyAttachment(
              e.target.files?.[0] || null
            )
          }
          style={{
            fontSize: 12,
          }}
        />

        <i className="ri-attachment-line"></i>

        {replyAttachment && (
          <span
            style={{
              fontSize: 12,
              color: "#6b7280",
            }}
          >
            {replyAttachment.name}
          </span>
        )}

      </div>

      {/* Send Button */}
      <button
        className="main_btn"
        disabled={replying}
        onClick={handleReply}
      >
        {replying ? "..." : "Send"}
      </button>

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
  background: "#fff", borderRadius: 14, width: "90%", maxWidth: 460,
  maxHeight: "85vh", overflowY: "auto", color: "#111827",
};
const labelStyle = { display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginTop: 10, marginBottom: 4 };
const inputStyle = {
  width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db",
  fontSize: 13, color: "#111827", outline: "none",
};

export default MyTickets;
