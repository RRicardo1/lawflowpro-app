const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { google } = require('googleapis');
const path = require('path');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';

// Gmail OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `http://localhost:${PORT}/api/integrations/gmail/callback`;

// In-memory storage for testing
const users = [];
const integrations = new Map();
const automations = new Map();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      imgSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Serve static files from public directory
app.use(express.static('public'));

// Debug route for Vercel
app.get('/debug', (req, res) => {
  res.json({
    message: 'LawFlowPro server is running!',
    timestamp: new Date().toISOString(),
    port: PORT,
    env: process.env.NODE_ENV || 'development'
  });
});

// Root route fallback
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'), (err) => {
    if (err) {
      res.status(500).json({ error: 'Could not serve index.html', details: err.message });
    }
  });
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { message: 'Access token required' }
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: { message: 'Invalid or expired token' }
      });
    }
    req.user = users.find(u => u.id === user.userId);
    req.userId = user.userId;
    next();
  });
};

// ====================
// HEALTH & INFO ROUTES
// ====================

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'SMB AI Platform API with Full Functionality is running!',
    version: '1.0.0',
    features: [
      'JWT Authentication',
      'User Management', 
      'AI Email Processing',
      'Integration Management',
      'Automation System'
    ]
  });
});

app.get('/api/info', (req, res) => {
  res.json({
    success: true,
    data: {
      platform: 'LawFlowPro - Legal Practice Synchronization',
      environment: process.env.NODE_ENV || 'development',
      port: PORT,
      registeredUsers: users.length,
      activeIntegrations: integrations.size,
      runningAutomations: Array.from(automations.values()).filter(a => a.isActive).length,
      availableServices: {
        authentication: true,
        aiProcessing: !!process.env.OPENAI_API_KEY,
        emailIntegration: !!process.env.GOOGLE_CLIENT_ID,
        database: false // Using in-memory for demo
      }
    },
    message: 'Platform information retrieved successfully'
  });
});

// ====================
// AUTHENTICATION ROUTES  
// ====================

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name, businessName, businessType } = req.body;

    if (!email || !password || !name || !businessName || !businessType) {
      return res.status(400).json({
        success: false,
        error: { message: 'All fields are required' }
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: { message: 'Password must be at least 8 characters' }
      });
    }

    const existingUser = users.find(u => u.email === email.toLowerCase());
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: { message: 'User already exists with this email' }
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email: email.toLowerCase(),
      name,
      businessName,
      businessType,
      passwordHash,
      isVerified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    users.push(user);

    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { passwordHash: _, ...userResponse } = user;

    console.log(`✅ New user registered: ${user.email} (${businessType})`);

    res.status(201).json({
      success: true,
      data: {
        user: userResponse,
        accessToken
      },
      message: 'User registered successfully'
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Registration failed' }
    });
  }
});

app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { message: 'Email and password are required' }
      });
    }

    const user = users.find(u => u.email === email.toLowerCase());
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid email or password' }
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid email or password' }
      });
    }

    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { passwordHash: _, ...userResponse } = user;

    console.log(`✅ User logged in: ${user.email}`);

    res.json({
      success: true,
      data: {
        user: userResponse,
        accessToken
      },
      message: 'User signed in successfully'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Login failed' }
    });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  const { passwordHash, ...userResponse } = req.user;

  res.json({
    success: true,
    data: {
      user: userResponse
    },
    message: 'User profile retrieved successfully'
  });
});

// ====================
// INTEGRATION ROUTES
// ====================

app.get('/api/integrations', authenticateToken, (req, res) => {
  const userIntegrations = Array.from(integrations.values())
    .filter(integration => integration.userId === req.userId);

  res.json({
    success: true,
    data: { integrations: userIntegrations },
    message: 'Integrations retrieved successfully'
  });
});

app.get('/api/integrations/available', authenticateToken, (req, res) => {
  const availableIntegrations = [
    {
      type: 'GMAIL',
      name: 'Gmail',
      description: 'Connect your Gmail account for email automation',
      features: ['Email classification', 'Auto-responses', 'Smart filtering'],
      requiresAuth: true
    },
    {
      type: 'GOOGLE_CALENDAR',
      name: 'Google Calendar', 
      description: 'Sync calendar for smart scheduling',
      features: ['Meeting scheduling', 'Availability detection', 'Auto-reminders'],
      requiresAuth: true
    },
    {
      type: 'QUICKBOOKS',
      name: 'QuickBooks',
      description: 'Connect accounting for automated bookkeeping', 
      features: ['Invoice generation', 'Expense tracking', 'Financial reporting'],
      requiresAuth: true
    }
  ];

  res.json({
    success: true,
    data: { availableIntegrations },
    message: 'Available integrations retrieved successfully'
  });
});

