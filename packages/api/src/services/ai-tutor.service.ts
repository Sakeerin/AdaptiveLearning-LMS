import { Lesson } from '../models/Lesson';
import { Competency } from '../models/Competency';
import { Conversation, IMessage } from '../models/Conversation';
import { AppError } from '../middleware/error-handler';
import { logger } from '../utils/logger';

// OpenAI types (we'll use axios for API calls to avoid SDK dependency)
interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface Citation {
  source: string;
  lessonId?: string;
  competencyId?: string;
  excerpt?: string;
}

interface TutorResponse {
  content: string;
  citations: Citation[];
  conversationId: string;
}

/**
 * Get lesson content for grounding
 */
async function getLessonContent(lessonId: string, language: 'th' | 'en'): Promise<string> {
  const lesson = await Lesson.findById(lessonId).populate('competencies');

  if (!lesson) {
    throw new AppError('Lesson not found', 404);
  }

  const content = lesson.content?.[language] || lesson.content?.th;

  if (!content) {
    return '';
  }

  let groundingText = `# Lesson Content\n\n`;

  // Add lesson title
  const title = language === 'en' && lesson.title?.en ? lesson.title.en : lesson.title?.th;
  groundingText += `## ${title}\n\n`;

  // Add main content
  if (content.body) {
    groundingText += `${content.body}\n\n`;
  }

  // Add competencies
  if (lesson.competencies && lesson.competencies.length > 0) {
    groundingText += `## Learning Objectives (Competencies)\n\n`;
    for (const comp of lesson.competencies) {
      const compName = language === 'en' && (comp as any).name?.en
        ? (comp as any).name.en
        : (comp as any).name?.th;
      const compDesc = language === 'en' && (comp as any).description?.en
        ? (comp as any).description.en
        : (comp as any).description?.th;

      groundingText += `- **${compName}**: ${compDesc}\n`;
    }
    groundingText += '\n';
  }

  // Add learning objectives
  if (lesson.metadata?.learningObjectives && lesson.metadata.learningObjectives.length > 0) {
    groundingText += `## What You Will Learn\n\n`;
    for (const obj of lesson.metadata.learningObjectives) {
      groundingText += `- ${obj}\n`;
    }
    groundingText += '\n';
  }

  return groundingText;
}

/**
 * Build system prompt for content-grounded tutor
 */
function buildSystemPrompt(lessonContent: string, language: 'th' | 'en'): string {
  const basePrompt = language === 'th'
    ? `คุณเป็นผู้ช่วยสอนที่เป็นมิตรและให้ความช่วยเหลือในระบบการเรียนรู้แบบปรับตัว

กฎสำคัญ:
1. คุณต้องตอบคำถามโดยอ้างอิงจากเนื้อหาบทเรียนที่ให้มาเท่านั้น
2. ห้ามสร้างข้อมูลหรือตอบนอกเนื้อหาบทเรียน
3. หากคำถามอยู่นอกเนื้อหาบทเรียน ให้บอกว่าคุณสามารถช่วยเฉพาะเรื่องที่อยู่ในบทเรียนนี้เท่านั้น
4. ให้คำอธิบายที่ชัดเจน ใช้ตัวอย่างจากเนื้อหาบทเรียน
5. ส่งเสริมการเรียนรู้โดยการถามคำถามกลับเพื่อตรวจสอบความเข้าใจ
6. ใช้ภาษาไทยในการตอบทั้งหมด

เนื้อหาบทเรียน:
${lessonContent}

จำไว้ว่า: ตอบเฉพาะจากเนื้อหาด้านบนเท่านั้น ห้ามเพิ่มเติมข้อมูลจากที่อื่น`
    : `You are a friendly and helpful AI tutor in an adaptive learning system.

Important Rules:
1. You MUST answer questions based ONLY on the lesson content provided below
2. DO NOT generate information or answer questions outside the lesson content
3. If a question is outside the lesson scope, politely explain that you can only help with this lesson's content
4. Provide clear explanations using examples from the lesson content
5. Encourage learning by asking follow-up questions to check understanding
6. Use English in all your responses

Lesson Content:
${lessonContent}

Remember: Only answer based on the content above. Do not add information from other sources.`;

  return basePrompt;
}

/**
 * Extract citations from response
 */
function extractCitations(
  response: string,
  lessonId: string | undefined,
  lessonContent: string
): Citation[] {
  const citations: Citation[] = [];

  // For now, we'll add a simple citation to the lesson content
  if (lessonId) {
    citations.push({
      source: 'Lesson Content',
      lessonId,
      excerpt: lessonContent.substring(0, 200) + '...',
    });
  }

  return citations;
}

/**
 * Call OpenAI API (mock implementation - replace with actual API call)
 */
