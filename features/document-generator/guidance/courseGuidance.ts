/**
 * guidance/courseGuidance.ts
 *
 * Configuration table mapping every CourseCategory to its section priorities
 * and editor hints.
 *
 * IMPORTANT:
 * - These are general CV preparation suggestions only.
 * - They are NOT official admission requirements from any university.
 * - Hints appear in the editor sidebar only — never in the generated PDF.
 * - No data is auto-inserted into DocumentData.
 */

import type { CourseCategory, CourseConfig } from "./types";

export const courseGuidance: Record<CourseCategory, CourseConfig> = {

  "Computer Science / IT": {
    sections: [
      {
        sectionKey: "education",
        label: "Education & Training",
        priority: "highly-relevant",
        hint: "Highlight mathematics, computer science and science subjects.",
      },
      {
        sectionKey: "academicProjects",
        label: "Academic Projects",
        priority: "highly-relevant",
        hint: "Add genuine coding, application, robotics, data or technical projects. Include GitHub links where available.",
      },
      {
        sectionKey: "academicInterests",
        label: "Academic Interests",
        priority: "highly-relevant",
        hint: "e.g. Artificial Intelligence, Cybersecurity, Machine Learning, Web Development.",
      },
      {
        sectionKey: "skills",
        label: "Academic & Transferable Skills",
        priority: "highly-relevant",
        hint: "Include genuine technical skills: programming languages, tools, frameworks.",
      },
      {
        sectionKey: "certifications",
        label: "Certifications",
        priority: "recommended",
        hint: "Online courses in programming, data science, cloud computing etc. from Coursera, edX, Google etc.",
      },
      {
        sectionKey: "achievements",
        label: "Achievements & Awards",
        priority: "recommended",
        hint: "Hackathons, coding competitions, Olympiads, science fairs.",
      },
      {
        sectionKey: "leadershipActivities",
        label: "Leadership & Extracurricular",
        priority: "recommended",
        hint: "Robotics clubs, coding clubs, tech events, student organisations.",
      },
      {
        sectionKey: "volunteering",
        label: "Volunteering",
        priority: "optional",
        hint: "Tech-related volunteering or community projects are more relevant than generic.",
      },
      {
        sectionKey: "hobbies",
        label: "Hobbies & Personal Interests",
        priority: "optional",
        hint: "Tech-related interests are more relevant here (e.g. open-source contributions, game development).",
      },
      {
        sectionKey: "languages",
        label: "Language Skills",
        priority: "recommended",
        hint: "Language proficiency is valued alongside technical skills.",
      },
    ],
    suggestions: [
      "Emphasise genuine programming projects with real code or outcomes.",
      "Include GitHub, portfolio, or project links where they exist and are genuine.",
      "Mathematics preparation is highly relevant — highlight strong grades.",
      "Technical competitions (hackathons, coding olympiads) strengthen the profile.",
      "Online certifications in relevant areas demonstrate self-driven learning.",
    ],
  },

  "Engineering": {
    sections: [
      {
        sectionKey: "education",
        label: "Education & Training",
        priority: "highly-relevant",
        hint: "Highlight mathematics, physics and any science or technical subjects.",
      },
      {
        sectionKey: "academicProjects",
        label: "Academic Projects",
        priority: "highly-relevant",
        hint: "Engineering, electronics, robotics, CAD, maker, or design projects.",
      },
      {
        sectionKey: "academicInterests",
        label: "Academic Interests",
        priority: "highly-relevant",
        hint: "e.g. Mechanical Engineering, Electronics, Civil Engineering, Robotics.",
      },
      {
        sectionKey: "skills",
        label: "Academic & Transferable Skills",
        priority: "highly-relevant",
        hint: "Technical skills: CAD software, programming, lab skills, problem solving.",
      },
      {
        sectionKey: "achievements",
        label: "Achievements & Awards",
        priority: "recommended",
        hint: "Technical competitions, science olympiads, engineering fairs.",
      },
      {
        sectionKey: "certifications",
        label: "Certifications",
        priority: "recommended",
        hint: "Technical courses or certifications relevant to the engineering field.",
      },
      {
        sectionKey: "leadershipActivities",
        label: "Leadership & Extracurricular",
        priority: "recommended",
        hint: "Robotics teams, technical clubs, STEM events.",
      },
      {
        sectionKey: "volunteering",
        label: "Volunteering",
        priority: "optional",
      },
      {
        sectionKey: "hobbies",
        label: "Hobbies & Personal Interests",
        priority: "optional",
        hint: "Maker hobbies, electronics, building — genuine hands-on interests.",
      },
      {
        sectionKey: "languages",
        label: "Language Skills",
        priority: "recommended",
      },
    ],
    suggestions: [
      "Strong mathematics and physics preparation is essential.",
      "Real engineering or maker projects (even school-level) demonstrate genuine interest.",
      "Technical competitions and science fairs add credibility.",
      "CAD, electronics, or programming skills are relevant to include.",
    ],
  },

  "Business / Management": {
    sections: [
      {
        sectionKey: "education",
        label: "Education & Training",
        priority: "highly-relevant",
        hint: "Business, economics, mathematics and social science subjects are most relevant.",
      },
      {
        sectionKey: "leadershipActivities",
        label: "Leadership & Extracurricular",
        priority: "highly-relevant",
        hint: "Student council, club leadership, event organisation, entrepreneurship initiatives.",
      },
      {
        sectionKey: "achievements",
        label: "Achievements & Awards",
        priority: "highly-relevant",
        hint: "Business case competitions, entrepreneurship awards, leadership recognition.",
      },
      {
        sectionKey: "academicProjects",
        label: "Academic Projects",
        priority: "highly-relevant",
        hint: "Business plans, market research, case studies, financial analysis projects.",
      },
      {
        sectionKey: "skills",
        label: "Academic & Transferable Skills",
        priority: "recommended",
        hint: "Communication, presentation, teamwork, analytical skills.",
      },
      {
        sectionKey: "volunteering",
        label: "Volunteering",
        priority: "recommended",
        hint: "Community engagement or leadership-oriented volunteering.",
      },
      {
        sectionKey: "academicInterests",
        label: "Academic Interests",
        priority: "recommended",
        hint: "e.g. Entrepreneurship, Marketing, Finance, Strategy.",
      },
      {
        sectionKey: "certifications",
        label: "Certifications",
        priority: "recommended",
        hint: "Business, finance, or management courses from credible providers.",
      },
      {
        sectionKey: "hobbies",
        label: "Hobbies & Personal Interests",
        priority: "optional",
      },
      {
        sectionKey: "languages",
        label: "Language Skills",
        priority: "recommended",
        hint: "Multiple languages are an asset in business contexts.",
      },
    ],
    suggestions: [
      "Leadership experience — even school or community level — is highly valued.",
      "Business projects (plans, case studies, competitions) demonstrate genuine interest.",
      "Communication and teamwork skills are central to business programmes.",
      "Case competitions, finance clubs, or entrepreneurship initiatives strengthen the profile.",
    ],
  },

  "Economics / Finance": {
    sections: [
      {
        sectionKey: "education",
        label: "Education & Training",
        priority: "highly-relevant",
        hint: "Mathematics and economics subjects are most directly relevant.",
      },
      {
        sectionKey: "academicProjects",
        label: "Academic Projects",
        priority: "highly-relevant",
        hint: "Economics research, financial analysis, statistical projects, data work.",
      },
      {
        sectionKey: "academicInterests",
        label: "Academic Interests",
        priority: "highly-relevant",
        hint: "e.g. Macroeconomics, Behavioural Economics, Financial Markets, Data Analysis.",
      },
      {
        sectionKey: "skills",
        label: "Academic & Transferable Skills",
        priority: "highly-relevant",
        hint: "Analytical skills, data analysis, statistics, mathematics.",
      },
      {
        sectionKey: "achievements",
        label: "Achievements & Awards",
        priority: "recommended",
        hint: "Economics competitions, mathematics olympiads, research recognition.",
      },
      {
        sectionKey: "certifications",
        label: "Certifications",
        priority: "recommended",
        hint: "Financial literacy, data analysis, or economics courses.",
      },
      {
        sectionKey: "leadershipActivities",
        label: "Leadership & Extracurricular",
        priority: "recommended",
        hint: "Economics club, investment club, relevant student organisations.",
      },
      {
        sectionKey: "volunteering",
        label: "Volunteering",
        priority: "optional",
      },
      {
        sectionKey: "hobbies",
        label: "Hobbies & Personal Interests",
        priority: "optional",
      },
      {
        sectionKey: "languages",
        label: "Language Skills",
        priority: "recommended",
      },
    ],
    suggestions: [
      "Strong mathematics and quantitative preparation is central.",
      "Research projects or analytical work demonstrating economic thinking are valuable.",
      "Economics olympiads or competitions provide strong evidence of interest.",
      "Data analysis skills (even basic) are increasingly relevant to economics programmes.",
    ],
  },

  "Political Science / International Relations": {
    sections: [
      {
        sectionKey: "education",
        label: "Education & Training",
        priority: "highly-relevant",
        hint: "History, politics, economics, sociology subjects are most relevant.",
      },
      {
        sectionKey: "academicInterests",
        label: "Academic Interests",
        priority: "highly-relevant",
        hint: "e.g. International Relations, Comparative Politics, Public Policy, Political Theory.",
      },
      {
        sectionKey: "academicProjects",
        label: "Academic Projects",
        priority: "highly-relevant",
        hint: "Add genuine essays, research, policy analysis, surveys or political/social science projects.",
      },
      {
        sectionKey: "leadershipActivities",
        label: "Leadership & Extracurricular",
        priority: "highly-relevant",
        hint: "Model United Nations, debating societies, student council, community campaigns.",
      },
      {
        sectionKey: "achievements",
        label: "Achievements & Awards",
        priority: "recommended",
        hint: "Essay competitions, debating awards, MUN recognitions.",
      },
      {
        sectionKey: "volunteering",
        label: "Volunteering",
        priority: "recommended",
        hint: "Community engagement, civic participation, social causes.",
      },
      {
        sectionKey: "skills",
        label: "Academic & Transferable Skills",
        priority: "recommended",
        hint: "Research, essay writing, critical analysis, public speaking.",
      },
      {
        sectionKey: "hobbies",
        label: "Hobbies & Personal Interests",
        priority: "recommended",
        hint: 'Reading in political history or international affairs can be valuable, e.g. "Interested in political history and international affairs."',
      },
      {
        sectionKey: "certifications",
        label: "Certifications",
        priority: "optional",
        hint: "Relevant online courses in politics, international law, or research methods.",
      },
      {
        sectionKey: "languages",
        label: "Language Skills",
        priority: "highly-relevant",
        hint: "Multiple languages are particularly valuable in Political Science and IR.",
      },
    ],
    suggestions: [
      "Debating, MUN, and public speaking demonstrate direct subject engagement.",
      "Genuine research or essay projects on political/social topics strengthen the profile.",
      "Community or civic engagement is highly relevant to social science programmes.",
      "Reading and intellectual interests in politics or international affairs are worth expressing authentically.",
      "Multiple language skills are particularly valued in International Relations.",
    ],
  },

  "Social Sciences": {
    sections: [
      {
        sectionKey: "education",
        label: "Education & Training",
        priority: "highly-relevant",
      },
      {
        sectionKey: "academicProjects",
        label: "Academic Projects",
        priority: "highly-relevant",
        hint: "Research projects, surveys, essays, community studies, social analysis.",
      },
      {
        sectionKey: "academicInterests",
        label: "Academic Interests",
        priority: "highly-relevant",
        hint: "e.g. Sociology, Psychology, Anthropology, Social Policy, Gender Studies.",
      },
      {
        sectionKey: "volunteering",
        label: "Volunteering",
        priority: "highly-relevant",
        hint: "Community engagement, social cause involvement, outreach activities.",
      },
      {
        sectionKey: "skills",
        label: "Academic & Transferable Skills",
        priority: "recommended",
        hint: "Research, academic writing, critical analysis, communication.",
      },
      {
        sectionKey: "achievements",
        label: "Achievements & Awards",
        priority: "recommended",
      },
      {
        sectionKey: "leadershipActivities",
        label: "Leadership & Extracurricular",
        priority: "recommended",
        hint: "Community groups, social campaigns, student organisations.",
      },
      {
        sectionKey: "hobbies",
        label: "Hobbies & Personal Interests",
        priority: "optional",
      },
      {
        sectionKey: "certifications",
        label: "Certifications",
        priority: "optional",
        hint: "Research methods, social science, or psychology courses.",
      },
      {
        sectionKey: "languages",
        label: "Language Skills",
        priority: "recommended",
      },
    ],
    suggestions: [
      "Genuine community engagement and volunteering demonstrates subject commitment.",
      "Research or analytical projects (even school-based) show academic readiness.",
      "Critical writing and analysis skills are central to social science programmes.",
    ],
  },

  "Arts / Media / Design": {
    sections: [
      {
        sectionKey: "academicProjects",
        label: "Academic Projects",
        priority: "highly-relevant",
        hint: "Portfolio projects — films, photography, graphic design, creative writing, artwork.",
      },
      {
        sectionKey: "education",
        label: "Education & Training",
        priority: "highly-relevant",
      },
      {
        sectionKey: "academicInterests",
        label: "Academic Interests",
        priority: "highly-relevant",
        hint: "e.g. Cinematography, Graphic Design, Photography, Filmmaking, Visual Arts.",
      },
      {
        sectionKey: "skills",
        label: "Academic & Transferable Skills",
        priority: "highly-relevant",
        hint: "Creative software (Adobe Suite, Premiere Pro, etc.), design tools, technical craft skills.",
      },
      {
        sectionKey: "achievements",
        label: "Achievements & Awards",
        priority: "recommended",
        hint: "Competitions, exhibitions, publications, creative recognitions.",
      },
      {
        sectionKey: "hobbies",
        label: "Hobbies & Personal Interests",
        priority: "recommended",
        hint: "Cinematography, photography or filmmaking can be valuable when they reflect genuine work or practice.",
      },
      {
        sectionKey: "certifications",
        label: "Certifications",
        priority: "recommended",
        hint: "Courses in design software, filmmaking, creative media.",
      },
      {
        sectionKey: "leadershipActivities",
        label: "Leadership & Extracurricular",
        priority: "recommended",
        hint: "Creative clubs, media teams, student publications, art societies.",
      },
      {
        sectionKey: "volunteering",
        label: "Volunteering",
        priority: "optional",
      },
      {
        sectionKey: "languages",
        label: "Language Skills",
        priority: "optional",
      },
    ],
    suggestions: [
      "Portfolio or project evidence of genuine creative work is central.",
      "Competitions, exhibitions, and creative recognitions demonstrate commitment.",
      "Technical creative skills (software, tools) are directly relevant.",
      "Personal interests in creative practice are more valuable when paired with real examples.",
    ],
  },

  "Health / Life Sciences": {
    sections: [
      {
        sectionKey: "education",
        label: "Education & Training",
        priority: "highly-relevant",
        hint: "Biology, Chemistry, and science subjects are most directly relevant.",
      },
      {
        sectionKey: "academicInterests",
        label: "Academic Interests",
        priority: "highly-relevant",
        hint: "e.g. Molecular Biology, Genetics, Biochemistry, Public Health, Neuroscience.",
      },
      {
        sectionKey: "academicProjects",
        label: "Academic Projects",
        priority: "highly-relevant",
        hint: "Science projects, biology/chemistry experiments, research interest papers — only genuine work.",
      },
      {
        sectionKey: "achievements",
        label: "Achievements & Awards",
        priority: "recommended",
        hint: "Science competitions, biology/chemistry olympiads, research recognition.",
      },
      {
        sectionKey: "volunteering",
        label: "Volunteering",
        priority: "recommended",
        hint: "Community health, care environments — only include genuine experiences.",
      },
      {
        sectionKey: "skills",
        label: "Academic & Transferable Skills",
        priority: "recommended",
        hint: "Laboratory skills, research skills, analytical thinking.",
      },
      {
        sectionKey: "certifications",
        label: "Certifications",
        priority: "recommended",
        hint: "Science, biology, or health-related online courses.",
      },
      {
        sectionKey: "leadershipActivities",
        label: "Leadership & Extracurricular",
        priority: "optional",
      },
      {
        sectionKey: "hobbies",
        label: "Hobbies & Personal Interests",
        priority: "optional",
      },
      {
        sectionKey: "languages",
        label: "Language Skills",
        priority: "optional",
      },
    ],
    suggestions: [
      "Strong science subject preparation (Biology, Chemistry) is essential.",
      "Science projects and research interests demonstrate genuine academic commitment.",
      "Science competitions or olympiads are particularly valuable.",
      "Only include healthcare/clinical exposure that is genuinely documented.",
    ],
  },

  "Natural Sciences": {
    sections: [
      {
        sectionKey: "education",
        label: "Education & Training",
        priority: "highly-relevant",
        hint: "Mathematics, physics, chemistry — strong preparation is expected.",
      },
      {
        sectionKey: "academicInterests",
        label: "Academic Interests",
        priority: "highly-relevant",
        hint: "e.g. Physics, Chemistry, Mathematics, Environmental Science, Astronomy.",
      },
      {
        sectionKey: "academicProjects",
        label: "Academic Projects",
        priority: "highly-relevant",
        hint: "Science experiments, independent research projects, mathematical modelling.",
      },
      {
        sectionKey: "achievements",
        label: "Achievements & Awards",
        priority: "highly-relevant",
        hint: "Science/mathematics olympiads, competitions, research awards.",
      },
      {
        sectionKey: "skills",
        label: "Academic & Transferable Skills",
        priority: "recommended",
        hint: "Analytical skills, mathematical reasoning, laboratory skills.",
      },
      {
        sectionKey: "certifications",
        label: "Certifications",
        priority: "recommended",
        hint: "Science or mathematics courses demonstrating independent learning.",
      },
      {
        sectionKey: "leadershipActivities",
        label: "Leadership & Extracurricular",
        priority: "optional",
      },
      {
        sectionKey: "volunteering",
        label: "Volunteering",
        priority: "optional",
      },
      {
        sectionKey: "hobbies",
        label: "Hobbies & Personal Interests",
        priority: "optional",
        hint: "Genuine scientific curiosity or independent learning interests.",
      },
      {
        sectionKey: "languages",
        label: "Language Skills",
        priority: "optional",
      },
    ],
    suggestions: [
      "Mathematics and science preparation is the primary focus.",
      "Science olympiads and competitions are strong differentiators.",
      "Independent scientific projects demonstrate genuine intellectual curiosity.",
    ],
  },

  "Law": {
    sections: [
      {
        sectionKey: "education",
        label: "Education & Training",
        priority: "highly-relevant",
        hint: "Humanities, history, politics, and English subjects are most relevant.",
      },
      {
        sectionKey: "academicInterests",
        label: "Academic Interests",
        priority: "highly-relevant",
        hint: "e.g. Constitutional Law, International Law, Human Rights, Legal Theory.",
      },
      {
        sectionKey: "academicProjects",
        label: "Academic Projects",
        priority: "highly-relevant",
        hint: "Legal research, essay writing, policy analysis, current affairs projects.",
      },
      {
        sectionKey: "leadershipActivities",
        label: "Leadership & Extracurricular",
        priority: "highly-relevant",
        hint: "Debating society, MUN, mock trials, public speaking, student advocacy.",
      },
      {
        sectionKey: "skills",
        label: "Academic & Transferable Skills",
        priority: "recommended",
        hint: "Critical analysis, essay writing, research, public speaking, argumentation.",
      },
      {
        sectionKey: "achievements",
        label: "Achievements & Awards",
        priority: "recommended",
        hint: "Essay competitions, debating prizes, academic recognition.",
      },
      {
        sectionKey: "volunteering",
        label: "Volunteering",
        priority: "recommended",
        hint: "Community involvement, civic engagement, social justice activities.",
      },
      {
        sectionKey: "hobbies",
        label: "Hobbies & Personal Interests",
        priority: "optional",
        hint: "Reading in law, history, or current affairs — express genuine interests.",
      },
      {
        sectionKey: "certifications",
        label: "Certifications",
        priority: "optional",
      },
      {
        sectionKey: "languages",
        label: "Language Skills",
        priority: "recommended",
        hint: "Additional languages are an asset in international law contexts.",
      },
    ],
    suggestions: [
      "Debating and public speaking are directly relevant to law programmes.",
      "Critical analysis, essay writing, and argumentation skills are central.",
      "MUN, mock trials, or student advocacy demonstrate genuine interest.",
      "Reading and engagement with legal or current affairs topics is valuable.",
    ],
  },

  "Hospitality / Tourism": {
    sections: [
      {
        sectionKey: "education",
        label: "Education & Training",
        priority: "highly-relevant",
      },
      {
        sectionKey: "leadershipActivities",
        label: "Leadership & Extracurricular",
        priority: "highly-relevant",
        hint: "Event organisation, team roles, service-oriented activities.",
      },
      {
        sectionKey: "skills",
        label: "Academic & Transferable Skills",
        priority: "highly-relevant",
        hint: "Communication, customer service, teamwork, event planning.",
      },
      {
        sectionKey: "languages",
        label: "Language Skills",
        priority: "highly-relevant",
        hint: "Multiple languages are particularly valuable in hospitality and tourism.",
      },
      {
        sectionKey: "academicInterests",
        label: "Academic Interests",
        priority: "recommended",
        hint: "e.g. Tourism Management, Hotel Operations, Event Management, Travel.",
      },
      {
        sectionKey: "volunteering",
        label: "Volunteering",
        priority: "recommended",
        hint: "Community events, hospitality volunteering, customer-facing roles.",
      },
      {
        sectionKey: "achievements",
        label: "Achievements & Awards",
        priority: "recommended",
      },
      {
        sectionKey: "hobbies",
        label: "Hobbies & Personal Interests",
        priority: "recommended",
        hint: "Travel, cultural interests, cooking — genuine interests are relevant here.",
      },
      {
        sectionKey: "academicProjects",
        label: "Academic Projects",
        priority: "optional",
        hint: "Tourism or hospitality research, event planning projects.",
      },
      {
        sectionKey: "certifications",
        label: "Certifications",
        priority: "optional",
        hint: "Hospitality, tourism, or customer service courses.",
      },
    ],
    suggestions: [
      "Communication skills and customer-facing experience are highly relevant.",
      "Multiple languages are a strong asset in hospitality and tourism.",
      "Event organisation, teamwork, and leadership demonstrate readiness.",
      "Genuine travel or cultural interests can be expressed in the profile.",
    ],
  },

  "Other": {
    sections: [
      {
        sectionKey: "education",
        label: "Education & Training",
        priority: "highly-relevant",
      },
      {
        sectionKey: "academicProfile",
        label: "Academic Profile",
        priority: "highly-relevant",
        hint: "Describe your academic direction and genuine motivation clearly.",
      },
      {
        sectionKey: "academicInterests",
        label: "Academic Interests",
        priority: "recommended",
      },
      {
        sectionKey: "academicProjects",
        label: "Academic Projects",
        priority: "recommended",
      },
      {
        sectionKey: "achievements",
        label: "Achievements & Awards",
        priority: "recommended",
      },
      {
        sectionKey: "skills",
        label: "Academic & Transferable Skills",
        priority: "recommended",
      },
      {
        sectionKey: "leadershipActivities",
        label: "Leadership & Extracurricular",
        priority: "optional",
      },
      {
        sectionKey: "volunteering",
        label: "Volunteering",
        priority: "optional",
      },
      {
        sectionKey: "hobbies",
        label: "Hobbies & Personal Interests",
        priority: "optional",
      },
      {
        sectionKey: "certifications",
        label: "Certifications",
        priority: "optional",
      },
      {
        sectionKey: "languages",
        label: "Language Skills",
        priority: "recommended",
      },
    ],
    suggestions: [
      "Focus on genuine academic preparation relevant to your intended programme.",
      "Real projects and interests that connect to your chosen course are most valuable.",
      "Check the specific programme requirements at your target institution.",
    ],
  },
};