app.post('/api/integrations/connect/:type', authenticateToken, (req, res) => {
  const { type } = req.params;
  const validTypes = ['GMAIL', 'GOOGLE_CALENDAR', 'QUICKBOOKS', 'OUTLOOK'];
  
  if (!validTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      error: { message: 'Invalid integration type' }
    });
  }

  // Handle Gmail OAuth differently
  if (type === 'GMAIL') {
    return handleGmailOAuth(req, res);
  }

  // Handle other integrations with mock responses
  const existingIntegration = Array.from(integrations.values())
    .find(integration => 
      integration.userId === req.userId && integration.type === type
    );

  if (existingIntegration) {
    return res.status(409).json({
      success: false,
      error: { message: `${type} integration already exists` }
    });
  }

  const integrationId = `integration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const integration = {
    id: integrationId,
    type,
    name: type.charAt(0) + type.slice(1).toLowerCase().replace('_', ' '),
    userId: req.userId,
    isConnected: true,
    status: 'ACTIVE',
    connectedAt: new Date().toISOString(),
    lastSync: new Date().toISOString(),
    settings: {}
  };

  integrations.set(integrationId, integration);

  console.log(`✅ Integration connected: ${type} for ${req.user.email}`);

  res.status(201).json({
    success: true,
    data: { integration },
    message: `${type} integration connected successfully`
  });
});

// Gmail OAuth Handler
function handleGmailOAuth(req, res) {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.json({
      success: false,
      error: { 
        message: 'Gmail integration requires Google OAuth setup',
        details: 'To enable real Gmail integration, you need to:\n1. Create a Google Cloud Console project\n2. Enable Gmail API\n3. Create OAuth 2.0 credentials\n4. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables',
        setupRequired: true
      }
    });
  }

  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );

  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.labels'
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state: req.userId // Pass user ID in state to identify user after OAuth
  });

  res.json({
    success: true,
    data: {
      authUrl,
      message: 'Please visit the authorization URL to connect Gmail',
      redirectRequired: true
    },
    message: 'Gmail OAuth flow initiated'
  });
}

// Gmail OAuth callback
app.get('/api/integrations/gmail/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;
  const userId = state;

  console.log('Gmail OAuth callback received:', { code: !!code, state, error, error_description });

  if (error) {
    return res.send(`
      <html>
        <head><title>LawFlowPro - Gmail Connection Failed</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #DC2626;">❌ Gmail Connection Failed</h1>
          <p><strong>Error:</strong> ${error}</p>
          <p><strong>Description:</strong> ${error_description || 'Unknown error occurred'}</p>
          <p>Please close this window and try again.</p>
          <script>
            setTimeout(() => {
              window.close();
            }, 5000);
          </script>
        </body>
      </html>
    `);
  }

  if (!code) {
    return res.send(`
      <html>
        <head><title>LawFlowPro - Gmail Connection Issue</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #DC2626;">❌ Authorization Code Missing</h1>
          <p>The Gmail authorization process didn't complete properly.</p>
          <p>This usually means:</p>
          <ul style="text-align: left; max-width: 400px; margin: 20px auto;">
            <li>Google credentials aren't configured correctly</li>
            <li>The redirect URI doesn't match</li>
            <li>The user cancelled the authorization</li>
          </ul>
          <p>Please close this window and contact support.</p>
          <script>
            setTimeout(() => {
              window.close();
            }, 8000);
          </script>
        </body>
      </html>
    `);
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user's Gmail profile
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });

    // Save integration
    const integrationId = `integration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const integration = {
      id: integrationId,
      type: 'GMAIL',
      name: 'Gmail',
      userId: userId,
      isConnected: true,
      status: 'ACTIVE',
      connectedAt: new Date().toISOString(),
      lastSync: new Date().toISOString(),
      settings: {
        emailAddress: profile.data.emailAddress,
        tokens: tokens,
        messagesTotal: profile.data.messagesTotal,
        threadsTotal: profile.data.threadsTotal
      }
    };

    integrations.set(integrationId, integration);

    console.log(`✅ Gmail connected: ${profile.data.emailAddress} for user ${userId}`);

    // Redirect back to frontend with success
    res.send(`
      <html>
        <head><title>LawFlowPro - Gmail Connected</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #10B981;">✅ Gmail Connected Successfully!</h1>
          <p>Your Gmail account <strong>${profile.data.emailAddress}</strong> has been connected to LawFlowPro.</p>
          <p>You can now close this window and return to LawFlowPro.</p>
          <script>
            setTimeout(() => {
              window.close();
            }, 3000);
          </script>
        </body>
      </html>
    `);

  } catch (error) {
    console.error('Gmail OAuth error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to connect Gmail: ' + error.message }
    });
  }
});

