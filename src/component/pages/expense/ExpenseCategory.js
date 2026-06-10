
import React, { useState } from 'react';
import { Delete, Edit } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { apiConnectorGet, apiConnectorPost } from '../../../utils/APIConnector';
import { endpoint } from '../../../utils/APIRoutes'
import AddCategoryExpenseModal from './AddCategoryExpense';

const ExpenseCategory = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState(null);
  const queryClient = useQueryClient();

  const { data } = useQuery(
    ["get_inventory_categories"],
    () => apiConnectorGet(endpoint.expense_categroy_get_api),
    { refetchOnWindowFocus: false }
  );

  const categories = (data?.data?.result || []).map(cat => ({
    id: cat.dg024_expense_category_id,
    name: cat.dg024_name,
    description: cat.dg024_description,
    status: cat.dg024_status
  }));

  const deleteMutation = useMutation(
    (category_id) => apiConnectorPost(endpoint.expense_categroy_delete_api, { category_id }),
    {
      onSuccess: () => queryClient.invalidateQueries("get_inventory_categories"),
    }
  );

  return (
    <div className="main_cards">
      <div className="cards_header flex items-center justify-between">
        <div>
          <h3>Expense Category</h3>
          <p>Expense Category</p>
        </div>
        <button onClick={() => { setCategoryToEdit(null); setIsModalOpen(true); }}>
          <span>+</span> Add Category
        </button>
      </div>

       
    

      {/* TABLE */}
      <div className="main_table_container"  style={{borderRadius: '0px'}}>

        <div className="overflow-x-auto">
          <table className="w-full">

            {/* HEADER */}
            <thead>
              <tr>
                <th>S.No</th>
                <th>Category Name</th>
                <th>Description</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            {/* BODY */}
            <tbody>
              {categories.map((cat, i) => (
                <tr
                  key={cat.id}
                  
                 className="border-t border-white/10 hover:bg-white/5 transition">
                  <td>{i + 1}</td>

                  <td>
                    {cat.name}
                  </td>

                  <td>
                    {cat.description}
                  </td>

                  <td>
                    <span className={`
                      ${cat.status === 'Active'
                        ? 'green_bg'
                        : 'red_bg'
                      }`}>
                      {cat.status}
                    </span>
                  </td>

                  <td className='flex gap-2'>
                    <div className="edite" onClick={() => { setCategoryToEdit(cat); setIsModalOpen(true);}}>✏️</div>
                    <div className="delete" onClick={() => deleteMutation.mutate(cat.id)}>🗑️</div>
                  </td>
                </tr>
              ))}
            </tbody>

          </table>
        </div>
      </div>

      {/* MODAL */}
      <AddCategoryExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        categoryToEdit={categoryToEdit}
      />
    </div>
  );
};

export default ExpenseCategory;