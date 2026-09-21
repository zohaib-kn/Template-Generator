/**
 * services/ai/config/writingRules.ts
 *
 * Configurable writing rules, semantic reference dictionaries, generic phrase blacklists,
 * and sentence variation guidelines.
 */

/**
 * Concept / Reference groups for natural semantic variation.
 * Used to guide prompts and validate reference diversity rather than performing blind string replacements.
 */
export const CONCEPT_REFERENCES = {
  university: [
    "the university",
    "the institution",
    "the academic department",
    "the faculty",
  ],
  programme: [
    "the programme",
    "the course",
    "this curriculum",
    "my degree programme",
    "the coursework",
  ],
  academics: [
    "these subjects",
    "this academic background",
    "this foundation",
    "these foundational disciplines",
    "my prior academic training",
  ],
  career: [
    "my professional career",
    "my future work",
    "my professional goals",
    "my career trajectory",
    "my long-term professional aspirations",
  ],
  experience: [
    "this experience",
    "this exposure",
    "the practical exposure",
    "these responsibilities",
    "this hands-on involvement",
  ],
} as const;

/**
 * Evaluative / promotional words that indicate promotional AI slop when concentrated.
 * Scored per sentence and paragraph.
 */
export const EVALUATIVE_WORDS = [
  "prestigious",
  "remarkable",
  "remarkably",
  "exceptional",
  "exceptionally",
  "distinguished",
  "pioneering",
  "rigorous",
  "comprehensive",
  "comprehensively",
  "renowned",
  "enriching",
  "robust",
  "high-impact",
  "seamless",
  "seamlessly",
  "stellar",
  "illustrious",
  "acclaimed",
  "esteemed",
  "unwavering",
  "resolutely",
  "resolute",
  "steadfast",
  "unmatched",
  "invaluable",
  "impeccable",
  "world-class",
  "cutting-edge",
  "state-of-the-art",
] as const;

/**
 * Abstract nouns and nominalizations that make writing sound corporate, bureaucratic, or overly AI-polished.
 * Scored per sentence and paragraph.
 */
export const ABSTRACT_WORDS = [
  "framework",
  "frameworks",
  "methodology",
  "methodologies",
  "competencies",
  "competency",
  "execution",
  "expertise",
  "infrastructure",
  "perspective",
  "perspectives",
  "integration",
  "advancement",
  "advancements",
  "foundation",
  "foundations",
  "innovation",
  "innovations",
  "rigor",
  "legacy",
  "paradigm",
  "synergy",
  "synergies",
  "trajectory",
] as const;

/**
 * Plain-language transformation policy.
 * Maps inflated, academic, or corporate AI expressions to direct, capable student language.
 */