// ====================
// AI PROCESSING ROUTES
// ====================

app.post('/api/ai/email/classify', authenticateToken, (req, res) => {
  const { subject, body, from } = req.body;

  if (!subject || !body || !from) {
    return res.status(400).json({
      success: false,
      error: { message: 'Subject, body, and from are required' }
    });
  }

  // Mock Legal AI classification (replace with real AI service)
  let classification = 'OTHER';
  let confidence = 0.85;
  
  // Smart mock classification based on legal keywords
  const subjectLower = subject.toLowerCase();
  const bodyLower = body.toLowerCase();
  
  if (subjectLower.includes('urgent') || subjectLower.includes('immediate') || subjectLower.includes('emergency')) {
    classification = 'URGENT_LEGAL';
    confidence = 0.92;
  } else if (subjectLower.includes('consultation') || subjectLower.includes('legal advice') || bodyLower.includes('need legal')) {
    classification = 'CLIENT_INQUIRY';
    confidence = 0.88;
  } else if (subjectLower.includes('court') || subjectLower.includes('hearing') || subjectLower.includes('notice')) {
    classification = 'COURT_NOTICE';
    confidence = 0.95;
  } else if (from.includes('law') || from.includes('attorney') || from.includes('legal')) {
    classification = 'OPPOSING_COUNSEL';
    confidence = 0.87;
  } else if (subjectLower.includes('spam') || subjectLower.includes('marketing') || subjectLower.includes('promotion')) {
    classification = 'SPAM';
    confidence = 0.90;
  }

  const result = {
    classification,
    confidence: Math.round(confidence * 100) / 100,
    reasoning: `Classified as ${classification} based on legal context analysis of subject "${subject}" and sender "${from}"`
  };

  console.log(`🤖 Email classified: ${classification} (${Math.round(confidence * 100)}%)`);

  res.json({
    success: true,
    data: result,
    message: 'Email classified successfully'
  });
});

app.post('/api/ai/email/generate-response', authenticateToken, (req, res) => {
  const { originalSubject, originalBody, from, classification } = req.body;

  if (!originalSubject || !originalBody || !from || !classification) {
    return res.status(400).json({
      success: false,
      error: { message: 'All fields are required' }
    });
  }

  // Mock response generation (replace with real AI service)
  const businessType = req.user.businessType.toLowerCase().replace('_', ' ');
  
  let mockResponse;
  switch (classification) {
    case 'URGENT':
      mockResponse = `Thank you for your urgent message regarding "${originalSubject}". I understand the importance of this matter and will prioritize it accordingly. I'll get back to you within 2 hours with a detailed response.`;
      break;
    case 'CLIENT':
      mockResponse = `Thank you for reaching out about "${originalSubject}". As a ${businessType} professional, I appreciate your business and will review your request carefully. I'll respond within 24 hours with next steps.`;
      break;
    case 'VENDOR':
      mockResponse = `Thank you for your message about "${originalSubject}". I'll review your proposal and get back to you soon with feedback.`;
      break;
    default:
      mockResponse = `Thank you for your message about "${originalSubject}". I've received your email and will respond accordingly.`;
  }

  const suggestion = {
    response: mockResponse,
    confidence: 0.85,
    reasoning: `Generated ${classification.toLowerCase()} response appropriate for ${businessType} business`,
    suggestedActions: ['Send response', 'Schedule follow-up', 'Add to calendar']
  };

  console.log(`✨ Email response generated for ${classification} email`);

  res.json({
    success: true,
    data: suggestion,
    message: 'Email response generated successfully'
  });
});

app.post('/api/ai/test', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: {
      aiServiceReady: true,
      mockMode: true, // Indicates we're using mock responses
      user: {
        id: req.user.id,
        businessType: req.user.businessType
      }
    },
    message: 'AI service is ready (mock mode - add OpenAI key for real AI)!'
  });
});

// ====================
// TEMPLATE ROUTES
// ====================

