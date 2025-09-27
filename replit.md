# Industrin.se - Swedish Industrial Company Directory

## Overview

This is a full-stack web application built as a Swedish industrial company directory platform. Users can search, filter, and discover industrial companies, view detailed company profiles, request quotes, and claim company listings. The application features a modern React frontend with shadcn/ui components and an Express.js backend with PostgreSQL database using Drizzle ORM.

## User Preferences

- Preferred communication style: Simple, everyday language
- Homepage design: Company directory functionality should be prominently featured on the start page instead of generic "popular categories"
- Search UX: Modern single search bar with smart suggestions, tag-based filtering, and A-Ö alphabetical listing as default (implemented January 2025)
- Launch strategy: Focus on "Service, Reparation & Underhåll" category for initial MVP launch, with plans to expand to additional categories in upcoming months
- **Data corrections policy**: Always fix incorrect data directly in the database rather than using frontend workarounds or display fixes. Maintain data integrity at the source level.
- **Location display preference**: Show only city names rather than "City, Region" format to avoid potential regional classification inconsistencies

## System Architecture

The application follows a monorepo structure with clear separation between client-side and server-side code:

- **Frontend**: React SPA with TypeScript, built with Vite
- **Backend**: Express.js REST API with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for client-side routing

## Key Components

### Database Schema (`shared/schema.ts`)
- **Users**: Basic user authentication with username/password
- **Companies**: Core company information including name, description, categories, location, contact details
- **Quote Requests**: Customer inquiries to companies for services/products
- **Claim Requests**: Business owners requesting to claim their company listings

### Frontend Architecture
- **Component Library**: shadcn/ui components for consistent UI
- **Styling**: Custom design system with primary blue theme and neutral colors
- **Forms**: React Hook Form with Zod validation
- **API Integration**: Centralized API client with TanStack Query

### Backend Architecture
- **RESTful API**: Clean separation of routes, storage layer, and database
- **Storage Pattern**: Repository pattern with `IStorage` interface for data operations
- **Database Connection**: Neon serverless PostgreSQL with connection pooling
- **Error Handling**: Centralized error middleware

## Data Flow

1. **Company Discovery**: Users search/filter companies through modern smart search interface
2. **Smart Search**: Real-time suggestions for companies, regions, and categories with tag-based filtering
3. **API Requests**: Frontend makes REST calls to Express backend with search parameters
4. **Database Queries**: Backend uses Drizzle ORM to query PostgreSQL with filters
5. **Response Caching**: TanStack Query caches responses for performance
6. **Form Submissions**: Quote and claim requests are submitted and stored in database

## Recent Changes

