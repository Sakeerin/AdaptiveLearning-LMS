import mongoose, { Schema, Document } from 'mongoose';
import { XAPIStatement as IXAPIStatement } from '@adaptive-lms/shared';

export interface IXAPIStatementDocument extends Omit<IXAPIStatement, 'id'>, Document {
  id: string; // statement.id (UUID)
}

// Actor Schema (Agent)
const XAPIActorSchema = new Schema({
  objectType: { type: String, default: 'Agent' },
  name: { type: String },
  mbox: { type: String }, // email
  account: {
    homePage: { type: String },
    name: { type: String }, // userId for privacy
  },
}, { _id: false });

// Verb Schema
const XAPIVerbSchema = new Schema({
  id: { type: String, required: true }, // URI
  display: { type: Map, of: String }, // e.g., { 'en-US': 'completed' }
}, { _id: false });

// Activity Definition Schema
const XAPIActivityDefinitionSchema = new Schema({
  name: { type: Map, of: String },
  description: { type: Map, of: String },
  type: { type: String }, // URI
}, { _id: false });

// Activity Schema (Object)
const XAPIActivitySchema = new Schema({
  id: { type: String, required: true }, // URI
  objectType: { type: String, default: 'Activity' },
  definition: { type: XAPIActivityDefinitionSchema },
}, { _id: false });

// Score Schema
const XAPIScoreSchema = new Schema({
  scaled: { type: Number, min: -1, max: 1 },
  raw: { type: Number },
  min: { type: Number },
  max: { type: Number },
}, { _id: false });

// Result Schema
const XAPIResultSchema = new Schema({
  score: { type: XAPIScoreSchema },
  success: { type: Boolean },
  completion: { type: Boolean },
  response: { type: String },
  duration: { type: String }, // ISO 8601 duration
  extensions: { type: Map, of: Schema.Types.Mixed },
}, { _id: false });

// Context Activities Schema
const XAPIContextActivitiesSchema = new Schema({
  parent: [XAPIActivitySchema],
  grouping: [XAPIActivitySchema],
  category: [XAPIActivitySchema],
  other: [XAPIActivitySchema],
}, { _id: false });

// Context Schema
const XAPIContextSchema = new Schema({
  registration: { type: String }, // UUID
  instructor: { type: XAPIActorSchema },
  team: { type: XAPIActorSchema },
  contextActivities: { type: XAPIContextActivitiesSchema },
  revision: { type: String },
  platform: { type: String },
  language: { type: String, enum: ['th', 'en'] },
  statement: { type: String }, // UUID reference to another statement
  extensions: { type: Map, of: Schema.Types.Mixed },
}, { _id: false });

// Main xAPI Statement Schema
const XAPIStatementSchema = new Schema<IXAPIStatementDocument>({
  id: {
    type: String,
    required: true,
    unique: true, // Idempotency
    validate: {
      validator: (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
      message: 'Invalid UUID format',
    },
  },
  actor: {
    type: XAPIActorSchema,
    required: true,
  },
  verb: {
    type: XAPIVerbSchema,
    required: true,
  },
  object: {
    type: XAPIActivitySchema,
    required: true,
  },
  result: {
    type: XAPIResultSchema,
  },
  context: {
    type: XAPIContextSchema,
  },
  timestamp: {
    type: String, // ISO 8601 datetime
    required: true,
  },
  stored: {
    type: String, // ISO 8601 datetime (set by LRS on storage)
    default: () => new Date().toISOString(),
  },
  authority: {
    type: XAPIActorSchema,
  },
  version: {
    type: String,
    default: '1.0.3',
  },
  attachments: {
    type: [Schema.Types.Mixed],
  },
}, {
  timestamps: false, // We use stored field instead
  collection: 'xapistatements',
});

// Indexes (CRITICAL for performance - from mongo-init.js)
XAPIStatementSchema.index({ id: 1 }, { unique: true }); // Idempotency
XAPIStatementSchema.index({ 'actor.account.name': 1 }); // User queries
XAPIStatementSchema.index({ 'actor.mbox': 1 }); // Email queries (fallback)
XAPIStatementSchema.index({ 'verb.id': 1 }); // Verb filtering
XAPIStatementSchema.index({ 'object.id': 1 }); // Activity filtering
XAPIStatementSchema.index({ timestamp: 1 }); // Time-based queries
XAPIStatementSchema.index({ stored: 1 }); // Storage time
XAPIStatementSchema.index({ 'actor.account.name': 1, 'verb.id': 1, timestamp: -1 }); // Composite for common queries

// Static method: Create statement with validation
XAPIStatementSchema.statics.createStatement = async function(statement: IXAPIStatement) {
  // Check for duplicate (idempotency)
  const existing = await this.findOne({ id: statement.id });
  if (existing) {
    return { duplicate: true, statement: existing };
  }

  // Set stored timestamp
  const doc = new this({
    ...statement,
    stored: new Date().toISOString(),
  });

  await doc.save();
  return { duplicate: false, statement: doc };
};

// Static method: Batch create statements
XAPIStatementSchema.statics.createBatch = async function(statements: IXAPIStatement[]) {
  const results = [];
  const errors = [];

  for (const statement of statements) {
    try {
      const result = await this.createStatement(statement);
      results.push(result);
    } catch (error) {
      errors.push({
        statementId: statement.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return { results, errors };
};

// Static method: Query statements with filters
XAPIStatementSchema.statics.queryStatements = async function(filters: {
  actor?: string; // actor.account.name or actor.mbox
  verb?: string; // verb.id
  activity?: string; // object.id
  since?: string; // ISO 8601 datetime
  until?: string; // ISO 8601 datetime
  limit?: number;
  offset?: number;
}) {
  const query: any = {};

  // Actor filter (support both account.name and mbox)
  if (filters.actor) {
    if (filters.actor.includes('@')) {
      query['actor.mbox'] = filters.actor;
    } else {
      query['actor.account.name'] = filters.actor;
    }
  }

  // Verb filter
  if (filters.verb) {
    query['verb.id'] = filters.verb;
  }

  // Activity filter
  if (filters.activity) {
    query['object.id'] = filters.activity;
  }

  // Time-based filters
  if (filters.since || filters.until) {
    query.timestamp = {};
    if (filters.since) {
      query.timestamp.$gte = filters.since;
    }
    if (filters.until) {
      query.timestamp.$lte = filters.until;
    }
  }

  // Pagination
  const limit = Math.min(filters.limit || 50, 100); // Max 100 statements per request
  const offset = filters.offset || 0;

  const statements = await this.find(query)
    .sort({ timestamp: -1 }) // Most recent first
    .skip(offset)
    .limit(limit)
    .lean(); // Return plain objects for better performance

  const total = await this.countDocuments(query);

  return {
    statements,
    total,
    limit,
    offset,
    hasMore: offset + statements.length < total,
  };
};

export const XAPIStatement = mongoose.model<IXAPIStatementDocument>('XAPIStatement', XAPIStatementSchema);