// Template Categories Data
const templateCategories = {
  'email-responses': {
    name: 'Email Response Templates',
    description: 'Professional email templates for client communications',
    templates: [
      'Initial Consultation Response',
      'Case Status Update', 
      'Document Request',
      'Appointment Scheduling',
      'Follow-up Communication'
    ]
  },
  'legal-documents': {
    name: 'Legal Document Templates',
    description: 'Attorney-reviewed legal document templates',
    templates: [
      'Retainer Agreement',
      'Client Intake Form',
      'Engagement Letter',
      'Fee Agreement',
      'Demand Letter'
    ]
  },
  'practice-areas': {
    name: 'Practice Area Templates',
    description: 'Specialized templates by practice area',
    templates: [
      'Personal Injury Forms',
      'Family Law Documents',
      'Corporate Agreements',
      'Real Estate Contracts',
      'Criminal Defense Letters'
    ]
  }
};

// Detailed Template Library
const templateLibrary = {
  'client-consultation-response': {
    category: 'email-responses',
    title: 'Initial Consultation Response',
    description: 'Professional response to new client inquiries',
    content: `Dear [CLIENT_NAME],

Thank you for contacting [LAW_FIRM_NAME] regarding your [LEGAL_MATTER]. I have reviewed your initial inquiry and would be happy to discuss your case in more detail.

I am available for a consultation on [DATE_OPTIONS]. During our meeting, we will discuss:
• The specifics of your legal matter
• Potential legal strategies
• Our fee structure and payment options
• Timeline and next steps

Please call our office at [PHONE] or reply to this email to schedule your consultation.

Best regards,
[ATTORNEY_NAME]
[LAW_FIRM_NAME]
[EMAIL]
[PHONE]`,
    fields: ['CLIENT_NAME', 'LAW_FIRM_NAME', 'LEGAL_MATTER', 'DATE_OPTIONS', 'PHONE', 'ATTORNEY_NAME', 'EMAIL']
  },
  'case-status-update': {
    category: 'email-responses',
    title: 'Case Status Update',
    description: 'Regular case progress updates for clients',
    content: `Dear [CLIENT_NAME],

I wanted to provide you with an update on your case, [CASE_NAME].

Recent Developments:
• [UPDATE_1]
• [UPDATE_2]
• [UPDATE_3]

Next Steps:
[NEXT_STEPS]

Timeline:
[EXPECTED_TIMELINE]

If you have any questions or concerns, please don't hesitate to contact me.

Best regards,
[ATTORNEY_NAME]
[LAW_FIRM_NAME]`,
    fields: ['CLIENT_NAME', 'CASE_NAME', 'UPDATE_1', 'UPDATE_2', 'UPDATE_3', 'NEXT_STEPS', 'EXPECTED_TIMELINE', 'ATTORNEY_NAME', 'LAW_FIRM_NAME']
  },
  'retainer-agreement': {
    category: 'legal-documents',
    title: 'Retainer Agreement Template',
    description: 'Standard retainer agreement for legal services',
    content: `RETAINER AGREEMENT

This Retainer Agreement ("Agreement") is entered into on [DATE] between [LAW_FIRM_NAME], a [STATE] [ENTITY_TYPE] ("Attorney"), and [CLIENT_NAME] ("Client").

1. SCOPE OF REPRESENTATION
Attorney agrees to represent Client in the matter of [LEGAL_MATTER_DESCRIPTION].

2. RETAINER FEE
Client agrees to pay a retainer fee of $[RETAINER_AMOUNT] upon execution of this Agreement.

3. HOURLY RATE
Attorney's hourly rate is $[HOURLY_RATE] for [ATTORNEY_NAME] and $[ASSOCIATE_RATE] for associate attorneys.

4. BILLING AND PAYMENT
Client will be billed monthly. Payment is due within [PAYMENT_TERMS] days of invoice date.

5. TERMINATION
Either party may terminate this Agreement upon [TERMINATION_NOTICE] days written notice.

By signing below, the parties agree to the terms set forth above.

Attorney: _________________________ Date: _________
[ATTORNEY_NAME], [TITLE]
[LAW_FIRM_NAME]

Client: _________________________ Date: _________
[CLIENT_NAME]`,
    fields: ['DATE', 'LAW_FIRM_NAME', 'STATE', 'ENTITY_TYPE', 'CLIENT_NAME', 'LEGAL_MATTER_DESCRIPTION', 'RETAINER_AMOUNT', 'HOURLY_RATE', 'ATTORNEY_NAME', 'ASSOCIATE_RATE', 'PAYMENT_TERMS', 'TERMINATION_NOTICE', 'TITLE']
  },
  'demand-letter-personal-injury': {
    category: 'practice-areas',
    title: 'Personal Injury Demand Letter',
    description: 'Comprehensive demand letter for personal injury claims',
    content: `[DATE]

[INSURANCE_ADJUSTER_NAME]
[INSURANCE_COMPANY]
[ADDRESS]

Re: Claim Number: [CLAIM_NUMBER]
    Date of Loss: [DATE_OF_ACCIDENT]
    Insured: [INSURED_NAME]
    Claimant: [CLIENT_NAME]

Dear [ADJUSTER_NAME],

I represent [CLIENT_NAME] in connection with the motor vehicle accident that occurred on [DATE_OF_ACCIDENT] at [LOCATION].

FACTS OF THE ACCIDENT:
[ACCIDENT_DESCRIPTION]

LIABILITY:
Your insured was negligent in [NEGLIGENCE_DESCRIPTION]. This negligence was the proximate cause of the accident and my client's injuries.

INJURIES AND MEDICAL TREATMENT:
[MEDICAL_SUMMARY]

SPECIAL DAMAGES:
• Medical expenses: $[MEDICAL_EXPENSES]
• Lost wages: $[LOST_WAGES] 
• Property damage: $[PROPERTY_DAMAGE]
Total Special Damages: $[TOTAL_SPECIALS]

SETTLEMENT DEMAND:
Based on the serious nature of my client's injuries and the clear liability of your insured, I hereby demand the sum of $[DEMAND_AMOUNT] in full settlement of this claim.

Please respond within [RESPONSE_TIME] days.

Very truly yours,

[ATTORNEY_NAME]
[TITLE]
[LAW_FIRM_NAME]
[PHONE]
[EMAIL]`,
    fields: ['DATE', 'INSURANCE_ADJUSTER_NAME', 'INSURANCE_COMPANY', 'ADDRESS', 'CLAIM_NUMBER', 'DATE_OF_ACCIDENT', 'INSURED_NAME', 'CLIENT_NAME', 'ADJUSTER_NAME', 'LOCATION', 'ACCIDENT_DESCRIPTION', 'NEGLIGENCE_DESCRIPTION', 'MEDICAL_SUMMARY', 'MEDICAL_EXPENSES', 'LOST_WAGES', 'PROPERTY_DAMAGE', 'TOTAL_SPECIALS', 'DEMAND_AMOUNT', 'RESPONSE_TIME', 'ATTORNEY_NAME', 'TITLE', 'LAW_FIRM_NAME', 'PHONE', 'EMAIL']
  }
};

