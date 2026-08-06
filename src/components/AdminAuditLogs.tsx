import React, { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, limit, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import { History, RefreshCw, Search, Filter, Clock, User, FileText, ChevronDown, Shield, ShieldAlert, ShieldCheck, Lock, UserCheck, Crown, Tag, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { OWNER_EMAIL, UserRole } from "../lib/userRoles";

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
  currentUserRole?: UserRole;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export default function AdminAuditLogs({ currentUserEmail, currentUserRole, showToast }: AdminAuditLogsProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedActionFilter, setSelectedActionFilter] = useState("ALL");
  const [actionTypes, setActionTypes] = useState<string[]>([]);

  const userEmailLower = currentUserEmail.toLowerCase();
  const isOwner = userEmailLower === OWNER_EMAIL.toLowerCase() || currentUserRole === "Owner";
  const isHighAdmin = isOwner || currentUserRole === "Co-Owner" || currentUserRole === "Super Admin";

  // Main fetch function
  const fetchLogs = async (isManualRefresh = false) => {
    setLoading(true);
    try {
      const logsRef = collection(db, "audit_logs");
      // Query recent 120 entries ordered by timestamp descending
      const q = query(logsRef, orderBy("timestamp", "desc"), limit(120));
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

  // Filter logs based on search, selected action category, and ROLE-BASED PRIVACY
  const filteredLogs = logs.filter((log) => {
    const logEmailLower = log.adminEmail.toLowerCase();
    const isLogFromOwner = logEmailLower === OWNER_EMAIL.toLowerCase() || logEmailLower.includes("owner");

    // 1. Role-based Log Scope Rules:
    // - System Owner sees EVERYONE'S logs.
    // - All non-owner roles (Co-Owner, Super Admin, staff) can ONLY see THEIR OWN activity logs.
    // - No one can see the System Owner's activity logs except the System Owner.
    if (!isOwner) {
      if (logEmailLower !== userEmailLower) return false;
    }

    // 2. Search & Action Category filter:
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
      {/* Header Panel with Role Clearance Info */}
      <div className="bg-[#FAF8F5] border border-stone-300 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <History className="w-5 h-5 text-amber-600 shrink-0" />
            <h2 className="text-xs uppercase font-extrabold text-stone-900 tracking-wider font-mono">
              Activity Audit Ledger & Timeline
            </h2>
            {isOwner ? (
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-mono font-bold uppercase tracking-widest rounded border border-emerald-300 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" /> System Owner Clearance (Viewing All Activities)
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[9px] font-mono font-bold uppercase tracking-widest rounded border border-blue-300 flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-blue-600" /> Personal Activity Ledger (Restricted to Your Activity)
              </span>
            )}
          </div>
          <p className="text-[11px] text-stone-500 font-mono mt-1">
            {isOwner 
              ? "Full system audit ledger displaying all operational logs, staff activities, and administrative actions across all accounts."
              : "Personal activity log displaying actions recorded for your account. System Owner and other account activities are private and protected."}
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
            <option value="ALL">All Actions ({filteredLogs.length})</option>
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

      {/* Main Timeline View */}
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
                <th className="py-3 px-4 font-extrabold w-1/5">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Timestamp (IST)
                  </span>
                </th>
                <th className="py-3 px-4 font-extrabold w-1/5">
                  <span className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" /> Severity & Tag
                  </span>
                </th>
                <th className="py-3 px-4 font-extrabold w-1/5">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Action Category
                  </span>
                </th>
                <th className="py-3 px-4 font-extrabold w-2/5">Description & Executed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              <AnimatePresence mode="popLayout">
                {filteredLogs.map((log, index) => {
                  const logEmailLower = log.adminEmail.toLowerCase();
                  const isLogFromOwner = logEmailLower === OWNER_EMAIL.toLowerCase() || logEmailLower.includes("owner");
                  
                  // Calculate Severity and Action Tag
                  const text = (log.action + " " + log.description).toUpperCase();
                  let severity = "ROUTINE";
                  let actionTag = "AUDIT LOGGED";
                  let severityPill = "bg-emerald-100 text-emerald-900 border-emerald-300";
                  let badgeStyle = "bg-stone-100 text-stone-800 border-stone-300";

                  if (text.includes("REVOKE") || text.includes("DELETE") || text.includes("PURGE") || text.includes("REMOVE ROLE") || text.includes("UNASSIGN") || text.includes("RESET")) {
                    severity = "CRITICAL";
                    actionTag = "REVOCATION / DELETE";
                    severityPill = "bg-red-600 text-white border-red-700 font-extrabold";
                    badgeStyle = "bg-red-50 text-red-900 border-red-300 font-bold";
                  } else if (text.includes("ROLE") || text.includes("ASSIGN") || text.includes("PROMOTE") || text.includes("PERMISSION")) {
                    severity = "HIGH";
                    actionTag = "ROLE ASSIGNMENT";
                    severityPill = "bg-purple-600 text-white border-purple-800 font-extrabold";
                    badgeStyle = "bg-purple-50 text-purple-900 border-purple-300 font-bold";
                  } else if (text.includes("INTAKE") || text.includes("CREATE") || text.includes("PUBLISH") || text.includes("ADD") || text.includes("NEW")) {
                    severity = "INFO";
                    actionTag = "STOCK INTAKE";
                    severityPill = "bg-sky-600 text-white border-sky-800 font-extrabold";
                    badgeStyle = "bg-sky-50 text-sky-900 border-sky-300 font-bold";
                  } else if (text.includes("UPDATE") || text.includes("EDIT") || text.includes("FEATURE") || text.includes("TOGGLE") || text.includes("MODIFY")) {
                    severity = "MEDIUM";
                    actionTag = "SYSTEM UPDATE";
                    severityPill = "bg-amber-500 text-stone-950 border-amber-600 font-extrabold";
                    badgeStyle = "bg-amber-50 text-amber-900 border-amber-300 font-bold";
                  }

                  return (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0, y: 10, scale: 0.99 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.22, delay: Math.min(index * 0.025, 0.3) }}
                      className="hover:bg-stone-50/80 transition duration-150 align-top group"
                    >
                      {/* Timestamp */}
                      <td className="py-3.5 px-4 text-stone-500 whitespace-nowrap font-medium border-r border-stone-200 group-hover:text-stone-900">
                        {formatDateTime(log.timestamp)}
                      </td>

                      {/* Severity & Action Tag */}
                      <td className="py-3.5 px-4 border-r border-stone-200">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`text-[8.5px] uppercase tracking-widest px-2 py-0.5 rounded border ${severityPill}`}>
                            {severity}
                          </span>
                          <span className="text-[9px] font-bold text-stone-600 uppercase font-mono tracking-tight">
                            [{actionTag}]
                          </span>
                        </div>
                      </td>

                      {/* Action Category */}
                      <td className="py-3.5 px-4 font-semibold border-r border-stone-200">
                        <span className={`inline-block text-[9.5px] uppercase tracking-wider font-extrabold px-2 py-0.5 border rounded ${badgeStyle}`}>
                          {log.action}
                        </span>
                        <div className="text-[9.5px] text-stone-500 mt-1.5 flex items-center gap-1 font-mono">
                          {isLogFromOwner ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-900 border border-amber-300 rounded text-[8.5px] font-extrabold">
                              <Crown className="w-3 h-3 text-amber-500 fill-amber-400/40 shrink-0" />
                              System Owner
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-stone-500">
                              <User className="w-3 h-3 text-stone-400 shrink-0" />
                              {log.adminEmail.split("@")[0]}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Description */}
                      <td className="py-3.5 px-4 text-stone-700 leading-relaxed font-sans text-xs">
                        {log.description}
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

