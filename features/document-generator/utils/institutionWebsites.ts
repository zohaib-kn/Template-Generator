/**
 * Known institution websites lookup for Europass Education entries.
 * Maps school/university names to their official homepages.
 */
const KNOWN_INSTITUTION_WEBSITES: Record<string, string> = {
  "k.d.b. public school": "https://www.kdbpublicschool.com",
  "kdb public school": "https://www.kdbpublicschool.com",
  "k.d.b public school": "https://www.kdbpublicschool.com",
  "kdb school": "https://www.kdbpublicschool.com",
  "k.d.b.": "https://www.kdbpublicschool.com",
  "bal bhawan school": "https://www.balbhawanschool.in",
  "rizvi law college": "https://www.rizvilawcollege.edu.in",
  "bhopal school of management studies": "https://www.bsms.ac.in",
  "st. xavier's senior secondary school": "https://www.stxaviersbhopal.edu.in",
  "st. xavier's": "https://www.stxaviersbhopal.edu.in",
  "st xaviers": "https://www.stxaviersbhopal.edu.in",
  "university of cassino": "https://www.unicas.it",
  "cassino": "https://www.unicas.it",
  "university of padova": "https://www.unipd.it",
  "padova": "https://www.unipd.it",
  "iit bombay": "https://www.iitb.ac.in",
  "delhi university": "https://www.du.ac.in",
};

/**
 * Normalizes an institution name and returns a known website URL if available.
 */
export function getInstitutionWebsite(institution?: string): string | undefined {
  if (!institution) return undefined;
  const clean = institution.trim().toLowerCase().replace(/\s+/g, " ");

  if (KNOWN_INSTITUTION_WEBSITES[clean]) {
    return KNOWN_INSTITUTION_WEBSITES[clean];
  }

  for (const [key, url] of Object.entries(KNOWN_INSTITUTION_WEBSITES)) {
    if (clean.includes(key) || key.includes(clean)) {
      return url;
    }
  }

  return undefined;
}
