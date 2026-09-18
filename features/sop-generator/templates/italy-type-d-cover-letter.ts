/**
 * Italy – Long-Term Type D Student Visa Cover Letter
 * Template ID: italy-type-d-student-visa-cover-letter
 *
 * Professional Single-Page Embassy Format.
 *
 * All 16 structured sections are preserved so sidebar navigation,
 * review statuses, and validation checks remain completely functional.
 * Factual data (grades, loan, accommodation, travel) is woven into concise,
 * flowing prose with markdown bolding (**bold**) instead of raw form lists.
 */

import type { SopTemplate } from "../types/sop-generator";

export const italyTypeDCoverLetter: SopTemplate = {
  id: "italy-type-d-student-visa-cover-letter",
  name: "Italy – Long-Term Type D Student Visa Cover Letter",
  country: "Italy",
  visaType: "Type D Long-Stay Student Visa",
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
        Address: "{{destination.consulateAddress}}",
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
      content: `Subject: Application for a Long-Term Type D Student Visa to Pursue a {{destination.course}} at the {{destination.university}}`,
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
      content: `My name is **{{student.fullName}}**, and I am from {{student.placeOfBirth}}, India. I respectfully submit this cover letter in support of my application for an Italian Long-Stay Type D Student Visa. I have been granted admission to the prestigious **{{destination.course}}** programme at the **{{destination.university}}** in {{destination.city}}, Italy, commencing in **{{destination.intakeMonth}} {{destination.intakeYear}}**. I hold a valid Indian passport bearing number **{{student.passportNumber}}**, and reside at {{student.address}}.`,
      sourceFacts: {
        "Full Name": "{{student.fullName}}",
        Nationality: "{{student.nationality}}",
        "Passport Number": "{{student.passportNumber}}",
        Address: "{{student.address}}",
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
      content: `I completed my {{academics.latestQualification}} from **{{academics.institution}}**, under the {{academics.board}} curriculum in **{{academics.completionYear}}**, with {{academics.subjects}}, securing an outstanding result of **{{academics.percentage}}**. To fulfill language proficiency requirements, I achieved an overall **IELTS Academic band score of {{academics.ieltsOverall}}** (Listening: {{academics.ieltsListening}}, Reading: {{academics.ieltsReading}}, Writing: {{academics.ieltsWriting}}, Speaking: {{academics.ieltsSpeaking}}), demonstrating my readiness for rigorous English-medium academic instruction.`,
      sourceFacts: {
        Qualification: "{{academics.latestQualification}}",
        Institution: "{{academics.institution}}",
        Board: "{{academics.board}}",
        Year: "{{academics.completionYear}}",
        Subjects: "{{academics.subjects}}",
        Result: "{{academics.percentage}}",
        IELTS: "{{academics.ieltsOverall}}",
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
      content: `I have always enjoyed subjects that challenge me to think analytically, especially Mathematics and Physics. I chose **{{destination.course}}** because it uniquely integrates computer science, automation, electronics, and telecommunications. Rather than focusing on a single discipline, this programme provides a holistic foundation that prepares me to adapt and innovate in real-world automation and software systems.`,
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
      content: `I chose the **{{destination.university}}** because, for over 800 years, it has stood as a beacon of academic excellence, home to pioneers like **Galileo Galilei** and **Nicolaus Copernicus**. Its Department of Information Engineering is internationally renowned for cutting-edge research in robotics, embedded systems, and telecommunications, offering a world-class environment with strong European industry ties.`,
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
      content: `Italy offers a globally recognized, accredited education system at the forefront of European technological innovation. Padova provides an ideal, student-centric academic setting with safe, state-of-the-art infrastructure, making Italy the optimal destination for my undergraduate studies.`,
      sourceFacts: {
        Country: "{{destination.country}}",
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
      content: `Upon completing my Bachelor's degree (3 years), I intend to advance my academic expertise by pursuing a specialized Master's degree in Mechatronics or Computer Engineering to gain deeper technical specialization.`,
      sourceFacts: {
        Duration: "{{destination.duration}}",
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
      content: `In the short term, upon completing my education, I plan to return to India and begin my professional journey in India's expanding technology and IoT sector as an embedded systems software engineer. In the long term, I aspire to take on technical leadership roles developing innovative technological solutions for India's technological advancement.`,
      sourceFacts: {
        "Career Sector": "Information Technology / Embedded Systems",
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
      content: `I confirm that I have strong personal and economic ties to India and intend to return immediately upon finishing my studies. My entire family, including my sponsor father **{{sponsor.name}}**, resides permanently in Bhopal, India. Being the only daughter of my parents, returning home to build my professional career close to my family while contributing to India's digital economy is a foremost personal priority.`,
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
      content: `My education and living expenses in Italy will be fully sponsored by my father, **{{sponsor.name}}** ({{sponsor.occupation}}, Annual Income: **{{sponsor.annualIncome}}**). To fund my education, an education loan of **{{finance.educationLoanAmount}}** has been sanctioned by **{{finance.loanProvider}}**. In addition, our savings account reflects an available balance of **{{finance.availableBalance}}**, yielding total available funds of **{{finance.totalFundsAvailable}}**. Complete financial documentation, including loan sanction letters, bank statements, and tax returns, is enclosed.`,
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
      content: `I have secured confirmed accommodation in Italy at **{{accommodation.name}}**, located at {{accommodation.address}}, {{accommodation.city}}, Italy, for the period **{{accommodation.fromDate}} to {{accommodation.toDate}}** (Booking Ref: **{{accommodation.bookingReference}}**), with booking confirmation attached.`,
      sourceFacts: {
        "Accommodation Name": "{{accommodation.name}}",
        Address: "{{accommodation.address}}, {{accommodation.city}}",
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
      content: `I hold a 365-day student travel and health insurance policy issued by **{{insurance.provider}}** (Policy No: **{{insurance.policyNumber}}**, Coverage: **{{insurance.coverageAmount}}**), valid from **{{insurance.validFrom}} to {{insurance.validTo}}**, fully satisfying Schengen visa requirements.`,
      sourceFacts: {
        Provider: "{{insurance.provider}}",
        "Policy Number": "{{insurance.policyNumber}}",
        Coverage: "{{insurance.coverageAmount}}",
        "Valid From": "{{insurance.validFrom}}",
        "Valid To": "{{insurance.validTo}}",
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
      content: `My confirmed flight itinerary is on **{{travel.airline}}** (Flight: **{{travel.flightNumber}}**) departing from {{travel.departureAirport}} to **{{travel.destinationAirport}}** on **{{travel.travelDate}}** (PNR: **{{travel.pnr}}**), ensuring my arrival prior to orientation.`,
      sourceFacts: {
        Airline: "{{travel.airline}}",
        Flight: "{{travel.flightNumber}}",
        Departure: "{{travel.departureAirport}}",
        Destination: "{{travel.destinationAirport}}",
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
      content: `Thank you for taking the time to review my application. I respectfully request your favourable consideration of my application for an Italian Long-Stay Type D Student Visa. Should you require any additional information or documentation, I remain available at your convenience.`,
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
      content: `Sincerely,
**{{student.fullName}}**
Passport No: **{{student.passportNumber}}**
Email: {{student.email}} | Phone: {{student.phone}}`,
      sourceFacts: {
        "Student Name": "{{student.fullName}}",
        Passport: "{{student.passportNumber}}",
        Email: "{{student.email}}",
        Phone: "{{student.phone}}",
      },
    },
  ],
};
