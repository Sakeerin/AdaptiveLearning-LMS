/**
 * User Seed Data
 *
 * Creates demo users with different roles for testing
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';

interface SeedResult {
  count: number;
  ids: Record<string, mongoose.Types.ObjectId>;
}

export async function seedUsers(): Promise<SeedResult> {
  const ids: Record<string, mongoose.Types.ObjectId> = {};

  // Hash passwords
  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const authorPassword = await bcrypt.hash('Author123!', 10);
  const learnerPassword = await bcrypt.hash('Learner123!', 10);

  const users = [
    // Admin user
    {
      _id: new mongoose.Types.ObjectId(),
      email: 'admin@example.com',
      passwordHash: adminPassword,
      role: 'admin',
      profile: {
        displayName: 'System Administrator',
        language: 'en',
        timezone: 'Asia/Bangkok',
        learningGoals: 'Manage the learning platform',
        initialSkillLevel: 5,
        dailyTimeBudgetMinutes: 60,
        dailyReminderEnabled: false,
        leaderboardOptIn: false,
      },
    },
    // Author user
    {
      _id: new mongoose.Types.ObjectId(),
      email: 'author@example.com',
      passwordHash: authorPassword,
      role: 'author',
      profile: {
        displayName: 'Course Author',
        language: 'th',
        timezone: 'Asia/Bangkok',
        learningGoals: 'Create engaging learning content',
        initialSkillLevel: 4,
        dailyTimeBudgetMinutes: 120,
        dailyReminderEnabled: true,
        leaderboardOptIn: true,
      },
    },
    // Learner users with different progress levels
    {
      _id: new mongoose.Types.ObjectId(),
      email: 'learner1@example.com',
      passwordHash: learnerPassword,
      role: 'learner',
      profile: {
        displayName: 'Alice (Beginner)',
        language: 'th',
        timezone: 'Asia/Bangkok',
        learningGoals: 'Learn programming basics',
        initialSkillLevel: 1,
        dailyTimeBudgetMinutes: 30,
        dailyReminderEnabled: true,
        leaderboardOptIn: true,
      },
    },
    {
      _id: new mongoose.Types.ObjectId(),
      email: 'learner2@example.com',
      passwordHash: learnerPassword,
      role: 'learner',
      profile: {
        displayName: 'Bob (Intermediate)',
        language: 'en',
        timezone: 'Asia/Bangkok',
        learningGoals: 'Improve web development skills',
        initialSkillLevel: 3,
        dailyTimeBudgetMinutes: 45,
        dailyReminderEnabled: true,
        leaderboardOptIn: true,
      },
    },
    {
      _id: new mongoose.Types.ObjectId(),
      email: 'learner3@example.com',
      passwordHash: learnerPassword,
      role: 'learner',
      profile: {
        displayName: 'Charlie (Advanced)',
        language: 'th',
        timezone: 'Asia/Bangkok',
        learningGoals: 'Master advanced programming concepts',
        initialSkillLevel: 4,
        dailyTimeBudgetMinutes: 60,
        dailyReminderEnabled: false,
        leaderboardOptIn: true,
      },
    },
    // Additional learners for demo
    {
      _id: new mongoose.Types.ObjectId(),
      email: 'student1@school.edu',
      passwordHash: learnerPassword,
      role: 'learner',
      profile: {
        displayName: 'นักเรียน สมศรี',
        language: 'th',
        timezone: 'Asia/Bangkok',
        learningGoals: 'เรียนรู้การเขียนโปรแกรม',
        initialSkillLevel: 2,
        dailyTimeBudgetMinutes: 30,
        dailyReminderEnabled: true,
        leaderboardOptIn: true,
      },
    },
    {
      _id: new mongoose.Types.ObjectId(),
      email: 'student2@school.edu',
      passwordHash: learnerPassword,
      role: 'learner',
      profile: {
        displayName: 'นักเรียน สมชาย',
        language: 'th',
        timezone: 'Asia/Bangkok',
        learningGoals: 'พัฒนาทักษะ JavaScript',
        initialSkillLevel: 2,
        dailyTimeBudgetMinutes: 45,
        dailyReminderEnabled: true,
        leaderboardOptIn: false,
      },
    },
  ];

  // Insert users
  const createdUsers = await User.insertMany(users);

  // Map user IDs by email for reference
  createdUsers.forEach((user) => {
    const key = user.email.split('@')[0].replace(/[^a-z0-9]/gi, '_');
    ids[key] = user._id;
  });

  return {
    count: createdUsers.length,
    ids,
  };
}
