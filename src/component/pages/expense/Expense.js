

import { Delete, Edit, Download } from "@mui/icons-material";
import React, { useState } from "react";
import AddExpenseModal from "./AddExpense";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { apiConnectorGet, apiConnectorPost } from "../../../utils/APIConnector";
import { endpoint } from "../../../utils/APIRoutes";
import moment from "moment";


const ExpenseManagementReport = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editExpense, setEditExpense] = useState(null);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery(
    ["get_expenses"],
    () => apiConnectorGet(endpoint.expense_list_api),
    { refetchOnWindowFocus: false }
  );

  const expenses = data?.data?.result || [];

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
    <div className="">
      <div className="breadcrumbs">
        <div>
          <h3 className="main_heading">Expense Management</h3>
          <ul>
            <li>Home</li>
            <li>/</li>
            <li className="active">Expense Management</li>
          </ul>
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
        <button className="download_btn">
          <Download />
        </button>
       </div>
      </div>

      

      {/* TABLE CONTAINER */}
      <div className="main_table_container">

        <div className="overflow-x-auto" style={{borderRadius: '14px'}}>
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
                expenses.map((exp, i) => (
                  <tr
                    key={exp.dg022_expense_id}
                    className="border-t border-white/10 hover:bg-white/5 transition"
                  >
                    <td>{i + 1}</td>
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