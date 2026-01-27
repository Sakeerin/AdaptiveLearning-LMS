/**
 * Course Seed Data
 *
 * Creates demo courses for the LMS
 */

import mongoose from 'mongoose';
import { Course } from '../models/Course';

interface SeedResult {
  count: number;
  ids: Record<string, mongoose.Types.ObjectId>;
}

export async function seedCourses(): Promise<SeedResult> {
  const ids: Record<string, mongoose.Types.ObjectId> = {};

  const courses = [
    {
      _id: new mongoose.Types.ObjectId(),
      slug: 'javascript-fundamentals',
      title: {
        th: 'พื้นฐาน JavaScript',
        en: 'JavaScript Fundamentals',
      },
      description: {
        th: 'เรียนรู้พื้นฐานการเขียนโปรแกรม JavaScript ตั้งแต่เริ่มต้น ครอบคลุมตัวแปร ฟังก์ชัน เงื่อนไข ลูป และอื่นๆ อีกมากมาย',
        en: 'Learn the fundamentals of JavaScript programming from scratch. Covers variables, functions, conditionals, loops, and more.',
      },
      published: true,
      metadata: {
        difficulty: 1,
        estimatedHours: 20,
        tags: ['javascript', 'programming', 'beginner', 'web'],
      },
    },
    {
      _id: new mongoose.Types.ObjectId(),
      slug: 'typescript-essentials',
      title: {
        th: 'TypeScript สำหรับผู้เริ่มต้น',
        en: 'TypeScript Essentials',
      },
      description: {
        th: 'เรียนรู้ TypeScript และการใช้งาน Type System เพื่อเขียนโค้ดที่ปลอดภัยและมีประสิทธิภาพมากขึ้น',
        en: 'Learn TypeScript and its type system to write safer and more efficient code.',
      },
      published: true,
      metadata: {
        difficulty: 2,
        estimatedHours: 15,
        tags: ['typescript', 'javascript', 'programming', 'intermediate'],
      },
    },
    {
      _id: new mongoose.Types.ObjectId(),
      slug: 'react-development',
      title: {
        th: 'พัฒนาเว็บด้วย React',
        en: 'React Web Development',
      },
      description: {
        th: 'เรียนรู้การสร้างเว็บแอปพลิเคชันด้วย React รวมถึง Hooks, State Management และ Best Practices',
        en: 'Learn to build modern web applications with React, including Hooks, State Management, and Best Practices.',
      },
      published: true,
      metadata: {
        difficulty: 3,
        estimatedHours: 30,
        tags: ['react', 'javascript', 'frontend', 'web'],
      },
    },
    {
      _id: new mongoose.Types.ObjectId(),
      slug: 'nodejs-backend',
      title: {
        th: 'พัฒนา Backend ด้วย Node.js',
        en: 'Node.js Backend Development',
      },
      description: {
        th: 'เรียนรู้การสร้าง RESTful API และเซิร์ฟเวอร์ด้วย Node.js และ Express รวมถึงการเชื่อมต่อฐานข้อมูล',
        en: 'Learn to build RESTful APIs and servers with Node.js and Express, including database integration.',
      },
      published: true,
      metadata: {
        difficulty: 3,
        estimatedHours: 25,
        tags: ['nodejs', 'backend', 'api', 'express', 'mongodb'],
      },
    },
    {
      _id: new mongoose.Types.ObjectId(),
      slug: 'python-basics',
      title: {
        th: 'Python พื้นฐาน',
        en: 'Python Basics',
      },
      description: {
        th: 'เริ่มต้นเรียนรู้การเขียนโปรแกรมด้วย Python ภาษาที่ง่ายและเหมาะสำหรับผู้เริ่มต้น',
        en: 'Start learning programming with Python, an easy and beginner-friendly language.',
      },
      published: true,
      metadata: {
        difficulty: 1,
        estimatedHours: 15,
        tags: ['python', 'programming', 'beginner'],
      },
    },
    {
      _id: new mongoose.Types.ObjectId(),
      slug: 'data-structures-algorithms',
      title: {
        th: 'โครงสร้างข้อมูลและอัลกอริทึม',
        en: 'Data Structures & Algorithms',
      },
      description: {
        th: 'เรียนรู้โครงสร้างข้อมูลและอัลกอริทึมที่สำคัญ เพื่อเพิ่มประสิทธิภาพในการแก้ปัญหา',
        en: 'Learn essential data structures and algorithms to improve your problem-solving skills.',
      },
      published: true,
      metadata: {
        difficulty: 4,
        estimatedHours: 40,
        tags: ['algorithms', 'data-structures', 'computer-science', 'advanced'],
      },
    },
    {
      _id: new mongoose.Types.ObjectId(),
      slug: 'git-version-control',
      title: {
        th: 'การใช้ Git และ Version Control',
        en: 'Git & Version Control',
      },
      description: {
        th: 'เรียนรู้การใช้ Git สำหรับจัดการ Version Control รวมถึง Branching, Merging และการทำงานร่วมกับทีม',
        en: 'Learn Git for version control, including branching, merging, and team collaboration.',
      },
      published: true,
      metadata: {
        difficulty: 2,
        estimatedHours: 8,
        tags: ['git', 'version-control', 'collaboration', 'tools'],
      },
    },
    {
      _id: new mongoose.Types.ObjectId(),
      slug: 'web-security-fundamentals',
      title: {
        th: 'พื้นฐานความปลอดภัยเว็บ',
        en: 'Web Security Fundamentals',
      },
      description: {
        th: 'เรียนรู้เกี่ยวกับความปลอดภัยในการพัฒนาเว็บ รวมถึง OWASP Top 10 และวิธีป้องกันการโจมตี',
        en: 'Learn about web security, including OWASP Top 10 and how to prevent common attacks.',
      },
      published: false, // Draft course
      metadata: {
        difficulty: 4,
        estimatedHours: 20,
        tags: ['security', 'web', 'owasp', 'advanced'],
      },
    },
  ];

  // Insert courses
  const createdCourses = await Course.insertMany(courses);

  // Map course IDs by slug for reference
  createdCourses.forEach((course) => {
    const key = course.slug.replace(/-/g, '_');
    ids[key] = course._id;
  });

  return {
    count: createdCourses.length,
    ids,
  };
}
