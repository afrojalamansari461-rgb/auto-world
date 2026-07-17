import React, { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, limit, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import { History, RefreshCw, Search, Filter, Clock, User, FileText, ChevronDown } from "lucide-react";

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  adminEmail: string;
  action: string;
  description: string;
}

// Global action helper to record events in real-time
export async function recordAuditLog(adminEmail: string, action: string, description: string) {
  try {
    await addDoc(collection(db, "audit_logs"), {
      timestamp: new Date().toISOString(),
      adminEmail: adminEmail || "system_admin@autoworld.com",
      action,
      description,
    });
  } catch (err) {
    console.error("[AuditLogger] Error recording admin action:", err);
  }
}

interface AdminAuditLogsProps {
  currentUserEmail: string;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export default function AdminAuditLogs({ currentUserEmail, showToast }: AdminAuditLogsProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedActionFilter, setSelectedActionFilter] = useState("ALL");
  const [actionTypes, setActionTypes] = useState<string[]>([]);

  // Main fetch function
  const fetchLogs = async (isManualRefresh = false) => {
    setLoading(true);
    try {
      const logsRef = collection(db, "audit_logs");
      // Query recent 100 entries ordered by timestamp descending
      const q = query(logsRef, orderBy("timestamp", "desc"), limit(100));
      const querySnapshot = await getDocs(q);
      
      const fetchedLogs: AuditLogEntry[] = [];
      const actionsSet = new Set<string>();

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedLogs.push({
          id: doc.id,
          timestamp: data.timestamp || new Date().toISOString(),
          adminEmail: data.adminEmail || "unknown@autoworld.com",
          action: data.action || "System Event",
          description: data.description || "No description provided.",
        });
        if (data.action) {
          actionsSet.add(data.action);
        }
      });

      setLogs(fetchedLogs);
      setActionTypes(Array.from(actionsSet).sort());

      if (isManualRefresh) {
        showToast("Audit logs synchronized successfully.", "success");
      }
    } catch (err) {
      console.error("Error fetching audit logs: ", err);
      showToast("Failed to fetch latest audit entries.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchLogs();
  }, []);

  // Filter logs based on search and selected action category
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.adminEmail.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesAction =
      selectedActionFilter === "ALL" || log.action === selectedActionFilter;

    return matchesSearch && matchesAction;
  });

  // Simple formatter for datetime
  const formatDateTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return "Unknown Date";
      return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }) + " " + date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
    } catch {
      return "Unknown Date";
    }
  };

  return (
    <div className="space-y-6" id="admin-audit-logs-tab">
      {/* Header Panel */}
      <div className="bg-[#FAF8F5] border border-stone-300 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-amber-600 shrink-0" />
            <h2 className="text-xs uppercase font-extrabold text-stone-900 tracking-wider font-mono">
              Admin Activity Audit Ledger
            </h2>
          </div>
          <p className="text-[11px] text-stone-500 font-mono mt-1">
            Tamper-proof real-time logging of critical system operations and stock updates.
          </p>
        </div>
        
        <button
          onClick={() => fetchLogs(true)}
          disabled={loading}
          className="px-4 py-2 bg-stone-900 hover:bg-stone-850 text-[#FAF8F5] text-[10px] font-black uppercase tracking-widest font-mono flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 border-2 border-stone-900"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Syncing..." : "Refresh Logs"}
        </button>
      </div>

      {/* Filter and Query Deck */}
      <div className="bg-[#FAF8F5] border border-stone-300 p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search logs by action or details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-stone-300 focus:border-stone-900 focus:outline-none text-xs font-mono placeholder:text-stone-400 text-stone-800"
          />
        </div>

        {/* Action Category Filter */}
        <div className="relative">
          <Filter className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <select
            value={selectedActionFilter}
            onChange={(e) => setSelectedActionFilter(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-stone-300 focus:border-stone-900 focus:outline-none text-xs font-mono text-stone-800 appearance-none cursor-pointer"
          >
            <option value="ALL">All Actions ({logs.length})</option>
            {actionTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Info Counter */}
        <div className="flex items-center justify-end px-2 text-[10px] font-bold font-mono text-stone-500 uppercase tracking-wider">
          Displaying {filteredLogs.length} matching entries
        </div>
      </div>

      {/* Main Table View */}
      {loading && logs.length === 0 ? (
        <div className="bg-[#FAF8F5] border border-stone-300 py-20 text-center">
          <RefreshCw className="w-10 h-10 text-stone-400 mx-auto mb-3 animate-spin" />
          <p className="text-xs font-mono uppercase text-stone-500">Querying live audit records...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-[#FAF8F5] border border-stone-300 py-16 text-center">
          <FileText className="w-10 h-10 text-stone-300 mx-auto mb-2" />
          <h3 className="text-xs uppercase font-black tracking-widest text-stone-600">
            No Audit Records Found
          </h3>
          <p className="text-stone-400 text-[10px] mt-1 uppercase font-mono">
            Adjust your filters or query text to locate archives.
          </p>
        </div>
      ) : (
        <div className="border border-stone-300 overflow-x-auto bg-white">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="bg-stone-900 text-white uppercase text-[10px] tracking-wider border-b border-stone-800">
                <th className="py-3 px-4 font-extrabold w-1/4">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Timestamp (IST)
                  </span>
                </th>
                <th className="py-3 px-4 font-extrabold w-1/4">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Action Category
                  </span>
                </th>
                <th className="py-3 px-4 font-extrabold w-2/4">Description & Affected Item</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {filteredLogs.map((log) => {
                // Color scheme according to the category of action
                let badgeStyle = "bg-stone-100 text-stone-800 border-stone-200";
                const act = log.action.toUpperCase();
                
                if (act.includes("CREATE") || act.includes("PUBLISH") || act.includes("ADD") || act.includes("INTAKE")) {
                  badgeStyle = "bg-emerald-50 text-emerald-800 border-emerald-200";
                } else if (act.includes("DELETE") || act.includes("PURGE") || act.includes("REMOVE")) {
                  badgeStyle = "bg-red-50 text-red-800 border-red-200";
                } else if (act.includes("TOGGLE") || act.includes("UPDATE") || act.includes("EDIT")) {
                  badgeStyle = "bg-purple-50 text-purple-800 border-purple-200";
                } else if (act.includes("RESOLVE") || act.includes("APPROVE")) {
                  badgeStyle = "bg-sky-50 text-sky-800 border-sky-200";
                }

                return (
                  <tr
                    key={log.id}
                    className="hover:bg-stone-50/50 transition duration-150 align-top"
                  >
                    {/* Timestamp */}
                    <td className="py-3.5 px-4 text-stone-500 whitespace-nowrap font-medium border-r border-stone-200">
                      {formatDateTime(log.timestamp)}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 font-semibold border-r border-stone-200">
                      <span className={`inline-block text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 border ${badgeStyle}`}>
                        {log.action}
                      </span>
                      <div className="text-[9px] text-stone-400 mt-1 flex items-center gap-1">
                        <User className="w-2.5 h-2.5" />
                        {log.adminEmail.split("@")[0]}
                      </div>
                    </td>

                    {/* Description */}
                    <td className="py-3.5 px-4 text-stone-700 leading-relaxed">
                      {log.description}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
