// Journey Allergen Assurance Protocol (JAAP): the constants the business plan fixes.
// Section references (§) point at the Safe Travel Meal Kits business plan.

export const RULE_SET_VERSION = "JAAP-MR 1.0";
export const RUN_CAPACITY_KE = 55; // §4.2
export const TEMP_RANGE = { min: 0, max: 5 }; // declared chilled range, °C (demonstration assumption)
export const USE_BY_DAYS = 5; // production to meal occasion (demonstration assumption)
export const RUN_WEEKDAYS = [3, 4, 5]; // Wed, Thu, Fri production runs (§13.10)
export const RECEIPT_GRACE_MIN = 15; // a receipt entry must exist this long after the window closes

export const ALLERGENS = {
  peanut: "Peanut",
  tree_nut: "Tree nuts",
  sesame: "Sesame",
  milk: "Milk",
  egg: "Egg",
  gluten: "Gluten-containing cereals",
  fish: "Fish",
  crustacean: "Crustaceans",
  mollusc: "Molluscs",
  soya: "Soya",
  mustard: "Mustard",
  celery: "Celery",
  lupin: "Lupin",
  sulphites: "Sulphur dioxide / sulphites",
} as const;
export type Allergen = keyof typeof ALLERGENS;

export type ExclusionSet = { id: number; code: string; excludes: Allergen[]; why: string };

// §4.7, Table 9
export const EXCLUSION_SETS: ExclusionSet[] = [
  { id: 1, code: "Set 1", excludes: ["peanut", "tree_nut"], why: "The most common cause of severe reaction in adults and children" },
  { id: 2, code: "Set 2", excludes: ["peanut", "tree_nut", "sesame"], why: "A frequent combined profile and the hardest to cover in hotel breakfast service" },
  { id: 3, code: "Set 3", excludes: ["milk", "egg"], why: "Common in children and poorly served by travel food" },
  { id: 4, code: "Set 4", excludes: ["gluten"], why: "Coeliac disease requires the same segregation discipline" },
  { id: 5, code: "Set 5", excludes: ["fish", "crustacean", "mollusc"], why: "High severity, and the set most exposed by shared fryers and shared surfaces" },
  {
    id: 6,
    code: "Set 6",
    excludes: ["peanut", "tree_nut", "sesame", "milk", "egg", "gluten", "fish", "crustacean", "mollusc"],
    why: "Combined restrictive set for multi-allergen profiles; the most constrained menu and the smallest run",
  },
];

export const COVERED_ALLERGENS = EXCLUSION_SETS[5].excludes;

export const setById = (id: number) => EXCLUSION_SETS.find((s) => s.id === id)!;

// Run sequencing rule (§4.2 item 5): most restrictive exclusion sets first in the day.
export const RUN_ORDER = [...EXCLUSION_SETS]
  .sort((a, b) => b.excludes.length - a.excludes.length || a.id - b.id)
  .map((s) => s.id);

export type ProductId = "single" | "daily" | "solo" | "family" | "subscription" | "corporate";
export type Product = { id: ProductId; name: string; what: string; price: string; ke: number; handovers: number };

// §4.6, Table 8
export const PRODUCTS: Product[] = [
  { id: "single", name: "Single Arrival Kit", what: "One verified meal on arrival", price: "£25", ke: 1, handovers: 1 },
  { id: "daily", name: "Daily Safety Pack", what: "Breakfast plus one further occasion for one day", price: "£45", ke: 2, handovers: 1 },
  { id: "solo", name: "Solo Traveller Meal Kit", what: "A mapped short trip for one traveller", price: "£120", ke: 5, handovers: 2 },
  { id: "family", name: "Family or Group Travel Kit", what: "A mapped trip for a family or group booking", price: "£350", ke: 14, handovers: 3 },
  { id: "subscription", name: "Frequent Traveller Subscription", what: "Monthly cover for a regular traveller", price: "£220 a month", ke: 8, handovers: 2 },
  { id: "corporate", name: "Corporate or Airline Pack", what: "A block for an employer or operator", price: "£600", ke: 24, handovers: 6 },
];
export const productById = (id: ProductId) => PRODUCTS.find((p) => p.id === id)!;

export type WindowType = "late_arrival" | "breakfast" | "lunch" | "in_transit";
export const WINDOW_TYPES: Record<WindowType, { label: string; kit: string; rule: string }> = {
  late_arrival: { label: "Late arrival", kit: "Arrival kit", rule: "R1" },
  breakfast: { label: "Hotel breakfast", kit: "Breakfast kit", rule: "R2" },
  lunch: { label: "Working lunch", kit: "Lunch kit", rule: "R3" },
  in_transit: { label: "In transit", kit: "In-transit kit", rule: "R4" },
};

export type RuleDef = {
  id: string;
  group: "Exposure mapping" | "Exclusion and production" | "Handover";
  name: string;
  condition: string;
  output: string;
  handover: string;
  planRef: string;
};

