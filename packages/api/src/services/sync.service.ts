import SyncQueueItem from '../models/SyncQueue';
import DeviceSyncState from '../models/DeviceSyncState';
import { LearnerProgress } from '../models/LearnerProgress';
import { QuizAttempt } from '../models/QuizAttempt';
import CompetencyMastery from '../models/CompetencyMastery';
import Conversation from '../models/Conversation';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { Types } from 'mongoose';

export interface SyncRequest {
  deviceId: string;
  deviceName?: string;
  items: Array<{
    id?: string;
    operation: 'create' | 'update' | 'delete';
    resourceType: 'lesson_progress' | 'quiz_attempt' | 'xapi_statement' | 'conversation' | 'mastery';
    resourceId?: string;
    data: any;
    clientTimestamp: string;
  }>;
  metadata?: {
    appVersion?: string;
    platform?: string;
    networkType?: string;
  };
}

export interface SyncResponse {
  syncedItems: string[];
  failedItems: Array<{
    id?: string;
    error: string;
  }>;
  conflicts: Array<{
    id?: string;
    clientData: any;
    serverData: any;
    resolution: 'server_wins' | 'client_wins' | 'manual_required';
  }>;
  syncVersion: number;
  serverTimestamp: string;
}

export interface PullChangesRequest {
  deviceId: string;
  lastSyncVersion: number;
  resourceTypes?: string[];
}

export interface PullChangesResponse {
  changes: Array<{
    resourceType: string;
    resourceId: string;
    operation: 'create' | 'update' | 'delete';
    data: any;
    serverTimestamp: string;
  }>;
  syncVersion: number;
  hasMore: boolean;
}

/**
 * Conflict resolution strategies
 */
export enum ConflictResolution {
  SERVER_WINS = 'server_wins',
  CLIENT_WINS = 'client_wins',
  LATEST_WINS = 'latest_wins',
  MERGE = 'merge',
  MANUAL = 'manual_required'
}

/**
 * Process sync request from client
 */
export async function processSyncRequest(
  userId: string,
  request: SyncRequest
): Promise<SyncResponse> {
  const { deviceId, deviceName, items, metadata } = request;
  const startTime = Date.now();

  logger.info(`Processing sync request for user ${userId}, device ${deviceId}, ${items.length} items`);

  const syncedItems: string[] = [];
  const failedItems: Array<{ id?: string; error: string }> = [];
  const conflicts: Array<{ id?: string; clientData: any; serverData: any; resolution: string }> = [];

  // Process each sync item
  for (const item of items) {
    try {
      const result = await processSyncItem(userId, deviceId, item, metadata);

      if (result.status === 'synced') {
        syncedItems.push(item.id || result.queueItemId);
      } else if (result.status === 'conflict') {
        conflicts.push({
          id: item.id,
          clientData: item.data,
          serverData: result.serverData,
          resolution: result.resolution
        });
      } else if (result.status === 'failed') {
        failedItems.push({
          id: item.id,
          error: result.error || 'Unknown error'
        });
      }
    } catch (error: any) {
      logger.error('Error processing sync item:', error);
      failedItems.push({
        id: item.id,
        error: error.message || 'Processing error'
      });
    }
  }

  // Update device sync state
  const deviceState = await (DeviceSyncState as any).updateSyncState(userId, deviceId, {
    deviceName,
    metadata,
    pendingCount: failedItems.length + conflicts.length,
    failedCount: failedItems.length,
    conflictCount: conflicts.length
  });

  logger.info(
    `Sync request processed in ${Date.now() - startTime}ms: ` +
    `synced=${syncedItems.length}, failed=${failedItems.length}, conflicts=${conflicts.length}`
  );

  return {
    syncedItems,
    failedItems,
    conflicts,
    syncVersion: deviceState.lastSyncVersion,
    serverTimestamp: new Date().toISOString()
  };
}

/**
 * Process a single sync item
 */
