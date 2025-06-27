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

- June 19, 2025: Fixed critical database connection issues with Neon PostgreSQL
- June 19, 2025: Resolved "cannot insert multiple commands into a prepared statement" errors
- June 19, 2025: Updated database configuration with proper connection pooling and error handling
- June 19, 2025: Fixed session store configuration to prevent SQL multi-statement conflicts
- June 19, 2025: Application now running stable on port 5000 without database errors
- June 19, 2025: Fixed vite configuration compatibility issue with tsx/esbuild
- June 19, 2025: Created vite-bypass.ts to resolve top-level await problems
- June 19, 2025: Restructured AI cover letter generation with dynamic numbering - only shows categories with submitted files, improved document alignment, removed strict approval requirements, cleaned filenames to remove copy quantities, added editable project fields in cover letter popup, enhanced popup with localStorage persistence, latest file display, improved sizing and filename styling
- June 19, 2025: Fixed critical formatting issues - removed copy quantity text from filenames, corrected Special Inspection section alignment to left, enforced 10pt font for all filenames
- June 19, 2025: Final formatting corrections - ensured all filenames use 10pt Times New Roman with consistent left alignment and proper indentation, normalized styling across all document categories
- June 19, 2025: Critical alignment fix - removed &nbsp; entities, unified Special Inspection formatting with 0.125in left margin, enforced consistent 10pt Times New Roman across all filename entries
- June 19, 2025: Consolidated filename handling - created single helper function to ensure ALL filenames (including Special Inspection) use identical 10pt Times New Roman formatting with consistent 0.125in left alignment
- June 19, 2025: Enhanced document upload dialog with dynamic resizing - popup window now automatically adjusts width based on filename length to prevent text overflow, improved filename display with break-all instead of truncate
- June 19, 2025: Redesigned Submit to Authority workflow - button now always enabled and opens Outlook with pre-drafted email using project details for subject and body
- June 19, 2025: Added Export button that appears after AI cover letter generation - creates organized document package with directory picker for organized file saving, falls back to manifest download when modern APIs unavailable
- June 19, 2025: Fixed zip file creation issues in Replit environment - now uses directory picker to save organized files or provides manifest with download instructions
- June 20, 2025: Implemented file picker dialogs for all downloads - users can now choose filename and save location for individual files and export packages, with proper progress indicators and success notifications
- June 20, 2025: Updated Submit to Authority email to dynamically extract city name from project location for personalized greeting (e.g., "Dear West Valley City Building Department")
- June 20, 2025: Implemented proper ZIP file creation using JSZip library with file picker dialogs for export functionality
- June 20, 2025: Fixed email personalization to use dynamic jurisdiction from project data instead of hardcoded text
- June 20, 2025: Enhanced file download dialogs with proper filename selection and download notifications
- June 20, 2025: Improved file picker implementation with iframe detection and browser compatibility guidance
- June 20, 2025: Added comprehensive fallback dialog system with user education about file system limitations
- June 23, 2025: Implemented comprehensive stakeholder management system with multiple roles, document category assignments, task management, and notification system
- June 23, 2025: Added forgot password functionality with email-based password reset flow using SendGrid integration
- June 23, 2025: Implemented project deletion functionality with proper permission controls - specialists and project creators can delete projects with cascade delete for all related data
- June 23, 2025: Fixed project deletion SQL syntax errors by switching from raw SQL queries to Drizzle ORM for proper Neon database compatibility
- June 24, 2025: Fixed XSS vulnerability in zip-creator-native.ts by replacing unsafe innerHTML with safe DOM manipulation using textContent
- June 24, 2025: Fixed "New Project" button 404 error - identified shadcn Button component issue, replaced with native HTML button element that successfully opens project creation dialog
- June 24, 2025: Fixed missing useToast import in document-view-dialog component to resolve console errors during document viewing
- June 24, 2025: Fixed review dialog button container layout - expanded container and made buttons responsive to prevent overflow and ensure all three action buttons (Keep in Review, Reject, Approve) are properly visible
- June 24, 2025: Increased review dialog width from max-w-5xl to max-w-6xl and simplified button layout to ensure all three action buttons display fully without truncation
- June 25, 2025: Implemented comprehensive stakeholder task assignment system with searchable dropdown, email notifications (when SENDGRID_API_KEY available), and in-app notification bell with real-time updates
- June 26, 2025: Fixed critical document upload issues - reduced file size limits to 1MB to prevent ERR_INSUFFICIENT_RESOURCES errors, fixed version numbering to start at v1 for new files (only increments for same filename), removed looping page reload, enhanced error handling for memory limits
- June 26, 2025: Increased file upload capacity from 1MB to 10GB - updated server body parser limits, request timeouts (30 minutes), route validation, and client-side file upload components to handle large files up to 10GB
- June 26, 2025: Fixed critical document upload loop issue - reduced realistic file size limits to 50MB to prevent database "response too large" errors, eliminated infinite upload retries by fixing error handling in file upload component, updated server body parser to 100MB with 5-minute timeouts for database compatibility
- June 26, 2025: Fixed stakeholder task assignment system - resolved missing schema imports, implemented proper stakeholder notification creation, added email notifications with SendGrid integration, enhanced error handling, and ensured notifications appear on user dashboard with email matching to login credentials
- June 26, 2025: Implemented comprehensive navigation system - created working stakeholders page with detailed user information and search functionality, settings page with profile and password management, reviews page for document approval workflow, and reports page with analytics and project metrics, fixed all sidebar navigation links to provide complete application functionality

## Changelog

Changelog:
- June 18, 2025. Initial setup
- June 19, 2025. Resolved startup configuration issues

## User Preferences

Preferred communication style: Simple, everyday language.