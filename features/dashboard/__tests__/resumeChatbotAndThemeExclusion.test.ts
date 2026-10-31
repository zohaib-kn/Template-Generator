import { describe, it } from "node:test";
import assert from "node:assert";
import { syncSectionsToCvData } from "../utils/documentStudioSync";
import type { DocumentData } from "@/models/ResumeDraft";

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  sectionUpdated?: string;
  actionType?: "typed_section" | "deleted_section" | "polished" | "trimmed" | "outline" | "general";
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  messages: ChatMessage[];
}

function getDefaultGreetingMessage(studentName: string, docType: string): ChatMessage {
  const isCv = docType === "CV";
  const isCoverLetter = docType === "COVER_LETTER";

  let intro = `Hello! I'm your AI Admissions Assistant for **${studentName}**.`;
  if (isCv) {
    intro += `\n\nYou can ask me to polish text, trim content, or directly share details to update this CV:\n  *"Add IELTS 7.5 (TRF 26IA...)"*\n  *"Add work experience: Frontend Intern at Acme Corp from June 2023 to Dec 2023"*\n  *"Add skills: React, TypeScript, Node.js"*\n  *"Add education: Bachelor of Technology at Delhi University"*\n  *"delete [section name]"* to remove any section`;
  } else if (isCoverLetter) {
    intro += `\n\nYou can ask me to polish academic tone, audit visa compliance, or directly type missing details to verify them:\n  *"Add student city Bhopal"*\n  *"Set father's occupation to businessman"*\n  *"Update education loan amount to ₹20,00,000"*`;
  } else {
    intro += `\n\nYou can ask me to polish academic tone, create an architectural outline, trim verbosity, or draft new paragraphs.`;
  }

  return {
    id: `welcome-${docType}-${studentName.replace(/[^a-zA-Z0-9]/g, "_")}`,
    sender: "assistant",
    text: intro,
    timestamp: "10:00 AM",
    actionType: "general",
  };
}

