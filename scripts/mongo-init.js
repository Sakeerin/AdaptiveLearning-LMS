// MongoDB initialization script
// Creates database and initial collections with indexes

db = db.getSiblingDB('adaptive-lms');

// Create collections
db.createCollection('users');
db.createCollection('courses');
db.createCollection('modules');
db.createCollection('lessons');
db.createCollection('competencies');
db.createCollection('learnermastery');
db.createCollection('quizzes');
db.createCollection('quizitems');
db.createCollection('quizattempts');
db.createCollection('xapistatements');
db.createCollection('tutorsessions');
db.createCollection('tutorknowledgepacks');
db.createCollection('gamificationprofiles');
db.createCollection('badges');
db.createCollection('quests');
db.createCollection('xpevents');

// Create indexes
// User indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ 'sessions.deviceId': 1 });

// Course indexes
db.courses.createIndex({ slug: 1 }, { unique: true });
db.courses.createIndex({ published: 1 });
db.modules.createIndex({ courseId: 1 });
db.lessons.createIndex({ moduleId: 1 });
db.lessons.createIndex({ published: 1 });
db.lessons.createIndex({ competencies: 1 });

// Competency indexes
db.competencies.createIndex({ courseId: 1 });
db.competencies.createIndex({ code: 1 }, { unique: true });

// Mastery indexes
db.learnermastery.createIndex({ userId: 1, competencyId: 1 }, { unique: true });
db.learnermastery.createIndex({ userId: 1 });
db.learnermastery.createIndex({ lastAssessed: 1 });

// Quiz indexes
db.quizzes.createIndex({ lessonId: 1 });
db.quizitems.createIndex({ competencyId: 1 });
db.quizattempts.createIndex({ userId: 1, quizId: 1 });
db.quizattempts.createIndex({ userId: 1 });
db.quizattempts.createIndex({ syncStatus: 1 });

// xAPI indexes (CRITICAL for performance)
db.xapistatements.createIndex({ id: 1 }, { unique: true }); // statement ID
db.xapistatements.createIndex({ 'actor.account.name': 1 }); // user queries
db.xapistatements.createIndex({ 'verb.id': 1 }); // verb filtering
db.xapistatements.createIndex({ 'object.id': 1 }); // activity filtering
db.xapistatements.createIndex({ timestamp: 1 }); // time-based queries
db.xapistatements.createIndex({ stored: 1 }); // storage time
db.xapistatements.createIndex({
  'actor.account.name': 1,
  'verb.id': 1,
  timestamp: -1
}); // composite for common queries

// Tutor indexes
db.tutorsessions.createIndex({ userId: 1 });
db.tutorsessions.createIndex({ courseId: 1 });
db.tutorknowledgepacks.createIndex({ courseId: 1 });
db.tutorknowledgepacks.createIndex({ approved: 1 });

// Gamification indexes
db.gamificationprofiles.createIndex({ userId: 1 }, { unique: true });
db.badges.createIndex({ code: 1 }, { unique: true });
db.quests.createIndex({ code: 1 }, { unique: true });
db.xpevents.createIndex({ userId: 1, date: 1 });
db.xpevents.createIndex({ userId: 1, action: 1, timestamp: -1 });

print('MongoDB initialized successfully for Adaptive Learning LMS');
