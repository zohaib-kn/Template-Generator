/**
 * features/document-generator/guidance/academicCatalog.ts
 *
 * Comprehensive academic domain catalog providing branch-aware recommendations,
 * verified role titles, project topics, certifications, skills, and academic interests.
 *
 * Mapped to the 10 core AcademicDomain categories in services/academicAlignment/types.ts.
 */

import type { AcademicDomain } from "@/services/academicAlignment/types";

export interface AcademicCatalogItem {
  title: string;
  hint?: string;
  category?: "domain" | "transferable" | "bridge";
}

export interface DomainAcademicCatalog {
  domain: AcademicDomain;
  displayName: string;
  description: string;
  roles: AcademicCatalogItem[];
  projects: AcademicCatalogItem[];
  skills: {
    domain: string[];
    transferable: string[];
  };
  certifications: AcademicCatalogItem[];
  academicInterests: string[];
}

export const DOMAIN_ACADEMIC_CATALOG: Record<AcademicDomain, DomainAcademicCatalog> = {
  SOCIAL_HUMANITIES: {
    domain: "SOCIAL_HUMANITIES",
    displayName: "Social Sciences & Humanities",
    description: "History, Sociology, Political Science, Philosophy, Literature, and Cultural Studies.",
    roles: [
      { title: "Archival Research Assistant", hint: "Primary source archiving, document cataloging, historical record preservation." },
      { title: "Editorial & Publishing Intern", hint: "Manuscript review, academic editing, fact-checking, content synthesis." },
      { title: "Curatorial Assistant / Museum Intern", hint: "Exhibition research, artifact provenance, visitor educational programming." },
      { title: "Qualitative Research Assistant", hint: "Interview transcription, thematic coding, field survey data collection." },
      { title: "Policy & Social Research Intern", hint: "Legislative brief preparation, public policy research, stakeholder reports." },
      { title: "Content & Communications Specialist", hint: "Institutional outreach, academic blogging, long-form narrative writing." },
      { title: "Cultural Heritage Documentation Assistant", hint: "Historical site documentation, oral history recording, archival digitization." },
      { title: "Historical Research Associate", hint: "Historiographical review, comparative historical analysis, archival retrieval." },
    ],
    projects: [
      { title: "Archival Analysis of 19th-Century Colonial Trade Records", hint: "Primary source qualitative research examining regional commercial networks." },
      { title: "Oral History & Community Memory Documentation Project", hint: "Structured ethnographic interviews preserving local socio-cultural narratives." },
      { title: "Historiographical Analysis of Modern Social Movements", hint: "Comparative textual analysis of primary media and legislative reactions." },
      { title: "Digital Cultural Heritage Preservation & Cataloging", hint: "Digitization and metadata tagging of fragile historical manuscripts." },
      { title: "Comparative Study of Constitutional & Democratic Institutions", hint: "Cross-jurisdictional analysis of institutional development and civil rights." },
    ],
    skills: {
      domain: [
        "Primary Source Analysis",
        "Archival Research",
        "Historiographical Evaluation",
        "Qualitative Coding (NVivo / ATLAS.ti)",
        "Paleography & Document Transcription",
        "Critical Discourse Analysis",
        "Bibliographic & Archival Cataloging",
        "Ethnographic Interviewing",
      ],
      transferable: [
        "Analytical Synthesis",
        "Critical Thinking",
        "Long-Form Academic Writing",
        "Fact-Checking & Source Verification",
        "Cross-Cultural Communication",
        "Project Documentation",
        "Qualitative Data Synthesis",
      ],
    },
    certifications: [
      { title: "Digital Humanities & Archival Methods", hint: "Methodologies for digital textual analysis and archival curation." },
      { title: "Qualitative Research Methods in Social Sciences", hint: "Research design, structured interviewing, and thematic analysis." },
      { title: "Cultural Heritage Preservation & Management", hint: "Artifact handling, museum ethics, and provenance research." },
      { title: "Professional Academic & Technical Writing", hint: "Formal research documentation and scholarly publication standards." },
    ],
    academicInterests: [
      "Modern World History",
      "Colonial & Post-Colonial Studies",
      "Historiography & Archival Science",
      "Cultural Heritage & Museology",
      "Social & Political Philosophy",
      "International Relations & Diplomacy",
      "Sociology of Globalization",
      "Oral History & Memory Studies",
    ],
  },

  COMPUTING: {
    domain: "COMPUTING",
    displayName: "Computer Science & IT",
    description: "Software Engineering, Data Science, AI/ML, Cybersecurity, and Cloud Systems.",
    roles: [
      { title: "Data Analytics Intern", hint: "Data cleaning, statistical querying with SQL, business dashboard reporting." },
      { title: "Junior Software Developer Intern", hint: "Feature development, bug fixes, unit testing, git version control." },
      { title: "Machine Learning Research Assistant", hint: "Model training, dataset labeling, feature engineering with Python." },
      { title: "Full-Stack Web Development Intern", hint: "REST API integration, responsive frontend UI, relational database management." },
      { title: "Cybersecurity Analyst Trainee", hint: "Vulnerability scanning, security log analysis, compliance auditing." },
      { title: "Cloud Systems & DevOps Trainee", hint: "CI/CD automation pipelines, containerization with Docker, cloud provisioning." },
    ],
    projects: [
      { title: "Exploratory Data Analysis & Predictive Modeling Pipeline", hint: "End-to-end Python ML model with Pandas, Scikit-Learn, and Streamlit visualization." },
      { title: "Full-Stack Web Application with Authentication & REST APIs", hint: "Next.js / Node.js application featuring JWT auth, PostgreSQL, and responsive UI." },
      { title: "Automated Log Anomaly Detector using Machine Learning", hint: "Classification algorithm analyzing server access logs for anomalous behavior." },
      { title: "Distributed Microservices Architecture with Docker", hint: "Containerized service mesh communicating over gRPC and message queues." },
    ],
    skills: {
      domain: [
        "Python (Data Analysis & Automation)",
        "SQL & Relational Databases (PostgreSQL / MySQL)",
        "TypeScript / JavaScript",
        "React / Next.js",
        "REST APIs & Backend Architecture",
        "Git & Version Control Workflows",
        "Docker & Containerization",
        "Data Visualization (Tableau / Power BI / Matplotlib)",
      ],
      transferable: [
        "Algorithmic Problem Solving",
        "Systematic Debugging",
        "Technical Documentation",
        "Agile / Scrum Collaboration",
        "Analytical Reasoning",
      ],
    },
    certifications: [
      { title: "Google Data Analytics Professional Certificate", hint: "Coursera / Google verified track covering SQL, R, Tableau, and data pipelines." },
      { title: "AWS Certified Cloud Practitioner", hint: "Foundational cloud architecture, security, and AWS core services." },
      { title: "Meta Front-End Developer Professional Certificate", hint: "HTML/CSS, React, responsive design, and UI testing." },
      { title: "IBM Data Science Professional Certificate", hint: "Python, SQL, data analysis, machine learning algorithms." },
    ],
    academicInterests: [
      "Artificial Intelligence & Machine Learning",
      "Big Data Analytics & Business Intelligence",
      "Cloud Computing & Distributed Systems",
      "Cybersecurity & Information Assurance",
      "Human-Computer Interaction (HCI)",
      "Software Architecture & Design Patterns",
    ],
  },

  BUSINESS: {
    domain: "BUSINESS",
    displayName: "Business & Management",
    description: "Business Administration, Marketing, Operations, Strategy, and Entrepreneurship.",
    roles: [
      { title: "Business Development Intern", hint: "Lead generation, B2B market research, sales pipeline qualification." },
      { title: "Marketing Strategy Intern", hint: "Campaign planning, digital content marketing, consumer engagement tracking." },
      { title: "Operations & Supply Chain Trainee", hint: "Process optimization, inventory tracking, vendor management workflows." },
      { title: "Market Research Analyst Intern", hint: "Competitive benchmarking, industry survey synthesis, executive presentations." },
      { title: "Product Management Trainee", hint: "User story drafting, feature prioritization, cross-functional coordination." },
    ],
    projects: [
      { title: "Comprehensive Market Entry Strategy for Emerging Markets", hint: "PESTLE analysis, competitor evaluation, and financial feasibility study." },
      { title: "Consumer Purchase Behavior & Brand Equity Survey", hint: "Quantitative survey of 300+ respondents measuring brand switching behavior." },
      { title: "Supply Chain Resilience & Vendor Bottleneck Audit", hint: "Process flow mapping identifying lead-time delays and efficiency gains." },
    ],
    skills: {
      domain: [
        "Market Research & Competitive Analysis",
        "Financial & Operational Modeling (Excel)",
        "CRM Systems (HubSpot / Salesforce)",
        "Digital Marketing & SEO Analytics",
        "Project Management (Jira / Asana)",
        "Business Process Mapping",
      ],
      transferable: [
        "Stakeholder Communication",
        "Executive Presentation & Deck Design",
        "Cross-Functional Leadership",
        "Strategic Negotiation",
        "Data-Driven Decision Making",
      ],
    },
    certifications: [
      { title: "Google Digital Marketing & E-Commerce Certificate", hint: "Customer funnel optimization, digital ads, and analytics." },
      { title: "HubSpot Inbound Marketing Certification", hint: "Content marketing strategy, lead nurturing, and CRM workflows." },
      { title: "Project Management Foundations (CAPM / PMI)", hint: "Standard project management methodologies and lifecycle controls." },
    ],
    academicInterests: [
      "Corporate Strategy & Global Management",
      "Consumer Psychology & Marketing Analytics",
      "Sustainable Business & ESG Frameworks",
      "Supply Chain Operations & Logistics",
      "Innovation & Technology Commercialization",
    ],
  },

  ECONOMICS_FINANCE: {
    domain: "ECONOMICS_FINANCE",
    displayName: "Economics & Finance",
    description: "Quantitative Finance, Banking, Macroeconomics, Econometrics, and Investment Analysis.",
    roles: [
      { title: "Financial Analyst Trainee", hint: "Financial statement modeling, ratio analysis, industry valuation comparables." },
      { title: "Economic Research Intern", hint: "Macroeconomic indicator tracking, econometric data regression, policy briefs." },
      { title: "Equity Research Trainee", hint: "DCF modeling, quarterly earnings analysis, sector valuation reports." },
      { title: "Risk & Compliance Analyst Intern", hint: "Regulatory risk assessment, KYC/AML review, audit support." },
    ],
    projects: [
      { title: "Discounted Cash Flow (DCF) & Multiples Valuation of Tech Equities", hint: "Three-statement financial model forecasting 5-year cash flows and terminal value." },
      { title: "Econometric Analysis of Inflationary Pressures on Emerging Markets", hint: "Time-series regression in R / Stata analyzing macroeconomic monetary shocks." },
    ],
    skills: {
      domain: [
        "Financial Modeling (Three-Statement & DCF)",
        "Econometric Modeling (R / Stata / Python)",
        "Financial Statement Analysis",
        "Bloomberg Terminal / Refinitiv",
        "Corporate Valuation",
      ],
      transferable: [
        "Quantitative Rigor",
        "Risk Assessment",
        "Statistical Interpretation",
        "Executive Financial Reporting",
      ],
    },
    certifications: [
      { title: "Bloomberg Market Concepts (BMC)", hint: "Core economics, currencies, fixed income, and equities." },
      { title: "Financial Modeling & Valuation Analyst (FMVA)", hint: "Corporate Finance Institute modeling and valuation." },
    ],
    academicInterests: [
      "Behavioral Economics & Decision Sciences",
      "Quantitative Portfolio Management",
      "Monetary Policy & Central Banking",
      "Corporate Governance & Financial Regulation",
    ],
  },

  ENGINEERING: {
    domain: "ENGINEERING",
    displayName: "Engineering",
    description: "Mechanical, Civil, Electrical, Electronics, Chemical, and Industrial Engineering.",
    roles: [
      { title: "CAD / Design Engineering Intern", hint: "3D parametric modeling, technical blueprint drafting, tolerance analysis." },
      { title: "Quality Assurance & Testing Intern", hint: "Failure mode analysis, dimensional inspection, ISO standard adherence." },
      { title: "Embedded Systems & IoT Trainee", hint: "Microcontroller programming (C/C++), sensor interfacing, circuit prototyping." },
      { title: "Project Site Engineering Trainee", hint: "Construction milestone tracking, material specification audits, safety checks." },
    ],
    projects: [
      { title: "Finite Element Analysis (FEA) of Structural Bracket Assemblies", hint: "ANSYS / SolidWorks stress, strain, and thermal gradient simulation." },
      { title: "Microcontroller-Based Sensor Monitoring System", hint: "Arduino / STM32 telemetry system with real-time feedback loop." },
    ],
    skills: {
      domain: [
        "Computer-Aided Design (AutoCAD / SolidWorks / CATIA)",
        "Finite Element Analysis (ANSYS)",
        "MATLAB & Simulink Simulation",
        "C / C++ for Embedded Systems",
        "Geometric Dimensioning & Tolerancing (GD&T)",
      ],
      transferable: [
        "Root Cause Analysis",
        "Technical Troubleshooting",
        "Safety Compliance",
        "Technical Report Writing",
      ],
    },
    certifications: [
      { title: "Certified SolidWorks Associate (CSWA)", hint: "Mechanical CAD modeling and drawing validation." },
      { title: "Six Sigma Yellow Belt", hint: "Process variance reduction and statistical quality control." },
    ],
    academicInterests: [
      "Robotics & Autonomous Mechatronics",
      "Renewable Energy Systems & Thermodynamics",
      "Smart Materials & Structural Mechanics",
      "Industrial Automation & Manufacturing 4.0",
    ],
  },

  SCIENCE: {
    domain: "SCIENCE",
    displayName: "Natural & Physical Sciences",
    description: "Physics, Chemistry, Biology, Mathematics, Statistics, and Environmental Science.",
    roles: [
      { title: "Laboratory Research Assistant", hint: "Sample preparation, assay execution, lab safety compliance, log maintenance." },
      { title: "Statistical Analyst Intern", hint: "Hypothesis testing, ANOVA, sample distribution analysis using R/Python." },
      { title: "Environmental Field Research Trainee", hint: "Soil and water ecological sampling, GIS spatial data logging." },
    ],
    projects: [
      { title: "Spectrophotometric Analysis of Chemical Reaction Kinetics", hint: "Controlled laboratory assay calculating rate constants and activation energy." },
      { title: "Statistical Analysis of Environmental Pollutant Concentrations", hint: "Spatial regression testing seasonal variations in particulate levels." },
    ],
    skills: {
      domain: [
        "Laboratory Protocols & Spectrometry",
        "Statistical Hypothesis Testing (R / SPSS)",
        "Experimental Design & Control Groups",
        "Data Sampling & Calibration",
      ],
      transferable: [
        "Empirical Validation",
        "Systematic Methodology",
        "Precision & Documentation",
      ],
    },
    certifications: [
      { title: "Good Laboratory Practice (GLP) Foundation", hint: "Quality standards for laboratory research and record-keeping." },
      { title: "Applied Statistics with R / Python", hint: "Parametric and non-parametric data testing." },
    ],
    academicInterests: [
      "Materials Science & Nanotechnology",
      "Environmental Sustainability & Climate Modeling",
      "Statistical Physics & Quantum Mechanics",
      "Biotechnology & Organic Synthesis",
    ],
  },

  HEALTH_MEDICINE: {
    domain: "HEALTH_MEDICINE",
    displayName: "Health & Medical Sciences",
    description: "Medicine, Nursing, Pharmacy, Biomedical Sciences, Public Health, and Physiotherapy.",
    roles: [
      { title: "Clinical Research Assistant", hint: "Patient cohort monitoring, clinical trial protocol documentation, CRF logging." },
      { title: "Public Health Trainee", hint: "Epidemiological data collation, community health education outreach." },
      { title: "Hospital Pharmacy / Lab Intern", hint: "Pharmaceutical inventory review, dosage calculations, safety audits." },
    ],
    projects: [
      { title: "Retrospective Cohort Study on Community Health Interventions", hint: "Epidemiological analysis measuring preventive health intervention efficacy." },
      { title: "Audit of Hospital Patient Safety Protocols & Compliance", hint: "Cross-sectional survey of infection control standard compliance." },
    ],
    skills: {
      domain: [
        "Good Clinical Practice (GCP)",
        "Biostatistics & Clinical Epidemiology",
        "Medical Record Documentation",
        "Laboratory Diagnostics & Assays",
      ],
      transferable: [
        "Patient Empathy & Communication",
        "Bioethics & Confidentiality (HIPAA/GDPR)",
        "Emergency Prioritization",
      ],
    },
    certifications: [
      { title: "Good Clinical Practice (GCP) Certification", hint: "ICH GCP guidelines for conducting ethical clinical trials." },
      { title: "Foundations of Public Health & Epidemiology", hint: "Disease surveillance and biostatistical modeling." },
    ],
    academicInterests: [
      "Epidemiology & Global Public Health",
      "Molecular Medicine & Therapeutics",
      "Health Informatics & Digital Health",
      "Pharmacovigilance & Drug Safety",
    ],
  },

  LAW: {
    domain: "LAW",
    displayName: "Law & Legal Studies",
    description: "Jurisprudence, Corporate Law, International Law, Constitutional Law, and Human Rights.",
    roles: [
      { title: "Legal Research Intern", hint: "Case law retrieval (Westlaw/SCC), statutory research, jurisprudence synthesis." },
      { title: "Paralegal Assistant", hint: "Affidavit drafting, court filing preparation, case bundle management." },
      { title: "Corporate Compliance Trainee", hint: "Regulatory disclosure tracking, contract clause benchmarking, audit support." },
    ],
    projects: [
      { title: "Comparative Analysis of Data Privacy Frameworks (GDPR vs Regional Law)", hint: "Statutory comparison of user consent, cross-border data transfer, and penalties." },
      { title: "Moot Court Memorial: Transboundary Environmental Liability", hint: "Comprehensive written pleadings under international treaty law." },
    ],
    skills: {
      domain: [
        "Legal Research (SCC Online / Manupatra / Westlaw)",
        "Contract Drafting & Clause Review",
        "Case Law Synthesis & Statutory Interpretation",
        "Legal Brief & Memorial Writing",
      ],
      transferable: [
        "Persuasive Advocacy",
        "Logical Deductive Reasoning",
        "Regulatory Compliance Mindset",
      ],
    },
    certifications: [
      { title: "Corporate Law & Governance Compliance", hint: "Corporate filings, director fiduciary duties, and secretarial standards." },
      { title: "Intellectual Property Rights (IPR) & Technology Law", hint: "Patents, trademarks, copyrights, and software licensing." },
    ],
    academicInterests: [
      "International Commercial Arbitration",
      "Constitutional Law & Civil Liberties",
      "Intellectual Property & Technology Law",
      "Corporate Governance & Securities Regulation",
    ],
  },

  ARTS_DESIGN_MEDIA: {
    domain: "ARTS_DESIGN_MEDIA",
    displayName: "Arts, Design & Media",
    description: "Fine Arts, Graphic Design, UI/UX Design, Film, Animation, and Architecture.",
    roles: [
      { title: "UI/UX Design Intern", hint: "User journeys, wireframing, high-fidelity Figma prototyping, usability tests." },
      { title: "Graphic & Visual Designer Intern", hint: "Brand identity, typography hierarchy, social graphics, promotional collaterals." },
      { title: "Multimedia Production Intern", hint: "Audio/video editing, motion graphics, digital storytelling post-production." },
    ],
    projects: [
      { title: "End-to-End Mobile App UI/UX Case Study", hint: "User research, persona definition, wireframing, and interactive design system in Figma." },
      { title: "Brand Identity & Visual System Redesign", hint: "Typography guide, logo mark geometry, color palette, and packaging standards." },
    ],
    skills: {
      domain: [
        "Figma & Design Systems",
        "Adobe Creative Suite (Photoshop / Illustrator / Premiere)",
        "Wireframing & Prototyping",
        "Typography & Layout Hierarchy",
        "User Usability Testing",
      ],
      transferable: [
        "Visual Storytelling",
        "Iterative Problem Solving",
        "User Empathy & Research",
      ],
    },
    certifications: [
      { title: "Google UX Design Professional Certificate", hint: "Figma prototyping, responsive design, user research methodologies." },
      { title: "Adobe Certified Professional in Visual Design", hint: "Industry standard Photoshop and Illustrator competencies." },
    ],
    academicInterests: [
      "Human-Centered Interaction & Design Systems",
      "Typography & Visual Semi-otics",
      "Sustainable Architecture & Spatial Design",
      "Generative Art & Computational Design",
    ],
  },

  HOSPITALITY_TOURISM: {
    domain: "HOSPITALITY_TOURISM",
    displayName: "Hospitality & Tourism",
    description: "Hotel Management, Tourism, Event Management, and Culinary Arts.",
    roles: [
      { title: "Hospitality Operations Intern", hint: "Front desk guest management, reservations, customer experience auditing." },
      { title: "Event Management Coordinator Intern", hint: "Vendor contracting, logistics coordination, run-of-show scheduling." },
      { title: "Tourism Marketing Associate", hint: "Destination travel itinerary design, partner agency communications." },
    ],
    projects: [
      { title: "Eco-Tourism Feasibility Study & Community Impact Analysis", hint: "Sustainable tourism development model evaluating environmental and local economic impact." },
      { title: "Hotel Guest Journey & Service Recovery Audit", hint: "Cross-functional analysis of front-of-house service touchpoints and customer satisfaction metrics." },
    ],
    skills: {
      domain: [
        "Property Management Systems (PMS)",
        "Guest Service Management & Conflict Resolution",
        "Event Logistics & Vendor Coordination",
        "Tourism Destination Marketing",
      ],
      transferable: [
        "Interpersonal Emotional Intelligence",
        "Crisis & Operational Management",
        "Cross-Cultural Etiquette",
      ],
    },
    certifications: [
      { title: "Certified Hospitality Industry Professional", hint: "Hotel operations, revenue management, customer excellence." },
    ],
    academicInterests: [
      "Sustainable & Responsible Tourism",
      "Revenue Management & Dynamic Pricing",
      "Luxury Brand Hospitality Experience",
    ],
  },

  UNKNOWN: {
    domain: "UNKNOWN",
    displayName: "General Academic Fields",
    description: "General academic and professional disciplines.",
    roles: [
      { title: "Graduate Research Assistant", hint: "Scholarly literature review, data collection, and report preparation." },
      { title: "Project Coordinator Intern", hint: "Milestone tracking, team coordination, meeting documentation." },
    ],
    projects: [
      { title: "Independent Academic Capstone Project", hint: "Independent research synthesis on a chosen topic." },
    ],
    skills: {
      domain: ["Scholarly Research", "Data Synthesis", "Report Drafting"],
      transferable: ["Critical Thinking", "Written & Oral Communication", "Team Collaboration"],
    },
    certifications: [
      { title: "Advanced Academic Research Methodology", hint: "Literature review and scientific writing." },
    ],
    academicInterests: ["Interdisciplinary Studies", "Research Methodologies"],
  },
};

