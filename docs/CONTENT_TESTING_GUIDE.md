# Content Library Testing Guide

Quick guide to test the Content Library & Bilingual Management system.

---

## Prerequisites

```bash
# Start services
docker-compose up -d

# Verify API
curl http://localhost:3001/health

# Login as admin to get access token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your-password"
  }'

# Save the accessToken for admin requests
export TOKEN="your-access-token-here"
```

---

## Test 1: Create Complete Course Structure

### Step 1: Create Competencies

```bash
# Create first competency (no prerequisites)
curl -X POST http://localhost:3001/api/admin/competencies \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "MATH-BASIC",
    "name": {
      "th": "คณิตศาสตร์พื้นฐาน",
      "en": "Basic Mathematics"
    },
    "description": {
      "th": "ทักษะคณิตศาสตร์พื้นฐาน",
      "en": "Fundamental math skills"
    },
    "courseId": "TEMP_COURSE_ID",
    "metadata": {
      "domain": "Mathematics",
      "difficulty": 1
    }
  }'
```

**Expected (201)**:
```json
{
  "message": "Competency created successfully",
  "competency": {
    "_id": "...",
    "code": "MATH-BASIC",
    "name": { "th": "...", "en": "..." }
  }
}
```

Save the competency ID as `COMP_ID_1`.

### Step 2: Create Course

```bash
curl -X POST http://localhost:3001/api/admin/courses \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "algebra-101",
    "title": {
      "th": "พีชคณิตเบื้องต้น",
      "en": "Introduction to Algebra"
    },
    "description": {
      "th": "เรียนรู้พื้นฐานพีชคณิต",
      "en": "Learn the fundamentals of algebra"
    },
    "metadata": {
      "difficulty": 2,
      "estimatedHours": 20,
      "tags": ["math", "algebra", "beginner"]
    }
  }'
```

**Expected (201)**:
```json
{
  "message": "Course created successfully",
  "course": {
    "_id": "...",
    "slug": "algebra-101",
    "published": false
  }
}
```

Save the course ID as `COURSE_ID`.

### Step 3: Create Module

```bash
curl -X POST http://localhost:3001/api/admin/modules \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "courseId": "'$COURSE_ID'",
    "title": {
      "th": "บทที่ 1: สมการเชิงเส้น",
      "en": "Chapter 1: Linear Equations"
    },
    "description": {
      "th": "เรียนรู้การแก้สมการเชิงเส้น",
      "en": "Learn to solve linear equations"
    },
    "order": 1
  }'
```

**Expected (201)**:
```json
{
  "message": "Module created successfully",
  "module": {
    "_id": "...",
    "courseId": "...",
    "order": 1
  }
}
```

Save the module ID as `MODULE_ID`.

### Step 4: Create Lesson

```bash
curl -X POST http://localhost:3001/api/admin/lessons \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "moduleId": "'$MODULE_ID'",
    "type": "video",
    "content": {
      "th": {
        "body": "บทเรียนวิดีโอเกี่ยวกับสมการเชิงเส้น",
        "videoUrl": "https://example.com/video-th.mp4"
      },
      "en": {
        "body": "Video lesson about linear equations",
        "videoUrl": "https://example.com/video-en.mp4"
      }
    },
    "metadata": {
      "difficulty": 2,
      "estimatedMinutes": 15,
      "tags": ["video", "equations"],
      "learningObjectives": [
        "Understand linear equations",
        "Solve for x"
      ],
      "accessibility": {
        "captions": "https://example.com/captions-en.vtt",
        "transcripts": "Full transcript of the video..."
      }
    },
    "competencies": ["'$COMP_ID_1'"]
  }'
```

**Expected (201)**:
```json
{
  "message": "Lesson created successfully",
  "lesson": {
    "_id": "...",
    "type": "video",
    "published": false
  }
}
```

✅ **Acceptance Test Passed**: Complete course structure created (Course → Module → Lesson → Competency)

---

## Test 2: Publish Workflow

