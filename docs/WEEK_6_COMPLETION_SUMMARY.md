# Week 6 Completion Summary: Assessment Engine (Quizzes)

**Status**: ✅ Complete
**Date**: 2026-01-06
**Implementation**: Backend API (Express + MongoDB)

---

## Overview

Week 6 implements the complete assessment engine with quiz creation, grading, and automatic mastery tracking integration. The system supports multiple question types, attempt limits, randomization, and detailed analytics.

---

## Deliverables

### 1. Quiz Models (3 MongoDB Models)

#### QuizItem Model
**File**: `packages/api/src/models/QuizItem.ts`

**Purpose**: Individual quiz questions

**Features**:
- Multiple question types: MCQ, multi-select, short-answer
- Bilingual questions and options (TH/EN)
- Linked to competencies
- Difficulty ratings (1-5)
- Automatic validation:
  - MCQ must have exactly 1 correct answer
  - Multi-select must have ≥1 correct answer
  - Short-answer must have correctAnswer field

**Schema**:
```typescript
{
  type: 'mcq' | 'multi-select' | 'short-answer',
  question: { th: string, en?: string },
  options: [{ id, text: {th, en}, correct: boolean }],
  correctAnswer: string, // for short-answer
  explanation: { th: string, en?: string },
  competencyId: ObjectId,
  metadata: {
    difficulty: 1-5,
    tags: string[]
  }
}
```

**Indexes**:
```javascript
- competencyId: 1
- type: 1
- metadata.difficulty: 1
- competencyId: 1, metadata.difficulty: 1 (composite)
```

#### Quiz Model
**File**: `packages/api/src/models/Quiz.ts`

**Purpose**: Quiz configuration and item collection

**Features**:
- References QuizItems
- Configurable settings
- Validation: must have ≥ config.itemCount items

**Schema**:
```typescript
{
  lessonId: ObjectId,
  title: { th: string, en?: string },
  config: {
    itemCount: number,
    timeLimit: number, // minutes
    attempts: number (default 3),
    randomize: boolean (default true),
    partialCredit: boolean (default false)
  },
  items: ObjectId[] // QuizItem references
}
```

**Indexes**:
```javascript
- lessonId: 1
```

#### QuizAttempt Model
**File**: `packages/api/src/models/QuizAttempt.ts`

**Purpose**: Track individual quiz attempts and results

**Features**:
- Stores all responses
- Calculates scores
- Tracks xAPI statement IDs
- Sync status for offline mode

**Schema**:
```typescript
{
  userId: ObjectId,
  quizId: ObjectId,
  attemptNumber: number,
  startedAt: Date,
  submittedAt: Date,
  responses: [{
    itemId: ObjectId,
    response: string | string[],
    correct: boolean,
    points: number,
    hintsUsed: number,
    timeTaken: number // seconds
  }],
  score: {
    earned: number,
    possible: number,
    percentage: number
  },
  xapiStatementIds: string[], // UUIDs
  syncStatus: 'pending' | 'synced' | 'failed'
}
```

**Indexes**:
```javascript
- userId: 1, quizId: 1
- userId: 1
- quizId: 1
- userId: 1, quizId: 1, attemptNumber: 1 (unique)
- submittedAt: 1
- syncStatus: 1
```

---

### 2. Quiz Grading Service

**File**: `packages/api/src/services/quiz-grading.service.ts`

#### `gradeQuizItem(item, response)`
Grade a single quiz item.

**MCQ Grading**:
- Compare response to single correct option
- Points: 1 if correct, 0 if incorrect

**Multi-Select Grading**:
- All correct options selected
- No incorrect options selected
- Points: 1 if perfect match, 0 otherwise

**Short-Answer Grading**:
- Case-insensitive exact match
- Trims whitespace
- Points: 1 if match, 0 otherwise

#### `gradeQuiz(input)`
Grade entire quiz and create attempt record.

