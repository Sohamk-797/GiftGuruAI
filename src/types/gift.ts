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
    "DIY Crafts / Makers", "Scrapbooking", "Photography", "Filmmaking / Videography",
    "Digital Art", "3D Modeling / Animation", "Resin Art", "Embroidery / Needlework",
    "Handmade Jewelry Craft", "Paper Quilling", "Art Journaling", "Stencil Art",
    "Mehendi / Henna Art", "Tattoo Designing"
  ],

  "Performance & Expression": [
    "Music (Instrumental)", "Singing / Vocal", "Dance (Classical/Modern)",
    "Theater / Acting", "Poetry / Spoken Word", "Stand-up / Comedy",
    "Karaoke", "Open-Mic Performer", "Beatboxing", "Classical Music Appreciation",
    "YouTube Content Creation", "Reels / Short Video Creation"
  ],

  "Mind & Body": [
    "Fitness / Gym", "Yoga", "Meditation / Mindfulness", "Running / Jogging",
    "Cycling", "Swimming", "Martial Arts", "Pilates", "Zumba",
    "Home Workouts", "Mindful Journaling", "Ayurveda / Holistic Healing",
    "Pranayama", "Walking / Step Goals"
  ],

  "Food & Taste": [
    "Cooking / Baking", "Street Food Explorer", "Home Brewing / Coffee Connoisseur",
    "Tea / Chai Enthusiast", "Recipe Collector", "Food Photography",
    "Trying New Restaurants", "Food Blogging", "Healthy Meal Prep",
    "Indian Sweets Enthusiast", "Grilling / Barbecue", "Regional Cuisine Lover",
    "Home Chef Experiments"
  ],

  "Tech & Gaming": [
    "Tech & Gadgets", "Mobile Apps / Productivity Tools", "PC/Console Gaming",
    "Board Games / Tabletop", "Robotics / Electronics", "Coding / Dev Projects",
    "Crypto / Web3 Enthusiast", "AR/VR Exploration", "Smart Home Automation",
    "Gadget Reviewer", "Esports Viewer", "Retro Gaming"
  ],

  "Outdoors & Adventure": [
    "Travel / Backpacking", "Hiking / Trekking", "Camping",
    "Wildlife / Birdwatching", "Rock Climbing", "Water Sports", "Biking",
    "Road Trips", "Stargazing / Astronomy", "Heritage Site Visiting",
    "Motorcycling / Riding", "Adventure Sports", "Beach Explorer"
  ],

  "Home & Plants": [
    "Gardening / Indoor Plants", "Home Décor", "Interior Styling",
    "Smart Home Enthusiast", "Feng Shui / Vastu", "Candle Making",
    "Home Organization", "Scented Home Fragrances", "Home DIY Projects",
    "Terrarium Making", "Aromatherapy", "Eco-Friendly Living"
  ],

  "Learning & Lifestyle": [
    "Reading / Bookworm", "Languages / Linguistics", "Personal Finance / Investing",
    "Sustainable Living / Zero Waste", "Minimalism / Decluttering",
    "Online Courses / Upskilling", "Productivity Systems", "Self-Improvement",
    "History Enthusiast", "Science & Discovery", "Economics & Markets",
    "Skill-Building Workshops", "Podcast Listening"
  ],

  "Social & Caring": [
    "Volunteering / NGOs", "Pet Care / Animals", "Parenting / Baby Products",
    "Socializing / Nightlife", "Hosting House Parties", "Community Events",
    "Animal Rescue / Feeding Strays", "Family-Oriented Activities",
    "Relationship Building", "Celebration Planning"
  ],

  "Fashion & Aesthetics": [
    "Jewelry / Accessories", "Streetwear / Fashion", "Makeup / Skincare",
    "Bespoke Tailoring", "Fragrance Collecting", "Ethnic Fashion Lover",
    "Thrift Shopping", "Minimalist Fashion", "Luxury Fashion",
    "Wardrobe Styling", "Personal Grooming"
  ],

  "Collecting & Niche": [
    "Collectibles (Coins, Stamps)", "Antiques / Vintage Finds",
    "Comics / Memorabilia", "Sports Memorabilia", "Sneaker Collecting",
    "Figurines / Action Figures", "Die-cast Models", "Vinyl Records",
    "Poster Art Collecting", "Souvenir Collecting"
  ],

  "Finance & Strategy": [
    "Stock Market Investing", "Crypto Trading", "Real Estate Research",
    "Budgeting / Money Management", "Business Podcasts",
    "Startup Enthusiasm", "Value Investing"
  ],

  "Entertainment & Media": [
    "Bollywood Movies", "Tollywood/Kollywood Film Fan", "Anime",
    "OTT Series Binge Watching", "Comedy Shows", "Cricket Watching",
    "Football Enthusiast", "K-Drama Fan", "Music Festival Goer",
    "Podcast Lover", "News & Current Affairs"
  ],

  "Cultural & Heritage": [
    "Classical Dance Appreciation", "Indian Handicrafts", "Temple Architecture",
    "Cultural Festivals", "Folk Art Enthusiast", "Ayurvedic Rituals",
    "Indian Mythology Reading", "Vedic Astrology / Horoscope Reading"
  ]
};

export const PERSONALITY_TRAITS = [
  // Existing
  "Adventurous", "Artistic", "Bookworm", "Caring", "Creative",
  "Energetic", "Foodie", "Health-conscious", "Humorous", "Innovative",
  "Introverted", "Extroverted", "Minimalist", "Nature-loving", "Nostalgic",
  "Organized", "Outgoing", "Practical", "Romantic", "Spiritual",
  "Tech-savvy", "Traditional", "Trendy", "Chai Lover", "Coffee Enthusiast", "Bollywood Fan", "Cricket Enthusiast",
  "Budget-conscious", "Luxury-loving", "Emotionally Expressive",
  "Calm & Composed", "Detail-oriented", "Big Dreamer", "Soft-spoken",
  "Warm & Friendly", "Highly Social", "Loyal", "Empathetic", "Ambitious",
  "Workaholic", "Homebody", "Travel Freak", "Planner", "Last-minute Doer",
  "Sentimental", "Sarcastic", "Practical Thinker", "Analytical",
  "Fashion-forward", "Skincare Lover", "Fitness-first", "Eco-conscious",
  "Pet Lover", "Peace-seeking", "Community-driven", "Family-oriented",
  "Emotional Thinker", "Logical Thinker", "Balanced", "Energetic Morning Person",
  "Late-night Owl", "Elegant", "Frugal", "Simplicity Lover", "Crafty",
  "Gift-giving Enthusiast", "Quick Learner", "Slow & Observant",
  "Music Lover", "Movie Buff", "Tech Explorer", "Spiritual Seeker",
  "Playful", "Optimistic", "Realistic", "Open-minded", "Culturally Rooted",
  "Festival Enthusiast", "Minimal Decor Lover", "Aesthetic-focused",
  "Trend Chaser", "Calm Listener", "Supportive Friend"
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
