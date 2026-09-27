import React, { useState } from "react";
import { useQuery } from "react-query";
import { apiConnectorPost } from "../../utils/APIConnector";
import { endpoint } from "../../utils/APIRoutes";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Pagination from "../../Shared/Page";

// Cancel popup me "add to wastage" tick karke cancel hue orders ka stock yahan dikhta hai
const WastageReport = () => {
  const today = new Date().toISOString().split("T")[0];

  const [filters, setFilters] = useState({
    fromDate: today,
    toDate: today,
    page: 1,
    limit: 20,
  });

  const [localFilters, setLocalFilters] = useState({ ...filters });

  const { data, isLoading, isFetching } = useQuery(
    ["wastage_report", filters],
    () => apiConnectorPost(endpoint.wastage_report_api, filters),
    { refetchOnWindowFocus: false, keepPreviousData: true }
  );

  const summary = data?.data?.summary || [];
  const logs = data?.data?.logs || [];
  const pagination = data?.data?.pagination || {};
  const loading = isLoading || isFetching;

  const handleApply = () => setFilters({ ...localFilters, page: 1 });

  const handleReset = () => {
    const reset = { fromDate: today, toDate: today, page: 1, limit: 20 };
    setLocalFilters(reset);
    setFilters(reset);
  };

  const handlePageChange = (newPage) => setFilters((prev) => ({ ...prev, page: newPage }));

  const fmtQty = (v) => (v === null || v === undefined ? "—" : parseFloat(Number(v).toFixed(3)));
  const fmtDate = (v) => (v ? new Date(v).toLocaleString("en-IN") : "—");

  const messageRow = (cols, text) => (
    <tr>
      <td colSpan={cols} className="text-center p-6 text-white/60">
        {text}
      </td>
    </tr>
  );

  return (
    <div className="">
      {/* ── Filters ── */}
      <div className="main_cards">
        <div className="cards_header flex items-center justify-between">
          <div>
            <h3>Wastage Report</h3>
            <p>Cancel hue orders jinka khana ban chuka tha — unka inventory stock yahan wastage me dikhega.</p>
          </div>
        </div>
        <Row className="px-3 items-end mb-3">
          <Col xl={3} lg={3} md={3} sm={4}>
            <div className="main_input">
              <label>From Date</label>
              <input
                type="date"
                value={localFilters.fromDate}
                onChange={(e) => setLocalFilters((p) => ({ ...p, fromDate: e.target.value }))}
              />
            </div>
          </Col>

          <Col xl={3} lg={3} md={3} sm={4}>
            <div className="main_input">
              <label>To Date</label>
              <input
                type="date"
                value={localFilters.toDate}
                onChange={(e) => setLocalFilters((p) => ({ ...p, toDate: e.target.value }))}
              />
            </div>
          </Col>

          <Col xl={2} lg={3} md={3} sm={4}>
            <div className="main_input">
              <label>Rows</label>
              <select
                value={localFilters.limit}
                onChange={(e) => setLocalFilters((p) => ({ ...p, limit: Number(e.target.value) }))}
              >
                {[20, 50, 100].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </Col>

          <Col xl={2} lg={3} md={3} sm={4}>
            <div className="flex items-center gap-2 mt-3 mt-md-0">
              <button onClick={handleApply} className="main_btn">Apply</button>
              <button onClick={handleReset} className="main_btn_2">Reset</button>
            </div>
          </Col>
        </Row>
      </div>

      {/* ── Ingredient-wise summary ── */}
      <div className="main_cards mt-4">
        <div className="cards_header flex items-center justify-between">
          <div>
            <h3>Inventory Wastage Summary</h3>
            <p>Selected date range me har inventory item ka total wastage</p>
          </div>
        </div>
        <div className="main_table_container border-0" style={{ borderRadius: "0px" }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Inventory Item</th>
                  <th>Total Wasted</th>
                  <th>Unit</th>
                  <th>Orders</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  messageRow(5, "Loading...")
                ) : summary.length === 0 ? (
                  messageRow(5, "No wastage found")
                ) : (
                  summary.map((s, i) => (
                    <tr key={`${s.dg052_inventory_id}-${s.dg052_unit}`} className="border-t border-white/10 hover:bg-white/5 transition">
                      <td>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{s.dg052_inventory_name || "—"}</td>
                      <td style={{ color: "#e53935", fontWeight: 600 }}>{fmtQty(s.total_quantity)}</td>
                      <td>{s.dg052_unit || "—"}</td>
                      <td>{s.order_count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Detail ── */}
      <div className="main_cards mt-4">
        <div className="cards_header flex items-center justify-between">
          <div>
            <h3>Wastage Details</h3>
            <p>Order-wise — kaunsi dish, kaunsa ingredient, kitna</p>
          </div>
        </div>
        <div className="main_table_container border-0" style={{ borderRadius: "0px" }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Order ID</th>
                  <th>Bill No</th>
                  <th>Dish</th>
                  <th>Dish Qty</th>
                  <th>Inventory Item</th>
                  <th>Wasted Qty</th>
                  <th>Reason</th>
                  <th>Added By</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  messageRow(10, "Loading...")
                ) : logs.length === 0 ? (
                  messageRow(10, "No records found")
                ) : (
                  logs.map((log, i) => {
                    const sno = (filters.page - 1) * filters.limit + i + 1;
                    return (
                      <tr key={log.dg052_wastage_id} className="border-t border-white/10 hover:bg-white/5 transition">
                        <td>{sno}</td>
                        <td style={{ fontWeight: 600, color: "#a78bfa" }}>{log.dg052_order_id || "—"}</td>
                        <td>{log.dg06_bill_no || "—"}</td>
                        <td>{log.dg052_menu_name || "—"}</td>
                        <td>{fmtQty(log.dg052_menu_quantity)}</td>
                        <td>{log.dg052_inventory_name || "—"}</td>
                        <td style={{ color: "#e53935", fontWeight: 600 }}>
                          {fmtQty(log.dg052_quantity)} {log.dg052_unit || ""}
                        </td>
                        <td>{log.dg052_reason || "—"}</td>
                        <td>{log.created_by_name || "—"}</td>
                        <td>{fmtDate(log.dg052_created_at)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={filters.page}
            totalPages={pagination.totalPages || 1}
            totalItems={pagination.total || 0}
            itemsPerPage={filters.limit}
            onPageChange={handlePageChange}
          />
        </div>
      </div>
    </div>
  );
};

export default WastageReport;
