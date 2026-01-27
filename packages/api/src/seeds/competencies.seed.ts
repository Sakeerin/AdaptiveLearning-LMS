/**
 * Competency Seed Data
 *
 * Creates competencies (skills) for courses with prerequisite relationships
 */

import mongoose from 'mongoose';
import { Competency } from '../models/Competency';

interface SeedResult {
  count: number;
  ids: Record<string, mongoose.Types.ObjectId>;
}

export async function seedCompetencies(
  courseIds: Record<string, mongoose.Types.ObjectId>
): Promise<SeedResult> {
  const ids: Record<string, mongoose.Types.ObjectId> = {};

  // Generate IDs first for prerequisite references
  const genId = () => new mongoose.Types.ObjectId();

  // JavaScript Fundamentals competencies
  const jsVarsId = genId();
  const jsDataTypesId = genId();
  const jsOperatorsId = genId();
  const jsConditionalsId = genId();
  const jsLoopsId = genId();
  const jsFunctionsId = genId();
  const jsArraysId = genId();
  const jsObjectsId = genId();
  const jsAsyncId = genId();
  const jsDomId = genId();

  // TypeScript competencies
  const tsBasicsId = genId();
  const tsTypesId = genId();
  const tsInterfacesId = genId();
  const tsGenericsId = genId();

  // React competencies
  const reactComponentsId = genId();
  const reactPropsId = genId();
  const reactStateId = genId();
  const reactHooksId = genId();
  const reactRoutingId = genId();

  // Node.js competencies
  const nodeBasicsId = genId();
  const nodeExpressId = genId();
  const nodeMiddlewareId = genId();
  const nodeDbId = genId();
  const nodeAuthId = genId();

  const competencies = [
    // ==================== JavaScript Fundamentals ====================
    {
      _id: jsVarsId,
      code: 'JS-VARS',
      name: {
        th: 'ตัวแปรและค่าคงที่',
        en: 'Variables and Constants',
      },
      description: {
        th: 'เข้าใจการประกาศและใช้งานตัวแปร var, let, const',
        en: 'Understand declaring and using variables with var, let, const',
      },
      courseId: courseIds.javascript_fundamentals,
      prerequisites: [],
      metadata: {
        domain: 'javascript',
        difficulty: 1,
      },
    },
    {
      _id: jsDataTypesId,
      code: 'JS-TYPES',
      name: {
        th: 'ชนิดข้อมูล',
        en: 'Data Types',
      },
      description: {
        th: 'เข้าใจชนิดข้อมูลใน JavaScript: String, Number, Boolean, null, undefined',
        en: 'Understand JavaScript data types: String, Number, Boolean, null, undefined',
      },
      courseId: courseIds.javascript_fundamentals,
      prerequisites: [jsVarsId],
      metadata: {
        domain: 'javascript',
        difficulty: 1,
      },
    },
    {
      _id: jsOperatorsId,
      code: 'JS-OPS',
      name: {
        th: 'ตัวดำเนินการ',
        en: 'Operators',
      },
      description: {
        th: 'เข้าใจตัวดำเนินการทางคณิตศาสตร์ การเปรียบเทียบ และตรรกะ',
        en: 'Understand arithmetic, comparison, and logical operators',
      },
      courseId: courseIds.javascript_fundamentals,
      prerequisites: [jsDataTypesId],
      metadata: {
        domain: 'javascript',
        difficulty: 1,
      },
    },
    {
      _id: jsConditionalsId,
      code: 'JS-COND',
      name: {
        th: 'เงื่อนไขและการตัดสินใจ',
        en: 'Conditionals and Decision Making',
      },
      description: {
        th: 'เข้าใจ if, else, switch และการใช้ ternary operator',
        en: 'Understand if, else, switch statements and ternary operator',
      },
      courseId: courseIds.javascript_fundamentals,
      prerequisites: [jsOperatorsId],
      metadata: {
        domain: 'javascript',
        difficulty: 2,
      },
    },
    {
      _id: jsLoopsId,
      code: 'JS-LOOPS',
      name: {
        th: 'การวนซ้ำ',
        en: 'Loops',
      },
      description: {
        th: 'เข้าใจ for, while, do-while และ for...of, for...in',
        en: 'Understand for, while, do-while and for...of, for...in loops',
      },
      courseId: courseIds.javascript_fundamentals,
      prerequisites: [jsConditionalsId],
      metadata: {
        domain: 'javascript',
        difficulty: 2,
      },
    },
    {
      _id: jsFunctionsId,
      code: 'JS-FUNC',
      name: {
        th: 'ฟังก์ชัน',
        en: 'Functions',
      },
      description: {
        th: 'เข้าใจการสร้างและใช้งานฟังก์ชัน รวมถึง Arrow Functions',
        en: 'Understand creating and using functions, including Arrow Functions',
      },
      courseId: courseIds.javascript_fundamentals,
      prerequisites: [jsLoopsId],
      metadata: {
        domain: 'javascript',
        difficulty: 2,
      },
    },
    {
      _id: jsArraysId,
      code: 'JS-ARRAYS',
      name: {
        th: 'อาร์เรย์',
        en: 'Arrays',
      },
      description: {
        th: 'เข้าใจการใช้งาน Array และ Array Methods เช่น map, filter, reduce',
        en: 'Understand Arrays and Array Methods like map, filter, reduce',
      },
      courseId: courseIds.javascript_fundamentals,
      prerequisites: [jsFunctionsId],
      metadata: {
        domain: 'javascript',
        difficulty: 3,
      },
    },
    {
      _id: jsObjectsId,
      code: 'JS-OBJ',
      name: {
        th: 'ออบเจ็กต์',
        en: 'Objects',
      },
      description: {
        th: 'เข้าใจการสร้างและจัดการ Object รวมถึง Destructuring',
        en: 'Understand creating and managing Objects, including Destructuring',
      },
      courseId: courseIds.javascript_fundamentals,
      prerequisites: [jsArraysId],
      metadata: {
        domain: 'javascript',
        difficulty: 3,
      },
    },
    {
      _id: jsAsyncId,
      code: 'JS-ASYNC',
      name: {
        th: 'การทำงานแบบ Asynchronous',
        en: 'Asynchronous JavaScript',
      },
      description: {
        th: 'เข้าใจ Callbacks, Promises และ async/await',
        en: 'Understand Callbacks, Promises, and async/await',
      },
      courseId: courseIds.javascript_fundamentals,
      prerequisites: [jsObjectsId],
      metadata: {
        domain: 'javascript',
        difficulty: 4,
      },
    },
    {
      _id: jsDomId,
      code: 'JS-DOM',
      name: {
        th: 'การจัดการ DOM',
        en: 'DOM Manipulation',
      },
      description: {
        th: 'เข้าใจการเข้าถึงและจัดการ Document Object Model',
        en: 'Understand accessing and manipulating the Document Object Model',
      },
      courseId: courseIds.javascript_fundamentals,
      prerequisites: [jsObjectsId],
      metadata: {
        domain: 'javascript',
        difficulty: 3,
      },
    },

    // ==================== TypeScript Essentials ====================
    {
      _id: tsBasicsId,
      code: 'TS-BASICS',
      name: {
        th: 'พื้นฐาน TypeScript',
        en: 'TypeScript Basics',
      },
      description: {
        th: 'เข้าใจพื้นฐานของ TypeScript และการติดตั้ง',
        en: 'Understand TypeScript basics and installation',
      },
      courseId: courseIds.typescript_essentials,
      prerequisites: [], // Assumes JS knowledge
      metadata: {
        domain: 'typescript',
        difficulty: 2,
      },
    },
    {
      _id: tsTypesId,
      code: 'TS-TYPES',
      name: {
        th: 'Type Annotations',
        en: 'Type Annotations',
      },
      description: {
        th: 'เข้าใจการใช้ Type Annotations สำหรับตัวแปรและฟังก์ชัน',
        en: 'Understand using Type Annotations for variables and functions',
      },
      courseId: courseIds.typescript_essentials,
      prerequisites: [tsBasicsId],
      metadata: {
        domain: 'typescript',
        difficulty: 2,
      },
    },
    {
      _id: tsInterfacesId,
      code: 'TS-INTERFACE',
      name: {
        th: 'Interfaces และ Types',
        en: 'Interfaces and Types',
      },
      description: {
        th: 'เข้าใจการสร้างและใช้งาน Interfaces และ Type Aliases',
        en: 'Understand creating and using Interfaces and Type Aliases',
      },
      courseId: courseIds.typescript_essentials,
      prerequisites: [tsTypesId],
      metadata: {
        domain: 'typescript',
        difficulty: 3,
      },
    },
    {
      _id: tsGenericsId,
      code: 'TS-GENERICS',
      name: {
        th: 'Generics',
        en: 'Generics',
      },
      description: {
        th: 'เข้าใจการใช้งาน Generics เพื่อสร้างโค้ดที่ยืดหยุ่น',
        en: 'Understand using Generics to create flexible code',
      },
      courseId: courseIds.typescript_essentials,
      prerequisites: [tsInterfacesId],
      metadata: {
        domain: 'typescript',
        difficulty: 4,
      },
    },

    // ==================== React Development ====================
    {
      _id: reactComponentsId,
      code: 'REACT-COMP',
      name: {
        th: 'React Components',
        en: 'React Components',
      },
      description: {
        th: 'เข้าใจการสร้าง Functional Components และ JSX',
        en: 'Understand creating Functional Components and JSX',
      },
      courseId: courseIds.react_development,
      prerequisites: [],
      metadata: {
        domain: 'react',
        difficulty: 2,
      },
    },
    {
      _id: reactPropsId,
      code: 'REACT-PROPS',
      name: {
        th: 'Props และการส่งข้อมูล',
        en: 'Props and Data Passing',
      },
      description: {
        th: 'เข้าใจการใช้ Props ส่งข้อมูลระหว่าง Components',
        en: 'Understand using Props to pass data between Components',
      },
      courseId: courseIds.react_development,
      prerequisites: [reactComponentsId],
      metadata: {
        domain: 'react',
        difficulty: 2,
      },
    },
    {
      _id: reactStateId,
      code: 'REACT-STATE',
      name: {
        th: 'State Management',
        en: 'State Management',
      },
      description: {
        th: 'เข้าใจการจัดการ State ใน React',
        en: 'Understand State management in React',
      },
      courseId: courseIds.react_development,
      prerequisites: [reactPropsId],
      metadata: {
        domain: 'react',
        difficulty: 3,
      },
    },
    {
      _id: reactHooksId,
      code: 'REACT-HOOKS',
      name: {
        th: 'React Hooks',
        en: 'React Hooks',
      },
      description: {
        th: 'เข้าใจ useState, useEffect, useContext และ Custom Hooks',
        en: 'Understand useState, useEffect, useContext and Custom Hooks',
      },
      courseId: courseIds.react_development,
      prerequisites: [reactStateId],
      metadata: {
        domain: 'react',
        difficulty: 3,
      },
    },
    {
      _id: reactRoutingId,
      code: 'REACT-ROUTE',
      name: {
        th: 'React Router',
        en: 'React Router',
      },
      description: {
        th: 'เข้าใจการทำ Routing และ Navigation ใน React',
        en: 'Understand Routing and Navigation in React applications',
      },
      courseId: courseIds.react_development,
      prerequisites: [reactHooksId],
      metadata: {
        domain: 'react',
        difficulty: 3,
      },
    },

    // ==================== Node.js Backend ====================
    {
      _id: nodeBasicsId,
      code: 'NODE-BASICS',
      name: {
        th: 'พื้นฐาน Node.js',
        en: 'Node.js Basics',
      },
      description: {
        th: 'เข้าใจพื้นฐาน Node.js, npm และการสร้างโปรเจกต์',
        en: 'Understand Node.js basics, npm, and project creation',
      },
      courseId: courseIds.nodejs_backend,
      prerequisites: [],
      metadata: {
        domain: 'nodejs',
        difficulty: 2,
      },
    },
    {
      _id: nodeExpressId,
      code: 'NODE-EXPRESS',
      name: {
        th: 'Express Framework',
        en: 'Express Framework',
      },
      description: {
        th: 'เข้าใจการใช้ Express สร้าง Web Server และ REST API',
        en: 'Understand using Express to build Web Servers and REST APIs',
      },
      courseId: courseIds.nodejs_backend,
      prerequisites: [nodeBasicsId],
      metadata: {
        domain: 'nodejs',
        difficulty: 2,
      },
    },
    {
      _id: nodeMiddlewareId,
      code: 'NODE-MW',
      name: {
        th: 'Middleware',
        en: 'Middleware',
      },
      description: {
        th: 'เข้าใจการใช้และสร้าง Middleware ใน Express',
        en: 'Understand using and creating Middleware in Express',
      },
      courseId: courseIds.nodejs_backend,
      prerequisites: [nodeExpressId],
      metadata: {
        domain: 'nodejs',
        difficulty: 3,
      },
    },
    {
      _id: nodeDbId,
      code: 'NODE-DB',
      name: {
        th: 'Database Integration',
        en: 'Database Integration',
      },
      description: {
        th: 'เข้าใจการเชื่อมต่อ MongoDB ด้วย Mongoose',
        en: 'Understand connecting MongoDB with Mongoose',
      },
      courseId: courseIds.nodejs_backend,
      prerequisites: [nodeMiddlewareId],
      metadata: {
        domain: 'nodejs',
        difficulty: 3,
      },
    },
    {
      _id: nodeAuthId,
      code: 'NODE-AUTH',
      name: {
        th: 'Authentication',
        en: 'Authentication',
      },
      description: {
        th: 'เข้าใจการทำ Authentication ด้วย JWT',
        en: 'Understand implementing Authentication with JWT',
      },
      courseId: courseIds.nodejs_backend,
      prerequisites: [nodeDbId],
      metadata: {
        domain: 'nodejs',
        difficulty: 4,
      },
    },
  ];

  // Insert competencies
  const createdCompetencies = await Competency.insertMany(competencies);

  // Map competency IDs by code for reference
  createdCompetencies.forEach((comp) => {
    ids[comp.code.replace(/-/g, '_')] = comp._id;
  });

  return {
    count: createdCompetencies.length,
    ids,
  };
}
