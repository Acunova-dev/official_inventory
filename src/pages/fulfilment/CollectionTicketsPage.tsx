import React, { useState, useEffect } from "react";
import { 
  Ticket, 
  Search, 
  QrCode, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  MapPin, 
  User, 
  Phone, 
  RefreshCw,
  FileText
} from "lucide-react";
import { CollectionTicket } from "../../types";
import { fulfilmentService } from "../../services/api";
import { QRCodeModal } from "../../components/fulfilment/QRCodeModal";
import { useToast } from "../../components/Layout";

export const CollectionTicketsPage: React.FC = () => {
  const { showToast } = useToast();
  const [tickets, setTickets] = useState<CollectionTicket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTicketForQR, setSelectedTicketForQR] = useState<CollectionTicket | null>(null);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const orders = await fulfilmentService.getOrders();
      // Extract tickets
      const allTickets: CollectionTicket[] = [];
      orders.forEach(o => {
        if (o.ticketNumber) {
          allTickets.push({
            id: `tkt_${o.id}`,
            ticketNumber: o.ticketNumber,
            fulfilmentOrderId: o.id,
            invoiceId: o.invoiceId,
            invoiceNumber: o.invoiceNumber,
            customerId: o.customerId || "",
            customerName: o.customerName,
            customerPhone: o.customerPhone,
            pickupLocation: o.pickupLocation || "Main Collection Desk",
            status: o.status,
            totalAmount: o.totalAmount,
            amountPaid: o.amountPaid,
            outstandingBalance: o.outstandingBalance,
            paymentStatus: (o.paymentStatus === "Paid" ? "Paid" : (o.amountPaid > 0 ? "Partially Paid" : "Unpaid")) as any,
            items: o.items.map(it => ({
              productName: it.productName,
              quantity: it.orderedQty,
              unitPrice: it.unitPrice
            })),
            token: o.ticketToken || `tk_${o.id}`,
            createdAt: o.createdAt,
            expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
          });
        }
      });
      setTickets(allTickets);
    } catch (err: any) {
      console.error("Error loading tickets:", err);
      showToast("Failed to load collection tickets", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const filteredTickets = tickets.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.ticketNumber.toLowerCase().includes(q) ||
      t.customerName.toLowerCase().includes(q) ||
      t.invoiceNumber.toLowerCase().includes(q) ||
      t.token.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Ticket className="text-indigo-600" size={26} />
            Collection Tickets & QR Passes
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Digital and printable customer collection passes generated upon order preparation.
          </p>
        </div>

        <button
          onClick={loadTickets}
          disabled={loading}
          className="p-2 bg-white hover:bg-slate-50 text-slate-600 rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer self-start sm:self-auto"
          title="Refresh Tickets"
        >
          <RefreshCw size={15} className={loading ? "animate-spin text-indigo-600" : ""} />
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by Ticket #, Customer Name, Invoice #, or Token..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Tickets Grid */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 text-xs font-medium flex flex-col items-center gap-2">
          <RefreshCw className="animate-spin text-indigo-600" size={24} />
          Loading collection tickets...
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 text-xs space-y-2">
          <Ticket size={36} className="mx-auto text-slate-300" />
          <p className="font-bold text-slate-700">No Collection Tickets Found</p>
          <p className="text-[11px]">Prepare customer orders in "Orders & Packaging" to generate collection passes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTickets.map(t => {
            const isPaid = t.outstandingBalance <= 0.01;
            const isCollected = t.status === "Collected";

            return (
              <div 
                key={t.id} 
                className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
              >
                <div>
                  {/* Top line */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider block">
                        Collection Pass
                      </span>
                      <h3 className="text-lg font-extrabold text-slate-900 leading-tight">
                        #{t.ticketNumber}
                      </h3>
                      <p className="text-[11px] text-slate-400 font-mono">Invoice #{t.invoiceNumber}</p>
                    </div>

                    <button
                      onClick={() => setSelectedTicketForQR(t)}
                      className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-2xl border border-indigo-200 transition-colors cursor-pointer"
                      title="Open QR Pass"
                    >
                      <QrCode size={18} />
                    </button>
                  </div>

                  {/* Customer details */}
                  <div className="mt-3 p-2.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                      <User size={12} className="text-slate-400" />
                      <span className="truncate">{t.customerName}</span>
                    </div>
                    {t.customerPhone && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <Phone size={11} className="text-slate-400" />
                        <span>{t.customerPhone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <MapPin size={11} className="text-blue-600" />
                      <span>{t.pickupLocation}</span>
                    </div>
                  </div>

                  {/* Payment & Items summary */}
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">
                      {t.items.length} items
                    </span>
                    <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                      isPaid 
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}>
                      {isPaid ? "Paid in Full" : `$${t.outstandingBalance.toFixed(2)} Due`}
                    </span>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className={`text-[10px] font-extrabold uppercase ${
                    isCollected ? "text-emerald-600" : "text-blue-600"
                  }`}>
                    {t.status}
                  </span>

                  <button
                    onClick={() => setSelectedTicketForQR(t)}
                    className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                  >
                    View Pass & QR
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* QR Modal */}
      {selectedTicketForQR && (
        <QRCodeModal
          isOpen={true}
          ticket={selectedTicketForQR}
          onClose={() => setSelectedTicketForQR(null)}
        />
      )}

    </div>
  );
};
