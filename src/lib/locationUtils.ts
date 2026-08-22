// Indian Metropolitan & City Geographic Registry and Proximity Engine

export interface CityHub {
  id: string;
  name: string;
  state: string;
  lat: number;
  lon: number;
  aliases: string[];
}

export const INDIAN_CITIES_REGISTRY: CityHub[] = [
  { id: "mumbai", name: "Mumbai", state: "Maharashtra", lat: 19.0760, lon: 72.8777, aliases: ["mumbai", "bombay", "thane", "navi mumbai", "andheri", "bandra", "borivali", "dadar", "powai", "worli", "panvel", "kalyan"] },
  { id: "pune", name: "Pune", state: "Maharashtra", lat: 18.5204, lon: 73.8567, aliases: ["pune", "pcmc", "pimpri", "chinchwad", "hinjewadi", "kothrud", "viman nagar", "baner", "wakad", "hadapsar", "magarpatta"] },
  { id: "delhi", name: "Delhi NCR", state: "Delhi", lat: 28.6139, lon: 77.2090, aliases: ["delhi", "new delhi", "noida", "gurugram", "gurgaon", "faridabad", "ghaziabad", "greater noida", "dwarka", "saket", "rohini", "ncr"] },
  { id: "bengaluru", name: "Bengaluru", state: "Karnataka", lat: 12.9716, lon: 77.5946, aliases: ["bengaluru", "bangalore", "whitefield", "indiranagar", "koramangala", "electronic city", "hebbal", "jayanagar", "marathahalli", "hsr layout"] },
  { id: "hyderabad", name: "Hyderabad", state: "Telangana", lat: 17.3850, lon: 78.4867, aliases: ["hyderabad", "secunderabad", "cyberabad", "gachibowli", "hitech city", "banjara hills", "jubilee hills", "kukatpally", "kondapur"] },
  { id: "chennai", name: "Chennai", state: "Tamil Nadu", lat: 13.0827, lon: 80.2707, aliases: ["chennai", "madras", "omr", "anna nagar", "t nagar", "velachery", "adyar", "guindy", "tambaram"] },
  { id: "kolkata", name: "Kolkata", state: "West Bengal", lat: 22.5726, lon: 88.3639, aliases: ["kolkata", "calcutta", "salt lake", "new town", "howrah", "alipore", "ballygunge", "park street"] },
  { id: "ahmedabad", name: "Ahmedabad", state: "Gujarat", lat: 23.0225, lon: 72.5714, aliases: ["ahmedabad", "gandhinagar", "sg highway", "satellite", "bodakdev", "navrangpura", "vastrapur", "prahlad nagar"] },
  { id: "surat", name: "Surat", state: "Gujarat", lat: 21.1702, lon: 72.8311, aliases: ["surat", "varachha", "adajan", "vesu", "piplod"] },
  { id: "jaipur", name: "Jaipur", state: "Rajasthan", lat: 26.9124, lon: 75.7873, aliases: ["jaipur", "pink city", "vaishali nagar", "malviya nagar", "mansarovar", "c scheme", "rajasthan"] },
  { id: "chandigarh", name: "Chandigarh", state: "Punjab / Haryana", lat: 30.7333, lon: 76.7794, aliases: ["chandigarh", "mohali", "panchkula", "tricity", "zirakpur", "kharar"] },
  { id: "lucknow", name: "Lucknow", state: "Uttar Pradesh", lat: 26.8467, lon: 80.9462, aliases: ["lucknow", "gomti nagar", "hazratganj", "indira nagar", "alambagh", "up"] },
  { id: "kochi", name: "Kochi (Cochin)", state: "Kerala", lat: 9.9312, lon: 76.2673, aliases: ["kochi", "cochin", "ernakulam", "kerala", "kakkanad", "edappally", "aluva", "fort kochi", "trivandrum", "thiruvananthapuram", "calicut", "kozhikode"] },
  { id: "indore", name: "Indore", state: "Madhya Pradesh", lat: 22.7196, lon: 75.8577, aliases: ["indore", "vijay nagar", "palasia", "bhopal", "mp", "madhya pradesh"] },
  { id: "nagpur", name: "Nagpur", state: "Maharashtra", lat: 21.1458, lon: 79.0882, aliases: ["nagpur", "vidarbha", "dharampeth", "wardha road"] },
  { id: "coimbatore", name: "Coimbatore", state: "Tamil Nadu", lat: 11.0168, lon: 76.9558, aliases: ["coimbatore", "kovai", "rs puram", "gandhipuram", "peelamedu"] },
  { id: "patna", name: "Patna", state: "Bihar", lat: 25.5941, lon: 85.1376, aliases: ["patna", "bihar", "kankarbagh", "boring road", "danapur"] },
  { id: "visakhapatnam", name: "Visakhapatnam (Vizag)", state: "Andhra Pradesh", lat: 17.6868, lon: 83.2185, aliases: ["visakhapatnam", "vizag", "gajuwaka", "mvp colony", "andhra", "vijayawada"] },
  { id: "vadodara", name: "Vadodara (Baroda)", state: "Gujarat", lat: 22.3072, lon: 73.1812, aliases: ["vadodara", "baroda", "alkapuri", "gotri", "manjalpur"] },
  { id: "ludhiana", name: "Ludhiana", state: "Punjab", lat: 30.9010, lon: 75.8573, aliases: ["ludhiana", "punjab", "amritsar", "jalandhar", "model town"] },
  { id: "goa", name: "Goa (Panaji)", state: "Goa", lat: 15.2993, lon: 74.1240, aliases: ["goa", "panaji", "panjim", "margao", "vasco", "mapusa", "calangute", "candolim"] },
  { id: "bhubaneswar", name: "Bhubaneswar", state: "Odisha", lat: 20.2961, lon: 85.8245, aliases: ["bhubaneswar", "cuttack", "odisha", "orissa"] }
];