export const PLAIN_LANGUAGE_TRANSFORMATIONS: Record<string, string> = {
  "equip me with essential competencies": "help me develop the skills",
  "leverage the technical precision and analytical methodologies": "use the technical knowledge and practical skills",
  "build a high-impact technical career": "begin my professional career",
  "advanced technical execution": "practical engineering work",
  "translate these quantitative foundations into advanced technical execution": "apply my mathematics background to practical engineering work",
  "comprehensive curriculum perfectly balances theoretical rigor": "curriculum covers both theory and practical coursework",
  "vital technical competencies": "practical technical skills",
  "remarkable academic legacy": "established academic history",
  "exceptional standing": "academic standing",
  "remarkably well-structured curriculum": "well-structured coursework",
  "seamlessly integrates": "combines",
  "distinguished faculty": "experienced faculty",
  "pioneering research": "ongoing research",
  "globally enriching perspective": "broader perspective",
  "exceptional framework": "effective curriculum",
  "academically stimulating environment": "focused study environment",
  "robust foundation": "solid foundation",
  "technical precision and analytical methodologies": "technical knowledge and analytical skills",
  "unwavering support": "full financial support",
  "resolutely committed": "fully committed",
  "steadfast dedication": "dedication",
  "build an impactful professional career": "begin my career",
  "rigorous technical training and analytical methodologies": "technical knowledge and practical skills",
  "leverage the competencies acquired": "use what I learned",
  "contribute to the rapidly expanding technological ecosystem": "work in the technology sector",
  "acquire advanced competencies": "develop my skills",
  "prestigious European diploma": "degree",
  "world-class traditions of rigorous engineering scholarship": "engineering education",
  "optimize commercial decision-making": "help businesses make better decisions",
  "high-impact career": "career",
  "drive technological innovation": "develop practical software",
  "lead digital transformation": "work on technology projects",
  "create sustainable competitive advantage": "help organizations operate effectively",
  "navigate complex global ecosystems": "work in diverse environments",
  "rigorous analytical foundation": "strong academic background",
  "comprehensive training tailored to contemporary technical standards": "coursework covering modern technical skills",
  "practical execution of modern information systems": "practical work with computer systems",
  "complex infrastructural networks": "modern network systems",
  "mathematical rigor": "mathematics and problem solving",
  "sophisticated technical framework": "strong technical foundation",
  "multidisciplinary ecosystem": "diverse technical areas",
  "dynamic technological landscape": "technology sector",
  "transformative academic journey": "studies",
  "cutting-edge environment": "modern learning environment",
  "unparalleled opportunity": "great opportunity",
  "architect and manage advanced information infrastructure": "work in software and network engineering",
};


/**
 * Known AI-slop / generic marketing phrases to detect and control.
 */
export const GENERIC_AI_PHRASES = [
  "prestigious institution",
  "world-class",
  "perfectly aligns",
  "rich cultural heritage",
  "rich heritage",
  "stimulating environment",
  "technical acumen",
  "exceptional academic reputation",
  "unique opportunity",
  "renowned institution",
  "globally renowned",
  "academic excellence",
  "transformative journey",
  "ever-evolving landscape",
  "testament to",
  "beacon of",
  "cutting-edge pedagogy",
  "foster an environment",
  "tapestry of",
  "translate these quantitative foundations into advanced technical execution",
  "comprehensive curriculum perfectly balances theoretical rigor",
  "vital technical competencies",
  "remarkable academic legacy",
  "exceptional standing",
  "remarkably well-structured curriculum",
  "seamlessly integrates",
  "distinguished faculty",
  "pioneering research",
  "globally enriching perspective",
  "exceptional framework",
  "academically stimulating environment",
  "robust foundation",
  "high-impact technical career",
  "technical precision and analytical methodologies",
  "unwavering support",
  "resolutely committed",
  "steadfast dedication",
  "rigorous analytical foundation",
  "comprehensive training tailored to contemporary technical standards",
  "practical execution of modern information systems",
  "complex infrastructural networks",
  "mathematical rigor",
  "sophisticated technical framework",
  "multidisciplinary ecosystem",
  "dynamic technological landscape",
  "transformative academic journey",
  "cutting-edge environment",
  "unparalleled opportunity",
] as const;

/**
 * Sentence openings that degrade writing quality when repeated consecutively or frequently.
 */
export const REPETITIVE_SENTENCE_STARTERS = [
  "I chose",
  "I chose to",
  "I want",
  "I want to",
  "I intend",
  "I intend to",
  "I believe",
  "I believe that",
  "I hope",
  "I hope to",
  "My objective is",
  "My goal is",
  "My aim is",
  "It is my dream",
  "Ever since",
] as const;

/**
 * Document-specific sentence length guidelines.
 * For Visa Cover Letters:
 * - Preferred: 12-24 words
 * - Review: 25-30 words
 * - Rewrite where practical: over 30 words (for editorial sentences)
 */
export const COVER_LETTER_SENTENCE_THRESHOLDS = {
  preferredMin: 12,
  preferredMax: 24,
  reviewThreshold: 25,
  rewriteThreshold: 30,
} as const;

/**
 * Default word count thresholds for sentence complexity.
 */
