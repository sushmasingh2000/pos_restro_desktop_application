import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { apiConnectorGet, apiConnectorPost } from "../../../utils/APIConnector";
import { endpoint } from "../../../utils/APIRoutes";
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

const AddExpenseModal = ({ isOpen, onClose, editExpense }) => {
  const queryClient = useQueryClient();
  const isEdit = Boolean(editExpense);

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    date: "",
    amount: "",
    payment_method: "Cash",
    desc: ""
  });

  // ================= PREFILL =================
  useEffect(() => {
    if (!isOpen) return;
    if (editExpense) {
      setFormData({
        name: editExpense.dg022_name || "",
        category: editExpense.dg022_category || "",
        date: editExpense.dg022_date || "",
        amount: editExpense.dg022_amount || "",
        payment_method: editExpense.dg022_payment_method || "Cash",
        desc: editExpense.dg022_description || ""
      });
    } else {
      setFormData({
        name: "",
        category: "",
        date: "",
        amount: "",
        payment_method: "Cash",
        desc: ""
      });
    }
  }, [editExpense, isOpen]);

  // ================= GET CATEGORY =================
  const { data } = useQuery(
    ["expense_categories"],
    () => apiConnectorGet(endpoint.expense_categroy_get_api),
    { refetchOnWindowFocus: false }
  );

  const categories = data?.data?.result || [];

  // ================= ADD =================
  const addExpenseMutation = useMutation(
    () => apiConnectorPost(endpoint.expense_add_api, formData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries("get_expenses");
        onClose();
      }
    }
  );

  // ================= UPDATE =================
  const updateExpenseMutation = useMutation(
    () =>
      apiConnectorPost(endpoint.expense_update_api, {
        expense_id: editExpense?.dg022_expense_id,
        ...formData
      }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries("get_expenses");
        onClose();
      }
    }
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    isEdit ? updateExpenseMutation.mutate() : addExpenseMutation.mutate();
  };

  if (!isOpen) return null;

  const inputStyle = `w-full bg-white/10 border border-white/20 rounded-xl p-3
    placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 
       " style={{background: "#0e2a47b5"}}>

      <div className="Order_Details_modal">

        {/* HEADER */}
        <div className="Order_Details_modal_header">
          <div className="flex items-center gap-3">
              <div className="modal_header_icon">🗂️</div>
              <div>
              <h2>{isEdit ? "Update Expense" : "Add Expense"}</h2>
              <p>{isEdit ? "Update the details of this expense." : "Fill in the details to add a new expense."}</p>
            </div>
          </div>
          <button onClick={onClose}>×</button>
        </div>
       

        {/* FORM */}
        <form >
          <Row className="p-3 pt-2">
            {/* CATEGORY */}
            <Col md={6}>
              <div className="main_input">
                <label>Category <span className="text-red-500">*</span></label>
                <select name="category" value={formData.category} onChange={handleChange} required>
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.dg024_expense_category_id} value={cat.dg024_expense_category_id} >
                      {cat.dg024_name}
                    </option>
                  ))}
                </select>
              </div>
            </Col>
            <Col md={6}>
              <div className="main_input">
                  <label>Name <span className="text-red-500">*</span></label>
                  <input name="name" value={formData.name} onChange={handleChange} placeholder="Expense Name" required/>
              </div>
            </Col>
            <Col md={6}>
              <div className="main_input">
                  <label>Payment Method <span className="text-red-500">*</span></label>
                  <select name="payment_method" value={formData.payment_method} onChange={handleChange}>
                    <option>Cash</option>
                    <option>Online / UPI</option>
                    <option>Card</option>
                  </select>
              </div>
            </Col>

            <Col md={6}>
              <div className="main_input">
                <label>Amount <span className="text-red-500">*</span></label>
                <input type="number" name="amount" value={formData.amount} onChange={handleChange} placeholder="Amount" required />
              </div>
            </Col>
            <Col md={6}>
              <div className="main_input">
                <label>Date <span className="text-red-500">*</span></label>
                <input type="date" name="date" value={formData.date} onChange={handleChange} required />
              </div>
            </Col>
            <Col md={6}>
              <div className="main_input">
                <label>Description</label>
                <textarea
                  rows={1}
                  name="desc"
                  value={formData.desc}
                  onChange={handleChange}
                  placeholder="Description"
                />
              </div>
            </Col>
          </Row>
        </form>
        <div className="flex justify-between gap-3 modal_footer px-3 py-3">

          <button type="button" onClick={onClose} className="cancel_btn">
           ✕ Cancel
          </button>

          <button
          onClick={handleSubmit}
            type="submit"
            className="update_btn"
          >
            {isEdit
              ? updateExpenseMutation.isLoading
                ? "✓ Updating..."
                : "✓ Update"
              : addExpenseMutation.isLoading
                ? "✓ Saving..."
                : "✓Save"}
          </button>

        </div>
      </div>
    </div>
  );
};

export default AddExpenseModal;