### January 2025 - Design System and Layout Improvements
- **Global heading color standardization**: Implemented consistent #161616 color across all h1-h6 headings site-wide using global CSS
- **Pure white background**: Changed from warm off-white (#fafaf1) to clean white background across entire platform
- **Fixed critical layout alignment**: Corrected quote request (/quote) and company claim (/ansokkontroll) pages by adding missing mx-auto container classes
- **Consistent 1280px layout**: All pages now properly align under top navigation with max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 container structure

### January 2025 - Company Claiming System Implementation
- **Simplified company claiming workflow**: Added "Äger du detta företag?" functionality to company profile pages
- **Clean page-based approach**: Users navigate to dedicated `/ansokkontroll/:companySlug` claim form page instead of modals  
- **Database integration**: Claim requests stored with pending status, linked to companies with name, email, phone, and role information
- **API endpoints**: Working `/api/companies/:companyId/claim` endpoint for claim submission and processing
- **Manual review workflow**: Claims can be reviewed directly in database, ready for future email notification integration

### January 2025 - Enhanced Search Functionality with Multi-Field Search and Swedish Character Support
- Implemented comprehensive search that covers company names, descriptions (Swedish/English), and categories
- Added intelligent relevance scoring: exact name matches → partial name matches → category matches → description matches
- Dramatically improved search results: "svetsning" now returns 103 companies (vs 1 previously), "automation" returns 42 companies (vs 11)
- **Swedish character handling**: Added synonym support for accent variations (göteborg/goteborg, malmö/malmo, skåne/skane)
- **Improved search examples**: Updated placeholder text with working examples ("CNC-bearbetning", "Lyftutrustning", "Hydraulik") that return real results
- Fixed search input focus outline issues for cleaner minimalist UI experience
- Search now properly utilizes the 133 Swedish descriptions imported earlier for better content discovery

### January 2025 - UI/UX Design Refinements for Minimalist Aesthetic
- Implemented straight-edged design system: removed rounded corners from all buttons and cards site-wide
- Cleaned up company cards by removing logo icons and hover shadow effects for cleaner, content-focused layout
- Enhanced back button with subtle arrow animation (moves left on hover) and refined color transitions
- Optimized homepage button typography for consistency across all interactive elements
- Achieved cohesive angular, modern design language throughout platform

### January 2025 - Major Data Quality Improvements and Regional Classification Overhaul
- Completed comprehensive regional classification fix affecting 334 companies across Sweden
- Corrected massive geographic misclassifications where companies were incorrectly assigned to Stockholm region
- Fixed specific examples: Markaryd moved from Stockholm to Kronobergs län (correct), Eslöv to Skåne, Västerås to Västmanland
- Improved geographical accuracy: Stockholm companies reduced from 900+ to 568, with proper distribution across all 21 Swedish regions (län)
- Current region distribution: Stockholm (568), Skåne (133), Västra Götaland (127), Östergötland (48), Värmland (38), and 15 other regions properly represented
- Implemented comprehensive city-to-region mapping covering major Swedish municipalities for future data integrity
- Enhanced individual company profile page styling with warm background, proper typography, and navigation improvements
- Added back button for better user navigation between company listings and individual profiles
- Streamlined contact information display with horizontal dividers and removed unnecessary opening hours section

### January 2025 - Critical Data Quality Improvements and Contact Information Overhaul
- **Fixed major data integrity issue**: Cleaned 1,033 dummy "info@example.se" addresses (96.7% of database) 
- **Proper data integrity approach**: Set 932 fake emails to NULL rather than creating misleading placeholder data
- **Email domain corrections**: Fixed 77 companies with mismatched email domains to use their actual website domains (e.g., AB Malmfältens changed from info@abmalmfltenssve.se to info@mssab.com)
- **Contact data verification**: Successfully updated 7 companies with authentic contact information through systematic web research
- **Database schema improvement**: Modified contact_email field to allow NULL values for honest missing data representation
- **Current contact coverage**: 138 companies with realistic emails, 137 with websites, 360 with phone numbers
- Updated 724 companies total with comprehensive descriptions, websites, phone numbers, and emails
- Latest batch: 25 final U-END companies (Veef Vent AB through Wärnströms Industri AB) with authentic bilingual descriptions
- Previous batch: 36 U-END companies (UCB Sweden AB through Westins Mekaniska AB) with authentic bilingual descriptions
- Previous batch: 5 U-END companies (Unoflow AB through Weldor AB) with authentic bilingual descriptions
- Previous batch: 97 PQR-companies (P Noords Mekaniska AB through Rörick El. Verkstad AB) with authentic bilingual descriptions
- Previous batch: 6 ST-companies (SH Maskin AB through Tooli Hydraulic Fixture Tools AB) with authentic bilingual descriptions
- Previous batch: 14 PQR-companies (PB Svets AB through Ronweld AB) with authentic bilingual descriptions
- Previous batch: 28 N-companies (NC JOUR AB through On Maskin AB) with authentic bilingual descriptions
- Previous batch: 17 N-O companies (NBM Hydraulic AB through Olssons Mekaniska i Halmstad AB) with authentic bilingual descriptions
- Previous batch: 77 L-M companies (LB Ohlsson Mekaniska AB through Mocano i Sverige AB) with authentic bilingual descriptions
- Previous batch: 17 L-M companies (Laxweld AB through Mikromekanik i Sörmland AB) with authentic bilingual descriptions
- Previous batch: 53 J-K companies (J S Smide AB through Kylare & hydraulmekanik AB) with authentic bilingual descriptions
- Previous batch: 22 H-I companies batch 2 (H. Borins Maskinservice AB through Hestra Truck & Maskin AB) with authentic bilingual descriptions
- Previous batch: 13 H-I companies (Husums Mekaniska AB through Itsab AB) with authentic bilingual descriptions
- Previous batch: 49 F-G companies (FA-Tec i Falkenberg AB through Götene Projekt & Konstruktion AB) with authentic bilingual descriptions
- Previous batches: 36 D-E companies (batch 2), 17 D-E companies (first batch), 43 C-companies, 96 U-END companies, 63 B-companies, 18 companies (Element Metech AB through FANUC Nordic AB), Constructor Sverige AB through DynaMate AB (11 companies), A-C companies (44 companies)
- Fixed "Filtrera Resultat" functionality - now shows correct company counts and filtering works properly
- Redesigned companies page layout removing sidebar filter in favor of clean 3-card grid under search bar
- Cleaned up company cards: removed "Sverige" references, category badges, and duplicate location text for cleaner layout
- Reverted broken English-Swedish translations: replaced hybrid text with consistent Swedish descriptions
- Prioritized authentic company data: removed 1,026 generic templates, restored 53 authentic English descriptions from company websites
- Fixed region classifications: eliminated "Övrigt" category by mapping all companies to correct Swedish regions (län)
- Diversified company categories: Svetsning (93), Automation (31), Hydraulik (18), CNC (12), Lyftutrustning (10)
- Enhanced typography with Inter Tight font family and refined letter spacing
- Updated button colors to #1f2937 (dark gray) with #374151 hover states
- Set warm off-white background (#fafaf1) across entire platform
- Refined heading hierarchy: H1-H3 bold (700), H4 medium (500) at 22px

### January 2025 - Modern Search UX Implementation  
- Replaced three-step filtering with single smart search bar
- Added intelligent suggestions for companies, regions, and categories
- Company suggestions navigate directly to profile pages for better UX
- Implemented tag-based filtering with removable chips for regions/categories only
- Added faceted search sidebar with live company counts
- Set A-Ö alphabetical ordering as default view
- Enhanced both homepage and companies page with new search components

## External Dependencies

### Core Technologies
- **@neondatabase/serverless**: Serverless PostgreSQL driver
- **drizzle-orm**: Type-safe ORM for database operations
- **@tanstack/react-query**: Server state management
- **wouter**: Lightweight React router
- **react-hook-form**: Form state management
- **zod**: Schema validation

### UI Components
- **@radix-ui/***: Unstyled, accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **lucide-react**: Icon library

### Development Tools
- **vite**: Fast build tool and dev server
- **typescript**: Type safety across the stack
- **drizzle-kit**: Database migration tool

## Deployment Strategy

The application is designed for deployment on platforms like Replit with:

- **Development**: `npm run dev` starts both frontend and backend in development mode
- **Production Build**: `npm run build` creates optimized client bundle and server bundle
- **Database Migrations**: `npm run db:push` applies schema changes to database
- **Environment Variables**: `DATABASE_URL` required for PostgreSQL connection

The backend serves the built React app in production while providing API endpoints under `/api/*` prefix. The Vite development server provides HMR in development with proxy to the Express backend.