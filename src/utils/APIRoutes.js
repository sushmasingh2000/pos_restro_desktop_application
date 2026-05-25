import { domain } from "../domain";


export const endpoint = {
  login_api: `${domain}/api/v1/login`,
  table_branch_api: `${domain}/api/v1/get-table-by-branch`,
  menu_branch_api: `${domain}/api/v1/get-menu-by-branch`,
  get_orders_by_table_api: `${domain}/api/v1/get-order-by-table`,
  add_update_order_api: `${domain}/api/v1/add-update-orders`,
  generate_kot_api: `${domain}/api/v1/kot/generate`,
  update_table_status_api: `${domain}/api/v1/update-table-status`,
  order_branch_status_api: `${domain}/api/v1/order-by-branch-status`,
  order_by_type: `${domain}/api/v1/order-by-type`,
  get_kitchen_kot_api: `${domain}/api/v1/kot/get-kitchen-kot`,
  update_kitchen_kot_api: `${domain}/api/v1/kot/update-kitchen-kot`,
  generate_bill_api: `${domain}/api/v1/print-bill`,
  printer_bill_api: `${domain}/api/v1/thermal-print-bill`,

  // get_sales_summary: `${domain}/api/v1/monthly-dashboard`,

  update_bill_details_api: `${domain}/api/v1/update-bill`,
  get_bill_by_id_api: `${domain}/api/v1/get-bill`,
  tax_get_api: `${domain}/api/v1/bill/taxes`,
  charge_get_api: `${domain}/api/v1/bill/charges`,
  payment_mode_get_api: `${domain}/api/v1/bill/payment-modes`,
  cancel_order_api: `${domain}/api/v1/cancel-order`,
  // ── ADVANCED DASHBOARD ANALYTICS ──
  dashboard_summary_api: `${domain}/api/v1/dashboard-summary`,
  dashboard_daily_order_analysis_api: `${domain}/api/v1/dashboard-daily-order-analysis`,
  dashboard_daily_sales_analysis_api: `${domain}/api/v1/dashboard-daily-sales-analysis`,
  dashboard_payment_analysis_api: `${domain}/api/v1/dashboard-payment-analysis`,
  dashboard_online_payment_analysis_api: `${domain}/api/v1/dashboard-online-payment-analysis`,
  dashboard_graphical_analysis_api: `${domain}/api/v1/dashboard-graphical-analysis`,

  move_table_api: `${domain}/api/v1/move-table`,
  merge_tables_api: `${domain}/api/v1/merge-tables`,
  split_table_api: `${domain}/api/v1/split-table`,
  customer_search_api: `${domain}/api/v1/customers-search`,
  customer_ledger_api: `${domain}/api/v1/customer-ledger`,
  collect_lending_api: `${domain}/api/v1/lending-collect`,
  wallet_topup_api: `${domain}/api/v1/wallet-topup`,
  wallet_deduct_api: `${domain}/api/v1/wallet-deduct`,

  lending_all_api: `${domain}/api/v1/lending-all`,
  lending_detail_api: `${domain}/api/v1/lending-detail`,
  lending_settle_api: `${domain}/api/v1/lending-settle`,

  lending_payments_api: `${domain}/api/v1/lending-payments`,
  register_customer_api: `${domain}/api/v1/customer-register`,

  dashboard_lending_analysis_api: `${domain}/api/v1/dashboard-lending-analysis`,
  dashboard_wallet_analysis_api: `${domain}/api/v1/dashboard-wallet-analysis`,

  customer_report_api: `${domain}/api/v1/customer-report-list`,
  customer_report_by: `${domain}/api/v1/customer-report`,

  printer_lsit_api: `${domain}/api/v1/printer-list`,

  expense_list_api: `${domain}/api/v1/get-expenses`,
  expense_add_api: `${domain}/api/v1/create-expenses`,
  expense_update_api: `${domain}/api/v1/update-expenses`,
  expense_delete_api: `${domain}/api/v1/delete-expenses`,
  expense_categroy_get_api: `${domain}/api/v1/get-expense-category`,

};
