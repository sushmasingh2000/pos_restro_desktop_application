import React, { useState, useEffect } from "react";
import { useQuery } from "react-query";
import { apiConnectorGet } from "../../../utils/APIConnector";
import { endpoint } from "../../../utils/APIRoutes";
import AddStockModal from "./AddStockModal";
import Pagination from "../../../Shared/Page";

// Panel view of inventory: read-only product list + "Add Stock" only.
// Creating, editing or deleting inventory products stays admin-only —
// this page never calls product_add_api / product_update_api / product_delete_api.
const formatQty = (value, product) => {
  const upp = parseFloat(product.dg011_units_per_pack) || 1;
  const qty = parseFloat(value) || 0;
  if (upp > 1) {
    const wholePackets = Math.trunc(qty / upp);
    const loosePieces = Math.round(qty - wholePackets * upp);
    return `${wholePackets} packets + ${loosePieces} pieces`;
  }
  return `${qty} ${product.dg011_unit || ""}`;
};

const Inventory = () => {
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [productToStock, setProductToStock] = useState(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data, isLoading, isError } = useQuery(
    ["panel_products"],
    () => apiConnectorGet(endpoint.product_get_api),
    { refetchOnWindowFocus: false }
  );

  const { data: categoryData } = useQuery(
    ["panel_inventory_categories"],
    () => apiConnectorGet(endpoint.categroy_get_api),
    { refetchOnWindowFocus: false }
  );
  const categories = categoryData?.data?.result || [];

  const allProducts = data?.data?.result || [];

  const productList = allProducts.filter((p) => {
    const matchesSearch = (p.dg011_name || "").toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || String(p.dg011_inventory_category_id) === String(categoryFilter);
    return matchesSearch && matchesCategory;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter]);

  const totalPages = Math.ceil(productList.length / itemsPerPage) || 1;
  const paginatedProducts = productList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleAddStock = (product) => {
    setProductToStock(product);
    setIsStockModalOpen(true);
  };

  if (isError) {
    return (
      <div className="main_cards">
        <div className="p-6 text-center text-red-400">Failed to load inventory</div>
      </div>
    );
  }

  return (
    <div className="main_cards">
      <div className="cards_header flex items-center justify-between">
        <div>
          <h3>Inventory</h3>
          <p>View stock levels and add received stock.</p>
        </div>
      </div>

      {/* FILTERS */}
      <div className="flex flex-wrap items-end gap-3 px-3 pb-3">
        <div className="main_input mt-0">
          <label>Search</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product name"
          />
        </div>
        <div className="main_input mt-0">
          <label>Category</label>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.dg023_inventory_category_id} value={c.dg023_inventory_category_id}>
                {c.dg023_name}
              </option>
            ))}
          </select>
        </div>
        {(search || categoryFilter) && (
          <button className="cancel_btn" onClick={() => { setSearch(""); setCategoryFilter(""); }}>
            ✕ Clear Filters
          </button>
        )}
      </div>

      {/* TABLE */}
      <div className="main_table_container border-0" style={{ borderRadius: "0px" }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Category</th>
                <th>Product</th>
                <th>Unit</th>
                <th>Current Stock</th>
                <th>Last Stock Added</th>
                <th>Status</th>
                <th>Add Stock</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="9" className="text-center p-6 text-white/60">
                    Loading...
                  </td>
                </tr>
              ) : paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-6 text-center text-white/60">
                    No products found
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product, i) => (
                  <tr
                    key={product.dg011_inventory_id}
                    className="border-b border-white/10 hover:bg-white/10 transition"
                  >
                    <td>{(currentPage - 1) * itemsPerPage + i + 1}</td>
                    <td>{product.category_name || "N/A"}</td>
                    <td>{product.dg011_name}</td>
                    <td className="capitalize">
                      {product.dg011_unit || "—"}
                      {parseFloat(product.dg011_units_per_pack) > 1 && (
                        <span style={{ fontSize: 11, opacity: 0.6, marginLeft: 4, textTransform: "none" }}>
                          ({product.dg011_units_per_pack}/pack)
                        </span>
                      )}
                    </td>
                    <td>{formatQty(product.dg011_current_stock, product)}</td>
                    <td>
                      {product.last_stock_added_at
                        ? new Date(product.last_stock_added_at).toLocaleDateString()
                        : "—"}
                    </td>
                    <td>
                      <span
                        className={
                          parseFloat(product.dg011_current_stock) <= parseFloat(product.dg011_low_stock_alert)
                            ? "red_bg"
                            : "green_bg"
                        }
                      >
                        {parseFloat(product.dg011_current_stock) <= parseFloat(product.dg011_low_stock_alert)
                          ? "Low"
                          : "OK"}
                      </span>
                    </td>
                    <td className="text-center">
                      <div className="edite" title="Add Stock" onClick={() => handleAddStock(product)}>➕</div>
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
          totalItems={productList.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>

      <AddStockModal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        product={productToStock}
      />
    </div>
  );
};

export default Inventory;
