# Sanity Check Conditions

This document lists all validation conditions in the sanity check for the START analysis data.

---

## 1. General Field Checks

| # | Condition | Error Message |
|---|-----------|---------------|
| 1 | Extra spaces (2+ spaces or leading/trailing) in any string field | `Extra spaces in field '${field}'` |
| 2 | Word ends with "-" and anvaya is X.Y or X.Y.Z but kaaraka doesn't contain `${prefix}.` | `kaaraka_sambandha should contain ${prefix}.any_number when word ends with "-"` |

---

## 2. कर्ता Target Validation (checkKartaSambandha)

When a row has `कर्ता,X.Y` (not अभिहित_कर्ता), the target row's morph must match the source morph:

| # | Condition | Error Message |
|---|-----------|---------------|
| 3 | Source morph has "1", target morph lacks कर्तरि / क्तवतु / क्त | `कर्ता present but target does not have कर्तरि or क्तवतु or क्त` |
| 4 | Source morph has "3", target morph lacks कर्मणि / क्त / तव्यत् / अनीयर् | `कर्ता present but target does not have कर्मणि or क्त or तव्यत् or अनीयर्` |
| 5 | Source morph has "6", target morph lacks ल्युट् / घञ् | `कर्ता present but target does not have ल्युट् or घञ्` |

---

## 3. Kaaraka Structure

| # | Condition | Error Message |
|---|-----------|---------------|
| 6 | Kaaraka is "-" or "" and not referenced by any other row in same sentno/slokano | `Hanging node detected` |
| 7 | morph_in_context contains "/" | `morph_in_context contains '/'` |
| 8 | kaaraka_sambandha contains "#" (should use ; not #) | `kaaraka_sambandha contains '#'` |
| 9 | anvaya_no appears in its own kaaraka_sambandha | `Self loop detected` |

---

## 4. bgcolor Validity

| # | Condition | Error Message |
|---|-----------|---------------|
| 10 | bgcolor part is not N1-N8, NA, KP, CP, or hex | `Invalid bgcolor: ${p}. Must be N1-N8, NA, KP, CP or hex` |
| 11 | morph has {अव्य} but bgcolor is not NA | `morph_in_context has {अव्य} but bgcolor is not NA` |
| 12 | morph has कर्तरि but bgcolor is not KP | `morph_in_context has कर्तरि but bgcolor is not KP` |

---

## 5. Kaaraka vs Possible Relations

| # | Condition | Error Message |
|---|-----------|---------------|
| 13 | Kaaraka entry not found in possible_relations (with exceptions) | `kaaraka_sambandha ${kaarakaFirst} not found in possible_relations ${possible}` |
| 14 | No valid string from VALID_STRINGS in both kaaraka and possible | `No valid string found in both kaaraka_sambandha and possible_relations` |

---

## 6. Morph–Kaaraka Rules

Each relation requires specific markers in morph_in_context:

| # | Relation | Required in morph_in_context | Error Message |
|---|----------|-----------------------------|---------------|
| 15 | हेतुः | 3, 5, or तसिल् | `हेतुः requires 3 or 5 or तसिल् in morph_in_context` |
| 16 | करणम् (standalone) | 3 | `करणम् requires 3 in morph_in_context` |
| 17 | विषयाधिकरणम् / देशाधिकरणम् / कालाधिकरणम् / अधिकरणम् | 7 or अव्य | `अधिकरणम् variants require 7 or अव्य in morph_in_context` |
| 18 | सम्प्रदानम् | 4 | `सम्प्रदानम् requires 4 in morph_in_context` |
| 19 | अपादानम् | 5 | `अपादानम् requires 5 in morph_in_context` |
| 20 | पूर्वकालः | क्त्वा or ल्यप् | `पूर्वकालः requires क्त्वा or ल्यप् in morph_in_context` |
| 21 | षष्ठीसम्बन्धः | 6 | `षष्ठीसम्बन्धः requires 6 in morph_in_context` |
| 22 | भावलक्षणसप्तमी | 7 | `भावलक्षणसप्तमी requires 7 in morph_in_context` |
| 23 | वर्तमानसमानकालः | शतृ or शानच् | `वर्तमानसमानकालः requires शतृ or शानच् in morph_in_context` |

---

## 7. प्रयोजककर्ता / प्रयोज्यकर्ता

| # | Condition | Error Message |
|---|-----------|---------------|
| 24 | प्रयोजककर्ता present, morph has "1", target lacks णिच् | `प्रयोजककर्ता present but target does not have णिच्` |
| 25 | प्रयोजककर्ता present but morph lacks 1 or 3 | `प्रयोजककर्ता requires 1 or 3 in morph_in_context` |
| 26 | प्रयोज्यकर्ता present, morph has "3", target lacks णिच् | `प्रयोज्यकर्ता present but target does not have णिच्` |
| 27 | प्रयोज्यकर्ता present but morph lacks 2 or 3 | `प्रयोज्यकर्ता requires 2 or 3 in morph_in_context` |

---

## 8. Morph vs bgcolor Consistency

| # | Condition | Error Message |
|---|-----------|---------------|
| 28 | morph has vibhakti numbers (पुं;/स्त्री;/नपुं;)(1-8) but bgcolor does not match | `morph_in_context has vibhakti numbers ${...} but bgcolor does not match` |
| 29 | morph has N1-N8 but bgcolor does not include it | `morph_in_context has ${n} but bgcolor does not include it` |

---

## 9. Post-Loop Checks

| # | Condition | Error Message |
|---|-----------|---------------|
| 30 | anvaya_no referenced in kaaraka but does not exist | `Hanging reference: anvaya_no "${ref}" is referenced but does not exist` |

---

## Skipped Checks

- **Rows with word "-", "", "."** — Only referenced anvayas are collected; other checks are skipped.
- **Rows with "अभिहित" in kaaraka** — All further checks are skipped (matches Python).
- **कर्ता with अभिहित_कर्ता** — Target morph validation is skipped.
