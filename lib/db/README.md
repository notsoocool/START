## Database Structure

The application uses MongoDB with Mongoose for data management. Here's a detailed overview of our data models:

### Database Connection

The application implements a singleton pattern for database connections to ensure efficient resource usage:

- Maintains a single connection throughout the application lifecycle
- Automatically handles connection states
- Environment-based configuration using `MONGO_URI`

### Data Models

#### 1. Shloka Model

Represents Sanskrit verses with their structural information:

```typescript
{
  chaptno: string;    // Chapter number
  slokano: string;    // Verse number
  spart1: string;     // Verse sepearted by #
  book: string;       // Source book name
  part1?: string;     // Book subdivision 1 (optional)
  part2?: string;     // Book subdivision 2 (optional)
}
```

#### 2. Analysis Model

Provides detailed linguistic analysis of Sanskrit verses:

```typescript
{
  chaptno: string;           // Chapter number
  slokano: string;          // Verse number
  sentno: string;           // Sentence number
  bgcolor?: string;         // Background color for UI
  graph: string;            // Dependency graph
  anvaya_no: string;        // Word order number
  word: string;             // Sanskrit word
  poem: string;             // Poetic form
  sandhied_word: string;    // Word with sandhi
  morph_analysis: string;   // Morphological analysis
  morph_in_context: string; // Contextual morphology
  kaaraka_sambandha: string;// Syntactic relations
  possible_relations: string;// Possible semantic relations
  meanings: Map<string, string>; // Multi-language meanings dictionary (key: language code, value: meaning)
  hindi_meaning?: string;   // @deprecated - Use meanings.get('hi') instead
  english_meaning?: string; // @deprecated - Use meanings.get('en') instead
  samAsa: string;          // Compound analysis
  prayoga: string;         // Usage type
  sarvanAma: string;       // Pronoun information
  name_classification: string; // Word classification
  book: string;            // Source book
  part1?: string;          // Book part 1
  part2?: string;          // Book part 2
}
```

##### Multi-Language Meanings

The `meanings` field is a Map that stores translations in multiple languages dynamically. This allows admins to add new languages without database schema changes.

**Usage Examples:**

```typescript
// Set a meaning for a language
analysis.meanings.set('en', 'English meaning');
analysis.meanings.set('hi', 'Hindi meaning');
analysis.meanings.set('sa', 'Sanskrit meaning');

// Get a meaning for a specific language
const englishMeaning = analysis.meanings.get('en');
const hindiMeaning = analysis.meanings.get('hi');

// Check if a language exists
if (analysis.meanings.has('fr')) {
  const frenchMeaning = analysis.meanings.get('fr');
}

// Get all available languages
const languages = Array.from(analysis.meanings.keys()); // ['en', 'hi', 'sa']

// Get all meanings as an object (useful for API responses)
const meaningsObj = Object.fromEntries(analysis.meanings); // { en: '...', hi: '...' }

// Remove a language
analysis.meanings.delete('fr');
```

**Note:** When serialized to JSON (e.g., in API responses), Mongoose automatically converts the Map to a plain object: `{ meanings: { en: "...", hi: "..." } }`

**Language Codes:** Use ISO 639-1 language codes (e.g., 'en' for English, 'hi' for Hindi, 'sa' for Sanskrit, 'fr' for French, etc.)

#### 3. Permissions Model

Manages user roles and permissions:

```typescript
{
	userID: string; // Unique user identifier
	name: string; // User's name
	perms: string; // Permission level (default: "User")
}
```

### Permission Levels

- **User**: Basic access
- **Annotator**: Can add annotations
- **Editor**: Can edit content
- **Admin**: Administrative access
- **Root**: Full system access

### Database Features

- **Validation**: Required field enforcement
- **Flexible Schema**: Optional fields for extensibility
- **Type Safety**: TypeScript interfaces for all models
- **Relationship Management**: Cross-referenced documents
- **Efficient Querying**: Indexed fields for performance

### API Integration

The models are used throughout the application's API routes for:

- Fetching shlokas and their analyses
- Managing user permissions
- Creating and updating content
- Querying specific verses or chapters

## Environment Setup

To configure the database connection, ensure your `.env.local` file includes:

```env
MONGO_URI=your_mongodb_connection_string
```

## Database Management

### Connecting to MongoDB

```typescript
import dbConnect from "@/lib/db/connect";

// In your API route:
await dbConnect();
```

### Model Usage Example

```typescript
import Shloka from "@/lib/db/newShlokaModel";
import Analysis from "@/lib/db/newAnalysisModel";
import Perms from "@/lib/db/permissionsModel";

// Fetch a shloka
const shloka = await Shloka.findById(id);

// Get analysis
const analysis = await Analysis.find({
	book: bookName,
	chaptno: chapter,
});

// Check permissions
const userPerms = await Perms.findOne({ userID: userId });
```