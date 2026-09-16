/**
 * profileSuggestions/intendedCourseSuggestions.ts
 *
 * Keyword-based refinement matchers for the intendedCourse field.
 *
 * When a student's intended course text matches any keywords,
 * the specified labels are boosted to "high" priority within the
 * course-category suggestions.
 *
 * IMPORTANT:
 * - Matching is case-insensitive substring matching.
 * - If no keywords match, course-category suggestions are used unchanged.
 * - This does NOT replace course suggestions — it refines them.
 * - No external AI or API is used — this is purely deterministic config.
 */

import type { IntendedCourseMatcher } from "./profileSuggestions.types";

export const intendedCourseMatchers: IntendedCourseMatcher[] = [
  // ── Artificial Intelligence / Machine Learning ──────────────────────────
  {
    keywords: ["artificial intelligence", "machine learning", " ai ", "ai&", "ai/", "deep learning", "neural"],
    boostSkills: ["Python", "Data Analysis", "Algorithmic Thinking", "Logical Thinking"],
    boostActivities: ["Coding Projects", "Hackathons", "Research Projects"],
    boostAcademicInterests: ["Artificial Intelligence", "Machine Learning", "Data Science", "Algorithms"],
    boostHobbies: ["Coding", "Technology Reading", "Robotics"],
  },

  // ── Cybersecurity / Security ─────────────────────────────────────────────
  {
    keywords: ["cybersecurity", "cyber security", "network security", "information security", "security"],
    boostSkills: ["Python", "Linux", "Problem Solving", "Logical Thinking"],
    boostActivities: ["Coding Projects", "Hackathons", "Coding Competitions"],
    boostAcademicInterests: ["Cybersecurity", "Computer Networks", "Software Engineering", "Algorithms"],
    boostHobbies: ["Coding", "Technology Reading"],
  },

  // ── Data Science / Analytics ─────────────────────────────────────────────
  {
    keywords: ["data science", "data analytics", "data engineering", "big data"],
    boostSkills: ["Python", "Data Analysis", "Statistics", "Algorithmic Thinking"],
    boostActivities: ["Coding Projects", "Research Projects", "Hackathons"],
    boostAcademicInterests: ["Data Science", "Machine Learning", "Algorithms", "Artificial Intelligence"],
    boostHobbies: ["Coding", "Statistics", "Technology Reading"],
  },

  // ── Software Engineering / Development ───────────────────────────────────
  {
    keywords: ["software engineering", "software development", "computer science", "computing", "web development"],
    boostSkills: ["Python", "JavaScript", "Git / Version Control", "Problem Solving"],
    boostActivities: ["Coding Projects", "Hackathons", "Open Source Participation"],
    boostAcademicInterests: ["Software Engineering", "Algorithms", "Cloud Computing"],
    boostHobbies: ["Coding", "Building Small Digital Projects", "Open Source Exploration"],
  },

  // ── Robotics / Automation ────────────────────────────────────────────────
  {
    keywords: ["robotics", "automation", "mechatronics", "embedded"],
    boostSkills: ["CAD", "Programming", "MATLAB", "Technical Problem Solving"],
    boostActivities: ["Robotics Projects", "Engineering Competitions", "Electronics Projects"],
    boostAcademicInterests: ["Robotics", "Automation", "Embedded Systems", "Electronics"],
    boostHobbies: ["Robotics", "Electronics", "DIY Projects"],
  },

  // ── Business Analytics / Intelligence ────────────────────────────────────
  {
    keywords: ["business analytics", "business intelligence", "business analysis", "analytics", "mba", "management science"],
    boostSkills: ["Microsoft Excel", "Data Analysis", "Business Analysis", "Statistics"],
    boostActivities: ["Market Research Projects", "Business Case Competitions", "Research Projects"],
    boostAcademicInterests: ["Business Analytics", "Digital Transformation", "Strategic Management"],
    boostHobbies: ["Business Reading", "Current Business Affairs", "Financial News"],
  },

  // ── Finance / Accounting / Investment ────────────────────────────────────
  {
    keywords: ["finance", "financial", "accounting", "investment", "banking", "fintech"],
    boostSkills: ["Financial Analysis", "Microsoft Excel", "Statistics", "Quantitative Reasoning"],
    boostActivities: ["Finance Club", "Investment Simulation", "Economics Society"],
    boostAcademicInterests: ["Financial Markets", "Investment Analysis", "Macroeconomics", "Econometrics"],
    boostHobbies: ["Financial News", "Investment Education", "Economics Reading"],
  },

  // ── Economics ────────────────────────────────────────────────────────────
  {
    keywords: ["economics", "econom"],
    boostSkills: ["Economic Analysis", "Data Analysis", "Statistics", "Quantitative Reasoning"],
    boostActivities: ["Economics Society", "Research Projects", "Case Competitions"],
    boostAcademicInterests: ["Macroeconomics", "Microeconomics", "Behavioural Economics", "International Economics"],
    boostHobbies: ["Economics Reading", "Current Affairs", "Financial News"],
  },

  // ── International Relations / Diplomacy ──────────────────────────────────
  {
    keywords: ["international relations", "diplomacy", "global", "international affairs", "foreign policy"],
    boostSkills: ["Academic Research", "Analytical Writing", "Policy Analysis", "Public Speaking"],
    boostActivities: ["Model United Nations", "Policy Research", "Debate Club"],
    boostAcademicInterests: ["International Relations", "Diplomacy", "Political Economy", "International Security"],
    boostHobbies: ["Current Affairs", "International News", "Political History"],
  },

  // ── Political Science / Government ───────────────────────────────────────
  {
    keywords: ["political science", "politics", "governance", "public policy", "public administration"],
    boostSkills: ["Academic Research", "Critical Thinking", "Policy Analysis", "Debate"],
    boostActivities: ["Debate Club", "Student Council", "Youth Parliament", "Model United Nations"],
    boostAcademicInterests: ["Comparative Politics", "Public Policy", "Governance", "Human Rights"],
    boostHobbies: ["Current Affairs", "Political History", "Debate"],
  },

  // ── Law ──────────────────────────────────────────────────────────────────
  {
    keywords: ["law", "legal", "llb", "llm", "jurisprudence"],
    boostSkills: ["Legal Research", "Argumentation", "Analytical Writing", "Critical Thinking"],
    boostActivities: ["Moot Court", "Debate", "Essay Competitions", "Law Society"],
    boostAcademicInterests: ["Constitutional Law", "International Law", "Human Rights", "Corporate Law"],
    boostHobbies: ["Legal News", "Current Affairs", "Reading"],
  },

  // ── Medicine / Pharmacy / Health Sciences ────────────────────────────────
  {
    keywords: ["medicine", "medical", "pharmacy", "nursing", "dentistry", "mbbs", "mbchb"],
    boostSkills: ["Scientific Research", "Laboratory Skills", "Data Interpretation", "Observation"],
    boostActivities: ["Science Clubs", "Health Awareness Activities", "First-Aid Training"],
    boostAcademicInterests: ["Human Biology", "Biomedical Science", "Public Health", "Genetics"],
    boostHobbies: ["Science Reading", "Health & Wellness Reading", "Biology"],
  },

  // ── Psychology ───────────────────────────────────────────────────────────
  {
    keywords: ["psychology", "counselling", "behavioral", "behavioural"],
    boostSkills: ["Research", "Data Interpretation", "Communication", "Academic Writing"],
    boostActivities: ["Community Projects", "Volunteering", "Survey Projects"],
    boostAcademicInterests: ["Psychology", "Human Development", "Social Policy"],
    boostHobbies: ["Social Issues", "Reading", "Documentary Films"],
  },

  // ── Engineering (Mechanical / Civil / Chemical) ───────────────────────────
  {
    keywords: ["mechanical engineering", "civil engineering", "chemical engineering", "electrical engineering", "structural"],
    boostSkills: ["CAD", "MATLAB", "Mathematics", "Technical Drawing"],
    boostActivities: ["Prototype Development", "Engineering Competitions", "CAD Projects"],
    boostAcademicInterests: ["Mechanical Systems", "Sustainable Engineering", "Engineering Design"],
    boostHobbies: ["DIY Projects", "Model Building", "Electronics"],
  },

  // ── Architecture / Urban Planning ─────────────────────────────────────────
  {
    keywords: ["architecture", "urban planning", "interior design", "landscape"],
    boostSkills: ["CAD", "Technical Drawing", "Creative Thinking", "Visual Communication"],
    boostActivities: ["Portfolio Projects", "Design Competitions", "Art Exhibitions"],
    boostAcademicInterests: ["Engineering Design", "Visual Communication", "User Experience Design"],
    boostHobbies: ["Art", "Design", "Photography"],
  },

  // ── Digital Media / Film / Photography ───────────────────────────────────
  {
    keywords: ["digital media", "film", "filmmaking", "media", "journalism", "photography", "cinematography"],
    boostSkills: ["Video Editing", "Adobe Creative Tools", "Visual Communication", "Storytelling"],
    boostActivities: ["Short Films", "Portfolio Projects", "Photography Projects", "College Media Team"],
    boostAcademicInterests: ["Digital Media", "Film Studies", "Photography", "Visual Communication"],
    boostHobbies: ["Photography", "Video Editing", "Cinematography", "Film"],
  },

  // ── Graphic Design / UX Design ───────────────────────────────────────────
  {
    keywords: ["graphic design", "ux design", "user experience", "ui design", "product design", "interaction design"],
    boostSkills: ["Graphic Design", "Adobe Creative Tools", "Visual Communication", "Creative Thinking"],
    boostActivities: ["Portfolio Projects", "Design Competitions", "Short Films"],
    boostAcademicInterests: ["User Experience Design", "Graphic Design", "Visual Communication"],
    boostHobbies: ["Design", "Illustration", "Art"],
  },

  // ── Marketing / Advertising ───────────────────────────────────────────────
  {
    keywords: ["marketing", "advertising", "brand", "digital marketing", "communications"],
    boostSkills: ["Communication", "Presentation Skills", "Market Research", "Content Creation"],
    boostActivities: ["Market Research Projects", "Business Case Competitions", "Social Media Content"],
    boostAcademicInterests: ["Marketing", "Consumer Behaviour", "Digital Transformation", "Business Analytics"],
    boostHobbies: ["Business Reading", "Current Business Affairs", "Content Creation"],
  },

  // ── Hospitality / Hotel / Tourism ────────────────────────────────────────
  {
    keywords: ["hospitality", "hotel", "tourism", "travel management", "events management"],
    boostSkills: ["Customer Service", "Event Management", "Communication", "Cultural Awareness"],
    boostActivities: ["Event Organisation", "Cultural Events", "Hospitality Workshops"],
    boostAcademicInterests: ["Hospitality Management", "Tourism Management", "Event Management"],
    boostHobbies: ["Travel", "Cooking", "Cultural Exploration"],
  },

  // ── Environmental Science / Sustainability ─────────────────────────────────
  {
    keywords: ["environmental", "sustainability", "climate", "ecology", "earth science", "geography"],
    boostSkills: ["Scientific Research", "Data Analysis", "Research Methods", "Observation"],
    boostActivities: ["Environmental Projects", "Science Clubs", "Research Projects"],
    boostAcademicInterests: ["Environmental Science", "Climate Science", "Biology", "Scientific Research"],
    boostHobbies: ["Nature", "Environmental Activities", "Science Reading"],
  },

  // ── Social Work / Community Development ───────────────────────────────────
  {
    keywords: ["social work", "community development", "development studies", "human rights", "ngo"],
    boostSkills: ["Communication", "Research", "Academic Writing", "Qualitative Analysis"],
    boostActivities: ["Community Projects", "Volunteering", "NGO Activities", "Awareness Campaigns"],
    boostAcademicInterests: ["Community Development", "Human Rights", "Social Policy", "Migration"],
    boostHobbies: ["Social Issues", "Community Activities", "Volunteering"],
  },
];
