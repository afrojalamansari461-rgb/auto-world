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
  photos: { src: string; alt: string }[];
  datePosted: string;
  status: "active" | "sold";
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
    price: 18900,
    image: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&auto=format&fit=crop&q=80",
    make: "Mahindra",
    model: "Thar",
    year: 2023,
    mileage: "11,200 km",
    fuel: "Diesel",
    transmission: "Manual",
    badge: "premium",
    category: "suv",
    description: "Muscular and iconic Mahindra Thar 4x4 LX. Pure adventure machinery with heavy key diesel torque, modern hardtop cabin design, Apple CarPlay integration, dual airbags, and high-clearance offroad specs.",
    features: ["ABS", "Airbags", "Bluetooth", "Backup Camera", "4WD Terrain Control", "Climate Control"]
  },
  {
    id: 2,
    title: "Tata Nexon EV Max 2023",
    price: 19500,
    image: "https://images.unsplash.com/photo-1563720223185-11003d516935?w=800&auto=format&fit=crop&q=80",
    make: "Tata",
    model: "Nexon",
    year: 2023,
    mileage: "14,500 km",
    fuel: "Electric",
    transmission: "Automatic",
    badge: "verified",
    category: "suv",
    description: "India's highest-selling premium electric SUV. Instant traction with high-voltage Ziptron tech, long-range battery supporting DC fast hubs, elegant dual-tone roof, and advanced active regeneration modes.",
    features: ["Air Conditioning", "ABS", "Airbags", "Bluetooth", "Backup Camera", "Sunroof/Moonroof", "Ventilated Seats"]
  },
  {
    id: 3,
    title: "Royal Enfield Classic 350 2022",
    price: 3499,
    image: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&auto=format&fit=crop&q=80",
    make: "Royal Enfield",
    model: "Classic 350",
    year: 2022,
    mileage: "6,800 km",
    fuel: "Petrol",
    transmission: "Manual",
    badge: "hot",
    category: "motorcycle",
    description: "Timeless classic mechanical engineering. Butter-smooth 349cc J-series cruiser engine, pristine signature chrome-black detailing, dual-channel responsive ABS, and single-owner vintage aesthetics.",
    features: ["ABS", "Fuel Injection", "Retro Spoke Wheels", "Vintage Styling"]
  },
  {
    id: 4,
    title: "Toyota Camry 2022",
    price: 24999,
    image: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80",
    make: "Toyota",
    model: "Camry",
    year: 2022,
    mileage: "18,500 mi",
    fuel: "Petrol",
    transmission: "Automatic",
    badge: "verified",
    category: "car",
    description: "One owner, immaculate condition. Includes lane departure warnings, Adaptive Cruise Control, premium leather seat trim, and dynamic steering support.",
    features: ["Air Conditioning", "ABS", "Airbags", "Bluetooth", "Backup Camera", "Lane Assist"]
  },
  {
    id: 5,
    title: "Honda Civic 2023",
    price: 28500,
    image: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&auto=format&fit=crop&q=80",
    make: "Honda",
    model: "Civic",
    year: 2023,
    mileage: "8,200 mi",
    fuel: "Hybrid",
    transmission: "Automatic",
    badge: "premium",
    category: "car",
    description: "Highly fuel-efficient hybrid with cutting edge styling. Honda Sensing suite, dual-zone climate control, power moonroof, and wireless smartphone charger.",
    features: ["Air Conditioning", "Power Windows", "ABS", "Airbags", "Sunroof/Moonroof", "Bluetooth", "Navigation System"]
  },
  {
    id: 6,
    title: "Ford Mustang 2021",
    price: 32750,
    image: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&auto=format&fit=crop&q=80",
    make: "Ford",
    model: "Mustang",
    year: 2021,
    mileage: "24,100 mi",
    fuel: "Petrol",
    transmission: "Manual",
    badge: null,
    category: "car",
    description: "Aggressive performance and pure driving enjoyment. 2.3L EcoBoost engine, active exhaust modes, performance steering settings, and dynamic drive options.",
    features: ["Power Steering", "ABS", "Airbags", "Bluetooth", "Backup Camera", "Toggle Sports Modes"]
  }
];

