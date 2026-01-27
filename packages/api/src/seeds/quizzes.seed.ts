/**
 * Quiz Seed Data
 *
 * Creates quizzes linked to lessons and quiz items
 */

import mongoose from 'mongoose';
import { Quiz } from '../models/Quiz';

interface SeedResult {
  count: number;
  ids: Record<string, mongoose.Types.ObjectId>;
}

export async function seedQuizzes(
  lessonIds: Record<string, mongoose.Types.ObjectId>,
  quizItemIds: Record<string, mongoose.Types.ObjectId>
): Promise<SeedResult> {
  const ids: Record<string, mongoose.Types.ObjectId> = {};

  // Get quiz lesson IDs (lessons with type: 'quiz')
  // Based on lessons.seed.ts, quiz lessons are:
  // - lesson_10: Variables quiz
  // - lesson_11: Control flow quiz
  // - lesson_12: Functions quiz

  const quizItems = Object.values(quizItemIds);

  const quizzes = [
    {
      _id: new mongoose.Types.ObjectId(),
      lessonId: lessonIds.lesson_10, // Variables quiz lesson
      title: {
        th: 'แบบทดสอบ: ตัวแปรและชนิดข้อมูล',
        en: 'Quiz: Variables and Data Types',
      },
      config: {
        itemCount: 5,
        timeLimit: 10, // 10 minutes
        attempts: 3,
        randomize: true,
        partialCredit: false,
      },
      items: quizItems.slice(0, 6), // First 6 items (vars and types)
    },
    {
      _id: new mongoose.Types.ObjectId(),
      lessonId: lessonIds.lesson_11, // Control flow quiz lesson
      title: {
        th: 'แบบทดสอบ: การควบคุมการทำงาน',
        en: 'Quiz: Control Flow',
      },
      config: {
        itemCount: 5,
        timeLimit: 15, // 15 minutes
        attempts: 3,
        randomize: true,
        partialCredit: false,
      },
      items: quizItems.slice(6, 12), // Items 6-11 (operators, conditionals, loops)
    },
    {
      _id: new mongoose.Types.ObjectId(),
      lessonId: lessonIds.lesson_12, // Functions quiz lesson
      title: {
        th: 'แบบทดสอบ: ฟังก์ชัน',
        en: 'Quiz: Functions',
      },
      config: {
        itemCount: 3,
        timeLimit: 10, // 10 minutes
        attempts: 3,
        randomize: true,
        partialCredit: false,
      },
      items: quizItems.slice(12, 16), // Items 12-15 (functions)
    },
  ];

  // Filter out quizzes with missing lesson IDs
  const validQuizzes = quizzes.filter(quiz => quiz.lessonId);

  if (validQuizzes.length === 0) {
    console.log('   Warning: No valid quiz lessons found, creating placeholder quizzes');
    return { count: 0, ids: {} };
  }

  // Insert quizzes
  const createdQuizzes = await Quiz.insertMany(validQuizzes);

  // Map quiz IDs
  createdQuizzes.forEach((quiz, index) => {
    ids[`quiz_${index}`] = quiz._id;
  });

  return {
    count: createdQuizzes.length,
    ids,
  };
}
