import { LorPreset } from "../types/lor-generator";
import { DEFAULT_LOR_DATA } from "./defaultLorData";

export const LOR_PRESETS: LorPreset[] = [
  {
    id: "academic_hod",
    label: "Academic HOD / Professor",
    description:
      "Formal academic recommendation emphasizing university coursework, department standing, and capstone excellence.",
    badge: "Academic",
    data: {
      metadata: { ...DEFAULT_LOR_DATA.metadata },
      institution: { ...DEFAULT_LOR_DATA.institution },
      recommender: { ...DEFAULT_LOR_DATA.recommender },
      student: { ...DEFAULT_LOR_DATA.student },
      narrative: { ...DEFAULT_LOR_DATA.narrative },
    },
  },
  {
    id: "project_guide",
    label: "Project Guide / Research Mentor",
    description:
      "Technical recommendation focused on research aptitude, capstone project execution, algorithm design, and collaborative problem solving.",
    badge: "Technical",
    data: {
      metadata: {
        referenceNumber: "PIET/CS-RESEARCH/2025-26/LOR/088",
        issueDate: "October 14, 2025",
        documentTitle: "Letter of Recommendation",
      },
      institution: { ...DEFAULT_LOR_DATA.institution },
      recommender: {
        prefix: "Prof.",
        fullName: "Sanjay Sharma",
        designation: "Associate Professor",
        role: "Capstone Project Supervisor",
        department: "Computer Science & Engineering",
        email: "sanjaysharma@poornima.org",
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
        academicStanding: "an exceptional undergraduate researcher",
        courseTaught: "Design & Analysis of Algorithms",
        keySubjects: "computational complexity, graph optimization, and advanced data structures",
        projectTitle: "Personalized News Aggregator with Sentiment Analysis",
        technologiesUsed: "Python, FastAPI, Transformers, and React",
        projectSummary:
          "an automated natural language processing pipeline that scrapes multi-source news data, performs aspect-based sentiment scoring, and personalizes feeds via vector embeddings",
        targetProgram: "Master of Science in Computer Science",
        targetUniversity: "your graduate admissions committee",
      },
      narrative: {
        introParagraph:
          "It gives me immense pleasure to write this letter of recommendation for Mr. Kunal Tanwar in support of his application for graduate studies in Computer Science at your esteemed institution.",
        academicsParagraph:
          "I first interacted with Kunal when I taught him Design & Analysis of Algorithms in his junior year. He consistently stood out as an inquisitive and mathematically sound student, demonstrating exceptional grasp of computational complexity, graph optimization, and advanced data structures. He routinely achieved top percentile marks in both theoretical evaluations and coding assignments.",
        projectParagraph:
          "Beyond regular coursework, I had the opportunity to supervise Kunal's capstone research project titled “Personalized News Aggregator with Sentiment Analysis.” He spearheaded the architectural design, integrating Python, FastAPI, and Transformers to build an automated news clustering and sentiment pipeline. Kunal exhibited rigorous debugging discipline, version control mastery, and commendable technical leadership throughout the project lifecycle.",
        qualitiesParagraph:
          "Kunal possesses a strong research appetite, remarkable perseverance when handling ambiguous problems, and effective communication skills that make him a delight to collaborate with. He has a rare ability to bridge abstract algorithmic concepts with high-performance production code.",
        conclusionParagraph:
          "I place Kunal among the top 5% of students I have supervised over the past decade and recommend him without reservation for admission to your graduate program.",
      },
    },
  },
  {
    id: "employer_internship",
    label: "Internship Lead / Industry Manager",
    description:
      "Industry supervisor recommendation highlighting software engineering practices, deadlines, teamwork, and business impact.",
    badge: "Industry",
    data: {
      metadata: {
        referenceNumber: "TECH/HR/2025/LOR-INT-42",
        issueDate: "November 05, 2025",
        documentTitle: "Letter of Recommendation",
      },
      institution: {
        name: "DIGIWIRE TECHNOLOGIES INC.",
        affiliation: "Software Engineering & Enterprise Solutions Division",
        logoUrl: "/images/lor/poornima_header.png",
        crestUrl: "/images/lor/poornima_crest.png",
        address: "Corporate Tech Park, Sector 62, Noida, NCR (India)",
        phone: "+91-120-4567890",
        email: "engineering@digiwire.com",
        website: "www.digiwire.com",
      },
      recommender: {
        prefix: "Mr.",
        fullName: "Vikram Malhotra",
        designation: "Principal Engineering Lead",
        role: "Internship Mentor & Team Lead",
        department: "Cloud Applications Division",
        email: "vikram.m@digiwire.com",
        phone: "",
        signatureUrl: "/images/lor/sample_signature.png",
        stampUrl: "/images/lor/sample_stamp.png",
        showStamp: true,
        showSignature: true,
      },
      student: {
        prefix: "Mr.",
        fullName: "Kunal Tanwar",
        department: "Software Engineering Intern",
        institutionName: "Digiwire Technologies",
        academicStanding: "a full-time software engineering intern",
        courseTaught: "Production Systems Development",
        keySubjects: "microservices architecture, containerization, and RESTful API engineering",
        projectTitle: "Distributed Event Monitoring Dashboard",
        technologiesUsed: "TypeScript, Node.js, Next.js, and Redis",
        projectSummary:
          "a high-throughput telemetry aggregator that processed live server health streams and surfaced proactive alerts for DevOps engineers",
        targetProgram: "Master of Science in Software Engineering",
        targetUniversity: "your distinguished academic program",
      },
      narrative: {
        introParagraph:
          "I am writing this letter of recommendation with great pleasure to support Mr. Kunal Tanwar's application for admission to your graduate degree program.",
        academicsParagraph:
          "Kunal served as a Software Engineering Intern under my direct supervision for six months. During his tenure, he demonstrated an extraordinary aptitude for modern web architecture, microservices engineering, and asynchronous message processing.",
        projectParagraph:
          "His primary contribution was engineering a Distributed Event Monitoring Dashboard using TypeScript, Next.js, and Redis. Kunal single-handedly reduced end-to-end telemetry ingestion latency by 35% through query optimization and smart caching. His code quality was exemplary, featuring modular abstractions and comprehensive unit test coverage.",
        qualitiesParagraph:
          "What distinguishes Kunal is his accountability, receptive attitude toward code review, and proactive ownership of sprint milestones. He communicated seamlessly with cross-functional product teams and was always eager to learn new engineering paradigms.",
        conclusionParagraph:
          "Kunal has all the qualities of a top-tier software engineer and scholar. I enthusiastically recommend him for admission to your university and wish him the best in his graduate career.",
      },
    },
  },
];