export const VEHICLE_MAKES: Record<string, string[]> = {
  car: ['Maruti Suzuki', 'Tata', 'Hyundai', 'Honda', 'Toyota', 'Kia', 'BMW', 'Mercedes', 'Audi', 'Ford', 'Nissan', 'Chevrolet'],
  suv: ['Mahindra', 'Tata', 'Maruti Suzuki', 'Hyundai', 'Toyota', 'Kia', 'BMW', 'Mercedes', 'Audi', 'Ford', 'Chevrolet'],
  truck: ['Tata', 'Mahindra', 'Ashok Leyland', 'Ford', 'Chevrolet', 'Ram', 'Toyota'],
  van: ['Maruti Suzuki', 'Toyota', 'Honda', 'Ford', 'Mercedes', 'Kia'],
  motorcycle: ['Royal Enfield', 'Bajaj', 'TVS', 'Hero', 'Honda', 'Yamaha', 'Suzuki', 'KTM', 'Harley-Davidson', 'BMW'],
  bicycle: ['Hero Cycles', 'Firefox', 'Trek', 'Giant', 'Specialized', 'Schwinn'],
  commercial: ['Tata', 'Mahindra', 'Ashok Leyland', 'Eicher', 'Mercedes', 'Volvo'],
  other: ['Other']
};

export const VEHICLE_MODELS: Record<string, string[]> = {
  'Mahindra': ['Thar', 'XUV700', 'Scorpio-N', 'Bolero', 'XUV300', 'Alturas G4'],
  'Tata': ['Nexon', 'Harrier', 'Safari', 'Punch', 'Altroz', 'Tiago', '407', 'Signa'],
  'Maruti Suzuki': ['Swift', 'Baleno', 'Brezza', 'Grand Vitara', 'Ertiga', 'Dzire', 'Alto', 'Omni'],
  'Royal Enfield': ['Classic 350', 'Bullet 350', 'Meteor 350', 'Himalayan 450', 'Hunter 350', 'Interceptor 650'],
  'Bajaj': ['Pulsar 150', 'Pulsar NS200', 'Pulsar 220F', 'Chetak EV', 'Dominar 400', 'Platina'],
  'TVS': ['Apache RTR 160', 'Apache RR 310', 'Jupiter', 'Ntorq 125', 'Rider 125'],
  'Hero': ['Splendor+', 'HF Deluxe', 'Xpulse 200', 'Karizma XMR', 'Maestro Edge'],
  'Ashok Leyland': ['Dost', 'Bada Dost', 'Ecomet', 'U-Truck'],
  'Eicher': ['Pro 2049', 'Pro 3015', 'Pro 6025'],
  'Hero Cycles': ['Ranger', 'Octane', 'Lectro EV', 'Sprint'],
  'Firefox': ['Target', 'Cyclone', 'Rapide', 'Meteor'],
  'Toyota': ['Camry', 'Corolla', 'Innova Crysta', 'Fortuner', 'Glanza', 'RAV4', 'Hilux'],
  'Honda': ['Civic', 'Accord', 'City', 'Amaze', 'CR-V'],
  'Ford': ['F-150', 'Mustang', 'Endeavour', 'EcoSport', 'Explorer'],
  'BMW': ['3 Series', '5 Series', '7 Series', 'X3', 'X5', 'G 310 R', 'S 1000 RR'],
  'Mercedes': ['C-Class', 'E-Class', 'S-Class', 'GLA', 'GLC', 'GLE', 'Sprinter'],
  'Audi': ['A4', 'A6', 'Q3', 'Q5', 'Q7'],
  'Hyundai': ['i20', 'Creta', 'Verna', 'Venue', 'Alcazar', 'Tucson'],
  'Kia': ['Seltos', 'Sonet', 'Carens', 'Carnival'],
  'Nissan': ['Magnite', 'Kicks', 'Sunny', 'GT-R'],
  'Chevrolet': ['Spark', 'Beat', 'Cruze', 'Captiva', 'Silverado'],
  'Ram': ['1500', '2500'],
  'GMC': ['Sierra', 'Yukon'],
  'Yamaha': ['YZF-R15', 'MT-15', 'FZ-S', 'R3', 'MT-07'],
  'Suzuki': ['Access 125', 'Gixxer SF', 'Hayabusa', 'V-Strom SX'],
  'KTM': ['Duke 200', 'Duke 390', 'RC 390', 'Adventure 390'],
  'Harley-Davidson': ['X440', 'Iron 883', 'Fat Boy', 'Street 750'],
  'Trek': ['Domane', 'Madone', 'Marlin'],
  'Giant': ['Defy', 'TCR', 'Escape'],
  'Specialized': ['Allez', 'Sirrus', 'Tarmac'],
  'Other': ['Custom/Other']
};
