
import Dashboard from "../Dashboard";
import MainLayout from "../component/Layout/MainLayout";
import CancelOrder from "../component/pages/CancelOrder";
import CustomerLedger from "../component/pages/Customerledger";
import DineIn from "../component/pages/DineIn";
import DoorDelivery from "../component/pages/DoorDelivery";
import KitchenScreen from "../component/pages/KOTOrder";
import LendingOrders from "../component/pages/LendingOrders";
import OnlineOrder from "../component/pages/OnlineOrder";
import Orders from "../component/pages/Orders";
import PaymentLendingWallet from "../component/pages/PaymentSummary";
import PendingOrder from "../component/pages/PendingOrder";
import POS from "../component/pages/POS";
import CustomerReport from "../component/pages/Report";
import SalesSummary from "../component/pages/SalesOrderSummary";
import TakeAway from "../component/pages/TakeAway";
import ExpenseManagementReport from "../component/pages/expense/Expense";


export const routes = [
  {
    path: "/userdashboard",
    element: (
      <MainLayout>
        <Dashboard />{" "}
      </MainLayout>
    ),
  },
  {
    path: "/all-orders",
    element: (
      <MainLayout>
        <Orders />{" "}
      </MainLayout>
    ),
  },
  {
    path: "/customer-ledger",
    element: (
      <MainLayout>
        <CustomerLedger />{" "}
      </MainLayout>
    ),
  },
   {
    path: "/customer-report",
    element: (
      <MainLayout>
        <CustomerReport />{" "}
      </MainLayout>
    ),
  },
  {
    path: "/sales-summary",
    element: (
      <MainLayout>
        <SalesSummary />{" "}
      </MainLayout>
    ),
  },
  {
    path: "/payment-summary",
    element: (
      <MainLayout>
        <PaymentLendingWallet />{" "}
      </MainLayout>
    ),
  },
  {
    path: "/pos/:type",
    element: (
      <MainLayout>
        <POS />
      </MainLayout>
    ),
  },
  {
    path: "/pending-order",
    element: (
      <MainLayout>
        <PendingOrder />
      </MainLayout>
    ),
  },
  {
    path: "/online-order",
    element: (
      <MainLayout>
        <OnlineOrder />
      </MainLayout>
    ),
  },
  {
    path: "/dine-in-order",
    element: (
      <MainLayout>
        <DineIn />
      </MainLayout>
    ),
  },
  {
    path: "/take-away-order",
    element: (
      <MainLayout>
        <TakeAway />
      </MainLayout>
    ),
  },
  {
    path: "/door-dilevery-order",
    element: (
      <MainLayout>
        <DoorDelivery />
      </MainLayout>
    ),
  },
  {
    path: "/cancelled-order",
    element: (
      <MainLayout>
        <CancelOrder />
      </MainLayout>
    ),
  },
  {
    path: "/lending-order",
    element: (
      <MainLayout>
        <LendingOrders />
      </MainLayout>
    ),
  },

  {
    path: "/kitchen-order",
    element: (
      <MainLayout>
        <KitchenScreen />
      </MainLayout>
    ),
  },
   {
    path: "/expense-report",
    element: (
      <MainLayout>
        <ExpenseManagementReport />
      </MainLayout>
    ),
  },

];
