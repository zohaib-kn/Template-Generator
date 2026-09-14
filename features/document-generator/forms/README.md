# features/document-generator/forms/

This directory will contain **form components** for each document section.

Each form is responsible for collecting user input for one section of the document.
Forms receive data and onChange handlers as props — they own no global state themselves.

## Planned contents (Phase 1+)

- `PersonalDetailsForm` — profile photo, name, passport, DOB, contact fields
- `AboutMeForm` — free-text about-me section
- `EducationForm` — repeatable education entry form
- `RecommendationsForm` — repeatable recommendation entry form
- `LanguagesForm` — repeatable language entry form
- `EnglishCertificateForm` — IELTS / TOEFL fields
- `SkillsForm` — repeatable skills list
- `HobbiesForm` — repeatable hobbies list
- `VolunteeringForm` — repeatable volunteering entry form
- `DeclarationForm` — declaration text field

## Rules

- Forms import their field types from `@/types`.
- Validation schemas (if any) live in `../validation/`.
- Forms must not perform API calls — pass data up via callbacks.