**Process**:
1. Verify quiz exists
2. Check attempt limit
3. Grade each response
4. Calculate total score
5. Create QuizAttempt record
6. Return results

**Passing Criteria**: ≥ 70%

#### `updateMasteryFromQuiz(userId, quizId, attemptId)`
Update mastery for all competencies in quiz.

**Process**:
1. Group responses by competency
2. Calculate performance per competency:
   - Correctness: correct / total
   - Average time
   - Total hints used
3. Update mastery using adaptive algorithm

**Integration**: Calls `updateMasteryFromAssessment()` from Week 5

#### `getQuizStatistics(userId, quizId)`
Calculate quiz statistics for a user.

**Returns**:
```typescript
{
  attemptCount: number,
  bestScore: number | null,
  lastScore: number | null,
  averageScore: number | null
}
```

#### `prepareQuizForUser(quiz, language)`
Sanitize quiz for delivery to user.

**Process**:
1. Randomize items if configured
2. Remove correct answers
3. Remove explanations
4. Transform to requested language
5. Randomize option order

---

### 3. Quiz API Endpoints

**File**: `packages/api/src/routes/quizzes.ts`

#### GET /api/quizzes/:id
**Purpose**: Get quiz for user (sanitized)
**Auth**: Required
**Query**: `language` ('th' | 'en')

**Response**:
```json
{
  "quiz": {
    "_id": "...",
    "title": "Algebra Quiz 1",
    "config": {
      "itemCount": 10,
      "timeLimit": 30,
      "attempts": 3
    },
    "items": [
      {
        "_id": "...",
        "type": "mcq",
        "question": "What is 2+2?",
        "options": [
          { "id": "opt-1", "text": "3" },
          { "id": "opt-2", "text": "4" },
          { "id": "opt-3", "text": "5" }
        ],
        "competencyId": "..."
      }
    ]
  },
  "attemptsRemaining": 2,
  "statistics": {
    "attemptCount": 1,
    "bestScore": 80,
    "lastScore": 80,
    "averageScore": 80
  },
  "language": "en"
}
```

**Features**:
- Checks attempt limit
- Randomizes items
- Removes correct answers
- Randomizes option order

#### POST /api/quizzes/:id/submit
**Purpose**: Submit quiz and get results
**Auth**: Required

**Body**:
```json
{
  "responses": [
    {
      "itemId": "...",
      "response": "opt-2",
      "hintsUsed": 0,
      "timeTaken": 45
    }
  ]
}
```

**Response**:
```json
{
  "message": "Quiz submitted successfully",
  "attempt": {
    "_id": "...",
    "attemptNumber": 2,
    "submittedAt": "2026-01-06T..."
  },
  "score": {
    "earned": 8,
    "possible": 10,
    "percentage": 80
  },
  "responses": [
    {
      "itemId": "...",
      "response": "opt-2",
      "correct": true,
      "points": 1,
      "hintsUsed": 0,
      "timeTaken": 45
    }
  ],
  "passed": true
}
```

**Features**:
- Validates attempt limit
- Grades all responses
- Creates attempt record
- Updates mastery asynchronously
- Returns immediate results

#### GET /api/quizzes/:id/attempts
**Purpose**: Get user's quiz attempts
**Auth**: Required

**Response**:
```json
{
  "attempts": [
    {
      "_id": "...",
      "attemptNumber": 2,
      "startedAt": "2026-01-06T...",
      "submittedAt": "2026-01-06T...",
      "score": {
        "earned": 8,
        "possible": 10,
        "percentage": 80
      },
      "completed": true
    }
  ],
  "statistics": {
    "attemptCount": 2,
    "bestScore": 85,
    "lastScore": 80,
    "averageScore": 82.5
  },
  "total": 2
}
```

#### GET /api/quizzes/:id/attempts/:attemptId
**Purpose**: Get detailed results with explanations
**Auth**: Required
**Query**: `language`