// ---------------------------------------------------------------------------
// Helper: Get Catalog by Domain
// ---------------------------------------------------------------------------

export function getDomainCatalog(domain: AcademicDomain): DomainAcademicCatalog {
  return DOMAIN_ACADEMIC_CATALOG[domain] ?? DOMAIN_ACADEMIC_CATALOG.UNKNOWN;
}

// ---------------------------------------------------------------------------
// Fuzzy Matching & Typo Resilience
// ---------------------------------------------------------------------------

/**
 * Basic Levenshtein distance for spelling error tolerance (e.g. "Data anlytics" -> "Data analytics").
 */
function levenshteinDistance(a: string, b: string): number {
  const an = a.length;
  const bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;

  const matrix = Array.from({ length: bn + 1 }, () => new Array(an + 1).fill(0));

  for (let i = 0; i <= an; i++) matrix[0][i] = i;
  for (let j = 0; j <= bn; j++) matrix[j][0] = j;

  for (let j = 1; j <= bn; j++) {
    for (let i = 1; i <= an; i++) {
      const cost = a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j - 1][i] + 1,
        matrix[j][i - 1] + 1,
        matrix[j - 1][i - 1] + cost
      );
    }
  }

  return matrix[bn][an];
}

/**
 * Searches and ranks suggested roles matching a user input string.
 * Supports exact prefix, substring, and fuzzy matching for typos.
 */
