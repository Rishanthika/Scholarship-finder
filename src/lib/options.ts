import type {
  AcademicField,
  DegreeLevel,
  EngineeringDomain,
  EnglishTest,
  FundingPreference,
  WorkExperienceBand,
} from "@/types";

export const TIER1_COUNTRIES = [
  "United Kingdom",
  "Germany",
  "Japan",
  "Singapore",
  "Canada",
  "United States",
  "Australia",
  "Ireland",
  "Netherlands",
  "France",
  "New Zealand",
  "South Korea",
  "Sweden",
  "Switzerland",
  "Italy",
] as const;

export const DEGREE_LEVEL_OPTIONS: { value: DegreeLevel; label: string }[] = [
  { value: "undergraduate", label: "Undergraduate" },
  { value: "masters", label: "Master's" },
  { value: "phd", label: "PhD or Doctoral" },
  { value: "postdoctoral", label: "Postdoctoral" },
  { value: "research", label: "Research degree" },
];

export const ACADEMIC_FIELD_OPTIONS: { value: AcademicField; label: string }[] = [
  { value: "engineering", label: "Engineering" },
  { value: "computer_science_technology", label: "Computer Science / Technology" },
  { value: "business", label: "Business" },
  { value: "finance", label: "Finance" },
  { value: "economics", label: "Economics" },
  { value: "management", label: "Management" },
  { value: "medicine", label: "Medicine" },
  { value: "public_health", label: "Public Health" },
  { value: "law", label: "Law" },
  { value: "humanities", label: "Humanities" },
  { value: "social_sciences", label: "Social Sciences" },
  { value: "arts", label: "Arts" },
  { value: "design", label: "Design" },
  { value: "education", label: "Education" },
  { value: "international_relations", label: "International Relations" },
  { value: "natural_sciences", label: "Natural Sciences" },
  { value: "life_sciences", label: "Life Sciences" },
  { value: "mathematics", label: "Mathematics" },
  { value: "physics", label: "Physics" },
  { value: "chemistry", label: "Chemistry" },
  { value: "other", label: "Other" },
];

export const ENGINEERING_DOMAIN_GROUPS: { group: string; options: { value: EngineeringDomain; label: string }[] }[] = [
  {
    group: "Computing & Technology",
    options: [
      { value: "computer_science", label: "Computer Science" },
      { value: "software_engineering", label: "Software Engineering" },
      { value: "ai_ml", label: "Artificial Intelligence / Machine Learning" },
      { value: "data_science", label: "Data Science" },
      { value: "information_technology", label: "Information Technology" },
      { value: "cybersecurity", label: "Cybersecurity" },
      { value: "information_systems", label: "Information Systems" },
      { value: "robotics", label: "Robotics" },
    ],
  },
  {
    group: "Core Engineering",
    options: [
      { value: "mechanical", label: "Mechanical Engineering" },
      { value: "civil", label: "Civil Engineering" },
      { value: "electrical", label: "Electrical Engineering" },
      { value: "electronics_communication", label: "Electronics & Communication Engineering" },
      { value: "mechatronics", label: "Mechatronics" },
      { value: "chemical", label: "Chemical Engineering" },
      { value: "industrial", label: "Industrial Engineering" },
      { value: "manufacturing", label: "Manufacturing Engineering" },
      { value: "automotive", label: "Automotive Engineering" },
      { value: "aerospace", label: "Aerospace Engineering" },
      { value: "biomedical", label: "Biomedical Engineering" },
      { value: "environmental", label: "Environmental Engineering" },
      { value: "materials", label: "Materials Engineering" },
      { value: "petroleum", label: "Petroleum Engineering" },
      { value: "mining", label: "Mining Engineering" },
      { value: "telecommunications", label: "Telecommunications Engineering" },
      { value: "energy_renewable", label: "Energy / Renewable Energy Engineering" },
    ],
  },
];

export const ENGLISH_TEST_OPTIONS: { value: EnglishTest; label: string }[] = [
  { value: "IELTS", label: "IELTS" },
  { value: "TOEFL", label: "TOEFL" },
  { value: "PTE", label: "PTE" },
  { value: "Duolingo", label: "Duolingo English Test" },
  { value: "not_taken", label: "Not taken yet" },
  { value: "exempt", label: "I studied in English medium previously" },
];

export const WORK_EXPERIENCE_OPTIONS: { value: WorkExperienceBand; label: string }[] = [
  { value: "none", label: "None" },
  { value: "lt_1", label: "Less than 1 year" },
  { value: "1_2", label: "1-2 years" },
  { value: "3_5", label: "3-5 years" },
  { value: "5_plus", label: "5+ years" },
];

export const FUNDING_PREFERENCE_OPTIONS: { value: FundingPreference; label: string }[] = [
  { value: "fully_funded_only", label: "Fully funded only (tuition + living costs)" },
  { value: "full_tuition_ok", label: "Full tuition is enough, I can cover living costs" },
  { value: "partial_ok", label: "Partial funding is fine" },
  { value: "any", label: "I'm open to any funding" },
];

export const GRADING_SYSTEM_OPTIONS = [
  { value: "percentage", label: "Percentage", placeholder: "e.g. 78" },
  { value: "cgpa_10", label: "CGPA out of 10", placeholder: "e.g. 8.2" },
  { value: "gpa_4", label: "GPA out of 4", placeholder: "e.g. 3.6" },
  { value: "uk_honours", label: "UK Honours classification", placeholder: "e.g. 2:1" },
  { value: "other", label: "Other", placeholder: "" },
] as const;

export const INTAKE_OPTIONS = [
  { value: "2026", label: "2026" },
  { value: "2027", label: "2027" },
  { value: "2028", label: "2028" },
  { value: "not_sure", label: "I'm not sure yet" },
];