async function callOpenAI(messages: OpenAIMessage[]): Promise<string> {
  // NOTE: This is a mock implementation
  // In production, use OpenAI SDK or axios to call the API

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    logger.warn('OpenAI API key not configured, using mock response');

    // Mock response for testing
    const userMessage = messages[messages.length - 1].content;
    return `I understand you're asking about: "${userMessage}". Based on the lesson content, I can help you with that. However, this is a mock response since OpenAI API is not configured. Please configure OPENAI_API_KEY environment variable to use the actual AI tutor.`;
  }

  try {
    // Real OpenAI API call would go here
    // Example using axios:
    // const response = await axios.post('https://api.openai.com/v1/chat/completions', {
    //   model: 'gpt-4',
    //   messages,
    //   temperature: 0.7,
    //   max_tokens: 500,
    // }, {
    //   headers: {
    //     'Authorization': `Bearer ${OPENAI_API_KEY}`,
    //     'Content-Type': 'application/json',
    //   }
    // });
    // return response.data.choices[0].message.content;

    // For now, return mock response
    logger.warn('Using mock OpenAI response');
    const userMessage = messages[messages.length - 1].content;
    return `Based on the lesson content, here's my response to your question about "${userMessage}". [This is a mock response - configure OpenAI API key for real responses]`;
  } catch (error) {
    logger.error('OpenAI API call failed', { error });
    throw new AppError('Failed to get tutor response', 500);
  }
}

/**
 * Chat with AI tutor
 */
export async function chatWithTutor(
  userId: string,
  message: string,
  conversationId?: string,
  lessonId?: string,
  language: 'th' | 'en' = 'en'
): Promise<TutorResponse> {
  let conversation: any;

  // Get or create conversation
  if (conversationId) {
    conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    // Verify ownership
    if (conversation.userId.toString() !== userId) {
      throw new AppError('Unauthorized', 403);
    }
  } else {
    // Create new conversation
    conversation = await Conversation.createConversation(userId, lessonId, undefined, language);
  }

  // Get lesson content for grounding
  let lessonContent = '';
  if (lessonId || conversation.lessonId) {
    const effectiveLessonId = lessonId || conversation.lessonId.toString();
    lessonContent = await getLessonContent(effectiveLessonId, language);
  }

  // Build messages for OpenAI
  const openAIMessages: OpenAIMessage[] = [];

  // Add system prompt
  if (lessonContent) {
    openAIMessages.push({
      role: 'system',
      content: buildSystemPrompt(lessonContent, language),
    });
  } else {
    // General tutor without specific lesson context
    const generalPrompt = language === 'th'
      ? 'คุณเป็นผู้ช่วยสอนที่เป็นมิตรและให้ความช่วยเหลือ ตอบคำถามเกี่ยวกับการเรียนรู้ได้'
      : 'You are a friendly and helpful AI tutor. Answer questions about learning topics.';

    openAIMessages.push({
      role: 'system',
      content: generalPrompt,
    });
  }

  // Add conversation history (last 10 messages)
  const recentMessages = conversation.messages.slice(-10);
  for (const msg of recentMessages) {
    if (msg.role !== 'system') {
      openAIMessages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      });
    }
  }

  // Add current user message
  openAIMessages.push({
    role: 'user',
    content: message,
  });

  // Call OpenAI
  const assistantResponse = await callOpenAI(openAIMessages);

  // Extract citations
  const citations = extractCitations(assistantResponse, lessonId || conversation.lessonId?.toString(), lessonContent);

  // Save messages to conversation
  conversation.messages.push({
    role: 'user',
    content: message,
    timestamp: new Date(),
  });

  conversation.messages.push({
    role: 'assistant',
    content: assistantResponse,
    timestamp: new Date(),
    citations,
  });

  conversation.lastMessageAt = new Date();
  await conversation.save();

  logger.info('Tutor chat completed', {
    userId,
    conversationId: conversation._id,
    messageLength: message.length,
    responseLength: assistantResponse.length,
  });

  return {
    content: assistantResponse,
    citations,
    conversationId: conversation._id.toString(),
  };
}

/**
 * Get conversation history
 */
export async function getConversationHistory(
  userId: string,
  conversationId: string
): Promise<any> {
  const conversation = await Conversation.findById(conversationId)
    .populate('lessonId')
    .populate('courseId');

  if (!conversation) {
    throw new AppError('Conversation not found', 404);
  }

  // Verify ownership
  if (conversation.userId.toString() !== userId) {
    throw new AppError('Unauthorized', 403);
  }

  return conversation;
}

/**
 * Get user's conversations
 */
export async function getUserConversations(
  userId: string,
  limit: number = 20
): Promise<any[]> {
  const conversations = await Conversation.findByUser(userId, limit);
  return conversations;
}

/**
 * Delete conversation
 */
export async function deleteConversation(
  userId: string,
  conversationId: string
): Promise<void> {
  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    throw new AppError('Conversation not found', 404);
  }

  // Verify ownership
  if (conversation.userId.toString() !== userId) {
    throw new AppError('Unauthorized', 403);
  }

  await conversation.deleteOne();

  logger.info('Conversation deleted', { userId, conversationId });
}
