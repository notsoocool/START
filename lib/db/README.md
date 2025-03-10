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
  hindi_meaning?: string;   // Hindi translation
  english_meaning: string;  // English translation
  samAsa: string;          // Compound analysis
  prayoga: string;         // Usage type
  sarvanAma: string;       // Pronoun information
  name_classification: string; // Word classification
  book: string;            // Source book
  part1?: string;          // Book part 1
  part2?: string;          // Book part 2
}
```

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