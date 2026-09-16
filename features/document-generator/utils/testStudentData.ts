import type { DocumentData } from "@/types";

/**
 * Static test student fixture — Aarav Mehta (Business Analytics).
 *
 * PURPOSE: Phase 1 webhook integration test only.
 *
 * This is the SINGLE source of truth for test data.
 * - "Load Test Student" loads this into the Resume Builder state.
 * - "Send to Webhook" sends whatever is CURRENTLY in state (which may have
 *   been edited since loading) — NOT this object directly.
 *
 * This ensures the architecture proof: frontend state → webhook, not
 * static fixture → webhook.
 *
 * IMPORTANT: No database. No authentication. No AI. Temporary fixture only.
 */
export const testStudentData: DocumentData = {
  personal: {
    photoUrl: "/sample-avatar.png",
    fullName: "Aarav Mehta",
    passportNumber: "P1234567",
    nationality: "Indian",
    dateOfBirth: "2003-07-18",
    placeOfBirth: "Bhopal, Madhya Pradesh, India",
    gender: "Male",
    phone: "+91 98765 43210",
    email: "aarav.mehta.test@example.com",
    address: "24 Arera Colony, Bhopal, Madhya Pradesh, 462016, India",
  },

  aboutMe:
    "Motivated Business Administration graduate with a growing academic interest in business analytics, data-driven decision-making and digital transformation. Through university projects, online certifications and practical exposure to business operations, I have developed skills in data analysis, research, Excel, Power BI and presentation. I aim to pursue an MSc in Business Analytics to strengthen my analytical and strategic capabilities and prepare for a career in business intelligence and data-driven management.",

  education: [
    {
      id: "edu-1",
      institution: "Bhopal School of Management Studies",
      qualification: "Bachelor of Business Administration (BBA)",
      fieldOfStudy: "Business Administration",
      startDate: "2022-08-01",
      endDate: "2025-05-31",
      description:
        "Graduated with 76%. Studied Business Statistics, Financial Management, Marketing Management, Business Research Methods and Management Information Systems. Completed academic projects involving customer analytics and market research.",
    },
    {
      id: "edu-2",
      institution: "St. Xavier's Senior Secondary School",
      qualification: "Senior Secondary / Class XII",
      fieldOfStudy: "Commerce",
      startDate: "2020-04-01",
      endDate: "2022-03-31",
      description:
        "Completed Class XII with 82%. Main subjects included Accountancy, Business Studies, Economics, English and Mathematics.",
    },
  ],

  internships: [
    {
      id: "intern-1",
      role: "Business Analytics Intern",
      company: "Apex Retail Solutions",
      location: "Bhopal, India",
      startDate: "2024-06-01",
      endDate: "2024-08-31",
      description:
        "Assisted the analytics team with retail sales data cleansing, customer segmentation in Excel, and creation of automated performance dashboards in Power BI. Prepared weekly summary reports for senior managers.",
    },
  ],

  academicInterests: [
    { id: "ai-1", name: "Business Analytics" },
    { id: "ai-2", name: "Data-Driven Decision Making" },
    { id: "ai-3", name: "Business Intelligence" },
    { id: "ai-4", name: "Consumer Behaviour" },
    { id: "ai-5", name: "Digital Transformation" },
  ],

  academicProjects: [
    {
      id: "proj-1",
      title: "Customer Purchase Behaviour Analysis",
      role: "Primary Researcher",
      dateYear: "January – April 2025",
      skills: "Microsoft Excel, Power BI, Survey Analysis, Data Visualization",
      link: "https://example.com/aarav-customer-analysis",
      description:
        "Conducted a university research project analysing customer purchasing behaviour using survey responses from a sample dataset. Cleaned and organised data in Excel, created visual dashboards in Power BI and identified patterns related to price sensitivity, product preference and customer satisfaction.",
    },
    {
      id: "proj-2",
      title: "Digital Marketing Performance Dashboard",
      role: "Team Leader / Data Analyst",
      dateYear: "August – November 2024",
      skills: "Excel, Power BI, Google Sheets, Data Interpretation",
      link: "https://example.com/aarav-marketing-dashboard",
      description:
        "Worked in a four-member university team to analyse sample digital marketing campaign data. Developed a dashboard showing impressions, engagement, conversion rates and campaign performance and presented recommendations based on the findings.",
    },
  ],

  achievements: [
    {
      id: "ach-1",
      title: "1st Runner-Up – Inter-College Business Case Competition",
      organisation: "Central India Management Forum",
      dateYear: "2024",
      description:
        "Part of a three-member team that developed and presented a market-entry strategy for a fictional consumer brand, securing second position among 18 participating teams.",
    },
    {
      id: "ach-2",
      title: "Academic Merit Recognition",
      organisation: "Bhopal School of Management Studies",
      dateYear: "2023",
      description:
        "Recognised for consistent academic performance during the first year of the Bachelor of Business Administration programme.",
    },
  ],

  leadershipActivities: [
    {
      id: "lead-1",
      activity: "Student Event Coordinator",
      organisation: "Management Students Association",
      duration: "2024–2025",
      description:
        "Helped plan academic and cultural events, coordinated student volunteers, managed event schedules and communicated with faculty coordinators.",
      impact: "Coordinated three student events involving approximately 120 participants.",
    },
    {
      id: "lead-2",
      activity: "Team Captain – College Cricket Team",
      organisation: "Bhopal School of Management Studies",
      duration: "2023–2024",
      description:
        "Participated in inter-college cricket tournaments and supported team coordination, match preparation and practice scheduling.",
      impact: "Led the team during two inter-college tournaments.",
    },
  ],

  volunteering: [
    {
      id: "vol-1",
      organization: "Bhopal Youth Learning Initiative",
      role: "Volunteer Tutor",
      startDate: "2024-06-01",
      endDate: "2024-12-20",
      description:
        "Volunteered on weekends to support school students with basic mathematics, English communication and computer fundamentals.",
    },
  ],

  certifications: [
    {
      id: "cert-1",
      name: "Microsoft Power BI Data Analyst Fundamentals",
      provider: "Microsoft Learn – Sample Test Entry",
      completionDate: "June 2025",
      credentialLink: "https://example.com/certificate/powerbi-aarav",
      description:
        "Covered data preparation, data modelling, visualisation, dashboard development and introductory business intelligence concepts.",
    },
    {
      id: "cert-2",
      name: "Excel Skills for Business",
      provider: "Coursera – Sample Test Entry",
      completionDate: "February 2025",
      credentialLink: "https://example.com/certificate/excel-aarav",
      description:
        "Completed training in formulas, data cleaning, pivot tables, charts, spreadsheet analysis and business reporting.",
    },
  ],

  languages: [
    { id: "lang-1", language: "Hindi", level: "Native" },
    { id: "lang-2", language: "English", level: "C1 – Advanced" },
    { id: "lang-3", language: "French", level: "A2 – Elementary" },
  ],

  englishCertificate: {
    examName: "IELTS Academic",
    score: "7.5 Overall",
    dateTaken: "2026-02-14",
    issuingBody: "British Council",
  },

  skills: [
    { id: "sk-1", name: "Microsoft Excel", proficiency: "Advanced" },
    { id: "sk-2", name: "Power BI", proficiency: "Intermediate" },
    { id: "sk-3", name: "Data Analysis", proficiency: "Intermediate" },
    { id: "sk-4", name: "Business Research", proficiency: "Proficient" },
    { id: "sk-5", name: "Data Visualization", proficiency: "Intermediate" },
    { id: "sk-6", name: "Market Research", proficiency: "Proficient" },
    { id: "sk-7", name: "Presentation Skills", proficiency: "Advanced" },
    { id: "sk-8", name: "Academic Writing", proficiency: "Proficient" },
  ],

  hobbies: [
    {
      id: "hb-1",
      name: "Cricket",
      description:
        "Regularly participates in cricket and enjoys the teamwork, discipline and competitive environment associated with team sports.",
    },
    {
      id: "hb-2",
      name: "Business & Technology Reading",
      description:
        "Enjoys reading articles and introductory books about business strategy, analytics, entrepreneurship and emerging digital technologies.",
    },
    {
      id: "hb-3",
      name: "Video Editing",
      description:
        "Creates and edits short-form videos using basic editing tools, with an interest in visual storytelling and digital content.",
    },
  ],

  recommendations: [
    {
      id: "rec-1",
      recommenderName: "Dr. Priya Sharma",
      recommenderTitle: "Associate Professor of Management",
      organization: "Bhopal School of Management Studies",
      text: "I am pleased to recommend Aarav Mehta for postgraduate study in Business Analytics. I taught Aarav in Business Research Methods and Management Information Systems and observed his growing interest in applying analytical methods to business problems. He approached research assignments with curiosity, worked effectively with classmates and demonstrated good ability to interpret business data and communicate findings clearly.\n\nAarav also participated actively in academic projects and student activities. In particular, his work involving customer-behaviour analysis demonstrated his willingness to move beyond theoretical concepts and apply practical analytical techniques. He is responsible, receptive to feedback and motivated to continue developing his quantitative and managerial skills.\n\nI believe postgraduate study in Business Analytics represents a logical progression from his Business Administration background and will allow him to develop the analytical capabilities required for his future career objectives.",
    },
    {
      id: "rec-2",
      recommenderName: "Prof. Rohan Verma",
      recommenderTitle: "Head of Department – Business Administration",
      organization: "Bhopal School of Management Studies",
      text: "Aarav has demonstrated consistent academic engagement and a responsible approach to both individual and group assignments. His interest in business analytics became increasingly visible through his project work, presentations and independent learning. He has shown the ability to communicate effectively, collaborate with peers and take responsibility during student activities. I am confident that he will approach postgraduate education with commitment and a willingness to learn.",
    },
  ],

  declaration:
    "I hereby declare that the information provided in this curriculum vitae is true and accurate to the best of my knowledge. I understand that supporting documentation may be requested to verify the information provided.",
};
