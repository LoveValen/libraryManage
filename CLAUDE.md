# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Backend (Node.js/Express)
```bash
cd backend
npm install                              # Install dependencies
npm run dev                              # Start development server with nodemon (port 3000)
npm start                                # Start production server
npm test                                 # Run Jest tests
npm test -- --testNamePattern="pattern"  # Run specific test by name pattern
npm run test:watch                       # Run tests in watch mode
npm run test:coverage                    # Run tests with coverage
npm run lint                             # Run ESLint
npm run lint:fix                         # Fix ESLint issues
npm run format                           # Format code with Prettier
```

### Database Commands (Prisma)
```bash
cd backend
npm run db:generate     # Generate Prisma client (after schema changes)
npm run db:push         # Push schema to database (development)
npm run db:migrate      # Run migrations (create and apply)
npm run db:studio       # Open Prisma Studio (database GUI on port 5555)
```

### Frontend (Vue.js 3)
```bash
cd admin-panel
npm install                        # Install dependencies
npm run dev                        # Start Vite dev server (port 8080)
npm run build                      # Build for production
npm run preview                    # Preview production build
npm run lint                       # Run ESLint
npm run format                     # Format code with Prettier
npm test                           # Run Vitest tests
npm test -- --run "pattern"        # Run specific test by name pattern
npm run test:ui                    # Run tests with UI
npm run test:coverage              # Run tests with coverage
```

### Docker Commands
```bash
docker-compose up -d mysql redis   # Start required services
docker-compose down                # Stop all services
docker-compose logs -f             # View logs
docker-compose ps                  # Check service status
docker-compose restart mysql       # Restart MySQL if connection issues
```

## High-Level Architecture

### Service Layer Pattern
The backend follows a strict service layer architecture:
- **Controllers** (`backend/src/controllers/`) - Handle HTTP requests/responses only
- **Services** (`backend/src/services/`) - Contains all business logic
- **Prisma Models** - Database access through Prisma ORM
- **Middlewares** (`backend/src/middlewares/`) - Cross-cutting concerns (auth, error handling, validation)

### Authentication & Authorization Flow
1. JWT tokens are issued on login with user role embedded
2. `auth.middleware.js` validates tokens and attaches user to request
3. Role-based access control in route definitions
4. Token expiration: 24h (configurable in .env)

### Real-time Communication Architecture
- Socket.IO server integrated with Express
- Notification service (`notification.service.js`) handles WebSocket events
- Client connections authenticated via JWT
- Room-based broadcasting for user-specific notifications

### Database Relationships
Key relationships managed by Prisma:
- Users ↔ Borrows (one-to-many)
- Books ↔ Borrows (one-to-many)
- Users ↔ Reviews (one-to-many)
- Books ↔ Reviews (one-to-many)
- Users ↔ Points/Transactions (one-to-many)
- Cascading deletes configured for data integrity

### Frontend State Management
- **Pinia Stores** (`admin-panel/src/stores/`)
  - `auth.js` - User authentication state, JWT management
  - `app.js` - Application-wide settings, routes, UI state
- Persistent state via `pinia-plugin-persistedstate`
- Composables for reusable logic (`admin-panel/src/composables/`)

### API Request Flow
1. Frontend uses Axios with request/response interceptors
2. Automatic JWT attachment via interceptors
3. Request ID generation for tracing (`x-request-id` header)
4. Unified error handling with toast notifications
5. API base URL: `http://localhost:3000/api/v1`

## Critical Configuration

### Environment Variables
Backend requires `.env` file with:
- `DATABASE_URL` - MySQL connection string (format: mysql://user:pass@host:port/db)
- `JWT_SECRET` - Must be set for auth to work
- `PORT` - Default 3000, change if port conflict
- `CORS_ORIGIN` - Frontend URL for CORS (default: http://localhost:*)

### Database Setup
- MySQL runs on port 3307 (not default 3306)
- Database name: `library_db`
- Auto-creates admin user on first run (admin/admin123)
- Schema changes require `npm run db:generate` then restart

### Frontend Routing
- Uses Vue Router with dynamic route generation based on user role
- Routes defined in `admin-panel/src/router/index.js`
- Protected routes check authentication in navigation guards
- 404 fallback must be last route

### Build & Deployment Notes
- Frontend build outputs to `admin-panel/dist/`
- Backend requires Node.js >= 16, Frontend requires >= 18
- Production: Set `NODE_ENV=production` and configure proper database
- API documentation auto-generated at `/api/docs`

## Port Management

### Default Ports
- Backend API: 3000
- Frontend Dev Server: 8080
- Prisma Studio: 5555
- MySQL: 3307
- Redis: 6379

### Port Conflict Resolution
Windows:
```bash
netstat -ano | findstr :PORT      # Find process using port
taskkill /PID <PID> /F           # Kill process (use PowerShell if Git Bash fails)
powershell -Command "Stop-Process -Id <PID> -Force"  # Alternative
```

Mac/Linux:
```bash
lsof -ti:PORT | xargs kill -9    # Kill process using port
```

## Common Troubleshooting

### Prisma Client Issues
If "Cannot find module '@prisma/client'" or column errors:
1. `cd backend && rm -rf node_modules/.prisma`
2. `npm run db:generate`
3. Restart backend server

### Database Connection Issues
1. Check Docker Desktop is running
2. Verify MySQL container: `docker ps`
3. Check connection string in `.env`
4. Port 3307 must be free

### Frontend API Connection Issues
1. Verify backend is running on correct port
2. Check CORS settings in backend `.env`
3. Clear browser cache/localStorage if auth issues
4. Check network tab for actual error responses

## Development Workflow

### Standard Development Flow
1. Start Docker services: `docker-compose up -d mysql redis`
2. Start backend: `cd backend && npm run dev`
3. Start frontend: `cd admin-panel && npm run dev`
4. Access at: http://localhost:8080
5. API docs at: http://localhost:3000/api/docs

### Making Schema Changes
1. Edit `backend/prisma/schema.prisma`
2. Run `npm run db:push` (development) or `npm run db:migrate` (production)
3. Run `npm run db:generate`
4. Restart backend server

### Testing API Endpoints
- Use API docs at `/api/docs` for interactive testing
- Most endpoints require Authorization header: `Bearer <JWT_TOKEN>`
- Get token from login response or browser localStorage