async function processSyncItem(
  userId: string,
  deviceId: string,
  item: any,
  metadata?: any
): Promise<{
  status: 'synced' | 'failed' | 'conflict';
  queueItemId?: string;
  serverData?: any;
  resolution?: string;
  error?: string;
}> {
  const { operation, resourceType, resourceId, data, clientTimestamp } = item;

  // Create queue item
  const queueItem = new SyncQueueItem({
    userId: new Types.ObjectId(userId),
    deviceId,
    operation,
    resourceType,
    resourceId,
    data,
    clientTimestamp: new Date(clientTimestamp),
    metadata,
    syncStatus: 'pending'
  });

  await queueItem.save();

  try {
    // Process based on resource type
    let result;
    switch (resourceType) {
      case 'lesson_progress':
        result = await syncLessonProgress(userId, operation, resourceId, data, clientTimestamp);
        break;
      case 'quiz_attempt':
        result = await syncQuizAttempt(userId, operation, resourceId, data, clientTimestamp);
        break;
      case 'mastery':
        result = await syncMastery(userId, operation, resourceId, data, clientTimestamp);
        break;
      case 'conversation':
        result = await syncConversation(userId, operation, resourceId, data, clientTimestamp);
        break;
      case 'xapi_statement':
        result = await syncXAPIStatement(userId, operation, resourceId, data);
        break;
      default:
        throw new AppError(`Unsupported resource type: ${resourceType}`, 400);
    }

    if (result.conflict) {
      await (SyncQueueItem as any).markAsConflict(queueItem._id.toString(), result.serverData);
      return {
        status: 'conflict',
        queueItemId: queueItem._id.toString(),
        serverData: result.serverData,
        resolution: result.resolution
      };
    }

    await (SyncQueueItem as any).markAsSynced(queueItem._id.toString());
    return {
      status: 'synced',
      queueItemId: queueItem._id.toString()
    };
  } catch (error: any) {
    await (SyncQueueItem as any).markAsFailed(queueItem._id.toString(), error.message);
    return {
      status: 'failed',
      queueItemId: queueItem._id.toString(),
      error: error.message
    };
  }
}

/**
 * Sync lesson progress
 */
async function syncLessonProgress(
  userId: string,
  operation: string,
  resourceId: string | undefined,
  data: any,
  clientTimestamp: string
): Promise<{ conflict?: boolean; serverData?: any; resolution?: string }> {
  const { lessonId, courseId, completionPercentage, timeSpent } = data;

  const existing = await LearnerProgress.findOne({
    userId: new Types.ObjectId(userId),
    lessonId: new Types.ObjectId(lessonId)
  });

  if (operation === 'create' || operation === 'update') {
    if (existing) {
      // Check for conflict
      const clientTime = new Date(clientTimestamp);
      const serverTime = existing.lastAccessedAt;

      // If client data is older than server, conflict
      if (serverTime && clientTime < serverTime) {
        // Server wins - client data is stale
        return {
          conflict: true,
          serverData: existing.toObject(),
          resolution: ConflictResolution.SERVER_WINS
        };
      }

      // Client data is newer or equal - merge with max values
      existing.completionPercentage = Math.max(
        existing.completionPercentage || 0,
        completionPercentage || 0
      );
      existing.timeSpent = (existing.timeSpent || 0) + (timeSpent || 0);
      existing.lastAccessedAt = new Date(clientTimestamp);

      if (existing.completionPercentage >= 100 && existing.status !== 'completed') {
        existing.status = 'completed';
        existing.completedAt = new Date();
      } else if (existing.completionPercentage > 0) {
        existing.status = 'in-progress';
      }

      await existing.save();
    } else {
      // Create new progress
      await LearnerProgress.updateProgress(
        userId,
        lessonId,
        courseId,
        completionPercentage,
        timeSpent
      );
    }

    return {};
  }

  return { conflict: false };
}

/**
 * Sync quiz attempt
 */
