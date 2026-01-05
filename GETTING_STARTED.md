# Getting Started with Adaptive Learning LMS

This guide will help you set up your development environment and start building the Adaptive Learning LMS.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 18.0.0 ([Download](https://nodejs.org/))
- **pnpm** >= 8.0.0 (Install: `npm install -g pnpm`)
- **Docker** and **Docker Compose** ([Download](https://www.docker.com/))
- **Git** ([Download](https://git-scm.com/))

## Initial Setup

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd Adaptive-Learning-LMS
```

### 2. Install Dependencies

```bash
pnpm install
```

This will install all dependencies for all packages in the monorepo.

### 3. Environment Configuration

Copy the example environment file and configure it:

```bash
cp packages/api/.env.example packages/api/.env
```

Edit `packages/api/.env` with your configuration:

```env
# Required for Week 1
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb://admin:admin123@localhost:27017/adaptive-lms?authSource=admin
MONGODB_REPLICA_SET=rs0

# Required for Week 9 (AI Tutor)
OPENAI_API_KEY=your-openai-api-key-here
```

### 4. Start Development Environment

#### Option A: Using Docker Compose (Recommended)

```bash
docker-compose up -d
```

This will start:
- MongoDB with replica set (port 27017)
- API server (port 3001)
- Web app (port 3000)

#### Option B: Manual Start

**Terminal 1 - MongoDB:**
```bash
docker-compose up mongodb mongo-init
```

**Terminal 2 - API Server:**
```bash
cd packages/api
pnpm dev
```

**Terminal 3 - Web App (when implemented):**
```bash
cd packages/web
pnpm dev
```

### 5. Verify Installation

Check that services are running:

```bash
# API health check
curl http://localhost:3001/health

# MongoDB check
docker exec -it adaptive-lms-mongodb mongosh --eval "db.runCommand({ ping: 1 })"
```

## Project Structure

```
adaptive-learning-lms/
├── packages/
│   ├── shared/          # Shared types, constants, utilities
│   │   ├── src/
│   │   │   ├── types/   # TypeScript types (user, course, xAPI, mastery, etc.)
│   │   │   ├── utils/   # Shared utilities (mastery calculator)
│   │   │   └── constants/ # xAPI verbs, extensions
│   │   └── package.json
│   │
│   ├── api/             # Express backend
│   │   ├── src/
│   │   │   ├── config/  # Database, env configuration
│   │   │   ├── routes/  # API endpoints (auth, xapi, courses, etc.)
│   │   │   ├── models/  # MongoDB models (TODO: Week 2+)
│   │   │   ├── services/ # Business logic (TODO: Week 3+)
│   │   │   ├── middleware/ # Auth, error handling
│   │   │   └── utils/   # Logger, helpers
│   │   └── package.json
│   │
│   ├── web/             # Next.js web app (TODO: Week 1)
│   └── mobile/          # React Native app (TODO: Week 1)
│
├── docs/                # Documentation (SRS, ARCH, etc.)
├── scripts/             # Utility scripts (mongo-init, etc.)
├── .github/workflows/   # CI/CD pipelines
├── docker-compose.yml
├── turbo.json           # Turborepo configuration
└── pnpm-workspace.yaml  # pnpm workspace configuration
```

## Development Workflow

### Running the Full Stack

```bash
# Start all services
pnpm dev

# Or with Docker Compose
docker-compose up
```

### Building

```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter @adaptive-lms/api build
pnpm --filter @adaptive-lms/shared build
```

### Type Checking

```bash
# Check all packages
pnpm type-check

# Check specific package
pnpm --filter @adaptive-lms/api type-check
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @adaptive-lms/api test
```

### Code Formatting

```bash
# Format all code
pnpm format
```

## Next Steps by Week

### Week 1 (Current) ✅
- [x] Monorepo structure with Turborepo + pnpm
- [x] Shared types package with all core types
- [x] Express API server skeleton
- [x] Docker Compose with MongoDB replica set
- [x] CI/CD pipeline skeleton
- [ ] Next.js web application (in progress)
- [ ] React Native mobile application (in progress)
- [ ] Complete documentation (SRS, ARCH, etc.)

### Week 2 (Next)
- [ ] Authentication system (email + OTP, OAuth)
- [ ] User profile management (bilingual)
- [ ] Device session tracking
- [ ] JWT token implementation

### Week 3 (CRITICAL - xAPI LRS)
- [ ] xAPI statement storage (POST /xapi/statements)
- [ ] xAPI statement querying (GET /xapi/statements)
- [ ] Statement validation against xAPI 1.0.3 spec
- [ ] Idempotency and deduplication
- [ ] Mobile offline xAPI queue

### Week 4-16
See [Implementation Plan](C:\Users\SakeerinKhami\.claude\plans\tranquil-percolating-hedgehog.md) for detailed breakdown.

## Available Scripts

```bash
# Root level
pnpm dev          # Run all packages in dev mode
pnpm build        # Build all packages
pnpm test         # Run all tests
pnpm type-check   # Type check all packages
pnpm lint         # Lint all packages
pnpm format       # Format code with Prettier
pnpm clean        # Clean all build artifacts

# Package-specific (using --filter)
pnpm --filter @adaptive-lms/api dev
pnpm --filter @adaptive-lms/shared build
pnpm --filter @adaptive-lms/web test
```

## Troubleshooting

### MongoDB Replica Set Issues

If MongoDB replica set fails to initialize:

```bash
# Stop and remove containers
docker-compose down -v

# Restart
docker-compose up mongodb mongo-init
```

### Port Conflicts

If ports are already in use:

1. Change ports in `docker-compose.yml`
2. Update corresponding `.env` files

### Type Errors

If you see type errors after installing dependencies:

```bash
# Rebuild shared package
pnpm --filter @adaptive-lms/shared build

# Then rebuild dependent packages
pnpm build
```

## Additional Resources

- [Implementation Plan](C:\Users\SakeerinKhami\.claude\plans\tranquil-percolating-hedgehog.md)
- [Turborepo Documentation](https://turbo.build/repo/docs)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [xAPI Specification 1.0.3](https://github.com/adlnet/xAPI-Spec)
- [MongoDB Replica Sets](https://docs.mongodb.com/manual/replication/)

## Need Help?

- Check the [docs](./docs) directory for detailed specifications
- Review the [implementation plan](C:\Users\SakeerinKhami\.claude\plans\tranquil-percolating-hedgehog.md)
- See TODO comments in code for upcoming features

---

**Ready to start Week 2?** Check the implementation plan for the authentication system requirements!
