import { google } from 'googleapis';
import { logger } from '@/utils/logger';

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.modify',
];

export interface GmailConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface EmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    body?: { data?: string };
    parts?: Array<any>;
  };
  internalDate: string;
}

export class GmailService {
  private oauth2Client: any;
  private gmail: any;

  constructor(config: GmailConfig) {
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );

    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: GMAIL_SCOPES,
      prompt: 'consent',
    });
  }

  async exchangeCodeForTokens(code: string): Promise<any> {
    try {
      const { tokens } = await this.oauth2Client.getAccessToken(code);
      this.oauth2Client.setCredentials(tokens);
      return tokens;
    } catch (error) {
      logger.error('Error exchanging code for tokens:', error);
      throw error;
    }
  }

  setTokens(tokens: any): void {
    this.oauth2Client.setCredentials(tokens);
  }

  async refreshTokens(refreshToken: string): Promise<any> {
    try {
      this.oauth2Client.setCredentials({ refresh_token: refreshToken });
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      return credentials;
    } catch (error) {
      logger.error('Error refreshing tokens:', error);
      throw error;
    }
  }

  async getProfile(): Promise<any> {
    try {
      const response = await this.gmail.users.getProfile({ userId: 'me' });
      return response.data;
    } catch (error) {
      logger.error('Error getting Gmail profile:', error);
      throw error;
    }
  }

  async getMessages(query = '', maxResults = 50): Promise<EmailMessage[]> {
    try {
      const listResponse = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults,
      });

      if (!listResponse.data.messages) {
        return [];
      }

      const messages = await Promise.all(
        listResponse.data.messages.map(async (message: any) => {
          const messageResponse = await this.gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'full',
          });
          return messageResponse.data;
        })
      );

      return messages;
    } catch (error) {
      logger.error('Error getting Gmail messages:', error);
      throw error;
    }
  }

  async getUnreadMessages(): Promise<EmailMessage[]> {
    return this.getMessages('is:unread', 20);
  }

  async getRecentMessages(hours = 24): Promise<EmailMessage[]> {
    const hoursAgo = Math.floor(Date.now() / 1000) - (hours * 3600);
    return this.getMessages(`after:${hoursAgo}`, 50);
  }

  extractEmailContent(message: EmailMessage): {
    from: string;
    to: string;
    subject: string;
    body: string;
    date: string;
  } {
    const headers = message.payload.headers;
    const getHeader = (name: string) => 
      headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    let body = '';
    
    // Extract body from payload
    if (message.payload.body?.data) {
      body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
    } else if (message.payload.parts) {
      // Look for text/plain or text/html parts
      const textPart = message.payload.parts.find(part => 
        part.mimeType === 'text/plain' || part.mimeType === 'text/html'
      );
      if (textPart?.body?.data) {
        body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
      }
    }

    return {
      from: getHeader('From'),
      to: getHeader('To'),
      subject: getHeader('Subject'),
      body: body.trim(),
      date: new Date(parseInt(message.internalDate)).toISOString(),
    };
  }

  async sendEmail(to: string, subject: string, body: string, replyToMessageId?: string): Promise<any> {
    try {
      const headers = [
        `To: ${to}`,
        `Subject: ${subject}`,
        `Content-Type: text/html; charset=utf-8`,
      ];

      if (replyToMessageId) {
        headers.push(`In-Reply-To: ${replyToMessageId}`);
        headers.push(`References: ${replyToMessageId}`);
      }

      const email = [
        headers.join('\n'),
        '',
        body
      ].join('\n');

      const encodedEmail = Buffer.from(email).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedEmail,
        },
      });

      logger.info(`Email sent successfully to ${to}`);
      return response.data;
    } catch (error) {
      logger.error('Error sending email:', error);
      throw error;
    }
  }

  async markAsRead(messageId: string): Promise<void> {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['UNREAD'],
        },
      });
    } catch (error) {
      logger.error('Error marking message as read:', error);
      throw error;
    }
  }

  async addLabel(messageId: string, labelId: string): Promise<void> {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          addLabelIds: [labelId],
        },
      });
    } catch (error) {
      logger.error('Error adding label to message:', error);
      throw error;
    }
  }

  async createLabel(name: string): Promise<string> {
    try {
      const response = await this.gmail.users.labels.create({
        userId: 'me',
        requestBody: {
          name,
          labelListVisibility: 'labelShow',
          messageListVisibility: 'show',
        },
      });

      logger.info(`Created Gmail label: ${name}`);
      return response.data.id;
    } catch (error) {
      logger.error('Error creating label:', error);
      throw error;
    }
  }

  async getLabels(): Promise<any[]> {
    try {
      const response = await this.gmail.users.labels.list({ userId: 'me' });
      return response.data.labels || [];
    } catch (error) {
      logger.error('Error getting labels:', error);
      throw error;
    }
  }

  async watchForNewEmails(topicName: string): Promise<void> {
    try {
      await this.gmail.users.watch({
        userId: 'me',
        requestBody: {
          topicName,
          labelIds: ['INBOX'],
          labelFilterAction: 'include',
        },
      });

      logger.info('Gmail watch setup successfully');
    } catch (error) {
      logger.error('Error setting up Gmail watch:', error);
      throw error;
    }
  }

  async stopWatch(): Promise<void> {
    try {
      await this.gmail.users.stop({ userId: 'me' });
      logger.info('Gmail watch stopped');
    } catch (error) {
      logger.error('Error stopping Gmail watch:', error);
      throw error;
    }
  }
}