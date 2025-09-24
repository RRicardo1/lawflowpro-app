import OpenAI from 'openai';
import { logger } from '@/utils/logger';

export type EmailClassification = 'URGENT_LEGAL' | 'CLIENT_INQUIRY' | 'COURT_NOTICE' | 'OPPOSING_COUNSEL' | 'VENDOR' | 'SPAM' | 'OTHER';

export interface ClassificationResult {
  classification: EmailClassification;
  confidence: number;
  reasoning: string;
}

export interface EmailResponseOptions {
  tone: 'professional' | 'friendly' | 'formal';
  length: 'short' | 'medium' | 'long';
  includeSignature?: boolean;
  businessType?: string;
  customInstructions?: string;
}

export interface EmailSuggestion {
  response: string;
  confidence: number;
  reasoning: string;
  suggestedActions?: string[];
}

export class AIService {
  private openai: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async classifyEmail(
    subject: string, 
    body: string, 
    from: string, 
    businessType?: string
  ): Promise<ClassificationResult> {
    try {
      const businessContext = businessType ? 
        `The recipient runs a ${businessType.toLowerCase().replace('_', ' ')} business.` : '';

      const prompt = `
Classify this legal email into one of these categories: URGENT_LEGAL, CLIENT_INQUIRY, COURT_NOTICE, OPPOSING_COUNSEL, VENDOR, SPAM, or OTHER.

${businessContext}

Email Details:
From: ${from}
Subject: ${subject}
Body: ${body.substring(0, 1000)}${body.length > 1000 ? '...' : ''}

Legal Classification Guidelines:
- URGENT_LEGAL: Emergency legal matters, court deadlines, time-sensitive legal issues
- CLIENT_INQUIRY: Communications from existing or potential clients seeking legal advice
- COURT_NOTICE: Official communications from courts, clerks, or legal administrative bodies
- OPPOSING_COUNSEL: Communications from opposing attorneys or their representatives
- VENDOR: Legal vendors, expert witnesses, court reporters, or legal service providers
- SPAM: Promotional, marketing, or unsolicited emails
- OTHER: Everything else that doesn't fit the above legal categories

Respond with JSON in this exact format:
{
  "classification": "CATEGORY",
  "confidence": 0.95,
  "reasoning": "Brief explanation of why this classification was chosen"
}
      `.trim();

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 200,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      logger.info(`Email classified as ${result.classification} with confidence ${result.confidence}`);
      
      return result;
    } catch (error) {
      logger.error('Error classifying email:', error);
      throw new Error('Failed to classify email');
    }
  }

  async generateEmailResponse(
    originalSubject: string,
    originalBody: string,
    from: string,
    classification: EmailClassification,
    options: EmailResponseOptions = {}
  ): Promise<EmailSuggestion> {
    try {
      const {
        tone = 'professional',
        length = 'medium',
        includeSignature = true,
        businessType = '',
        customInstructions = ''
      } = options;

      const businessContext = businessType ? 
        `You represent a ${businessType.toLowerCase().replace('_', ' ')} business.` : '';

      const lengthGuide = {
        short: '1-2 sentences',
        medium: '2-4 sentences', 
        long: '1-2 paragraphs'
      };

      const prompt = `
Generate a ${tone} email response to the following email. ${businessContext}

Original Email:
From: ${from}
Subject: ${originalSubject}
Body: ${originalBody.substring(0, 1500)}${originalBody.length > 1500 ? '...' : ''}

Classification: ${classification}

Response Requirements:
- Tone: ${tone}
- Length: ${lengthGuide[length]}
- ${includeSignature ? 'Include a professional signature' : 'Do not include a signature'}
- Address the sender appropriately
- Provide a helpful and relevant response

${customInstructions ? `Additional Instructions: ${customInstructions}` : ''}

Legal Response Guidelines by Classification:
- URGENT_LEGAL: Acknowledge urgency, provide immediate legal next steps, mention consultation if needed
- CLIENT_INQUIRY: Be professional, empathetic, and solution-oriented. Include legal disclaimers when appropriate
- COURT_NOTICE: Acknowledge receipt, confirm understanding, indicate compliance steps
- OPPOSING_COUNSEL: Be professional, brief, and careful with language. Avoid admissions
- VENDOR: Be cordial but business-focused, confirm legal service requirements
- SPAM: Suggest marking as spam (don't actually respond)
- OTHER: Provide appropriate professional legal response based on content

Respond with JSON in this exact format:
{
  "response": "The email response content here",
  "confidence": 0.90,
  "reasoning": "Brief explanation of the response strategy",
  "suggestedActions": ["action1", "action2"]
}
      `.trim();

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 500,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      logger.info(`Email response generated with confidence ${result.confidence}`);
      
      return result;
    } catch (error) {
      logger.error('Error generating email response:', error);
      throw new Error('Failed to generate email response');
    }
  }