export const RULES: RuleDef[] = [
  {
    id: "R1",
    group: "Exposure mapping",
    name: "Late arrival",
    condition: "A flight lands after 21:00 and the traveller checks in to a hotel the same night.",
    output: "Late-arrival exposure window at the hotel, kit type: Arrival kit (1 kit-equivalent per covered person).",
    handover: "Hotel front desk, inside a window from 150 minutes before landing until landing; held at the desk and released at check-in.",
    planRef: "§4.1",
  },
  {
    id: "R2",
    group: "Exposure mapping",
    name: "Hotel breakfast",
    condition: "Each full morning of a hotel stay: the traveller is in the hotel at 07:30 (stay continues, or check-out is 07:30 or later).",
    output: "Breakfast exposure window for that morning, kit type: Breakfast kit.",
    handover: "Delivered with the hotel batch, held in the hotel refrigerator under written storage acceptance, released to the traveller each morning.",
    planRef: "§4.1, §4.4",
  },
  {
    id: "R3",
    group: "Exposure mapping",
    name: "Working lunch",
    condition: "A meeting or event block spans 12:00 to 14:00 and has no catering line.",
    output: "Lunch exposure window at the meeting location, kit type: Lunch kit.",
    handover: "Delivered to the venue inside the declared window 11:00–12:00.",
    planRef: "§4.1",
  },
  {
    id: "R4",
    group: "Exposure mapping",
    name: "In-transit",
    condition: "A flight segment is longer than three hours (180 minutes).",
    output: "In-transit exposure window, kit type: In-transit kit.",
    handover: "Handed over landside before security at the departure airport, 180 to 90 minutes before departure.",
    planRef: "§4.1, §4.4",
  },
  {
    id: "R5",
    group: "Exclusion and production",
    name: "Exclusion-set assignment",
    condition: "Every diagnosed allergen in the profile is excluded by a published exclusion set.",
    output: "The smallest exclusion set that covers the whole profile. If no set covers it, the order is refused with an honest answer.",
    handover: "—",
    planRef: "§4.7, §4.8",
  },
  {
    id: "P1",
    group: "Exclusion and production",
    name: "Run grouping",
    condition: "Kits share an exclusion set and a production day.",
    output: "Kits are grouped into one single-allergen run of up to 55 kit-equivalents; a kit may only enter a run whose exclusion set covers its profile.",
    handover: "—",
    planRef: "§4.2",
  },
  {
    id: "P2",
    group: "Exclusion and production",
    name: "Run sequencing and timing",
    condition: "Runs are produced on Wednesday, Thursday and Friday; a handover starting before 18:00 on a run day is served by the previous run day, and every kit must be eaten within 5 days of its run.",
    output: "Most restrictive exclusion sets run first in the day, after the deepest clean. Each run needs an accepted clearance before it starts.",
    handover: "—",
    planRef: "§4.2, §13.10",
  },
  {
    id: "H1",
    group: "Handover",
    name: "Hotel batch",
    condition: "Accepted windows at the same hotel stay (late arrival and breakfasts).",
    output: "One courier handover to the hotel front desk per stay (split if a kit would pass its use-by).",
    handover: "Front desk signs receipt into the record; each release to the traveller is a further entry.",
    planRef: "§4.4, §13.7",
  },
];

export const ROLES = {
  platform: "Platform (rule engine)",
  coordinator: "Journey coordinator",
  supervisor: "Production supervisor (founder in year 1)",
  kitchen: "Partner kitchen staff",
  courier: "Courier",
  hotel: "Hotel front desk / duty manager",
  venue: "Venue reception",
  traveller: "Traveller",
  assurance: "Customer assurance (founder until hire)",
  consultant: "Independent food safety consultant",
} as const;
export type Role = keyof typeof ROLES;

export const PREFERENCES = ["South Asian", "Middle Eastern", "East Asian", "British"] as const;
export type Preference = (typeof PREFERENCES)[number];

// Breakfast-led, culturally tailored dishes built only from ingredients outside the nine
// covered allergens, so the same specification can be produced in any exclusion-set run.
export const DISHES: Record<Preference, Record<WindowType, string>> = {
  "South Asian": {
    breakfast: "Spiced millet upma, coconut chutney",
    late_arrival: "Dal tadka with jeera rice",
    lunch: "Chicken and rice biryani bowl",
    in_transit: "Masala chickpea and potato rice box",
  },
  "Middle Eastern": {
    breakfast: "Saffron rice pudding with dates (coconut milk)",
    late_arrival: "Lamb and chickpea stew, saffron rice",
    lunch: "Chicken shawarma rice bowl, garlic-herb dressing",
    in_transit: "Herb falafel and rice box",
  },
  "East Asian": {
    breakfast: "Ginger chicken congee",
    late_arrival: "Coconut vegetable curry, jasmine rice",
    lunch: "Ginger-scallion chicken rice bowl",
    in_transit: "Rice-noodle salad with chicken and herbs",
  },
  British: {
    breakfast: "Potato and herb hash, roasted tomatoes",
    late_arrival: "Lamb and root vegetable bake",
    lunch: "Roast chicken, potato and seasonal vegetables",
    in_transit: "Chicken, rice and roasted vegetable box",
  },
};

export const PROGRAMME = {
  label: "Simulated validation programme",
  period: "Plan months 4–6 (illustrative dates 12 Apr – 4 Jun 2027)",
  firstRunDate: "2027-04-14",
};

// §5.4, Table 11
export const ENDPOINTS = [
  { id: "segregation", name: "Segregation verification", measure: "Verification swabs on contact surfaces after clearance between exclusion sets", threshold: "Zero detections of the excluded allergen above the method limit", minSample: "At least 30 clearance events" },
  { id: "completeness", name: "Handover record completeness", measure: "Proportion of physical movements with a complete, unbroken chain entry", threshold: "At or above 98%", minSample: "At least 200 movements" },
  { id: "on_window", name: "On-window delivery", measure: "Proportion of handovers inside the declared time window", threshold: "At or above 95%", minSample: "—" },
  { id: "temperature", name: "Temperature integrity", measure: "Proportion of movements within the declared temperature range for the full duration", threshold: "At or above 98%", minSample: "—" },
  { id: "seal", name: "Seal integrity at acceptance", measure: "Proportion of kits accepted with an intact seal matching the run record", threshold: "At or above 99%", minSample: "—" },
  { id: "reactions", name: "Reaction incidents", measure: "Any reported allergic reaction attributed to a company kit", threshold: "Zero; any incident stops the programme and triggers a full review", minSample: "—" },
] as const;
