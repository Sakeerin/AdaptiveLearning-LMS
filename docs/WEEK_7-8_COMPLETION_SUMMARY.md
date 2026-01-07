# Week 7-8 Completion Summary: Adaptive Engine

**Status**: ✅ Complete
**Date**: 2026-01-06
**Implementation**: Backend API (Express + MongoDB)

---

## Overview

Week 7-8 implements the adaptive learning engine that personalizes content delivery based on learner mastery, progress, and competency prerequisites. The system generates learning paths, recommends next lessons, and tracks learner progress through courses.

---

## Deliverables

### 1. LearnerProgress MongoDB Model

**File**: `packages/api/src/models/LearnerProgress.ts`

**Purpose**: Track lesson completion and time spent

**Features**:
- Tracks progress per user per lesson
- Three states: not-started, in-progress, completed
- Completion percentage (0-100)
- Time spent tracking
- Auto-completion at 100%
- Unique constraint on userId + lessonId

**Schema**:
```typescript
{
  userId: ObjectId,
  lessonId: ObjectId,
  courseId: ObjectId,
  status: 'not-started' | 'in-progress' | 'completed',
  completionPercentage: number (0-100),
  timeSpent: number, // milliseconds
  lastAccessedAt: Date,
  startedAt: Date,
  completedAt: Date
}
```

**Indexes**:
```javascript
- userId: 1, lessonId: 1 (unique)
- userId: 1, courseId: 1
- userId: 1
- userId: 1, status: 1
- lastAccessedAt: -1
```

**Static Methods**:
- `findByUser(userId)`: Get all progress for user
- `findByUserAndCourse(userId, courseId)`: Get course-specific progress
- `findByUserAndLesson(userId, lessonId)`: Get lesson progress
- `updateProgress(userId, lessonId, courseId, percentage, timeSpent)`: Update or create progress
- `markCompleted(userId, lessonId)`: Mark lesson as completed

**Auto-completion**:
```typescript
if (percentage >= 100 && progress.status !== 'completed') {
  progress.status = 'completed';
  progress.completedAt = new Date();
}
```

---

### 2. Adaptive Engine Service

**File**: `packages/api/src/services/adaptive-engine.service.ts`

#### `buildLearningPath(userId, courseId)`
Generate personalized learning path for a course.

**Process**:
1. Get all lessons in course (sorted by module order)
2. Get user's progress and mastery
3. Check prerequisites for each lesson
4. Assign status: locked, available, in-progress, completed
5. Return ordered learning path

**Returns**: `LearningPathItem[]`
```typescript
{
  lessonId: string,
  lessonType: string,
  title: { th, en },
  moduleId: string,
  moduleName: { th, en },
  order: number,
  status: 'locked' | 'available' | 'in-progress' | 'completed',
  reason: string,
  prerequisitesMet: boolean,
  competencies: [{
    competencyId, code, name,
    mastery: number,
    status: string
  }],
  estimatedMinutes: number,
  difficulty: number
}
```

**Lesson Status Logic**:
- **Completed**: Progress status = 'completed'
- **In Progress**: Progress status = 'in-progress'
- **Available**: Prerequisites met, not started
- **Locked**: Prerequisites not met

#### `getNextLesson(userId, courseId)`
Recommend next lesson based on progress and mastery.

**Priority**:
1. **In-progress lessons** (highest priority - continue where left off)
2. **Lessons with recommended competencies** (from mastery recommendations)
3. **Next in sequence** (sequential progression)

**Scoring Algorithm**:
```typescript
score = 0
if (hasRecommendedCompetency) score += 10
score += (1 - avgMastery) * 5  // Prioritize lower mastery
score += (100 - order) * 0.1   // Prefer earlier lessons
```

**Returns**: `NextLessonRecommendation | null`
```typescript
{
  lesson: Lesson,
  reason: string,
  priority: 'high' | 'medium' | 'low',
  competenciesToLearn: string[],
  prerequisitesStatus: {
    met: boolean,
    missing: string[]
  }
}
```

#### `checkLessonPrerequisites(userId, lesson, progressMap, masteryMap)`
Check if all prerequisites are met.

**Checks**:
1. **Lesson prerequisites**: All prerequisite lessons must be completed
2. **Competency prerequisites**: All prerequisite competencies must be mastered (≥ 0.8)