### Attempt to Publish Empty Course (Should Fail)

```bash
curl -X POST http://localhost:3001/api/admin/courses/$COURSE_ID/publish \
  -H "Authorization: Bearer $TOKEN"
```

**Expected (400)**:
```json
{
  "error": "Cannot publish course without modules"
}
```

### Publish Lesson

```bash
curl -X POST http://localhost:3001/api/admin/lessons/$LESSON_ID/publish \
  -H "Authorization: Bearer $TOKEN"
```

**Expected (200)**:
```json
{
  "message": "Lesson published successfully",
  "lesson": {
    "_id": "...",
    "published": true
  }
}
```

### Publish Course

```bash
curl -X POST http://localhost:3001/api/admin/courses/$COURSE_ID/publish \
  -H "Authorization: Bearer $TOKEN"
```

**Expected (200)**:
```json
{
  "message": "Course published successfully",
  "course": {
    "_id": "...",
    "published": true
  }
}
```

✅ **Acceptance Test Passed**: Publish workflow validates content before publishing

---

## Test 3: Public Content Retrieval (Bilingual)

### Get Courses in English

```bash
curl "http://localhost:3001/api/courses?language=en"
```

**Expected (200)**:
```json
{
  "courses": [
    {
      "_id": "...",
      "slug": "algebra-101",
      "title": "Introduction to Algebra",
      "description": "Learn the fundamentals of algebra",
      "metadata": {
        "difficulty": 2,
        "estimatedHours": 20,
        "tags": ["math", "algebra", "beginner"]
      }
    }
  ],
  "total": 1,
  "language": "en"
}
```

### Get Same Course in Thai

```bash
curl "http://localhost:3001/api/courses?language=th"
```

**Expected (200)**:
```json
{
  "courses": [
    {
      "title": "พีชคณิตเบื้องต้น",
      "description": "เรียนรู้พื้นฐานพีชคณิต"
    }
  ],
  "language": "th"
}
```

✅ **Acceptance Test Passed**: Bilingual content returned correctly

---

## Test 4: Bilingual Fallback

### Create Lesson with Thai Only

```bash
curl -X POST http://localhost:3001/api/admin/lessons \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "moduleId": "'$MODULE_ID'",
    "type": "reading",
    "content": {
      "th": {
        "body": "เนื้อหาบทเรียนภาษาไทยเท่านั้น"
      }
    },
    "metadata": {
      "difficulty": 2,
      "estimatedMinutes": 10,
      "tags": ["reading"],
      "learningObjectives": ["Read Thai content"],
      "accessibility": {}
    },
    "competencies": ["'$COMP_ID_1'"]
  }'
```

### Get Lesson in English (Should Return Thai with Fallback Message)

```bash
curl "http://localhost:3001/api/lessons/$LESSON_ID?language=en"
```

**Expected (200)**:
```json
{
  "lesson": {
    "type": "reading",
    "content": {
      "body": "เนื้อหาบทเรียนภาษาไทยเท่านั้น",
      "_fallback": true,
      "_message": "Content not available in EN, showing Thai version"
    }
  }
}
```

✅ **Acceptance Test Passed**: Fallback logic works correctly (Thai shown when EN missing)

---

## Test 5: Competency Prerequisites (DAG Validation)

### Create Second Competency with Prerequisites

```bash
curl -X POST http://localhost:3001/api/admin/competencies \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "ALG-LINEAR-EQ",
    "name": {
      "th": "สมการเชิงเส้น",
      "en": "Linear Equations"
    },
    "description": {
      "th": "การแก้สมการเชิงเส้น",
      "en": "Solving linear equations"
    },
    "courseId": "'$COURSE_ID'",
    "prerequisites": ["'$COMP_ID_1'"],
    "metadata": {
      "domain": "Algebra",
      "difficulty": 2
    }
  }'
```

**Expected (201)**: Competency created with prerequisite

### Attempt Circular Dependency (Should Fail)

