import { create } from "zustand";

export interface Invoice {
  id: string; // e.g. INV-2023-090
  customerName: string;
  salesmanName: string;
  amount: number;
  status: "Completed" | "Pending" | "Cancelled";
  date: string; // ISO date string
  dueDate: string;
}

export interface Collection {
  id: string;
  invoiceId: string;
  customerName: string;
  amount: number;
  date: string; // ISO date string
}

export interface Customer {
  id: string;
  code?: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  totalPurchases: number;
  outstandingBalance: number;
  status: "Active" | "Inactive" | "Overdue" | "Current";
  joinedDate: string;
  location?: string;
  lastInteraction?: string;
  invoiceTotal?: number;
  previouslyPaid?: number;
}

export interface Salesman {
  id: string;
  name: string;
  initials: string;
  revenue: number;
  deals: number;
  rating: number;
  email: string;
}

export interface ActivityItem {
  id: string;
  type: "payment" | "alert" | "invoice";
  title: string;
  subtitle: string;
  timestamp: string;
  amount?: number;
  rawDate: Date;
}

interface DashboardState {
  invoices: Invoice[];
  collections: Collection[];
  customers: Customer[];
  salesmen: Salesman[];
  activities: ActivityItem[];
  isLiveSimulationActive: boolean;

  // Actions
  addCustomer: (customer: Omit<Customer, "id" | "joinedDate" | "totalPurchases">) => void;
  createInvoice: (invoice: Omit<Invoice, "id" | "date">) => void;
  recordPayment: (payment: { invoiceId?: string; customerName: string; amount: number }) => void;
  toggleLiveSimulation: () => void;
  triggerSimulatedTransaction: () => void;
}

const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: "CUST-001",
    code: "CUST-1042",
    name: "Acme Corp",
    company: "Acme Corp",
    email: "contact@acme.com",
    phone: "+91 98765 43210",
    totalPurchases: 450000,
    outstandingBalance: 45000,
    invoiceTotal: 4500,
    previouslyPaid: 1000,
    status: "Overdue",
    location: "Mumbai",
    lastInteraction: "2 days ago",
    joinedDate: "2025-11-10",
  },
  {
    id: "CUST-002",
    code: "CUST-1043",
    name: "Global Tech Solutions",
    company: "Global Tech Solutions",
    email: "billing@globaltech.com",
    phone: "+91 98123 45678",
    totalPurchases: 320000,
    outstandingBalance: 12500,
    invoiceTotal: 15000,
    previouslyPaid: 2500,
    status: "Current",
    location: "Bangalore",
    lastInteraction: "Today",
    joinedDate: "2026-01-15",
  },
  {
    id: "CUST-003",
    code: "CUST-1044",
    name: "Sunrise Logistics",
    company: "Sunrise Logistics",
    email: "accounts@sunriselog.com",
    phone: "+91 99887 76655",
    totalPurchases: 180000,
    outstandingBalance: 0,
    invoiceTotal: 0,
    previouslyPaid: 0,
    status: "Inactive",
    location: "Delhi",
    lastInteraction: "3 months ago",
    joinedDate: "2025-08-20",
  },
  {
    id: "CUST-004",
    code: "CUST-1045",
    name: "Delta Systems",
    company: "Delta Systems",
    email: "pay@deltasys.com",
    phone: "+91 97654 32109",
    totalPurchases: 180000,
    outstandingBalance: 8500,
    invoiceTotal: 8500,
    previouslyPaid: 0,
    status: "Current",
    location: "Pune",
    lastInteraction: "1 week ago",
    joinedDate: "2026-02-01",
  },
  {
    id: "CUST-005",
    code: "CUST-1046",
    name: "Mehta Traders",
    company: "Mehta Traders",
    email: "mehta@traders.in",
    phone: "+91 98989 12345",
    totalPurchases: 540000,
    outstandingBalance: 35200,
    invoiceTotal: 40000,
    previouslyPaid: 4800,
    status: "Overdue",
    location: "Ahmedabad",
    lastInteraction: "5 days ago",
    joinedDate: "2025-05-12",
  },
];

const INITIAL_SALESMEN: Salesman[] = [
  { id: "SALES-001", name: "Raj Patel", initials: "RP", revenue: 642000, deals: 34, rating: 4.9, email: "raj@shubh.com" },
  { id: "SALES-002", name: "Priya Shah", initials: "PS", revenue: 518500, deals: 28, rating: 4.7, email: "priya@shubh.com" },
  { id: "SALES-003", name: "Ankit Joshi", initials: "AJ", revenue: 495200, deals: 25, rating: 4.6, email: "ankit@shubh.com" },
  { id: "SALES-004", name: "Neha Verma", initials: "NV", revenue: 387100, deals: 22, rating: 4.5, email: "neha@shubh.com" },
];

