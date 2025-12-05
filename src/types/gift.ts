export interface GiftImages {
  raw: string;
  regular: string;
  small: string;
  thumb: string;
}

export interface Gift {
  id: string;
  title: string;
  description: string;
  images: GiftImages;
  price_min: number;
  price_max: number;
  match_score: number;
  matched_tags: string[];
  ai_rationale: string;
  delivery_estimate: string;
  buy_link: string;
  vendor: string;
  favorited?: boolean;
}

export interface GiftRequest {
  name?: string;
  age?: number;
  relation: string;
  occasion: string;
  budget_min: number;
  budget_max: number;
  hobbies: string[];
  personalities: string[];
  city?: string;
}

export const HOBBY_CATEGORIES = {
  "Creative & Arts": [
    "Painting", "Sketching / Illustration", "Calligraphy", "Pottery",
    "DIY Crafts / Makers", "Scrapbooking", "Photography", "Filmmaking / Videography"
  ],
  "Performance & Expression": [
    "Music (instrumental)", "Singing / Vocal", "Dance (classical/modern)",
    "Theater / Acting", "Poetry / Spoken Word", "Stand-up / Comedy"
  ],
  "Mind & Body": [
    "Fitness / Gym", "Yoga", "Meditation / Mindfulness", "Running / Jogging",
    "Cycling", "Swimming", "Martial Arts"
  ],
  "Food & Taste": [
    "Cooking / Baking", "Street Food Explorer", "Home Brewing / Coffee Connoisseur",
    "Wine / Spirits Enthusiast", "Recipe Collector", "Food Photography"
  ],
  "Tech & Gaming": [
    "Tech & Gadgets", "Mobile Apps / Productivity Tools", "PC/Console Gaming",
    "Board Games / Tabletop", "Robotics / Electronics", "Coding / Dev Projects"
  ],
  "Outdoors & Adventure": [
    "Travel / Backpacking", "Hiking / Trekking", "Camping",
    "Wildlife / Birdwatching", "Rock Climbing", "Water Sports"
  ],
  "Home & Plants": [
    "Gardening / Indoor Plants", "Home Décor", "Interior Styling",
    "Smart Home Enthusiast", "Feng Shui / Vastu Interest"
  ],
  "Learning & Lifestyle": [
    "Reading / Bookworm", "Languages / Linguistics", "Personal Finance / Investing",
    "Sustainable Living / Zero Waste", "Minimalism / Decluttering"
  ],
  "Social & Caring": [
    "Volunteering / NGOs", "Pet Care / Animals", "Parenting / Baby Products",
    "Socializing / Nightlife"
  ],
  "Fashion & Aesthetics": [
    "Jewelry / Accessories", "Streetwear / Fashion", "Makeup / Skincare",
    "Bespoke Tailoring"
  ],
  "Collecting & Niche": [
    "Collectibles (coins, stamps)", "Antiques / Vintage Finds",
    "Comics / Memorabilia", "Sports Memorabilia"
  ]
};

export const PERSONALITY_TRAITS = [
  "Adventurous", "Artistic", "Bookworm", "Caring", "Creative",
  "Energetic", "Foodie", "Health-conscious", "Humorous", "Innovative",
  "Introverted", "Extroverted", "Minimalist", "Nature-loving", "Nostalgic",
  "Organized", "Outgoing", "Practical", "Romantic", "Spiritual",
  "Tech-savvy", "Traditional", "Trendy"
];

export const RELATIONS = [
  "Mother", "Father", "Sister", "Brother", "Spouse", "Partner",
  "Daughter", "Son", "Friend", "Colleague", "Boss", "Mentor",
  "Grandparent", "Aunt", "Uncle", "Cousin", "Niece", "Nephew"
];

export const OCCASIONS = [
  "Birthday", "Anniversary", "Wedding", "Housewarming", "Graduation",
  "Promotion", "Retirement", "Baby Shower", "Diwali", "Holi",
  "Christmas", "Valentine's Day", "Mother's Day", "Father's Day",
  "Raksha Bandhan", "Thank You", "Get Well Soon", "Just Because"
];

export const INDIAN_CITIES = [
  "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata",
  "Pune", "Ahmedabad", "Jaipur", "Surat", "Lucknow", "Kanpur",
  "Nagpur", "Indore", "Bhopal", "Visakhapatnam", "Patna", "Vadodara",
  "Ghaziabad", "Ludhiana", "Agra", "Nashik", "Faridabad", "Meerut",
  "Rajkot", "Kalyan-Dombivli", "Vasai-Virar", "Varanasi", "Srinagar",
  "Aurangabad", "Dhanbad", "Amritsar", "Navi Mumbai", "Allahabad",
  "Ranchi", "Howrah", "Coimbatore", "Jabalpur", "Gwalior", "Vijayawada"
];
