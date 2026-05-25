
import React, { useState, useEffect } from "react";
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { useMutation, useQueryClient } from "react-query";
import { apiConnectorPost } from "../../../utils/APIConnector";
import { endpoint } from "../../../utils/APIRoutes";


const AddCategoryExpenseModal = ({ isOpen, onClose, categoryToEdit }) => {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    category_name: "",
    description: "",
    status: "Active"
  });

  useEffect(() => {
    if (categoryToEdit) {
      setFormData({
        category_name: categoryToEdit.name || "",
        description: categoryToEdit.description || "",
        status: categoryToEdit.status || "Active"
      });
    } else {
      setFormData({ category_name: "", description: "", status: "Active" });
    }
  }, [categoryToEdit, isOpen]);

  const mutation = useMutation(
    () => {
      if (categoryToEdit) {
        return apiConnectorPost(endpoint.expense_categroy_update_api, {
          category_id: categoryToEdit.id,
          ...formData
        });
      }
      return apiConnectorPost(endpoint.expense_categroy_add_api, formData);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries("get_inventory_categories");
        onClose();
      }
    }
  );

  if (!isOpen) return null;

  const inputStyle = `w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/30
    bg-white/10 border border-white/20 backdrop-blur-xl
    focus:outline-none focus:border-purple-400/60 focus:bg-white/15 transition-all`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="Order_Details_modal">
        {/* HEADER */}
        <div className="Order_Details_modal_header">
          <div className="flex items-center gap-3">
              <div className="modal_header_icon">🗂️</div>
              <div>
              <h2>{categoryToEdit ? "Edit Expense Category" : "Add Expense Category"}</h2>
              <p>{categoryToEdit ? "Update the details of this expense category." : "Fill in the details to add a new expense category."}</p>
            </div>
          </div>
          <button onClick={onClose}>×</button>
        </div>

        {/* BODY */}
        <Row className="p-3 pt-2">
          <Col md={6}>
            <div className="main_input">
              <label>Category Name <span className="text-red-500">*</span></label>
               <input
              value={formData.category_name}
              onChange={(e) =>
                setFormData({ ...formData, category_name: e.target.value })
              }
              placeholder="Enter Category Name"
            />
            </div>
          </Col>
          <Col md={6}>
            <div className="main_input">
                <label>Status <span className="text-red-500">*</span></label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
            </div>
          </Col>
          <Col md={12}>
            <div className="main_input">
                <label>Description <span className="text-red-500">*</span></label>
                <textarea
                rows="3"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Enter description"
              
              />
            </div>  
          </Col>
        </Row>

        {/* FOOTER */}
        <div className="flex justify-between gap-3 modal_footer px-3 py-3">
          <button
            onClick={onClose}
            className="cancel_btn"
          >
            ✕ Cancel
          </button>

          <button
            onClick={() => mutation.mutate()}
            className="update_btn"
          >
            {mutation.isLoading
              ? categoryToEdit
                ? "✓ Updating..."
                : "✓ Saving..."
              : categoryToEdit
              ? "✓ Update"
              : "✓ Add Category"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddCategoryExpenseModal;