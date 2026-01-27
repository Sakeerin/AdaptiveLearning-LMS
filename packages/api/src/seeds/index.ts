/**
 * Main Seed Runner
 *
 * Usage: pnpm --filter @adaptive-lms/api run seed
 *
 * This script populates the database with demo data for testing and demonstration.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { seedUsers } from './users.seed';
import { seedCourses } from './courses.seed';
import { seedCompetencies } from './competencies.seed';
import { seedModules } from './modules.seed';
import { seedLessons } from './lessons.seed';
import { seedQuizItems } from './quiz-items.seed';
import { seedQuizzes } from './quizzes.seed';
import { seedAchievements } from './achievements.seed';
import { seedUserProgress } from './user-progress.seed';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/adaptive-lms';

interface SeedResult {
  name: string;
  count: number;
  ids?: Record<string, mongoose.Types.ObjectId>;
}

async function clearDatabase() {
  console.log('🗑️  Clearing existing data...');

  const collections = [
    'users',
    'courses',
    'modules',
    'lessons',
    'competencies',
    'quizzes',
    'quizitems',
    'quizattempts',
    'learnermastery',
    'learnerprogress',
    'achievements',
    'userachievements',
    'usergamestats',
    'leaderboards',
    'notifications',
    'notificationpreferences',
    'analyticsevents',
    'analyticsaggregates',
    'syncqueues',
    'devicesyncstates',
    'conversations',
    'xapistatements',
  ];

  for (const collection of collections) {
    try {
      await mongoose.connection.db?.collection(collection).deleteMany({});
      console.log(`   Cleared: ${collection}`);
    } catch (error) {
      // Collection might not exist yet, that's fine
    }
  }

  console.log('✅ Database cleared\n');
}

async function runSeeds(): Promise<void> {
  console.log('🌱 Starting database seeding...\n');
  console.log(`📦 Connecting to: ${MONGODB_URI}\n`);

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Clear existing data
    await clearDatabase();

    // Store IDs for relationships
    const seedContext: {
      userIds: Record<string, mongoose.Types.ObjectId>;
      courseIds: Record<string, mongoose.Types.ObjectId>;
      competencyIds: Record<string, mongoose.Types.ObjectId>;
      moduleIds: Record<string, mongoose.Types.ObjectId>;
      lessonIds: Record<string, mongoose.Types.ObjectId>;
      quizItemIds: Record<string, mongoose.Types.ObjectId>;
      quizIds: Record<string, mongoose.Types.ObjectId>;
    } = {
      userIds: {},
      courseIds: {},
      competencyIds: {},
      moduleIds: {},
      lessonIds: {},
      quizItemIds: {},
      quizIds: {},
    };

    // Seed in order (respecting dependencies)
    console.log('📝 Seeding users...');
    const userResult = await seedUsers();
    seedContext.userIds = userResult.ids || {};
    console.log(`   Created ${userResult.count} users\n`);

    console.log('📚 Seeding courses...');
    const courseResult = await seedCourses();
    seedContext.courseIds = courseResult.ids || {};
    console.log(`   Created ${courseResult.count} courses\n`);

    console.log('🎯 Seeding competencies...');
    const competencyResult = await seedCompetencies(seedContext.courseIds);
    seedContext.competencyIds = competencyResult.ids || {};
    console.log(`   Created ${competencyResult.count} competencies\n`);

    console.log('📦 Seeding modules...');
    const moduleResult = await seedModules(seedContext.courseIds);
    seedContext.moduleIds = moduleResult.ids || {};
    console.log(`   Created ${moduleResult.count} modules\n`);

    console.log('📖 Seeding lessons...');
    const lessonResult = await seedLessons(seedContext.moduleIds, seedContext.competencyIds);
    seedContext.lessonIds = lessonResult.ids || {};
    console.log(`   Created ${lessonResult.count} lessons\n`);

    console.log('❓ Seeding quiz items...');
    const quizItemResult = await seedQuizItems(seedContext.competencyIds);
    seedContext.quizItemIds = quizItemResult.ids || {};
    console.log(`   Created ${quizItemResult.count} quiz items\n`);

    console.log('📋 Seeding quizzes...');
    const quizResult = await seedQuizzes(seedContext.lessonIds, seedContext.quizItemIds);
    seedContext.quizIds = quizResult.ids || {};
    console.log(`   Created ${quizResult.count} quizzes\n`);

    console.log('🏆 Seeding achievements...');
    const achievementResult = await seedAchievements();
    console.log(`   Created ${achievementResult.count} achievements\n`);

    console.log('📊 Seeding user progress (mastery, quiz attempts, gamification)...');
    const progressResult = await seedUserProgress(
      seedContext.userIds,
      seedContext.courseIds,
      seedContext.competencyIds,
      seedContext.lessonIds,
      seedContext.quizIds
    );
    console.log(`   Created ${progressResult.count} progress records\n`);

    // Summary
    console.log('='.repeat(50));
    console.log('🎉 Seeding completed successfully!\n');
    console.log('Summary:');
    console.log(`   Users: ${userResult.count}`);
    console.log(`   Courses: ${courseResult.count}`);
    console.log(`   Competencies: ${competencyResult.count}`);
    console.log(`   Modules: ${moduleResult.count}`);
    console.log(`   Lessons: ${lessonResult.count}`);
    console.log(`   Quiz Items: ${quizItemResult.count}`);
    console.log(`   Quizzes: ${quizResult.count}`);
    console.log(`   Achievements: ${achievementResult.count}`);
    console.log(`   Progress Records: ${progressResult.count}`);
    console.log('='.repeat(50));

    // Print demo credentials
    console.log('\n📋 Demo Credentials:\n');
    console.log('   Admin:');
    console.log('   - Email: admin@example.com');
    console.log('   - Password: Admin123!\n');
    console.log('   Author:');
    console.log('   - Email: author@example.com');
    console.log('   - Password: Author123!\n');
    console.log('   Learners:');
    console.log('   - Email: learner1@example.com');
    console.log('   - Password: Learner123!');
    console.log('   - Email: learner2@example.com');
    console.log('   - Password: Learner123!');
    console.log('   - Email: learner3@example.com');
    console.log('   - Password: Learner123!\n');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run if called directly
runSeeds()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
