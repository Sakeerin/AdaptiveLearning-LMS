# Week 5 Completion Summary: Competency & Skill Graph

**Status**: ✅ Complete
**Date**: 2026-01-06
**Implementation**: Backend API (Express + MongoDB)

---

## Overview

Week 5 implements the learner mastery tracking system and skill graph visualization. The system tracks competency mastery over time, applies decay algorithms, generates personalized recommendations, and visualizes prerequisite relationships.

---

## Deliverables

### 1. LearnerMastery MongoDB Model

**File**: `packages/api/src/models/LearnerMastery.ts`

**Features**:
- Tracks mastery (0.0-1.0) and confidence (0.0-1.0) per competency per user
- Maintains history of mastery changes (last 50 entries)
- Automatic decay for inactive learners
- Unique constraint on userId + competencyId
- Virtual field for mastery status (mastered/developing/remediation)

**Schema**:
```typescript
{
  userId: ObjectId,
  competencyId: ObjectId,
  mastery: Number (0-1),
  confidence: Number (0-1),
  lastAssessed: Date,
  decayRate: Number (default 0.05),
  history: [{
    timestamp: Date,
    mastery: Number,
    confidence: Number,
    eventType: 'quiz' | 'practice' | 'decay' | 'manual'
  }]
}
```

**Indexes**:
```javascript
- userId: 1, competencyId: 1 (unique composite)
- userId: 1
- competencyId: 1
- userId: 1, mastery: -1 (for sorting)
- lastAssessed: 1 (for decay queries)
```

**Static Methods**:
- `findByUser(userId)`: Get all mastery records for a user
- `findByUserAndCompetency(userId, competencyId)`: Get specific mastery record
- `updateMastery(userId, competencyId, mastery, confidence, eventType)`: Update mastery with history tracking
- `applyDecay(userId, daysSinceLastAssessed)`: Apply exponential decay to stale records

**Mastery Thresholds**:
- **Mastered**: ≥ 0.8
- **Developing**: 0.5 - 0.79
- **Remediation**: < 0.5

---

### 2. Mastery Tracking Service

**File**: `packages/api/src/services/mastery-tracking.service.ts`

**Functions**:

#### `getUserMastery(userId)`
Get all mastery records for a user with competency details.

**Returns**: `MasterySnapshot[]`
```typescript
{
  competencyId: string,
  competencyCode: string,
  competencyName: { th: string, en?: string },
  mastery: number,
  confidence: number,
  status: 'mastered' | 'developing' | 'remediation',
  lastAssessed: Date,
  history: Array<...>
}
```

#### `getCompetencyMastery(userId, competencyId)`
Get mastery for a specific competency.

**Returns**: `MasterySnapshot | null`

#### `updateMasteryFromAssessment(userId, competencyId, input)`
Update mastery based on assessment performance using the adaptive algorithm.

**Input**:
```typescript
{
  currentMastery: number,
  correctness: number (0-1),
  timeOnTask: number (ms),
  expectedTime: number (ms),
  hintsUsed: number,
  attemptNumber: number,
  currentConfidence: number
}
```

**Algorithm** (from `@adaptive-lms/shared/utils/mastery-calculator`):
1. Calculate time score: `min(1.0, expectedTime / timeOnTask)`
2. Calculate hint penalty: `max(0, 1 - hintsUsed * 0.1)`
3. Weighted combination:
   - Correctness: 70%
   - Time: 20%
   - Hints: 10%
4. Apply diminishing returns: `attemptFactor = 1 / (1 + log(attemptNumber))`
5. Exponential moving average: `newMastery = (1 - α) * currentMastery + α * rawScore`
6. Increase confidence: `newConfidence = min(1.0, currentConfidence + 0.1)`

#### `applyMasteryDecay(userId, daysSinceLastAssessed)`
Apply exponential decay to inactive competencies.

**Decay Formula**: `mastery * (1 - decayRate) ^ weeks`
- Default decay rate: 5% per week
- Only decays competencies with `lastAssessed` older than threshold

#### `buildSkillGraph(courseId, userId?)`
Build complete skill graph with prerequisite relationships.

**Returns**: `SkillGraphNode[]`
```typescript
{
  competencyId: string,
  code: string,
  name: { th: string, en?: string },
  mastery: number (0 if no userId),
  status: MasteryStatus,
  prerequisites: string[], // Competency IDs
  dependents: string[]     // Competencies that depend on this one
}
```

