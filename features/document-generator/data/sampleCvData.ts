import type { DocumentData } from "@/types";

/**
 * Authoritative sample fixture matching the supplied reference CV PDF.
 * Used for visual fidelity testing and initial editor population.
 */
export const referenceCvData: DocumentData = {
  personal: {
    fullName: "AVI .",
    passportNumber: "AJ897212",
    nationality: "Indian",
    dateOfBirth: "2007-09-05",
    placeOfBirth: "Bhopal, Madhya Pradesh, India",
    gender: "Male",
    phone: "(+91) 8770995332",
    email: "aviavi3829@gmail.com",
    address: "15, Ahinsa vihar colony ayodhya Bypass road, 462041 Bhopal (India)",
    photoUrl: "/sample-avatar.png",
  },
  aboutMe:
    "My name is **Avi**, and I am from **Bhopal, Madhya Pradesh**. I have completed my **Class 12 education** with a strong academic focus on **History, Economics, and Political Science**. These subjects have helped me develop a deep interest in understanding society, governance, and the forces that shape nations and economies over time.\n\nI enjoy studying historical events and analyzing how past decisions influence the present. Economics has strengthened my logical thinking and problem-solving skills, while Political Science has broadened my perspective on democracy, public policy, and global affairs. Together, these subjects have encouraged me to think critically, ask meaningful questions, and form well-reasoned opinions. I consider myself a disciplined, curious, and responsible student who values education and personal growth. I believe in continuous learning and strive to improve my knowledge both inside and outside the classroom. I actively work on developing good communication skills and a balanced outlook toward life. In the future, I aim to pursue higher studies in the field of **social sciences** and build a career where I can contribute positively to society. I am motivated, focused, and determined to achieve my goals through hard work and dedication.",
  education: [
    {
      id: "ed-1",
      qualification: "Grade 12th",
      institution: "Christ Senior Secondary school",
      startDate: "2025-04-01",
      endDate: "2026-04-30",
      description:
        "Address: 7F4X+M24, Patel Nagar, Bhopal, Madhya Pradesh, 462022 | Website: https://christicsebhopal.com/ | Final grade: A GRADE",
    },
    {
      id: "ed-2",
      qualification: "10th",
      institution: "Christ Senior Secondary school",
      startDate: "2023-04-01",
      endDate: "2024-05-06",
      description:
        "Address: 7F4X+M24, Patel Nagar, Bhopal, Madhya Pradesh 462022, | Website: https://schools.org.in/bhopal/23320303432/pvt-ps-1-5-christ-school-patel-nagar-anand-nagar-40491.html",
    },
  ],
  recommendations: [
    {
      id: "rec-1",
      recommenderName: "Vilsy Mathew",
      recommenderTitle: "Political Science teacher",
      organization: "",
      text:
        "It is a true pleasure for me to write this letter of recommendation to support the candidate Avi to pursue his further education in your esteemed university. Avi stands out as a remarkably perceptive student with a profound grasp of political ideologies and a steadfast commitment to dissecting societal structures. Having instructed him in Political Science across 11th and 12th grades, I observed his exceptional aptitude for nuanced argumentation and his top rankings in essays on constitutional frameworks and geopolitical strategies.\n\nThrough our extensive classroom engagements, I am assured that Avi will enrich your scholarly environment substantially. He masterfully crafts original perspectives on electoral systems and power dynamics, sustaining exemplary academic growth over time. His razor-sharp analytical acumen, rigorous research methodology, and talent for linking past revolutions to modern diplomacy empower him to conquer intellectual pursuits boldly.\n\nAvi's fervor for Political Science propels him to delve into sophisticated realms such as federalism and human rights doctrines on his own initiative.\n\nAvi exhibits not just scholarly prowess but also unwavering diligence, flexibility, and keen participation. His poised conduct and collegial spirit have garnered respect from educators and fellow students alike.\n\nWithout doubt, he will flourish amid your demanding academic milieu.\n\nTo conclude, Avi embodies the aptitude, readiness, and integrity essential for extraordinary achievement in your undergraduate program. I champion his candidacy wholeheartedly.\n\nEmail: vilsysiju@gmail.com | Phone number: (+91) 942571411\nLink: https://drive.google.com/open?id=1mIGvmSLgILV0XOGtKW7LsNhnKjejWen1&usp=drive_fs",
    },
  ],
  languages: [
    {
      id: "lang-1",
      language: "Hindi",
      level: "Mother tongue",
    },
    {
      id: "lang-2",
      language: "English",
      level: "C1",
    },
  ],
  englishCertificate: {
    examName: "IELTS – (INTERNATIONAL ENGLISH LANGUAGE TEST SYSTEM)",
    score: "Overall Band: 7.0",
    dateTaken: "2026-02-10",
    issuingBody:
      "• Listening: 7.5\n• Reading: 7.0\n• Writing: 6.0\n• Speaking: 6.5\n• Date of Test: 10/02/2026\n• Test report form number: 25IA514815A003A",
  },
  skills: [
    { id: "skill-1", name: "Video editing" },
    { id: "skill-2", name: "Creative writing" },
  ],
  hobbies: [
    { id: "hobby-1", name: "Cooking" },
    { id: "hobby-2", name: "Cinematography" },
    { id: "hobby-3", name: "Travelling" },
    { id: "hobby-4", name: "Bike Riding" },
  ],
  volunteering: [
    {
      id: "vol-1",
      role: "NGO",
      description:
        "I have also volunteered for various social causes at an old age homes and rehabilitation centres in my city Bhopal.",
    },
  ],
  declaration:
    "I hereby declare that the above furnished details are true to the best of my knowledge and belief.",
};