**Response**:
```json
{
  "attempt": {
    "_id": "...",
    "attemptNumber": 1,
    "score": {
      "earned": 8,
      "possible": 10,
      "percentage": 80
    }
  },
  "responses": [
    {
      "itemId": "...",
      "response": "opt-2",
      "correct": true,
      "points": 1,
      "question": "What is 2+2?",
      "explanation": "2+2 equals 4 by basic addition.",
      "correctAnswer": ["opt-2"]
    }
  ],
  "language": "en"
}
```

**Features**:
- Shows correct answers after submission
- Includes explanations
- Verifies ownership

#### GET /api/quizzes/:id/statistics
**Purpose**: Get quiz statistics
**Auth**: Required

**Response**:
```json
{
  "statistics": {
    "attemptCount": 3,
    "bestScore": 90,
    "lastScore": 85,
    "averageScore": 83.33
  },
  "quizId": "...",
  "userId": "..."
}
```

---

### 4. Admin Quiz Management Endpoints

**File**: `packages/api/src/routes/admin/quizzes.ts`

**Auth**: All require admin/instructor role

#### Quiz Item Management

**POST /api/admin/quiz-items**
- Create new quiz item
- Validates question type requirements

**PATCH /api/admin/quiz-items/:id**
- Update quiz item
- Re-validates on update

**DELETE /api/admin/quiz-items/:id**
- Delete quiz item
- Prevents deletion if used in quizzes

**GET /api/admin/quiz-items/competency/:competencyId**
- Get all items for a competency

#### Quiz Management

**POST /api/admin/quizzes**
- Create new quiz
- Validates all items exist

**PATCH /api/admin/quizzes/:id**
- Update quiz
- Validates items if updated

**DELETE /api/admin/quizzes/:id**
- Delete quiz and all attempts

#### Quiz Analytics

**GET /api/admin/quizzes/:id/analytics**
- Get quiz analytics (all users)

**Response**:
```json
{
  "analytics": {
    "totalAttempts": 150,
    "uniqueUsers": 45,
    "averageScore": 78.5,
    "passRate": 73.3,
    "scoreDistribution": [
      { "range": "0-50", "count": 15 },
      { "range": "50-70", "count": 25 },
      { "range": "70-85", "count": 60 },
      { "range": "85-100", "count": 50 }
    ]
  }
}
```

**GET /api/admin/quizzes/:id/attempts**
- Get all attempts (all users)
- Paginated (limit, offset)

---

## Acceptance Criteria

### ✅ 1. Question Types
- [x] Multiple choice (MCQ) - single correct answer
- [x] Multi-select - multiple correct answers
- [x] Short answer - case-insensitive exact match

### ✅ 2. Quiz Configuration
- [x] Item count configuration
- [x] Time limit (optional)
- [x] Attempt limit (default 3)
- [x] Randomization option

### ✅ 3. Grading
- [x] Automatic grading for all question types
- [x] Points per question
- [x] Total score calculation
- [x] Pass/fail determination (70% threshold)

### ✅ 4. Attempt Tracking
- [x] Unique attempt numbers
- [x] Start and submit timestamps
- [x] Attempt limit enforcement
- [x] History of all attempts

### ✅ 5. Mastery Integration
- [x] Automatic mastery update after submission
- [x] Groups responses by competency
- [x] Calculates performance per competency
- [x] Uses adaptive algorithm from Week 5

### ✅ 6. Bilingual Support
- [x] Questions in TH/EN
- [x] Options in TH/EN
- [x] Explanations in TH/EN
- [x] Language parameter on all endpoints

### ✅ 7. Security
- [x] Users can only submit own quizzes
- [x] Users can only view own attempts
- [x] Correct answers hidden until after submission
- [x] Admin analytics separate from user views

### ✅ 8. Quiz Preparation
- [x] Randomize items if configured
- [x] Randomize option order
- [x] Remove correct answers before delivery
- [x] Remove explanations before delivery

---

## Statistics