**Returns**: `boolean`

#### `getCourseCompletion(userId, courseId)`
Calculate course completion statistics.

**Returns**:
```typescript
{
  total: number,
  completed: number,
  inProgress: number,
  available: number,
  locked: number,
  completionPercentage: number
}
```

#### `getRecommendedContent(userId, courseId)`
Get recommended lessons based on mastery gaps.

**Process**:
1. Get mastery recommendations (from Week 5)
2. Find lessons teaching recommended competencies
3. Find lessons needing remediation

**Returns**:
```typescript
{
  nextLessons: LearningPathItem[], // Top 3
  reviewLessons: LearningPathItem[], // Top 3 for remediation
  recommendations: {
    nextCompetencies: [...],
    remediation: [...]
  }
}
```

---

### 3. Adaptive Engine API Endpoints

**File**: `packages/api/src/routes/adaptive.ts`

**Auth**: All endpoints require authentication

#### GET /api/users/:userId/courses/:courseId/learning-path
**Purpose**: Get personalized learning path
**Query**: `language` ('th' | 'en')

**Response**:
```json
{
  "learningPath": [
    {
      "lessonId": "...",
      "lessonType": "video",
      "title": "Introduction to Algebra",
      "moduleId": "...",
      "moduleName": "Module 1: Basics",
      "order": 1,
      "status": "completed",
      "reason": "Completed",
      "prerequisitesMet": true,
      "competencies": [
        {
          "competencyId": "...",
          "code": "MATH-BASIC",
          "name": "Basic Mathematics",
          "mastery": 0.9,
          "status": "mastered"
        }
      ],
      "estimatedMinutes": 15,
      "difficulty": 2
    },
    {
      "lessonId": "...",
      "lessonType": "reading",
      "title": "Linear Equations",
      "order": 2,
      "status": "available",
      "reason": "Ready to start",
      "prerequisitesMet": true,
      "competencies": [...],
      "estimatedMinutes": 20,
      "difficulty": 3
    },
    {
      "lessonId": "...",
      "lessonType": "quiz",
      "title": "Advanced Topics",
      "order": 3,
      "status": "locked",
      "reason": "Prerequisites not met",
      "prerequisitesMet": false,
      "competencies": [...],
      "estimatedMinutes": 30,
      "difficulty": 5
    }
  ],
  "total": 15,
  "userId": "...",
  "courseId": "...",
  "language": "en"
}
```

**Features**:
- Sequential ordering by module
- Status based on prerequisites
- Mastery overlay for each competency
- Bilingual transformation

#### GET /api/users/:userId/courses/:courseId/next-lesson
**Purpose**: Get next recommended lesson
**Query**: `language`

**Response**:
```json
{
  "nextLesson": {
    "lesson": {
      "_id": "...",
      "type": "video",
      "content": { ... },
      "metadata": { ... },
      "competencies": [ ... ]
    },
    "reason": "Continue from where you left off",
    "priority": "high",
    "competenciesToLearn": ["comp-id-1", "comp-id-2"],
    "prerequisitesStatus": {
      "met": true,
      "missing": []
    }
  },
  "userId": "...",
  "courseId": "...",
  "language": "en"
}
```

**Response (No lessons available)**:
```json
{
  "nextLesson": null,
  "message": "No lessons available. You may have completed the course or need to unlock prerequisites."
}
```

**Recommendation Logic**:
1. Prioritize in-progress lessons
2. Then lessons with recommended competencies
3. Then next in sequence
4. Uses scoring algorithm for ranking

#### POST /api/users/:userId/lesson-progress
**Purpose**: Update lesson progress
**Body**:
```json
{
  "lessonId": "...",
  "courseId": "...",
  "completionPercentage": 50,
  "timeSpent": 300000
}
```

**Response**:
```json
{
  "message": "Progress updated successfully",
  "progress": {
    "lessonId": "...",
    "status": "in-progress",
    "completionPercentage": 50,
    "timeSpent": 300000,
    "lastAccessedAt": "2026-01-06T..."
  }
}
```

**Features**:
- Creates or updates progress record
- Auto-starts (status → in-progress)
- Auto-completes at 100%
- Accumulates time spent