**Graph Structure**:
- Nodes: Competencies
- Directed edges: Prerequisites (A → B means "A is prerequisite of B")
- DAG (Directed Acyclic Graph) - cycles prevented by validation

#### `getRecommendations(userId, courseId)`
Generate personalized learning recommendations.

**Returns**: `RecommendationResult`
```typescript
{
  nextCompetencies: [{
    competencyId: string,
    code: string,
    name: { th: string, en?: string },
    reason: string,
    prerequisitesMet: boolean
  }],
  remediation: [{
    competencyId: string,
    code: string,
    name: { th: string, en?: string },
    mastery: number,
    reason: string
  }]
}
```

**Recommendation Logic**:

**Next Competencies**:
1. Filter: Not mastered (mastery < 0.8)
2. Filter: All prerequisites mastered (≥ 0.8)
3. Sort by:
   - Already started (mastery > 0) first
   - Fewer prerequisites
   - Lower difficulty
4. Return top 5

**Remediation**:
1. Filter: Started but below proficiency (0 < mastery < 0.5)
2. Sort by: Lowest mastery first
3. Return top 5

#### `getCourseProgress(userId, courseId)`
Calculate overall course progress.

**Returns**:
```typescript
{
  totalCompetencies: number,
  mastered: number,        // mastery ≥ 0.8
  developing: number,      // 0.5 ≤ mastery < 0.8
  notStarted: number,      // mastery = 0
  averageMastery: number   // 0.0-1.0
}
```

---

### 3. Mastery API Endpoints

**File**: `packages/api/src/routes/mastery.ts`

#### GET /api/users/:userId/mastery
**Purpose**: Get all mastery records for a user
**Auth**: Required (own data or admin)
**Query**: `language` ('th' | 'en')

**Response**:
```json
{
  "mastery": [
    {
      "competencyId": "...",
      "competencyCode": "ALG-LINEAR-EQ",
      "competencyName": "Linear Equations",
      "mastery": 0.75,
      "confidence": 0.8,
      "status": "developing",
      "lastAssessed": "2026-01-05T12:00:00.000Z",
      "history": [...]
    }
  ],
  "total": 5,
  "language": "en"
}
```

#### GET /api/users/:userId/mastery/:competencyId
**Purpose**: Get mastery for a specific competency
**Auth**: Required (own data or admin)
**Query**: `language`

**Response**:
```json
{
  "mastery": {
    "competencyId": "...",
    "competencyCode": "ALG-LINEAR-EQ",
    "competencyName": "Linear Equations",
    "mastery": 0.75,
    "confidence": 0.8,
    "status": "developing",
    "lastAssessed": "2026-01-05T12:00:00.000Z",
    "history": [
      {
        "timestamp": "2026-01-05T12:00:00.000Z",
        "mastery": 0.75,
        "confidence": 0.8,
        "eventType": "quiz"
      }
    ]
  },
  "language": "en"
}
```

**Response (Not Assessed)**:
```json
{
  "mastery": null,
  "message": "No mastery record found (not yet assessed)"
}
```

#### POST /api/users/:userId/mastery/:competencyId
**Purpose**: Update mastery based on assessment performance
**Auth**: Required (own data or admin)

**Body**:
```json
{
  "correctness": 0.8,
  "timeOnTask": 300000,
  "expectedTime": 600000,
  "hintsUsed": 1,
  "attemptNumber": 1
}
```

**Response**:
```json
{
  "message": "Mastery updated successfully",
  "mastery": {
    "competencyId": "...",
    "competencyCode": "ALG-LINEAR-EQ",
    "mastery": 0.78,
    "confidence": 0.7,
    "status": "developing",
    "lastAssessed": "2026-01-06T12:00:00.000Z"
  }
}
```

#### POST /api/users/:userId/mastery/decay
**Purpose**: Apply mastery decay for inactive user
**Auth**: Required (own data or admin)

**Body**:
```json
{
  "daysSinceLastAssessed": 7
}
```

**Response**:
```json
{
  "message": "Mastery decay applied successfully"
}
```

#### GET /api/courses/:courseId/skill-graph
**Purpose**: Get skill graph for a course
**Auth**: Optional (required if userId provided)
**Query**:
- `userId`: User ID to include mastery data (optional)
- `language`: 'th' | 'en'

