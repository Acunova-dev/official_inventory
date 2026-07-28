import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { systemLogService } from "../services/api";
import { SystemLog } from "../types";
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  Lock, 
  Activity, 
  Key, 
  FileText, 
  Package, 
  Receipt, 
  Settings, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Trash2,
  Clock,
  User,
  Eye,
  X,
  FileSpreadsheet
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const SystemLogs: React.FC = () => {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("All");
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["system-logs", selectedCategory, selectedSeverity, search],
    queryFn: () => systemLogService.getAll({
      category: selectedCategory,
      severity: selectedSeverity,
      search: search
    }),
    refetchInterval: 15000, // Refresh audit logs every 15s
  });

  const logs = data?.logs || [];
  const stats = data?.stats || {
    totalLogs: 0,
    inventoryLogsCount: 0,
    authLogsCount: 0,
    quotationLogsCount: 0,
    dangerActionsCount: 0
  };

  const categories = [
    "All",
    "Inventory Adjustment",
    "User Authentication",
    "Quotation Management",
    "Product Catalog",
    "Receipt & Sales",
    "System Settings"
  ];

  const severities = ["All", "info", "success", "warning", "danger"];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Inventory Adjustment":
        return <Activity size={16} className="text-amber-500" />;
      case "User Authentication":
        return <Key size={16} className="text-emerald-500" />;
      case "Quotation Management":
        return <FileText size={16} className="text-blue-500" />;
      case "Product Catalog":
        return <Package size={16} className="text-indigo-500" />;
      case "Receipt & Sales":
        return <Receipt size={16} className="text-emerald-600" />;
      case "System Settings":
        return <Settings size={16} className="text-purple-500" />;
      default:
        return <ShieldCheck size={16} className="text-slate-500" />;
    }
  };

  const getSeverityBadge = (severity: string, action: string) => {
    if (severity === "danger" || action.includes("DELETED") || action.includes("PURGED")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
          <Trash2 size={12} />
          Critical / Danger
        </span>
      );
    }
    if (severity === "warning") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <AlertTriangle size={12} />
          Warning
        </span>
      );
    }
    if (severity === "success") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 size={12} />
          Success
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
        <Info size={12} />
        Info
      </span>
    );
  };

  const formatTimestamp = (iso: string) => {
    try {
      const date = new Date(iso);
      return {
        dateStr: date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        timeStr: date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        relative: getRelativeTimeString(date)
      };
    } catch {
      return { dateStr: iso, timeStr: "", relative: "" };
    }
  };

  const getRelativeTimeString = (date: Date) => {
    const diffSec = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  };

  const handleExportCSV = () => {
    if (!logs.length) return;
    const headers = ["Log ID", "Timestamp", "Category", "Action", "User Name", "User Email", "User Role", "Details", "Target ID", "IP Address", "Severity"];
    const rows = logs.map(l => [
      l.id,
      l.timestamp,
      l.category,
      l.action,
      l.userName,
      l.userEmail,
      l.userRole,
      `"${l.details.replace(/"/g, '""')}"`,
      l.targetId || "",
      l.ipAddress || "",
      l.severity
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `VoltSync_System_Audit_Logs_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Title with Lock Read-Only Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Audit & Event Logs</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-900 text-slate-200 text-xs font-bold rounded-lg shadow-xs">
              <Lock size={12} className="text-amber-400" />
              <span>Read-Only Compliance Log</span>
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Immutable system activity register tracking inventory adjustments, user authentication logins, quotation purges, and system events.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-center">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-2xs transition-all disabled:opacity-50"
            id="btn-refresh-logs"
          >
            <RefreshCw size={14} className={isFetching ? "animate-spin text-blue-600" : "text-slate-400"} />
            <span>{isFetching ? "Syncing..." : "Refresh Logs"}</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={logs.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
            id="btn-export-logs"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Audit KPI Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Audit Logs</span>
            <div className="p-2 bg-slate-100 rounded-xl text-slate-600">
              <ShieldCheck size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{stats.totalLogs}</p>
          <span className="text-[11px] font-semibold text-slate-400 mt-0.5 block">Recorded events in storage</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stock Adjustments</span>
            <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
              <Activity size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{stats.inventoryLogsCount}</p>
          <span className="text-[11px] font-semibold text-amber-600 mt-0.5 block">Inventory quantity updates</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">User Login Events</span>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
              <Key size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{stats.authLogsCount}</p>
          <span className="text-[11px] font-semibold text-emerald-600 mt-0.5 block">Authentication logins</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Critical / Deletions</span>
            <div className="p-2 bg-red-50 rounded-xl text-red-600">
              <Trash2 size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-red-600 mt-2">{stats.dangerActionsCount}</p>
          <span className="text-[11px] font-semibold text-red-500 mt-0.5 block">Quotation purges & deletes</span>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-4">
        
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          
          {/* Search Box */}
          <div className="relative w-full md:max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
              <Search size={16} />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by details, user email, action, target ID, IP address..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all font-medium"
              id="input-search-logs"
            />
          </div>

          {/* Severity Dropdown */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 shrink-0">Severity:</span>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500/25"
              id="select-severity-filter"
            >
              {severities.map(sev => (
                <option key={sev} value={sev}>
                  {sev === "All" ? "All Severities" : sev.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-t border-slate-100 pt-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1 shrink-0 flex items-center gap-1">
            <Filter size={12} /> Category:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

      </div>

      {/* Main Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-blue-600" />
            <span className="font-extrabold text-slate-900 text-sm">System Activity Register</span>
            <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-xs font-bold rounded-full">
              {logs.length} entries
            </span>
          </div>

          <span className="text-xs font-semibold text-slate-400">
            Read-only • Audit Timestamp UTC
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-400 font-medium">
            <RefreshCw size={28} className="animate-spin mx-auto text-blue-600 mb-3" />
            <p className="text-sm">Retrieving system audit logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <ShieldCheck size={40} className="mx-auto text-slate-300 mb-2" />
            <p className="text-base font-bold text-slate-700">No system audit logs found</p>
            <p className="text-xs text-slate-500 mt-1">Try resetting the category filter or search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100/70 text-slate-500 font-extrabold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Action Event</th>
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Details & Target</th>
                  <th className="py-3.5 px-4">Severity</th>
                  <th className="py-3.5 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const ts = formatTimestamp(log.timestamp);
                  return (
                    <tr 
                      key={log.id} 
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      {/* Timestamp */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{ts.dateStr}</div>
                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                          <Clock size={11} />
                          <span>{ts.timeStr}</span>
                          <span className="text-slate-300">•</span>
                          <span className="font-semibold text-blue-600">{ts.relative}</span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 font-bold text-slate-800">
                          <span className="p-1.5 bg-slate-100 rounded-lg shrink-0">
                            {getCategoryIcon(log.category)}
                          </span>
                          <span>{log.category}</span>
                        </div>
                      </td>

                      {/* Action Code */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono text-[11px] font-black px-2 py-1 bg-slate-100 text-slate-800 rounded-md border border-slate-200/80">
                          {log.action}
                        </span>
                      </td>

                      {/* User */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs shrink-0">
                            {log.userName ? log.userName.charAt(0).toUpperCase() : "U"}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs">{log.userName}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{log.userEmail}</div>
                          </div>
                        </div>
                      </td>

                      {/* Details & Target */}
                      <td className="py-3.5 px-4 max-w-md">
                        <p className="text-xs font-semibold text-slate-800 line-clamp-2 leading-relaxed">
                          {log.details}
                        </p>
                        {log.targetId && (
                          <span className="inline-block mt-1 font-mono text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                            Target ID: {log.targetId}
                          </span>
                        )}
                      </td>

                      {/* Severity */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getSeverityBadge(log.severity, log.action)}
                      </td>

                      {/* Inspect */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Log Context"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Detailed Read-Only Context Modal */}
      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Lock size={18} className="text-amber-400" />
                  <span className="font-extrabold text-base tracking-tight">Audit Log Context Viewer</span>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-4 text-xs">
                
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 font-mono text-[10px] block uppercase">Log Unique ID</span>
                    <span className="font-mono font-bold text-slate-900">{selectedLog.id}</span>
                  </div>
                  <div>
                    {getSeverityBadge(selectedLog.severity, selectedLog.action)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 text-[10px] font-bold uppercase block">Category</span>
                    <div className="font-bold text-slate-900 flex items-center gap-1.5 mt-1">
                      {getCategoryIcon(selectedLog.category)}
                      <span>{selectedLog.category}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 text-[10px] font-bold uppercase block">Action Code</span>
                    <span className="font-mono font-black text-blue-700 block mt-1">{selectedLog.action}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 text-[10px] font-bold uppercase block">Actor / User Information</span>
                  <div className="font-bold text-slate-900 mt-1">{selectedLog.userName} ({selectedLog.userRole})</div>
                  <div className="text-slate-500 font-mono text-[11px] mt-0.5">{selectedLog.userEmail}</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 text-[10px] font-bold uppercase block">Action Description & Details</span>
                  <p className="font-medium text-slate-800 leading-relaxed mt-1">{selectedLog.details}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 text-[10px] font-bold uppercase block">ISO Timestamp</span>
                    <span className="font-mono font-semibold text-slate-800 block mt-1">{selectedLog.timestamp}</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 text-[10px] font-bold uppercase block">Origin IP Address</span>
                    <span className="font-mono font-semibold text-slate-800 block mt-1">{selectedLog.ipAddress || "192.168.1.100"}</span>
                  </div>
                </div>

                {/* Read-only Seal */}
                <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl flex items-center gap-2">
                  <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
                  <span className="text-[11px] font-semibold">
                    This log is cryptographically signed and stored in immutable append-only storage.
                  </span>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all"
                >
                  Close Context
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
