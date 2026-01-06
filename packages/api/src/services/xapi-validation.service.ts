import { XAPIStatement, XAPIStatementSchema, XAPI_EXTENSIONS } from '@adaptive-lms/shared';
import { ZodError } from 'zod';
import { AppError } from '../middleware/error-handler';

export interface ValidationResult {
  valid: boolean;
  errors?: Array<{
    path: string;
    message: string;
  }>;
}

/**
 * Validate xAPI statement against xAPI 1.0.3 specification
 */
export function validateXAPIStatement(statement: any): ValidationResult {
  try {
    // Validate with Zod schema
    XAPIStatementSchema.parse(statement);

    // Additional xAPI spec validations
    const additionalValidations = [
      validateStatementId(statement),
      validateActor(statement),
      validateVerb(statement),
      validateObject(statement),
      validateTimestamp(statement),
      validateRequiredExtensions(statement),
    ];

    const errors = additionalValidations.filter(v => !v.valid);

    if (errors.length > 0) {
      return {
        valid: false,
        errors: errors.flatMap(e => e.errors || []),
      };
    }

    return { valid: true };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        valid: false,
        errors: error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      };
    }

    return {
      valid: false,
      errors: [{ path: 'unknown', message: 'Validation failed' }],
    };
  }
}

/**
 * Validate statement ID (must be UUID v4)
 */
function validateStatementId(statement: any): ValidationResult {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!statement.id) {
    return {
      valid: false,
      errors: [{ path: 'id', message: 'Statement ID is required' }],
    };
  }

  if (!uuidRegex.test(statement.id)) {
    return {
      valid: false,
      errors: [{ path: 'id', message: 'Statement ID must be a valid UUID v4' }],
    };
  }

  return { valid: true };
}

/**
 * Validate actor (must have mbox OR account)
 */
function validateActor(statement: any): ValidationResult {
  const actor = statement.actor;

  if (!actor) {
    return {
      valid: false,
      errors: [{ path: 'actor', message: 'Actor is required' }],
    };
  }

  // Must have either mbox or account (xAPI spec)
  const hasMbox = actor.mbox && typeof actor.mbox === 'string';
  const hasAccount = actor.account && actor.account.homePage && actor.account.name;

  if (!hasMbox && !hasAccount) {
    return {
      valid: false,
      errors: [{
        path: 'actor',
        message: 'Actor must have either "mbox" or "account" property',
      }],
    };
  }

  // Validate mbox format (must be mailto: URI)
  if (hasMbox && !actor.mbox.startsWith('mailto:')) {
    return {
      valid: false,
      errors: [{
        path: 'actor.mbox',
        message: 'mbox must be a mailto: URI (e.g., mailto:user@example.com)',
      }],
    };
  }

  return { valid: true };
}

/**
 * Validate verb (must have id as IRI)
 */
function validateVerb(statement: any): ValidationResult {
  const verb = statement.verb;

  if (!verb || !verb.id) {
    return {
      valid: false,
      errors: [{ path: 'verb.id', message: 'Verb ID is required' }],
    };
  }

  // Verb ID must be an IRI (URL)
  try {
    new URL(verb.id);
  } catch {
    return {
      valid: false,
      errors: [{
        path: 'verb.id',
        message: 'Verb ID must be a valid IRI/URL',
      }],
    };
  }

  return { valid: true };
}

/**
 * Validate object (Activity must have id)
 */
function validateObject(statement: any): ValidationResult {
  const object = statement.object;

  if (!object || !object.id) {
    return {
      valid: false,
      errors: [{ path: 'object.id', message: 'Object ID is required' }],
    };
  }

  // Object ID must be an IRI (URL)
  try {
    new URL(object.id);
  } catch {
    return {
      valid: false,
      errors: [{
        path: 'object.id',
        message: 'Object ID must be a valid IRI/URL',
      }],
    };
  }

  return { valid: true };
}

/**
 * Validate timestamp (must be ISO 8601)
 */
function validateTimestamp(statement: any): ValidationResult {
  if (!statement.timestamp) {
    return {
      valid: false,
      errors: [{ path: 'timestamp', message: 'Timestamp is required' }],
    };
  }

  // Check if valid ISO 8601 datetime
  const date = new Date(statement.timestamp);
  if (isNaN(date.getTime())) {
    return {
      valid: false,
      errors: [{
        path: 'timestamp',
        message: 'Timestamp must be a valid ISO 8601 datetime',
      }],
    };
  }

  return { valid: true };
}

/**
 * Validate required extensions for Adaptive LMS
 */
function validateRequiredExtensions(statement: any): ValidationResult {
  const extensions = statement.context?.extensions;

  if (!extensions) {
    return {
      valid: false,
      errors: [{
        path: 'context.extensions',
        message: 'Extensions are required (platform, language)',
      }],
    };
  }

  const errors: Array<{ path: string; message: string }> = [];

  // Check required platform extension
  if (!extensions[XAPI_EXTENSIONS.platform]) {
    errors.push({
      path: 'context.extensions.platform',
      message: `Required extension missing: ${XAPI_EXTENSIONS.platform}`,
    });
  } else if (!['web', 'ios', 'android'].includes(extensions[XAPI_EXTENSIONS.platform])) {
    errors.push({
      path: 'context.extensions.platform',
      message: 'Platform must be one of: web, ios, android',
    });
  }

  // Check required language extension
  if (!extensions[XAPI_EXTENSIONS.language]) {
    errors.push({
      path: 'context.extensions.language',
      message: `Required extension missing: ${XAPI_EXTENSIONS.language}`,
    });
  } else if (!['th', 'en'].includes(extensions[XAPI_EXTENSIONS.language])) {
    errors.push({
      path: 'context.extensions.language',
      message: 'Language must be one of: th, en',
    });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true };
}

/**
 * Validate batch of statements
 */
export function validateBatch(statements: any[]): {
  valid: boolean;
  results: Array<{ index: number; valid: boolean; errors?: any[] }>;
} {
  if (!Array.isArray(statements)) {
    return {
      valid: false,
      results: [{
        index: 0,
        valid: false,
        errors: [{ path: 'root', message: 'Request body must be an array of statements' }],
      }],
    };
  }

  if (statements.length === 0) {
    return {
      valid: false,
      results: [{
        index: 0,
        valid: false,
        errors: [{ path: 'root', message: 'Batch cannot be empty' }],
      }],
    };
  }

  if (statements.length > 50) {
    return {
      valid: false,
      results: [{
        index: 0,
        valid: false,
        errors: [{ path: 'root', message: 'Batch size cannot exceed 50 statements' }],
      }],
    };
  }

  const results = statements.map((statement, index) => {
    const validation = validateXAPIStatement(statement);
    return {
      index,
      valid: validation.valid,
      ...(validation.errors && { errors: validation.errors }),
    };
  });

  const allValid = results.every(r => r.valid);

  return {
    valid: allValid,
    results,
  };
}