**Response**:
```json
{
  "graph": [
    {
      "competencyId": "...",
      "code": "MATH-BASIC",
      "name": "Basic Mathematics",
      "mastery": 0.9,
      "status": "mastered",
      "prerequisites": [],
      "dependents": ["comp-id-2", "comp-id-3"]
    },
    {
      "competencyId": "...",
      "code": "ALG-LINEAR-EQ",
      "name": "Linear Equations",
      "mastery": 0.75,
      "status": "developing",
      "prerequisites": ["comp-id-1"],
      "dependents": ["comp-id-4"]
    }
  ],
  "courseId": "...",
  "userId": "...",
  "language": "en"
}
```

**Graph Visualization**:
```
MATH-BASIC (0.9 ★)
    ├─→ ALG-LINEAR-EQ (0.75 ◐)
    │       └─→ ALG-QUADRATIC (0.4 ○)
    └─→ GEOMETRY-BASIC (0.0 ○)
```

Legend:
- ★ Mastered (≥ 0.8)
- ◐ Developing (0.5-0.79)
- ○ Remediation (< 0.5)

#### GET /api/users/:userId/recommendations
**Purpose**: Get personalized learning recommendations
**Auth**: Required (own data or admin)
**Query**:
- `courseId`: Course ID (required)
- `language`: 'th' | 'en'

**Response**:
```json
{
  "recommendations": {
    "nextCompetencies": [
      {
        "competencyId": "...",
        "code": "ALG-LINEAR-EQ",
        "name": "Linear Equations",
        "reason": "Continue learning (in progress)",
        "prerequisitesMet": true
      },
      {
        "competencyId": "...",
        "code": "GEOMETRY-BASIC",
        "name": "Basic Geometry",
        "reason": "Foundation skill (no prerequisites)",
        "prerequisitesMet": true
      }
    ],
    "remediation": [
      {
        "competencyId": "...",
        "code": "MATH-FRACTIONS",
        "name": "Fractions",
        "mastery": 0.45,
        "reason": "Below proficiency threshold (requires review)"
      }
    ]
  },
  "userId": "...",
  "courseId": "...",
  "language": "en"
}
```

#### GET /api/users/:userId/courses/:courseId/progress
**Purpose**: Get overall course progress
**Auth**: Required (own data or admin)

**Response**:
```json
{
  "progress": {
    "totalCompetencies": 10,
    "mastered": 3,
    "developing": 4,
    "notStarted": 3,
    "averageMastery": 0.52
  },
  "userId": "...",
  "courseId": "..."
}
```

---

## Acceptance Criteria

### ✅ 1. Mastery Tracking
- [x] Mastery scores (0.0-1.0) stored per user per competency
- [x] Confidence scores tracked alongside mastery
- [x] History of mastery changes maintained
- [x] Status calculation (mastered/developing/remediation)

### ✅ 2. Mastery Update Algorithm
- [x] Weighted combination (correctness 70%, time 20%, hints 10%)
- [x] Diminishing returns for repeated attempts
- [x] Exponential moving average for smooth updates
- [x] Confidence increases with more assessments

### ✅ 3. Mastery Decay
- [x] Exponential decay for inactive competencies
- [x] Configurable decay rate (default 5% per week)
- [x] Only decays competencies not recently assessed
- [x] Confidence also decays

### ✅ 4. Skill Graph
- [x] Complete prerequisite graph for courses
- [x] Nodes include competency details + mastery
- [x] Directed edges show prerequisites
- [x] Dependents calculated (reverse edges)
- [x] DAG structure (no cycles)

### ✅ 5. Recommendations
- [x] Next competencies to learn (prerequisites met)
- [x] Prioritize: in-progress > few prerequisites
- [x] Remediation suggestions (low mastery)
- [x] Top 5 in each category

### ✅ 6. Course Progress
- [x] Count competencies by status
- [x] Calculate average mastery
- [x] Track not started competencies

### ✅ 7. Authorization
- [x] Users can only view/update own mastery
- [x] Admins can view/update any user's mastery
- [x] Proper 403 errors for unauthorized access

### ✅ 8. Bilingual Support
- [x] All competency names in responses support TH/EN
- [x] Language parameter on all endpoints
- [x] Fallback to Thai if English missing

---

## Statistics

**Files Created**: 3
- 1 MongoDB model (LearnerMastery)
- 1 service (mastery-tracking)
- 1 routes file (mastery)

**Lines of Code**: ~1,000

**Endpoints**: 7 total

**Indexes**: 5 on LearnerMastery model

---

## Integration Points

### From Week 4 (Content Library)
```typescript
// Get competency from lesson
const lesson = await Lesson.findById(lessonId).populate('competencies');
const competencyIds = lesson.competencies.map(c => c._id);

// Update mastery for each competency
for (const competencyId of competencyIds) {
  await updateMasteryFromAssessment(userId, competencyId, assessmentData);
}
```

