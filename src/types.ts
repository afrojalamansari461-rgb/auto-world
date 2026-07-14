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
  status?: "pending" | "active" | "sold";
  photos?: { src: string; alt: string }[];
  engine?: string;
  color?: string;
  owners?: string;
  regNumber?: string;
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
  featured?: boolean;
  urgent?: boolean;
  verified?: boolean;
  photos: { src: string; alt: string }[];
  datePosted: string;
  status: "pending" | "active" | "sold";
  engine?: string;
  color?: string;
  owners?: string;
  regNumber?: string;
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
    image: "https://images.unsplash.com/photo-494976388531-d1058494cdd8?w=800&auto=format&fit=crop&q=80",
    make: "Maruti Suzuki",
    model: "Swift",
    year: 2022,
    mileage: "12,200 km",
    fuel: "Petrol",
    transmission: "Manual",
    badge: "verified",
    category: "car",
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
