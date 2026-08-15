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
}

export type PartCategory =
  | "spoiler"
  | "engine"
  | "nitro"
  | "headlight"
  | "exhaust"
  | "wheels"
  | "suspension"
  | "turbo"
  | "brakes"
  | "ecu_tuning"
  | "body_kit"
  | "other";

export type PartRarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";

export interface Part {
  id: number | string;
  title: string;
  category: PartCategory;
  rarity: PartRarity;
  condition: 1 | 2 | 3 | 4 | 5;
  brand: string;
  price: number;
  image: string;
  photos?: { src: string; alt: string }[];
  compatibleVehicles: string;
  description: string;
  specifications?: Record<string, string>;
  sellerName?: string;
  sellerPhone?: string;
  sellerEmail?: string;
  location?: string;
  negotiable?: string;
  badge?: "verified" | "premium" | "hot" | null;
  status?: "pending" | "active" | "sold" | "hidden";
  isUserListing?: boolean;
  listingId?: string;
  datePosted?: string;
  partNumber?: string;
  warranty?: string;
}

export interface UserPartListing {
  id: string;
  title: string;
  category: PartCategory;
  rarity: PartRarity;
  condition: number;
  brand: string;
  price: number;
  compatibleVehicles: string;
  description: string;
  negotiable: string;
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
  { id: "spoiler", label: "Spoilers & Aero Wings", icon: "Wind", description: "Pre-preg carbon fiber wings, active splitters, and ducktail diffusers" },
  { id: "engine", label: "Crate Engines & Internals", icon: "Cpu", description: "Forged pistons, high-lift camshafts, and complete race-spec blocks" },
  { id: "nitro", label: "Nitrous Oxide Systems", icon: "Zap", description: "Direct-port wet fogger systems, solenoid valves, and bottle warmers" },
  { id: "headlight", label: "Matrix Laser Headlights", icon: "Lightbulb", description: "Adaptive laser clusters, tinted crystal lenses, and dynamic indicators" },
  { id: "exhaust", label: "Titanium Exhaust Systems", icon: "Flame", description: "Valvetronic headers, decat downpipes, and scorched titanium tips" },
  { id: "turbo", label: "Turbochargers & Blowers", icon: "Disc", description: "Dual ceramic ball-bearing turbos, blow-off valves, and intercoolers" },
  { id: "wheels", label: "Forged Alloy Wheels", icon: "CircleDot", description: "Multi-piece forged center-lock and lightweight alloy wheel rims" },
  { id: "suspension", label: "Coilovers & Air Bags", icon: "Activity", description: "Track-spec adjustable dampers, camber plates, and pneumatic air suspension" },
  { id: "brakes", label: "Carbon Ceramic Brakes", icon: "Disc3", description: "Monobloc multi-piston calipers, slotted rotors, and race brake pads" },
  { id: "ecu_tuning", label: "ECU & Standalone Tuners", icon: "Sliders", description: "Piggyback tuners, standalone engine management, and quick-shifters" },
  { id: "body_kit", label: "Widebody & Carbon Kits", icon: "Layers", description: "Fender flares, vented carbon hoods, side skirts, and rear diffusers" },
  { id: "other", label: "Cabin & Track Accessories", icon: "Wrench", description: "FIA-rated harness bars, bucket seats, gauges, and short shifters" }
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
    compatibleVehicles: "Universal Track / Sports Coupes / BMW 3 Series / Thar Custom",
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
    title: "NOS Direct-Port Multi-Point Nitrous System",
    category: "nitro",
    rarity: "Epic",
    condition: 5,
    brand: "NOS (Holley)",
    price: 120000,
    image: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&auto=format&fit=crop&q=80",
    compatibleVehicles: "V6 / V8 / Tuned 4-Cylinder Petrol (Thar Petrol / BMW / Polo GT)",
    description: "Complete 10 lb blue aluminum bottle nitrous delivery kit with high-pressure braided stainless steel lines, purge valve kit, and programmable progressive micro-pulse controller delivering 75 HP to 150 HP instantaneous shots.",
    partNumber: "NOS-05130-V2",
    warranty: "1 Year Performance Warranty",
    specifications: {
      "Bottle Volume": "10 lbs High-Pressure Alloy",
      "Power Boost": "+75 BHP to +150 BHP Shot",
      "Injection Style": "Direct-Port Wet Fogger Nozzles",
      "Operating Pressure": "900 - 1050 PSI",
      "Safety": "Dual Blow-Down Tubes & Electronic Fuel Pressure Safety Switch"
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
    id: 3,
    title: "Cosworth Stage 3 Billet 3.0L Crate Engine Assembly",
    category: "engine",
    rarity: "Legendary",
    condition: 5,
    brand: "Cosworth Engineering",
    price: 850000,
    image: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=800&auto=format&fit=crop&q=80",
    compatibleVehicles: "BMW 3/M3 / Toyota Supra / Bespoke Track Restomods",
    description: "Fully balanced and blueprinted inline-6 closed-deck billet block. Loaded with forged Cosworth pistons, H-beam titanium rods, high-lift dual overhead cams, and inconel valvetrain rated for 720+ horsepower on 100 octane fuel.",
    partNumber: "COS-ENG-I6-720",
    warranty: "6 Months / 10,000 km Track Limited Warranty",
    specifications: {
      "Engine Displacement": "2,998 cc (3.0 Liters)",
      "Peak Power Output": "720 BHP @ 7,600 RPM",
      "Peak Torque": "860 Nm @ 3,200 RPM",
      "Compression Ratio": "9.8:1 Forged Turbo Spec",
      "Dry Weight": "164 kg"
    },
    badge: "premium",
    sellerName: "Cosworth India Authorized",
    sellerPhone: "+91 98110 55344",
    sellerEmail: "desk@cosworthindia.com",
    location: "Gurugram, NCR",
    negotiable: "no",
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
    compatibleVehicles: "Mahindra Thar (2020-2024) / Wrangler / Defender Retrofit",
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
    compatibleVehicles: "BMW 3 Series G20 / Fortuner 2.8L / Custom Performance Sedans",
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
    compatibleVehicles: "5x112 / 5x120 Universal Bolt PCD (BMW, Mercedes, Audi, Skoda, Thar with adapter)",
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

