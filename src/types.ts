export interface Vehicle {
  id: number;
  title: string;
  price: number;
  image: string;
  make: string;
  model?: string;
  year: number;
  mileage: string;
  fuel: string;
  transmission: string;
  badge?: "verified" | "premium" | "hot" | null;
  description?: string;
  features?: string[];
  isUserListing?: boolean;
  listingId?: string;
  category?: string;
  sellerName?: string;
  sellerEmail?: string;
  sellerPhone?: string;
  location?: string;
  negotiable?: string;
  datePosted?: string;
  status?: "pending" | "active" | "sold" | "hidden";
  photos?: { src: string; alt: string }[];
  engine?: string;
  color?: string;
  owners?: string;
  regNumber?: string;
  // Indian Automotive & RTO Localization
  rtoState?: string;
  rtoCode?: string;
  insuranceStatus?: string;
  insuranceValidity?: string;
  puccStatus?: string;
  puccValidity?: string;
  hypothecationStatus?: string;
  fastagStatus?: string;
  stateNocAvailable?: string;
  roadTaxStatus?: string;
  // Category specific attributes
  bikeType?: string;
  bikeEngine?: string;
  bikeMileage?: string;
  bikeGears?: string;
  bicycleType?: string;
  frameSize?: string;
  gears?: string;
  brakeType?: string;
  frameMaterial?: string;
  batteryCapacity?: string;
  electricRange?: string;
  driveType?: string;
  doors?: string;
  seats?: string;
  // Acoustic & Engine Sound Note Profile
  engineSoundUrl?: string;
  engineSoundTitle?: string;
  engineSoundType?: string;
}

export type PartCategory =
  | "spoiler"
  | "engine"
  | "nitro"
  | "headlight"
  | "exhaust"
  | "turbo"
  | "wheels"
  | "suspension"
  | "brakes"
  | "ecu_tuning"
  | "body_kit"
  | "interior"
  | "audio"
  | "custom_other"
  | "other";

export type PartRarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";

export type PartStockStatus = "in_stock" | "custom_order" | "out_of_stock" | "sold_out";

export interface PartPriceHistoryEntry {
  price: number;
  date: string;
  note?: string;
  updatedBy?: string;
  changedBy?: string;
}

export interface PartComplianceCertificate {
  type?: string; // e.g. "FIA Homologation", "TÜV Rheinland Certified", "ISO 9001:2015", "AIS-004 Automotive Certified"
  certType?: string;
  certNumber: string;
  fileUrl?: string;
  verifiedBy?: string;
  verifiedDate?: string;
  expiryDate?: string;
}

export interface Part {
  id: number | string;
  title: string;
  category: PartCategory;
  customCategoryName?: string;
  rarity: PartRarity;
  condition: 1 | 2 | 3 | 4 | 5;
  brand: string;
  price: number;
  image: string;
  photos?: { src: string; alt: string }[];
  compatibleMake?: string;
  compatibleModel?: string;
  suitableVehicles?: string[];
  compatibleVehicles: string;
  
  // 1. Compatibility & Vehicle Cross-Linking Matrix
  engineCodes?: string[];
  chassisCodes?: string[];
  matchedVehicleIds?: (number | string)[];

  // 2. Live Inventory & Supply Chain Status
  stockCount?: number;
  stockStatus?: PartStockStatus;
  leadTime?: string;
  leadTimeDays?: string;
  lowStockThreshold?: number;

  // 3. Community Submission & Moderation
  moderationStatus?: "pending" | "approved" | "rejected" | "pending_verification" | "verified";
  rejectionReason?: string;
  isTunerVerified?: boolean;
  verifiedTuner?: boolean;
  isAutoWorldCertified?: boolean;
  autoWorldCertified?: boolean;

  // 4. Analytics & Lead Tracking
  inquiryCount?: number;
  bookmarkCount?: number;
  bookmarksCount?: number;
  viewsCount?: number;
  impressionsCount?: number;
  whatsappLeadsCount?: number;
  priceHistory?: PartPriceHistoryEntry[];

  // 5. Multi-Angle Gallery & Dyno / Certificate Attachments
  dynoSheetUrl?: string;
  dynoHpGain?: string;
  complianceCertificate?: PartComplianceCertificate;

  purchaseDate?: string;
  installationDifficulty?: "Easy (Plug & Play)" | "Moderate (Garage Tools)" | "Professional (Tuner Required)" | string;
  performanceGain?: string;
  shippingAvailable?: boolean;
  description: string;
  specifications?: Record<string, string>;
  sellerName?: string;
  sellerPhone?: string;
  sellerEmail?: string;
  location?: string;
  negotiable?: "yes" | "no" | string;
  badge?: "verified" | "premium" | "hot" | null;
  status?: "pending" | "active" | "sold" | "hidden";
  isUserListing?: boolean;
  listingId?: string;
  userId?: string;
  datePosted?: string;
  partNumber?: string;
  warranty?: string;
}

export interface UserPartListing {
  id: string;
  title: string;
  category: PartCategory;
  customCategoryName?: string;
  rarity: PartRarity;
  condition: number;
  brand: string;
  price: number;
  compatibleMake?: string;
  compatibleModel?: string;
  suitableVehicles?: string[];
  compatibleVehicles: string;
  
  // Compatibility & Fitment Tags
  engineCodes?: string[];
  chassisCodes?: string[];
  matchedVehicleIds?: (number | string)[];

  // Live Inventory & Stock Status
  stockCount?: number;
  stockStatus?: PartStockStatus;
  leadTime?: string;

  // Moderation & Verification
  moderationStatus?: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  isTunerVerified?: boolean;
  isAutoWorldCertified?: boolean;

  // Analytics & Logs
  inquiryCount?: number;
  bookmarkCount?: number;
  viewsCount?: number;
  priceHistory?: PartPriceHistoryEntry[];

  // Dyno & Certificates
  dynoSheetUrl?: string;
  dynoHpGain?: string;
  complianceCertificate?: PartComplianceCertificate;

  purchaseDate?: string;
  installationDifficulty?: "Easy (Plug & Play)" | "Moderate (Garage Tools)" | "Professional (Tuner Required)" | string;
  performanceGain?: string;
  shippingAvailable?: boolean;
  description: string;
  negotiable: "yes" | "no" | string;
  sellerName: string;
  sellerEmail: string;
  sellerPhone: string;
  location: string;
  partNumber?: string;
  warranty?: string;
  specifications?: Record<string, string>;
  featured?: boolean;
  urgent?: boolean;
  verified?: boolean;
  photos: { src: string; alt: string }[];
  image?: string;
  datePosted: string;
  createdAt?: string;
  updatedAt?: string;
  status: "pending" | "active" | "sold" | "hidden";
  userId?: string;
}

export interface UserListing {
  id: string;
  title: string;
  type: string;
  make: string;
  model: string;
  year: string;
  price: number;
  condition: number;
  mileage: string;
  fuelType: string;
  description: string;
  negotiable: string;
  sellerName: string;
  sellerEmail: string;
  sellerPhone: string;
  location: string;
  features: string[];
  transmission?: string;
  engineSize?: string;
  doors?: string;
  seats?: string;
  bikeType?: string;
  bikeEngine?: string;
  bikeMileage?: string;
  bikeGears?: string;
  bicycleType?: string;
  frameSize?: string;
  gears?: string;
  brakeType?: string;
  frameMaterial?: string;
  batteryCapacity?: string;
  electricRange?: string;
  driveType?: string;
  featured?: boolean;
  urgent?: boolean;
  verified?: boolean;
  photos: { src: string; alt: string }[];
  datePosted: string;
  createdAt?: string;
  status: "pending" | "active" | "sold" | "hidden";
  userId?: string;
  engine?: string;
  color?: string;
  owners?: string;
  regNumber?: string;
  // Indian Automotive & RTO Localization
  rtoState?: string;
  rtoCode?: string;
  insuranceStatus?: string;
  insuranceValidity?: string;
  puccStatus?: string;
  puccValidity?: string;
  hypothecationStatus?: string;
  fastagStatus?: string;
  stateNocAvailable?: string;
  roadTaxStatus?: string;
  // Acoustic & Engine Sound Note Profile
  engineSoundUrl?: string;
  engineSoundTitle?: string;
  engineSoundType?: string;
}

export interface Subscription {
  plan: string;
  price: number;
  period: "monthly" | "yearly";
  startDate: string;
  status: "active" | "expired";
}

export interface Message {
  name: string;
  email: string;
  subject: string;
  message: string;
  date: string;
}

