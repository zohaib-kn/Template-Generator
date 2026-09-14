import type { DocumentData } from "@/types";
import styles from "./europass.module.css";
import { EuropassPage } from "./EuropassPage";
import { EuropassHeader } from "./EuropassHeader";
import { AboutSection } from "./sections/AboutSection";
import { EducationSection } from "./sections/EducationSection";
import { RecommendationsSection } from "./sections/RecommendationsSection";
import { LanguageSkillsSection } from "./sections/LanguageSkillsSection";
import { EnglishCertificateSection } from "./sections/EnglishCertificateSection";
import { SkillsSection } from "./sections/SkillsSection";
import { HobbiesSection } from "./sections/HobbiesSection";
import { VolunteeringSection } from "./sections/VolunteeringSection";
import { DeclarationSection } from "./sections/DeclarationSection";

interface EuropassTemplateProps {
  data: DocumentData;
}

/**
 * Authoritative Europass template renderer.
 * Reconstructs the exact single-column layout, header, and light-blue decorations
 * from the reference Cairo-generated PDF.
 *
 * All data is passed strictly via props — zero context dependency, making this
 * component ready for both browser live preview and future server PDF rendering.
 */
export function EuropassTemplate({ data }: EuropassTemplateProps) {
  const hasPageTwoContent =
    Boolean(data.recommendations && data.recommendations.length > 0) ||
    Boolean(data.languages && data.languages.length > 0) ||
    Boolean(
      data.englishCertificate &&
        (data.englishCertificate.examName || data.englishCertificate.score)
    ) ||
    Boolean(data.skills && data.skills.length > 0) ||
    Boolean(data.hobbies && data.hobbies.length > 0) ||
    Boolean(data.volunteering && data.volunteering.length > 0) ||
    Boolean(data.declaration);

  return (
    <div className={styles.templateContainer}>
      {/* ── Page 1: Header + About Me + Education + Recommendations Start ─ */}
      <EuropassPage pageNumber={1}>
        <EuropassHeader personal={data.personal} />
        <AboutSection text={data.aboutMe} />
        <EducationSection entries={data.education} />
        <RecommendationsSection entries={data.recommendations} part={1} />
      </EuropassPage>

      {/* ── Page 2: Recommendations Conclusion + Languages + IELTS + ... ── */}
      {hasPageTwoContent && (
        <EuropassPage pageNumber={2}>
          <RecommendationsSection entries={data.recommendations} part={2} />
          <LanguageSkillsSection entries={data.languages} />
          <EnglishCertificateSection cert={data.englishCertificate} />
          <SkillsSection entries={data.skills} />
          <HobbiesSection entries={data.hobbies} />
          <VolunteeringSection entries={data.volunteering} />
          <DeclarationSection text={data.declaration} />
        </EuropassPage>
      )}
    </div>
  );
}