**Files Created**: 6
- 3 MongoDB models (QuizItem, Quiz, QuizAttempt)
- 1 service (quiz-grading)
- 2 routes files (quizzes, admin/quizzes)

**Lines of Code**: ~1,400

**Endpoints**: 5 user + 8 admin = 13 total

**Indexes**: 11 total across all models

---

## Integration Points

### From Week 4 (Content Library)
```typescript
// Link quiz to lesson
const lesson = await Lesson.findById(lessonId);
const quiz = new Quiz({ lessonId, ... });
```

### From Week 5 (Mastery Tracking)
```typescript
// Update mastery after quiz
await updateMasteryFromQuiz(userId, quizId, attemptId);
// This calls updateMasteryFromAssessment() for each competency
```

### For Week 7-8 (Adaptive Engine)
```typescript
// Recommend quizzes based on mastery
const recommendations = await getRecommendations(userId, courseId);
const quizzes = await Quiz.find({
  lessonId: { $in: recommendedLessons.map(l => l._id) }
});
```

### For Week 12 (Mobile Offline)
```typescript
// Sync quiz attempts
const pendingAttempts = await QuizAttempt.find({
  userId,
  syncStatus: 'pending'
});
// Sync to server when online
```

---

## Testing

See [QUIZ_TESTING_GUIDE.md](./QUIZ_TESTING_GUIDE.md) for:
- Quiz creation workflow
- MCQ, multi-select, short-answer testing
- Grading validation
- Mastery integration testing
- Attempt limit testing
- Admin analytics testing

---

## Next Steps

**Week 7-8**: Adaptive Engine
- Recommendation engine
- Content sequencing
- Prerequisite checking
- Mastery-based content delivery

---

## Technical Decisions

### 1. Grading Algorithm
**Decision**: Immediate grading on submission
**Rationale**:
- Instant feedback for learners
- No background job complexity
- Simple and deterministic
- Easy to debug

**Alternative Considered**: Async grading (rejected - unnecessary complexity)

### 2. Randomization
**Decision**: Randomize on every GET request
**Rationale**:
- Different items each attempt
- Prevents memorization
- Simple implementation
- No need to store randomized order

**Alternative Considered**: Store randomized order (rejected - adds complexity)

### 3. Mastery Update
**Decision**: Async update (fire-and-forget)
**Rationale**:
- Don't block quiz submission response
- Mastery update can take 100-200ms
- Failures logged but don't affect quiz result
- User gets immediate feedback

**Alternative Considered**: Synchronous update (rejected - slower response)

### 4. Short Answer Matching
**Decision**: Case-insensitive exact match
**Rationale**:
- Simple and predictable
- No false positives
- Clear to learners what's expected
- Can add fuzzy matching later if needed

**Alternative Considered**: Fuzzy matching (rejected - MVP complexity)

---

## Known Limitations

1. **No partial credit**: Multi-select is all-or-nothing
   - Future: Award partial points
2. **Simple short-answer matching**: Only exact match
   - Future: Fuzzy matching, synonym support
3. **No adaptive difficulty**: Items not selected based on mastery
   - Week 7-8: Adaptive item selection
4. **No item analytics**: Don't track per-item statistics
   - Future: Item difficulty analysis
5. **No time tracking per item**: Only total quiz time
   - Future: Per-question time tracking

---

## Performance Considerations

**Grading Performance**:
- In-memory grading (no external calls)
- Expected: < 50ms for 10-question quiz
- Scales linearly with question count

**Mastery Update**:
- Async (non-blocking)
- Groups by competency (batch updates)
- Expected: 100-200ms for 3-5 competencies

**Quiz Preparation**:
- Randomization is O(n log n)
- Expected: < 20ms for 50-item pool

**Expected Performance**:
- GET /api/quizzes/:id: < 150ms
- POST /api/quizzes/:id/submit: < 100ms (grading only)
- GET /api/quizzes/:id/attempts: < 100ms

---

✅ **Week 6 Complete**: Assessment Engine fully implemented and ready for Week 7-8.