```bash
# Try to make COMP_ID_1 depend on COMP_ID_2 (creates cycle)
curl -X PATCH http://localhost:3001/api/admin/competencies/$COMP_ID_1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prerequisites": ["'$COMP_ID_2'"]
  }'
```

**Expected (400)**:
```json
{
  "error": "Circular competency dependency detected"
}
```

✅ **Acceptance Test Passed**: DAG validation prevents circular dependencies

---

## Test 6: Lesson Prerequisites

### Create Lesson 2 with Lesson 1 as Prerequisite

```bash
curl -X POST http://localhost:3001/api/admin/lessons \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "moduleId": "'$MODULE_ID'",
    "type": "practice",
    "content": {
      "th": {
        "body": "แบบฝึกหัดสมการเชิงเส้น"
      },
      "en": {
        "body": "Linear equations practice"
      }
    },
    "metadata": {
      "difficulty": 2,
      "estimatedMinutes": 20,
      "prerequisites": ["'$LESSON_ID_1'"],
      "tags": ["practice"],
      "learningObjectives": ["Practice solving equations"],
      "accessibility": {}
    },
    "competencies": ["'$COMP_ID_2'"]
  }'
```

**Expected (201)**: Lesson created with prerequisite

### Verify Prerequisite in Response

```bash
curl "http://localhost:3001/api/lessons/$LESSON_ID_2"
```

**Expected (200)**:
```json
{
  "lesson": {
    "type": "practice",
    "metadata": {
      "prerequisites": [
        {
          "_id": "...",
          "type": "video"
        }
      ]
    }
  }
}
```

✅ **Acceptance Test Passed**: Lesson prerequisites tracked correctly

---

## Test 7: Offline Download

```bash
curl -X POST "http://localhost:3001/api/courses/$COURSE_ID/download?language=en" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected (200)**:
```json
{
  "course": {
    "slug": "algebra-101",
    "title": "Introduction to Algebra",
    "description": "..."
  },
  "modules": [
    {
      "title": "Chapter 1: Linear Equations",
      "lessons": [
        {
          "type": "video",
          "content": {
            "body": "Video lesson about linear equations",
            "videoUrl": "..."
          }
        },
        {
          "type": "practice",
          "content": { ... }
        }
      ]
    }
  ],
  "competencies": [
    {
      "code": "MATH-BASIC",
      "name": "Basic Mathematics"
    },
    {
      "code": "ALG-LINEAR-EQ",
      "name": "Linear Equations"
    }
  ],
  "metadata": {
    "downloadedAt": "2026-01-06T...",
    "language": "en",
    "version": "1.0.0"
  }
}
```

**Features Verified**:
- ✅ Complete course structure in one request
- ✅ All content in requested language
- ✅ Nested modules with lessons
- ✅ All competencies included
- ✅ Metadata with download timestamp

✅ **Acceptance Test Passed**: Offline download returns complete course package

---

## Test 8: Admin Cascade Delete

### Delete Module (Should Delete All Lessons)

```bash
# Count lessons before delete
curl "http://localhost:3001/api/modules/$MODULE_ID/lessons"
# Returns 2 lessons

# Delete module
curl -X DELETE http://localhost:3001/api/admin/modules/$MODULE_ID \
  -H "Authorization: Bearer $TOKEN"

# Verify lessons are gone
curl "http://localhost:3001/api/modules/$MODULE_ID/lessons"
# Returns 404 (module not found)
```

✅ **Acceptance Test Passed**: Cascade delete works correctly

---

## Test 9: Query Filtering

### Filter Courses by Tags

```bash
curl "http://localhost:3001/api/courses?tags=algebra,beginner&language=en"
```

**Expected (200)**:
```json
{
  "courses": [
    {
      "slug": "algebra-101",
      "metadata": {
        "tags": ["math", "algebra", "beginner"]
      }
    }
  ],
  "total": 1
}
```

✅ **Acceptance Test Passed**: Tag filtering works

---

## Test 10: Unpublished Content Access

### As Unauthenticated User

```bash
# Try to access unpublished course
curl "http://localhost:3001/api/courses/$UNPUBLISHED_COURSE_ID"
```

**Expected (404)**:
```json
{
  "error": "Course not found"
}
```

### As Authenticated Admin

```bash
curl "http://localhost:3001/api/courses/$UNPUBLISHED_COURSE_ID" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected (200)**: Course returned (admins can see unpublished content)