const todayStr = new Date().toISOString().split("T")[0];

const INITIAL_INVOICES: Invoice[] = [
  { id: "INV-2023-090", customerName: "TechSolutions", salesmanName: "Priya Shah", amount: 42500, status: "Completed", date: todayStr, dueDate: "2026-08-30" },
  { id: "INV-2023-089", customerName: "Acme Corp", salesmanName: "Raj Patel", amount: 28300, status: "Completed", date: todayStr, dueDate: "2026-08-25" },
  { id: "INV-2023-088", customerName: "Global Industries", salesmanName: "Ankit Joshi", amount: 62000, status: "Pending", date: "2026-06-01", dueDate: "2026-07-01" },
  { id: "INV-2023-087", customerName: "Mehta Traders", salesmanName: "Raj Patel", amount: 35200, status: "Pending", date: "2026-08-01", dueDate: "2026-08-20" },
  { id: "INV-2023-086", customerName: "Delta Systems", salesmanName: "Neha Verma", amount: 1200, status: "Completed", date: "2026-08-04", dueDate: "2026-08-15" },
  { id: "INV-2023-085", customerName: "Delta Systems", salesmanName: "Neha Verma", amount: 4500, status: "Completed", date: "2026-08-03", dueDate: "2026-08-18" },
];

const INITIAL_COLLECTIONS: Collection[] = [
  { id: "COL-101", invoiceId: "INV-2023-090", customerName: "TechSolutions", amount: 42500, date: todayStr },
  { id: "COL-100", invoiceId: "INV-2023-089", customerName: "Acme Corp", amount: 28300, date: todayStr },
  { id: "COL-099", invoiceId: "INV-2023-086", customerName: "Delta Systems", amount: 1200, date: "2026-08-04" },
  { id: "COL-098", invoiceId: "INV-2023-085", customerName: "Delta Systems", amount: 4500, date: "2026-08-03" },
];

const INITIAL_ACTIVITIES: ActivityItem[] = [
  { id: "ACT-1", type: "payment", title: "Payment Received: ₹4,500", subtitle: "From Acme Corp for INV-2023-089", timestamp: "10 mins ago", amount: 4500, rawDate: new Date(Date.now() - 10 * 60000) },
  { id: "ACT-2", type: "alert", title: "Collection Alert", subtitle: "Global Industries invoice > 60 days overdue (₹12,000)", timestamp: "1 hour ago", amount: 12000, rawDate: new Date(Date.now() - 60 * 60000) },
  { id: "ACT-3", type: "invoice", title: "New Invoice Generated", subtitle: "INV-2023-090 created for TechSolutions", timestamp: "2 hours ago", amount: 42500, rawDate: new Date(Date.now() - 120 * 60000) },
  { id: "ACT-4", type: "payment", title: "Payment Received: ₹1,200", subtitle: "From Delta Systems for INV-2023-085", timestamp: "3 hours ago", amount: 1200, rawDate: new Date(Date.now() - 180 * 60000) },
];

