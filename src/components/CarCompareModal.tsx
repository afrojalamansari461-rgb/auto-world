import React from "react";
import { X, Check, ArrowRight, ShieldCheck, Trash2, Scale, ExternalLink } from "lucide-react";
import { Vehicle } from "../types";

interface CarCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: Vehicle[];
  onRemoveVehicle: (id: number) => void;
  onSelectVehicleForView: (vehicle: Vehicle) => void;
  onBookTestDrive: (vehicle: Vehicle) => void;
}

export const CarCompareModal: React.FC<CarCompareModalProps> = ({
  isOpen,
  onClose,
  vehicles,
  onRemoveVehicle,
  onSelectVehicleForView,
  onBookTestDrive,
}) => {
  if (!isOpen || vehicles.length === 0) return null;

  const formatINR = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Find lowest price vehicle for highlight
  const minPrice = Math.min(...vehicles.map((v) => v.price));
  const maxYear = Math.max(...vehicles.map((v) => v.year));

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#FAF8F5] border border-stone-300 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-stone-950 text-white flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-serif font-bold text-white">
                Side-by-Side Vehicle Comparison
              </h3>
              <p className="text-xs text-stone-300">
                Comparing {vehicles.length} of 3 selected vehicles
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

        {/* Content Comparison Table */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {vehicles.map((vehicle) => {
              const isBestPrice = vehicle.price === minPrice && vehicles.length > 1;
              const isNewest = vehicle.year === maxYear && vehicles.length > 1;

              return (
                <div
                  key={vehicle.id}
                  className="bg-white border border-stone-300 rounded-xl p-4 shadow-xs flex flex-col justify-between space-y-4 relative"
                >
                  {/* Remove button */}
                  <button
                    onClick={() => onRemoveVehicle(vehicle.id)}
                    title="Remove vehicle from comparison"
                    className="absolute top-3 right-3 w-7 h-7 bg-stone-100 hover:bg-red-100 text-stone-500 hover:text-red-600 rounded-full flex items-center justify-center transition cursor-pointer border border-stone-200"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <div>
                    {/* Image & Badges */}
                    <div className="relative mb-3">
                      <img
                        src={vehicle.image || vehicle.photos?.[0]?.src}
                        alt={vehicle.title}
                        className="w-full h-36 object-cover rounded-lg border border-stone-200"
                      />
                      <div className="absolute top-2 left-2 flex flex-col gap-1">
                        {isBestPrice && (
                          <span className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[9px] font-extrabold uppercase tracking-wider shadow-xs">
                            Best Value
                          </span>
                        )}
                        {isNewest && (
                          <span className="px-2 py-0.5 bg-amber-600 text-white rounded text-[9px] font-extrabold uppercase tracking-wider shadow-xs">
                            Newest Model
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Title & Price */}
                    <h4 className="text-sm font-bold text-stone-950 line-clamp-1">
                      {vehicle.title}
                    </h4>
                    <div className="text-lg font-extrabold text-stone-900 my-1">
                      {formatINR(vehicle.price)}
                    </div>

                    {/* Specs Table */}
                    <div className="space-y-2 text-xs pt-3 border-t border-stone-200">
                      <div className="flex justify-between py-1 border-b border-stone-100">
                        <span className="text-stone-500 font-medium">Model Year:</span>
                        <span className="font-bold text-stone-900">{vehicle.year}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-stone-100">
                        <span className="text-stone-500 font-medium">Mileage / Odo:</span>
                        <span className="font-bold text-stone-900">{vehicle.mileage}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-stone-100">
                        <span className="text-stone-500 font-medium">Fuel Type:</span>
                        <span className="font-bold text-stone-900 capitalize">{vehicle.fuel}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-stone-100">
                        <span className="text-stone-500 font-medium">Transmission:</span>
                        <span className="font-bold text-stone-900 capitalize">{vehicle.transmission}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-stone-100">
                        <span className="text-stone-500 font-medium">Location:</span>
                        <span className="font-bold text-stone-900">{vehicle.location || "Mumbai"}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-stone-100">
                        <span className="text-stone-500 font-medium">Engine Power:</span>
                        <span className="font-bold text-stone-900">{vehicle.engine || "Standard Spec"}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-stone-100">
                        <span className="text-stone-500 font-medium">Inspection Grade:</span>
                        <span className="font-bold text-emerald-700 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" /> 100-Pt Certified
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-2">
                    <button
                      onClick={() => {
                        onClose();
                        onSelectVehicleForView(vehicle);
                      }}
                      className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-900 text-xs font-bold uppercase tracking-wider rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 border border-stone-300"
                    >
                      <span>View Full Details</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        onClose();
                        onBookTestDrive(vehicle);
                      }}
                      className="w-full py-2 bg-stone-950 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <span>Book Test Drive</span>
                      <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Empty slot placeholder if < 3 vehicles */}
            {vehicles.length < 3 && (
              <div className="bg-stone-100/60 border-2 border-dashed border-stone-300 rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-3 min-h-[350px]">
                <div className="w-12 h-12 rounded-full bg-stone-200 text-stone-500 flex items-center justify-center">
                  <Scale className="w-6 h-6" />
                </div>
                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                    Add Another Vehicle
                  </h5>
                  <p className="text-[11px] text-stone-500 max-w-xs mt-1">
                    Select up to 3 cars from the Buy tab catalog to compare specifications side-by-side.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-stone-950 text-white text-xs font-bold rounded-lg hover:bg-stone-800 transition cursor-pointer"
                >
                  Browse Catalog
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
