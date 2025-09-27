# Industrin.se - Swedish Industrial Company Directory

A full-stack web application for discovering and connecting with Swedish industrial companies. Built with React, TypeScript, Express.js, and PostgreSQL.

## 🚀 Live Demo

Visit the live site: [https://industrin.replit.app/](https://industrin.replit.app/)

## 🏗️ Tech Stack

- **Frontend**: React + TypeScript with Vite
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **UI**: shadcn/ui components with Tailwind CSS
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter for client-side routing

## 📊 Database

- **Companies**: 363+ Swedish industrial companies
- **Categories**: Service, Reparation & Underhåll, Automation, Hydraulik, CNC, etc.
- **Features**: Company profiles, quote requests, claim requests

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database (Neon recommended)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd industrin
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your DATABASE_URL
```

4. Set up the database:
```bash
npm run db:push
```

5. Start development server:
```bash
npm run dev
```

## 🌐 Deployment

### Netlify Deployment

1. Connect your GitHub repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist/public`
4. Add environment variable: `DATABASE_URL`

### Environment Variables

- `DATABASE_URL`: PostgreSQL connection string

## 📁 Project Structure

```
├── client/           # React frontend
├── server/           # Express.js backend
├── shared/           # Shared types and schemas
├── scripts/          # Database migration scripts
├── data/             # Company data
└── netlify/          # Netlify deployment config
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:push` - Push database schema changes

## 📝 Features

- **Smart Search**: Intelligent company search with Swedish character support
- **Company Profiles**: Detailed company information with contact details
- **Quote Requests**: Customer inquiry system
- **Company Claiming**: Business owners can claim their listings
- **Responsive Design**: Mobile-friendly interface
- **SEO Optimized**: Proper meta tags and structure

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Links

- [Live Site](https://industrin.replit.app/)
- [Documentation](./replit.md)
