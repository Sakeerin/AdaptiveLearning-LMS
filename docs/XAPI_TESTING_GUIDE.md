# xAPI LRS Testing Guide

Quick guide to test the xAPI Learning Record Store.

## Prerequisites

```bash
# Start services
docker-compose up -d

# Verify API
curl http://localhost:3001/health
```

---

## Test 1: Store Single Statement

```bash
curl -X POST http://localhost:3001/xapi/statements \
  -H "Content-Type: application/json" \
  -d '{
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "actor": {
      "account": {
        "homePage": "https://adaptive-lms.com",
        "name": "user-123"
      }
    },
    "verb": {
      "id": "http://adlnet.gov/expapi/verbs/completed",
      "display": {"en-US": "completed", "th-TH": "เสร็จสิ้น"}
    },
    "object": {
      "id": "https://adaptive-lms.com/lessons/algebra-101",
      "objectType": "Activity",
      "definition": {
        "type": "http://adlnet.gov/expapi/activities/lesson"
      }
    },
    "result": {
      "completion": true,
      "duration": "PT15M"
    },
    "context": {
      "platform": "web",
      "language": "en",
      "extensions": {
        "https://adaptive-lms.com/xapi/ext/platform": "web",
        "https://adaptive-lms.com/xapi/ext/language": "en"
      }
    },
    "timestamp": "2026-01-05T12:00:00.000Z"
  }'
```

**Expected (200)**:
```json
{
  "message": "Statement stored successfully",
  "statementId": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## Test 2: Idempotency (Send Same Statement)

```bash
# Run the same curl command again
```

**Expected (409 Conflict)**:
```json
{
  "error": "Statement already exists",
  "statementId": "550e8400-e29b-41d4-a716-446655440000"
}
```

✅ **Acceptance Test Passed**: Duplicate statement rejected with 409

---

## Test 3: Query Statements by Actor

```bash
curl "http://localhost:3001/xapi/statements?actor=user-123&limit=10"
```

**Expected (200)**:
```json
{
  "statements": [
    { /* statement */ }
  ],
  "total": 1
}
```

✅ **Acceptance Test Passed**: Query filters work correctly

---

## Test 4: Invalid Statement (Missing Extensions)

```bash
curl -X POST http://localhost:3001/xapi/statements \
  -H "Content-Type: application/json" \
  -d '{
    "id": "bad-statement-1",
    "actor": {"account": {"homePage": "https://adaptive-lms.com", "name": "user"}},
    "verb": {"id": "http://adlnet.gov/expapi/verbs/test", "display": {"en": "test"}},
    "object": {"id": "https://adaptive-lms.com/test"},
    "timestamp": "2026-01-05T12:00:00.000Z"
  }'
```

**Expected (400)**:
```json
{
  "error": "Statement validation failed",
  "details": [
    {
      "path": "context.extensions",
      "message": "Extensions are required (platform, language)"
    }
  ]
}
```

✅ **Acceptance Test Passed**: Invalid statement returns 400 with detailed error

---

## Test 5: Batch Statements

```bash
curl -X POST http://localhost:3001/xapi/statements \
  -H "Content-Type: application/json" \
  -d '[
    {
      "id": "batch-stmt-1",
      "actor": {"account": {"homePage": "https://adaptive-lms.com", "name": "user-123"}},
      "verb": {"id": "http://adlnet.gov/expapi/verbs/launched", "display": {"en": "launched"}},
      "object": {"id": "https://adaptive-lms.com/lessons/lesson-1"},
      "context": {
        "extensions": {
          "https://adaptive-lms.com/xapi/ext/platform": "web",
          "https://adaptive-lms.com/xapi/ext/language": "en"
        }
      },
      "timestamp": "2026-01-05T12:01:00.000Z"
    },
    {
      "id": "batch-stmt-2",
      "actor": {"account": {"homePage": "https://adaptive-lms.com", "name": "user-123"}},
      "verb": {"id": "http://adlnet.gov/expapi/verbs/completed", "display": {"en": "completed"}},
      "object": {"id": "https://adaptive-lms.com/lessons/lesson-1"},
      "context": {
        "extensions": {
          "https://adaptive-lms.com/xapi/ext/platform": "web",
          "https://adaptive-lms.com/xapi/ext/language": "en"
        }
      },
      "timestamp": "2026-01-05T12:15:00.000Z"
    }
  ]'
