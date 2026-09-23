/**
 * University Statement of Purpose (SOP)
 * Template ID: university-statement-of-purpose
 *
 * 9-Section Academic Admissions Structure:
 * 01 Student Introduction
 * 02 Academic Background
 * 03 Interest / Motivation
 * 04 Why This Course
 * 05 Why This University
 * 06 Academic Fit
 * 07 Career Goals
 * 08 Contribution / Future Vision
 * 09 Closing
 *
 * Grounded in verified student facts and authentic student voice.
 * Zero unverified claims, zero invented childhood stories, zero visa/embassy logistics.
 */

import type { SopTemplate } from "../types/sop-generator";

export const universitySopTemplate: SopTemplate = {
  id: "university-statement-of-purpose",
  name: "University Statement of Purpose (SOP)",
  documentType: "UNIVERSITY_SOP",
  country: "Global",
  documentHeaderTitle: "STATEMENT OF PURPOSE",
  canvasMasthead: "Statement of Purpose · Academic Admissions",
  salutation: "Dear Admissions Committee,",
  closingSignoff: "Sincerely,",
  pdfDocumentType: "Statement_of_Purpose",
  showLogisticsInContext: false,
  sidebarGroups: [
    {
      id: "foundation",
      title: "FOUNDATION",
      sectionIds: ["student-introduction", "academic-background"],
    },
    {
      id: "motivation-fit",
      title: "MOTIVATION & FIT",
      sectionIds: ["interest-motivation", "why-course", "why-university", "academic-fit"],
    },
    {
      id: "future",
      title: "FUTURE",
      sectionIds: ["career-goals", "contribution-vision"],
    },
    {
      id: "closing",
      title: "CLOSING",
      sectionIds: ["closing-statement"],
    },
  ],
  sections: [
    // ── 01. Student Introduction ────────────────────────────────────────────
    {
      id: "student-introduction",
      title: "Student Introduction",
      source: "HYBRID",
      required: true,
      order: 1,
      editable: true,
      regeneratable: true,
      content: `My name is **{{student.fullName}}**, and I am a prospective student from {{student.city}}, {{student.country}}. I am submitting this Statement of Purpose to formally apply for admission to the **{{destination.course}}** programme at **{{destination.university}}**. Having completed my {{academics.latestQualification}} at {{academics.institution}}, I have prepared this statement to articulate my academic background, motivations, and future aspirations in this discipline.`,
      sourceFacts: {
        "Full Name": "{{student.fullName}}",
        Location: "{{student.city}}, {{student.country}}",
        "Target Course": "{{destination.course}}",
        University: "{{destination.university}}",
        "Prior Qualification": "{{academics.latestQualification}}",
      },
    },

    // ── 02. Academic Background ─────────────────────────────────────────────
    {
      id: "academic-background",
      title: "Academic Background",
      source: "WEBHOOK",
      required: true,
      order: 2,
      editable: true,
      regeneratable: false,
      content: `I completed my {{academics.latestQualification}} from **{{academics.institution}}** under the {{academics.board}} in **{{academics.completionYear}}**, focusing on {{academics.subjects}} and achieving an aggregate score of **{{academics.percentage}}**. My studies provided me with a solid foundation in core analytical and conceptual coursework, preparing me for advanced international study.`,
      sourceFacts: {
        Qualification: "{{academics.latestQualification}}",
        Institution: "{{academics.institution}}",
        Board: "{{academics.board}}",
        Year: "{{academics.completionYear}}",
        Subjects: "{{academics.subjects}}",
        Result: "{{academics.percentage}}",
      },
    },

    // ── 03. Interest / Motivation ───────────────────────────────────────────
    {
      id: "interest-motivation",
      title: "Interest / Motivation",
      source: "AI_SUGGESTED",
      required: true,
      order: 3,
      editable: true,
      regeneratable: true,
      content: `My interest in this field developed naturally through my academic coursework and focused engagement with {{academics.subjects}}. As I learned more about the core principles and their practical applications, I recognized the importance of this discipline in solving contemporary problems. This motivated me to pursue advanced, systematic education in {{destination.course}} to build both depth and specialized domain knowledge.`,
      sourceFacts: {
        Subjects: "{{academics.subjects}}",
        Course: "{{destination.course}}",
      },
    },

    // ── 04. Why This Course ─────────────────────────────────────────────────
    {
      id: "why-course",
      title: "Why This Course",
      source: "HYBRID",
      required: true,
      order: 4,
      editable: true,
      regeneratable: true,
      content: `The **{{destination.course}}** curriculum offers the structured coursework and practical depth I need at this stage of my education. Building directly upon my prior studies in {{academics.subjects}}, the curriculum combines rigorous core subjects with specialized modules that directly align with my academic interests and professional objectives.`,
      sourceFacts: {
        Course: "{{destination.course}}",
        Degree: "{{destination.degreeLevel}}",
        Subjects: "{{academics.subjects}}",
      },
    },

    // ── 05. Why This University ─────────────────────────────────────────────
    {
      id: "why-university",
      title: "Why This University",
      source: "AI_SUGGESTED",
      required: true,
      order: 5,
      editable: true,
      regeneratable: true,
      content: `I chose **{{destination.university}}** because of its established academic curriculum, dedicated faculty, and focused learning environment in **{{destination.city}}**, {{destination.country}}. The institution's emphasis on high academic standards and modern academic resources makes it an ideal setting for my studies in {{destination.course}}.`,
      sourceFacts: {
        University: "{{destination.university}}",
        City: "{{destination.city}}",
        Country: "{{destination.country}}",
      },
    },

    // ── 06. Academic Fit ────────────────────────────────────────────────────
    {
      id: "academic-fit",
      title: "Academic Fit",
      source: "HYBRID",
      required: true,
      order: 6,
      editable: true,
      regeneratable: true,
      content: `My academic trajectory has equipped me with the analytical mindset, subject background, and study habits needed to succeed in this program. Having secured **{{academics.percentage}}** in {{academics.latestQualification}} while studying {{academics.subjects}}, I am well-prepared to engage with advanced coursework and contribute productively to classroom discussions at **{{destination.university}}**.`,
      sourceFacts: {
        Qualification: "{{academics.latestQualification}}",
        Subjects: "{{academics.subjects}}",
        Result: "{{academics.percentage}}",
      },
    },

    // ── 07. Career Goals ────────────────────────────────────────────────────
    {
      id: "career-goals",
      title: "Career Goals",
      source: "HYBRID",
      required: true,
      order: 7,
      editable: true,
      regeneratable: true,
      content: `Upon completing my degree in **{{destination.course}}**, my objective is to begin my career in the sector, applying the analytical methodologies and practical training acquired during my studies to real-world challenges. Over the long term, I aspire to take on greater responsibility and contribute meaningfully to the advancement of my professional field.`,
      sourceFacts: {
        Course: "{{destination.course}}",
      },
    },

    // ── 08. Contribution / Future Vision ────────────────────────────────────
    {
      id: "contribution-vision",
      title: "Contribution / Future Vision",
      source: "AI_SUGGESTED",
      required: false,
      order: 8,
      editable: true,
      regeneratable: true,
      content: `As a student at **{{destination.university}}**, I intend to participate actively in academic life, engaging in collaborative study with peers and contributing to departmental discussions. Following graduation, I aim to apply my international training and technical competencies to contribute responsibly to my industry and home community.`,
      sourceFacts: {
        University: "{{destination.university}}",
        Course: "{{destination.course}}",
      },
    },

    // ── 09. Closing ─────────────────────────────────────────────────────────
    {
      id: "closing-statement",
      title: "Closing",
      source: "FIXED",
      required: true,
      order: 9,
      editable: true,
      regeneratable: false,
      content: `Thank you for your time and consideration of my application to the **{{destination.course}}** programme at **{{destination.university}}**. I am fully prepared to meet the academic rigor of the institution and look forward to the opportunity to join the university community.`,
      sourceFacts: {
        University: "{{destination.university}}",
        Course: "{{destination.course}}",
      },
    },
  ],
};
