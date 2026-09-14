# templates/europass/

This directory will contain the **Europass-style template** — the first template
implementation for the Dynamic Document / CV Template Generator.

## Purpose

The Europass template renders a two-page A4 student/CV document with:

- A header with profile photograph, full name, and contact details
- Personal information block (passport, nationality, DOB, gender, etc.)
- About Me section
- Education and Training (repeatable entries)
- Recommendations (repeatable entries)
- Language Skills (repeatable entries)
- English Language Certificate / IELTS
- Skills (repeatable entries)
- Hobbies and Interests (repeatable entries)
- Volunteering (repeatable entries)
- Declaration

## Planned file structure (Phase 1+)

```
europass/
├── EuropassTemplate.tsx    — top-level template component (entry point)
├── EuropassHeader.tsx      — profile photo + name + contact bar
├── EuropassSidebar.tsx     — optional left sidebar (if layout requires)
├── sections/
│   ├── PersonalSection.tsx
│   ├── AboutMeSection.tsx
│   ├── EducationSection.tsx
│   ├── RecommendationsSection.tsx
│   ├── LanguagesSection.tsx
│   ├── EnglishCertificateSection.tsx
│   ├── SkillsSection.tsx
│   ├── HobbiesSection.tsx
│   ├── VolunteeringSection.tsx
│   └── DeclarationSection.tsx
├── europass.module.css     — template-specific styles (A4 layout, colours, fonts)
└── metadata.ts             — exports the TemplateDefinition for this template
```

## Template metadata (to be implemented in metadata.ts)

- `id`: `"europass"`
- `version`: `"1"`
- `displayName`: `"Europass"`
- `supportedSections`: all document sections listed above

## Rules

- This template must consume `DocumentData` from `@/types` — it must not define its own data shape.
- All layout is A4 (210mm × 297mm). The live preview and PDF output must use the same components.
- No student-specific or personal data may be hardcoded in these components.
- Sections must be conditionally rendered when their data is absent.
- Repeatable sections must use `.map()` over arrays — never hardcoded repetitions.