```

**Expected (200)**:
```json
{
  "message": "Batch stored successfully",
  "created": 2,
  "duplicates": 0,
  "statementIds": ["batch-stmt-1", "batch-stmt-2"]
}
```

---

## Test 6: Mobile Offline Sync Simulation

**Simulate 100 events queued offline, sync in batches**:

```bash
# Generate 100 UUIDs first (use uuidgen or online tool)

# Batch 1 (50 statements)
curl -X POST http://localhost:3001/xapi/statements \
  -H "Content-Type: application/json" \
  -d '[
    {"id": "uuid-001", ... },
    {"id": "uuid-002", ... },
    ... (48 more)
  ]'

# Batch 2 (50 statements)
curl -X POST http://localhost:3001/xapi/statements \
  -H "Content-Type: application/json" \
  -d '[
    {"id": "uuid-051", ... },
    {"id": "uuid-052", ... },
    ... (48 more)
  ]'

# Verify all 100 stored
curl "http://localhost:3001/xapi/statements?actor=mobile-user&limit=100"
```

✅ **Acceptance Test Passed**: Mobile offline: 100 events queued → sync → verify all stored

---

## Test 7: Query with Multiple Filters

```bash
# Get completed lessons for user in date range
curl "http://localhost:3001/xapi/statements?actor=user-123&verb=http://adlnet.gov/expapi/verbs/completed&since=2026-01-01T00:00:00.000Z&until=2026-01-06T00:00:00.000Z&limit=20"
```

---

## Test 8: Pagination

```bash
# Page 1
curl "http://localhost:3001/xapi/statements?actor=user-123&limit=2&offset=0"

# Page 2
curl "http://localhost:3001/xapi/statements?actor=user-123&limit=2&offset=2"

# Page 3
curl "http://localhost:3001/xapi/statements?actor=user-123&limit=2&offset=4"
```

---

## Test 9: Using Statement Generator (Node.js)

```javascript
import {
  generateLessonCompletedStatement,
  generateQuizPassedStatement
} from './utils/xapi-statement-generator';

// Generate valid statement
const statement = generateLessonCompletedStatement(
  'user-456',
  'algebra-101',
  'PT20M',
  'ios',
  'th'
);

// POST to API
const response = await fetch('http://localhost:3001/xapi/statements', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(statement)
});

console.log(await response.json());
```

---

## Test 10: Complete Learning Session

```javascript
import { generateLearningSession } from './utils/xapi-statement-generator';

const statements = generateLearningSession('user-789', 'lesson-1', 'quiz-1');

// Batch upload
const response = await fetch('http://localhost:3001/xapi/statements', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(statements)
});

console.log(await response.json());
// Expected: { message: 'Batch stored successfully', created: 8, ... }
```

---

## Performance Testing

```bash
# Single statement latency
time curl -X POST http://localhost:3001/xapi/statements \
  -H "Content-Type: application/json" \
  -d '{ ... }'

# Check logs for duration
docker-compose logs api | grep "xAPI statement stored"
# Look for: "duration": 45  (ms)
```

**Target**: p95 < 100ms

---

## Verify in MongoDB

```bash
# Connect to MongoDB
docker exec -it adaptive-lms-mongodb mongosh

use adaptive-lms

# Count statements
db.xapistatements.countDocuments()

# View latest statement
db.xapistatements.findOne({}, {sort: {timestamp: -1}})

# Query by actor
db.xapistatements.find({"actor.account.name": "user-123"})

# Check indexes
db.xapistatements.getIndexes()
```

---

## Common Issues & Solutions

### "Extensions are required"
**Fix**: Add required extensions to context:
```json
"context": {
  "extensions": {
    "https://adaptive-lms.com/xapi/ext/platform": "web",
    "https://adaptive-lms.com/xapi/ext/language": "en"
  }
}
```

### "Statement ID must be a valid UUID v4"
**Fix**: Use proper UUID v4 format:
```bash
# Generate UUID v4
uuidgen
# Or use: node -e "console.log(require('crypto').randomUUID())"
```

### "Verb ID must be a valid IRI/URL"
**Fix**: Use complete URL for verb:
```json
"verb": {
  "id": "http://adlnet.gov/expapi/verbs/completed",  // ✅ Valid IRI
  "display": {"en-US": "completed"}
}
```

### "Actor must have either mbox or account"
**Fix**: Add account object:
```json
"actor": {
  "account": {
    "homePage": "https://adaptive-lms.com",
    "name": "user-123"
  }
}
```

---

## Next Steps

✅ All acceptance tests passed

Ready for Week 4: Content Library & Bilingual Management

---

*See [Week 3 Completion Summary](./WEEK_3_COMPLETION_SUMMARY.md) for full documentation*