#### POST /api/users/:userId/lessons/:lessonId/complete
**Purpose**: Mark lesson as completed

**Response**:
```json
{
  "message": "Lesson marked as completed",
  "progress": {
    "lessonId": "...",
    "status": "completed",
    "completedAt": "2026-01-06T..."
  }
}
```

#### GET /api/users/:userId/courses/:courseId/completion
**Purpose**: Get course completion statistics

**Response**:
```json
{
  "completion": {
    "total": 15,
    "completed": 5,
    "inProgress": 2,
    "available": 3,
    "locked": 5,
    "completionPercentage": 33.33
  },
  "userId": "...",
  "courseId": "..."
}
```

#### GET /api/users/:userId/courses/:courseId/recommended-content
**Purpose**: Get recommended content based on mastery
**Query**: `language`

**Response**:
```json
{
  "content": {
    "nextLessons": [
      {
        "lessonId": "...",
        "title": "Linear Equations",
        "status": "available",
        "reason": "Ready to start",
        "competencies": [ ... ]
      }
    ],
    "reviewLessons": [
      {
        "lessonId": "...",
        "title": "Basic Fractions",
        "status": "completed",
        "reason": "Review recommended",
        "competencies": [ ... ]
      }
    ],
    "recommendations": {
      "nextCompetencies": [ ... ],
      "remediation": [ ... ]
    }
  },
  "userId": "...",
  "courseId": "...",
  "language": "en"
}
```

**Features**:
- Top 3 next lessons (with recommended competencies)
- Top 3 review lessons (for remediation)
- Full mastery recommendations

#### GET /api/users/:userId/recent-activity
**Purpose**: Get recent learning activity
**Query**: `limit` (default: 10)

**Response**:
```json
{
  "activity": [
    {
      "lessonId": { ... },
      "courseId": { ... },
      "status": "in-progress",
      "completionPercentage": 75,
      "timeSpent": 900000,
      "lastAccessedAt": "2026-01-06T..."
    }
  ],
  "total": 10,
  "userId": "..."
}
```

---

## Acceptance Criteria

### ✅ 1. Learning Path Generation
- [x] Sequential ordering by module
- [x] Status based on prerequisites
- [x] Mastery overlay for competencies
- [x] Locked/available/in-progress/completed states

### ✅ 2. Prerequisite Checking
- [x] Lesson prerequisites (must complete prerequisite lessons)
- [x] Competency prerequisites (must master prerequisite competencies ≥ 0.8)
- [x] DAG traversal for prerequisites

### ✅ 3. Next Lesson Recommendation
- [x] Prioritize in-progress lessons
- [x] Recommend based on mastery gaps
- [x] Scoring algorithm for ranking
- [x] Fallback to sequential progression

### ✅ 4. Progress Tracking
- [x] Track completion percentage
- [x] Track time spent
- [x] Auto-start on first access
- [x] Auto-complete at 100%

### ✅ 5. Course Completion
- [x] Count lessons by status
- [x] Calculate completion percentage
- [x] Track locked vs available lessons

### ✅ 6. Recommended Content
- [x] Next lessons based on mastery
- [x] Review lessons for remediation
- [x] Integration with mastery recommendations

### ✅ 7. Recent Activity
- [x] Track recent lesson access
- [x] Sort by last accessed
- [x] Include progress details

### ✅ 8. Authorization
- [x] Users can only access own data
- [x] Admins can access any user data
- [x] Proper 403 errors

---

## Statistics

**Files Created**: 3
- 1 MongoDB model (LearnerProgress)
- 1 service (adaptive-engine)
- 1 routes file (adaptive)

**Lines of Code**: ~1,100

**Endpoints**: 7 total

**Indexes**: 5 on LearnerProgress model

---

## Integration Points

### From Week 4 (Content Library)
```typescript
// Get lessons with competencies and prerequisites
const lessons = await Lesson.findByModule(moduleId)
  .populate('competencies')
  .populate('metadata.prerequisites');
```

### From Week 5 (Mastery Tracking)
```typescript
// Use mastery recommendations for next lesson
const recommendations = await getRecommendations(userId, courseId);
const hasRecommendedComp = lesson.competencies.some(c =>
  recommendations.nextCompetencies.some(rec => rec.competencyId === c.competencyId)
);
```