export const useDashboardStore = create<DashboardState>((set, get) => ({
  invoices: INITIAL_INVOICES,
  collections: INITIAL_COLLECTIONS,
  customers: INITIAL_CUSTOMERS,
  salesmen: INITIAL_SALESMEN,
  activities: INITIAL_ACTIVITIES,
  isLiveSimulationActive: true,

  addCustomer: (newCustData) => {
    const newId = `CUST-00${get().customers.length + 1}`;
    const newCustomer: Customer = {
      ...newCustData,
      id: newId,
      joinedDate: new Date().toISOString().split("T")[0],
      totalPurchases: 0,
      outstandingBalance: 0,
    };
    set((state) => ({
      customers: [newCustomer, ...state.customers],
      activities: [
        {
          id: `ACT-${Date.now()}`,
          type: "invoice",
          title: `New Customer Onboarded`,
          subtitle: `${newCustomer.name} (${newCustomer.company}) joined`,
          timestamp: "Just now",
          rawDate: new Date(),
        },
        ...state.activities,
      ],
    }));
  },

  createInvoice: (invoiceData) => {
    const invCount = get().invoices.length + 91;
    const invId = `INV-2023-0${invCount}`;
    const newInvoice: Invoice = {
      ...invoiceData,
      id: invId,
      date: new Date().toISOString().split("T")[0],
    };

    set((state) => {
      const updatedCustomers = state.customers.map((c) => {
        if (c.name === newInvoice.customerName || c.company === newInvoice.customerName) {
          return {
            ...c,
            totalPurchases: c.totalPurchases + newInvoice.amount,
            outstandingBalance:
              newInvoice.status === "Pending"
                ? c.outstandingBalance + newInvoice.amount
                : c.outstandingBalance,
          };
        }
        return c;
      });

      return {
        invoices: [newInvoice, ...state.invoices],
        customers: updatedCustomers,
        activities: [
          {
            id: `ACT-${Date.now()}`,
            type: "invoice",
            title: `New Invoice Generated`,
            subtitle: `${invId} created for ${newInvoice.customerName} (₹${newInvoice.amount.toLocaleString("en-IN")})`,
            timestamp: "Just now",
            amount: newInvoice.amount,
            rawDate: new Date(),
          },
          ...state.activities,
        ],
      };
    });
  },

  recordPayment: ({ invoiceId, customerName, amount }) => {
    const colId = `COL-${get().collections.length + 102}`;
    const today = new Date().toISOString().split("T")[0];
    const newCollection: Collection = {
      id: colId,
      invoiceId: invoiceId ?? "DIRECT",
      customerName,
      amount,
      date: today,
    };

    set((state) => {
      const updatedInvoices = state.invoices.map((inv) => {
        if (inv.id === invoiceId) {
          return { ...inv, status: "Completed" as const };
        }
        return inv;
      });

      const updatedCustomers = state.customers.map((c) => {
        if (c.name === customerName || c.company === customerName) {
          return {
            ...c,
            outstandingBalance: Math.max(0, c.outstandingBalance - amount),
          };
        }
        return c;
      });

      return {
        collections: [newCollection, ...state.collections],
        invoices: updatedInvoices,
        customers: updatedCustomers,
        activities: [
          {
            id: `ACT-${Date.now()}`,
            type: "payment",
            title: `Payment Received: ₹${amount.toLocaleString("en-IN")}`,
            subtitle: `From ${customerName} ${invoiceId ? `for ${invoiceId}` : ""}`,
            timestamp: "Just now",
            amount,
            rawDate: new Date(),
          },
          ...state.activities,
        ],
      };
    });
  },

  toggleLiveSimulation: () => {
    set((state) => ({ isLiveSimulationActive: !state.isLiveSimulationActive }));
  },

  triggerSimulatedTransaction: () => {
    const sampleCustomers = ["Acme Corp", "TechSolutions", "Delta Systems", "Mehta Traders", "Global Industries"];
    const randomCustomer = sampleCustomers[Math.floor(Math.random() * sampleCustomers.length)];
    const isPayment = Math.random() > 0.4;
    const randomAmount = Math.floor(Math.random() * 80 + 10) * 500;

    if (isPayment) {
      get().recordPayment({
        customerName: randomCustomer,
        amount: randomAmount,
      });
    } else {
      get().createInvoice({
        customerName: randomCustomer,
        salesmanName: "Raj Patel",
        amount: randomAmount,
        status: "Completed",
        dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
      });
    }
  },
}));

export function useRealtimeMetrics() {
  const invoices = useDashboardStore((s) => s.invoices);
  const collections = useDashboardStore((s) => s.collections);
  const customers = useDashboardStore((s) => s.customers);

  const todayStr = new Date().toISOString().split("T")[0];

  // 1. TODAY'S SALES
  const todaySales = invoices
    .filter((inv) => inv.date === todayStr)
    .reduce((sum, inv) => sum + inv.amount, 0);

  // 2. TODAY'S COLLECTIONS
  const todayCollections = collections
    .filter((col) => col.date === todayStr)
    .reduce((sum, col) => sum + col.amount, 0);

  // 3. TOTAL OUTSTANDING
  const totalOutstanding = customers.reduce((sum, cust) => sum + cust.outstandingBalance, 0);

  // 4. PENDING INVOICES
  const pendingInvoicesCount = invoices.filter((inv) => inv.status === "Pending").length;

  // 5. TOTAL CUSTOMERS
  const totalCustomersCount = customers.length;

  // 6. MONTHLY REVENUE (MTD)
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const mtdRevenueRaw = invoices
    .filter((inv) => {
      const d = new Date(inv.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear && inv.status === "Completed";
    })
    .reduce((sum, inv) => sum + inv.amount, 0);

  const mtdRevenueLakhs = (mtdRevenueRaw / 100000).toFixed(2);

  return {
    todaySales,
    todayCollections,
    totalOutstanding,
    pendingInvoicesCount,
    totalCustomersCount,
    mtdRevenueRaw,
    mtdRevenueLakhs,
  };
}