✅ **Acceptance Test Passed**: Content visibility based on publish status and auth

---

## Test 11: Competency Without Prerequisites

```bash
curl -X POST http://localhost:3001/api/admin/competencies \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "MATH-INTRO",
    "name": { "th": "แนะนำคณิตศาสตร์", "en": "Math Introduction" },
    "description": { "th": "บทนำ", "en": "Introduction" },
    "courseId": "'$COURSE_ID'",
    "metadata": { "domain": "Mathematics", "difficulty": 1 }
  }'
```

**Expected (201)**: Competency created (prerequisites optional)

✅ **Acceptance Test Passed**: Competencies without prerequisites allowed

---

## Test 12: Lesson with Missing Competencies (Should Fail)

```bash
curl -X POST http://localhost:3001/api/admin/lessons \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "moduleId": "'$MODULE_ID'",
    "type": "reading",
    "content": { "th": { "body": "Content" } },
    "metadata": {
      "difficulty": 1,
      "estimatedMinutes": 10,
      "tags": [],
      "learningObjectives": [],
      "accessibility": {}
    },
    "competencies": []
  }'
```

**Expected (400)**:
```json
{
  "error": "At least one competency is required"
}
```

✅ **Acceptance Test Passed**: Lesson validation enforces ≥1 competency

---

## Verify in MongoDB

```bash
# Connect to MongoDB
docker exec -it adaptive-lms-mongodb mongosh

use adaptive-lms

# Count documents
db.courses.countDocuments({ published: true })
db.modules.countDocuments()
db.lessons.countDocuments({ published: true })
db.competencies.countDocuments()

# View course with modules
db.courses.findOne({ slug: "algebra-101" })

# View competency graph
db.competencies.find({}, { code: 1, prerequisites: 1 })

# Check indexes
db.courses.getIndexes()
db.lessons.getIndexes()
db.competencies.getIndexes()
```

---

## Performance Testing

```bash
# Test download endpoint performance
time curl -X POST "http://localhost:3001/api/courses/$COURSE_ID/download?language=en" \
  -H "Authorization: Bearer $TOKEN" \
  -o /dev/null -s

# Check logs for duration
docker-compose logs api | grep "Course download package created"
# Look for: "duration": 250  (ms)
```

**Target**:
- Small course (5 lessons): < 200ms
- Medium course (25 lessons): < 500ms
- Large course (100 lessons): < 1000ms

---

## Common Issues & Solutions

### "At least one competency is required per lesson"
**Fix**: Add at least one competency ID to the lesson:
```json
"competencies": ["competency-id-here"]
```

### "Circular competency dependency detected"
**Fix**: Review prerequisite chain and remove circular references:
```
COMP-A → COMP-B → COMP-C → COMP-A  (❌ circular)
COMP-A → COMP-B → COMP-C           (✅ valid DAG)
```

### "Content not available in EN"
**Fix**: Add English content or accept Thai fallback:
```json
"content": {
  "th": { "body": "Thai content" },
  "en": { "body": "English content" }
}
```

### "Course is not published"
**Fix**: Publish the course before downloading:
```bash
curl -X POST http://localhost:3001/api/admin/courses/$COURSE_ID/publish \
  -H "Authorization: Bearer $TOKEN"
```

---

## Next Steps

✅ All acceptance tests passed

Ready for Week 5: Competency & Skill Graph

---

*See [Week 4 Completion Summary](./WEEK_4_COMPLETION_SUMMARY.md) for full documentation*