async function syncQuizAttempt(
  userId: string,
  operation: string,
  resourceId: string | undefined,
  data: any,
  clientTimestamp: string
): Promise<{ conflict?: boolean; serverData?: any; resolution?: string }> {
  if (operation === 'create') {
    // Check if attempt already exists (by attempt number)
    const existing = await QuizAttempt.findOne({
      userId: new Types.ObjectId(userId),
      quizId: new Types.ObjectId(data.quizId),
      attemptNumber: data.attemptNumber
    });

    if (existing) {
      // Duplicate attempt - conflict
      return {
        conflict: true,
        serverData: existing.toObject(),
        resolution: ConflictResolution.SERVER_WINS
      };
    }

    // Create new attempt
    const attempt = new QuizAttempt({
      userId: new Types.ObjectId(userId),
      quizId: new Types.ObjectId(data.quizId),
      attemptNumber: data.attemptNumber,
      startedAt: data.startedAt,
      submittedAt: data.submittedAt,
      responses: data.responses,
      score: data.score,
      syncStatus: 'synced',
      xapiStatementIds: data.xapiStatementIds || []
    });

    await attempt.save();
    return {};
  }

  return { conflict: false };
}

/**
 * Sync mastery
 */
async function syncMastery(
  userId: string,
  operation: string,
  resourceId: string | undefined,
  data: any,
  clientTimestamp: string
): Promise<{ conflict?: boolean; serverData?: any; resolution?: string }> {
  const { competencyId, masteryLevel, confidence } = data;

  const existing = await CompetencyMastery.findOne({
    userId: new Types.ObjectId(userId),
    competencyId: new Types.ObjectId(competencyId)
  });

  if (operation === 'create' || operation === 'update') {
    if (existing) {
      const clientTime = new Date(clientTimestamp);
      const serverTime = existing.lastUpdated;

      // Latest timestamp wins
      if (serverTime && clientTime < serverTime) {
        return {
          conflict: true,
          serverData: existing.toObject(),
          resolution: ConflictResolution.SERVER_WINS
        };
      }

      // Update with client data
      existing.masteryLevel = masteryLevel;
      existing.confidence = confidence;
      existing.lastUpdated = new Date(clientTimestamp);
      await existing.save();
    } else {
      // Create new mastery record
      const mastery = new CompetencyMastery({
        userId: new Types.ObjectId(userId),
        competencyId: new Types.ObjectId(competencyId),
        masteryLevel,
        confidence,
        lastUpdated: new Date(clientTimestamp)
      });
      await mastery.save();
    }

    return {};
  }

  return { conflict: false };
}

/**
 * Sync conversation
 */
async function syncConversation(
  userId: string,
  operation: string,
  resourceId: string | undefined,
  data: any,
  clientTimestamp: string
): Promise<{ conflict?: boolean; serverData?: any; resolution?: string }> {
  if (operation === 'create') {
    // Create new conversation
    const conversation = new Conversation({
      userId: new Types.ObjectId(userId),
      lessonId: data.lessonId ? new Types.ObjectId(data.lessonId) : undefined,
      language: data.language,
      messages: data.messages,
      isActive: data.isActive !== false
    });

    await conversation.save();
    return {};
  } else if (operation === 'update' && resourceId) {
    const existing = await Conversation.findOne({
      _id: new Types.ObjectId(resourceId),
      userId: new Types.ObjectId(userId)
    });

    if (existing) {
      // Merge messages (append new ones)
      const existingMessageIds = new Set(existing.messages.map((m: any) => m._id?.toString()));
      const newMessages = data.messages.filter((m: any) => !existingMessageIds.has(m._id?.toString()));

      existing.messages.push(...newMessages);
      existing.updatedAt = new Date();
      await existing.save();
    }

    return {};
  }

  return { conflict: false };
}

/**
 * Sync xAPI statement
 */
