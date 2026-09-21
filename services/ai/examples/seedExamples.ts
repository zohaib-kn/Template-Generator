/**
 * services/ai/examples/seedExamples.ts
 *
 * Senior-approved document examples establishing preferred structural blueprints and tone.
 * Includes the senior-approved Aafia Ameen Italy Type D Cover Letter as baseline.
 */

import { DOCUMENT_TYPES } from "../config/documentTypes";
import { ApprovedDocumentExample } from "./exampleTypes";

export const SEED_APPROVED_EXAMPLES: ApprovedDocumentExample[] = [
  // ── 1. Senior-Approved Cover Letter: Aafia Ameen (Italy Type D) ───────────
  {
    id: "approved-cover-letter-aafia-italy",
    documentType: DOCUMENT_TYPES.VISA_COVER_LETTER,
    destinationCountry: "Italy",
    studyArea: "Information Engineering",
    educationLevel: "Bachelor's",
    title: "Senior-Approved Italy Type D Visa Cover Letter — Aafia Ameen",
    description:
      "Approved consular format featuring complete academic tests, detailed financial sponsorship, and verified logistics.",
    inputSnapshot: {
      applicant: {
        name: "Aafia Ameen",
        nationality: "Indian",
        city: "Bhopal",
        country: "India",
        passportNumber: "Z9876543",
      },
      university: {
        officialName: "University of Padua (Università degli Studi di Padova)",
        city: "Padova",
        country: "Italy",
      },
      course: {
        officialName: "Bachelor's Degree in Information Engineering",
        duration: "3 years",
      },
      financials: {
        sponsor: {
          name: "Mohammed Ameen",
          relationship: "Father",
          occupation: "Civil Engineer, Government of Madhya Pradesh",
          annualIncome: "INR 14,00,000",
        },
        educationLoan: {
          amount: "INR 20,00,000",
          bank: "State Bank of India",
        },
        bankFunds: {
          balance: "INR 8,50,000",
          bank: "State Bank of India",
        },
        totalFunds: "INR 28,50,000",
      },
      accommodation: {
        name: "ESU Casa dello Studente — Residenza Torricelli",
        bookingReference: "ESU-PADUV-2026-4471",
      },
      insurance: {
        provider: "Bajaj Allianz General Insurance Co. Ltd.",
        policyNumber: "OG-2026-1801-0000-12345",
        coverageAmount: "EUR 50,000",
      },
      travel: {
        airline: "Air India",
        flightNumber: "AI 0131",
        pnr: "AIINDBHO2026881",
      },
    },
    approvedFinal: `To,
The Respected Visa Officer,
Consulate General of Italy,
75 Peddar Road, Mumbai – 400 026, India.

Subject: Application for a Long-Term Type D Student Visa to Pursue Bachelor's Degree in Information Engineering at the University of Padua

My name is Aafia Ameen, an Indian citizen from Bhopal, India. I am writing to respectfully submit my application for an Italian Long-Stay Type D Student Visa to pursue full-time studies in the Bachelor's Degree in Information Engineering programme at the University of Padua, commencing in September 2026. I hold a valid Indian passport bearing number Z9876543, and reside at 18 Koh-e-Fiza Colony, Bhopal, Madhya Pradesh – 462001, India.

I completed Class XII from Carmel Convent Higher Secondary School, Bhopal, under the Central Board of Secondary Education in 2026, studying Physics, Chemistry, and Mathematics with an aggregate score of 88.6%. To satisfy the English language proficiency requirements for this degree, I appeared for the IELTS Academic examination and secured an overall band of 7.5 (Listening: 8.0, Reading: 7.5, Writing: 7.0, Speaking: 7.5).

Having developed a strong interest in technical problem-solving during my higher secondary coursework, I selected Information Engineering because its curriculum offers balanced foundations in computing, electronics, and communication systems. The analytical coursework directly aligns with my goal to build a career in software and systems engineering.

I chose the University of Padua because of its established academic reputation, distinguished engineering faculty, and comprehensive English-taught curriculum. The institution's structured laboratory coursework and modern research facilities provide an environment well suited to my academic objectives.

Italy was my primary choice due to its recognized academic framework, Bologna degree structure, and affordable international tuition. The university's location in Padova offers a safe and focused academic environment where I can concentrate on my studies.

Following the completion of my bachelor's degree, I intend to evaluate specialized master's studies or immediately return to India. My long-term objective is to build my career in India's expanding technology industry, where I can apply international engineering training. My family resides in Bhopal, and my personal, cultural, and professional ties remain firmly in my home country.

My education and living expenses in Italy are fully sponsored by my father, Mohammed Ameen, Civil Engineer with the Government of Madhya Pradesh (Annual Income: INR 14,00,000). He has secured an education loan of INR 20,00,000 from State Bank of India, supplemented by INR 8,50,000 in personal savings, providing total available funds of INR 28,50,000. Complete documentation, including sanction letters, bank statements, and tax returns, is enclosed.

I have confirmed accommodation at ESU Casa dello Studente — Residenza Torricelli, Via Venezia 12, 35131 Padova, Italy, from 1 September 2026 to 30 June 2027 (Booking Ref: ESU-PADUV-2026-4471). I have also obtained travel and health insurance from Bajaj Allianz General Insurance Co. Ltd. (Policy No: OG-2026-1801-0000-12345, Coverage: EUR 50,000), valid from 1 September 2026 to 31 August 2027. Flight arrangements are confirmed on Air India (Flight: AI 0131) departing on 2 September 2026 (PNR: AIINDBHO2026881).

Thank you for considering my visa application. I respectfully request your favourable review, and I remain available should you require any further documentation or information.

Sincerely,
Aafia Ameen
Passport No: Z9876543
Email: aafia.ameen@gmail.com | Phone: +91 94255 67890`,
    reviewerNotes: [
      "Strict single-page consular format.",
      "Clear separation of university vs country motivation.",
      "Financials clearly state sponsor, loan provider, available balances, and total funds.",
      "No historical tourism fluff; direct and professional.",
    ],
    status: "APPROVED",
    active: true,
    createdAt: "2026-09-17T00:00:00Z",
    updatedAt: "2026-09-17T00:00:00Z",
  },

  // ── 2. Senior-Approved SOP Example ───────────────────────────────────────
  {
    id: "approved-sop-cs-analytics",
    documentType: DOCUMENT_TYPES.SOP,
    destinationCountry: "United Kingdom",
    studyArea: "Computer Science",
    educationLevel: "Master's",
    title: "Senior-Approved Statement of Purpose — MSc Data & Computing",
    description:
      "Scholarly SOP illustrating academic development, coursework depth, technical projects, and career direction without financial or visa clutter.",
    inputSnapshot: {
      applicant: { name: "Aarav Mehta", country: "India" },
      course: { officialName: "MSc Advanced Computer Science" },
      university: { officialName: "University of Bristol", country: "United Kingdom" },
    },
    approvedFinal: `My interest in computer science developed during my undergraduate coursework in Information Technology, where studying algorithms and discrete mathematics demonstrated how computational models solve intricate logistical problems. As data volumes expand across industries, developing efficient, scalable algorithms has become central to practical engineering. Pursuing the MSc Advanced Computer Science at the University of Bristol represents the logical progression in my academic training.

During my undergraduate education, I focused on core disciplines including Data Structures, Database Management Systems, and Distributed Computing. Working through hands-on programming projects taught me to evaluate asymptotic complexity and write maintainable code. For my final-year project, I collaborated with two peers to design a distributed event monitoring tool that processed streaming server logs. This experience strengthened my practical grasp of asynchronous pipeline architecture and indexing strategies.

I am particularly drawn to the curriculum at the University of Bristol because of its balance between computational theory and scalable systems engineering. Course units in High-Performance Computing and Cloud Architecture directly address the technical areas I wish to master. Furthermore, the faculty's active research in distributed consensus protocols offers the rigorous academic environment I seek for postgraduate study.

Upon completing the master's programme, I plan to return to India and join an engineering team designing distributed enterprise infrastructure. In the long term, I aspire to lead technical architecture initiatives for cloud-native data systems. The postgraduate education at Bristol will provide the rigorous foundation required to achieve these professional goals.`,
    reviewerNotes: [
      "Zero visa, loan, or accommodation content.",
      "Specific technical discussion of data structures and distributed systems.",
      "Natural semantic variation: 'undergraduate coursework' -> 'undergraduate education' -> 'core disciplines'.",
    ],
    status: "APPROVED",
    active: true,
    createdAt: "2026-09-18T00:00:00Z",
    updatedAt: "2026-09-18T00:00:00Z",
  },

  // ── 3. Senior-Approved LOR Example ───────────────────────────────────────
  {
    id: "approved-lor-academic-hod",
    documentType: DOCUMENT_TYPES.LOR,
    destinationCountry: "Global",
    studyArea: "Computer Science & Engineering",
    educationLevel: "Graduate",
    title: "Senior-Approved Letter of Recommendation — Academic Supervisor",
    description:
      "Evaluative third-person recommendation from department supervisor highlighting coursework, capstone guidance, and work ethic without fabricated rankings.",
    inputSnapshot: {
      recommender: {
        name: "Dr. Ramesh Iyer",
        title: "Professor & Head of Department",
        department: "Computer Science & Engineering",
      },
      applicant: { name: "Kunal Sharma" },
      course: { officialName: "Master of Science in Computer Science" },
    },
    approvedFinal: `To the Graduate Admissions Committee,

It is a pleasure to write this letter of recommendation for Kunal Sharma in support of his application for graduate studies in Computer Science at your institution. I have known Kunal for over two years in my capacity as Professor and Head of the Department of Computer Science and Engineering, during which I taught him Advanced Algorithms and subsequently supervised his capstone project.

Throughout his coursework, Kunal demonstrated strong analytical aptitude and an inquisitive approach to technical problem-solving. In lectures, he actively engaged with complex topics such as graph optimization and dynamic programming, regularly asking thoughtful questions regarding algorithmic constraints. In lab evaluations, his submissions were notable for clean modular design and thorough edge-case testing.

For his final-year capstone project, Kunal led the implementation of a news aggregation and sentiment analysis pipeline. Under my guidance, he structured the data retrieval workflows and integrated natural language processing models. Throughout the project lifecycle, he exhibited disciplined version control, systematic debugging, and a receptive attitude during milestone reviews.

Beyond academic competence, Kunal communicates effectively and collaborates constructively with peers. When technical roadblocks arose during project deployment, he demonstrated persistence in diagnosing system bottlenecks.

I am confident that Kunal has the discipline and intellectual foundation necessary for rigorous graduate study. I recommend him for admission to your program and wish him every success in his academic journey.

Sincerely,
Dr. Ramesh Iyer
Professor & Head of Department
Department of Computer Science & Engineering`,
    reviewerNotes: [
      "Authentic third-person professor voice throughout.",
      "Mentions specific course taught and supervised capstone without fabricating class ranking or top 5% claims.",
      "Balanced and credible recommendation.",
    ],
    status: "APPROVED",
    active: true,
    createdAt: "2026-09-18T00:00:00Z",
    updatedAt: "2026-09-18T00:00:00Z",
  },
];
