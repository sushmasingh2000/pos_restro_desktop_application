

import { Delete, Edit, Download } from "@mui/icons-material";
import React, { useState, useEffect } from "react";
import AddExpenseModal from "./AddExpense";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { apiConnectorGet, apiConnectorPost } from "../../../utils/APIConnector";
import { endpoint } from "../../../utils/APIRoutes";
import moment from "moment";
import * as XLSX from "xlsx";
import Pagination from "../../../Shared/Page";


const ExpenseManagementReport = () => {
  const today = moment().format("YYYY-MM-DD");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editExpense, setEditExpense] = useState(null);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [categoryId, setCategoryId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const queryClient = useQueryClient();

  const { data: categoryData } = useQuery(
    ["get_expense_category"],
    () => apiConnectorGet(endpoint.expense_categroy_get_api),
    { refetchOnWindowFocus: false }
  );
  const categories = categoryData?.data?.result || [];

  const { data, isLoading } = useQuery(
    ["get_expenses", startDate, endDate, categoryId],
    () =>
      apiConnectorGet(endpoint.expense_list_api, {
        ...(startDate ? { start_date: startDate } : {}),
        ...(endDate ? { end_date: endDate } : {}),
        ...(categoryId ? { category_id: categoryId } : {}),
      }),
    { refetchOnWindowFocus: false, keepPreviousData: true }
  );

  const expenses = data?.data?.result || [];

  // Cash vs Online/UPI split for whatever expenses are currently filtered
  // in (date range + category).
  const paymentTotals = expenses.reduce((acc, exp) => {
    const mode = exp.dg022_payment_method || "Unknown";
    acc[mode] = (acc[mode] || 0) + (parseFloat(exp.dg022_amount) || 0);
    return acc;
  }, {});

  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate, categoryId]);

  const totalPages = Math.ceil(expenses.length / itemsPerPage) || 1;
  const paginatedExpenses = expenses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleClearFilters = () => {
    setStartDate("");
    setEndDate("");
    setCategoryId("");
    setCurrentPage(1);
  };

  const handleDownload = () => {
    if (!expenses.length) return;
    const rows = expenses.map((exp, i) => ({
      "S.No": i + 1,
      "Expense ID": exp.dg022_unique_id,
      "Category": exp.category_name || "-",
      "Name": exp.dg022_name,
      "Date": moment(exp.dg022_date).format("YYYY-MM-DD"),
      "Amount": parseFloat(exp.dg022_amount).toFixed(2),
      "Payment Method": exp.dg022_payment_method,
      "User": exp.user_name || "-",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expenses");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const fileTag = startDate || endDate ? `${startDate || "all"}_to_${endDate || "all"}` : "all";
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([buf], { type: "application/octet-stream" })),
      download: `Expenses_${fileTag}.xlsx`,
    });
    a.click();
  };

  const deleteMutation = useMutation(
    (id) =>
      apiConnectorPost(endpoint.expense_delete_api, {
        expense_id: id,
      }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["get_expenses"]);
      },
    }
  );

  return (
    <div className="main_cards">
      <div className="cards_header flex items-center justify-between ">
        <div>
          <h3>Expense Management</h3>
          <p>Track and manage business expenses with ease.</p>
        </div>
       <div className="flex gap-3">
         <button
          onClick={() => {
            setEditExpense(null);
            setIsModalOpen(true);
          }}
        >
          <span>+</span> Add Expense
        </button>
        <button className="download_btn" onClick={handleDownload} disabled={!expenses.length} title="Download Excel">
          <Download />
        </button>
       </div>
      </div>

      {/* FILTERS */}
      <div className="flex flex-wrap items-end gap-3 px-3 pb-3">
        <div className="main_input mt-0">
          <label>Start Date</label>
          <input type="date" value={startDate} max={endDate || undefined} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="main_input mt-0">
          <label>End Date</label>
          <input type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div className="main_input mt-0">
          <label>Category</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.dg024_expense_category_id} value={c.dg024_expense_category_id}>
                {c.dg024_name}
              </option>
            ))}
          </select>
        </div>
        {(startDate || endDate || categoryId) && (
          <button className="cancel_btn" onClick={handleClearFilters}>✕ Clear Filters</button>
        )}

        {/* CASH vs ONLINE SPLIT */}
        {Object.keys(paymentTotals).length > 0 && (
          <div className="flex flex-wrap gap-2 ml-auto">
            {Object.entries(paymentTotals).map(([mode, amount]) => (
              <span
                key={mode}
                className="green_bg"
                style={{ fontSize: 12, padding: "6px 12px", whiteSpace: "nowrap" }}
              >
                {mode}: ₹{amount.toFixed(2)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* TABLE CONTAINER */}
      <div className="main_table_container  border-0" style={{borderRadius: '0px'}}>

        <div className="overflow-x-auto" >
          <table className="w-full">
            <thead>
              <tr >
                <th>S.No</th>
                <th>Expense ID</th>
                <th>Category</th>
                <th>Name</th>
                <th>Date</th>
                <th>Amount</th>
                <th>MOP</th>
                <th>User</th>
                <th>Action</th>
              </tr>
            </thead>

            {/* BODY */}
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="9" className="text-center p-6 text-white/60">
                    Loading...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center p-6 text-white/60">
                    No expenses found
                  </td>
                </tr>
              ) : (
                paginatedExpenses.map((exp, i) => (
                  <tr
                    key={exp.dg022_expense_id}
                    className="border-t border-white/10 hover:bg-white/5 transition"
                  >
                    <td>{(currentPage - 1) * itemsPerPage + i + 1}</td>
                    <td >
                      {exp.dg022_unique_id}
                    </td>
                    <td >
                      {exp.category_name || "-"}
                    </td>
                    <td>{exp.dg022_name}</td>
                    <td>{moment(exp.dg022_date).format("YYYY-MM-DD")}</td>

                    <td className="text-emerald-300">
                      ₹{parseFloat(exp.dg022_amount).toFixed(2)}
                    </td>

                    <td>{exp.dg022_payment_method}</td>
                    <td>{exp.user_name}</td>

                    {/* ACTIONS */}
                    <td className="flex gap-2">
                      <div className="edite" onClick={() => { setEditExpense(exp);  setIsModalOpen(true); }} >✏️</div>
                      <div className="delete" onClick={() => deleteMutation.mutate(exp.dg022_expense_id) } >🗑️</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>

          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={expenses.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* MODAL */}
      <AddExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editExpense={editExpense}
      />
    </div>
  );
};

export default ExpenseManagementReport;