export const DEFAULT_VEHICLES: Vehicle[] = [
  {
    id: 1,
    title: "Mahindra Thar 4x4 LX 2023",
    price: 1450000,
    image: "https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800&auto=format&fit=crop&q=80",
    make: "Mahindra",
    model: "Thar",
    year: 2023,
    mileage: "11,200 km",
    fuel: "Diesel",
    transmission: "Manual",
    badge: "premium",
    category: "suv",
    engine: "2.2L mHawk Diesel (130 bhp)",
    color: "Napoli Black",
    owners: "1st Owner",
    regNumber: "MH-02-EQ-8842",
    rtoState: "Maharashtra (MH)",
    rtoCode: "MH-02 (Mumbai West)",
    insuranceStatus: "Comprehensive (Active)",
    insuranceValidity: "Nov 2026",
    puccStatus: "Valid / Certified",
    puccValidity: "Dec 2026",
    hypothecationStatus: "Clean (No Active Loan)",
    fastagStatus: "Active & Linked",
    stateNocAvailable: "Pan-India Transferable (NOC Available)",
    roadTaxStatus: "Lifetime Road Tax Paid (LTT)",
    description: "Muscular and iconic Mahindra Thar 4x4 LX. Pure adventure machinery with heavy key diesel torque, modern hardtop cabin design, Apple CarPlay integration, dual airbags, and high-clearance offroad specs.",
    features: ["ABS", "Airbags", "Bluetooth", "Backup Camera", "4WD Terrain Control", "Climate Control"],
    engineSoundUrl: "preset:diesel_mhawk",
    engineSoundTitle: "2.2L mHawk Turbo Diesel Cold Start & Throttle",
    engineSoundType: "diesel",
    sellerName: "Rajesh Kumar (Elite Motors)",
    sellerPhone: "+91 98230 44556",
    sellerEmail: "rajesh@elitemotors.co.in",
    location: "Mumbai, Maharashtra",
    negotiable: "yes"
  },
  {
    id: 2,
    title: "Tata Nexon EV Max 2023",
    price: 1580000,
    image: "https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?w=800&auto=format&fit=crop&q=80",
    make: "Tata",
    model: "Nexon",
    year: 2023,
    mileage: "14,500 km",
    fuel: "Electric",
    transmission: "Automatic",
    badge: "verified",
    category: "suv",
    engine: "40.5 kWh Ziptron High Voltage EV",
    color: "Pristine White Dual-Tone",
    owners: "1st Owner",
    regNumber: "MH-12-TX-4401",
    rtoState: "Maharashtra (MH)",
    rtoCode: "MH-12 (Pune)",
    insuranceStatus: "Zero Depreciation (Active)",
    insuranceValidity: "Jan 2027",
    puccStatus: "Exempt (Electric Vehicle)",
    puccValidity: "Lifetime Exempt",
    hypothecationStatus: "Clean (No Active Loan)",
    fastagStatus: "Active & Linked",
    stateNocAvailable: "Pan-India Transferable (NOC Available)",
    roadTaxStatus: "Exempt (Electric Vehicle)",
    description: "India's highest-selling premium electric SUV. Instant traction with high-voltage Ziptron tech, long-range battery supporting DC fast hubs, elegant dual-tone roof, and advanced active regeneration modes.",
    features: ["Air Conditioning", "ABS", "Airbags", "Bluetooth", "Backup Camera", "Sunroof/Moonroof", "Ventilated Seats"],
    sellerName: "Anjali Sharma (EcoDrive Pune)",
    sellerPhone: "+91 95521 88990",
    sellerEmail: "pune@ecodrives.in",
    location: "Pune, Maharashtra",
    negotiable: "yes"
  },
  {
    id: 3,
    title: "Royal Enfield Classic 350 2022",
    price: 185000,
    image: "https://images.unsplash.com/photo-1599819811279-d5ad9cccf838?w=800&auto=format&fit=crop&q=80",
    make: "Royal Enfield",
    model: "Classic 350",
    year: 2022,
    mileage: "6,800 km",
    fuel: "Petrol",
    transmission: "Manual",
    badge: "hot",
    category: "motorcycle",
    engine: "349cc J-Series Air-Oil Cooled (20.2 bhp)",
    color: "Stealth Black",
    owners: "1st Owner",
    regNumber: "RJ-14-MS-7719",
    rtoState: "Rajasthan (RJ)",
    rtoCode: "RJ-14 (Jaipur South)",
    insuranceStatus: "Comprehensive (Active)",
    insuranceValidity: "Aug 2027",
    puccStatus: "Valid / Certified",
    puccValidity: "Feb 2027",
    hypothecationStatus: "Clean (No Active Loan)",
    fastagStatus: "Not Attached",
    stateNocAvailable: "Pan-India Transferable (NOC Available)",
    roadTaxStatus: "Lifetime Road Tax Paid (LTT)",
    description: "Timeless classic mechanical engineering. Butter-smooth 349cc J-series cruiser engine, pristine signature chrome-black detailing, dual-channel responsive ABS, and single-owner vintage aesthetics.",
    features: ["ABS", "Fuel Injection", "Retro Spoke Wheels", "Vintage Styling"],
    engineSoundUrl: "preset:re_single_thump",
    engineSoundTitle: "349cc J-Series Signature Exhaust Thump",
    engineSoundType: "motorcycle",
    sellerName: "Vikram Singh",
    sellerPhone: "+91 70144 33221",
    sellerEmail: "vikram.singh@gmail.com",
    location: "Jaipur, Rajasthan",
    negotiable: "yes"
  },
  {
    id: 4,
    title: "Toyota Fortuner 2.8L 4x4 2022",
    price: 3450000,
    image: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80",
    make: "Toyota",
    model: "Fortuner",
    year: 2022,
    mileage: "28,500 km",
    fuel: "Diesel",
    transmission: "Automatic",
    badge: "verified",
    category: "suv",
    engine: "2.8L D-4D Turbocharged Diesel (201 bhp)",
    color: "Super White",
    owners: "1st Owner",
    regNumber: "HR-26-DJ-9002",
    rtoState: "Haryana (HR)",
    rtoCode: "HR-26 (Gurugram North)",
    insuranceStatus: "Comprehensive (Active)",
    insuranceValidity: "Oct 2026",
    puccStatus: "Valid / Certified",
    puccValidity: "Nov 2026",
    hypothecationStatus: "Hypothecated (Bank NOC Available)",
    fastagStatus: "Active & Linked",
    stateNocAvailable: "Pan-India Transferable (NOC Available)",
    roadTaxStatus: "Lifetime Road Tax Paid (LTT)",
    description: "Unmatched road presence. Pre-owned premium Toyota Fortuner equipped with heavy duty 2.8L diesel engine, standard 4WD selectable terrains, active cruise safety mechanics, and pristine plush interiors.",
    features: ["Air Conditioning", "ABS", "Airbags", "Bluetooth", "Backup Camera", "Electric Tailgate", "Differential Lock"],
    sellerName: "Sanjay Gupta (Premium Wheels NCR)",
    sellerPhone: "+91 98101 22334",
    sellerEmail: "sales@premiumwheelsncr.com",
    location: "Gurugram, Haryana",
    negotiable: "no"
  },
  {
    id: 5,
    title: "Maruti Suzuki Swift ZXi 2022",
    price: 680000,
    image: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&auto=format&fit=crop&q=80",
    make: "Maruti Suzuki",
    model: "Swift",
    year: 2022,
    mileage: "12,200 km",
    fuel: "Petrol",
    transmission: "Manual",
    badge: "verified",
    category: "car",
    engine: "1.2L DualJet K12N Petrol (89 bhp)",
    color: "Solid Fire Red",
    owners: "1st Owner",
    regNumber: "KA-01-MJ-5512",
    rtoState: "Karnataka (KA)",
    rtoCode: "KA-01 (Koramangala)",
    insuranceStatus: "Comprehensive (Active)",
    insuranceValidity: "Sep 2026",
    puccStatus: "Valid / Certified",
    puccValidity: "Oct 2026",
    hypothecationStatus: "Clean (No Active Loan)",
    fastagStatus: "Active & Linked",
    stateNocAvailable: "Pan-India Transferable (NOC Available)",
    roadTaxStatus: "Lifetime Road Tax Paid (LTT)",
    description: "Pristine Maruti Suzuki Swift hatch under single owner registry. Highly efficient K-series petrol engine, automatic climate setups, touch Smartplay infotainment, and perfect mechanical compliance.",
    features: ["Air Conditioning", "Power Windows", "ABS", "Airbags", "Bluetooth", "Climate Control"],
    sellerName: "Preeti Desai",
    sellerPhone: "+91 88880 11223",
    sellerEmail: "preeti.desai92@yahoo.co.in",
    location: "Bengaluru, Karnataka",
    negotiable: "yes"
  },
  {
    id: 6,
    title: "BMW 3-Series Luxury Line 2021",
    price: 4250000,
    image: "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&auto=format&fit=crop&q=80",
    make: "BMW",
    model: "3 Series",
    year: 2021,
    mileage: "19,100 km",
    fuel: "Petrol",
    transmission: "Automatic",
    badge: "premium",
    category: "car",
    engine: "2.0L TwinPower Turbo 4-Cyl (255 bhp)",
    color: "Mineral White Metallic",
    owners: "1st Owner",
    regNumber: "MH-01-DL-1991",
    rtoState: "Maharashtra (MH)",
    rtoCode: "MH-01 (Mumbai South)",
    insuranceStatus: "Zero Depreciation (Active)",
    insuranceValidity: "Dec 2026",
    puccStatus: "Valid / Certified",
    puccValidity: "Jan 2027",
    hypothecationStatus: "Clean (No Active Loan)",
    fastagStatus: "Active & Linked",
    stateNocAvailable: "Pan-India Transferable (NOC Available)",
    roadTaxStatus: "Lifetime Road Tax Paid (LTT)",
    description: "Elite performance and comfort parameters. Custom imported Luxury Line featuring high-grade leather upholstery, ambient glass cockpit panels, active dynamic drive profiles, and verified service record archives.",
    features: ["Power Steering", "ABS", "Airbags", "Bluetooth", "Backup Camera", "Toggle Sports Modes", "Sunroof/Moonroof"],
    engineSoundUrl: "preset:bmw_twinpower_turbo",
    engineSoundTitle: "2.0L TwinPower Turbocharged Revs & Burble",
    engineSoundType: "i4_turbo",
    sellerName: "Amitabh Shah (Shah Luxury Imports)",
    sellerPhone: "+91 99201 55667",
    sellerEmail: "amitabh@shahimports.in",
    location: "Mumbai, Maharashtra",
    negotiable: "no"
  }
];