export function findMatchingSuggestions(
  query: string,
  candidateTitles: string[],
  limit = 6
): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return candidateTitles.slice(0, limit);

  const qTokens = q.split(/\s+/).filter(Boolean);

  const scored = candidateTitles.map((title) => {
    const t = title.toLowerCase();
    // Exact or prefix match -> highest priority
    if (t === q) return { title, score: 100 };
    if (t.startsWith(q)) return { title, score: 85 };
    if (t.includes(q)) return { title, score: 75 };

    const tTokens = t.split(/\s+/).filter(Boolean);

    // Check if every query token has a matching token in candidate
    let allTokensMatched = true;
    let totalDist = 0;

    for (const qTok of qTokens) {
      let bestTokDist = 999;
      for (const tTok of tTokens) {
        if (tTok.startsWith(qTok)) {
          bestTokDist = 0;
          break;
        }
        const d = levenshteinDistance(qTok, tTok);
        if (d < bestTokDist) bestTokDist = d;
      }
      // Allow distance <= 2 for words >= 5 chars, or <= 1 for short words
      const maxAllowed = qTok.length >= 5 ? 2 : 1;
      if (bestTokDist <= maxAllowed) {
        totalDist += bestTokDist;
      } else {
        allTokensMatched = false;
        break;
      }
    }

    if (allTokensMatched) {
      return { title, score: 65 - totalDist * 10 };
    }

    // Single token fuzzy match if single word query
    if (qTokens.length === 1) {
      for (const tTok of tTokens) {
        const d = levenshteinDistance(qTokens[0], tTok);
        if (d <= (qTokens[0].length >= 5 ? 2 : 1)) {
          return { title, score: 45 - d * 10 };
        }
      }
    }

    return { title, score: 0 };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.title);
}
