/**
 * Italy – Long-Term Type D Student Visa Cover Letter
 * Template ID: italy-type-d-student-visa-cover-letter
 *
 * Professional Master Consular Letter Format.
 *
 * All 16 structured sections are preserved so sidebar navigation,
 * review statuses, and validation checks remain completely functional.
 *
 * Exact master text from SOP-Copilet:
 * - Flowing formal prose matching embassy guidelines
 * - Padua 800 years of academic excellence, Galileo Galilei, Nicolaus Copernicus, William Harvey
 * - Credila Financial Services loan breakdown disbursed into HSBC Bank account
 * - All placeholder paths accurately mapped (tests.ielts.*, insurance.fromDate/toDate, travel.origin/destination)
 */

import type { SopTemplate } from "../types/sop-generator";

export const italyTypeDCoverLetter: SopTemplate = {
  id: "italy-type-d-student-visa-cover-letter",
  name: "Italy – Long-Term Type D Student Visa Cover Letter",
  documentType: "VISA_COVER_LETTER",
  country: "Italy",
  visaType: "Type D Long-Stay Student Visa",
  documentHeaderTitle: "COVER LETTER",
  canvasMasthead: "Visa Cover Letter · Embassy Submission",
  pdfDocumentType: "Visa_Cover_Letter",
  showLogisticsInContext: true,
  sidebarGroups: [
    {
      id: "document",
      title: "Document",
      sectionIds: ["recipient", "subject", "student-introduction"],
    },
    {
      id: "academics",
      title: "Academic Motivation",
      sectionIds: ["academic-background", "why-course", "why-university", "why-italy"],
    },
    {
      id: "future-finance",
      title: "Future & Finance",
      sectionIds: ["future-academic-plan", "career-plan", "return-intent", "financial-sponsorship"],
    },
    {
      id: "closing",
      title: "Logistics & Closing",
      sectionIds: ["accommodation", "insurance", "travel", "closing-statement", "signature"],
    },
  ],
  sections: [
    // ── 1. Recipient / Consulate ────────────────────────────────────────────
    {
      id: "recipient",
      title: "Recipient / Consulate",
      source: "WEBHOOK",
      required: true,
      order: 1,
      editable: false,
      regeneratable: false,
      content: `To,
The Respected Visa Officer,
{{destination.consulate}},
{{destination.consulateAddress}}.`,
      sourceFacts: {
        Consulate: "{{destination.consulate}}",
        City: "{{destination.consulateCity}}",
        Country: "{{destination.country}}",
      },
    },

    // ── 2. Subject Line ─────────────────────────────────────────────────────
    {
      id: "subject",
      title: "Subject Line",
      source: "HYBRID",
      required: true,
      order: 2,
      editable: true,
      regeneratable: false,
      content: `Subject: Application for a Long-Term Type D Student Visa to Pursue {{destination.course}} at the {{destination.university}}`,
      sourceFacts: {
        "Student Name": "{{student.fullName}}",
        Course: "{{destination.course}}",
        University: "{{destination.university}}",
      },
    },

    // ── 3. Student Introduction ─────────────────────────────────────────────
    {
      id: "student-introduction",
      title: "Student Introduction",
      source: "HYBRID",
      required: true,
      order: 3,
      editable: true,
      regeneratable: true,
      content: `My name is **{{student.fullName}}**, and I am from **{{student.city}}, {{student.country}}**.`,
      sourceFacts: {
        "Full Name": "{{student.fullName}}",
        Nationality: "{{student.nationality}}",
        City: "{{student.city}}",
        Country: "{{student.country}}",
      },
    },

    // ── 4. Academic Background ──────────────────────────────────────────────
    {
      id: "academic-background",
      title: "Academic Background",
      source: "WEBHOOK",
      required: true,
      order: 4,
      editable: false,
      regeneratable: false,
      content: `I completed my {{academics.latestQualification}} from **{{academics.institution}}**, under the **{{academics.board}}** in **{{academics.completionYear}}**, with **{{academics.subjects}}**. I remain grateful to my school and teachers for their guidance and support in shaping my academic journey. I also demonstrated my English language proficiency by securing an **overall {{tests.ielts.type}} band score of {{tests.ielts.overall}}**.{{tests.additionalTestsText}} I come from a family of {{family.count}}. My father is an **{{family.fatherOccupation}}**, and my mother is employed with **{{family.motherOccupation}}**. I also have {{family.siblingText}}, and my family has always encouraged me to pursue quality education and achieve my academic goals.`,
      sourceFacts: {
        Qualification: "{{academics.latestQualification}}",
        Institution: "{{academics.institution}}",
        Board: "{{academics.board}}",
        Year: "{{academics.completionYear}}",
        Subjects: "{{academics.subjects}}",
        Result: "{{academics.percentage}}",
        IELTS: "{{tests.ielts.overall}}",
      },
    },

    // ── 5. Why This Course ──────────────────────────────────────────────────
    {
      id: "why-course",
      title: "Why This Course",
      source: "HYBRID",
      required: true,
      order: 5,
      editable: true,
      regeneratable: true,
      content: `I have always enjoyed subjects that challenge me to think logically, especially {{academics.favoriteSubjects}}. As I explored different branches of engineering, I found **{{destination.course}}** the most interesting because it combines {{destination.courseDisciplines}} instead of focusing on just one field. Technology is evolving every day, and I know it will continue to change by the time I complete my degree. I want to build a strong understanding of these areas so that I am prepared to adapt, learn new technologies, and contribute confidently to the future of engineering.`,
      sourceFacts: {
        Course: "{{destination.course}}",
        Degree: "{{destination.degreeLevel}}",
        Duration: "{{destination.duration}}",
      },
    },

    // ── 6. Why This University ──────────────────────────────────────────────
    {
      id: "why-university",
      title: "Why This University",
      source: "AI_SUGGESTED",
      required: true,
      order: 6,
      editable: true,
      regeneratable: true,
      content: `I chose the **{{destination.university}}** because, for over **{{destination.universityHistory}}**, it has been a centre of academic excellence, where distinguished scholars such as **{{destination.distinguishedScholars}}** studied and taught, leaving a lasting impact on science and human knowledge. Their legacy inspires me to pursue my education in an institution that has nurtured generations of great thinkers. I also admire the university's continued commitment to high-quality teaching, research, innovation, and international collaboration, which I believe will provide me with an enriching learning environment and prepare me for a successful career in {{destination.course}}.`,
      sourceFacts: {
        University: "{{destination.university}}",
        City: "{{destination.city}}",
      },
    },

    // ── 7. Why Italy ────────────────────────────────────────────────────────
    {
      id: "why-italy",
      title: "Why Italy / Why This Country",
      source: "AI_SUGGESTED",
      required: true,
      order: 7,
      editable: true,
      regeneratable: true,
      content: `I chose **{{destination.country}}** because it is home to the **{{destination.university}}**, the institution that best matched my academic interests and career aspirations. {{destination.country}} is internationally recognized for the quality of its higher education, with its universities and engineering programmes earning strong global recognition for their academic standards and research. Another factor that influenced my decision was the country's climate, which is relatively similar to that of India. I believe this will help me adapt more comfortably to a new environment, allowing me to focus on my studies and make the most of my academic experience.`,
      sourceFacts: {
        Country: "{{destination.country}}",
        City: "{{destination.city}}",
      },
    },

    // ── 8. Future Academic Plan ─────────────────────────────────────────────
    {
      id: "future-academic-plan",
      title: "Future Academic Plan",
      source: "AI_SUGGESTED",
      required: false,
      order: 8,
      editable: true,
      regeneratable: true,
      content: `After completing my Bachelor's degree in {{destination.course}}, I intend to further advance my academic knowledge by pursuing a Master's degree in **{{destination.masterSpecialization}}**, depending on the specialization that best aligns with my interests and career goals.`,
      sourceFacts: {
        Duration: "{{destination.duration}}",
        Course: "{{destination.course}}",
      },
    },

    // ── 9. Career Plan ──────────────────────────────────────────────────────
    {
      id: "career-plan",
      title: "Career Plan",
      source: "AI_SUGGESTED",
      required: true,
      order: 9,
      editable: true,
      regeneratable: true,
      content: `**In the short term,** upon completing my higher education, I intend to return to India and begin my professional career in the country's rapidly growing technology sector. I hope to secure an entry-level engineering role where I can apply the technical knowledge and international exposure gained through my education in Italy while continuing to learn from experienced professionals and develop my practical skills. **In the long term,** I aspire to grow into positions of greater responsibility and contribute to the development of innovative technology solutions that address real-world challenges and support India's technological advancement.`,
      sourceFacts: {
        Course: "{{destination.course}}",
      },
    },

    // ── 10. Return / Home Country Intent ────────────────────────────────────
    {
      id: "return-intent",
      title: "Return / Home Country Intent",
      source: "HYBRID",
      required: true,
      order: 10,
      editable: true,
      regeneratable: true,
      content: `{{student.returnFamilyReason}}, returning to India is also a personal priority, as I wish to build my future close to my family while making a meaningful contribution to my home country.`,
      sourceFacts: {
        Sponsor: "{{sponsor.name}}",
        Relationship: "{{sponsor.relationship}}",
        "Study Duration": "{{destination.duration}}",
      },
    },

    // ── 11. Financial Sponsorship ───────────────────────────────────────────
    {
      id: "financial-sponsorship",
      title: "Financial Sponsorship",
      source: "WEBHOOK",
      required: true,
      order: 11,
      editable: false,
      regeneratable: false,
      content: `My higher education and living expenses in Italy will be fully sponsored by my {{sponsor.relationship}}, {{sponsor.name}}. To finance my studies, he has obtained an education loan of **{{finance.educationLoanAmount}}** from {{finance.loanProvider}}, of which **{{finance.disbursedAmount}}** has been disbursed into his {{finance.bankAccount}} after the applicable insurance deductions. As of **{{finance.statementDate}}**, the account reflects an available balance of **{{finance.availableBalance}}** (approximately **{{finance.availableBalanceEur}}**, based on the exchange rate of **{{finance.exchangeRate}}**). My {{sponsor.relationship}} has undertaken full financial responsibility for my tuition fees, accommodation, living expenses, travel, medical insurance, and all other costs associated with my education and stay in Italy. He also has a CA-certified net worth of **{{finance.netWorth}}** and is a regular income tax assessee. In support of my application, I have enclosed the education loan sanction letter, bank statement, CA-certified net worth certificate, notarized sponsorship affidavit, and his Income Tax Returns for Assessment Years **{{finance.itrYears}}** as evidence of his financial capacity and commitment to sponsoring my education.`,
      sourceFacts: {
        "Sponsor Name": "{{sponsor.name}}",
        Occupation: "{{sponsor.occupation}}",
        "Annual Income": "{{sponsor.annualIncome}}",
        "Education Loan": "{{finance.educationLoanAmount}}",
        "Loan Provider": "{{finance.loanProvider}}",
        "Available Balance": "{{finance.availableBalance}}",
        "Total Funds": "{{finance.totalFundsAvailable}}",
      },
    },

    // ── 12. Accommodation ───────────────────────────────────────────────────
    {
      id: "accommodation",
      title: "Accommodation",
      source: "WEBHOOK",
      required: true,
      order: 12,
      editable: false,
      regeneratable: false,
      content: `I have made all the necessary arrangements for my stay in Italy. I have secured temporary accommodation at **{{accommodation.nameAndAddress}}**, from **{{accommodation.fromDate}} to {{accommodation.toDate}}**, which will provide me with sufficient time to settle in and arrange my long-term accommodation after my arrival.`,
      sourceFacts: {
        "Accommodation Name": "{{accommodation.name}}",
        Address: "{{accommodation.address}}",
        "From Date": "{{accommodation.fromDate}}",
        "To Date": "{{accommodation.toDate}}",
        Reference: "{{accommodation.bookingReference}}",
      },
    },

    // ── 13. Insurance ───────────────────────────────────────────────────────
    {
      id: "insurance",
      title: "Travel & Health Insurance",
      source: "WEBHOOK",
      required: true,
      order: 13,
      editable: false,
      regeneratable: false,
      content: `I have also obtained a **{{insurance.policyType}} (Certificate No. {{insurance.policyNumber}})**, valid from **{{insurance.fromDate}} to {{insurance.toDate}}**, in compliance with the visa requirements.`,
      sourceFacts: {
        Provider: "{{insurance.provider}}",
        "Policy Number": "{{insurance.policyNumber}}",
        Coverage: "{{insurance.coverageAmount}}",
        "Valid From": "{{insurance.fromDate}}",
        "Valid To": "{{insurance.toDate}}",
      },
    },

    // ── 14. Travel Arrangements ─────────────────────────────────────────────
    {
      id: "travel",
      title: "Travel Arrangements",
      source: "WEBHOOK",
      required: true,
      order: 14,
      editable: false,
      regeneratable: false,
      content: `Additionally, I have confirmed my travel arrangements by booking an **{{travel.airline}}** flight from **{{travel.origin}}** to **{{travel.destination}}** via **{{travel.transit}}** for **{{travel.travelDate}}** under **PNR: {{travel.pnr}}**, ensuring my timely arrival in Italy before the commencement of my studies.`,
      sourceFacts: {
        Airline: "{{travel.airline}}",
        Flight: "{{travel.flightNumber}}",
        Departure: "{{travel.origin}}",
        Destination: "{{travel.destination}}",
        Date: "{{travel.travelDate}}",
        PNR: "{{travel.pnr}}",
      },
    },

    // ── 15. Closing Statement ───────────────────────────────────────────────
    {
      id: "closing-statement",
      title: "Closing Statement",
      source: "FIXED",
      required: true,
      order: 15,
      editable: true,
      regeneratable: false,
      content: `Thank you for taking the time to review my application. I am truly eager to begin this new academic chapter at the **{{destination.university}}** and to make the most of the opportunities it offers. I respectfully request your kind and favourable consideration of my application for a Long-Term Type D Student Visa. Should you require any further information or supporting documentation, I would be pleased to provide it. Thank you once again for your time, consideration, and valued attention to my application.`,
      sourceFacts: {},
    },

    // ── 16. Contact & Signature ─────────────────────────────────────────────
    {
      id: "signature",
      title: "Student Contact & Signature",
      source: "WEBHOOK",
      required: true,
      order: 16,
      editable: false,
      regeneratable: false,
      content: `Sincerely,\n{{student.fullName}}\nEmail: **{{student.email}}**\nPhone: **{{student.phone}}**`,
      sourceFacts: {
        "Student Name": "{{student.fullName}}",
        Passport: "{{student.passportNumber}}",
        Email: "{{student.email}}",
        Phone: "{{student.phone}}",
      },
    },
  ],
};