export const VEHICLE_MAKES: Record<string, string[]> = {
  car: ['Maruti Suzuki', 'Tata', 'Hyundai', 'Honda', 'Toyota', 'Kia', 'BMW', 'Mercedes', 'Audi', 'Tesla', 'Porsche', 'Ferrari', 'Lamborghini', 'Lexus', 'Jaguar', 'Volvo', 'Volkswagen', 'Skoda', 'Nissan', 'Chevrolet'],
  suv: ['Mahindra', 'Tata', 'Toyota', 'Hyundai', 'Maruti Suzuki', 'Kia', 'Jeep', 'Land Rover', 'BMW', 'Mercedes', 'Audi', 'Volvo', 'Porsche', 'Lexus'],
  truck: ['Tata', 'Mahindra', 'Ashok Leyland', 'Ford', 'Chevrolet', 'Ram', 'Toyota', 'GMC', 'Tesla'],
  van: ['Maruti Suzuki', 'Toyota', 'Honda', 'Ford', 'Mercedes', 'Kia'],
  motorcycle: ['Royal Enfield', 'Bajaj', 'TVS', 'Hero', 'Honda', 'Yamaha', 'Suzuki', 'KTM', 'Harley-Davidson', 'BMW', 'Ducati', 'Kawasaki', 'Triumph'],
  bicycle: ['Hero Cycles', 'Firefox', 'Trek', 'Giant', 'Specialized', 'Schwinn', 'Cannondale', 'Scott'],
  commercial: ['Tata', 'Mahindra', 'Ashok Leyland', 'Eicher', 'Mercedes', 'Volvo', 'BharatBenz'],
  other: ['Other']
};

export const VEHICLE_MODELS: Record<string, string[]> = {
  'Mahindra': ['Thar', 'XUV700', 'Scorpio-N', 'Bolero', 'XUV300', 'Alturas G4', 'Scorpio Classic'],
  'Tata': ['Nexon', 'Harrier', 'Safari', 'Punch', 'Altroz', 'Tiago', '407', 'Signa', 'Tigor'],
  'Maruti Suzuki': ['Swift', 'Baleno', 'Brezza', 'Grand Vitara', 'Ertiga', 'Dzire', 'Alto', 'Omni', 'Fronx', 'Ciaz'],
  'Royal Enfield': ['Classic 350', 'Bullet 350', 'Meteor 350', 'Himalayan 450', 'Hunter 350', 'Interceptor 650', 'Continental GT 650'],
  'Bajaj': ['Pulsar 150', 'Pulsar NS200', 'Pulsar 220F', 'Chetak EV', 'Dominar 400', 'Platina', 'Avenger 220'],
  'TVS': ['Apache RTR 160', 'Apache RR 310', 'Jupiter', 'Ntorq 125', 'Rider 125', 'iQube EV'],
  'Hero': ['Splendor+', 'HF Deluxe', 'Xpulse 200', 'Karizma XMR', 'Maestro Edge', 'Destini 125'],
  'Ashok Leyland': ['Dost', 'Bada Dost', 'Ecomet', 'U-Truck'],
  'Eicher': ['Pro 2049', 'Pro 3015', 'Pro 6025'],
  'Hero Cycles': ['Ranger', 'Octane', 'Lectro EV', 'Sprint', 'Howler'],
  'Firefox': ['Target', 'Cyclone', 'Rapide', 'Meteor', 'Aera'],
  'Toyota': ['Camry', 'Corolla', 'Innova Crysta', 'Fortuner', 'Glanza', 'RAV4', 'Hilux', 'Innova Hycross', 'Urban Cruiser'],
  'Honda': ['Civic', 'Accord', 'City', 'Amaze', 'CR-V', 'Elevate'],
  'Ford': ['F-150', 'Mustang', 'Endeavour', 'EcoSport', 'Explorer', 'Ranger'],
  'BMW': ['3 Series', '5 Series', '7 Series', 'X3', 'X5', 'X7', 'i4 (EV)', 'iX (EV)', 'G 310 R', 'S 1000 RR'],
  'Mercedes': ['C-Class', 'E-Class', 'S-Class', 'GLA', 'GLC', 'GLE', 'GLS', 'EQS (EV)', 'Sprinter'],
  'Audi': ['A4', 'A6', 'Q3', 'Q5', 'Q7', 'Q8', 'e-tron (EV)'],
  'Hyundai': ['i20', 'Creta', 'Verna', 'Venue', 'Alcazar', 'Tucson', 'Exter', 'Ioniq 5 (EV)'],
  'Kia': ['Seltos', 'Sonet', 'Carens', 'Carnival', 'EV6 (EV)'],
  'Nissan': ['Magnite', 'Kicks', 'Sunny', 'GT-R', 'Leaf (EV)'],
  'Chevrolet': ['Spark', 'Beat', 'Cruze', 'Captiva', 'Silverado', 'Corvette', 'Camaro'],
  'Ram': ['1500', '2500'],
  'GMC': ['Sierra', 'Yukon', 'Hummer EV'],
  'Yamaha': ['YZF-R15', 'MT-15', 'FZ-S', 'R3', 'MT-07', 'Aerox 155'],
  'Suzuki': ['Access 125', 'Gixxer SF', 'Hayabusa', 'V-Strom SX', 'Burgman Street'],
  'KTM': ['Duke 200', 'Duke 390', 'RC 390', 'Adventure 390', 'Duke 250'],
  'Harley-Davidson': ['X440', 'Iron 883', 'Fat Boy', 'Street 750', 'Sportster S'],
  'Trek': ['Domane', 'Madone', 'Marlin', 'FX 2'],
  'Giant': ['Defy', 'TCR', 'Escape', 'Talon'],
  'Specialized': ['Allez', 'Sirrus', 'Tarmac', 'Rockhopper'],
  'Tesla': ['Model 3', 'Model Y', 'Model S', 'Model X', 'Cybertruck'],
  'Porsche': ['911 Carrera', 'Cayenne', 'Macan', 'Taycan (EV)', 'Panamera', '718 Cayman'],
  'Ferrari': ['296 GTB', 'SF90 Stradale', 'Roma', 'F8 Tributo', 'Purosangue SUV'],
  'Lamborghini': ['Urus SUV', 'Huracan Evo', 'Revuelto V12', 'Aventador'],
  'Lexus': ['ES Hybrid', 'RX SUV', 'NX SUV', 'LS Limousine', 'LX SUV'],
  'Jaguar': ['F-PACE', 'I-PACE (EV)', 'F-TYPE Coupe', 'XE Sedan'],
  'Land Rover': ['Defender', 'Range Rover Sport', 'Evoque', 'Discovery Sport', 'Velar'],
  'Volvo': ['XC40 Recharge (EV)', 'XC60 SUV', 'XC90 Luxury SUV', 'S90 Sedan'],
  'Jeep': ['Compass', 'Wrangler Rubicon', 'Meridian', 'Grand Cherokee'],
  'Volkswagen': ['Virtus', 'Taigun', 'Tiguan', 'Polo GT', 'Golf GTI'],
  'Skoda': ['Slavia', 'Kushaq', 'Kodiaq', 'Superb', 'Octavia vRS'],
  'Ducati': ['Monster 821', 'Panigale V4', 'Multistrada V4', 'Scrambler Icon'],
  'Kawasaki': ['Ninja 300', 'Ninja ZX-10R', 'Z900', 'Versys 650'],
  'Triumph': ['Speed 400', 'Scrambler 400 X', 'Street Triple R', 'Tiger Sport 660'],
  'Cannondale': ['Quick', 'SuperSix EVO', 'Trail 7'],
  'Scott': ['Sub Cross', 'Aspect 750', 'Addict RC'],
  'BharatBenz': ['1917R', '2823R', '3528C'],
  'Other': ['Custom/Other']
};

export const INDIAN_RTO_STATES = [
  { state: "Maharashtra", code: "MH", rtos: ["MH-01 (Mumbai South)", "MH-02 (Mumbai West)", "MH-03 (Mumbai East)", "MH-04 (Thane)", "MH-12 (Pune)", "MH-14 (Pimpri-Chinchwad)", "MH-43 (Navi Mumbai)", "MH-47 (Borivali)"] },
  { state: "Delhi NCR", code: "DL", rtos: ["DL-01 (Mall Road)", "DL-03 (Sheikh Sarai)", "DL-04 (Janakpuri)", "DL-05 (Loni)", "DL-07 (Mayur Vihar)", "DL-08 (Wazirpur)", "DL-09 (Palam)", "DL-10 (Raja Garden)"] },
  { state: "Karnataka", code: "KA", rtos: ["KA-01 (Koramangala)", "KA-02 (Rajajinagar)", "KA-03 (Indiranagar)", "KA-04 (Yeshwanthpur)", "KA-05 (Jayanagar)", "KA-51 (Electronic City)", "KA-53 (KR Puram)"] },
  { state: "Tamil Nadu", code: "TN", rtos: ["TN-01 (Chennai Central)", "TN-02 (Chennai North)", "TN-07 (Chennai South)", "TN-09 (Chennai West)", "TN-10 (South-West)", "TN-37 (Coimbatore South)", "TN-38 (Coimbatore North)"] },
  { state: "Telangana", code: "TS", rtos: ["TS-07 (Hyderabad Central)", "TS-08 (Hyderabad East)", "TS-09 (Hyderabad North)", "TS-10 (Secunderabad)", "TS-11 (Hyderabad West)", "TS-12 (Hyderabad South)"] },
  { state: "Gujarat", code: "GJ", rtos: ["GJ-01 (Ahmedabad)", "GJ-03 (Rajkot)", "GJ-05 (Surat)", "GJ-06 (Vadodara)", "GJ-27 (Ahmedabad East)"] },
  { state: "Uttar Pradesh", code: "UP", rtos: ["UP-14 (Ghaziabad)", "UP-16 (Noida)", "UP-32 (Lucknow)", "UP-78 (Kanpur)", "UP-80 (Agra)", "UP-85 (Mathura)"] },
  { state: "Haryana", code: "HR", rtos: ["HR-26 (Gurugram North)", "HR-51 (Faridabad)", "HR-72 (Gurugram South)", "HR-03 (Panchkula)", "HR-05 (Karnal)"] },
  { state: "West Bengal", code: "WB", rtos: ["WB-01 (Kolkata North)", "WB-02 (Kolkata Central)", "WB-04 (Kolkata South)", "WB-06 (Kasba)", "WB-20 (Alipore)", "WB-24 (Barrackpore)"] },
  { state: "Rajasthan", code: "RJ", rtos: ["RJ-14 (Jaipur South)", "RJ-45 (Jaipur North)", "RJ-19 (Jodhpur)", "RJ-27 (Udaipur)", "RJ-20 (Kota)"] },
  { state: "Punjab", code: "PB", rtos: ["PB-10 (Ludhiana)", "PB-65 (Mohali)", "PB-02 (Amritsar)", "PB-08 (Jalandhar)", "PB-11 (Patiala)"] },
  { state: "Kerala", code: "KL", rtos: ["KL-01 (Thiruvananthapuram)", "KL-07 (Ernakulam / Kochi)", "KL-08 (Thrissur)", "KL-11 (Kozhikode)"] },
  { state: "Goa", code: "GA", rtos: ["GA-01 (Panaji)", "GA-07 (Margao)", "GA-03 (Mapusa)"] },
  { state: "Chandigarh (UT)", code: "CH", rtos: ["CH-01 (Chandigarh Central)"] },
  { state: "Andhra Pradesh", code: "AP", rtos: ["AP-39 (Visakhapatnam)", "AP-16 (Vijayawada)", "AP-26 (Nellore)"] }
];

