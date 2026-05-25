import React from "react";
import { Skeleton } from "@mui/material";

const CustomTable = ({
  tablehead = [],
  tablerow = [],
  className,
  isLoading,
}) => {
  return (
    <div className="rounded-xl overflow-hidden border border-green-400 border-opacity-50">
      {/* Scrollable wrapper */}
      <div className="w-full overflow-x-auto">
        <table className="min-w-full table-auto divide-y divide-gray-700 text-sm !rounded-full">
          <thead className="bg-gray-700">
            <tr>
              {Array.isArray(tablehead) &&
                tablehead.map((column, index) => (
                  <th
                    key={index}
                    scope="col"
                    className="border border-green-400 px-4 py-2 border-opacity-50 text-left text-xs font-semibold text-gray-300 uppercase whitespace-nowrap"
                  >
                    {column}
                  </th>
                ))}
            </tr>
          </thead>

          <tbody className="bg-gray-800 divide-y divide-gray-700">
            {isLoading ? (
              Array.from({ length: 10 }).map((_, rowIndex) => (
                <tr key={rowIndex}>
                  {Array.isArray(tablehead) &&
                    tablehead.map((_, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="border border-green-400 border-opacity-50 px-4 py-3 whitespace-nowrap text-gray-200"
                      >
                        <Skeleton animation="wave" height={20} />
                      </td>
                    ))}
                </tr>
              ))
            ) : tablerow.length === 0 ? (
              <tr>
                <td
                  colSpan={tablehead?.length || 1}
                  className="text-center text-white px-4 py-6"
                >
                  No data found
                </td>
              </tr>
            ) : (
              tablerow.map((row, rowIndex) => {
                // ✅ Detect if this row should be red
                const isMemberRow = row.some(
                  (cell) => cell?.props?.className?.includes("text-red-400")
                );

                return (
                  <tr
                    key={rowIndex}
                    className={`hover:bg-gray-600/30 hover:text-white transition-colors ${isMemberRow ? "text-red-400 hover:text-red-400" : ""
                      }`}
                  >
                    {Array.isArray(row) &&
                      row.map((cell, cellIndex) => (
                        <td
                          key={cellIndex}
                          className="border border-green-400 border-opacity-50 px-4 py-3 whitespace-nowrap text-sm text-gray-200"
                        >
                          {/* remove 'block' here so it stays inline */}
                          {React.cloneElement(cell, {
                            className: cell.props.className?.replace("block", "inline-block"),
                          })}
                        </td>
                      ))}
                  </tr>
                );
              })
            )}
          </tbody>

        </table>
      </div>
    </div>
  );
};

export default CustomTable;