### For Week 6 (Assessment Engine)
```typescript
// After quiz submission, update mastery
const quizResult = await submitQuiz(userId, quizId, answers);

for (const question of quiz.questions) {
  const competencyId = question.competencyId;
  const correct = quizResult.correctAnswers.includes(question._id);

  await updateMasteryFromAssessment(userId, competencyId, {
    correctness: correct ? 1.0 : 0.0,
    timeOnTask: question.timeSpent,
    expectedTime: question.expectedTime,
    hintsUsed: question.hintsUsed,
    attemptNumber: question.attemptNumber,
  });
}
```

### For Week 7-8 (Adaptive Engine)
```typescript
// Get recommendations for next lesson
const recommendations = await getRecommendations(userId, courseId);

// Filter lessons by competencies
const nextLessons = await Lesson.find({
  competencies: { $in: recommendations.nextCompetencies.map(c => c.competencyId) }
});
```

### For Week 13 (Analytics)
```typescript
// Track mastery over time
const masteryHistory = await LearnerMastery.findByUser(userId);
const timeSeriesData = masteryHistory.map(m => ({
  date: m.history.map(h => h.timestamp),
  mastery: m.history.map(h => h.mastery),
}));
```

---

## Testing

See [MASTERY_TESTING_GUIDE.md](./MASTERY_TESTING_GUIDE.md) for:
- Manual API testing with curl
- Sample mastery update workflow
- Skill graph visualization
- Recommendation testing
- Decay algorithm testing

---

## Next Steps

**Week 6**: Assessment Engine (Quizzes)
- Quiz model with questions
- Question types (multiple choice, true/false, fill-in)
- Quiz submission and grading
- Integration with mastery tracking

---

## Technical Decisions

### 1. Mastery Algorithm
**Decision**: Exponential moving average with weighted factors
**Rationale**:
- Smooth updates (no sudden jumps)
- Recent performance weighted more
- Configurable weights for different factors
- Proven effective in adaptive learning systems

**Alternative Considered**: Simple average (rejected - too sensitive to outliers)

### 2. Decay Model
**Decision**: Exponential decay based on time
**Rationale**:
- Models forgetting curve from cognitive science
- Decay rate per week is intuitive
- Only affects inactive competencies
- Preserves mastered skills longer

**Alternative Considered**: Linear decay (rejected - unrealistic forgetting pattern)

### 3. History Storage
**Decision**: Store last 50 history entries in document
**Rationale**:
- Quick access to recent history
- No need for separate collection
- Bounded storage (prevents unlimited growth)
- 50 entries = ~6 months of weekly assessments

**Alternative Considered**: Separate history collection (rejected - slower queries)

### 4. Recommendation Algorithm
**Decision**: Rule-based with prerequisite checking
**Rationale**:
- Deterministic and explainable
- Respects learning paths
- Easy to understand for learners
- No ML training required

**Alternative Considered**: ML-based recommendations (rejected - unnecessary complexity for MVP)

---

## Known Limitations

1. **No adaptive decay rates**: All competencies use same decay rate
   - Future: Adjust decay based on difficulty or importance
2. **Fixed history size**: Only 50 entries stored
   - Future: Archive old history to separate collection
3. **No confidence interval**: Confidence is simple counter
   - Future: Calculate statistical confidence intervals
4. **No transfer learning**: Mastery in one competency doesn't affect related ones
   - Future: Implement knowledge transfer between related competencies
5. **No time-of-day factors**: Doesn't account for user's optimal learning times
   - Future: Personalized scheduling recommendations

---

## Performance Considerations

**Query Optimization**:
- Compound index on userId + competencyId for fast lookups
- Index on lastAssessed for decay queries
- Populate only when necessary
- Limit history to 10 entries in API responses

**Decay Job**:
- Run as background cron job (not on-demand)
- Batch process users (1000 at a time)
- Only process users active in last 30 days
- Expected: ~500ms per 1000 users

**Expected Performance**:
- GET /api/users/:id/mastery: < 100ms (with 20 competencies)
- POST /api/users/:id/mastery/:competencyId: < 50ms
- GET /api/courses/:id/skill-graph: < 200ms (with 50 competencies)
- GET /api/users/:id/recommendations: < 150ms

---

✅ **Week 5 Complete**: Competency & Skill Graph fully implemented and ready for Week 6.
