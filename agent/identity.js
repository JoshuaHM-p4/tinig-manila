'use strict';

const { chat, parseJsonBlob, FAST_MODEL } = require('./groq');
const { IDENTITY_EXTRACTION_PROMPT } = require('../prompts/system');

/**
 * Identity verification — the gate that decides whether Tinig is allowed
 * to disclose a caller's eGovPH records.
 *
 * Two steps:
 *   1. extractIdentity()    — LLM (fast model) pulls name + birthdate out of free-form Tagalog
 *   2. findCallerProfile()  — fuzzy-matches the extracted pair against db.json
 *
 * The matcher is deliberately lenient — senior callers say their birthday
 * a hundred different ways ("Enero beinte", "January 20", "1/20/1952"). We
 * try aliases first, then fall back to partial year/month/day matching.
 */

const MONTH_NAMES = [
  '', 'enero', 'pebrero', 'marso', 'abril', 'mayo', 'hunyo',
  'hulyo', 'agosto', 'setyembre', 'oktubre', 'nobyembre', 'disyembre',
  // English aliases live in the same array at index +12 so a single
  // numeric month index can look up either spelling.
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

function normalise(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
}

/**
 * Ask the fast LLM to extract name + birthdate from a caller message.
 *
 * @param {string} message
 * @returns {Promise<{name: string|null, birthdate: string|null, confidence: string}|null>}
 */
async function extractIdentity(message) {
  try {
    const raw = await chat({
      model: FAST_MODEL,
      messages: [
        { role: 'system', content: IDENTITY_EXTRACTION_PROMPT },
        { role: 'user', content: message },
      ],
      temperature: 0.1,
      max_tokens: 100,
    });
    return parseJsonBlob(raw);
  } catch {
    return null;
  }
}

/**
 * Fuzzy-match an extracted (name, birthdate) pair against db.egovph_accounts.
 *
 * Matching rules:
 *   - Name match: exact OR substring either direction (after normalisation).
 *   - Birthdate match (when supplied):
 *       a) Exact ISO match, OR
 *       b) Any value in `birthdate_aliases` matches, OR
 *       c) (year && month) match OR (month && day) match — covers cases
 *          where the caller said "Enero 20" without the year.
 *   - Name-only matches still return a profile (demo leniency), since
 *     callers can always be asked to confirm verbally afterwards.
 *
 * @param {Object} db
 * @param {string} name
 * @param {string|null} birthdate
 * @returns {Object|null} The full account record, or null.
 */
function findCallerProfile(db, name, birthdate) {
  if (!name) return null;
  const normName = normalise(name);

  for (const account of db.egovph_accounts || []) {
    const dbName = normalise(account.name);
    const nameMatch =
      dbName === normName ||
      dbName.includes(normName) ||
      normName.includes(dbName);
    if (!nameMatch) continue;

    if (!birthdate) return account;

    if (account.birthdate === birthdate) return account;

    const normBd = normalise(birthdate);
    const aliasMatch = (account.birthdate_aliases || []).some(
      (a) => normalise(a) === normBd || normBd.includes(normalise(a))
    );
    if (aliasMatch) return account;

    // Partial match using the canonical ISO date.
    const parts = (account.birthdate || '').split('-'); // ['1952','01','20']
    if (parts.length !== 3) continue;

    const yearMatch = birthdate.includes(parts[0]);
    const monthIdx = parseInt(parts[1], 10);
    const monthTagalog = MONTH_NAMES[monthIdx] || '';
    const monthEng = MONTH_NAMES[monthIdx + 12] || '';
    const dayNum = parseInt(parts[2], 10).toString();

    const monthMatch =
      (monthTagalog && normBd.includes(monthTagalog)) ||
      (monthEng && normBd.includes(monthEng)) ||
      normBd.includes(parts[1]);
    const dayMatch = normBd.includes(dayNum) || normBd.includes(parts[2]);

    if (yearMatch && monthMatch) return account;
    if (monthMatch && dayMatch) return account;
  }

  return null;
}

/**
 * Assemble the per-service context object that's injected into the system
 * prompt for a verified caller. Anything not registered for this account
 * comes back as null, which the prompt template treats as "skip".
 *
 * @param {Object} db
 * @param {string} accountId
 * @returns {{benefits, health, appointments, barangay, egovphInfo}}
 */
function buildDbContext(db, accountId) {
  return {
    benefits: db.senior_benefits?.[accountId] || null,
    health: db.health_services?.[accountId] || null,
    appointments: db.appointment_booking?.[accountId] || null,
    barangay: db.barangay_services?.[accountId] || null,
    egovphInfo: db.egovph_info || null,
  };
}

/**
 * Public projection of an account record — strips PII not safe for the
 * dashboard / API response (phone numbers, emergency contacts, etc.).
 *
 * @param {Object|null} profile
 * @returns {Object|null}
 */
function publicProfile(profile) {
  if (!profile) return null;
  return {
    name: profile.name,
    egovphStatus: profile.egovph_status,
    seniorCitizenId: profile.senior_citizen_id,
    city: profile.city,
    barangay: profile.barangay,
    registeredServices: profile.registered_services,
    preferredLanguage: profile.preferred_language,
  };
}

module.exports = {
  extractIdentity,
  findCallerProfile,
  buildDbContext,
  publicProfile,
};
