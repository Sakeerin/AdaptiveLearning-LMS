# Adaptive Learning LMS

Production-ready bilingual (TH/EN) adaptive learning platform with web + mobile apps.

## Tech Stack

- **Frontend Web**: Next.js 14 + TypeScript
- **Mobile**: React Native + Expo
- **Backend**: Express + TypeScript
- **Database**: MongoDB Atlas + Realm (offline sync)
- **AI**: OpenAI GPT-4
- **Monorepo**: Turborepo + pnpm

## Key Features

- ✅ xAPI Learning Record Store (LRS) from MVP
- ✅ Content-only AI Tutor with citations
- ✅ Adaptive learning engine (deterministic + explainable)
- ✅ Full offline learning support (mobile)
- ✅ Bilingual (Thai/English) throughout
- ✅ Gamification with anti-cheat
- ✅ Real-time mastery tracking

## Project Structure

```
adaptive-learning-lms/
├── packages/
│   ├── api/          # Express backend
│   ├── web/          # Next.js web app
│   ├── mobile/       # React Native mobile app
│   └── shared/       # Shared types, utils, xAPI models
├── docs/             # Documentation (SRS, ARCH, etc.)
├── .github/          # CI/CD workflows
└── docker-compose.yml
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Docker & Docker Compose

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env

# Start development environment
pnpm dev
```

### Development Commands

```bash
# Run all packages in dev mode
pnpm dev

# Build all packages
pnpm build

# Run tests
pnpm test

# Type checking
pnpm type-check

# Format code
pnpm format
```

## Timeline

**Production-ready in 12-16 weeks**

- Weeks 1-3: Foundation (monorepo, auth, xAPI LRS)
- Weeks 4-6: Content & learning structure
- Weeks 7-8: Adaptive engine
- Weeks 9-10: AI Tutor
- Week 11: Gamification
- Week 12: Mobile offline support
- Week 13: Notifications & analytics
- Weeks 14-16: Production hardening

## Documentation

See the [docs](./docs) directory for detailed specifications:

- [SRS.md](./docs/SRS.md) - System Requirements Specification
- [ARCH.md](./docs/ARCH.md) - Architecture Overview
- [XAPI_SPEC.md](./docs/XAPI_SPEC.md) - xAPI Implementation Guide
- [DATA_MODEL.md](./docs/DATA_MODEL.md) - Database Schema
- [API.md](./docs/API.md) - API Reference

## License

Proprietary
