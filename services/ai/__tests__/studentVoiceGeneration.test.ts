import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  STUDENT_VOICE_GUIDELINES,
  HUMANIZATION_PASS_CHECKLIST,
  detectEducationLevel,
  getSectionVoiceInstruction,
  buildNaturalStudentPrompt,
} from "../prompts/studentVoiceGuidelines";
import { buildSopPrompt } from "../prompts/sopPrompt";
import { GENERIC_AI_PHRASES, PLAIN_LANGUAGE_TRANSFORMATIONS } from "../config/writingRules";
import type { StudentDocumentContext } from "@/features/sop-generator/types/sop-generator";
import { CanonicalDocumentData } from "../documents/canonicalDocument";
import { DocumentPlan } from "../documents/documentPlanner";

describe("Student Voice & Natural SOP Generation Unit Tests", () => {
  const mockContext: StudentDocumentContext = {
    student: {
      fullName: "Aarav Sharma",
      dateOfBirth: "2004-05-12",
      placeOfBirth: "New Delhi",
      city: "New Delhi",
      country: "India",
      nationality: "Indian",
      passportNumber: "Z1234567",
      phone: "+91 98765 43210",
      email: "aarav.sharma@example.in",
      address: "B-42, Connaught Place, New Delhi 110001",
      gender: "Male",
      languages: "Hindi (Native), English (C1)",
    },
    academics: {
      latestQualification: "Higher Secondary (Class XII)",
      institution: "Delhi Public School, R.K. Puram",
      board: "CBSE",
      completionYear: "2024",
      subjects: "Physics, Chemistry, Mathematics, Computer Science",
      percentage: "88.6%",
    },
    tests: {
      ielts: {
        overall: "7.5",
        listening: "8.0",
        reading: "7.5",
        writing: "7.0",
        speaking: "7.5",
        dateTaken: "2024-03-15",
      },
    },
    destination: {
      country: "Italy",
      city: "Padua",
      university: "University of Padua",
      course: "Bachelor Degree in Information Engineering",
      degreeLevel: "Bachelor's Degree",
      duration: "3 Years",
      intakeMonth: "October",
      intakeYear: "2026",
      consulate: "Embassy of Italy in New Delhi",
      consulateCity: "New Delhi",
      consulateAddress: "50-E, Chandragupta Marg, Chanakyapuri, New Delhi",
    },
    career: {
      shortTermGoal: "Work as an associate software/network engineer in India's technology sector",
      longTermGoal: "Specialize in cloud infrastructure and distributed networks",
      returnIntention: "Return to India immediately upon graduation to begin professional career",
    },
    sponsor: {
      name: "Rajesh Sharma",
      relationship: "Father",
      occupation: "Senior Accounts Manager",
      annualIncome: "₹18,50,000",
      incomeSource: "Salaried Employment",
    },
    finance: {
      educationLoanAmount: "0",
      loanProvider: "",
      bankName: "State Bank of India",
      accountHolderName: "Rajesh Sharma",
      availableBalance: "€28,500",
      totalFundsAvailable: "€28,500",
      currency: "EUR",
    },
    accommodation: {
      name: "Padua University Student Housing",
      type: "Student Residence",
      address: "Via Venezia 12",
      city: "Padua",
      country: "Italy",
      fromDate: "2026-10-01",
      toDate: "2027-09-30",
      bookingReference: "HOUS-PAD-2026-992",
    },
    insurance: {
      provider: "Allianz Global Assistance",
      policyNumber: "POL-771234",
      type: "Comprehensive Medical & Travel",
      fromDate: "2026-09-25",
      toDate: "2027-09-24",
      coverageAmount: "€30,000",
    },
    travel: {
      airline: "Air India",
      flightNumber: "AI 123",
      origin: "DEL",
      destination: "VCE",
      travelDate: "2026-09-28",
      pnr: "PNR-998231",
    },
  };

  test("1. STUDENT_VOICE_GUIDELINES contains required persona, tone, and prohibited phrases", () => {
    assert.match(STUDENT_VOICE_GUIDELINES, /TARGET VOICE & PERSONA/);
    assert.match(STUDENT_VOICE_GUIDELINES, /serious, academically motivated student/i);
    assert.match(STUDENT_VOICE_GUIDELINES, /NOT like a university professor, academic consultant/i);

    // Natural expressions
    assert.match(STUDENT_VOICE_GUIDELINES, /"I became interested in\.\.\."/);
    assert.match(STUDENT_VOICE_GUIDELINES, /"What attracted me to this course was\.\.\."/);
    assert.match(STUDENT_VOICE_GUIDELINES, /"I chose this programme because\.\.\."/);

    // Overly academic blacklist
    assert.match(STUDENT_VOICE_GUIDELINES, /rigorous analytical foundation/i);
    assert.match(STUDENT_VOICE_GUIDELINES, /comprehensive training tailored to contemporary technical standards/i);
    assert.match(STUDENT_VOICE_GUIDELINES, /practical execution of modern information systems/i);
    assert.match(STUDENT_VOICE_GUIDELINES, /complex infrastructural networks/i);
    assert.match(STUDENT_VOICE_GUIDELINES, /mathematical rigor/i);
    assert.match(STUDENT_VOICE_GUIDELINES, /sophisticated technical framework/i);
    assert.match(STUDENT_VOICE_GUIDELINES, /multidisciplinary ecosystem/i);
    assert.match(STUDENT_VOICE_GUIDELINES, /dynamic technological landscape/i);
    assert.match(STUDENT_VOICE_GUIDELINES, /transformative academic journey/i);

    // Prohibition of fake stories
    assert.match(STUDENT_VOICE_GUIDELINES, /ZERO INVENTED PERSONAL EXPERIENCES/);
    assert.match(STUDENT_VOICE_GUIDELINES, /repairing broken electronics/i);

    // Fact fidelity
    assert.match(STUDENT_VOICE_GUIDELINES, /STRICT FACTUAL FIDELITY/);
  });

  test("2. HUMANIZATION_PASS_CHECKLIST enforces 8-point internal self-reflection checklist", () => {
    assert.match(HUMANIZATION_PASS_CHECKLIST, /INTERNAL HUMANIZATION REVISION PASS/);
    assert.match(HUMANIZATION_PASS_CHECKLIST, /1\. Does this sound like something this particular student could realistically say\?/);
    assert.match(HUMANIZATION_PASS_CHECKLIST, /2\. Is the vocabulary unnecessarily advanced or stiff\?/);
    assert.match(HUMANIZATION_PASS_CHECKLIST, /3\. Are there too many abstract nouns/);
    assert.match(HUMANIZATION_PASS_CHECKLIST, /4\. Is the paragraph describing the university or course more than the student's personal motivation\?/);
    assert.match(HUMANIZATION_PASS_CHECKLIST, /5\. Are sentences unnecessarily long or clause-heavy\?/);
    assert.match(HUMANIZATION_PASS_CHECKLIST, /6\. Does every sentence sound equally polished and uniform\?/);
    assert.match(HUMANIZATION_PASS_CHECKLIST, /7\. Did we introduce any unsupported fact, fake project, or unverified story\?/);
    assert.match(HUMANIZATION_PASS_CHECKLIST, /8\. Could any phrase be written more simply without losing professionalism\?/);
  });

  test("3. detectEducationLevel correctly identifies Bachelor's vs Master's applicant and adapts tone", () => {
    // Bachelor's applicant
    const bachelorsResult = detectEducationLevel(mockContext);
    assert.equal(bachelorsResult.level, "BACHELORS_APPLICANT");
    assert.match(bachelorsResult.guidance, /High School \/ Class XII Graduate/);
    assert.match(bachelorsResult.guidance, /Exploratory, curious, eager to learn/);
    assert.match(bachelorsResult.guidance, /student should NOT sound like a senior technical architect/i);

    // Master's applicant
    const mastersContext: StudentDocumentContext = {
      ...mockContext,
      academics: {
        ...mockContext.academics,
        latestQualification: "Bachelor of Technology in Computer Science",
        previousDegree: "B.Tech",
      },
      destination: {
        ...mockContext.destination,
        degreeLevel: "Master of Science",
        course: "Master in Data Engineering",
      },
    };
    const mastersResult = detectEducationLevel(mastersContext);
    assert.equal(mastersResult.level, "MASTERS_APPLICANT");
    assert.match(mastersResult.guidance, /University Graduate applying for a Master's/);
    assert.match(mastersResult.guidance, /Focused, academic, purposeful/);
  });

  test("4. getSectionVoiceInstruction enforces section-specific student behaviors", () => {
    // Why Course
    const whyCourse = getSectionVoiceInstruction("why-course", mockContext, "Engineering");
    assert.match(whyCourse, /SECTION: WHY THIS COURSE/);
    assert.match(whyCourse, /Student's previous subjects and genuine academic interests/);
    assert.match(whyCourse, /Do NOT turn this into a curriculum brochure/);
    assert.match(whyCourse, /Do NOT use phrases like "rigorous analytical foundation"/);

    // Why University
    const whyUni = getSectionVoiceInstruction("why-university", mockContext, "Engineering");
    assert.match(whyUni, /SECTION: WHY THIS UNIVERSITY/);
    assert.match(whyUni, /Avoid exaggerated marketing praise/);
    assert.match(whyUni, /Do NOT write "world-renowned prestigious institution/);

    // Why Italy / Country
    const whyCountry = getSectionVoiceInstruction("why-italy", mockContext, "Engineering");
    assert.match(whyCountry, /Avoid tourism-style language/);
    assert.match(whyCountry, /Focus strictly on practical academic reasoning/);

    // Career Plan
    const careerPlan = getSectionVoiceInstruction("career-plan", mockContext, "Engineering");
    assert.match(careerPlan, /A bachelor's applicant must NOT sound like an enterprise architect/);
    assert.match(careerPlan, /begin my career in the technology sector/);
  });

  test("5. buildNaturalStudentPrompt in 'generate' mode correctly builds prompt with all student context and guidelines", () => {
    const prompt = buildNaturalStudentPrompt({
      sectionId: "why-course",
      sectionTitle: "Why This Course",
      context: mockContext,
      mode: "generate",
    });

    // Factual grounding
    assert.match(prompt, /88\.6%/);
    assert.match(prompt, /Aarav Sharma/);
    assert.match(prompt, /Bachelor Degree in Information Engineering/);
    assert.match(prompt, /University of Padua/);
    assert.match(prompt, /Delhi Public School, R\.K\. Puram/);

    // Persona & Guidelines inclusion
    assert.match(prompt, /Write from the perspective of the STUDENT themself/);
    assert.match(prompt, /TARGET VOICE & PERSONA/);
    assert.match(prompt, /INTERNAL HUMANIZATION REVISION PASS/);
    assert.match(prompt, /Never invent projects, awards, childhood stories/);
  });

  test("6. buildNaturalStudentPrompt in 'rewrite-natural' mode instructs faithful rewriting without new facts", () => {
    const overlyAcademicSample =
      "Having developed a rigorous analytical foundation through my higher secondary studies in physics, chemistry, and mathematics with an 88.6 percent score, I selected the Bachelor Degree in Information Engineering because its curriculum offers comprehensive training tailored to contemporary technical standards. The program directly addresses my academic motivations by bridging core engineering theory with the practical execution of modern information systems.";

    const rewritePrompt = buildNaturalStudentPrompt({
      sectionId: "why-course",
      sectionTitle: "Why This Course",
      context: mockContext,
      currentContent: overlyAcademicSample,
      mode: "rewrite-natural",
    });

    assert.match(rewritePrompt, /EXISTING DRAFT TO REWRITE/);
    assert.match(rewritePrompt, /rigorous analytical foundation/);
    assert.match(rewritePrompt, /Strip away all overly academic, consultant, brochure-like, or AI-generated jargon/);
    assert.match(rewritePrompt, /PRESERVE EVERY FACT: Keep every single score/);
    assert.match(rewritePrompt, /ZERO NEW FACTS: Do NOT add any new facts, projects, experiences/);
    assert.match(rewritePrompt, /INTERNAL HUMANIZATION REVISION PASS/);
  });

  test("7. buildSopPrompt integrates STUDENT_VOICE_GUIDELINES and avoids corporate marketing tone", () => {
    const canonicalData: CanonicalDocumentData = {
      documentType: "SOP",
      applicant: {
        name: "Aarav Sharma",
        email: "aarav@example.in",
        phone: "+91 9876543210",
        address: "New Delhi, India",
        nationality: "Indian",
        city: "New Delhi",
        country: "India",
        passportNumber: "Z1234567",
      },
      education: {
        qualification: "Higher Secondary",
        institution: "Delhi Public School",
        boardOrUniversity: "CBSE",
        year: "2024",
        subjects: ["Physics", "Chemistry", "Mathematics"],
        percentage: "88.6%",
      },
      languageTests: [
        {
          name: "IELTS",
          overall: "7.5",
          components: { L: "8.0", R: "7.5", W: "7.0", S: "7.5" },
        },
      ],
      otherTests: [],
      family: {},
      university: {
        name: "University of Padua",
        officialName: "University of Padua",
        city: "Padua",
        country: "Italy",
      },
      course: {
        officialName: "Bachelor Degree in Information Engineering",
        level: "Bachelor",
        duration: "3 Years",
        intakeMonth: "October",
        intakeYear: "2026",
        subjectsOrAreas: ["Electronics", "Computer Systems"],
      },
      motivation: {
        academicInterests: [],
        courseReasons: [],
        universityReasons: [],
        countryReasons: [],
      },
      career: {
        shortTermPlan: "Work as an associate software engineer in India",
        longTermPlan: "Specialise in computer networks",
        returnCountry: "India",
      },
      financials: {
        sponsor: {
          name: "Rajesh Sharma",
          relationship: "Father",
          occupation: "Manager",
        },
      },
      projects: [],
      workExperience: [],
      achievements: [],
      additionalFacts: [],
    };

    const plan: DocumentPlan = {
      documentType: "SOP",
      targetDegree: "Bachelor Degree in Information Engineering",
      targetUniversity: "University of Padua",
      paragraphs: [
        {
          id: "why_course",
          title: "Why This Course",
          purpose: "Explain academic choice",
          availableFacts: {
            subjects: "Physics, Mathematics",
            score: "88.6%",
          },
          maxWords: 120,
        },
      ],
    };

    const sopPromptText = buildSopPrompt(canonicalData, plan);

    assert.match(sopPromptText, /TARGET VOICE & PERSONA/);
    assert.match(sopPromptText, /INTERNAL HUMANIZATION REVISION PASS/);
    assert.match(sopPromptText, /Strictly avoid overly academic jargon and corporate buzzwords/);
    assert.match(sopPromptText, /rigorous analytical foundation/);
  });

  test("8. writingRules includes newly specified academic buzzwords in GENERIC_AI_PHRASES and PLAIN_LANGUAGE_TRANSFORMATIONS", () => {
    const requiredPhrases = [
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
    ];

    for (const phrase of requiredPhrases) {
      assert.ok(
        (GENERIC_AI_PHRASES as readonly string[]).includes(phrase),
        `GENERIC_AI_PHRASES should include: "${phrase}"`
      );
      assert.ok(
        phrase in PLAIN_LANGUAGE_TRANSFORMATIONS,
        `PLAIN_LANGUAGE_TRANSFORMATIONS should include key: "${phrase}"`
      );
    }
  });
});