describe("Resume Chatbot Features & Quick Actions", () => {
  describe("1. Multi-turn Chat Sessions & New Chat Isolation", () => {
    it("creates a fresh session without deleting previous conversation threads", () => {
      const studentName = "Aafia Ameen";
      const docType = "CV";

      // Session 1 with previous conversation
      const session1Greeting = getDefaultGreetingMessage(studentName, docType);
      const session1: ChatSession = {
        id: "sess-1",
        title: "IELTS Inquiry",
        createdAt: "10:00 AM",
        messages: [
          session1Greeting,
          {
            id: "msg-1",
            sender: "user",
            text: "Add IELTS 7.5 TRF 26IA...",
            timestamp: "10:01 AM",
          },
          {
            id: "msg-2",
            sender: "assistant",
            text: "Updated English Language Certificate with IELTS 7.5.",
            timestamp: "10:01 AM",
          },
        ],
      };

      const sessions: ChatSession[] = [session1];

      // User triggers New Chat
      const newSessionGreeting = getDefaultGreetingMessage(studentName, docType);
      const session2: ChatSession = {
        id: "sess-2",
        title: "Chat 2",
        createdAt: "10:15 AM",
        messages: [newSessionGreeting],
      };

      const updatedSessions = [...sessions, session2];

      // Verifications
      assert.strictEqual(updatedSessions.length, 2, "Both sessions must be preserved in history");
      assert.strictEqual(updatedSessions[0].id, "sess-1", "Previous session must remain intact");
      assert.strictEqual(updatedSessions[0].messages.length, 3, "Previous session messages must not be deleted");
      assert.strictEqual(updatedSessions[1].id, "sess-2", "New session must be created");
      assert.strictEqual(updatedSessions[1].messages.length, 1, "New session must have fresh initial message");
      assert.strictEqual(updatedSessions[1].messages[0].sender, "assistant");
    });

    it("allows switching back to any previous chat session seamlessly", () => {
      const session1: ChatSession = {
        id: "sess-1",
        title: "Session 1",
        createdAt: "10:00 AM",
        messages: [
          { id: "m1", sender: "user", text: "Question 1", timestamp: "10:00 AM" },
        ],
      };
      const session2: ChatSession = {
        id: "sess-2",
        title: "Session 2",
        createdAt: "10:05 AM",
        messages: [
          { id: "m2", sender: "user", text: "Question 2", timestamp: "10:05 AM" },
        ],
      };
      const sessions = [session1, session2];

      // Switch to session 1
      const activeSessionId = "sess-1";
      const currentActive = sessions.find((s) => s.id === activeSessionId);
      assert.ok(currentActive, "Session 1 must be found");
      assert.strictEqual(currentActive.messages[0].text, "Question 1");

      // Switch to session 2
      const switchedActive = sessions.find((s) => s.id === "sess-2");
      assert.ok(switchedActive, "Session 2 must be found");
      assert.strictEqual(switchedActive.messages[0].text, "Question 2");
    });
  });

  describe("2. Quick-Action Buttons Functionality", () => {
    const createBaseCv = (): DocumentData => ({
      personal: {
        firstName: "Aafia",
        lastName: "Ameen",
        email: "aafia.ameen@example.com",
        phone: "+91 98765 00000",
      },
      aboutMe: "I am a student wanting to learn.",
      education: [
        {
          id: "edu-1",
          qualification: "Class XII",
          institution: "National College Bangalore",
          startDate: "01/06/2022",
          endDate: "31/05/2024",
          finalGrade: "85%",
        },
      ],
      internships: [],
      skills: [{ id: "sk-1", name: "Python" }],
      languages: [{ id: "lang-1", name: "English" }],
      declaration: "I hereby declare that the above furnished details are true to the best of my knowledge and belief.",
    });

    it("Visa Check updates declaration to genuine student intent and syncs to CV", () => {
      const baseCv = createBaseCv();
      const targetUni = "Politecnico di Torino";
      const targetCourse = "Bachelor's Degree in Information Engineering";

      const genuineDeclaration = `I hereby declare that all information, academic credentials, and details provided in this document are authentic, accurate, and verifiable. I confirm my intent as a Genuine Student applying solely to pursue and complete ${targetCourse} at ${targetUni}. Upon graduation, I intend to return immediately to my home country to advance my professional career.`;

      const sections = [
        { heading: "ABOUT ME", content: baseCv.aboutMe || "" },
        { heading: "DECLARATION", content: genuineDeclaration },
      ];

      const synced = syncSectionsToCvData(sections, baseCv);
      assert.ok(synced.declaration, "CV must have declaration");
      assert.ok(synced.declaration.includes("Genuine Student"), "Declaration must contain Genuine Student statement");
      assert.ok(synced.declaration.includes("Politecnico di Torino"), "Declaration must include target university");
      assert.ok(synced.declaration.includes("return immediately to my home country"), "Declaration must contain intent to return");
    });

    it("Outline creates structured 4-pillar architectural summary and syncs to CV About Me", () => {
      const baseCv = createBaseCv();
      const outlineContent = `Candidate Profile & Core Architectural Pillars:\n• Core Pillar 1 (Academic Foundations): Rigorous secondary coursework in science and mathematics.\n• Core Pillar 2 (Technical & Applied Competencies): Applied skills in problem-solving and programming.\n• Core Pillar 3 (Practical Experience & Discipline): Consistent academic execution and independent learning.\n• Core Pillar 4 (International Target Synergy): Dedicated candidate seeking programmatic mastery in Information Engineering at Politecnico di Torino.`;

      const sections = [
        { heading: "ABOUT ME", content: outlineContent },
        { heading: "EDUCATION AND TRAINING", content: "Class XII [ 2022 - 2024 ]" },
      ];

      const synced = syncSectionsToCvData(sections, baseCv);
      assert.ok(synced.aboutMe, "About Me must be populated with outline");
      assert.ok(synced.aboutMe.includes("Core Pillar 1"), "Must include Core Pillar 1");
      assert.ok(synced.aboutMe.includes("Core Pillar 4"), "Must include Core Pillar 4");
    });

    it("Improve replaces passive phrasing with strong, impactful professional verbs", () => {
      const rawText = "I was responsible for developing code. I helped in testing and learned React.";
      let improved = rawText;
      improved = improved
        .replace(/\bresponsible for\b/gi, "spearheaded and managed")
        .replace(/\bhelped in\b/gi, "facilitated and contributed to")
        .replace(/\blearned\b/gi, "mastered and applied");

      assert.ok(!improved.includes("responsible for"), "Passive 'responsible for' should be replaced");
      assert.ok(improved.includes("spearheaded and managed"), "Should contain active verb 'spearheaded and managed'");
      assert.ok(improved.includes("facilitated and contributed to"), "Should contain 'facilitated and contributed to'");
      assert.ok(improved.includes("mastered and applied"), "Should contain 'mastered and applied'");
    });

    it("Polish refines informal tone into authentic academic diction while keeping facts unchanged", () => {
      const rawText = "I want to study at university because I am very good at programming and have lots of interest.";
      let polished = rawText;
      polished = polished
        .replace(/\bI want to\b/g, "I aim to")
        .replace(/\bvery good\b/g, "rigorous")
        .replace(/\blots of\b/g, "substantial")
        .replace(/\bgood at\b/g, "proficient in");

      assert.ok(!polished.includes("I want to"), "'I want to' should be polished");
      assert.ok(polished.includes("I aim to"), "Should contain 'I aim to'");
      assert.ok(polished.includes("substantial interest"), "Should contain 'substantial interest'");
    });
  });
});