### For Week 9-10 (AI Tutor)
```typescript
// Get current lesson for tutor context
const nextLesson = await getNextLesson(userId, courseId);
const tutorContext = {
  currentLesson: nextLesson.lesson,
  competencies: nextLesson.competenciesToLearn,
};
```

### For Week 12 (Mobile Offline)
```typescript
// Sync progress when online
const pendingProgress = await LearnerProgress.find({
  userId,
  lastAccessedAt: { $gte: lastSyncDate }
});
```

---

## Testing

Manual testing examples:

### Test 1: Get Learning Path
```bash
curl "http://localhost:3001/api/users/USER_ID/courses/COURSE_ID/learning-path?language=en" \
  -H "Authorization: Bearer TOKEN"
```

### Test 2: Get Next Lesson
```bash
curl "http://localhost:3001/api/users/USER_ID/courses/COURSE_ID/next-lesson?language=en" \
  -H "Authorization: Bearer TOKEN"
```

### Test 3: Update Progress
```bash
curl -X POST "http://localhost:3001/api/users/USER_ID/lesson-progress" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lessonId": "LESSON_ID",
    "courseId": "COURSE_ID",
    "completionPercentage": 50,
    "timeSpent": 300000
  }'
```

### Test 4: Mark Complete
```bash
curl -X POST "http://localhost:3001/api/users/USER_ID/lessons/LESSON_ID/complete" \
  -H "Authorization: Bearer TOKEN"
```

---

## Next Steps

**Week 9-10**: AI Tutor (Content-Only)
- OpenAI GPT-4 integration
- Content-grounded responses
- Citation generation
- Conversation history

---

## Technical Decisions

### 1. Prerequisite Checking
**Decision**: Check both lesson and competency prerequisites
**Rationale**:
- Lesson prerequisites: Sequential dependencies (Lesson 2 needs Lesson 1)
- Competency prerequisites: Knowledge dependencies (Algebra needs Arithmetic)
- Together: Complete learning path validation

**Alternative Considered**: Only lesson prerequisites (rejected - misses knowledge gaps)

### 2. Next Lesson Scoring
**Decision**: Weighted scoring with in-progress priority
**Rationale**:
- Always prioritize completion over new content
- Mastery recommendations guide new content
- Sequential fallback ensures progress

**Alternative Considered**: Pure sequential (rejected - ignores mastery)

### 3. Auto-completion
**Decision**: Auto-complete at 100% progress
**Rationale**:
- Simplifies learner experience
- Progress tracking is explicit user action
- Manual override available

**Alternative Considered**: Explicit completion (rejected - redundant)

### 4. Learning Path Status
**Decision**: Four states (locked, available, in-progress, completed)
**Rationale**:
- Clear communication to learner
- Locked: Cannot start yet
- Available: Ready to start
- In-progress: Partially done
- Completed: Finished

**Alternative Considered**: Three states (rejected - loses "available" signal)

---

## Known Limitations

1. **No adaptive difficulty**: Doesn't adjust content difficulty based on performance
   - Future: Suggest easier/harder content based on quiz scores
2. **No learning style adaptation**: Same path for all learners
   - Future: Adapt to visual vs reading learners
3. **No time-based recommendations**: Doesn't consider optimal learning times
   - Future: Suggest lessons based on historical performance times
4. **No peer comparison**: No social learning features
   - Future: Show how peers progress
5. **Static prerequisite chains**: Cannot dynamically adjust based on mastery
   - Future: Allow skipping prerequisites if competency mastered

---

## Performance Considerations

**Learning Path Generation**:
- Fetches all lessons in course (O(n))
- Checks prerequisites (O(n * p) where p = avg prerequisites)
- Expected: < 300ms for 50-lesson course

**Next Lesson Recommendation**:
- Builds learning path first
- Filters and scores available lessons
- Expected: < 350ms

**Progress Update**:
- Single document update
- Expected: < 50ms

**Expected Performance**:
- GET learning-path: < 300ms (50 lessons)
- GET next-lesson: < 350ms
- POST lesson-progress: < 50ms
- GET completion: < 300ms

---

✅ **Week 7-8 Complete**: Adaptive Engine fully implemented and ready for Week 9-10.
