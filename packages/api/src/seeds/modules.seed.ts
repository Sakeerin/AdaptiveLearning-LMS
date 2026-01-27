/**
 * Module Seed Data
 *
 * Creates modules (chapters) for each course
 */

import mongoose from 'mongoose';
import { Module } from '../models/Module';

interface SeedResult {
  count: number;
  ids: Record<string, mongoose.Types.ObjectId>;
}

export async function seedModules(
  courseIds: Record<string, mongoose.Types.ObjectId>
): Promise<SeedResult> {
  const ids: Record<string, mongoose.Types.ObjectId> = {};

  const modules = [
    // ==================== JavaScript Fundamentals ====================
    {
      _id: new mongoose.Types.ObjectId(),
      courseId: courseIds.javascript_fundamentals,
      title: {
        th: 'เริ่มต้นกับ JavaScript',
        en: 'Getting Started with JavaScript',
      },
      description: {
        th: 'รู้จักกับ JavaScript และการตั้งค่าสภาพแวดล้อมการพัฒนา',
        en: 'Introduction to JavaScript and setting up your development environment',
      },
      order: 0,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      courseId: courseIds.javascript_fundamentals,
      title: {
        th: 'ตัวแปรและชนิดข้อมูล',
        en: 'Variables and Data Types',
      },
      description: {
        th: 'เรียนรู้เกี่ยวกับตัวแปร ค่าคงที่ และชนิดข้อมูลใน JavaScript',
        en: 'Learn about variables, constants, and data types in JavaScript',
      },
      order: 1,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      courseId: courseIds.javascript_fundamentals,
      title: {
        th: 'การควบคุมการทำงาน',
        en: 'Control Flow',
      },
      description: {
        th: 'เรียนรู้เงื่อนไข การวนซ้ำ และการควบคุมการทำงานของโปรแกรม',
        en: 'Learn conditionals, loops, and program flow control',
      },
      order: 2,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      courseId: courseIds.javascript_fundamentals,
      title: {
        th: 'ฟังก์ชัน',
        en: 'Functions',
      },
      description: {
        th: 'เรียนรู้การสร้างและใช้งานฟังก์ชัน',
        en: 'Learn to create and use functions',
      },
      order: 3,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      courseId: courseIds.javascript_fundamentals,
      title: {
        th: 'อาร์เรย์และออบเจ็กต์',
        en: 'Arrays and Objects',
      },
      description: {
        th: 'เรียนรู้โครงสร้างข้อมูลแบบ Array และ Object',
        en: 'Learn Array and Object data structures',
      },
      order: 4,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      courseId: courseIds.javascript_fundamentals,
      title: {
        th: 'JavaScript สมัยใหม่',
        en: 'Modern JavaScript',
      },
      description: {
        th: 'เรียนรู้ฟีเจอร์ใหม่ใน ES6+ และ Asynchronous Programming',
        en: 'Learn ES6+ features and Asynchronous Programming',
      },
      order: 5,
    },

    // ==================== TypeScript Essentials ====================
    {
      _id: new mongoose.Types.ObjectId(),
      courseId: courseIds.typescript_essentials,
      title: {
        th: 'เริ่มต้นกับ TypeScript',
        en: 'Getting Started with TypeScript',
      },
      description: {
        th: 'ทำความรู้จักกับ TypeScript และการติดตั้ง',
        en: 'Introduction to TypeScript and installation',
      },
      order: 0,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      courseId: courseIds.typescript_essentials,
      title: {
        th: 'Type System พื้นฐาน',
        en: 'Basic Type System',
      },
      description: {
        th: 'เรียนรู้ Type Annotations และ Basic Types',
        en: 'Learn Type Annotations and Basic Types',
      },
      order: 1,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      courseId: courseIds.typescript_essentials,
      title: {
        th: 'Interfaces และ Types',
        en: 'Interfaces and Types',
      },
      description: {
        th: 'เรียนรู้การสร้าง Custom Types',
        en: 'Learn to create Custom Types',
      },
      order: 2,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      courseId: courseIds.typescript_essentials,
      title: {
        th: 'Advanced Types',
        en: 'Advanced Types',
      },
      description: {
        th: 'เรียนรู้ Generics และ Advanced Type Features',
        en: 'Learn Generics and Advanced Type Features',
      },
      order: 3,
    },

    // ==================== React Development ====================
    {
      _id: new mongoose.Types.ObjectId(),
      courseId: courseIds.react_development,
      title: {
        th: 'เริ่มต้นกับ React',
        en: 'Getting Started with React',
      },
      description: {
        th: 'ทำความรู้จักกับ React และการสร้างโปรเจกต์',
        en: 'Introduction to React and project setup',
      },
      order: 0,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      courseId: courseIds.react_development,
      title: {
        th: 'Components และ JSX',
        en: 'Components and JSX',
      },
      description: {
        th: 'เรียนรู้การสร้าง Components และเขียน JSX',
        en: 'Learn to create Components and write JSX',
      },
      order: 1,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      courseId: courseIds.react_development,
      title: {
        th: 'State และ Props',
        en: 'State and Props',
      },
      description: {
        th: 'เรียนรู้การจัดการ State และส่งข้อมูลด้วย Props',
        en: 'Learn State management and data passing with Props',
      },
      order: 2,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      courseId: courseIds.react_development,
      title: {
        th: 'React Hooks',
        en: 'React Hooks',
      },
      description: {
        th: 'เรียนรู้ Hooks ที่สำคัญและการสร้าง Custom Hooks',
        en: 'Learn essential Hooks and creating Custom Hooks',
      },
      order: 3,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      courseId: courseIds.react_development,
      title: {
        th: 'Routing และ Navigation',
        en: 'Routing and Navigation',
      },
      description: {
        th: 'เรียนรู้การทำ Routing ด้วย React Router',
        en: 'Learn Routing with React Router',
      },
      order: 4,
    },

    // ==================== Node.js Backend ====================
    {
      _id: new mongoose.Types.ObjectId(),
      courseId: courseIds.nodejs_backend,
      title: {
        th: 'เริ่มต้นกับ Node.js',
        en: 'Getting Started with Node.js',
      },
      description: {
        th: 'ทำความรู้จักกับ Node.js และ npm',
        en: 'Introduction to Node.js and npm',
      },
      order: 0,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      courseId: courseIds.nodejs_backend,
      title: {
        th: 'Express Framework',
        en: 'Express Framework',
      },
      description: {
        th: 'เรียนรู้การสร้าง Web Server ด้วย Express',
        en: 'Learn to build Web Servers with Express',
      },
      order: 1,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      courseId: courseIds.nodejs_backend,
      title: {
        th: 'REST API Design',
        en: 'REST API Design',
      },
      description: {
        th: 'เรียนรู้การออกแบบและสร้าง REST API',
        en: 'Learn to design and build REST APIs',
      },
      order: 2,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      courseId: courseIds.nodejs_backend,
      title: {
        th: 'Database Integration',
        en: 'Database Integration',
      },
      description: {
        th: 'เรียนรู้การเชื่อมต่อ MongoDB',
        en: 'Learn MongoDB integration',
      },
      order: 3,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      courseId: courseIds.nodejs_backend,
      title: {
        th: 'Authentication & Security',
        en: 'Authentication & Security',
      },
      description: {
        th: 'เรียนรู้การทำ Authentication และ Security',
        en: 'Learn Authentication and Security implementation',
      },
      order: 4,
    },
  ];

  // Insert modules
  const createdModules = await Module.insertMany(modules);

  // Map module IDs for reference (by course_order)
  createdModules.forEach((module) => {
    // Find course key
    let courseKey = '';
    for (const [key, id] of Object.entries(courseIds)) {
      if (id.equals(module.courseId)) {
        courseKey = key;
        break;
      }
    }
    const key = `${courseKey}_m${module.order}`;
    ids[key] = module._id;
  });

  return {
    count: createdModules.length,
    ids,
  };
}
