import React from "react";

export default function Pagination({
  currentPage,
  totalPages,
  totalItems = 0,
  itemsPerPage = 10,
  onPageChange,
}) {
  if (totalPages <= 1) return null;

  const from = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const to = Math.min(currentPage * itemsPerPage, totalItems);

  // Windowed page list — always show first/last + current ±1, "…" for gaps,
  // so pagination stays a fixed width instead of listing every page.
  const pageItems = [];
  const addPage = (p) => pageItems.push(p);
  const windowStart = Math.max(2, currentPage - 1);
  const windowEnd = Math.min(totalPages - 1, currentPage + 1);

  addPage(1);
  if (windowStart > 2) addPage("…left");
  for (let p = windowStart; p <= windowEnd; p++) addPage(p);
  if (windowEnd < totalPages - 1) addPage("…right");
  if (totalPages > 1) addPage(totalPages);

  return (
    <div className="flex items-center justify-between px-3 mt-3 mb-3">
      <div className="pagination_number">
        Showing{" "}
        <span className="pagintation_text">{from}–{to}</span>{" "}
        of{" "}
        <span className="pagintation_text">{totalItems}</span>{" "}
        entries
      </div>

      <div className="flex gap-2">
        <button
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="prev_btn"
        >
          Prev
        </button>

        {pageItems.map((p, i) =>
          typeof p === "number" ? (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={currentPage === p ? "current_page" : "page_num_inactive"}
            >
              {p}
            </button>
          ) : (
            <span key={p + i} className="current_page" style={{ cursor: "default" }}>
              …
            </span>
          )
        )}

        <button
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="next_btn"
        >
          Next
        </button>
      </div>
    </div>
  );
}