// Get all template categories
app.get('/api/templates/categories', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: {
      categories: templateCategories,
      totalTemplates: Object.keys(templateLibrary).length
    },
    message: 'Template categories retrieved successfully'
  });
});

// Get templates by category
app.get('/api/templates/category/:categoryId', authenticateToken, (req, res) => {
  const { categoryId } = req.params;
  
  const categoryTemplates = Object.entries(templateLibrary)
    .filter(([_, template]) => template.category === categoryId)
    .reduce((acc, [key, template]) => {
      acc[key] = {
        title: template.title,
        description: template.description,
        category: template.category
      };
      return acc;
    }, {});

  if (Object.keys(categoryTemplates).length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Category not found'
    });
  }

  res.json({
    success: true,
    data: {
      category: templateCategories[categoryId],
      templates: categoryTemplates
    },
    message: `Templates for ${categoryId} retrieved successfully`
  });
});

// Get specific template
app.get('/api/templates/:templateId', authenticateToken, (req, res) => {
  const { templateId } = req.params;
  const template = templateLibrary[templateId];

  if (!template) {
    return res.status(404).json({
      success: false,
      message: 'Template not found'
    });
  }

  res.json({
    success: true,
    data: { template },
    message: 'Template retrieved successfully'
  });
});

// Customize template with user data
app.post('/api/templates/:templateId/customize', authenticateToken, (req, res) => {
  const { templateId } = req.params;
  const { fieldValues } = req.body;
  const template = templateLibrary[templateId];

  if (!template) {
    return res.status(404).json({
      success: false,
      message: 'Template not found'
    });
  }

  let customizedContent = template.content;
  
  // Replace template fields with provided values
  Object.entries(fieldValues || {}).forEach(([field, value]) => {
    const fieldPattern = new RegExp(`\\[${field}\\]`, 'g');
    customizedContent = customizedContent.replace(fieldPattern, value || `[${field}]`);
  });

  res.json({
    success: true,
    data: {
      templateId,
      title: template.title,
      originalContent: template.content,
      customizedContent,
      fieldValues,
      availableFields: template.fields
    },
    message: 'Template customized successfully'
  });
});

