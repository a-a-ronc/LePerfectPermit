# PainlessPermit™ - High-Piled Storage Permit Management System

## Overview

PainlessPermit™ is a comprehensive web application designed to streamline the high-piled storage permit acquisition process. The system connects permit specialists with stakeholders, facilitating document management, project tracking, and automated permit submission workflows. The application leverages AI-powered document generation and provides a user-friendly interface for managing complex permit requirements.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS with Radix UI components for consistent design
- **State Management**: TanStack Query for server state and React hooks for local state
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **Authentication**: Passport.js with local strategy and bcrypt for password hashing
- **Session Management**: Express sessions with PostgreSQL store
- **File Processing**: PDF generation with PDFKit and DOCX generation with docx library

### Database Layer
- **Database**: PostgreSQL (via Neon serverless)
- **ORM**: Drizzle ORM with type-safe queries
- **Schema**: Shared TypeScript schema between client and server
- **Migrations**: Drizzle Kit for database migrations

## Key Components

### Authentication & Authorization
- Role-based access control (specialists vs stakeholders)
- Secure session management with HTTP-only cookies
- Password hashing using bcrypt with 10 salt rounds
- Protected routes with authentication middleware

### Project Management
- Complete project lifecycle tracking (not_started → in_progress → ready_for_submission → under_review → approved/rejected)
- Document upload and categorization system
- Progress tracking based on required document completion
- Deadline management with urgency indicators

### Document Management
- Support for multiple file types (PDF, DOC, DOCX, XLS, XLSX, images)
- Base64 file storage with 50MB upload limit
- Document categorization (site plans, facility plans, egress plans, etc.)
- Version control and approval workflow

### AI Integration
- OpenAI API integration for automated cover letter generation
- Template-based fallback when AI is unavailable
- Intelligent document analysis and content generation
- Sanitization of AI-generated content to prevent placeholder issues

### External Integrations
- SendGrid for email notifications
- Neon Database for serverless PostgreSQL
- OpenAI API for document generation

## Data Flow

### User Authentication Flow
1. User submits credentials via login form
2. Passport.js validates against PostgreSQL user table
3. Session created and stored in database
4. Protected routes verify session on each request

### Document Upload Flow
1. File selected and validated on client
2. File converted to base64 encoding
3. Document metadata and content stored in PostgreSQL
4. Project progress automatically recalculated
5. Activity log entry created for audit trail

### Permit Submission Flow
1. System validates all required documents are present
2. AI generates cover letter based on project details
3. PDF compilation of all documents
4. Email notification sent to relevant parties
5. Project status updated to "under_review"

## External Dependencies

### Production Dependencies
- **Frontend**: React ecosystem, Radix UI components, TanStack Query
- **Backend**: Express.js, Passport.js, bcrypt, PDFKit, docx
- **Database**: Drizzle ORM, Neon serverless PostgreSQL
- **AI/ML**: OpenAI API for document generation
- **Email**: SendGrid for notification services

### Development Dependencies
- **Build Tools**: Vite, ESBuild, TypeScript compiler
- **Development**: tsx for TypeScript execution, Replit integration tools

## Deployment Strategy

### Replit Deployment
- **Environment**: Node.js 20 with PostgreSQL 16 module
- **Build Process**: Vite builds frontend, ESBuild bundles server
- **Runtime**: Production server serves static files and API endpoints
- **Database**: Neon PostgreSQL with connection pooling
- **Port Configuration**: Internal port 5000 mapped to external port 80

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: Optional AI integration
- `SENDGRID_API_KEY`: Email service integration
- `SESSION_SECRET`: Session encryption key

## Recent Changes

- June 19, 2025: Fixed vite configuration compatibility issue with tsx/esbuild
- June 19, 2025: Created vite-bypass.ts to resolve top-level await problems  
- June 19, 2025: Application successfully running on port 5000
- June 19, 2025: Restructured AI cover letter generation with dynamic numbering - only shows categories with submitted files, improved document alignment, removed strict approval requirements, cleaned filenames to remove copy quantities

## Changelog

Changelog:
- June 18, 2025. Initial setup
- June 19, 2025. Resolved startup configuration issues

## User Preferences

Preferred communication style: Simple, everyday language.