export const INSURANCE_STATUS_OPTIONS = [
  "Comprehensive (Active)",
  "Zero Depreciation (Active)",
  "Third-Party Only (Active)",
  "Expired / Needs Renewal"
];

export const PUCC_STATUS_OPTIONS = [
  "Valid / Certified",
  "Expired",
  "Exempt (Electric Vehicle)"
];

export const HYPOTHECATION_OPTIONS = [
  "Clean (No Active Loan)",
  "Hypothecated (Bank NOC Available)",
  "Financed / Loan Active"
];

export const STATE_NOC_OPTIONS = [
  "Pan-India Transferable (NOC Available)",
  "State Specific Registration",
  "NOC In Process"
];

export const ROAD_TAX_OPTIONS = [
  "Lifetime Road Tax Paid (LTT)",
  "Annual Tax Paid",
  "Exempt (Electric Vehicle)"
];

export const PART_CATEGORIES: { id: PartCategory; label: string; icon: string; description: string }[] = [
  { id: "spoiler", label: "Spoiler & Aero Wings", icon: "Wind", description: "Pre-preg dry carbon wings, GT swan necks, splitters, and ducktail diffusers" },
  { id: "engine", label: "Engine Crate & Internals", icon: "Cpu", description: "Forged pistons, high-lift camshafts, and complete race-spec engine assemblies" },
  { id: "nitro", label: "Nitrous Oxide Systems", icon: "Zap", description: "Direct-port wet fogger systems, solenoid valves, purge kits, and warmers" },
  { id: "headlight", label: "Laser & LED Headlights", icon: "Lightbulb", description: "Adaptive laser clusters, dynamic sequential indicators, and smoked lenses" },
  { id: "exhaust", label: "Titanium Exhaust Systems", icon: "Flame", description: "Valvetronic cat-back headers, decat downpipes, and scorched titanium tips" },
  { id: "turbo", label: "Turbochargers & Superchargers", icon: "Disc", description: "Dual ceramic ball-bearing turbos, blow-off valves, and high-flow intercoolers" },
  { id: "wheels", label: "Forged Alloy Wheels", icon: "CircleDot", description: "Multi-piece forged center-lock, monoblock lightweight track alloy rims" },
  { id: "suspension", label: "Suspension & Coilovers", icon: "Activity", description: "Track-spec adjustable dampers, camber plates, and pneumatic air suspension" },
  { id: "brakes", label: "Big Brake Kits & Carbon", icon: "Disc3", description: "Monobloc multi-piston calipers, floating carbon ceramic slotted rotors" },
  { id: "ecu_tuning", label: "ECU Tuning & Standalone", icon: "Sliders", description: "Piggyback tuning boxes, standalone engine management, and quick-shifters" },
  { id: "body_kit", label: "Widebody & Carbon Kits", icon: "Layers", description: "Fender flares, vented carbon hoods, side skirts, and aggressive rear diffusers" },
  { id: "interior", label: "Interior & Cockpit", icon: "Sliders", description: "FIA-approved carbon bucket seats, harness bars, alcantara steering wheels, and gauges" },
  { id: "audio", label: "High-End Audio Systems", icon: "Sliders", description: "Audiophile DSP amplifiers, component neodymium speakers, and custom subwoofers" },
  { id: "custom_other", label: "Custom / Other Component", icon: "Wrench", description: "Bespoke fabricated hardware, track accessories, and custom motorsport gear" }
];

export const PART_RARITY_TIERS: Record<PartRarity, { label: string; badgeClass: string; glowClass: string; bgClass: string; accentColor: string }> = {
  Common: {
    label: "OEM Standard",
    badgeClass: "bg-stone-200 text-stone-800 border-stone-300",
    glowClass: "shadow-none",
    bgClass: "bg-stone-100",
    accentColor: "#78716c"
  },
  Uncommon: {
    label: "Street Spec",
    badgeClass: "bg-emerald-950 text-emerald-300 border-emerald-500/40",
    glowClass: "shadow-[0_0_12px_rgba(16,185,129,0.25)]",
    bgClass: "bg-emerald-950/20",
    accentColor: "#10b981"
  },
  Rare: {
    label: "Clubsport Spec",
    badgeClass: "bg-blue-950 text-blue-300 border-blue-500/40",
    glowClass: "shadow-[0_0_14px_rgba(59,130,246,0.3)]",
    bgClass: "bg-blue-950/20",
    accentColor: "#3b82f6"
  },
  Epic: {
    label: "Track Edition",
    badgeClass: "bg-purple-950 text-purple-300 border-purple-500/50",
    glowClass: "shadow-[0_0_18px_rgba(168,85,247,0.35)]",
    bgClass: "bg-purple-950/20",
    accentColor: "#a855f7"
  },
  Legendary: {
    label: "Motorsport Prototype",
    badgeClass: "bg-amber-950 text-amber-300 border-amber-500/60 ring-1 ring-amber-400/40",
    glowClass: "shadow-[0_0_22px_rgba(245,158,11,0.45)]",
    bgClass: "bg-amber-950/20",
    accentColor: "#f59e0b"
  }
};

export const PART_CONDITION_LABELS: Record<number, { title: string; desc: string }> = {
  5: { title: "Brand New / Box Packed", desc: "Never fitted on vehicle. Original factory crate or crate seal intact." },
  4: { title: "Like New", desc: "Test-fitted or minimal dyno run time (<500 km). Mint physical condition." },
  3: { title: "Lightly Used", desc: "Regular road use with normal cosmetic wear. 100% mechanically sound." },
  2: { title: "Refurbished / Serviced", desc: "Rebuilt with genuine seals/bearings by a certified tuner." },
  1: { title: "For Repair / Project", desc: "Core unit requiring rebuild or bespoke machining." }
};

export const PART_BRANDS = [
  "Akrapovič",
  "Brembo",
  "Garrett Motion",
  "NOS (Holley)",
  "BBS Motorsport",
  "HKS Japan",
  "Öhlins Racing",
  "Cosworth Engineering",
  "Borla Exhaust",
  "Sparco Racing",
  "Recaro Automotive",
  "Bilstein Suspension",
  "AEM Performance",
  "K&N Engineering",
  "Tein Coilovers",
  "Bosch Motorsport",
  "Mishimoto",
  "Injen Technology",
  "Turbosmart",
  "Eibach Springs",
  "OEM Certified",
  "Custom / Bespoke"
];

export const COMMON_ENGINE_CODES = [
  "B58 3.0L Turbo (BMW)",
  "EA888 Gen 3/4 2.0T (VAG / Skoda / Audi)",
  "2JZ-GTE / 2JZ-GE 3.0L (Toyota)",
  "mHawk 2.2L CRDe (Mahindra)",
  "mStallion 2.0L TGDi (Mahindra)",
  "1GD-FTV 2.8L D-4D (Toyota Fortuner/Hilux)",
  "VR38DETT 3.8L Twin-Turbo (Nissan GT-R)",
  "S58 3.0L Twin-Turbo (BMW M3 / M4)",
  "K20C1 2.0L VTEC Turbo (Honda Type-R)",
  "RB26DETT 2.6L Twin-Turbo (Nissan)",
  "EJ25 / FA24 Boxer Turbo (Subaru STI/BRZ)",
  "Universal / Multi-Platform"
];

export const COMMON_CHASSIS_CODES = [
  "G20 / G80 (BMW 3-Series / M3)",
  "MQB Platform (Octavia / Superb / Virtus / Golf)",
  "Thar Gen-2 / Thar Roxx (Mahindra)",
  "A90 / A91 (Toyota GR Supra)",
  "AN160 / AN150 (Toyota Fortuner / Hilux)",
  "992 / 991 (Porsche 911 Carrera & GT3)",
  "W205 / W206 (Mercedes-Benz C-Class)",
  "F87 / G87 (BMW M2 Coupe)",
  "6R / 6C (Volkswagen Polo GT)",
  "Universal Track / Custom Motorsport"
];