// Haversine formula to compute great-circle distance between two coords in Kilometers
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Find closest city hub coordinates for any given location text
export function resolveLocationToCoords(locText?: string): { hub: CityHub; distanceConfidence: "exact" | "state" | "default" } {
  if (!locText) {
    return { hub: INDIAN_CITIES_REGISTRY[0], distanceConfidence: "default" }; // Default Mumbai
  }

  const clean = locText.toLowerCase().trim();

  // 1. Direct name or alias match
  for (const hub of INDIAN_CITIES_REGISTRY) {
    if (
      clean.includes(hub.name.toLowerCase()) ||
      clean.includes(hub.id) ||
      hub.aliases.some((alias) => clean.includes(alias))
    ) {
      return { hub, distanceConfidence: "exact" };
    }
  }

  // 2. State match
  for (const hub of INDIAN_CITIES_REGISTRY) {
    if (clean.includes(hub.state.toLowerCase())) {
      return { hub, distanceConfidence: "state" };
    }
  }

  // Default fallback
  return { hub: INDIAN_CITIES_REGISTRY[0], distanceConfidence: "default" };
}

export interface LocationProximityResult {
  distanceKm: number;
  nearestHubName: string;
  isSameCity: boolean;
  formattedDistance: string;
  badgeColor: string;
}

// Computes distance from a reference location to a vehicle's location
export function getProximityInfo(
  vehicleLocation?: string,
  referenceCityIdOrCoords?: string | { lat: number; lon: number; name?: string }
): LocationProximityResult {
  // If no vehicle location, treat as neutral
  const defaultLoc = vehicleLocation || "Mumbai, Maharashtra";
  const vehicleResolved = resolveLocationToCoords(defaultLoc);

  let refLat: number;
  let refLon: number;
  let refName: string = "Selected Hub";
  let refId: string = "";

  if (typeof referenceCityIdOrCoords === "object" && referenceCityIdOrCoords !== null) {
    refLat = referenceCityIdOrCoords.lat;
    refLon = referenceCityIdOrCoords.lon;
    refName = referenceCityIdOrCoords.name || "My Location";
  } else {
    const hubId: string = typeof referenceCityIdOrCoords === "string" ? referenceCityIdOrCoords : "mumbai";
    const selectedHub =
      INDIAN_CITIES_REGISTRY.find((h) => h.id === hubId) ||
      resolveLocationToCoords(hubId).hub;
    refLat = selectedHub.lat;
    refLon = selectedHub.lon;
    refName = selectedHub.name;
    refId = selectedHub.id;
  }

  const dist = calculateHaversineDistance(
    refLat,
    refLon,
    vehicleResolved.hub.lat,
    vehicleResolved.hub.lon
  );

  const isSameCity = dist <= 35 || (refId && refId === vehicleResolved.hub.id);

  let formattedDistance = "";
  let badgeColor = "bg-stone-100 text-stone-700 border-stone-200";

  if (isSameCity) {
    formattedDistance = "Same City • Local Inventory";
    badgeColor = "bg-emerald-100 text-emerald-900 border-emerald-300";
  } else if (dist <= 150) {
    formattedDistance = `~${dist} km away (Nearby Hub)`;
    badgeColor = "bg-emerald-50 text-emerald-800 border-emerald-200";
  } else if (dist <= 450) {
    formattedDistance = `~${dist} km away (Regional Transit)`;
    badgeColor = "bg-amber-50 text-amber-800 border-amber-200";
  } else {
    formattedDistance = `~${dist} km away (Interstate Delivery)`;
    badgeColor = "bg-stone-100 text-stone-600 border-stone-200";
  }

  return {
    distanceKm: dist,
    nearestHubName: vehicleResolved.hub.name,
    isSameCity,
    formattedDistance,
    badgeColor
  };
}
