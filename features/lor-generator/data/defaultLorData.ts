import { LorDocument } from "../types/lor-generator";

export const DEFAULT_LOR_DATA: LorDocument = {
  id: "lor-doc-default-01",
  metadata: {
    referenceNumber: "PIET/ADMIN/2025-26/LOR/170",
    issueDate: "September 22, 2025",
    documentTitle: "Letter of Recommendation",
  },
  institution: {
    name: "POORNIMA INSTITUTE OF ENGINEERING & TECHNOLOGY",
    affiliation:
      "Promoted by Shanti Education Society, Affiliated to Rajasthan Technical University & Approved by AICTE",
    logoUrl: "/images/lor/poornima_header.png",
    crestUrl: "/images/lor/poornima_crest.png",
    address: "ISI-2, RIICO Institutional Area, Sitapura, Jaipur-302022 (Rajasthan)",
    phone: "+91-9001893262",
    email: "registrar.piet@poornima.org",
    website: "www.piet.poornima.org",
  },
  recommender: {
    prefix: "Dr.",
    fullName: "Anil Kumar",
    designation: "Professor",
    role: "Head Of Department",
    department: "Computer Science & Engineering",
    email: "anilkumar@poornima.org",
    phone: "",
    signatureUrl: "/images/lor/sample_signature.png",
    stampUrl: "/images/lor/sample_stamp.png",
    showStamp: true,
    showSignature: true,
  },
  student: {
    prefix: "Mr.",
    fullName: "Kunal Tanwar",
    department: "Department of Computer Science",
    institutionName: "Poornima Institute of Engineering and Technology",
    academicStanding: "a final-year student",
    courseTaught: "Information Security System",
    keySubjects: "cryptography, network security models, and threat mitigation techniques",
    projectTitle: "Personalized News Aggregator with Sentiment Analysis",
    technologiesUsed: "Python, Django, and Natural Language Processing libraries",
    projectSummary:
      "a web-based news aggregation platform that uses machine learning techniques to analyze sentiment and deliver customized news feeds to users",
    targetProgram: "higher education",
    targetUniversity: "your esteemed institution",
  },
  narrative: {
    introParagraph:
      "It is my pleasure to recommend Mr. Kunal Tanwar, a final-year student of the Department of Computer Science at Poornima Institute of Engineering and Technology, for pursuing higher education at your esteemed institution.",
    academicsParagraph:
      "As the Head of the Department, I have had the opportunity to observe Kunal’s academic and personal growth over the past four years. Additionally, I taught him Information Security System, where he displayed excellent conceptual clarity in topics such as cryptography, network security models, and threat mitigation techniques. His performance in the subject was commendable, and he consistently contributed to classroom discussions with insightful ideas.",
    projectParagraph:
      "Furthermore, I had the privilege of guiding Kunal’s final-year capstone project titled “Personalized News Aggregator with Sentiment Analysis.” In this project, Kunal played a pivotal role in developing a web-based news aggregation platform that uses machine learning techniques to analyze sentiment and deliver customized news feeds to users. He demonstrated strong problem-solving skills, effective use of technologies such as Python, Django, and Natural Language Processing libraries, and an ability to work collaboratively with his teammates. Kunal also exhibited excellent documentation and presentation skills, ensuring that the project met both technical and academic expectations.",
    qualitiesParagraph:
      "Kunal is a disciplined, motivated, and inquisitive student who consistently strives for excellence. His ability to link theoretical knowledge with practical solutions, coupled with his teamwork and communication skills, make him well-prepared for the demands of graduate-level education.",
    conclusionParagraph:
      "I wholeheartedly recommend Kunal for admission to your esteemed university. I am confident that he will continue to perform with the same dedication, curiosity, and technical competence, contributing positively to the academic community.",
  },
};