export const STOCK_STATUS_CONFIGS: Record<PartStockStatus, { label: string; badgeClass: string; desc: string }> = {
  in_stock: {
    label: "In Stock (Ready to Dispatch)",
    badgeClass: "bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:border-emerald-700 dark:text-emerald-300",
    desc: "Component is packaged in central vault & ready for same-day dispatch."
  },
  custom_order: {
    label: "Custom Order / Backorder",
    badgeClass: "bg-amber-500/10 text-amber-700 border-amber-300 dark:border-amber-700 dark:text-amber-300",
    desc: "Made-to-order or imported with scheduled freight lead time."
  },
  out_of_stock: {
    label: "Out of Stock",
    badgeClass: "bg-rose-500/10 text-rose-700 border-rose-300 dark:border-rose-700 dark:text-rose-300",
    desc: "Currently exhausted from vault. Inquire for batch manufacturing queue."
  },
  sold_out: {
    label: "Sold Out / Archived",
    badgeClass: "bg-stone-500/10 text-stone-700 border-stone-300 dark:border-stone-700 dark:text-stone-300",
    desc: "Unit sold out and closed from active inventory."
  }
};

export const DEFAULT_PARTS: Part[] = [
  {
    id: 1,
    title: "Carbon Fiber GT Swan-Neck Wing Spoiler",
    category: "spoiler",
    rarity: "Legendary",
    condition: 5,
    brand: "Akrapovič",
    price: 85000,
    image: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800&auto=format&fit=crop&q=80",
    photos: [
      { src: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800&auto=format&fit=crop&q=80", alt: "Carbon GT Wing Top Profile" },
      { src: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&auto=format&fit=crop&q=80", alt: "Billet Aluminum Mounting Feet" },
      { src: "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=800&auto=format&fit=crop&q=80", alt: "Dry Carbon Weave Close Up" }
    ],
    compatibleMake: "Universal",
    compatibleModel: "Sports Coupe / Sedan / Universal Track",
    suitableVehicles: ["Universal", "BMW 3 Series", "Mahindra Thar", "Toyota Supra", "Porsche 911"],
    compatibleVehicles: "Universal Track / Sports Coupes / BMW 3 Series / Thar Custom",
    
    // Fitment & Linking
    engineCodes: ["B58 3.0L Turbo (BMW)", "S58 3.0L Twin-Turbo (BMW M3 / M4)", "Universal / Multi-Platform"],
    chassisCodes: ["G20 / G80 (BMW 3-Series / M3)", "A90 / A91 (Toyota GR Supra)", "Universal Track / Custom Motorsport"],
    matchedVehicleIds: [1, 5],

    // Inventory & Supply Chain
    stockCount: 3,
    stockStatus: "in_stock",
    leadTime: "Immediate Dispatch (24h Express Freight)",
    lowStockThreshold: 2,

    // Moderation & Trust
    moderationStatus: "approved",
    isAutoWorldCertified: true,
    isTunerVerified: true,

    // Analytics
    inquiryCount: 42,
    bookmarkCount: 68,
    viewsCount: 1240,
    priceHistory: [
      { price: 92000, date: "2025-11-15", note: "Initial Import Batch Valuation", updatedBy: "Admin Vault" },
      { price: 85000, date: "2026-01-10", note: "Motorsport Season Festival Revision", updatedBy: "Auto World Desk" }
    ],

    // Dyno & Certifications
    dynoSheetUrl: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800",
    dynoHpGain: "Aerodynamic: +145 kg Linear Downforce @ 180 km/h",
    complianceCertificate: {
      type: "FIA GT Homologation Spec",
      certNumber: "FIA-AERO-2025-0988",
      verifiedBy: "Motorsport Aerodynamics Bureau",
      expiryDate: "2029-12-31"
    },

    purchaseDate: "Brand New Unopened",
    installationDifficulty: "Moderate (Garage Tools)",
    performanceGain: "Downforce: +145 kg @ 180 km/h",
    shippingAvailable: true,
    description: "Ultra-rigid dry carbon autoclave weave swan-neck aerodynamic wing. Designed to generate over 145 kg of linear downforce at 180 km/h with 12-position billet aluminum angle adjustment mounts.",
    partNumber: "AKR-GTW-7740",
    warranty: "2 Years Manufacturer Replacement",
    specifications: {
      "Material": "Pre-Preg Toray 3K Dry Carbon Fiber",
      "Downforce Output": "145 kg @ 180 km/h",
      "Total Weight": "3.4 kg",
      "Mounting Kit": "CNC T6-6061 Billet Aluminum Brackets",
      "Span Width": "1,480 mm",
      "Finish": "UV Gloss Clear Resin Coated"
    },
    badge: "premium",
    sellerName: "AeroDynamics Studio Mumbai",
    sellerPhone: "+91 98200 11988",
    sellerEmail: "sales@aerodynamics.in",
    location: "Mumbai, Maharashtra",
    negotiable: "yes",
    status: "active"
  },
  {
    id: 2,
    title: "Garrett GTX3582R Gen II Twin-Scroll Ball-Bearing Turbocharger",
    category: "turbo",
    rarity: "Legendary",
    condition: 5,
    brand: "Garrett Motion",
    price: 165000,
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&auto=format&fit=crop&q=80",
    photos: [
      { src: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&auto=format&fit=crop&q=80", alt: "Garrett Gen II Billet Compressor" },
      { src: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=800&auto=format&fit=crop&q=80", alt: "Twin Scroll Turbine Housing" }
    ],
    compatibleMake: "Universal",
    compatibleModel: "2.0L - 4.5L Tuned Petrol/Diesel Engines",
    suitableVehicles: ["Universal", "BMW 3 Series", "Toyota Fortuner", "Mahindra Thar", "Volkswagen Virtus"],
    compatibleVehicles: "Universal Fitment / T4 Twin-Scroll Flange / 2.0L - 4.5L Engines",
    
    // Fitment & Linking
    engineCodes: ["B58 3.0L Turbo (BMW)", "EA888 Gen 3/4 2.0T (VAG / Skoda / Audi)", "2JZ-GTE / 2JZ-GE 3.0L (Toyota)", "mStallion 2.0L TGDi (Mahindra)"],
    chassisCodes: ["G20 / G80 (BMW 3-Series / M3)", "MQB Platform (Octavia / Superb / Virtus / Golf)", "A90 / A91 (Toyota GR Supra)", "Thar Gen-2 / Thar Roxx (Mahindra)"],
    matchedVehicleIds: [1, 2, 5],

    // Inventory & Supply Chain
    stockCount: 1,
    stockStatus: "in_stock",
    leadTime: "Low Stock Alert (1 Unit Remaining in Mumbai Vault)",
    lowStockThreshold: 2,

    // Moderation & Trust
    moderationStatus: "approved",
    isAutoWorldCertified: true,
    isTunerVerified: true,

    // Analytics
    inquiryCount: 58,
    bookmarkCount: 94,
    viewsCount: 2180,
    priceHistory: [
      { price: 175000, date: "2025-10-01", note: "Gen-II Launch MSRP", updatedBy: "Garrett Distribution" },
      { price: 165000, date: "2026-02-01", note: "Tier-1 Auto World Exclusive Partner Price", updatedBy: "Admin Vault" }
    ],

    // Dyno & Certifications
    dynoSheetUrl: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800",
    dynoHpGain: "+210 WHP / +280 Nm Peak Boost Gain",
    complianceCertificate: {
      type: "TÜV Rheinland Certified & ISO 9001",
      certNumber: "TUV-DE-TURBO-77192",
      verifiedBy: "TÜV Product Service GmbH",
      expiryDate: "2030-06-30"
    },

    purchaseDate: "1 Month Ago",
    installationDifficulty: "Professional (Tuner Required)",
    performanceGain: "+180 HP to +450 HP (Up to 850 HP Capacity)",
    shippingAvailable: true,
    description: "Fully forged machined 10-blade point milled billet compressor wheel with dual ceramic ball bearing CHRA. Ceramic coated high-flow nickel alloy turbine housing for instantaneous spool-up response.",
    partNumber: "GRT-GTX3582R-II",
    warranty: "1 Year Official Garrett Warranty",
    specifications: {
      "Compressor Inducer": "66 mm Billet Aerofoil",
      "Turbine Wheel Exducer": "68 mm Inconel Alloy",
      "Bearing System": "Dual Ceramic Ball-Bearing",
      "Cooling": "Water & Oil Cooled CHRA",
      "Flange Type": "T4 Twin Scroll Divided"
    },
    badge: "hot",
    sellerName: "BoostKraft Performance Hub",
    sellerPhone: "+91 98450 77120",
    sellerEmail: "tuning@boostkraft.co.in",
    location: "Bengaluru, Karnataka",
    negotiable: "yes",
    status: "active"
  },
  {
    id: 3,
    title: "NOS Direct-Port Multi-Point Nitrous Delivery Kit",
    category: "nitro",
    rarity: "Epic",
    condition: 5,
    brand: "NOS (Holley)",
    price: 120000,
    image: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&auto=format&fit=crop&q=80",
    photos: [
      { src: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&auto=format&fit=crop&q=80", alt: "NOS 10lb Aluminum Bottle" },
      { src: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800&auto=format&fit=crop&q=80", alt: "Solenoids and Fogger Nozzles" }
    ],
    compatibleMake: "Universal",
    compatibleModel: "V6 / V8 / 4-Cylinder Petrol Performance Cars",
    suitableVehicles: ["Universal", "Mahindra Thar Petrol", "BMW 3 Series", "Polo GT"],
    compatibleVehicles: "V6 / V8 / Tuned 4-Cylinder Petrol (Thar Petrol / BMW / Polo GT)",
    
    // Fitment & Linking
    engineCodes: ["mStallion 2.0L TGDi (Mahindra)", "B58 3.0L Turbo (BMW)", "Universal / Multi-Platform"],
    chassisCodes: ["Thar Gen-2 / Thar Roxx (Mahindra)", "G20 / G80 (BMW 3-Series / M3)", "6R / 6C (Volkswagen Polo GT)"],
    matchedVehicleIds: [1, 2],

    // Inventory & Supply Chain
    stockCount: 0,
    stockStatus: "custom_order",
    leadTime: "Custom Order Lead Time: 2–3 Weeks (US Holley Import)",
    lowStockThreshold: 1,

    // Moderation & Trust
    moderationStatus: "approved",
    isAutoWorldCertified: true,
    isTunerVerified: true,

    // Analytics
    inquiryCount: 29,
    bookmarkCount: 45,
    viewsCount: 980,
    priceHistory: [
      { price: 120000, date: "2026-01-05", note: "Direct Import Price Tag", updatedBy: "Apex Racing" }
    ],

    // Dyno & Certifications
    dynoSheetUrl: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800",
    dynoHpGain: "+125 WHP Instantaneous Nitrous Shot Boost",
    complianceCertificate: {
      type: "DOT-3AL High Pressure Cylinder Spec",
      certNumber: "DOT-3AL-1800-PSI",
      verifiedBy: "US Department of Transportation Approved",
      expiryDate: "2031-10-01"
    },

    purchaseDate: "Brand New Unopened",
    installationDifficulty: "Professional (Tuner Required)",
    performanceGain: "+75 HP to +150 HP Instant Shot",
    shippingAvailable: true,
    description: "Complete 10 lb blue aluminum bottle nitrous delivery kit with high-pressure braided stainless steel lines, purge valve kit, and programmable progressive micro-pulse controller delivering 75 HP to 150 HP instantaneous shots.",
    partNumber: "NOS-05130-V2",
    warranty: "1 Year Performance Warranty",
    specifications: {
      "Bottle Volume": "10 lbs High-Pressure Alloy",
      "Power Boost": "+75 BHP to +150 BHP Shot",
      "Injection Style": "Direct-Port Wet Fogger Nozzles",
      "Operating Pressure": "900 - 1050 PSI",
      "Safety": "Dual Blow-Down Tubes & Fuel Pressure Switch"
    },
    badge: "hot",
    sellerName: "Apex Racing Bengaluru",
    sellerPhone: "+91 98450 77120",
    sellerEmail: "tuning@apexracing.co.in",
    location: "Bengaluru, Karnataka",
    negotiable: "yes",
    status: "active"
  },
  {
    id: 4,
    title: "Adaptive Matrix Laser LED Projector Headlight Set",
    category: "headlight",
    rarity: "Rare",
    condition: 4,
    brand: "Bosch Motorsport",
    price: 68000,
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&auto=format&fit=crop&q=80",
    photos: [
      { src: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&auto=format&fit=crop&q=80", alt: "Matrix Laser Lens Active Beam" },
      { src: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&auto=format&fit=crop&q=80", alt: "Thar Headlight Housing Fitment" }
    ],
    compatibleMake: "Mahindra",
    compatibleModel: "Thar (2020-2024) / Wrangler / Defender 7-Inch",
    suitableVehicles: ["Mahindra Thar", "Jeep Wrangler", "Land Rover Defender"],
    compatibleVehicles: "Mahindra Thar (2020-2024) / Wrangler / Defender Retrofit",
    
    // Fitment & Linking
    engineCodes: ["mHawk 2.2L CRDe (Mahindra)", "mStallion 2.0L TGDi (Mahindra)", "Universal / Multi-Platform"],
    chassisCodes: ["Thar Gen-2 / Thar Roxx (Mahindra)"],
    matchedVehicleIds: [2],

    // Inventory & Supply Chain
    stockCount: 4,
    stockStatus: "in_stock",
    leadTime: "Immediate Dispatch (Delhi NCR & All-India Delivery)",
    lowStockThreshold: 2,

    // Moderation & Trust
    moderationStatus: "approved",
    isAutoWorldCertified: true,
    isTunerVerified: true,

    // Analytics
    inquiryCount: 51,
    bookmarkCount: 82,
    viewsCount: 1650,
    priceHistory: [
      { price: 72000, date: "2025-09-12", note: "Original List Price", updatedBy: "TharMods" },
      { price: 68000, date: "2025-12-20", note: "Winter Offroad Promo Discount", updatedBy: "TharMods" }
    ],

    // Dyno & Certifications
    dynoSheetUrl: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800",
    dynoHpGain: "16,000 Lumens / 600m High-Beam Throw Range",
    complianceCertificate: {
      type: "AIS-004 Automotive Lighting Certified (ARAI / iCAT)",
      certNumber: "AIS-004-DL-9844",
      verifiedBy: "Automotive Research Association of India",
      expiryDate: "2028-08-15"
    },

    purchaseDate: "3 Months Ago",
    installationDifficulty: "Easy (Plug & Play)",
    performanceGain: "Visibility: 16,000 Lumens / 600m Laser Beam",
    shippingAvailable: true,
    description: "7-inch circular military-grade sealed projector headlights featuring active matrix laser diode high-beams reaching up to 600 meters. Includes sweeping dynamic amber sequential turn signals and integrated DRL halo rings.",
    partNumber: "BOS-LSR-701A",
    warranty: "3 Years Waterproofing Warranty",
    specifications: {
      "Luminous Flux": "16,000 Lumens Combined",
      "Color Temperature": "5,700K Daylight White",
      "Ingress Rating": "IP68 Submersible Waterproof",
      "Beam Reach": "600 Meters Laser Projection",
      "Input Voltage": "9V - 32V DC"
    },
    badge: "verified",
    sellerName: "TharMods Custom Works",
    sellerPhone: "+91 97170 33499",
    sellerEmail: "info@tharmods.in",
    location: "New Delhi, Delhi",
    negotiable: "yes",
    status: "active"
  },
  {
    id: 5,
    title: "Akrapovič Evolution Titanium Valved Exhaust System",
    category: "exhaust",
    rarity: "Legendary",
    condition: 5,
    brand: "Akrapovič",
    price: 340000,
    image: "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=800&auto=format&fit=crop&q=80",
    photos: [
      { src: "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=800&auto=format&fit=crop&q=80", alt: "Titanium Headers and Valved Mufflers" },
      { src: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800&auto=format&fit=crop&q=80", alt: "Matte Carbon Fiber Tailpipe Sleeves" }
    ],
    compatibleMake: "BMW",
    compatibleModel: "3 Series G20 (330i / M340i)",
    suitableVehicles: ["BMW 3 Series G20", "BMW M340i xDrive", "BMW 4 Series"],
    compatibleVehicles: "BMW 3 Series G20 / Fortuner 2.8L / Custom Performance Sedans",
    
    // Fitment & Linking
    engineCodes: ["B58 3.0L Turbo (BMW)", "S58 3.0L Twin-Turbo (BMW M3 / M4)"],
    chassisCodes: ["G20 / G80 (BMW 3-Series / M3)", "F87 / G87 (BMW M2 Coupe)"],
    matchedVehicleIds: [1],

    // Inventory & Supply Chain
    stockCount: 2,
    stockStatus: "in_stock",
    leadTime: "Immediate Dispatch (Insured Wooden Crate Freight)",
    lowStockThreshold: 2,

    // Moderation & Trust
    moderationStatus: "approved",
    isAutoWorldCertified: true,
    isTunerVerified: true,

    // Analytics
    inquiryCount: 47,
    bookmarkCount: 110,
    viewsCount: 3100,
    priceHistory: [
      { price: 360000, date: "2025-08-10", note: "Euro Exchange Rate Adjustment", updatedBy: "Auto World Imports" },
      { price: 340000, date: "2026-01-15", note: "Direct Dealership Inventory Stock Liquidation", updatedBy: "Supercar Sound Lab" }
    ],

    // Dyno & Certifications
    dynoSheetUrl: "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=800",
    dynoHpGain: "+14.2 WHP @ 5,400 RPM / -12.4 kg Net Weight Loss",
    complianceCertificate: {
      type: "EC/ECE Type-Approved Street Legal Acoustics",
      certNumber: "e26*03*0049*00",
      verifiedBy: "Slovenian National Automotive Authority",
      expiryDate: "2032-12-31"
    },

    purchaseDate: "Brand New Unopened",
    installationDifficulty: "Moderate (Garage Tools)",
    performanceGain: "+14.2 HP @ 5,400 RPM / -12.4 kg Weight Saving",
    shippingAvailable: true,
    description: "Aerospace-grade ultralight titanium full cat-back exhaust with vacuum-actuated dual active valves. Delivers a deep resonant motorsport acoustics profile while shedding 12.4 kg compared to OEM stainless systems.",
    partNumber: "S-BM/T/10H",
    warranty: "3 Years Factory Acoustic Warranty",
    specifications: {
      "Material": "Austenitic Grade 5 Titanium Alloy",
      "Weight Reduction": "-12.4 kg (-48% vs OEM)",
      "Power Gain": "+14.2 HP @ 5,400 RPM",
      "Sound Control": "Wireless Keyfob Controlled Dual Exhaust Flaps",
      "Tailpipes": "Quad Matte Carbon Outer Sleeves"
    },
    badge: "premium",
    sellerName: "Supercar Sound Lab",
    sellerPhone: "+91 99300 48821",
    sellerEmail: "contact@supercarsoundlab.com",
    location: "Mumbai, Maharashtra",
    negotiable: "yes",
    status: "active"
  },
  {
    id: 6,
    title: "BBS Super RS 19-Inch Forged Center-Lock Wheel Set",
    category: "wheels",
    rarity: "Epic",
    condition: 4,
    brand: "BBS Motorsport",
    price: 290000,
    image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80",
    photos: [
      { src: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80", alt: "BBS Super RS 19 Inch Front Wheel" },
      { src: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800&auto=format&fit=crop&q=80", alt: "Polished Step Lip and Gold Hardware" }
    ],
    compatibleMake: "Universal",
    compatibleModel: "5x112 & 5x120 PCD Fitment",
    suitableVehicles: ["Universal", "BMW 3 Series", "Mercedes C-Class", "Audi A4", "Skoda Octavia vRS", "Volkswagen Virtus"],
    compatibleVehicles: "5x112 / 5x120 Universal Bolt PCD (BMW, Mercedes, Audi, Skoda, Thar with adapter)",
    
    // Fitment & Linking
    engineCodes: ["B58 3.0L Turbo (BMW)", "EA888 Gen 3/4 2.0T (VAG / Skoda / Audi)", "Universal / Multi-Platform"],
    chassisCodes: ["G20 / G80 (BMW 3-Series / M3)", "MQB Platform (Octavia / Superb / Virtus / Golf)", "W205 / W206 (Mercedes-Benz C-Class)"],
    matchedVehicleIds: [1, 4],

    // Inventory & Supply Chain
    stockCount: 1,
    stockStatus: "in_stock",
    leadTime: "1 Complete Set (4 Wheels) in Chennai Vault",
    lowStockThreshold: 1,

    // Moderation & Trust
    moderationStatus: "approved",
    isAutoWorldCertified: true,
    isTunerVerified: true,

    // Analytics
    inquiryCount: 34,
    bookmarkCount: 76,
    viewsCount: 1420,
    priceHistory: [
      { price: 310000, date: "2025-11-01", note: "Original German Consignment", updatedBy: "EuroWheels" },
      { price: 290000, date: "2026-01-20", note: "Adjusted for Fast Clearance", updatedBy: "EuroWheels" }
    ],

    // Dyno & Certifications
    dynoSheetUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800",
    dynoHpGain: "Unsprung Mass Reduction: -3.8 kg Per Corner",
    complianceCertificate: {
      type: "JWL / VIA Japanese Light Alloy Wheel Standard",
      certNumber: "JWL-VIA-BBS-1988",
      verifiedBy: "Vehicle Inspection Association of Japan",
      expiryDate: "2030-12-31"
    },

    purchaseDate: "6 Months Ago",
    installationDifficulty: "Easy (Plug & Play)",
    performanceGain: "Unsprung Weight: 8.85 kg per wheel",
    shippingAvailable: true,
    description: "Iconic timeless cross-spoke 2-piece forged aluminum wheel rim set. Diamond-cut polished lips with gold titanium hardware assembly bolts, providing extreme rotational rigidity and lightweight unsprung mass.",
    partNumber: "BBS-RS19-85ET35",
    warranty: "Lifetime Structural Integrity",
    specifications: {
      "Rim Dimensions": "19x8.5J Front / 19x9.5J Rear",
      "PCD Fitment": "5x112 & 5x120 Dual Drilling",
      "Offset (ET)": "+35mm Front / +40mm Rear",
      "Weight per Wheel": "8.85 kg",
      "Center Caps": "Genuine BBS Carbon-Gold 3D Caps"
    },
    badge: "verified",
    sellerName: "EuroWheels Heritage",
    sellerPhone: "+91 98840 99112",
    sellerEmail: "sales@eurowheels.in",
    location: "Chennai, Tamil Nadu",
    negotiable: "yes",
    status: "active"
  }
];

export interface AuctionBid {
  id: string;
  bidderUid: string;
  bidderName: string;
  bidderPhoto?: string;
  amount: number;
  timestamp: string;
  isAutoBid?: boolean;
}

export interface Auction {
  id: string;
  title: string;
  vehicleRefId?: number | string;
  make: string;
  model: string;
  year: number;
  image: string;
  photos: { src: string; alt: string }[];
  startingBid: number;
  currentBid: number;
  bidCount: number;
  minIncrement: number;
  reservePrice: number;
  isReserveMet: boolean;
  startTime: string;
  endTime: string;
  status: "live" | "upcoming" | "ended" | "settled";
  bids: AuctionBid[];
  sellerUid: string;
  sellerName: string;
  sellerPhone: string;
  sellerEmail: string;
  location: string;
  condition: number;
  mileage: string;
  fuel: string;
  transmission: string;
  engineSoundUrl?: string;
  engineSoundTitle?: string;
  engineSoundType?: string;
  specs?: Record<string, string>;
  highlights?: string[];
  verifiedOnly?: boolean;
  winnerUid?: string;
  winnerName?: string;
  winningBid?: number;
  featured?: boolean;
}

export interface OfferedTradeVehicle {
  title: string;
  make: string;
  model: string;
  year: number;
  valuation: number;
  mileage: string;
  fuel: string;
  condition: number;
  image: string;
  photos?: { src: string; alt: string }[];
  engine?: string;
  transmission?: string;
  location?: string;
  rtoCode?: string;
  description?: string;
  features?: string[];
}

export interface DesiredTradeVehicle {
  targetMake?: string;
  targetModel?: string;
  targetType?: string;
  yearMin?: number;
  yearMax?: number;
  maxCashAdded?: number;
  minCashReceived?: number;
  notes?: string;
}

export interface ExchangeRequest {
  id: string;
  creatorUid: string;
  creatorName: string;
  creatorEmail: string;
  creatorPhone: string;
  creatorPhoto?: string;
  offeredVehicle: OfferedTradeVehicle;
  desiredVehicle: DesiredTradeVehicle;
  cashDirection: "pay_difference" | "receive_difference" | "even_swap";
  cashDelta: number;
  status: "active" | "matched" | "completed" | "cancelled";
  offersCount?: number;
  location: string;
  createdAt: string;
  updatedAt?: string;
  badge?: "verified" | "hot" | "vip";
}

export interface TradeOffer {
  id: string;
  exchangeRequestId: string;
  targetCreatorUid: string;
  proposerUid: string;
  proposerName: string;
  proposerEmail: string;
  proposerPhone: string;
  proposerVehicle: OfferedTradeVehicle;
  calculatedDelta: number;
  cashDirection: "proposer_pays" | "proposer_receives" | "even_swap";
  cashOfferAmount: number;
  note: string;
  status: "pending" | "accepted" | "rejected" | "countered";
  createdAt: string;
}

export const DEFAULT_AUCTIONS: Auction[] = [
  {
    id: "auc-001",
    title: "2023 Porsche 911 Carrera S (992)",
    make: "Porsche",
    model: "911 Carrera S",
    year: 2023,
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&auto=format&fit=crop&q=80",
    photos: [
      { src: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&auto=format&fit=crop&q=80", alt: "Guards Red 911 Front 3/4" },
      { src: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800&auto=format&fit=crop&q=80", alt: "Aerokit Rear Spoiler Profile" },
      { src: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&auto=format&fit=crop&q=80", alt: "RS Spyder Wheel Detail" }
    ],
    startingBid: 12500000,
    currentBid: 14850000,
    bidCount: 14,
    minIncrement: 50000,
    reservePrice: 15000000,
    isReserveMet: false,
    startTime: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
    endTime: new Date(Date.now() + 10 * 3600 * 1000).toISOString(),
    status: "live",
    bids: [
      { id: "b1", bidderUid: "bidder-3", bidderName: "Vikram Singhania", amount: 13000000, timestamp: "4 hours ago" },
      { id: "b2", bidderUid: "bidder-2", bidderName: "Karan Oberoi", amount: 13800000, timestamp: "2 hours ago" },
      { id: "b3", bidderUid: "bidder-1", bidderName: "Rohit Malhotra", amount: 14500000, timestamp: "45 mins ago" },
      { id: "b4", bidderUid: "bidder-4", bidderName: "Aditya Roy", amount: 14850000, timestamp: "8 mins ago" }
    ],
    sellerUid: "afrojalamansari461@gmail.com",
    sellerName: "Auto World Vault Direct",
    sellerPhone: "+91 98200 44112",
    sellerEmail: "auctions@autoworld.in",
    location: "Mumbai, Maharashtra",
    condition: 5,
    mileage: "4,850 km",
    fuel: "Petrol",
    transmission: "8-Speed PDK",
    engineSoundUrl: "preset:bmw_twinpower_turbo",
    engineSoundTitle: "3.0L Twin-Turbo Flat-Six High Revs",
    engineSoundType: "supercar",
    specs: {
      "Engine": "3.0L Twin-Turbo Boxer 6 (443 HP)",
      "0-100 km/h": "3.5 Seconds (Sport Chrono)",
      "Top Speed": "308 km/h",
      "Interior": "Black Club Leather with Crayon Stitching",
      "Exhaust": "Sport Exhaust System with Silver Tailpipes",
      "RTO": "MH-01 (Mumbai South - Single Owner)"
    },
    highlights: [
      "Zero accident record with 111-point Porsche official inspection",
      "Sport Chrono Package with Mode Switch & Track Precision App",
      "Full Body PPF (XPEL Ultimate Plus) with 10-year warranty",
      "Factory Sports Exhaust with active Valvetronic flaps"
    ],
    verifiedOnly: true,
    featured: true
  },
  {
    id: "auc-002",
    title: "2022 BMW M3 Competition xDrive",
    make: "BMW",
    model: "M3 Competition",
    year: 2022,
    image: "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&auto=format&fit=crop&q=80",
    photos: [
      { src: "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&auto=format&fit=crop&q=80", alt: "Isle of Man Green Exterior" },
      { src: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800&auto=format&fit=crop&q=80", alt: "Carbon Bucket Cockpit" }
    ],
    startingBid: 8200000,
    currentBid: 9650000,
    bidCount: 19,
    minIncrement: 50000,
    reservePrice: 9500000,
    isReserveMet: true,
    startTime: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
    endTime: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
    status: "live",
    bids: [
      { id: "bm1", bidderUid: "bidder-7", bidderName: "Siddharth Jain", amount: 8800000, timestamp: "6 hours ago" },
      { id: "bm2", bidderUid: "bidder-8", bidderName: "Anand Mahindra Club", amount: 9200000, timestamp: "3 hours ago" },
      { id: "bm3", bidderUid: "bidder-9", bidderName: "Rohan Kapoor", amount: 9650000, timestamp: "12 mins ago" }
    ],
    sellerUid: "afrojalamansari461@gmail.com",
    sellerName: "Motorsport Heritage Delhi",
    sellerPhone: "+91 98110 55890",
    sellerEmail: "m3@autoworld.in",
    location: "New Delhi (DL)",
    condition: 5,
    mileage: "11,200 km",
    fuel: "Petrol",
    transmission: "M Steptronic with Drivelogic",
    engineSoundUrl: "preset:bmw_twinpower_turbo",
    engineSoundTitle: "3.0L S58 Twin-Turbo Inline-6 M Exhaust",
    engineSoundType: "i4_turbo",
    specs: {
      "Engine": "3.0L S58 M TwinPower Turbo (503 HP)",
      "Drivetrain": "M xDrive with 2WD Drift Mode",
      "0-100 km/h": "3.4 Seconds",
      "Color": "Isle of Man Green Metallic",
      "Seats": "M Carbon Fiber Bucket Seats"
    },
    highlights: [
      "Reserve Price MET! Current highest bidder will win when timer expires",
      "BMW Service Inclusive Plus active till 2027",
      "M Carbon Exterior Package & Carbon Ceramic Brakes",
      "Harman Kardon Surround Sound & Head-Up Display"
    ],
    verifiedOnly: true,
    featured: true
  },
  {
    id: "auc-003",
    title: "2023 Land Rover Defender 110 V8 Carpathian Edition",
    make: "Land Rover",
    model: "Defender 110 V8",
    year: 2023,
    image: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80",
    photos: [
      { src: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80", alt: "Carpathian Grey Satin Defender" }
    ],
    startingBid: 16000000,
    currentBid: 16000000,
    bidCount: 0,
    minIncrement: 100000,
    reservePrice: 18500000,
    isReserveMet: false,
    startTime: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
    endTime: new Date(Date.now() + 28 * 3600 * 1000).toISOString(),
    status: "upcoming",
    bids: [],
    sellerUid: "afrojalamansari461@gmail.com",
    sellerName: "Royal British Motors",
    sellerPhone: "+91 98450 11990",
    sellerEmail: "defender@autoworld.in",
    location: "Bengaluru, Karnataka",
    condition: 5,
    mileage: "8,900 km",
    fuel: "Petrol Supercharged",
    transmission: "8-Speed Automatic",
    engineSoundUrl: "preset:diesel_mhawk",
    engineSoundTitle: "5.0L Supercharged V8 Deep Roar",
    engineSoundType: "diesel",
    specs: {
      "Engine": "5.0L Supercharged V8 (518 HP / 625 Nm)",
      "Color": "Carpathian Grey with Satin Protective Wrap",
      "Wheels": "22-Inch Gloss Black Style 5098",
      "Offroad": "Electronic Air Suspension & Terrain Response 2 with Dynamic Mode"
    },
    highlights: [
      "Bidding floor opens in 4 hours! Pre-register your bid token",
      "Quad outboard-mounted satin chrome exhaust pipes",
      "Ebony Windsor Leather with Dinamica Suedecloth accents",
      "ClearSight Ground View and 3D Surround Camera"
    ],
    verifiedOnly: true,
    featured: false
  }
];

export const DEFAULT_EXCHANGES: ExchangeRequest[] = [
  {
    id: "exc-001",
    creatorUid: "trade-user-1",
    creatorName: "Rahul Deshmukh",
    creatorEmail: "rahul.deshmukh@gmail.com",
    creatorPhone: "+91 98220 11456",
    offeredVehicle: {
      title: "2023 Mahindra Thar 4x4 LX Hardtop (Diesel AT)",
      make: "Mahindra",
      model: "Thar",
      year: 2023,
      valuation: 1650000,
      mileage: "12,400 km",
      fuel: "Diesel",
      condition: 5,
      image: "https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800&auto=format&fit=crop&q=80",
      engine: "2.2L mHawk Diesel (130 bhp)",
      transmission: "Automatic 4x4",
      location: "Pune, Maharashtra",
      rtoCode: "MH-12",
      description: "Mint Napoli Black Thar with upgraded 7-inch Matrix LED headlamps, King shocks, and custom rear captain seats. Single owner, clean insurance.",
      features: ["4x4 Terrain Mode", "Apple CarPlay", "Hard Top", "Offroad Bumper", "Reverse Cam"]
    },
    desiredVehicle: {
      targetMake: "BMW",
      targetModel: "3 Series / X1 / 5 Series",
      targetType: "car",
      yearMin: 2019,
      yearMax: 2023,
      maxCashAdded: 2500000,
      notes: "Looking to swap my adventure Thar for a German luxury sedan or compact SUV. Happy to pay cash difference up to ₹25 Lakhs for low-mileage BMW or Audi."
    },
    cashDirection: "pay_difference",
    cashDelta: 2400000, // E.g. Thar (₹16.5L) vs BMW 3-Series (₹40.5L) = Owner pays ₹24.0 Lakhs
    status: "active",
    offersCount: 3,
    location: "Pune / Mumbai Corridor",
    createdAt: new Date(Date.now() - 2 * 86400 * 1000).toISOString(),
    badge: "hot"
  },
  {
    id: "exc-002",
    creatorUid: "trade-user-2",
    creatorName: "Amanjot Singh Gill",
    creatorEmail: "aman.gill@gmail.com",
    creatorPhone: "+91 98140 77233",
    offeredVehicle: {
      title: "2021 BMW 330i M-Sport (Sunset Orange)",
      make: "BMW",
      model: "3 Series",
      year: 2021,
      valuation: 4100000,
      mileage: "24,000 km",
      fuel: "Petrol",
      condition: 5,
      image: "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&auto=format&fit=crop&q=80",
      engine: "2.0L TwinPower Turbo Petrol (258 bhp)",
      transmission: "8-Speed Steptronic Sport",
      location: "Chandigarh (CH)",
      rtoCode: "CH-01",
      description: "Pristine Sunset Orange 330i M-Sport with Harman Kardon audio, sunroof, wireless CarPlay, brand new Michelin Pilot Sport 4 tyres.",
      features: ["M-Sport Aero Kit", "Sunroof", "Head-Up Display", "Adaptive Suspension", "M Brakes"]
    },
    desiredVehicle: {
      targetMake: "Toyota",
      targetModel: "Fortuner 4x4 / Hilux",
      targetType: "suv",
      yearMin: 2021,
      yearMax: 2024,
      minCashReceived: 500000,
      notes: "Need a rugged high-ground clearance 4x4 SUV for Himachal estate visits. Will swap for Fortuner Legender / 4x4 with cash difference in my favor or even swap."
    },
    cashDirection: "receive_difference",
    cashDelta: 700000, // E.g. BMW (₹41L) vs Fortuner (₹34L) = Proposer pays Aman ₹7.0 Lakhs
    status: "active",
    offersCount: 5,
    location: "Chandigarh / Delhi NCR",
    createdAt: new Date(Date.now() - 1 * 86400 * 1000).toISOString(),
    badge: "verified"
  },
  {
    id: "exc-003",
    creatorUid: "trade-user-3",
    creatorName: "Shreya Venkat",
    creatorEmail: "shreya.v@gmail.com",
    creatorPhone: "+91 98401 22987",
    offeredVehicle: {
      title: "2023 Tata Nexon EV Max XZ+ Lux",
      make: "Tata",
      model: "Nexon",
      year: 2023,
      valuation: 1550000,
      mileage: "18,200 km",
      fuel: "Electric",
      condition: 5,
      image: "https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?w=800&auto=format&fit=crop&q=80",
      engine: "40.5 kWh High Voltage Ziptron EV",
      transmission: "Single-Speed Automatic",
      location: "Bengaluru, Karnataka",
      rtoCode: "KA-01",
      description: "Single-owner EV Max with 453 km ARAI range, 7.2 kW AC fast home wallbox charger included, ventilated leatherette seats.",
      features: ["Ventilated Seats", "Wireless Charger", "Electronic Parking Brake", "Sunroof"]
    },
    desiredVehicle: {
      targetMake: "Hyundai / Kia",
      targetModel: "Creta SX(O) Turbo / Seltos GTX+",
      targetType: "suv",
      yearMin: 2022,
      yearMax: 2024,
      notes: "Switching from EV back to turbo-petrol SUV due to highway relocations. Looking for an even swap or minor cash delta."
    },
    cashDirection: "even_swap",
    cashDelta: 0,
    status: "active",
    offersCount: 2,
    location: "Bengaluru, Karnataka",
    createdAt: new Date(Date.now() - 4 * 86400 * 1000).toISOString(),
    badge: "vip"
  }
];


