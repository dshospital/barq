import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { IAIAnalysisResult, Sentiment } from '@app/shared';

export interface AIContext {
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  contactInfo?: any;
  organizationContext?: any;
}

@Injectable()
export class AiClientService {
  private readonly logger = new Logger(AiClientService.name);
  private openai: OpenAI;
  private anthropic: Anthropic;
  private readonly defaultModel: string;
  private readonly fallbackModel: string;

  constructor(private readonly configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get('OPENAI_API_KEY'),
    });

    this.anthropic = new Anthropic({
      apiKey: this.configService.get('ANTHROPIC_API_KEY'),
    });

    this.defaultModel = this.configService.get('AI_DEFAULT_MODEL', 'gpt-4');
    this.fallbackModel = this.configService.get('AI_FALLBACK_MODEL', 'gpt-3.5-turbo');
  }

  async analyzeMessage(
    message: string,
    context?: AIContext,
  ): Promise<IAIAnalysisResult> {
    try {
      const systemPrompt = this.buildAnalysisPrompt(context);

      const response = await this.openai.chat.completions.create({
        model: this.defaultModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from AI');
      }

      const result = JSON.parse(content);

      return {
        sentiment: this.mapSentiment(result.sentiment),
        sentimentScore: result.sentiment_score || 0,
        intent: result.intent || 'unknown',
        language: result.language || 'en',
        summary: result.summary,
        entities: result.entities || [],
      };
    } catch (error) {
      this.logger.error(`AI analysis failed: ${error.message}`);
      // Return neutral analysis on failure
      return {
        sentiment: Sentiment.NEUTRAL,
        sentimentScore: 0,
        intent: 'unknown',
        language: 'en',
      };
    }
  }

  async generateSmartReplies(
    message: string,
    context?: AIContext,
    numSuggestions: number = 3,
  ): Promise<string[]> {
    try {
      const systemPrompt = this.buildReplyPrompt(context, numSuggestions);

      const response = await this.openai.chat.completions.create({
        model: this.defaultModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from AI');
      }

      const result = JSON.parse(content);
      return result.replies || [];
    } catch (error) {
      this.logger.error(`Smart reply generation failed: ${error.message}`);
      return this.getFallbackReplies();
    }
  }

  async generateAutoReply(
    message: string,
    context?: AIContext,
  ): Promise<string | null> {
    try {
      const systemPrompt = `You are a helpful customer service assistant. Generate a professional and friendly response to the customer's message. Keep it concise (max 3 sentences) and helpful.`;

      const messages: any[] = [{ role: 'system', content: systemPrompt }];

      if (context?.conversationHistory) {
        messages.push(...context.conversationHistory.map((m) => ({
          role: m.role,
          content: m.content,
        })));
      }

      messages.push({ role: 'user', content: message });

      const response = await this.openai.chat.completions.create({
        model: this.defaultModel,
        messages,
        temperature: 0.7,
        max_tokens: 300,
      });

      return response.choices[0]?.message?.content || null;
    } catch (error) {
      this.logger.error(`Auto-reply generation failed: ${error.message}`);
      return null;
    }
  }

  async summarizeConversation(
    messages: Array<{ role: string; content: string }>,
  ): Promise<string> {
    try {
      const conversationText = messages
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n');

      const systemPrompt = `Summarize the following conversation in 2-3 sentences. Focus on the main points and any action items.`;

      const response = await this.openai.chat.completions.create({
        model: this.defaultModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: conversationText },
        ],
        temperature: 0.5,
        max_tokens: 200,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      this.logger.error(`Conversation summarization failed: ${error.message}`);
      return '';
    }
  }

  async detectLanguage(text: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.fallbackModel,
        messages: [
          {
            role: 'system',
            content: 'Detect the language of the following text. Return only the ISO 639-1 language code.',
          },
          { role: 'user', content: text },
        ],
        temperature: 0,
        max_tokens: 10,
      });

      return response.choices[0]?.message?.content?.trim() || 'en';
    } catch (error) {
      this.logger.error(`Language detection failed: ${error.message}`);
      return 'en';
    }
  }

  async translateText(
    text: string,
    targetLanguage: string,
    sourceLanguage?: string,
  ): Promise<string> {
    try {
      const sourcePrompt = sourceLanguage
        ? `from ${sourceLanguage} `
        : '';

      const response = await this.openai.chat.completions.create({
        model: this.defaultModel,
        messages: [
          {
            role: 'system',
            content: `Translate the following text ${sourcePrompt}to ${targetLanguage}. Return only the translated text.`,
          },
          { role: 'user', content: text },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      });

      return response.choices[0]?.message?.content || text;
    } catch (error) {
      this.logger.error(`Translation failed: ${error.message}`);
      return text;
    }
  }

  async analyzeSentimentWithClaude(message: string): Promise<IAIAnalysisResult> {
    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-opus-20240229',
        max_tokens: 500,
        system: this.buildAnalysisPrompt(),
        messages: [{ role: 'user', content: message }],
      });

      const content = response.content[0]?.text;
      if (!content) {
        throw new Error('Empty response from Claude');
      }

      const result = JSON.parse(content);

      return {
        sentiment: this.mapSentiment(result.sentiment),
        sentimentScore: result.sentiment_score || 0,
        intent: result.intent || 'unknown',
        language: result.language || 'en',
        summary: result.summary,
      };
    } catch (error) {
      this.logger.error(`Claude analysis failed: ${error.message}`);
      return {
        sentiment: Sentiment.NEUTRAL,
        sentimentScore: 0,
        intent: 'unknown',
        language: 'en',
      };
    }
  }

  async generateTemplateSuggestion(
    purpose: string,
    category: string,
    language: string = 'en',
  ): Promise<any> {
    try {
      const systemPrompt = `You are a WhatsApp template designer. Generate a professional message template based on the purpose and category provided. Return the response in JSON format with: header (optional), body (required), footer (optional), and buttons (optional).`;

      const response = await this.openai.chat.completions.create({
        model: this.defaultModel,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Purpose: ${purpose}\nCategory: ${category}\nLanguage: ${language}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from AI');
      }

      return JSON.parse(content);
    } catch (error) {
      this.logger.error(`Template suggestion failed: ${error.message}`);
      return null;
    }
  }

  async extractEntities(text: string): Promise<Array<{ type: string; value: string }>> {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.fallbackModel,
        messages: [
          {
            role: 'system',
            content: `Extract named entities from the following text. Return a JSON array of objects with 'type' and 'value' properties. Entity types: person, organization, location, date, time, email, phone, product, amount.`,
          },
          { role: 'user', content: text },
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return [];
      }

      const result = JSON.parse(content);
      return result.entities || [];
    } catch (error) {
      this.logger.error(`Entity extraction failed: ${error.message}`);
      return [];
    }
  }

  private buildAnalysisPrompt(context?: AIContext): string {
    return `You are an AI assistant analyzing customer messages for a WhatsApp Business platform. 
Analyze the following message and return a JSON object with these fields:
- sentiment: one of ["positive", "negative", "neutral"]
- sentiment_score: number between -1 and 1
- intent: the customer's intent (e.g., "inquiry", "complaint", "support_request", "purchase", "feedback")
- language: ISO 639-1 language code
- summary: brief summary of the message (optional)
- entities: array of important entities mentioned (optional)

Be accurate and concise.`;
  }

  private buildReplyPrompt(context: AIContext | undefined, numSuggestions: number): string {
    return `You are a helpful customer service assistant. Generate ${numSuggestions} professional reply suggestions for the customer's message.

Context:
${context?.organizationContext ? `- Organization: ${JSON.stringify(context.organizationContext)}` : ''}
${context?.contactInfo ? `- Customer: ${JSON.stringify(context.contactInfo)}` : ''}

Return a JSON object with a "replies" array containing ${numSuggestions} suggested responses. Each reply should be professional, helpful, and concise (max 2-3 sentences).`;
  }

  private mapSentiment(sentiment: string): Sentiment {
    const normalized = sentiment?.toLowerCase().trim();
    if (normalized === 'positive') return Sentiment.POSITIVE;
    if (normalized === 'negative') return Sentiment.NEGATIVE;
    return Sentiment.NEUTRAL;
  }

  private getFallbackReplies(): string[] {
    return [
      'Thank you for reaching out. How can I assist you today?',
      'I understand. Let me help you with that.',
      'Could you please provide more details so I can better assist you?',
    ];
  }

  // Health check
  async healthCheck(): Promise<{ status: string; latency: number }> {
    const startTime = Date.now();
    try {
      await this.openai.chat.completions.create({
        model: this.fallbackModel,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5,
      });
      return {
        status: 'healthy',
        latency: Date.now() - startTime,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime,
      };
    }
  }
}