export const SENTENCE_LENGTH_THRESHOLDS = {
  warningWords: 28,
  criticalWords: 35,
} as const;

/**
 * AI Cliché thresholds.
 * Tightened so that 1 cliché generates a warning, and >= 2 immediately triggers an Auditor rewrite.
 */
export const CLICHE_THRESHOLDS = {
  acceptableMax: 0,
  warningMax: 1,
  rewriteTrigger: 2,
} as const;

/**
 * Evaluative and Abstract language density thresholds per paragraph.
 */
export const DENSITY_THRESHOLDS = {
  /** Maximum evaluative words allowed in a single paragraph before flagging for rewrite (1 for Cover Letters). */
  maxEvaluativeWordsPerParagraph: 1,
  /** Maximum abstract words allowed in a single sentence before flagging. */
  maxAbstractWordsPerSentence: 2,
  /** Maximum abstract words allowed in a single paragraph before flagging for rewrite. */
  maxAbstractWordsPerParagraph: 3,
  /** Total evaluative words across the whole document before triggering rewrite. */
  maxTotalEvaluativeInDoc: 5,
  /** Total abstract words across the whole document before triggering rewrite. */
  maxTotalAbstractInDoc: 8,
  /** Direct sentence word range for sentence modesty. */
  directSentenceRange: {
    min: 4,
    max: 18,
  },
} as const;


/**
 * Career realism guidelines.
 * Requires realistic early-career language rather than corporate buzzwords.
 */
export const CAREER_REALISM_POLICY = {
  preferredPhrases: [
    "begin my career",
    "gain practical experience",
    "work as a software developer",
    "develop my technical skills",
    "learn from experienced professionals",
    "take on greater responsibility over time",
    "work in the technology sector",
    "apply what I learned",
  ] as const,
  disallowedPhrases: [
    "high-impact career",
    "drive technological innovation",
    "lead digital transformation",
    "create sustainable competitive advantage",
    "navigate complex global ecosystems",
    "spearhead organizational transformation",
    "orchestrate strategic synergies",
  ] as const,
};

/**
 * Strict Section Word Limits for Visa Cover Letters.
 */
export const VISA_SECTION_WORD_LIMITS = {
  course_motivation: { minWords: 80, maxWords: 110 },
  university_choice: { minWords: 70, maxWords: 90 },
  country_choice: { minWords: 60, maxWords: 80 },
  future_education_career: { minWords: 90, maxWords: 120 },
} as const;

/**
 * Blacklisted tourism & promotional words in the Why Country section.
 */
export const COUNTRY_TOURISM_WORDS = [
  "safe",
  "beautiful",
  "vibrant",
  "historic",
  "culturally rich",
  "rich culture",
  "prestigious",
  "inspiring",
  "breathtaking",
  "picturesque",
] as const;


/**
 * Document length targets (in words).
 */
export const DOCUMENT_LENGTH_TARGETS = {
  VISA_COVER_LETTER: {
    minWords: 650,
    preferredMin: 700,
    preferredMax: 900,
    maxWords: 1000,
  },
  SOP: {
    minWords: 600,
    preferredMin: 750,
    preferredMax: 950,
    maxWords: 1100,
  },
  LOR: {
    minWords: 400,
    preferredMin: 500,
    preferredMax: 700,
    maxWords: 850,
  },
} as const;

/**
 * Placeholder and blocking validation rules.
 * Values matching these patterns block final document / PDF generation.
 */
export const BLOCKING_PATTERNS = {
  bracketedPlaceholders: /\[\s*(?:passport\s*number|name|full\s*name|email|address|date|city|country|phone|tbd|placeholder)\s*\]/i,
  anyBracketedIdentifier: /\[[A-Z][A-Za-z0-9\s_-]{2,30}\]/,
  literalPlaceholders: /\b(?:TBD|PLACEHOLDER|undefined|null)\b/i,
  placeholderEmailDomains: /@(?:example\.(?:com|org|net)|test\.(?:com|org)|placeholder\.(?:com|org))\b/i,
};

