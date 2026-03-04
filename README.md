# START - Sanskrit Text Analysis and Reading Tool

A modern web application for exploring, analyzing, and learning Sanskrit literature with an interactive interface and comprehensive analysis tools.

![START Logo](public/logo.svg)

## 🌟 Features

### Core Functionality
- 📚 Browse sacred Sanskrit texts and chapters
- 🔍 Detailed word-by-word analysis
- 📝 Interactive shloka reading
- 🎯 Role-based access control
- 🌙 Dark mode support
- 📱 Responsive design

### Technical Features
- ⚡ Server-side rendering with Next.js 14
- 🔐 Secure authentication with Clerk
- 📊 MongoDB database integration
- 🎨 Modern UI with Tailwind CSS
- 🚀 Optimized performance
- 🌐 API routes for data management

## 🛠️ Tech Stack

### Frontend
- Next.js 14
- React with TypeScript
- Tailwind CSS
- ShadcnUI Components
- Clerk Authentication

### Backend
- Next.js API Routes
- MongoDB with Mongoose
- TypeScript

### Infrastructure
- Vercel Deployment
- MongoDB Atlas
- Clerk Authentication Services

## 📦 Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/start.git
cd start
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
```

3. **Set up environment variables**
Create a `.env.local` file with:
```env
MONGO_URI=your_mongodb_connection_string
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_secret
# Optional: for notification cleanup cron. Add in Vercel env vars; Vercel sends it in the Authorization header when invoking the cron.
CRON_SECRET=your_16_char_minimum_secret
```

4. **Run the development server**
```bash
npm run dev
# or
yarn dev
```

## 🏗️ Project Structure

```
start/
├── app/
│   ├── (dashboard)/
│   │   ├── books/
│   │   ├── admin/
│   │   ├── addshloka/
│   │   └── page.tsx
│   └── api/
├── components/
│   ├── global/
│   │   ├── header.tsx
│   │   ├── footer.tsx
│   │   └── navigation.tsx
│   └── ui/
├── lib/
│   └── db/
│       ├── connect.ts
│       ├── newShlokaModel.ts
│       ├── newAnalysisModel.ts
│       └── permissionsModel.ts
└── public/
```

## 💾 Database Models

### Shloka Model
Stores Sanskrit verses with metadata:
- Chapter and verse numbers
- Sanskrit text parts
- Book and section information

### Analysis Model
Comprehensive linguistic analysis:
- Morphological analysis
- Syntactic relations
- Word meanings
- Grammatical details

### Permissions Model
User role management:
- User levels (User to Root)
- Access control
- User metadata

## 🔐 Authentication & Authorization

### User Roles
1. **User**: Basic reading access
2. **Annotator**: Can add annotations
3. **Editor**: Content modification rights
4. **Admin**: Administrative access
5. **Root**: Full system access

### Permission Management
- Role-based access control
- Secure API endpoints
- Protected routes
- Admin dashboard

## 🎨 UI Components

### Global Components
- Header with navigation
- Footer with links
- Responsive navigation menu
- User authentication UI

### Feature Components
- Shloka display cards
- Analysis viewer
- Admin dashboard
- Upload interface

## 📡 API Routes

### Shloka Management
- `/api/books/[book]/[part1]/[part2]/[chaptno]`
- `/api/ahShloka/[id]`
- `/api/uploadJson`

### User Management
- `/api/getCurrentUser`
- `/api/getAllUsers`
- `/api/updateUser`

## 🔧 Configuration

### Development
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build application
npm run build
```

### Production
```bash
# Build for production
npm run build

# Start production server
npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## 👥 Team

- **Developer**: [Yajush Vyas]
- **Contact**: [vyasyajush@gmail.com]
- **Website**: [yajushvyas.in]

## 🙏 Acknowledgments

- Sanskrit scholars and contributors
- Open source community
- Framework and library maintainers

## 📚 Documentation

For detailed documentation:
- [Component Documentation](components/README.md)
- [API Documentation](api/README.md)
- [Database Documentation](lib/db/README.md)

## 🔮 Future Plans

- Enhanced analysis features
- Mobile application
- Additional Sanskrit texts
- Community features
- Advanced search capabilities