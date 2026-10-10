import { lazyPage } from "../utils/lazyPage";
import MainLayout from "../component/Layout/MainLayout";

const Dashboard = lazyPage(() => import("../Dashboard"));
const BillPage = lazyPage(() => import("../component/pages/Bill"), null, { preload: true });
const CancelOrder = lazyPage(() => import("../component/pages/CancelOrder"));
const CustomerLedger = lazyPage(() => import("../component/pages/Customerledger"));
const DineIn = lazyPage(() => import("../component/pages/DineIn"), null, { preload: true });
const DoorDelivery = lazyPage(() => import("../component/pages/DoorDelivery"));
const LendingOrders = lazyPage(() => import("../component/pages/LendingOrders"));
const OnlineOrder = lazyPage(() => import("../component/pages/OnlineOrder"));
const Orders = lazyPage(() => import("../component/pages/Orders"));
const PaymentLendingWallet = lazyPage(() => import("../component/pages/PaymentSummary"));
const PendingOrder = lazyPage(() => import("../component/pages/PendingOrder"));
const POS = lazyPage(() => import("../component/pages/POS"), null, { preload: true });
const CustomerReport = lazyPage(() => import("../component/pages/Report"));
const SalesSummary = lazyPage(() => import("../component/pages/SalesOrderSummary"));
const TakeAway = lazyPage(() => import("../component/pages/TakeAway"));
const ExpenseManagementReport = lazyPage(() => import("../component/pages/expense/Expense"));
const Inventory = lazyPage(() => import("../component/pages/inventory/Inventory"));
const OnlineDeliveryOrder = lazyPage(() => import("../component/pages/OnlineDeliveryOrder"));
const QROrder = lazyPage(() => import("../component/pages/QROrder"));
const TakeawayLiveOrder = lazyPage(() => import("../component/pages/TakeawayLiveOrder"));
const QrTakeawayOrder = lazyPage(() => import("../component/pages/QrTakeawayOrder"));
const FeedbackPage = lazyPage(() => import("../component/pages/FeedbackPage"));
const MyTickets = lazyPage(() => import("../component/pages/MyTickets"));
const KitchenDisplay = lazyPage(() => import("../component/pages/KitchenDisplay"));
const WastageReport = lazyPage(() => import("../component/pages/WastageReport"));

export const routes = [
  {
    path: "/kitchen-display",
    element: <KitchenDisplay />,
  },
  {
    path: "/bill",
    element: (
      <MainLayout>
        <BillPage />
      </MainLayout>
    ),
  },
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
    path: "/online-delivery-order",
    element: (
      <MainLayout>
        <OnlineDeliveryOrder />
      </MainLayout>
    ),
  },

  {
    path: "/qr-order",
    element: (
      <MainLayout>
        <QROrder />
      </MainLayout>
    ),
  },
  {
    path: "/takeaway-qr-order",
    element: (
      <MainLayout>
        <TakeawayLiveOrder />
      </MainLayout>
    ),
  },
  {
    path: "/qr-takeaway-order",
    element: (
      <MainLayout>
        <QrTakeawayOrder />
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
    path: "/expense-report",
    element: (
      <MainLayout>
        <ExpenseManagementReport />
      </MainLayout>
    ),
  },
  {
    path: "/inventory",
    element: (
      <MainLayout>
        <Inventory />
      </MainLayout>
    ),
  },
  {
    path: "/wastage-report",
    element: (
      <MainLayout>
        <WastageReport />
      </MainLayout>
    ),
  },
  {
    path: "/feedback",
    element: (
      <MainLayout>
        <FeedbackPage />
      </MainLayout>
    ),
  },
  {
    path: "/support-tickets",
    element: (
      <MainLayout>
        <MyTickets />
      </MainLayout>
    ),
  },

];