// Search templates
app.get('/api/templates/search', authenticateToken, (req, res) => {
  const { q: query, category } = req.query;
  
  let results = Object.entries(templateLibrary);
  
  // Filter by category if provided
  if (category) {
    results = results.filter(([_, template]) => template.category === category);
  }
  
  // Filter by search query if provided
  if (query) {
    const searchTerm = query.toLowerCase();
    results = results.filter(([_, template]) => 
      template.title.toLowerCase().includes(searchTerm) ||
      template.description.toLowerCase().includes(searchTerm) ||
      template.content.toLowerCase().includes(searchTerm)
    );
  }
  
  const searchResults = results.reduce((acc, [key, template]) => {
    acc[key] = {
      title: template.title,
      description: template.description,
      category: template.category
    };
    return acc;
  }, {});

  res.json({
    success: true,
    data: {
      query,
      category,
      results: searchResults,
      totalResults: Object.keys(searchResults).length
    },
    message: 'Template search completed successfully'
  });
});

// ====================
// USER & STATS ROUTES
// ====================

app.get('/api/users/profile', authenticateToken, (req, res) => {
  const { passwordHash, ...userResponse } = req.user;
  res.json({
    success: true,
    data: { user: userResponse },
    message: 'User profile retrieved successfully'
  });
});

app.get('/api/users/stats', authenticateToken, (req, res) => {
  const userIntegrations = Array.from(integrations.values())
    .filter(integration => integration.userId === req.userId);
  
  const stats = {
    integrationsConnected: userIntegrations.length,
    activeAutomations: 0,
    emailsProcessed: Math.floor(Math.random() * 50) + 10, // Mock data
    eventsScheduled: Math.floor(Math.random() * 20) + 5,  // Mock data
    timeSavedHours: Math.floor(Math.random() * 40) + 10   // Mock data
  };

  res.json({
    success: true,
    data: stats,
    message: 'User stats retrieved successfully'
  });
});

// ====================
// TEST ROUTES
// ====================

app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'SMB AI Platform API is working perfectly!',
    data: {
      environment: process.env.NODE_ENV || 'development',
      port: PORT,
      registeredUsers: users.length,
      activeIntegrations: integrations.size,
      timestamp: new Date().toISOString()
    }
  });
});

app.get('/api/test/protected', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Protected endpoint is working!',
    data: {
      userId: req.user.id,
      email: req.user.email,
      businessType: req.user.businessType,
      timestamp: new Date().toISOString()
    }
  });
});

// ====================
// START SERVER
// ====================

app.listen(PORT, () => {
  console.log('🚀 ================================');
  console.log('🚀 LawFlowPro API Server');
  console.log('🚀 ================================');
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`📊 Health: http://localhost:${PORT}/health`);
  console.log(`ℹ️  Info: http://localhost:${PORT}/api/info`);
  console.log('');
  console.log('🔐 Authentication:');
  console.log(`   POST ${PORT}/api/auth/signup`);
  console.log(`   POST ${PORT}/api/auth/signin`);
  console.log(`   GET  ${PORT}/api/auth/me`);
  console.log('');
  console.log('🤖 AI Processing:');
  console.log(`   POST ${PORT}/api/ai/email/classify`);
  console.log(`   POST ${PORT}/api/ai/email/generate-response`);
  console.log(`   POST ${PORT}/api/ai/test`);
  console.log('');
  console.log('🔌 Integrations:');
  console.log(`   GET  ${PORT}/api/integrations`);
  console.log(`   GET  ${PORT}/api/integrations/available`);
  console.log(`   POST ${PORT}/api/integrations/connect/:type`);
  console.log('');
  console.log('👤 User Management:');
  console.log(`   GET  ${PORT}/api/users/profile`);
  console.log(`   GET  ${PORT}/api/users/stats`);
  console.log('');
  console.log('🧪 Test Endpoints:');
  console.log(`   GET  ${PORT}/api/test`);
  console.log(`   GET  ${PORT}/api/test/protected`);
  console.log('');
  console.log('✨ Ready for development!');
});

module.exports = app;