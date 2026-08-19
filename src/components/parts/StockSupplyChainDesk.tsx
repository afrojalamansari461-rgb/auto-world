import React, { useState } from "react";
import { 
  Package, AlertTriangle, CheckCircle2, Clock, 
  RotateCcw, ArrowUp, ArrowDown, Search, Filter, 
  Sparkles, Save, Sliders, RefreshCw, AlertCircle, Eye
} from "lucide-react";
import { Part, PartStockStatus, STOCK_STATUS_CONFIGS } from "../../types";
import { savePartOverride } from "../../lib/catalogSync";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";

interface StockSupplyChainDeskProps {
  parts: Part[];
  onOpenPartDossier: (part: Part, tab?: "overview" | "specs" | "control") => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
  onRefresh?: () => void;
}

export default function StockSupplyChainDesk({
  parts,
  onOpenPartDossier,
  showToast,
  onRefresh
}: StockSupplyChainDeskProps) {
  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | number | null>(null);

  // Quick Inline Status Update
  const handleUpdateStock = async (part: Part, newCount: number, newStatus?: PartStockStatus, leadTime?: string) => {
    setUpdatingId(part.id);
    const safeCount = Math.max(0, newCount);
    let resolvedStatus: PartStockStatus = newStatus || part.stockStatus || "in_stock";
    if (safeCount === 0 && !newStatus) {
      resolvedStatus = "out_of_stock";
    } else if (safeCount > 0 && resolvedStatus === "out_of_stock") {
      resolvedStatus = "in_stock";
    }

    const payload: Partial<Part> = {
      stockCount: safeCount,
      stockStatus: resolvedStatus,
      leadTimeDays: leadTime !== undefined ? leadTime : part.leadTimeDays
    };

    try {
      if (part.isUserListing && part.listingId) {
        await updateDoc(doc(db, "parts", part.listingId), payload);
      } else {
        await savePartOverride(part.id, payload);
      }
      showToast(`Updated stock for ${part.title}: ${safeCount} units (${STOCK_STATUS_CONFIGS[resolvedStatus].label})`, "success");
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error(e);
      showToast("Failed to update stock in database", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredParts = parts.filter(p => {
    const stock = p.stockCount !== undefined ? p.stockCount : 1;
    const status = p.stockStatus || (stock > 0 ? "in_stock" : "out_of_stock");

    if (statusFilter !== "all" && status !== statusFilter) return false;
    if (onlyLowStock && (stock > 2 || status === "out_of_stock")) return false;
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      return p.title.toLowerCase().includes(q) || 
        p.brand.toLowerCase().includes(q) || 
        (p.partNumber || "").toLowerCase().includes(q);
    }
    return true;
  });

  // Calculate high-level stock statistics
  const totalUnits = parts.reduce((acc, p) => acc + (p.stockCount !== undefined ? p.stockCount : 1), 0);
  const inStockCount = parts.filter(p => (p.stockStatus || "in_stock") === "in_stock" && (p.stockCount ?? 1) > 0).length;
  const backorderCount = parts.filter(p => p.stockStatus === "custom_order").length;
  const outOfStockCount = parts.filter(p => p.stockStatus === "out_of_stock" || (p.stockCount ?? 1) === 0).length;
  const lowStockAlerts = parts.filter(p => (p.stockCount ?? 1) <= 2 && (p.stockCount ?? 1) > 0).length;

  return (
    <div className="space-y-6 font-sans">
      {/* Metric Dashboard Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-lg border border-stone-300 shadow-sm">
          <span className="text-[10px] font-mono font-bold uppercase text-stone-500 block">Total Catalog Units</span>
          <div className="flex items-baseline gap-2 mt-1">
            <strong className="text-xl font-bold font-mono text-stone-950">{totalUnits}</strong>
            <span className="text-[10px] font-mono text-stone-400">across {parts.length} SKUs</span>
          </div>
        </div>

        <div className="bg-emerald-50/70 p-3.5 rounded-lg border border-emerald-300 shadow-sm">
          <span className="text-[10px] font-mono font-bold uppercase text-emerald-800 block">Ready To Dispatch</span>
          <div className="flex items-baseline gap-2 mt-1">
            <strong className="text-xl font-bold font-mono text-emerald-900">{inStockCount}</strong>
            <span className="text-[10px] font-mono text-emerald-700">Immediate</span>
          </div>
        </div>

        <div className="bg-amber-50/70 p-3.5 rounded-lg border border-amber-300 shadow-sm">
          <span className="text-[10px] font-mono font-bold uppercase text-amber-800 block">Custom / Backorder</span>
          <div className="flex items-baseline gap-2 mt-1">
            <strong className="text-xl font-bold font-mono text-amber-900">{backorderCount}</strong>
            <span className="text-[10px] font-mono text-amber-700">Lead Times</span>
          </div>
        </div>

        <div className="bg-red-50/70 p-3.5 rounded-lg border border-red-300 shadow-sm">
          <span className="text-[10px] font-mono font-bold uppercase text-red-800 block">Sold / Out of Stock</span>
          <div className="flex items-baseline gap-2 mt-1">
            <strong className="text-xl font-bold font-mono text-red-900">{outOfStockCount}</strong>
            <span className="text-[10px] font-mono text-red-700">0 Units</span>
          </div>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-purple-50/70 p-3.5 rounded-lg border border-purple-300 shadow-sm">
          <span className="text-[10px] font-mono font-bold uppercase text-purple-800 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-purple-600 animate-pulse" />
            Low Stock Alerts (&le;2)
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <strong className="text-xl font-bold font-mono text-purple-900">{lowStockAlerts}</strong>
            <span className="text-[10px] font-mono text-purple-700">Needs Reorder</span>
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white p-4 rounded-lg border border-stone-300 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search by part name, SKU, brand..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#FAF8F5] border border-stone-300 rounded text-xs focus:border-stone-900 outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-[#FAF8F5] border border-stone-300 rounded text-xs focus:border-stone-900 outline-none shrink-0"
          >
            <option value="all">All Statuses</option>
            <option value="in_stock">In Stock</option>
            <option value="custom_order">Custom Order / Backorder</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setOnlyLowStock(!onlyLowStock)}
            className={`px-3 py-2 rounded text-xs font-mono font-bold uppercase transition flex items-center gap-1.5 cursor-pointer ${
              onlyLowStock
                ? "bg-purple-700 text-white"
                : "bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Low Stock Only ({lowStockAlerts})
          </button>
        </div>
      </div>

      {/* Inventory & Supply Chain Table */}
      <div className="bg-white rounded-lg border border-stone-300 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F5] border-b border-stone-300 font-mono text-[10px] text-stone-600 uppercase">
              <tr>
                <th className="py-3 px-4">Hardware Component</th>
                <th className="py-3 px-4">Operational Status</th>
                <th className="py-3 px-4 text-center">Available Units</th>
                <th className="py-3 px-4">Lead Time / Backorder</th>
                <th className="py-3 px-4 text-right">Supply Adjuster</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {filteredParts.map(part => {
                const stock = part.stockCount !== undefined ? part.stockCount : 1;
                const status = part.stockStatus || (stock > 0 ? "in_stock" : "out_of_stock");
                const statusCfg = STOCK_STATUS_CONFIGS[status] || STOCK_STATUS_CONFIGS.in_stock;
                const isLow = stock <= 2 && stock > 0;
                const isBusy = updatingId === part.id;

                return (
                  <tr key={part.id} className={`hover:bg-[#FCFBF9] transition ${isLow ? "bg-purple-50/20" : ""}`}>
                    {/* Hardware Column */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={part.image || "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800"}
                          alt={part.title}
                          className="w-10 h-10 rounded object-cover border border-stone-300 shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-mono font-bold uppercase text-amber-700 bg-amber-100 px-1 rounded">
                              {part.brand}
                            </span>
                            <span className="text-[10px] font-mono text-stone-400">
                              #{part.partNumber || `PART-AW0${part.id}`}
                            </span>
                          </div>
                          <strong className="text-xs text-stone-900 font-serif block mt-0.5 max-w-xs truncate">
                            {part.title}
                          </strong>
                        </div>
                      </div>
                    </td>

                    {/* Operational Status */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1">
                        <select
                          value={status}
                          disabled={isBusy}
                          onChange={(e) => handleUpdateStock(part, stock, e.target.value as PartStockStatus)}
                          className={`text-xs font-mono font-bold px-2 py-1 rounded border outline-none cursor-pointer ${statusCfg.badgeClass}`}
                        >
                          <option value="in_stock">🟢 In Stock (Ready to Dispatch)</option>
                          <option value="custom_order">🟡 Custom Order / Backorder</option>
                          <option value="out_of_stock">🔴 Sold / Out of Stock</option>
                        </select>
                        {isLow && (
                          <span className="text-[9px] font-mono font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded border border-purple-300 w-fit animate-pulse">
                            ⚠️ Low Stock: Reorder Soon
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Stock Units Counter */}
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1 bg-stone-100 p-1 rounded border border-stone-300">
                        <button
                          disabled={isBusy || stock <= 0}
                          onClick={() => handleUpdateStock(part, stock - 1)}
                          className="w-6 h-6 rounded bg-white hover:bg-stone-200 text-stone-800 font-mono font-bold text-xs disabled:opacity-30 cursor-pointer"
                          title="Decrease Stock (-1)"
                        >
                          -
                        </button>
                        <span className={`w-8 text-center font-mono font-black text-xs ${stock === 0 ? "text-red-600" : stock <= 2 ? "text-purple-700 font-extrabold" : "text-stone-900"}`}>
                          {stock}
                        </span>
                        <button
                          disabled={isBusy}
                          onClick={() => handleUpdateStock(part, stock + 1)}
                          className="w-6 h-6 rounded bg-white hover:bg-stone-200 text-stone-800 font-mono font-bold text-xs cursor-pointer"
                          title="Increase Stock (+1)"
                        >
                          +
                        </button>
                      </div>
                    </td>

                    {/* Lead Time */}
                    <td className="py-3 px-4">
                      {status === "custom_order" ? (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <input
                            type="text"
                            placeholder="e.g. 2–4 Weeks"
                            defaultValue={part.leadTimeDays || "2–4 Weeks"}
                            onBlur={(e) => handleUpdateStock(part, stock, status, e.target.value)}
                            className="px-2 py-1 bg-white border border-amber-300 rounded text-xs font-mono w-28 focus:border-amber-600 outline-none"
                          />
                        </div>
                      ) : (
                        <span className="text-[11px] font-mono text-stone-500">
                          {status === "in_stock" ? "Dispatch in 24–48 Hours" : "Not applicable"}
                        </span>
                      )}
                    </td>

                    {/* Fast Adjuster Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 font-mono">
                        <button
                          disabled={isBusy}
                          onClick={() => handleUpdateStock(part, stock + 5)}
                          className="px-2 py-1 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded text-[10px] font-bold text-stone-700 cursor-pointer"
                          title="Add batch of 5 units"
                        >
                          +5 Batch
                        </button>
                        <button
                          disabled={isBusy}
                          onClick={() => handleUpdateStock(part, 0, "out_of_stock")}
                          className="px-2 py-1 bg-red-50 hover:bg-red-100 border border-red-200 rounded text-[10px] font-bold text-red-700 cursor-pointer"
                          title="Zero out inventory"
                        >
                          Zero
                        </button>
                        <button
                          onClick={() => onOpenPartDossier(part, "control")}
                          className="p-1 bg-stone-900 hover:bg-stone-800 text-amber-400 rounded cursor-pointer"
                          title="Open Control Tab"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredParts.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-stone-500">
                    No components found matching your stock filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
