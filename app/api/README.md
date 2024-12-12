### API Documentation for Sanskrit Text Analysis System

#### 1. **Fetch All Books**
   **Endpoint:**  
   `GET https://start-two-rust.vercel.app/api/books`

   **Description:**  
   Retrieves a list of all books, their parts (e.g., part1, part2), and corresponding chapters.

   **Response Example:**
   ```json
   [
     {
       "book": "रामायणम्",
       "part1": [
         {
           "part": "बालकाण्ड",
           "part2": [
             {
               "part": "सर्ग-1",
               "chapters": ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10"]
             }
           ]
         }
       ]
     }
   ]
   ```

---

#### 2. **Fetch Shlokas from a Specific Chapter**
   **Endpoint Template:**  
   `GET https://start-two-rust.vercel.app/api/books/[book]/[part1]/[part2]/[chaptno]`

   **Example:**  
   `GET https://start-two-rust.vercel.app/api/books/रामायणम्/बालकाण्ड/सर्ग-1/01`

   **Description:**  
   Fetches all shlokas for a specific chapter within a book and its parts.

   **Response Example:**
   ```json
   {
     "shlokas": [
       {
         "_id": "6731b810bc15a69d0e898343",
         "chaptno": "01",
         "slokano": "001",
         "spart1": "तपःस्वाध्यायनिरतं तपस्वी वाग्विदां वरम्",
         "spart2": "नारदं परिपप्रच्छ  वाल्मीकिर्मुनिपुङ्गवम्",
         "book": "रामायणम्",
         "part1": "बालकाण्ड",
         "part2": "सर्ग-1",
         "__v": 0
       },
       {
         "_id": "6731b810bc15a69d0e898344",
         "chaptno": "01",
         "slokano": "002",
         "spart1": "कोन्वस्मिन् साम्प्रतं लोके गुणवान् कश्च वीर्यवान्",
         "spart2": "धर्मज्ञश्च कृतज्ञश्च सत्यवाक्यो दृढव्रतः",
         "book": "रामायणम्",
         "part1": "बालकाण्ड",
         "part2": "सर्ग-1",
         "__v": 0
       }
     ]
   }
   ```

---

#### 3. **Fetch Analysis of a Specific Shloka**
   **Endpoint Template:**  
   `GET https://start-two-rust.vercel.app/api/analysis/[book]/[part1]/[part2]/[chaptno]/[slokano]`

   **Example:**  
   `GET https://start-two-rust.vercel.app/api/analysis/रामायणम्/बालकाण्ड/सर्ग-1/01/001`

   **Description:**  
   Fetches detailed analysis for a specific shloka in a given chapter of a book and its parts.

   **Response Example:**
   ```json
   [
     {
       "_id": "6731b811bc15a69d0e8983a9",
       "chaptno": "01",
       "slokano": "001",
       "sentno": "1",
       "bgcolor": "#FFFF00",
       "graph": "assets/graphs/01_001_1.svg",
       "anvaya_no": "1.1",
       "word": "तपः-",
       "poem": "-",
       "sandhied_word": "तपः-स्वाध्याय-निरतम्",
       "morph_analysis": "तपस्",
       "morph_in_context": "तपस्",
       "kaaraka_sambandha": "इतरेतर-द्वन्द्वः,1.2",
       "possible_relations": "इतरेतर-द्वन्द्वः,1.2",
       "hindi_meaning": "तपः-",
       "english_meaning": "-",
       "samAsa": "-",
       "prayoga": "-",
       "sarvanAma": "-",
       "name_classification": "-",
       "book": "रामायणम्",
       "part1": "बालकाण्ड",
       "part2": "सर्ग-1",
       "__v": 0
     },
     {
       "_id": "6731b811bc15a69d0e8983aa",
       "chaptno": "01",
       "slokano": "001",
       "sentno": "1",
       "bgcolor": "#FFFF00",
       "graph": "assets/graphs/01_001_1.svg",
       "anvaya_no": "1.2",
       "word": "स्वाध्याय-",
       "poem": "-",
       "sandhied_word": "--",
       "morph_analysis": "स्वाध्याय",
       "morph_in_context": "स्वाध्याय",
       "kaaraka_sambandha": "सप्तमी-तत्पुरुषः,1.3",
       "possible_relations": "सप्तमी-तत्पुरुषः,1.3",
       "hindi_meaning": "स्वाध्याय-",
       "english_meaning": "-",
       "samAsa": "-",
       "prayoga": "-",
       "sarvanAma": "-",
       "name_classification": "-",
       "book": "रामायणम्",
       "part1": "बालकाण्ड",
       "part2": "सर्ग-1",
       "__v": 0
     }
   ]
   ```

---

### General Notes:
- **Dynamic Parameters:**
  - Replace `[book]`, `[part1]`, `[part2]`, `[chaptno]`, and `[slokano]` with actual values when making API calls.
- **Content Type:** JSON
- **Error Handling:**
  - If a specific resource is not found, the API will return an error response with relevant details.
- **Versioning:** Ensure API changes do not break existing implementations.

For any further clarifications or updates, contact the API maintainer.
