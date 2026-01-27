# Docker Setup Guide

This guide explains how to set up and run the Adaptive Learning LMS using Docker.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (20.10+)
- [Docker Compose](https://docs.docker.com/compose/install/) (2.0+)
- At least 4GB of available RAM

## Quick Start

### 1. Start the Development Environment

```bash
# Start MongoDB and API services
docker-compose up -d

# View logs
docker-compose logs -f api
```

The API will be available at: http://localhost:3001

### 2. Seed Demo Data

```bash
# Run the seed script to populate demo data
docker-compose --profile seed up seed

# Or run seeding manually
docker-compose exec api pnpm --filter @adaptive-lms/api run seed
```

### 3. Access Services

| Service | URL | Description |
|---------|-----|-------------|
| API | http://localhost:3001 | REST API server |
| Health Check | http://localhost:3001/health | API health status |
| MongoDB | localhost:27017 | Database |

## Demo Credentials

After seeding, you can use these accounts:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@example.com | Admin123! |
| Author | author@example.com | Author123! |
| Learner | learner1@example.com | Learner123! |
| Learner | learner2@example.com | Learner123! |
| Learner | learner3@example.com | Learner123! |

## Docker Compose Profiles

The setup includes several profiles for different use cases:

### Development (default)
```bash
docker-compose up -d
```
Starts MongoDB and API in development mode with hot reloading.

### With Database Tools
```bash
docker-compose --profile tools up -d
```
Adds Mongo Express UI at http://localhost:8081 (login: admin/admin123)

### With Seeding
```bash
docker-compose --profile seed up -d
```
Runs the database seeding script to populate demo data.

### Production
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```
Production-optimized configuration with Redis for caching.

## Environment Variables

### Development

The development setup uses default values. To customize, create a `.env` file:

```bash
# .env
MONGODB_URI=mongodb://admin:admin123@mongodb:27017/adaptive-lms?authSource=admin&replicaSet=rs0
JWT_SECRET=your-secret-key
OPENAI_API_KEY=sk-your-openai-key
```

### Production

Create a `.env.production` file with secure values:

```bash
# .env.production
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=<strong-password>
JWT_SECRET=<secure-random-string>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGINS=https://your-domain.com
OPENAI_API_KEY=sk-your-openai-key
```

Then run with:
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production up -d
```

## Common Commands

### Start Services
```bash
docker-compose up -d          # Start in background
docker-compose up             # Start in foreground (see logs)
```

### Stop Services
```bash
docker-compose down           # Stop and remove containers
docker-compose down -v        # Also remove volumes (WARNING: deletes data)
```

### View Logs
```bash
docker-compose logs -f        # All services
docker-compose logs -f api    # Only API
docker-compose logs -f mongodb # Only MongoDB
```

### Rebuild Images
```bash
docker-compose build          # Rebuild all
docker-compose build api      # Rebuild API only
docker-compose up -d --build  # Rebuild and start
```

### Execute Commands in Containers
```bash
# Run commands in API container
docker-compose exec api pnpm --filter @adaptive-lms/api run seed

# Access MongoDB shell
docker-compose exec mongodb mongosh -u admin -p admin123
```

### Clean Up
```bash
# Remove containers and networks
docker-compose down

# Remove containers, networks, and volumes
docker-compose down -v

# Remove all unused Docker resources
docker system prune -a
```

## Services Architecture

```
                    ┌─────────────────┐
                    │   Client App    │
                    │  (port 3000)    │
                    └────────┬────────┘
                             │
                             ▼
┌────────────────────────────────────────────────┐
│              Docker Network                     │
│                                                │
│   ┌─────────────┐     ┌─────────────┐         │
│   │    API      │────▶│   MongoDB   │         │
│   │ (port 3001) │     │ (port 27017)│         │
│   └─────────────┘     └─────────────┘         │
│          │                    │                │
│          │            ┌───────┘                │
│          ▼            ▼                        │
│   ┌─────────────┐ ┌─────────────┐             │
│   │   Redis     │ │Mongo Express│             │
│   │ (port 6379) │ │ (port 8081) │             │
│   └─────────────┘ └─────────────┘             │
│   (production)      (tools)                    │
└────────────────────────────────────────────────┘
```

## Troubleshooting

### MongoDB Replica Set Issues

If you see "NotYetInitialized" errors:

```bash
# Remove the mongodb container and volume
docker-compose down
docker volume rm adaptive-learning-lms_mongodb_data

# Restart
docker-compose up -d
```

### Port Already in Use

```bash
# Check what's using the port
netstat -ano | findstr :3001   # Windows
lsof -i :3001                  # Linux/Mac

# Change the port in docker-compose.yml or use:
PORT=3002 docker-compose up -d
```

### Container Won't Start

```bash
# Check container logs
docker-compose logs api

# Check container status
docker-compose ps

# Rebuild the image
docker-compose build --no-cache api
```

### Database Connection Issues

```bash
# Check if MongoDB is running
docker-compose ps mongodb

# Check MongoDB logs
docker-compose logs mongodb

# Test connection from API container
docker-compose exec api node -e "
  const mongoose = require('mongoose');
  mongoose.connect('mongodb://admin:admin123@mongodb:27017/adaptive-lms?authSource=admin')
    .then(() => console.log('Connected!'))
    .catch(err => console.error(err));
"
```

## Volume Management

### Data Persistence

MongoDB data is stored in a Docker volume (`mongodb_data`). This persists between container restarts.

### Backup Data

```bash
# Backup MongoDB
docker-compose exec mongodb mongodump --uri="mongodb://admin:admin123@localhost:27017/adaptive-lms?authSource=admin" --out=/data/backup

# Copy backup to host
docker cp adaptive-lms-mongodb:/data/backup ./backup
```

### Restore Data

```bash
# Copy backup to container
docker cp ./backup adaptive-lms-mongodb:/data/backup

# Restore MongoDB
docker-compose exec mongodb mongorestore --uri="mongodb://admin:admin123@localhost:27017/adaptive-lms?authSource=admin" /data/backup
```

## Health Checks

The API includes health check endpoints:

- `GET /health` - Basic health check
- `GET /health/live` - Liveness probe (for Kubernetes)
- `GET /health/ready` - Readiness probe (for Kubernetes)
- `GET /health/detailed` - Detailed health with metrics
- `GET /health/metrics` - Prometheus-format metrics

## Production Deployment

For production deployment:

1. Use the production compose file
2. Set strong passwords for all services
3. Configure proper CORS origins
4. Set up SSL/TLS termination (nginx, Traefik, etc.)
5. Configure backup strategies
6. Set up monitoring and alerting

See `docker-compose.prod.yml` for production-specific configurations.
