// India States and Districts — static lookup for farm location dropdowns
export interface IndiaLocation {
  state: string;
  defaultLat: number;
  defaultLon: number;
  districts: { name: string; lat: number; lon: number }[];
}

export const INDIA_LOCATIONS: IndiaLocation[] = [
  {
    state: "Maharashtra", defaultLat: 19.7515, defaultLon: 75.7139,
    districts: [
      { name: "Nashik", lat: 20.0059, lon: 73.7898 },
      { name: "Pune", lat: 18.5204, lon: 73.8567 },
      { name: "Ahmednagar", lat: 19.0952, lon: 74.7496 },
      { name: "Solapur", lat: 17.6868, lon: 75.9060 },
      { name: "Aurangabad", lat: 19.8762, lon: 75.3433 },
      { name: "Kolhapur", lat: 16.7050, lon: 74.2433 },
      { name: "Satara", lat: 17.6805, lon: 74.0183 },
      { name: "Sangli", lat: 16.8524, lon: 74.5815 },
      { name: "Latur", lat: 18.4088, lon: 76.5604 },
      { name: "Nanded", lat: 19.1383, lon: 77.3210 },
      { name: "Jalgaon", lat: 21.0077, lon: 75.5626 },
      { name: "Nagpur", lat: 21.1458, lon: 79.0882 },
      { name: "Amravati", lat: 20.9374, lon: 77.7796 },
      { name: "Thane", lat: 19.2183, lon: 72.9781 },
    ]
  },
  {
    state: "Uttar Pradesh", defaultLat: 26.8467, defaultLon: 80.9462,
    districts: [
      { name: "Lucknow", lat: 26.8467, lon: 80.9462 },
      { name: "Agra", lat: 27.1767, lon: 78.0081 },
      { name: "Varanasi", lat: 25.3176, lon: 82.9739 },
      { name: "Kanpur", lat: 26.4499, lon: 80.3319 },
      { name: "Meerut", lat: 28.9845, lon: 77.7064 },
      { name: "Gorakhpur", lat: 26.7606, lon: 83.3732 },
      { name: "Prayagraj", lat: 25.4358, lon: 81.8463 },
      { name: "Mathura", lat: 27.4924, lon: 77.6737 },
      { name: "Aligarh", lat: 27.8974, lon: 78.0880 },
      { name: "Bareilly", lat: 28.3670, lon: 79.4304 },
    ]
  },
  {
    state: "Punjab", defaultLat: 31.1471, defaultLon: 75.3412,
    districts: [
      { name: "Ludhiana", lat: 30.9010, lon: 75.8573 },
      { name: "Amritsar", lat: 31.6340, lon: 74.8723 },
      { name: "Jalandhar", lat: 31.3260, lon: 75.5762 },
      { name: "Patiala", lat: 30.3398, lon: 76.3869 },
      { name: "Bathinda", lat: 30.2110, lon: 74.9455 },
      { name: "Mohali", lat: 30.7046, lon: 76.7179 },
      { name: "Gurdaspur", lat: 32.0390, lon: 75.4057 },
      { name: "Sangrur", lat: 30.2440, lon: 75.8440 },
    ]
  },
  {
    state: "Haryana", defaultLat: 29.0588, defaultLon: 76.0856,
    districts: [
      { name: "Gurugram", lat: 28.4595, lon: 77.0266 },
      { name: "Faridabad", lat: 28.4089, lon: 77.3178 },
      { name: "Hisar", lat: 29.1492, lon: 75.7217 },
      { name: "Rohtak", lat: 28.8955, lon: 76.6066 },
      { name: "Karnal", lat: 29.6857, lon: 76.9905 },
      { name: "Ambala", lat: 30.3782, lon: 76.7767 },
      { name: "Sonipat", lat: 28.9941, lon: 77.0151 },
      { name: "Panipat", lat: 29.3909, lon: 76.9635 },
    ]
  },
  {
    state: "Madhya Pradesh", defaultLat: 22.9734, defaultLon: 78.6569,
    districts: [
      { name: "Bhopal", lat: 23.2599, lon: 77.4126 },
      { name: "Indore", lat: 22.7196, lon: 75.8577 },
      { name: "Gwalior", lat: 26.2183, lon: 78.1828 },
      { name: "Jabalpur", lat: 23.1815, lon: 79.9864 },
      { name: "Ujjain", lat: 23.1765, lon: 75.7885 },
      { name: "Sagar", lat: 23.8388, lon: 78.7378 },
      { name: "Rewa", lat: 24.5362, lon: 81.2990 },
      { name: "Satna", lat: 24.5673, lon: 80.8322 },
    ]
  },
  {
    state: "Rajasthan", defaultLat: 27.0238, defaultLon: 74.2179,
    districts: [
      { name: "Jaipur", lat: 26.9124, lon: 75.7873 },
      { name: "Jodhpur", lat: 26.2389, lon: 73.0243 },
      { name: "Udaipur", lat: 24.5854, lon: 73.7125 },
      { name: "Kota", lat: 25.2138, lon: 75.8648 },
      { name: "Ajmer", lat: 26.4499, lon: 74.6399 },
      { name: "Bikaner", lat: 28.0229, lon: 73.3119 },
      { name: "Sikar", lat: 27.6094, lon: 75.1399 },
      { name: "Alwar", lat: 27.5530, lon: 76.6346 },
    ]
  },
  {
    state: "Gujarat", defaultLat: 22.2587, defaultLon: 71.1924,
    districts: [
      { name: "Ahmedabad", lat: 23.0225, lon: 72.5714 },
      { name: "Surat", lat: 21.1702, lon: 72.8311 },
      { name: "Vadodara", lat: 22.3072, lon: 73.1812 },
      { name: "Rajkot", lat: 22.3039, lon: 70.8022 },
      { name: "Bhavnagar", lat: 21.7645, lon: 72.1519 },
      { name: "Jamnagar", lat: 22.4707, lon: 70.0577 },
      { name: "Junagadh", lat: 21.5222, lon: 70.4579 },
      { name: "Anand", lat: 22.5645, lon: 72.9289 },
    ]
  },
  {
    state: "Karnataka", defaultLat: 15.3173, defaultLon: 75.7139,
    districts: [
      { name: "Bengaluru", lat: 12.9716, lon: 77.5946 },
      { name: "Mysuru", lat: 12.2958, lon: 76.6394 },
      { name: "Hubballi", lat: 15.3647, lon: 75.1240 },
      { name: "Belagavi", lat: 15.8497, lon: 74.4977 },
      { name: "Mangaluru", lat: 12.9141, lon: 74.8560 },
      { name: "Kalaburagi", lat: 17.3297, lon: 76.8200 },
      { name: "Davanagere", lat: 14.4644, lon: 75.9218 },
      { name: "Shivamogga", lat: 13.9299, lon: 75.5681 },
    ]
  },
  {
    state: "Andhra Pradesh", defaultLat: 15.9129, defaultLon: 79.7400,
    districts: [
      { name: "Visakhapatnam", lat: 17.6868, lon: 83.2185 },
      { name: "Vijayawada", lat: 16.5062, lon: 80.6480 },
      { name: "Guntur", lat: 16.3067, lon: 80.4365 },
      { name: "Nellore", lat: 14.4426, lon: 79.9865 },
      { name: "Kurnool", lat: 15.8281, lon: 78.0373 },
      { name: "Tirupati", lat: 13.6288, lon: 79.4192 },
      { name: "Kakinada", lat: 16.9891, lon: 82.2475 },
      { name: "Kadapa", lat: 14.4674, lon: 78.8241 },
    ]
  },
  {
    state: "Tamil Nadu", defaultLat: 11.1271, defaultLon: 78.6569,
    districts: [
      { name: "Chennai", lat: 13.0827, lon: 80.2707 },
      { name: "Coimbatore", lat: 11.0168, lon: 76.9558 },
      { name: "Madurai", lat: 9.9252, lon: 78.1198 },
      { name: "Tiruchirappalli", lat: 10.7905, lon: 78.7047 },
      { name: "Salem", lat: 11.6643, lon: 78.1460 },
      { name: "Vellore", lat: 12.9165, lon: 79.1325 },
      { name: "Tirunelveli", lat: 8.7139, lon: 77.7567 },
      { name: "Dindigul", lat: 10.3624, lon: 77.9695 },
    ]
  },
  {
    state: "Telangana", defaultLat: 18.1124, defaultLon: 79.0193,
    districts: [
      { name: "Hyderabad", lat: 17.3850, lon: 78.4867 },
      { name: "Warangal", lat: 17.9784, lon: 79.5941 },
      { name: "Nizamabad", lat: 18.6725, lon: 78.0940 },
      { name: "Khammam", lat: 17.2473, lon: 80.1514 },
      { name: "Karimnagar", lat: 18.4386, lon: 79.1288 },
      { name: "Mahbubnagar", lat: 16.7488, lon: 77.9875 },
    ]
  },
  {
    state: "West Bengal", defaultLat: 22.9868, defaultLon: 87.8550,
    districts: [
      { name: "Kolkata", lat: 22.5726, lon: 88.3639 },
      { name: "Howrah", lat: 22.5958, lon: 88.2636 },
      { name: "Durgapur", lat: 23.4800, lon: 87.3200 },
      { name: "Asansol", lat: 23.6889, lon: 86.9661 },
      { name: "Siliguri", lat: 26.7271, lon: 88.3953 },
      { name: "Bardhaman", lat: 23.2324, lon: 87.8615 },
      { name: "Malda", lat: 25.0108, lon: 88.1418 },
      { name: "Murshidabad", lat: 24.1800, lon: 88.2700 },
    ]
  },
  {
    state: "Odisha", defaultLat: 20.9517, defaultLon: 85.0985,
    districts: [
      { name: "Bhubaneswar", lat: 20.2961, lon: 85.8245 },
      { name: "Cuttack", lat: 20.4625, lon: 85.8830 },
      { name: "Rourkela", lat: 22.2604, lon: 84.8536 },
      { name: "Sambalpur", lat: 21.4669, lon: 83.9756 },
      { name: "Puri", lat: 19.8135, lon: 85.8312 },
      { name: "Brahmapur", lat: 19.3150, lon: 84.7941 },
      { name: "Balasore", lat: 21.4942, lon: 86.9340 },
      { name: "Kendujhar", lat: 21.6463, lon: 85.5837 },
    ]
  },
  {
    state: "Bihar", defaultLat: 25.0961, defaultLon: 85.3131,
    districts: [
      { name: "Patna", lat: 25.5941, lon: 85.1376 },
      { name: "Gaya", lat: 24.7955, lon: 85.0002 },
      { name: "Bhagalpur", lat: 25.2425, lon: 86.9842 },
      { name: "Muzaffarpur", lat: 26.1197, lon: 85.3910 },
      { name: "Darbhanga", lat: 26.1542, lon: 85.8918 },
      { name: "Nalanda", lat: 25.1360, lon: 85.4413 },
      { name: "Purnia", lat: 25.7771, lon: 87.4753 },
    ]
  },
  {
    state: "Jharkhand", defaultLat: 23.6102, defaultLon: 85.2799,
    districts: [
      { name: "Ranchi", lat: 23.3441, lon: 85.3096 },
      { name: "Dhanbad", lat: 23.7957, lon: 86.4304 },
      { name: "Jamshedpur", lat: 22.8046, lon: 86.2029 },
      { name: "Bokaro", lat: 23.6693, lon: 86.1511 },
      { name: "Deoghar", lat: 24.4853, lon: 86.6946 },
    ]
  },
  {
    state: "Chhattisgarh", defaultLat: 21.2787, defaultLon: 81.8661,
    districts: [
      { name: "Raipur", lat: 21.2514, lon: 81.6296 },
      { name: "Bilaspur", lat: 22.0796, lon: 82.1391 },
      { name: "Durg", lat: 21.1904, lon: 81.2849 },
      { name: "Korba", lat: 22.3595, lon: 82.7501 },
    ]
  },
  {
    state: "Himachal Pradesh", defaultLat: 31.1048, defaultLon: 77.1734,
    districts: [
      { name: "Shimla", lat: 31.1048, lon: 77.1734 },
      { name: "Dharamshala", lat: 32.2190, lon: 76.3234 },
      { name: "Kullu", lat: 31.9592, lon: 77.1089 },
      { name: "Mandi", lat: 31.7090, lon: 76.9320 },
      { name: "Solan", lat: 30.9045, lon: 77.0967 },
    ]
  },
  {
    state: "Uttarakhand", defaultLat: 30.0668, defaultLon: 79.0193,
    districts: [
      { name: "Dehradun", lat: 30.3165, lon: 78.0322 },
      { name: "Haridwar", lat: 29.9457, lon: 78.1642 },
      { name: "Nainital", lat: 29.3919, lon: 79.4542 },
      { name: "Udham Singh Nagar", lat: 28.9638, lon: 79.5189 },
      { name: "Almora", lat: 29.5971, lon: 79.6591 },
    ]
  },
  {
    state: "Assam", defaultLat: 26.2006, defaultLon: 92.9376,
    districts: [
      { name: "Guwahati", lat: 26.1445, lon: 91.7362 },
      { name: "Dibrugarh", lat: 27.4728, lon: 94.9120 },
      { name: "Jorhat", lat: 26.7509, lon: 94.2037 },
      { name: "Silchar", lat: 24.8333, lon: 92.7789 },
      { name: "Nagaon", lat: 26.3454, lon: 92.6839 },
    ]
  },
  {
    state: "Kerala", defaultLat: 10.8505, defaultLon: 76.2711,
    districts: [
      { name: "Thiruvananthapuram", lat: 8.5241, lon: 76.9366 },
      { name: "Kochi", lat: 9.9312, lon: 76.2673 },
      { name: "Kozhikode", lat: 11.2588, lon: 75.7804 },
      { name: "Thrissur", lat: 10.5276, lon: 76.2144 },
      { name: "Palakkad", lat: 10.7867, lon: 76.6548 },
      { name: "Kollam", lat: 8.8932, lon: 76.6141 },
      { name: "Malappuram", lat: 11.0730, lon: 76.0740 },
    ]
  },
];

export function getStateList(): string[] {
  return INDIA_LOCATIONS.map(l => l.state);
}

export function getDistrictsForState(state: string): { name: string; lat: number; lon: number }[] {
  return INDIA_LOCATIONS.find(l => l.state === state)?.districts || [];
}

export function getDistrictCoords(state: string, district: string): { lat: number; lon: number } | null {
  const d = getDistrictsForState(state).find(d => d.name === district);
  return d ? { lat: d.lat, lon: d.lon } : null;
}
