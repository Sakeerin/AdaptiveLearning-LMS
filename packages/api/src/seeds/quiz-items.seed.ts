/**
 * Quiz Item Seed Data
 *
 * Creates quiz questions linked to competencies
 */

import mongoose from 'mongoose';
import { QuizItem } from '../models/QuizItem';

interface SeedResult {
  count: number;
  ids: Record<string, mongoose.Types.ObjectId>;
}

export async function seedQuizItems(
  competencyIds: Record<string, mongoose.Types.ObjectId>
): Promise<SeedResult> {
  const ids: Record<string, mongoose.Types.ObjectId> = {};

  const quizItems = [
    // ==================== JS Variables Questions ====================
    {
      _id: new mongoose.Types.ObjectId(),
      type: 'mcq',
      question: {
        th: 'คำสั่งใดใช้สำหรับประกาศค่าคงที่ (constant) ใน JavaScript?',
        en: 'Which keyword is used to declare a constant in JavaScript?',
      },
      options: [
        { id: 'a', text: { th: 'var', en: 'var' }, correct: false },
        { id: 'b', text: { th: 'let', en: 'let' }, correct: false },
        { id: 'c', text: { th: 'const', en: 'const' }, correct: true },
        { id: 'd', text: { th: 'constant', en: 'constant' }, correct: false },
      ],
      explanation: {
        th: 'const ใช้สำหรับประกาศค่าคงที่ที่ไม่สามารถเปลี่ยนแปลงได้หลังจากกำหนดค่าแล้ว',
        en: 'const is used to declare a constant that cannot be changed after initialization',
      },
      competencyId: competencyIds.JS_VARS,
      metadata: {
        difficulty: 1,
        tags: ['variables', 'const'],
      },
    },
    {
      _id: new mongoose.Types.ObjectId(),
      type: 'mcq',
      question: {
        th: 'ข้อใดคือความแตกต่างระหว่าง let และ var?',
        en: 'What is the main difference between let and var?',
      },
      options: [
        { id: 'a', text: { th: 'let มี block scope, var มี function scope', en: 'let has block scope, var has function scope' }, correct: true },
        { id: 'b', text: { th: 'let เร็วกว่า var', en: 'let is faster than var' }, correct: false },
        { id: 'c', text: { th: 'var ใหม่กว่า let', en: 'var is newer than let' }, correct: false },
        { id: 'd', text: { th: 'ไม่มีความแตกต่าง', en: 'No difference' }, correct: false },
      ],
      explanation: {
        th: 'let มี block scope หมายความว่าตัวแปรจะถูกจำกัดอยู่ภายใน {} ที่ประกาศ ในขณะที่ var มี function scope',
        en: 'let has block scope meaning the variable is limited to the {} where it was declared, while var has function scope',
      },
      competencyId: competencyIds.JS_VARS,
      metadata: {
        difficulty: 2,
        tags: ['variables', 'scope'],
      },
    },
    {
      _id: new mongoose.Types.ObjectId(),
      type: 'multi-select',
      question: {
        th: 'ข้อใดคือ valid variable names ใน JavaScript? (เลือกได้มากกว่า 1 ข้อ)',
        en: 'Which of the following are valid variable names in JavaScript? (Select all that apply)',
      },
      options: [
        { id: 'a', text: { th: 'myVariable', en: 'myVariable' }, correct: true },
        { id: 'b', text: { th: '_privateVar', en: '_privateVar' }, correct: true },
        { id: 'c', text: { th: '2ndPlace', en: '2ndPlace' }, correct: false },
        { id: 'd', text: { th: '$money', en: '$money' }, correct: true },
      ],
      explanation: {
        th: 'ชื่อตัวแปรต้องขึ้นต้นด้วยตัวอักษร, _ หรือ $ ไม่สามารถขึ้นต้นด้วยตัวเลขได้',
        en: 'Variable names must start with a letter, underscore (_), or dollar sign ($). They cannot start with a number.',
      },
      competencyId: competencyIds.JS_VARS,
      metadata: {
        difficulty: 2,
        tags: ['variables', 'naming'],
      },
    },

    // ==================== JS Data Types Questions ====================
    {
      _id: new mongoose.Types.ObjectId(),
      type: 'mcq',
      question: {
        th: 'typeof null ให้ผลลัพธ์เป็นอะไร?',
        en: 'What is the result of typeof null?',
      },
      options: [
        { id: 'a', text: { th: '"null"', en: '"null"' }, correct: false },
        { id: 'b', text: { th: '"undefined"', en: '"undefined"' }, correct: false },
        { id: 'c', text: { th: '"object"', en: '"object"' }, correct: true },
        { id: 'd', text: { th: '"number"', en: '"number"' }, correct: false },
      ],
      explanation: {
        th: 'นี่เป็น bug ของ JavaScript ที่มีมาตั้งแต่เริ่มต้น typeof null ให้ผลลัพธ์เป็น "object" แม้ว่า null ไม่ใช่ object จริงๆ',
        en: 'This is a historical bug in JavaScript. typeof null returns "object" even though null is not actually an object.',
      },
      competencyId: competencyIds.JS_TYPES,
      metadata: {
        difficulty: 2,
        tags: ['data-types', 'typeof'],
      },
    },
    {
      _id: new mongoose.Types.ObjectId(),
      type: 'mcq',
      question: {
        th: 'ข้อใดเป็น primitive data type ใน JavaScript?',
        en: 'Which of the following is a primitive data type in JavaScript?',
      },
      options: [
        { id: 'a', text: { th: 'Object', en: 'Object' }, correct: false },
        { id: 'b', text: { th: 'Array', en: 'Array' }, correct: false },
        { id: 'c', text: { th: 'Boolean', en: 'Boolean' }, correct: true },
        { id: 'd', text: { th: 'Function', en: 'Function' }, correct: false },
      ],
      explanation: {
        th: 'Primitive types ได้แก่: String, Number, Boolean, null, undefined, Symbol, BigInt',
        en: 'Primitive types are: String, Number, Boolean, null, undefined, Symbol, BigInt',
      },
      competencyId: competencyIds.JS_TYPES,
      metadata: {
        difficulty: 1,
        tags: ['data-types', 'primitive'],
      },
    },
    {
      _id: new mongoose.Types.ObjectId(),
      type: 'short-answer',
      question: {
        th: 'typeof "Hello" ให้ผลลัพธ์เป็นอะไร? (พิมพ์คำตอบโดยไม่ต้องใส่เครื่องหมายคำพูด)',
        en: 'What is the result of typeof "Hello"? (Type the answer without quotes)',
      },
      correctAnswer: 'string',
      explanation: {
        th: 'typeof "Hello" ให้ผลลัพธ์เป็น "string" เพราะ "Hello" เป็นข้อมูลชนิด String',
        en: 'typeof "Hello" returns "string" because "Hello" is a String data type',
      },
      competencyId: competencyIds.JS_TYPES,
      metadata: {
        difficulty: 1,
        tags: ['data-types', 'typeof'],
      },
    },

    // ==================== JS Operators Questions ====================
    {
      _id: new mongoose.Types.ObjectId(),
      type: 'mcq',
      question: {
        th: '5 == "5" ให้ผลลัพธ์เป็นอะไร?',
        en: 'What is the result of 5 == "5"?',
      },
      options: [
        { id: 'a', text: { th: 'true', en: 'true' }, correct: true },
        { id: 'b', text: { th: 'false', en: 'false' }, correct: false },
        { id: 'c', text: { th: 'undefined', en: 'undefined' }, correct: false },
        { id: 'd', text: { th: 'Error', en: 'Error' }, correct: false },
      ],
      explanation: {
        th: '== (loose equality) จะทำการ type coercion ก่อนเปรียบเทียบ ทำให้ 5 == "5" เป็น true',
        en: '== (loose equality) performs type coercion before comparison, so 5 == "5" is true',
      },
      competencyId: competencyIds.JS_OPS,
      metadata: {
        difficulty: 2,
        tags: ['operators', 'comparison'],
      },
    },
    {
      _id: new mongoose.Types.ObjectId(),
      type: 'mcq',
      question: {
        th: '5 === "5" ให้ผลลัพธ์เป็นอะไร?',
        en: 'What is the result of 5 === "5"?',
      },
      options: [
        { id: 'a', text: { th: 'true', en: 'true' }, correct: false },
        { id: 'b', text: { th: 'false', en: 'false' }, correct: true },
        { id: 'c', text: { th: 'undefined', en: 'undefined' }, correct: false },
        { id: 'd', text: { th: 'Error', en: 'Error' }, correct: false },
      ],
      explanation: {
        th: '=== (strict equality) เปรียบเทียบทั้งค่าและชนิดข้อมูล 5 เป็น number แต่ "5" เป็น string จึงเป็น false',
        en: '=== (strict equality) compares both value and type. 5 is a number but "5" is a string, so it\'s false',
      },
      competencyId: competencyIds.JS_OPS,
      metadata: {
        difficulty: 2,
        tags: ['operators', 'strict-equality'],
      },
    },
    {
      _id: new mongoose.Types.ObjectId(),
      type: 'mcq',
      question: {
        th: '10 % 3 ให้ผลลัพธ์เป็นอะไร?',
        en: 'What is the result of 10 % 3?',
      },
      options: [
        { id: 'a', text: { th: '3', en: '3' }, correct: false },
        { id: 'b', text: { th: '1', en: '1' }, correct: true },
        { id: 'c', text: { th: '3.33', en: '3.33' }, correct: false },
        { id: 'd', text: { th: '0', en: '0' }, correct: false },
      ],
      explanation: {
        th: '% (modulus) คือตัวดำเนินการหารเอาเศษ 10 หาร 3 ได้ 3 เศษ 1',
        en: '% (modulus) returns the remainder. 10 divided by 3 is 3 with remainder 1',
      },
      competencyId: competencyIds.JS_OPS,
      metadata: {
        difficulty: 1,
        tags: ['operators', 'arithmetic'],
      },
    },

    // ==================== JS Conditionals Questions ====================
    {
      _id: new mongoose.Types.ObjectId(),
      type: 'mcq',
      question: {
        th: 'ผลลัพธ์ของ: true && false || true คืออะไร?',
        en: 'What is the result of: true && false || true?',
      },
      options: [
        { id: 'a', text: { th: 'true', en: 'true' }, correct: true },
        { id: 'b', text: { th: 'false', en: 'false' }, correct: false },
        { id: 'c', text: { th: 'undefined', en: 'undefined' }, correct: false },
        { id: 'd', text: { th: 'Error', en: 'Error' }, correct: false },
      ],
      explanation: {
        th: 'เรียงลำดับความสำคัญ: (true && false) = false, จากนั้น false || true = true',
        en: 'Order of operations: (true && false) = false, then false || true = true',
      },
      competencyId: competencyIds.JS_COND,
      metadata: {
        difficulty: 3,
        tags: ['conditionals', 'logical'],
      },
    },
    {
      _id: new mongoose.Types.ObjectId(),
      type: 'mcq',
      question: {
        th: 'ternary operator ใดถูกต้อง?',
        en: 'Which ternary operator is correct?',
      },
      options: [
        { id: 'a', text: { th: 'condition ? true : false', en: 'condition ? true : false' }, correct: true },
        { id: 'b', text: { th: 'condition : true ? false', en: 'condition : true ? false' }, correct: false },
        { id: 'c', text: { th: '? condition : true false', en: '? condition : true false' }, correct: false },
        { id: 'd', text: { th: 'condition ?? true : false', en: 'condition ?? true : false' }, correct: false },
      ],
      explanation: {
        th: 'รูปแบบของ ternary operator คือ: condition ? valueIfTrue : valueIfFalse',
        en: 'The syntax of ternary operator is: condition ? valueIfTrue : valueIfFalse',
      },
      competencyId: competencyIds.JS_COND,
      metadata: {
        difficulty: 2,
        tags: ['conditionals', 'ternary'],
      },
    },

    // ==================== JS Loops Questions ====================
    {
      _id: new mongoose.Types.ObjectId(),
      type: 'mcq',
      question: {
        th: 'for loop นี้จะวนกี่รอบ? for (let i = 0; i < 5; i++)',
        en: 'How many times will this for loop run? for (let i = 0; i < 5; i++)',
      },
      options: [
        { id: 'a', text: { th: '4 รอบ', en: '4 times' }, correct: false },
        { id: 'b', text: { th: '5 รอบ', en: '5 times' }, correct: true },
        { id: 'c', text: { th: '6 รอบ', en: '6 times' }, correct: false },
        { id: 'd', text: { th: 'ไม่มีที่สิ้นสุด', en: 'Infinite' }, correct: false },
      ],
      explanation: {
        th: 'i เริ่มที่ 0 และวนจนถึง 4 (i < 5) รวม 5 รอบ: 0, 1, 2, 3, 4',
        en: 'i starts at 0 and runs until 4 (i < 5), total 5 iterations: 0, 1, 2, 3, 4',
      },
      competencyId: competencyIds.JS_LOOPS,
      metadata: {
        difficulty: 1,
        tags: ['loops', 'for'],
      },
    },
    {
      _id: new mongoose.Types.ObjectId(),
      type: 'mcq',
      question: {
        th: 'คำสั่งใดใช้หยุดการทำงานของ loop ทันที?',
        en: 'Which keyword is used to immediately stop a loop?',
      },
      options: [
        { id: 'a', text: { th: 'continue', en: 'continue' }, correct: false },
        { id: 'b', text: { th: 'stop', en: 'stop' }, correct: false },
        { id: 'c', text: { th: 'break', en: 'break' }, correct: true },
        { id: 'd', text: { th: 'exit', en: 'exit' }, correct: false },
      ],
      explanation: {
        th: 'break ใช้หยุด loop ทันที ส่วน continue ใช้ข้ามไปยังรอบถัดไป',
        en: 'break stops the loop immediately, while continue skips to the next iteration',
      },
      competencyId: competencyIds.JS_LOOPS,
      metadata: {
        difficulty: 1,
        tags: ['loops', 'break'],
      },
    },

    // ==================== JS Functions Questions ====================
    {
      _id: new mongoose.Types.ObjectId(),
      type: 'mcq',
      question: {
        th: 'Arrow function ใดเขียนถูกต้อง?',
        en: 'Which arrow function is correct?',
      },
      options: [
        { id: 'a', text: { th: 'const add = (a, b) => a + b', en: 'const add = (a, b) => a + b' }, correct: true },
        { id: 'b', text: { th: 'const add = (a, b) -> a + b', en: 'const add = (a, b) -> a + b' }, correct: false },
        { id: 'c', text: { th: 'const add = (a, b) >> a + b', en: 'const add = (a, b) >> a + b' }, correct: false },
        { id: 'd', text: { th: 'const add => (a, b) a + b', en: 'const add => (a, b) a + b' }, correct: false },
      ],
      explanation: {
        th: 'Arrow function ใช้ => และสามารถละเว้น {} และ return ได้ถ้ามีแค่ expression เดียว',
        en: 'Arrow functions use => and can omit {} and return for single expression',
      },
      competencyId: competencyIds.JS_FUNC,
      metadata: {
        difficulty: 2,
        tags: ['functions', 'arrow'],
      },
    },
    {
      _id: new mongoose.Types.ObjectId(),
      type: 'mcq',
      question: {
        th: 'ค่า default parameter คืออะไรใน: function greet(name = "World") {}',
        en: 'What is the default parameter in: function greet(name = "World") {}',
      },
      options: [
        { id: 'a', text: { th: 'greet', en: 'greet' }, correct: false },
        { id: 'b', text: { th: 'name', en: 'name' }, correct: false },
        { id: 'c', text: { th: '"World"', en: '"World"' }, correct: true },
        { id: 'd', text: { th: 'function', en: 'function' }, correct: false },
      ],
      explanation: {
        th: '"World" เป็นค่า default ที่จะถูกใช้ถ้าไม่ได้ส่ง argument เข้ามา',
        en: '"World" is the default value that will be used if no argument is passed',
      },
      competencyId: competencyIds.JS_FUNC,
      metadata: {
        difficulty: 1,
        tags: ['functions', 'default-params'],
      },
    },
    {
      _id: new mongoose.Types.ObjectId(),
      type: 'multi-select',
      question: {
        th: 'ข้อใดเป็นวิธีการประกาศฟังก์ชันที่ถูกต้อง? (เลือกได้มากกว่า 1 ข้อ)',
        en: 'Which are valid ways to declare a function? (Select all that apply)',
      },
      options: [
        { id: 'a', text: { th: 'function foo() {}', en: 'function foo() {}' }, correct: true },
        { id: 'b', text: { th: 'const foo = function() {}', en: 'const foo = function() {}' }, correct: true },
        { id: 'c', text: { th: 'const foo = () => {}', en: 'const foo = () => {}' }, correct: true },
        { id: 'd', text: { th: 'def foo(): {}', en: 'def foo(): {}' }, correct: false },
      ],
      explanation: {
        th: 'JavaScript มี 3 วิธีหลักในการประกาศฟังก์ชัน: function declaration, function expression, และ arrow function',
        en: 'JavaScript has 3 main ways to declare functions: function declaration, function expression, and arrow function',
      },
      competencyId: competencyIds.JS_FUNC,
      metadata: {
        difficulty: 2,
        tags: ['functions', 'declaration'],
      },
    },
  ];

  // Insert quiz items
  const createdItems = await QuizItem.insertMany(quizItems);

  // Map quiz item IDs
  createdItems.forEach((item, index) => {
    ids[`quiz_item_${index}`] = item._id;
  });

  return {
    count: createdItems.length,
    ids,
  };
}