  async improveEmailResponse(
    originalResponse: string,
    feedback: string
  ): Promise<string> {
    try {
      const prompt = `
Improve this email response based on the feedback provided:

Original Response:
${originalResponse}

Feedback:
${feedback}

Please provide an improved version that addresses the feedback while maintaining professionalism.
      `.trim();

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.6,
        max_tokens: 400,
      });

      const improvedResponse = response.choices[0].message.content || originalResponse;
      
      logger.info('Email response improved based on feedback');
      
      return improvedResponse;
    } catch (error) {
      logger.error('Error improving email response:', error);
      throw new Error('Failed to improve email response');
    }
  }

  async extractEmailInsights(
    emails: Array<{ subject: string; body: string; from: string; date: string }>
  ): Promise<{
    patterns: string[];
    urgentCount: number;
    clientCount: number;
    recommendations: string[];
  }> {
    try {
      const emailSummary = emails.slice(0, 20).map((email, i) => 
        `${i + 1}. From: ${email.from}, Subject: ${email.subject}, Date: ${email.date}`
      ).join('\n');

      const prompt = `
Analyze these recent emails and provide insights:

${emailSummary}

Analyze the patterns and provide:
1. Common patterns or themes
2. Estimated count of urgent emails  
3. Estimated count of client emails
4. Recommendations for better email management

Respond with JSON in this exact format:
{
  "patterns": ["pattern1", "pattern2"],
  "urgentCount": 5,
  "clientCount": 10,
  "recommendations": ["rec1", "rec2", "rec3"]
}
      `.trim();

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 300,
      });

      const insights = JSON.parse(response.choices[0].message.content || '{}');
      
      logger.info('Email insights generated successfully');
      
      return insights;
    } catch (error) {
      logger.error('Error extracting email insights:', error);
      throw new Error('Failed to extract email insights');
    }
  }

  async generateCalendarEventSuggestion(
    emailContent: string,
    from: string
  ): Promise<{
    shouldSchedule: boolean;
    suggestedTitle: string;
    suggestedDuration: number; // in minutes
    reasoning: string;
  } | null> {
    try {
      const prompt = `
Analyze this email to determine if it suggests scheduling a meeting or appointment:

From: ${from}
Content: ${emailContent.substring(0, 1000)}

Determine if this email suggests scheduling a meeting/call/appointment and provide suggestions.

Respond with JSON in this exact format:
{
  "shouldSchedule": true/false,
  "suggestedTitle": "Meeting title",
  "suggestedDuration": 60,
  "reasoning": "Brief explanation"
}

Return null if no scheduling is needed.
      `.trim();

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 200,
      });

      const result = JSON.parse(response.choices[0].message.content || 'null');
      
      if (result?.shouldSchedule) {
        logger.info('Calendar event suggestion generated');
      }
      
      return result;
    } catch (error) {
      logger.error('Error generating calendar suggestion:', error);
      return null;
    }
  }
}