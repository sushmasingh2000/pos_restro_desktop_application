import { useState } from "react";
import { useQuery } from "react-query";
import { apiConnectorGet } from "../../utils/APIConnector";
import { endpoint } from "../../utils/APIRoutes";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

const StarDisplay = ({ rating }) => (
  <span style={{ color: "#f59e0b", fontSize: 15, letterSpacing: 1 }}>
    {"★".repeat(rating)}
    <span style={{ color: "#d1d5db" }}>{"★".repeat(5 - rating)}</span>
  </span>
);

const StatBar = ({ label, count, total, color }) => {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
      <span style={{ width: 55, fontSize: 12, color: "#64748b", flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, background: "#f1f5f9", borderRadius: 99, height: 8, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, background: color, height: "100%", borderRadius: 99, transition: "width .4s" }} />
      </div>
      <span style={{ width: 32, fontSize: 12, color: "#64748b", textAlign: "right", flexShrink: 0 }}>{count}</span>
    </div>
  );
};

export default function FeedbackPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ startDate: "", endDate: "", rating: "" });
  const limit = 10;

  const queryParams = new URLSearchParams({
    page,
    limit,
    ...(filters.startDate && { startDate: filters.startDate }),
    ...(filters.endDate && { endDate: filters.endDate }),
    ...(filters.rating && { rating: filters.rating }),
  }).toString();

  const { data, isLoading } = useQuery(
    ["panel_feedback_list", page, filters],
    () => apiConnectorGet(`${endpoint.feedback_list_api}?${queryParams}`),
    { keepPreviousData: true, refetchOnWindowFocus: false }
  );

  const result = data?.data?.result || {};
  const feedbacks = result.feedbacks || [];
  const stats = result.stats || {};
  const pagination = result.pagination || {};

  const avgRating = parseFloat(stats.avg_rating || 0).toFixed(1);
  const totalCount = parseInt(stats.total_count || 0);

  return (
    <div className="main_cards">
      <div className="cards_header flex items-center justify-between">
        <div>
          <h3>Customer Feedback</h3>
          <p>Door delivery order ratings and reviews</p>
        </div>
      </div>

      {/* Summary */}
      <div className="mx-3 mt-3">
        <Row className="g-3">
          <Col md={4}>
            <div style={{ background: "#fff", borderRadius: 14, padding: "20px 24px", border: "1px solid #DBEAFE", boxShadow: "0 2px 8px rgba(37,99,235,.08)" }}>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 6 }}>Average Rating</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 40, fontWeight: 800, color: "#1e3a8a", lineHeight: 1 }}>{avgRating}</span>
                <span style={{ fontSize: 18, color: "#f59e0b" }}>/ 5 ★</span>
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                Based on {totalCount} review{totalCount !== 1 ? "s" : ""}
              </div>
            </div>
          </Col>
          <Col md={8}>
            <div style={{ background: "#fff", borderRadius: 14, padding: "16px 24px", border: "1px solid #DBEAFE", boxShadow: "0 2px 8px rgba(37,99,235,.08)" }}>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 10 }}>Rating Breakdown</div>
              <StatBar label="5 Star" count={parseInt(stats.five_star || 0)} total={totalCount} color="#22c55e" />
              <StatBar label="4 Star" count={parseInt(stats.four_star || 0)} total={totalCount} color="#84cc16" />
              <StatBar label="3 Star" count={parseInt(stats.three_star || 0)} total={totalCount} color="#f59e0b" />
              <StatBar label="2 Star" count={parseInt(stats.two_star || 0)} total={totalCount} color="#f97316" />
              <StatBar label="1 Star" count={parseInt(stats.one_star || 0)} total={totalCount} color="#ef4444" />
            </div>
          </Col>
        </Row>
      </div>

      {/* Filters */}
      <div className="table_box_main mx-3 mt-3">
        <Row>
          <Col md={3}>
            <div className="main_input">
              <label>From Date</label>
              <input type="date" onChange={(e) => { setPage(1); setFilters({ ...filters, startDate: e.target.value }); }} />
            </div>
          </Col>
          <Col md={3}>
            <div className="main_input">
              <label>To Date</label>
              <input type="date" onChange={(e) => { setPage(1); setFilters({ ...filters, endDate: e.target.value }); }} />
            </div>
          </Col>
          <Col md={3}>
            <div className="main_input">
              <label>Rating</label>
              <select onChange={(e) => { setPage(1); setFilters({ ...filters, rating: e.target.value }); }}>
                <option value="">All Ratings</option>
                <option value="5">5 Star</option>
                <option value="4">4 Star</option>
                <option value="3">3 Star</option>
                <option value="2">2 Star</option>
                <option value="1">1 Star</option>
              </select>
            </div>
          </Col>
        </Row>
      </div>

      {/* Table */}
      <div className="main_table_container mt-3 border-0" style={{ borderRadius: 0 }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {["S.No.", "Order ID", "Customer", "Phone", "Rating", "Comment", "Date"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="7" className="text-center p-6">Loading...</td></tr>
              ) : feedbacks.length === 0 ? (
                <tr><td colSpan="7" className="text-center p-6 text-white/40">No feedback found</td></tr>
              ) : (
                feedbacks.map((fb, idx) => (
                  <tr key={fb.feedback_id} className="border-b border-white/5 hover:bg-white/5 transition text-center">
                    <td>{(page - 1) * limit + idx + 1}</td>
                    <td>{fb.unique_order_id || `#${fb.order_id}`}</td>
                    <td>{fb.customer_name || "—"}</td>
                    <td>{fb.customer_phone || "—"}</td>
                    <td><StarDisplay rating={fb.rating} /></td>
                    <td style={{ maxWidth: 220, wordBreak: "break-word" }}>
                      {fb.comment || <span style={{ color: "#94a3b8", fontSize: 12 }}>No comment</span>}
                    </td>
                    <td>{new Date(fb.created_at).toLocaleDateString("en-IN")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between p-3">
          <div className="pagination_number">
            Page <span className="pagintation_text">{page}</span> of{" "}
            <span className="pagintation_text">{pagination.totalPages || 1}</span>
          </div>
          <div className="flex items-center gap-2">
            <button disabled={page === 1} onClick={() => setPage(page - 1)} className="prev_btn">← Prev</button>
            <div className="current_page">{page}</div>
            <button disabled={page >= (pagination.totalPages || 1)} onClick={() => setPage(page + 1)} className="right_btn">Next →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
