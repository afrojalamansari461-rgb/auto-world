import React, { useState, useEffect } from "react";
import { X, Bell, Trash2, Search, CheckCircle2, BookmarkPlus, ArrowRight } from "lucide-react";
import { db } from "../firebase";
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp } from "firebase/firestore";

interface SavedSearchItem {
  id?: string;
  name: string;
  filters: {
    type: string;
    priceRange: string;
    location: string;
    make?: string;
  };
  createdAt: string;
}

interface SavedSearchesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplySearch: (filters: { type: string; priceRange: string; location: string; make?: string }) => void;
  currentFilters?: { type: string; priceRange: string; location: string; make?: string };
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
}

export const SavedSearchesModal: React.FC<SavedSearchesModalProps> = ({
  isOpen,
  onClose,
  onApplySearch,
  currentFilters = { type: "", priceRange: "", location: "", make: "" },
  showToast,
}) => {
  if (!isOpen) return null;

  const [savedSearches, setSavedSearches] = useState<SavedSearchItem[]>([]);
  const [customName, setCustomName] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Default title based on active filters
  const defaultTitle = [
    currentFilters.location || "All Cities",
    currentFilters.type || "All Types",
    currentFilters.priceRange || "Any Budget",
  ]
    .filter(Boolean)
    .join(" • ");

  useEffect(() => {
    loadSavedSearches();
  }, []);

  const loadSavedSearches = async () => {
    setIsLoading(true);
    try {
      if (db) {
        const snap = await getDocs(collection(db, "saved_searches"));
        const items: SavedSearchItem[] = [];
        snap.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        if (items.length > 0) {
          setSavedSearches(items);
          setIsLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn("Firestore saved_searches error, using localStorage fallback:", e);
    }

    // Fallback to localStorage
    const localData = JSON.parse(localStorage.getItem("autoWorld_saved_searches") || "[]");
    setSavedSearches(localData);
    setIsLoading(false);
  };

  const handleSaveCurrentFilter = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameToSave = customName.trim() || defaultTitle || "My Custom Car Search";

    const newItem: SavedSearchItem = {
      name: nameToSave,
      filters: {
        type: currentFilters.type || "",
        priceRange: currentFilters.priceRange || "",
        location: currentFilters.location || "",
        make: currentFilters.make || "",
      },
      createdAt: new Date().toISOString(),
    };

    try {
      if (db) {
        const docRef = await addDoc(collection(db, "saved_searches"), {
          ...newItem,
          serverTimestamp: serverTimestamp(),
        });
        newItem.id = docRef.id;
      }
    } catch (e) {
      console.error(e);
      newItem.id = `local-${Date.now()}`;
    }

    const updated = [newItem, ...savedSearches];
    setSavedSearches(updated);
    localStorage.setItem("autoWorld_saved_searches", JSON.stringify(updated));

    setCustomName("");
    showToast?.(`Search alert "${nameToSave}" saved successfully!`, "success");
  };

  const handleDeleteSearch = async (id?: string, index?: number) => {
    if (!id) return;
    try {
      if (db && !id.startsWith("local-")) {
        await deleteDoc(doc(db, "saved_searches", id));
      }
    } catch (e) {
      console.error(e);
    }

    const updated = savedSearches.filter((item, idx) => item.id !== id && idx !== index);
    setSavedSearches(updated);
    localStorage.setItem("autoWorld_saved_searches", JSON.stringify(updated));
    showToast?.("Search alert deleted.", "info");
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#FAF8F5] border border-stone-300 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-stone-950 text-white flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
              <Bell className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-base font-serif font-bold text-white">
                Saved Search Alerts
              </h3>
              <p className="text-xs text-stone-300">
                Receive instant notifications when matching cars are listed
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Save Active Criteria Box */}
          <form
            onSubmit={handleSaveCurrentFilter}
            className="p-4 bg-white border border-stone-250 rounded-xl shadow-xs space-y-3"
          >
            <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 uppercase tracking-wider">
              <BookmarkPlus className="w-4 h-4 text-amber-700" />
              <span>Save Active Filter Parameters</span>
            </div>

            <div className="p-2.5 bg-stone-100 rounded-lg text-xs space-y-1 text-stone-700">
              <div>
                <span className="font-semibold text-stone-900">City/Location:</span>{" "}
                {currentFilters.location || "All Cities"}
              </div>
              <div>
                <span className="font-semibold text-stone-900">Category/Type:</span>{" "}
                {currentFilters.type || "All Types"}
              </div>
              <div>
                <span className="font-semibold text-stone-900">Budget Range:</span>{" "}
                {currentFilters.priceRange || "Any Budget"}
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder={defaultTitle || "Alert Title (e.g. Mumbai SUV)"}
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:ring-1 focus:ring-stone-900"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs uppercase tracking-wider rounded-lg transition cursor-pointer shrink-0"
              >
                Save
              </button>
            </div>
          </form>

          {/* List of Saved Search Alerts */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-3">
              Your Active Search Alerts ({savedSearches.length})
            </h4>

            {isLoading ? (
              <p className="text-xs text-stone-500 py-4 text-center">Loading search alerts...</p>
            ) : savedSearches.length === 0 ? (
              <div className="p-6 bg-white border border-stone-200 rounded-xl text-center text-xs text-stone-500">
                No saved search alerts yet. Filter vehicles by city or budget and click "Save" above!
              </div>
            ) : (
              <div className="space-y-2.5">
                {savedSearches.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-3 bg-white border border-stone-250 rounded-xl shadow-2xs flex items-center justify-between gap-3 hover:border-stone-400 transition"
                  >
                    <div className="min-w-0">
                      <h5 className="text-xs font-bold text-stone-950 truncate">
                        {item.name}
                      </h5>
                      <p className="text-[11px] text-stone-500 truncate mt-0.5">
                        {[
                          item.filters.location && `City: ${item.filters.location}`,
                          item.filters.type && `Type: ${item.filters.type}`,
                          item.filters.priceRange && `Budget: ${item.filters.priceRange}`,
                        ]
                          .filter(Boolean)
                          .join(" • ") || "All Vehicles"}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          onApplySearch(item.filters);
                          onClose();
                          showToast?.(`Applied saved alert filters: ${item.name}`, "success");
                        }}
                        className="px-3 py-1.5 bg-stone-950 hover:bg-stone-800 text-white text-[11px] font-bold uppercase rounded-md transition cursor-pointer flex items-center gap-1"
                      >
                        <span>Apply</span>
                        <ArrowRight className="w-3 h-3 text-amber-400" />
                      </button>

                      <button
                        onClick={() => handleDeleteSearch(item.id, idx)}
                        className="p-1.5 bg-stone-100 hover:bg-red-100 text-stone-400 hover:text-red-600 rounded-md transition cursor-pointer"
                        title="Delete saved search"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
