/**
 * Lesson Seed Data
 *
 * Creates lessons for each module with content
 */

import mongoose from 'mongoose';
import { Lesson } from '../models/Lesson';

interface SeedResult {
  count: number;
  ids: Record<string, mongoose.Types.ObjectId>;
}

export async function seedLessons(
  moduleIds: Record<string, mongoose.Types.ObjectId>,
  competencyIds: Record<string, mongoose.Types.ObjectId>
): Promise<SeedResult> {
  const ids: Record<string, mongoose.Types.ObjectId> = {};

  const lessons = [
    // ==================== JavaScript Module 0: Getting Started ====================
    {
      _id: new mongoose.Types.ObjectId(),
      moduleId: moduleIds.javascript_fundamentals_m0,
      type: 'reading',
      content: {
        th: {
          body: `# รู้จักกับ JavaScript

JavaScript เป็นภาษาโปรแกรมที่ได้รับความนิยมมากที่สุดในโลก ใช้สำหรับพัฒนาเว็บไซต์ แอปพลิเคชัน และอื่นๆ อีกมากมาย

## ทำไมต้องเรียน JavaScript?

- **เป็นภาษาหลักของเว็บ**: ทุกเว็บเบราว์เซอร์รองรับ JavaScript
- **หลากหลายการใช้งาน**: Frontend, Backend, Mobile, Desktop
- **ชุมชนใหญ่**: มีไลบรารีและเครื่องมือมากมาย

## เริ่มต้นอย่างไร?

1. เปิด Browser Developer Tools (F12)
2. ไปที่แท็บ Console
3. พิมพ์ \`console.log("Hello, World!")\`
4. กด Enter`,
        },
        en: {
          body: `# Introduction to JavaScript

JavaScript is the world's most popular programming language, used for web development, applications, and much more.

## Why Learn JavaScript?

- **Core web language**: Every web browser supports JavaScript
- **Versatile**: Frontend, Backend, Mobile, Desktop
- **Large community**: Many libraries and tools available

## Getting Started

1. Open Browser Developer Tools (F12)
2. Go to Console tab
3. Type \`console.log("Hello, World!")\`
4. Press Enter`,
        },
      },
      metadata: {
        difficulty: 1,
        estimatedMinutes: 10,
        prerequisites: [],
        tags: ['introduction', 'basics'],
        learningObjectives: ['Understand what JavaScript is', 'Set up development environment'],
        accessibility: {
          captions: '',
          transcripts: '',
        },
      },
      competencies: [competencyIds.JS_VARS],
      published: true,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      moduleId: moduleIds.javascript_fundamentals_m0,
      type: 'video',
      content: {
        th: {
          body: 'วิดีโอแนะนำการตั้งค่าสภาพแวดล้อมสำหรับเขียน JavaScript',
          videoUrl: 'https://example.com/videos/js-setup-th.mp4',
        },
        en: {
          body: 'Video tutorial on setting up JavaScript development environment',
          videoUrl: 'https://example.com/videos/js-setup-en.mp4',
        },
      },
      metadata: {
        difficulty: 1,
        estimatedMinutes: 15,
        prerequisites: [],
        tags: ['setup', 'tools'],
        learningObjectives: ['Install VS Code', 'Set up extensions'],
        accessibility: {
          captions: 'Available',
          transcripts: 'Available',
        },
      },
      competencies: [competencyIds.JS_VARS],
      published: true,
    },

    // ==================== JavaScript Module 1: Variables ====================
    {
      _id: new mongoose.Types.ObjectId(),
      moduleId: moduleIds.javascript_fundamentals_m1,
      type: 'reading',
      content: {
        th: {
          body: `# ตัวแปรใน JavaScript

ตัวแปร (Variable) คือที่เก็บข้อมูลที่สามารถเปลี่ยนแปลงค่าได้

## การประกาศตัวแปร

\`\`\`javascript
// var - วิธีเก่า (ไม่แนะนำ)
var name = "John";

// let - สำหรับค่าที่เปลี่ยนแปลงได้
let age = 25;

// const - สำหรับค่าคงที่
const PI = 3.14159;
\`\`\`

## ความแตกต่างระหว่าง let และ const

- **let**: ค่าสามารถเปลี่ยนแปลงได้
- **const**: ค่าไม่สามารถเปลี่ยนแปลงได้หลังประกาศ

## ตัวอย่างการใช้งาน

\`\`\`javascript
let score = 0;
score = score + 10; // ได้
score = 10; // ได้

const maxScore = 100;
maxScore = 200; // Error! ไม่สามารถเปลี่ยนค่า const ได้
\`\`\``,
        },
        en: {
          body: `# Variables in JavaScript

Variables are containers for storing data values that can be changed.

## Declaring Variables

\`\`\`javascript
// var - old way (not recommended)
var name = "John";

// let - for changeable values
let age = 25;

// const - for constants
const PI = 3.14159;
\`\`\`

## Difference between let and const

- **let**: Value can be changed
- **const**: Value cannot be changed after declaration

## Usage Example

\`\`\`javascript
let score = 0;
score = score + 10; // OK
score = 10; // OK

const maxScore = 100;
maxScore = 200; // Error! Cannot change const value
\`\`\``,
        },
      },
      metadata: {
        difficulty: 1,
        estimatedMinutes: 15,
        prerequisites: [],
        tags: ['variables', 'let', 'const'],
        learningObjectives: ['Understand variable declaration', 'Know difference between let and const'],
        accessibility: {
          captions: '',
          transcripts: '',
        },
      },
      competencies: [competencyIds.JS_VARS],
      published: true,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      moduleId: moduleIds.javascript_fundamentals_m1,
      type: 'reading',
      content: {
        th: {
          body: `# ชนิดข้อมูลใน JavaScript

JavaScript มีชนิดข้อมูลพื้นฐาน (Primitive Types) ดังนี้:

## 1. String (ข้อความ)

\`\`\`javascript
let greeting = "Hello";
let name = 'World';
let message = \`Hello, \${name}!\`; // Template literal
\`\`\`

## 2. Number (ตัวเลข)

\`\`\`javascript
let integer = 42;
let decimal = 3.14;
let negative = -10;
\`\`\`

## 3. Boolean (ค่าจริง/เท็จ)

\`\`\`javascript
let isActive = true;
let isLoggedIn = false;
\`\`\`

## 4. null และ undefined

\`\`\`javascript
let empty = null; // ค่าว่าง (ตั้งใจกำหนด)
let notDefined; // undefined (ยังไม่กำหนดค่า)
\`\`\`

## ตรวจสอบชนิดข้อมูลด้วย typeof

\`\`\`javascript
typeof "hello" // "string"
typeof 42 // "number"
typeof true // "boolean"
typeof undefined // "undefined"
typeof null // "object" (JavaScript bug)
\`\`\``,
        },
        en: {
          body: `# Data Types in JavaScript

JavaScript has the following primitive data types:

## 1. String

\`\`\`javascript
let greeting = "Hello";
let name = 'World';
let message = \`Hello, \${name}!\`; // Template literal
\`\`\`

## 2. Number

\`\`\`javascript
let integer = 42;
let decimal = 3.14;
let negative = -10;
\`\`\`

## 3. Boolean

\`\`\`javascript
let isActive = true;
let isLoggedIn = false;
\`\`\`

## 4. null and undefined

\`\`\`javascript
let empty = null; // intentionally empty
let notDefined; // undefined (no value assigned)
\`\`\`

## Check data type with typeof

\`\`\`javascript
typeof "hello" // "string"
typeof 42 // "number"
typeof true // "boolean"
typeof undefined // "undefined"
typeof null // "object" (JavaScript bug)
\`\`\``,
        },
      },
      metadata: {
        difficulty: 1,
        estimatedMinutes: 20,
        prerequisites: [],
        tags: ['data-types', 'string', 'number', 'boolean'],
        learningObjectives: ['Understand primitive data types', 'Use typeof operator'],
        accessibility: {
          captions: '',
          transcripts: '',
        },
      },
      competencies: [competencyIds.JS_TYPES],
      published: true,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      moduleId: moduleIds.javascript_fundamentals_m1,
      type: 'practice',
      content: {
        th: {
          body: `# แบบฝึกหัด: ตัวแปรและชนิดข้อมูล

## คำสั่ง

สร้างตัวแปรต่อไปนี้:

1. ตัวแปร \`firstName\` เก็บชื่อของคุณ
2. ตัวแปร \`lastName\` เก็บนามสกุลของคุณ
3. ตัวแปร \`age\` เก็บอายุของคุณ
4. ตัวแปร \`isStudent\` เก็บค่า true หรือ false
5. ค่าคงที่ \`BIRTH_YEAR\` เก็บปีเกิดของคุณ

## ตัวอย่างเฉลย

\`\`\`javascript
const firstName = "สมชาย";
const lastName = "ใจดี";
let age = 25;
let isStudent = true;
const BIRTH_YEAR = 1999;
\`\`\``,
        },
        en: {
          body: `# Exercise: Variables and Data Types

## Instructions

Create the following variables:

1. Variable \`firstName\` storing your first name
2. Variable \`lastName\` storing your last name
3. Variable \`age\` storing your age
4. Variable \`isStudent\` storing true or false
5. Constant \`BIRTH_YEAR\` storing your birth year

## Example Solution

\`\`\`javascript
const firstName = "John";
const lastName = "Doe";
let age = 25;
let isStudent = true;
const BIRTH_YEAR = 1999;
\`\`\``,
        },
      },
      metadata: {
        difficulty: 1,
        estimatedMinutes: 10,
        prerequisites: [],
        tags: ['practice', 'variables'],
        learningObjectives: ['Practice declaring variables', 'Apply data types'],
        accessibility: {
          captions: '',
          transcripts: '',
        },
      },
      competencies: [competencyIds.JS_VARS, competencyIds.JS_TYPES],
      published: true,
    },

    // ==================== JavaScript Module 2: Control Flow ====================
    {
      _id: new mongoose.Types.ObjectId(),
      moduleId: moduleIds.javascript_fundamentals_m2,
      type: 'reading',
      content: {
        th: {
          body: `# ตัวดำเนินการใน JavaScript

## ตัวดำเนินการทางคณิตศาสตร์

\`\`\`javascript
let a = 10, b = 3;

a + b  // 13 (บวก)
a - b  // 7 (ลบ)
a * b  // 30 (คูณ)
a / b  // 3.333... (หาร)
a % b  // 1 (หารเอาเศษ)
a ** b // 1000 (ยกกำลัง)
\`\`\`

## ตัวดำเนินการเปรียบเทียบ

\`\`\`javascript
5 == "5"   // true (เปรียบเทียบค่า)
5 === "5"  // false (เปรียบเทียบค่าและชนิด)
5 != "5"   // false
5 !== "5"  // true
5 > 3      // true
5 >= 5     // true
5 < 3      // false
\`\`\`

## ตัวดำเนินการตรรกะ

\`\`\`javascript
true && true   // true (AND)
true || false  // true (OR)
!true          // false (NOT)
\`\`\``,
        },
        en: {
          body: `# Operators in JavaScript

## Arithmetic Operators

\`\`\`javascript
let a = 10, b = 3;

a + b  // 13 (addition)
a - b  // 7 (subtraction)
a * b  // 30 (multiplication)
a / b  // 3.333... (division)
a % b  // 1 (modulus)
a ** b // 1000 (exponentiation)
\`\`\`

## Comparison Operators

\`\`\`javascript
5 == "5"   // true (loose equality)
5 === "5"  // false (strict equality)
5 != "5"   // false
5 !== "5"  // true
5 > 3      // true
5 >= 5     // true
5 < 3      // false
\`\`\`

## Logical Operators

\`\`\`javascript
true && true   // true (AND)
true || false  // true (OR)
!true          // false (NOT)
\`\`\``,
        },
      },
      metadata: {
        difficulty: 2,
        estimatedMinutes: 20,
        prerequisites: [],
        tags: ['operators', 'comparison', 'logic'],
        learningObjectives: ['Use arithmetic operators', 'Understand comparison operators'],
        accessibility: {
          captions: '',
          transcripts: '',
        },
      },
      competencies: [competencyIds.JS_OPS],
      published: true,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      moduleId: moduleIds.javascript_fundamentals_m2,
      type: 'reading',
      content: {
        th: {
          body: `# เงื่อนไข if-else

## โครงสร้าง if

\`\`\`javascript
let age = 18;

if (age >= 18) {
  console.log("คุณเป็นผู้ใหญ่");
}
\`\`\`

## โครงสร้าง if-else

\`\`\`javascript
let score = 75;

if (score >= 80) {
  console.log("เกรด A");
} else if (score >= 70) {
  console.log("เกรด B");
} else if (score >= 60) {
  console.log("เกรด C");
} else {
  console.log("เกรด F");
}
\`\`\`

## Ternary Operator

\`\`\`javascript
let age = 20;
let status = age >= 18 ? "ผู้ใหญ่" : "เด็ก";
console.log(status); // "ผู้ใหญ่"
\`\`\``,
        },
        en: {
          body: `# Conditionals: if-else

## if Statement

\`\`\`javascript
let age = 18;

if (age >= 18) {
  console.log("You are an adult");
}
\`\`\`

## if-else Statement

\`\`\`javascript
let score = 75;

if (score >= 80) {
  console.log("Grade A");
} else if (score >= 70) {
  console.log("Grade B");
} else if (score >= 60) {
  console.log("Grade C");
} else {
  console.log("Grade F");
}
\`\`\`

## Ternary Operator

\`\`\`javascript
let age = 20;
let status = age >= 18 ? "adult" : "minor";
console.log(status); // "adult"
\`\`\``,
        },
      },
      metadata: {
        difficulty: 2,
        estimatedMinutes: 25,
        prerequisites: [],
        tags: ['conditionals', 'if-else', 'ternary'],
        learningObjectives: ['Write if-else statements', 'Use ternary operator'],
        accessibility: {
          captions: '',
          transcripts: '',
        },
      },
      competencies: [competencyIds.JS_COND],
      published: true,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      moduleId: moduleIds.javascript_fundamentals_m2,
      type: 'reading',
      content: {
        th: {
          body: `# การวนซ้ำ (Loops)

## for Loop

\`\`\`javascript
for (let i = 0; i < 5; i++) {
  console.log(i); // 0, 1, 2, 3, 4
}
\`\`\`

## while Loop

\`\`\`javascript
let count = 0;
while (count < 5) {
  console.log(count);
  count++;
}
\`\`\`

## for...of (สำหรับ Array)

\`\`\`javascript
let fruits = ["apple", "banana", "orange"];
for (let fruit of fruits) {
  console.log(fruit);
}
\`\`\`

## break และ continue

\`\`\`javascript
for (let i = 0; i < 10; i++) {
  if (i === 5) break; // หยุดลูป
  if (i === 3) continue; // ข้ามรอบนี้
  console.log(i);
}
// Output: 0, 1, 2, 4
\`\`\``,
        },
        en: {
          body: `# Loops

## for Loop

\`\`\`javascript
for (let i = 0; i < 5; i++) {
  console.log(i); // 0, 1, 2, 3, 4
}
\`\`\`

## while Loop

\`\`\`javascript
let count = 0;
while (count < 5) {
  console.log(count);
  count++;
}
\`\`\`

## for...of (for Arrays)

\`\`\`javascript
let fruits = ["apple", "banana", "orange"];
for (let fruit of fruits) {
  console.log(fruit);
}
\`\`\`

## break and continue

\`\`\`javascript
for (let i = 0; i < 10; i++) {
  if (i === 5) break; // stop loop
  if (i === 3) continue; // skip iteration
  console.log(i);
}
// Output: 0, 1, 2, 4
\`\`\``,
        },
      },
      metadata: {
        difficulty: 2,
        estimatedMinutes: 25,
        prerequisites: [],
        tags: ['loops', 'for', 'while'],
        learningObjectives: ['Write for and while loops', 'Use break and continue'],
        accessibility: {
          captions: '',
          transcripts: '',
        },
      },
      competencies: [competencyIds.JS_LOOPS],
      published: true,
    },

    // ==================== JavaScript Module 3: Functions ====================
    {
      _id: new mongoose.Types.ObjectId(),
      moduleId: moduleIds.javascript_fundamentals_m3,
      type: 'reading',
      content: {
        th: {
          body: `# ฟังก์ชันใน JavaScript

## การประกาศฟังก์ชัน

\`\`\`javascript
// Function Declaration
function greet(name) {
  return "Hello, " + name + "!";
}

// Function Expression
const greet2 = function(name) {
  return "Hi, " + name + "!";
};

// Arrow Function
const greet3 = (name) => {
  return \`Hey, \${name}!\`;
};

// Arrow Function (แบบสั้น)
const greet4 = name => \`Yo, \${name}!\`;
\`\`\`

## Parameters และ Return

\`\`\`javascript
function add(a, b) {
  return a + b;
}

console.log(add(5, 3)); // 8

// Default Parameters
function greet(name = "World") {
  return \`Hello, \${name}!\`;
}

console.log(greet()); // "Hello, World!"
console.log(greet("John")); // "Hello, John!"
\`\`\``,
        },
        en: {
          body: `# Functions in JavaScript

## Declaring Functions

\`\`\`javascript
// Function Declaration
function greet(name) {
  return "Hello, " + name + "!";
}

// Function Expression
const greet2 = function(name) {
  return "Hi, " + name + "!";
};

// Arrow Function
const greet3 = (name) => {
  return \`Hey, \${name}!\`;
};

// Arrow Function (short form)
const greet4 = name => \`Yo, \${name}!\`;
\`\`\`

## Parameters and Return

\`\`\`javascript
function add(a, b) {
  return a + b;
}

console.log(add(5, 3)); // 8

// Default Parameters
function greet(name = "World") {
  return \`Hello, \${name}!\`;
}

console.log(greet()); // "Hello, World!"
console.log(greet("John")); // "Hello, John!"
\`\`\``,
        },
      },
      metadata: {
        difficulty: 2,
        estimatedMinutes: 30,
        prerequisites: [],
        tags: ['functions', 'arrow-functions'],
        learningObjectives: ['Create functions', 'Use arrow functions', 'Understand parameters'],
        accessibility: {
          captions: '',
          transcripts: '',
        },
      },
      competencies: [competencyIds.JS_FUNC],
      published: true,
    },

    // ==================== Quiz Lessons ====================
    {
      _id: new mongoose.Types.ObjectId(),
      moduleId: moduleIds.javascript_fundamentals_m1,
      type: 'quiz',
      content: {
        th: {
          body: 'ทดสอบความรู้เรื่องตัวแปรและชนิดข้อมูลใน JavaScript',
        },
        en: {
          body: 'Test your knowledge of variables and data types in JavaScript',
        },
      },
      metadata: {
        difficulty: 1,
        estimatedMinutes: 10,
        prerequisites: [],
        tags: ['quiz', 'variables'],
        learningObjectives: ['Assess understanding of variables'],
        accessibility: {
          captions: '',
          transcripts: '',
        },
      },
      competencies: [competencyIds.JS_VARS, competencyIds.JS_TYPES],
      published: true,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      moduleId: moduleIds.javascript_fundamentals_m2,
      type: 'quiz',
      content: {
        th: {
          body: 'ทดสอบความรู้เรื่องการควบคุมการทำงานของโปรแกรม',
        },
        en: {
          body: 'Test your knowledge of program control flow',
        },
      },
      metadata: {
        difficulty: 2,
        estimatedMinutes: 15,
        prerequisites: [],
        tags: ['quiz', 'control-flow'],
        learningObjectives: ['Assess understanding of control flow'],
        accessibility: {
          captions: '',
          transcripts: '',
        },
      },
      competencies: [competencyIds.JS_COND, competencyIds.JS_LOOPS],
      published: true,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      moduleId: moduleIds.javascript_fundamentals_m3,
      type: 'quiz',
      content: {
        th: {
          body: 'ทดสอบความรู้เรื่องฟังก์ชันใน JavaScript',
        },
        en: {
          body: 'Test your knowledge of functions in JavaScript',
        },
      },
      metadata: {
        difficulty: 2,
        estimatedMinutes: 15,
        prerequisites: [],
        tags: ['quiz', 'functions'],
        learningObjectives: ['Assess understanding of functions'],
        accessibility: {
          captions: '',
          transcripts: '',
        },
      },
      competencies: [competencyIds.JS_FUNC],
      published: true,
    },
  ];

  // Insert lessons
  const createdLessons = await Lesson.insertMany(lessons);

  // Map lesson IDs
  let lessonCounter = 0;
  createdLessons.forEach((lesson) => {
    ids[`lesson_${lessonCounter}`] = lesson._id;
    lessonCounter++;
  });

  return {
    count: createdLessons.length,
    ids,
  };
}