async function syncXAPIStatement(
  userId: string,
  operation: string,
  resourceId: string | undefined,
  data: any
): Promise<{ conflict?: boolean; serverData?: any; resolution?: string }> {
  // For xAPI statements, we typically just store them
  // They're immutable once created, so no conflict resolution needed
  // This would integrate with xAPI LRS service

  // Just acknowledge receipt
  return {};
}

/**
 * Pull changes from server
 */
export async function pullChanges(
  userId: string,
  request: PullChangesRequest
): Promise<PullChangesResponse> {
  const { deviceId, lastSyncVersion, resourceTypes } = request;

  logger.info(`Pulling changes for user ${userId}, device ${deviceId}, lastSyncVersion ${lastSyncVersion}`);

  const deviceState = await DeviceSyncState.findOne({
    userId: new Types.ObjectId(userId),
    deviceId
  });

  if (!deviceState) {
    // First sync - return empty
    return {
      changes: [],
      syncVersion: 0,
      hasMore: false
    };
  }

  // For now, return empty changes
  // In a full implementation, this would:
  // 1. Track all changes server-side with version numbers
  // 2. Return changes since lastSyncVersion
  // 3. Support pagination for large change sets

  return {
    changes: [],
    syncVersion: deviceState.lastSyncVersion,
    hasMore: false
  };
}

/**
 * Get sync status for user
 */
export async function getSyncStatus(userId: string, deviceId?: string) {
  const query: any = { userId: new Types.ObjectId(userId) };
  if (deviceId) {
    query.deviceId = deviceId;
  }

  const devices = await DeviceSyncState.find(query).sort({ lastSyncAt: -1 }).lean();

  const pendingItems = await (SyncQueueItem as any).getPendingForUser(userId, deviceId);
  const conflicts = await (SyncQueueItem as any).getConflictsForUser(userId);

  return {
    devices,
    pendingCount: pendingItems.length,
    conflictCount: conflicts.length,
    conflicts: conflicts.map((c: any) => ({
      id: c._id,
      resourceType: c.resourceType,
      clientData: c.data,
      serverData: c.conflictData,
      createdAt: c.createdAt
    }))
  };
}

/**
 * Resolve conflict manually
 */
export async function resolveConflict(
  userId: string,
  conflictId: string,
  resolution: 'use_server' | 'use_client' | 'use_merged',
  mergedData?: any
): Promise<void> {
  const conflict = await SyncQueueItem.findOne({
    _id: new Types.ObjectId(conflictId),
    userId: new Types.ObjectId(userId),
    syncStatus: 'conflict'
  });

  if (!conflict) {
    throw new AppError('Conflict not found', 404);
  }

  try {
    let dataToUse;
    if (resolution === 'use_server') {
      dataToUse = conflict.conflictData;
    } else if (resolution === 'use_client') {
      dataToUse = conflict.data;
    } else {
      dataToUse = mergedData;
    }

    // Re-apply the sync with chosen data
    const result = await processSyncItem(
      userId,
      conflict.deviceId,
      {
        operation: conflict.operation,
        resourceType: conflict.resourceType,
        resourceId: conflict.resourceId,
        data: dataToUse,
        clientTimestamp: new Date().toISOString()
      },
      conflict.metadata
    );

    if (result.status === 'synced') {
      await SyncQueueItem.findByIdAndDelete(conflictId);
      logger.info(`Conflict ${conflictId} resolved with ${resolution}`);
    } else {
      throw new Error('Failed to resolve conflict');
    }
  } catch (error) {
    logger.error('Error resolving conflict:', error);
    throw error;
  }
}

/**
 * Clear synced items older than specified days
 */
export async function cleanupSyncQueue(daysOld: number = 30): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await SyncQueueItem.deleteMany({
    syncStatus: 'synced',
    updatedAt: { $lt: cutoffDate }
  });

  logger.info(`Cleaned up ${result.deletedCount} synced items older than ${daysOld} days`);
  return result.deletedCount;
}
