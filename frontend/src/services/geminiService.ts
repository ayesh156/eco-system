// Gemini AI Service for ECOTEC System
// Supports English, Sinhala, and Singlish

interface GeminiResponse {
  candidates?: {
    content: {
      parts: {
        text: string;
      }[];
    };
  }[];
  error?: {
    message: string;
    code: number;
  };
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// System prompt that defines AI behavior
const SYSTEM_PROMPT = `You are ECOTEC AI Assistant - a helpful, friendly, and knowledgeable assistant for the ECOTEC Computer & Mobile Shop Management System.

IMPORTANT LANGUAGE RULES:
1. You MUST respond in the SAME language the user uses:
   - If user writes in English → Reply in English
   - If user writes in Sinhala (සිංහල) → Reply in Sinhala
   - If user writes in Singlish (Sinhala words in English letters like "kohomada", "mokakda", "karanna") → Reply in Singlish
2. Be natural and conversational in the chosen language
3. Use appropriate greetings for each language

⚠️ CRITICAL - DO NOT TRANSLATE THESE (Keep in English always):
- Product names (e.g., "AMD Ryzen 9 7950X", "NVIDIA GeForce RTX 4090", "Samsung 990 Pro")
- Brand names (e.g., "Apple", "Dell", "Corsair", "Logitech", "ASUS", "MSI")
- Model numbers and serial numbers
- Technical specifications (e.g., "DDR5", "NVMe SSD", "RGB", "1TB", "32GB")
- Category names (e.g., "Processors", "Graphics Cards", "Memory", "Storage")
- Status terms (e.g., "Full Paid", "Unpaid", "Pending", "Active")
- Invoice numbers, Job numbers, GRN numbers (e.g., "10260011", "JOB-2026-0001")
- Customer names, Supplier names, Company names
- Currency format "Rs." (keep as Rs. not රු.)
- English labels in data display (Customer, Date, Status, Total, etc.)

Only translate: Conversational text, greetings, explanations, and general instructions.
Example (Sinhala response): "🔍 **INVOICE #10260011** මේක GameZone Café ගේ invoice එක. Total: Rs. 1,345,500"
NOT: "🔍 **ඉන්වොයිසය #10260011** පාරිභෝගිකයා: ගේම්සෝන් කැෆේ"

ABOUT ECOTEC SYSTEM - You have knowledge about:

📦 INVENTORY MANAGEMENT:
- Products: Add, edit, delete products with details (name, brand, category, price, stock, barcode, IMEI)
- Brands: Manage product brands
- Categories: Organize products into categories
- Stock tracking with low stock alerts
- Barcode/QR code support
- IMEI tracking for mobile phones
- Serial number tracking for computers/laptops

👥 CUSTOMER MANAGEMENT:
- Add/edit customer details (name, phone, email, NIC, address)
- Customer purchase history
- Credit sales tracking
- Customer loyalty programs
- Customer statements

📄 SALES & INVOICES:
- Create invoices with multiple products
- Invoice wizard for easy billing
- Print invoices
- Invoice history and search
- Payment tracking (Cash, Card, Bank Transfer)
- Credit payment management

📋 QUOTATIONS & ESTIMATES:
- Create professional quotations
- Convert quotations to invoices
- WhatsApp sharing
- Print quotations
- Estimate management

🔧 SERVICES & REPAIRS:
- Job Notes for repair tracking
- Service categories
- Service pricing
- Repair status tracking
- Job note printing

📥 GOODS RECEIVED (GRN):
- Record incoming stock
- Supplier purchase tracking
- GRN printing
- Purchase history

👔 SUPPLIER MANAGEMENT:
- Add/manage suppliers
- Supplier contact details
- Purchase history per supplier
- Supplier payments tracking

🛡️ WARRANTY MANAGEMENT:
- Track product warranties
- Warranty claims
- Warranty status updates
- Warranty card generation

💰 CASH MANAGEMENT:
- Daily cash summary
- Cash in/out transactions
- Expense tracking
- Bank deposits

📊 REPORTS & ANALYTICS:
- Sales reports
- Inventory reports
- Profit margin analysis
- Outstanding credit reports
- Export to PDF, CSV, Excel (.xlsx)

⚙️ SETTINGS:
- Shop details (name, address, phone)
- Tax settings
- Invoice preferences
- Theme customization (Light/Dark mode)

CURRENCY: Always use Sri Lankan Rupees (Rs.) format: Rs. 150,000.00

HELPFUL TIPS TO SHARE:
- Keyboard shortcuts and quick actions
- Best practices for inventory management
- Tips for efficient billing
- How to generate reports
- Troubleshooting common issues

PERSONALITY:
- Be helpful, friendly, and professional
- Give clear, concise answers
- Provide step-by-step instructions when needed
- If you don't know something, say so honestly
- Suggest relevant features that might help the user

Remember: You represent ECOTEC - a premium computer and mobile shop in Sri Lanka. Be proud of the system and help users make the most of it!`;

class GeminiService {
  private apiKey: string | null = null;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
  private conversationHistory: ChatMessage[] = [];

  constructor() {
    // Initialize API key from environment variable or localStorage
    this.initApiKey();
  }

  private initApiKey() {
    // Priority 1: Environment variable (MUST use VITE_ prefix in Vite)
    const envKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (envKey && typeof envKey === 'string' && envKey.trim().length > 0) {
      this.apiKey = envKey.trim();
      return;
    }
    
    // Priority 2: localStorage
    const storedKey = localStorage.getItem('ecotec_gemini_api_key');
    if (storedKey && storedKey.trim().length > 0) {
      this.apiKey = storedKey.trim();
    }
  }

  setApiKey(key: string) {
    this.apiKey = key.trim();
    // Store in localStorage for persistence
    localStorage.setItem('ecotec_gemini_api_key', key.trim());
  }

  getApiKey(): string | null {
    // Re-check env variable in case it wasn't available at construction
    if (!this.apiKey) {
      this.initApiKey();
    }
    return this.apiKey;
  }

  hasApiKey(): boolean {
    return !!this.getApiKey();
  }

  hasEnvApiKey(): boolean {
    const envKey = import.meta.env.VITE_GEMINI_API_KEY;
    return !!(envKey && typeof envKey === 'string' && envKey.trim().length > 0);
  }

  removeApiKey() {
    // Only clear if not using env key
    if (!this.hasEnvApiKey()) {
      this.apiKey = null;
    }
    localStorage.removeItem('ecotec_gemini_api_key');
    // Re-init to pick up env key if available
    this.initApiKey();
  }

  clearHistory() {
    this.conversationHistory = [];
  }

  getHistory(): ChatMessage[] {
    return [...this.conversationHistory];
  }

  async sendMessage(userMessage: string, responseLanguage: 'auto' | 'english' | 'sinhala' | 'singlish' = 'auto'): Promise<string> {
    const apiKey = this.getApiKey();
    
    if (!apiKey) {
      throw new Error('API key not configured. Please add your Gemini API key in Settings or .env file.');
    }

    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    });

    // Build conversation context
    const conversationContext = this.conversationHistory
      .slice(-10) // Keep last 10 messages for context
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n\n');

    // Language instruction based on preference
    let languageInstruction = '';
    let finalInstructions = 'Please respond to the user\'s latest message naturally and helpfully. Remember to match their language (English, Sinhala, or Singlish).';
    
    if (responseLanguage === 'english') {
      languageInstruction = '\n\nLANGUAGE REQUIREMENT: The user has selected ENGLISH as the response language.';
      finalInstructions = 'Please respond ONLY in English, regardless of what language the user types in. Do not mix languages. Always respond in clear, proper English.';
    } else if (responseLanguage === 'sinhala') {
      languageInstruction = '\n\nLANGUAGE REQUIREMENT: The user has selected SINHALA (සිංහල) as the response language.';
      finalInstructions = 'Please respond ONLY in Sinhala script (සිංහල), regardless of what language the user types in. Use proper Sinhala Unicode characters. Do not use English or transliterated text.';
    } else if (responseLanguage === 'singlish') {
      languageInstruction = '\n\nLANGUAGE REQUIREMENT: The user has selected SINGLISH as the response language.';
      finalInstructions = 'Please respond in Singlish - a mix of Sinhala words written in English letters combined with English words. This is casual Sri Lankan style. Example: "Ow bro, meka hondai. Revenue eka Rs. 6.9 million wage tiyenawa." Be friendly and conversational.';
    }

    const fullPrompt = `${SYSTEM_PROMPT}${languageInstruction}

CONVERSATION HISTORY:
${conversationContext}

${finalInstructions}`;

    try {
      const response = await fetch(`${this.baseUrl}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: fullPrompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || `API Error: ${response.status}`;
        console.error('Gemini API Error:', response.status, errorData);
        
        // Check for specific error types
        if (response.status === 400) {
          throw new Error(`Bad Request: ${errorMessage}`);
        }
        if (response.status === 401 || response.status === 403) {
          throw new Error(`API Key Invalid: ${errorMessage}`);
        }
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        }
        throw new Error(errorMessage);
      }

      const data: GeminiResponse = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      const assistantMessage = data.candidates?.[0]?.content?.parts?.[0]?.text || 
        'Sorry, I could not generate a response. Please try again.';

      // Add assistant response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: assistantMessage,
        timestamp: new Date()
      });

      return assistantMessage;
    } catch (error) {
      // Remove the failed user message from history
      this.conversationHistory.pop();
      
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        if (errorMsg.includes('api key') || errorMsg.includes('api_key_invalid') || errorMsg.includes('invalid api') || errorMsg.includes('401')) {
          throw new Error('Invalid API key. Please check your Gemini API key in Settings or .env file (GEMINI_API_KEY).');
        }
        if (errorMsg.includes('quota') || errorMsg.includes('429')) {
          throw new Error('API quota exceeded. Please try again later or upgrade your plan.');
        }
        if (errorMsg.includes('permission') || errorMsg.includes('403')) {
          throw new Error('API permission denied. Please check your API key has the required permissions.');
        }
        if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
          throw new Error('Network error. Please check your internet connection and try again.');
        }
        throw error;
      }
      throw new Error('An unexpected error occurred. Please try again.');
    }
  }

  /**
   * Get global product suggestions based on partial name
   * Searches for real-world computer/mobile products with Sri Lankan prices
   */
  async suggestProducts(query: string): Promise<Array<{ name: string; brand: string; category: string; estimatedPrice?: number }>> {
    const apiKey = this.getApiKey();
    
    if (!apiKey || query.length < 2) {
      return [];
    }

    try {
      const prompt = `You are a global tech product database expert with knowledge of Sri Lankan market prices.

Based on the partial search "${query}", suggest up to 6 real-world computer/mobile/tech products that match.

IMPORTANT PRICING RULES:
1. First, check if you know the Sri Lankan retail price (LKR) for this product
2. If you only know USD price, convert to LKR using rate: 1 USD = 298 LKR (current rate)
3. Always return price in LKR (Sri Lankan Rupees)
4. Be realistic - Sri Lankan prices are often 10-20% higher than US prices due to import costs

Return ONLY a valid JSON array with this exact structure (no markdown, no explanation):
[
  {
    "name": "Full Product Name with Model",
    "brand": "Brand Name",
    "category": "Category",
    "estimatedPrice": estimated price in LKR as number (must be in Sri Lankan Rupees)
  }
]

Categories: processors, graphics-cards, memory, storage, motherboards, power-supply, cooling, cases, monitors, peripherals, networking, software, laptops, smartphones, tablets, accessories

Focus on accuracy with real product names and realistic Sri Lankan market prices.`;

      const response = await fetch(`${this.baseUrl}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
        })
      });

      if (!response.ok) return [];

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Extract JSON array from response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return [];
    } catch (error) {
      console.error('Product suggestion error:', error);
      return [];
    }
  }

  /**
   * Analyze product image using Gemini Vision
   * Extracts product details from the image with Sri Lankan market prices
   */
  async analyzeProductImage(base64Image: string): Promise<{
    name: string;
    brand: string;
    category: string;
    description: string;
    estimatedPrice: number;
    costPrice: number;
    specs: string[];
    warranty: string;
    barcode: string;
  } | null> {
    const apiKey = this.getApiKey();
    
    if (!apiKey) {
      throw new Error('API key not configured');
    }

    try {
      // Use Gemini Vision model
      const visionUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
      
      const prompt = `You are an expert tech product identifier with knowledge of Sri Lankan market prices.

Analyze this product image carefully and extract ALL possible details.

IMPORTANT PRICING RULES:
1. First, check if you know the Sri Lankan retail price (LKR) for this product
2. If you only know USD price, convert to LKR using rate: 1 USD = 298 LKR (current rate)
3. costPrice should be approximately 75-85% of the selling price (typical markup)
4. Always return prices in LKR (Sri Lankan Rupees)

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "name": "Full product name with exact model number",
  "brand": "Brand name (AMD, Intel, NVIDIA, ASUS, MSI, Gigabyte, Corsair, Samsung, etc.)",
  "category": "processors|graphics-cards|memory|storage|motherboards|power-supply|cooling|cases|monitors|peripherals|networking|software|laptops|smartphones|tablets|accessories",
  "description": "Professional 2-3 sentence description highlighting key features and benefits",
  "estimatedPrice": selling price in LKR as number,
  "costPrice": cost/wholesale price in LKR as number (75-85% of selling price),
  "specs": ["spec 1", "spec 2", "spec 3", "spec 4", "spec 5"],
  "warranty": "1 year|2 years|3 years|5 years|lifetime",
  "barcode": "barcode/UPC if visible, otherwise empty string"
}

Be accurate and extract as much detail as possible from the image. If you cannot identify something, make an educated guess based on visible details.`;

      // Extract base64 data (remove data URL prefix if present)
      const imageData = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
      
      // Detect mime type
      let mimeType = 'image/jpeg';
      if (base64Image.includes('data:image/png')) mimeType = 'image/png';
      else if (base64Image.includes('data:image/webp')) mimeType = 'image/webp';
      else if (base64Image.includes('data:image/gif')) mimeType = 'image/gif';

      const response = await fetch(`${visionUrl}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: imageData
                }
              }
            ]
          }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Vision API error:', response.status, errorData);
        throw new Error('Failed to analyze image');
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Extract JSON object from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return null;
    } catch (error) {
      console.error('Image analysis error:', error);
      throw error;
    }
  }

  /**
   * Generate SEO-friendly product description
   */
  async generateProductDescription(productName: string, brand: string, category: string): Promise<string> {
    const apiKey = this.getApiKey();
    
    if (!apiKey) return '';

    try {
      const prompt = `Write a professional, SEO-friendly product description for:
Product: ${productName}
Brand: ${brand}
Category: ${category}

Keep it concise (2-3 sentences), highlight key features and benefits. Use professional language suitable for an e-commerce site in Sri Lanka.`;

      const response = await fetch(`${this.baseUrl}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 256 },
        })
      });

      if (!response.ok) return '';

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    } catch {
      return '';
    }
  }

  /**
   * Analyze system data based on user query
   * Detects if user is asking about system data and provides intelligent analysis
   */
  async analyzeSystemData(
    userMessage: string, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    systemData: any,
    responseLanguage: 'auto' | 'english' | 'sinhala' | 'singlish' = 'auto'
  ): Promise<string> {
    const apiKey = this.getApiKey();
    
    if (!apiKey) {
      throw new Error('API key not configured.');
    }

    // Language instruction with strict rules about what NOT to translate
    let languageInstruction = '';
    const doNotTranslateRule = `
⚠️ CRITICAL - NEVER TRANSLATE THESE (Always keep in English):
- Product names (AMD Ryzen 9 7950X, NVIDIA GeForce RTX 4090, Samsung 990 Pro, Lian Li O11, G.Skill Trident Z5, etc.)
- Brand names (Apple, Dell, Corsair, Logitech, ASUS, MSI, Intel, AMD, NVIDIA, etc.)
- Model numbers, serial numbers, barcodes
- Technical specs (DDR5, NVMe, SSD, HDD, RGB, 1TB, 32GB, 4K, etc.)
- Category names (Processors, Graphics Cards, Memory, Storage, Monitors, Peripherals, etc.)
- Status words (Full Paid, Unpaid, Pending, Active, Completed, etc.)
- Invoice/Job/GRN numbers (10260011, JOB-2026-0001, GRN-2026-0001)
- Customer names, supplier names, company names
- Currency "Rs." (NOT රු.)
- Labels like: Customer, Date, Status, Total, Qty, Price, Invoice, Items

ONLY translate: Conversational sentences, greetings, and explanations.
`;
    
    if (responseLanguage === 'english') {
      languageInstruction = 'Respond ONLY in English.';
    } else if (responseLanguage === 'sinhala') {
      languageInstruction = `Respond in Sinhala script (සිංහල) for conversational parts.
${doNotTranslateRule}
Example correct Sinhala response:
"🔍 **INVOICE #10260009**
මේක Priya Jayawardena ගේ invoice එක.
📅 Date: 2026-01-14
✅ Status: Full Paid
🛒 Items:
1. Lian Li O11 Dynamic EVO (Qty: 1 x Rs. 58,000)
2. G.Skill Trident Z5 64GB DDR5 (Qty: 1 x Rs. 95,000)
💰 Total: Rs. 175,950"`;
    } else if (responseLanguage === 'singlish') {
      languageInstruction = `Respond in Singlish - Sinhala words in English letters mixed with English.
${doNotTranslateRule}
Example: "Ow bro, meka Priya Jayawardena ge invoice eka. Total Rs. 175,950. Full paid already."`;
    } else {
      languageInstruction = `Respond in the same language the user used (English, Sinhala, or Singlish).
${doNotTranslateRule}`;
    }

    // Build data summary for context
    const dataSummary = this.buildDataSummary(systemData);

    const analysisPrompt = `ROLE: You are the INTELLIGENT DATA ENGINE for ECOTEC Computer Shop.
You are NOT a support agent. You are a DATA TERMINAL that DIRECTLY SHOWS DATA.
Your ONLY job is to query the "CURRENT SYSTEM DATA" block below and answer the user's question using that specific data.

${languageInstruction}

🚫 ABSOLUTELY FORBIDDEN RESPONSES (NEVER SAY THESE):
- "Go to the Supplier Management section"
- "Check the system"
- "Navigate to settings"
- "You can find this in..."
- "Please check..."
- "I recommend going to..."
- "The system has this feature..."
- "ඔබට system එකේ බලන්න පුළුවන්"
- "Supplier Management section එකට ගිහින්"

✅ CORRECT BEHAVIOR:
1. User asks "overdue suppliers kauda?" → SEARCH suppliers with PaymentStatus:overdue, LIST them with all details!
2. User asks "Peripheral Hub contact details denna" → FIND "Peripheral Hub" in supplier data, SHOW: Name, Phone, Email, Address!
3. User asks "denata payment enna thiyana suppliers" → LIST all suppliers where PaymentStatus=overdue with amounts!
4. User asks "pending grn monawada" → SEARCH GRN data for Status:pending, LIST all with supplier, items, amounts!
5. User asks "grn keeya thiyenne" → COUNT GRNs and show breakdown by status (pending, inspecting, completed)!
6. User asks "cash drawer balance" → SHOW Cash Drawer balance from cashAccounts data!
7. User asks "expenses list denna" → LIST all expense transactions with amounts and categories!
8. User asks "today expenses" → FILTER transactions by today's date and type:expense, SHOW list!
9. User asks "completed grn" → FILTER GRNs by status:completed, LIST with details!
10. User asks "GRN-2026-0003 details" → FIND this specific GRN and show ALL details including items!

CRITICAL RULES:
1. ⚠️ YOU HAVE ALL THE DATA BELOW. Search it and show results directly!
2. ⚠️ If user asks for contact details → Show: Phone, Email, Address from the data
3. ⚠️ If user asks for overdue → Find PaymentStatus:overdue in supplier data
4. ⚠️ NEVER tell user to "go somewhere" - YOU show the data!
5. ⚠️ Keep product names, company names, technical terms in English
6. ⚠️ If data not found, say "I cannot find [X] in the current data" - don't redirect!

FORMAT GUIDELINES:
- Use emojis for sections (👤, 📅, 💰, 🛒, 📦).
- Use bold text for labels (**Label:**).
- Keep all labels in English (Customer, Date, Status, Total, Items, Price, Qty)
- Keep all data values in English (product names, brands, statuses, numbers)
- Only use Sinhala/Singlish for conversational parts if user asked in that language

CURRENT SYSTEM DATA (This is your database):
${dataSummary}

USER QUERY: "${userMessage}"

RESPONSE FORMAT (Use this exact format - labels in English):

🔍 **INVOICE #10260009**
━━━━━━━━━━━━━━━━━━━━━━━━
👤 **Customer:** Priya Jayawardena
📅 **Date:** 2026-01-14
✅ **Status:** Full Paid
━━━━━━━━━━━━━━━━━━━━━━━━
🛒 **Items:**
1. Lian Li O11 Dynamic EVO (Qty: 1 x Rs. 58,000)
   → Total: Rs. 58,000
2. G.Skill Trident Z5 64GB DDR5 (Qty: 1 x Rs. 95,000)
   → Total: Rs. 95,000
━━━━━━━━━━━━━━━━━━━━━━━━
💰 **Total:** Rs. 175,950
💳 **Payment:** Cash

For PRODUCTS:
📦 **PRODUCT**
━━━━━━━━━━━━━━━━━━━━━━━━
🔖 **Name:** Logitech G Pro X Superlight 2
🏢 **Brand:** Logitech
🏷️ **Category:** Peripherals
💰 **Price:** Rs. 52,000
📦 **Stock:** 35 units
━━━━━━━━━━━━━━━━━━━━━━━━

For SUPPLIER CONTACT DETAILS:
👔 **SUPPLIER: Peripheral Hub**
━━━━━━━━━━━━━━━━━━━━━━━━
👤 **Contact Person:** Kamal Jayasuriya
📞 **Phone:** 078-3233760
📧 **Email:** kamal@peripheralhub.lk
📍 **Address:** Shop 12, Majestic City, Colombo 4
🏷️ **Categories:** Peripherals, Cooling
━━━━━━━━━━━━━━━━━━━━━━━━
💰 **Total Purchases:** Rs. 1,800,000
📦 **Orders:** 52 orders
⚠️ **We Owe:** Rs. 95,000 (OVERDUE!)
📅 **Due Date:** 2026-01-02

For OVERDUE SUPPLIERS LIST:
🚨 **OVERDUE SUPPLIER PAYMENTS**
━━━━━━━━━━━━━━━━━━━━━━━━
1. ⚠️ **Peripheral Hub** - Rs. 95,000 overdue (Due: 2026-01-02)
   📞 078-3233760 | 📧 kamal@peripheralhub.lk
2. ⚠️ **PC Parts Lanka** - Rs. 420,000 overdue (Due: 2026-01-05)
   📞 078-3233760 | 📧 chamara@pcparts.lk
━━━━━━━━━━━━━━━━━━━━━━━━
💰 **Total Overdue:** Rs. 515,000

For GRN (Goods Received Notes):
📥 **GRN: GRN-2026-0003**
━━━━━━━━━━━━━━━━━━━━━━━━
🏢 **Supplier:** Digital Hub Pvt Ltd
📅 **Order Date:** 2026-01-13
📦 **Status:** Pending
━━━━━━━━━━━━━━━━━━━━━━━━
📋 **Items:**
1. Samsung 980 PRO 2TB NVMe SSD (Ordered: 15)
2. Corsair RM1000x 1000W PSU (Ordered: 10)
━━━━━━━━━━━━━━━━━━━━━━━━
📊 **Totals:**
- Ordered: 25 units
- Received: 0 units
- Accepted: 0 units
💰 **Total Amount:** Rs. 1,455,000
💳 **Payment Status:** Unpaid

For PENDING GRN LIST:
⏳ **PENDING GRNs** (awaiting delivery)
━━━━━━━━━━━━━━━━━━━━━━━━
1. 📦 **GRN-2026-0003** - Digital Hub Pvt Ltd
   → 25 items ordered | Rs. 1,455,000 | Due: 2026-01-14
2. 📦 **GRN-2026-0014** - PC Parts Lanka
   → 27 items ordered | Rs. 1,194,000 | Due: 2026-01-15
━━━━━━━━━━━━━━━━━━━━━━━━
📊 **Total Pending:** 52 items worth Rs. 2,649,000

For CASH MANAGEMENT:
💰 **CASH SUMMARY**
━━━━━━━━━━━━━━━━━━━━━━━━
💵 **Cash Drawer:** Rs. 75,000
👛 **Cash in Hand:** Rs. 125,000
🏦 **Business Fund:** Rs. 450,000
━━━━━━━━━━━━━━━━━━━━━━━━
💰 **Total Cash:** Rs. 650,000

📈 **Income:** Rs. 65,500
📉 **Expenses:** Rs. 37,100
━━━━━━━━━━━━━━━━━━━━━━━━
✅ **Net:** Rs. 28,400

For EXPENSE LIST:
📉 **RECENT EXPENSES**
━━━━━━━━━━━━━━━━━━━━━━━━
1. Electricity Bill - Rs. 2,500 (Utilities)
2. Staff Salary Advance - Rs. 15,000 (Salaries)
3. Shop Rent Payment - Rs. 8,500 (Rent)
━━━━━━━━━━━━━━━━━━━━━━━━
💸 **Total Expenses:** Rs. 37,100
`;

    try {
      const response = await fetch(`${this.baseUrl}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: analysisPrompt }] }],
          generationConfig: { 
            temperature: 0.3, // Lower temperature for more factual responses
            maxOutputTokens: 2048 
          },
        })
      });

      if (!response.ok) {
        throw new Error('Failed to analyze data');
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Unable to analyze data.';
    } catch (error) {
      console.error('Data analysis error:', error);
      throw error;
    }
  }

  /**
   * Build a summary of system data for AI context
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private buildDataSummary(data: any): string {
    const sections: string[] = [];

    // Products Summary
    if (data.products && data.products.length > 0) {
      const products = data.products;
      const totalProducts = products.length;
      const totalStock = products.reduce((sum: number, p: { stock: number }) => sum + p.stock, 0);
      const lowStockItems = products.filter((p: { stock: number; lowStockThreshold?: number }) => p.stock <= (p.lowStockThreshold || 10));
      const outOfStock = products.filter((p: { stock: number }) => p.stock === 0);
      const totalInventoryValue = products.reduce((sum: number, p: { price: number; stock: number }) => sum + (p.price * p.stock), 0);
      const totalCostValue = products.reduce((sum: number, p: { costPrice?: number; stock: number }) => sum + ((p.costPrice || 0) * p.stock), 0);
      
      // Group by category
      const byCategory: Record<string, number> = {};
      products.forEach((p: { category: string }) => {
        byCategory[p.category] = (byCategory[p.category] || 0) + 1;
      });

      // Group by brand
      const byBrand: Record<string, number> = {};
      products.forEach((p: { brand: string }) => {
        byBrand[p.brand] = (byBrand[p.brand] || 0) + 1;
      });

      // All products details for specific lookups - COMPLETE DATA
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const productDetails = products.map((p: any) => 
        `ID:${p.id}|Name:${p.name}|Brand:${p.brand}|Category:${p.category}|SellingPrice:Rs.${p.price?.toLocaleString()}|CostPrice:Rs.${p.costPrice?.toLocaleString() || 'N/A'}|Stock:${p.stock}|SerialNo:${p.serialNumber || 'N/A'}|Barcode:${p.barcode || 'N/A'}|Warranty:${p.warranty || 'N/A'}|TotalSold:${p.totalSold || 0}|Description:${p.description || 'N/A'}`
      ).join('\n  ');

      sections.push(`📦 PRODUCTS (${totalProducts} items):
- Total Stock Units: ${totalStock.toLocaleString()}
- Inventory Retail Value: Rs. ${totalInventoryValue.toLocaleString()}
- Inventory Cost Value: Rs. ${totalCostValue.toLocaleString()}
- Potential Profit: Rs. ${(totalInventoryValue - totalCostValue).toLocaleString()}
- Low Stock Items: ${lowStockItems.length} items
- Out of Stock: ${outOfStock.length} items
- Categories: ${Object.entries(byCategory).map(([k, v]) => `${k}(${v})`).join(', ')}
- Brands: ${Object.entries(byBrand).map(([k, v]) => `${k}(${v})`).join(', ')}
- Low Stock Alert: ${lowStockItems.slice(0, 10).map((p: { name: string; stock: number }) => `${p.name}(${p.stock})`).join(', ')}${lowStockItems.length > 10 ? '...' : ''}
- ALL PRODUCT DATA (search by ID, name, brand, serial, barcode):
  ${productDetails}`);
    }

    // Customers Summary
    if (data.customers && data.customers.length > 0) {
      const customers = data.customers;
      const totalCustomers = customers.length;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalCredit = customers.reduce((sum: number, c: any) => sum + (c.creditBalance || 0), 0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalSpentAll = customers.reduce((sum: number, c: any) => sum + (c.totalSpent || 0), 0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const customersWithCredit = customers.filter((c: any) => (c.creditBalance || 0) > 0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const overdueCustomers = customers.filter((c: any) => c.creditStatus === 'overdue');
      
      // All customer details - COMPLETE DATA
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const customerDetails = customers.map((c: any) => 
        `ID:${c.id}|Name:${c.name}|Phone:${c.phone || 'N/A'}|Email:${c.email || 'N/A'}|Address:${c.address || 'N/A'}|TotalSpent:Rs.${(c.totalSpent || 0).toLocaleString()}|TotalOrders:${c.totalOrders || 0}|LastPurchase:${c.lastPurchase || 'N/A'}|CreditBalance:Rs.${(c.creditBalance || 0).toLocaleString()}|CreditLimit:Rs.${(c.creditLimit || 0).toLocaleString()}|CreditStatus:${c.creditStatus || 'clear'}|CreditDueDate:${c.creditDueDate || 'N/A'}`
      ).join('\n  ');

      sections.push(`👥 CUSTOMERS (${totalCustomers}):
- Total Customer Spending: Rs. ${totalSpentAll.toLocaleString()}
- Total Outstanding Credit: Rs. ${totalCredit.toLocaleString()}
- Customers with Credit: ${customersWithCredit.length}
- Overdue Accounts: ${overdueCustomers.length}
- Top Credit Balances: ${customersWithCredit.sort((a: { creditBalance?: number }, b: { creditBalance?: number }) => (b.creditBalance || 0) - (a.creditBalance || 0)).slice(0, 5).map((c: { name: string; creditBalance?: number }) => `${c.name}(Rs.${(c.creditBalance || 0).toLocaleString()})`).join(', ')}
- ALL CUSTOMER DATA (search by ID, name, phone, email):
  ${customerDetails}`);
    }

    // Invoices Summary
    if (data.invoices && data.invoices.length > 0) {
      const invoices = data.invoices;
      const totalInvoices = invoices.length;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalRevenue = invoices.reduce((sum: number, i: any) => sum + i.total, 0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalPaid = invoices.reduce((sum: number, i: any) => sum + (i.paidAmount || 0), 0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const paidInvoices = invoices.filter((i: any) => i.status === 'fullpaid');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const unpaidInvoices = invoices.filter((i: any) => i.status === 'unpaid');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const partialInvoices = invoices.filter((i: any) => i.status === 'halfpay');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalOutstanding = invoices.reduce((sum: number, i: any) => sum + (i.balanceDue || 0), 0);

      // Monthly breakdown
      const byMonth: Record<string, { count: number; total: number }> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      invoices.forEach((inv: any) => {
        const month = inv.date?.substring(0, 7) || 'Unknown';
        if (!byMonth[month]) byMonth[month] = { count: 0, total: 0 };
        byMonth[month].count++;
        byMonth[month].total += inv.total || 0;
      });

      // Best selling products from invoice items
      const productSales: Record<string, { qty: number; revenue: number }> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      invoices.forEach((inv: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        inv.items?.forEach((item: any) => {
          if (!productSales[item.productName]) productSales[item.productName] = { qty: 0, revenue: 0 };
          productSales[item.productName].qty += item.quantity || 0;
          productSales[item.productName].revenue += item.total || (item.quantity * item.unitPrice) || 0;
        });
      });
      const topProducts = Object.entries(productSales)
        .sort((a, b) => b[1].qty - a[1].qty)
        .slice(0, 10);

      // All invoice details - COMPLETE DATA
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invoiceDetails = invoices.map((inv: any) => 
        `InvoiceID:${inv.id}|Customer:${inv.customerName}|CustomerID:${inv.customerId}|Subtotal:Rs.${(inv.subtotal || 0).toLocaleString()}|Tax:Rs.${(inv.tax || 0).toLocaleString()}|Total:Rs.${(inv.total || 0).toLocaleString()}|PaidAmount:Rs.${(inv.paidAmount || 0).toLocaleString()}|BalanceDue:Rs.${(inv.balanceDue || 0).toLocaleString()}|Status:${inv.status}|Date:${inv.date}|DueDate:${inv.dueDate}|PaymentMethod:${inv.paymentMethod || 'N/A'}|SalesChannel:${inv.salesChannel || 'N/A'}|Items:[${inv.items?.map((i: { productName: string; quantity: number; unitPrice: number; total: number }) => `${i.productName}(Qty:${i.quantity},Price:Rs.${i.unitPrice},Total:Rs.${i.total})`).join('; ') || 'N/A'}]`
      ).join('\n  ');

      sections.push(`📄 INVOICES (${totalInvoices}):
- Total Sales Revenue: Rs. ${totalRevenue.toLocaleString()}
- Total Collected: Rs. ${totalPaid.toLocaleString()}
- Total Outstanding: Rs. ${totalOutstanding.toLocaleString()}
- Fully Paid: ${paidInvoices.length} invoices
- Partially Paid: ${partialInvoices.length} invoices
- Unpaid: ${unpaidInvoices.length} invoices
- Monthly Sales: ${Object.entries(byMonth).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6).map(([m, d]) => `${m}:${d.count}inv/Rs.${d.total.toLocaleString()}`).join(', ')}
- Best Selling Products: ${topProducts.map(([name, d]) => `${name}(${d.qty}units/Rs.${d.revenue.toLocaleString()})`).join(', ')}
- ALL INVOICE DATA (search by InvoiceID, customer name, date):
  ${invoiceDetails}`);
    }

    // Services Summary
    if (data.services && data.services.length > 0) {
      const services = data.services;
      const totalServices = services.length;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const activeServices = services.filter((s: any) => s.status === 'active');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalServiceRevenue = services.reduce((sum: number, s: any) => sum + (s.totalRevenue || 0), 0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalCompleted = services.reduce((sum: number, s: any) => sum + (s.totalCompleted || 0), 0);

      // All service details - COMPLETE DATA
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const serviceDetails = services.map((s: any) => 
        `ID:${s.id}|Name:${s.name}|Category:${s.category}|Description:${s.description || 'N/A'}|BasePrice:Rs.${(s.basePrice || 0).toLocaleString()}|MinPrice:Rs.${(s.minPrice || 'N/A')}|MaxPrice:Rs.${(s.maxPrice || 'N/A')}|PriceType:${s.priceType || 'fixed'}|Duration:${s.estimatedDuration || 'N/A'}|Status:${s.status}|Popular:${s.isPopular ? 'Yes' : 'No'}|Warranty:${s.warranty || 'N/A'}|TotalCompleted:${s.totalCompleted || 0}|TotalRevenue:Rs.${(s.totalRevenue || 0).toLocaleString()}|LastPerformed:${s.lastPerformed || 'N/A'}`
      ).join('\n  ');

      sections.push(`🔧 SERVICES (${totalServices}):
- Active Services: ${activeServices.length}
- Total Services Completed: ${totalCompleted}
- Total Service Revenue: Rs. ${totalServiceRevenue.toLocaleString()}
- Top Revenue Services: ${services.sort((a: { totalRevenue?: number }, b: { totalRevenue?: number }) => (b.totalRevenue || 0) - (a.totalRevenue || 0)).slice(0, 5).map((s: { name: string; totalRevenue?: number }) => `${s.name}(Rs.${(s.totalRevenue || 0).toLocaleString()})`).join(', ')}
- ALL SERVICE DATA (search by ID, name, category):
  ${serviceDetails}`);
    }

    // Job Notes Summary
    if (data.jobNotes && data.jobNotes.length > 0) {
      const jobNotes = data.jobNotes;
      const totalJobs = jobNotes.length;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pendingJobs = jobNotes.filter((j: any) => j.status !== 'completed' && j.status !== 'delivered');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const completedJobs = jobNotes.filter((j: any) => j.status === 'completed' || j.status === 'delivered');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalEstimatedRevenue = jobNotes.reduce((sum: number, j: any) => sum + (j.estimatedCost || 0), 0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalActualRevenue = jobNotes.reduce((sum: number, j: any) => sum + (j.actualCost || 0), 0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalAdvance = jobNotes.reduce((sum: number, j: any) => sum + (j.advancePayment || 0), 0);

      // Group by status
      const byStatus: Record<string, number> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      jobNotes.forEach((j: any) => {
        byStatus[j.status] = (byStatus[j.status] || 0) + 1;
      });

      // All job note details - COMPLETE DATA
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jobDetails = jobNotes.map((j: any) => 
        `ID:${j.id}|JobNumber:${j.jobNumber}|Customer:${j.customerName}|Phone:${j.customerPhone || 'N/A'}|DeviceType:${j.deviceType}|Brand:${j.deviceBrand}|Model:${j.deviceModel}|SerialNo:${j.serialNumber || 'N/A'}|Accessories:${j.accessories?.join(', ') || 'None'}|Condition:${j.deviceCondition || 'N/A'}|Issue:${j.reportedIssue}|Diagnosis:${j.diagnosisNotes || 'N/A'}|ServiceRequired:${j.serviceRequired || 'N/A'}|EstimatedCost:Rs.${(j.estimatedCost || 0).toLocaleString()}|ActualCost:Rs.${(j.actualCost || 0).toLocaleString()}|AdvancePaid:Rs.${(j.advancePayment || 0).toLocaleString()}|Status:${j.status}|Priority:${j.priority}|ReceivedDate:${j.receivedDate}|ExpectedCompletion:${j.expectedCompletionDate || 'N/A'}|CompletedDate:${j.completedDate || 'N/A'}|Technician:${j.assignedTechnician || 'Unassigned'}`
      ).join('\n  ');

      sections.push(`📋 JOB NOTES/REPAIRS (${totalJobs}):
- Pending/In Progress: ${pendingJobs.length}
- Completed/Delivered: ${completedJobs.length}
- Status Breakdown: ${Object.entries(byStatus).map(([s, c]) => `${s}(${c})`).join(', ')}
- Total Estimated Revenue: Rs. ${totalEstimatedRevenue.toLocaleString()}
- Total Actual Revenue: Rs. ${totalActualRevenue.toLocaleString()}
- Total Advance Collected: Rs. ${totalAdvance.toLocaleString()}
- ALL JOB DATA (search by ID, job number, customer, device, status):
  ${jobDetails}`);
    }

    // Suppliers Summary - ENHANCED with overdue details
    if (data.suppliers && data.suppliers.length > 0) {
      const suppliers = data.suppliers;
      const totalSuppliers = suppliers.length;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalOutstanding = suppliers.reduce((sum: number, s: any) => sum + (s.creditBalance || 0), 0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalPurchasesValue = suppliers.reduce((sum: number, s: any) => sum + (s.totalPurchases || 0), 0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const overdueSuppliers = suppliers.filter((s: any) => s.creditStatus === 'overdue');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const activeSuppliers = suppliers.filter((s: any) => s.creditStatus === 'active');

      // Detailed OVERDUE suppliers list
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const overdueDetails = overdueSuppliers.map((s: any) => 
        `⚠️ ${s.company || s.name} (Contact: ${s.name}) - Phone: ${s.phone} - Email: ${s.email} - OVERDUE Amount: Rs. ${(s.creditBalance || 0).toLocaleString()} - Due Date: ${s.creditDueDate || 'N/A'}`
      ).join('\n  ');

      // All supplier details - COMPLETE DATA with better formatting
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supplierDetails = suppliers.map((s: any) => 
        `[${s.company || s.name}] ContactPerson:${s.name}|Phone:${s.phone || 'N/A'}|Email:${s.email || 'N/A'}|Address:${s.address || 'N/A'}|Categories:${s.categories?.join(', ') || 'N/A'}|TotalPurchases:Rs.${(s.totalPurchases || 0).toLocaleString()}|TotalOrders:${s.totalOrders || 0}|LastOrder:${s.lastOrder || 'N/A'}|CreditBalance(WeOwe):Rs.${(s.creditBalance || 0).toLocaleString()}|CreditLimit:Rs.${(s.creditLimit || 0).toLocaleString()}|PaymentStatus:${s.creditStatus || 'clear'}|DueDate:${s.creditDueDate || 'N/A'}|Rating:${s.rating || 'N/A'}/5`
      ).join('\n  ');

      sections.push(`👔 SUPPLIERS (${totalSuppliers}):
- Total Purchases Value: Rs. ${totalPurchasesValue.toLocaleString()}
- Total Outstanding (We Owe Suppliers): Rs. ${totalOutstanding.toLocaleString()}
- ⚠️ OVERDUE PAYMENTS: ${overdueSuppliers.length} suppliers
- Active Credit: ${activeSuppliers.length} suppliers

🚨 OVERDUE SUPPLIER PAYMENTS (We need to pay these!):
  ${overdueDetails || 'None'}

📋 ALL SUPPLIER CONTACT & PAYMENT DATA:
  ${supplierDetails}`);
    }

    // Warranties Summary
    if (data.warranties && data.warranties.length > 0) {
      const warranties = data.warranties;
      const totalWarranties = warranties.length;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pendingClaims = warranties.filter((w: any) => w.status === 'pending' || w.status === 'under-review');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const approvedClaims = warranties.filter((w: any) => w.status === 'approved');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resolvedClaims = warranties.filter((w: any) => w.status === 'replaced' || w.status === 'repaired');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rejectedClaims = warranties.filter((w: any) => w.status === 'rejected');

      // Group by status
      const byStatus: Record<string, number> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      warranties.forEach((w: any) => {
        byStatus[w.status] = (byStatus[w.status] || 0) + 1;
      });

      // All warranty details - COMPLETE DATA
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const warrantyDetails = warranties.map((w: any) => {
        const expiry = new Date(w.warrantyExpiryDate);
        const now = new Date();
        const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return `ID:${w.id}|InvoiceID:${w.invoiceId}|ProductID:${w.productId}|Product:${w.productName}|SerialNo:${w.productSerialNumber || 'N/A'}|CustomerID:${w.customerId}|Customer:${w.customerName}|Phone:${w.customerPhone || 'N/A'}|ClaimDate:${w.claimDate}|WarrantyExpiry:${w.warrantyExpiryDate}|DaysLeft:${daysLeft > 0 ? daysLeft : 'Expired'}|Status:${w.status}|IssueCategory:${w.issueCategory}|IssueDescription:${w.issueDescription}|Resolution:${w.resolution || 'Pending'}|ResolutionDate:${w.resolutionDate || 'N/A'}|IsReplacement:${w.isReplacement ? 'Yes' : 'No'}|ReplacementProduct:${w.replacementProductName || 'N/A'}|HandledBy:${w.handledBy || 'Unassigned'}`;
      }).join('\n  ');

      sections.push(`🛡️ WARRANTY CLAIMS (${totalWarranties}):
- Pending/Under Review: ${pendingClaims.length}
- Approved: ${approvedClaims.length}
- Resolved (Replaced/Repaired): ${resolvedClaims.length}
- Rejected: ${rejectedClaims.length}
- Status Breakdown: ${Object.entries(byStatus).map(([s, c]) => `${s}(${c})`).join(', ')}
- ALL WARRANTY DATA (search by ID, invoice, product, customer, status):
  ${warrantyDetails}`);
    }

    // GRN (Goods Received Notes) Summary - NEW SECTION
    if (data.grns && data.grns.length > 0) {
      const grns = data.grns;
      const totalGRNs = grns.length;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pendingGRNs = grns.filter((g: any) => g.status === 'pending');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const inspectingGRNs = grns.filter((g: any) => g.status === 'inspecting');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const completedGRNs = grns.filter((g: any) => g.status === 'completed');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const partialGRNs = grns.filter((g: any) => g.status === 'partial');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalGRNValue = grns.reduce((sum: number, g: any) => sum + (g.totalAmount || 0), 0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalPaidGRN = grns.reduce((sum: number, g: any) => sum + (g.paidAmount || 0), 0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalUnpaidGRN = grns.filter((g: any) => g.paymentStatus === 'unpaid' || g.paymentStatus === 'partial')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .reduce((sum: number, g: any) => sum + ((g.totalAmount || 0) - (g.paidAmount || 0)), 0);

      // Group by status
      const byStatus: Record<string, number> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      grns.forEach((g: any) => {
        byStatus[g.status] = (byStatus[g.status] || 0) + 1;
      });

      // Group by supplier
      const bySupplier: Record<string, { count: number; value: number }> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      grns.forEach((g: any) => {
        const supplier = g.supplierName || 'Unknown';
        if (!bySupplier[supplier]) bySupplier[supplier] = { count: 0, value: 0 };
        bySupplier[supplier].count++;
        bySupplier[supplier].value += g.totalAmount || 0;
      });

      // All GRN details - COMPLETE DATA
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const grnDetails = grns.map((g: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const itemsSummary = g.items?.map((item: any) => 
          `${item.productName}(Ordered:${item.orderedQuantity},Received:${item.receivedQuantity},Accepted:${item.acceptedQuantity},Rejected:${item.rejectedQuantity},Price:Rs.${(item.unitPrice || 0).toLocaleString()})`
        ).join('; ') || 'No items';
        
        return `[${g.grnNumber}] Supplier:${g.supplierName}|OrderDate:${g.orderDate}|ExpectedDate:${g.expectedDeliveryDate}|ReceivedDate:${g.receivedDate || 'Not yet'}|TotalOrdered:${g.totalOrderedQuantity}|TotalReceived:${g.totalReceivedQuantity}|TotalAccepted:${g.totalAcceptedQuantity}|TotalRejected:${g.totalRejectedQuantity}|Subtotal:Rs.${(g.subtotal || 0).toLocaleString()}|Discount:Rs.${(g.discountAmount || 0).toLocaleString()}|TotalAmount:Rs.${(g.totalAmount || 0).toLocaleString()}|PaidAmount:Rs.${(g.paidAmount || 0).toLocaleString()}|Balance:Rs.${((g.totalAmount || 0) - (g.paidAmount || 0)).toLocaleString()}|PaymentStatus:${g.paymentStatus}|Status:${g.status}|ReceivedBy:${g.receivedBy || 'N/A'}|Notes:${g.notes || 'N/A'}|Items:[${itemsSummary}]`;
      }).join('\n  ');

      sections.push(`📥 GRN - GOODS RECEIVED NOTES (${totalGRNs}):
- Total GRN Value: Rs. ${totalGRNValue.toLocaleString()}
- Total Paid: Rs. ${totalPaidGRN.toLocaleString()}
- Total Unpaid: Rs. ${totalUnpaidGRN.toLocaleString()}
- Status Breakdown: ${Object.entries(byStatus).map(([s, c]) => `${s}(${c})`).join(', ')}
- Pending: ${pendingGRNs.length} GRNs (awaiting delivery)
- Inspecting: ${inspectingGRNs.length} GRNs (being checked)
- Partial: ${partialGRNs.length} GRNs (some items accepted)
- Completed: ${completedGRNs.length} GRNs (fully processed)
- By Supplier: ${Object.entries(bySupplier).map(([s, d]) => `${s}(${d.count}GRNs/Rs.${d.value.toLocaleString()})`).join(', ')}
- ALL GRN DATA (search by GRN number, supplier, status, date):
  ${grnDetails}`);
    }

    // Cash Management Summary - NEW SECTION
    if (data.cashAccounts && data.cashAccounts.length > 0) {
      const accounts = data.cashAccounts;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalCash = accounts.reduce((sum: number, a: any) => sum + (a.balance || 0), 0);
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accountDetails = accounts.map((a: any) => 
        `${a.name}(${a.type}):Rs.${(a.balance || 0).toLocaleString()}`
      ).join(', ');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accountFullDetails = accounts.map((a: any) => 
        `[${a.name}] Type:${a.type}|Balance:Rs.${(a.balance || 0).toLocaleString()}|Description:${a.description || 'N/A'}`
      ).join('\n  ');

      let transactionDetails = '';
      let transactionSummary = '';
      
      if (data.cashTransactions && data.cashTransactions.length > 0) {
        const transactions = data.cashTransactions;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const incomeTotal = transactions.filter((t: any) => t.type === 'income')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const expenseTotal = transactions.filter((t: any) => t.type === 'expense')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transferTotal = transactions.filter((t: any) => t.type === 'transfer')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
        
        // Group by category
        const byCategory: Record<string, number> = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        transactions.filter((t: any) => t.type === 'expense').forEach((t: any) => {
          const cat = t.category || 'Other';
          byCategory[cat] = (byCategory[cat] || 0) + (t.amount || 0);
        });

        transactionSummary = `
- Total Income: Rs. ${incomeTotal.toLocaleString()}
- Total Expenses: Rs. ${expenseTotal.toLocaleString()}
- Total Transfers: Rs. ${transferTotal.toLocaleString()}
- Net (Income - Expense): Rs. ${(incomeTotal - expenseTotal).toLocaleString()}
- Expense Categories: ${Object.entries(byCategory).map(([c, v]) => `${c}(Rs.${v.toLocaleString()})`).join(', ')}`;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        transactionDetails = transactions.map((t: any) => 
          `[${t.transactionNumber}] Type:${t.type}|Account:${t.accountType}|Amount:Rs.${(t.amount || 0).toLocaleString()}|Name:${t.name}|Category:${t.category || 'N/A'}|Date:${t.transactionDate}|BalanceBefore:Rs.${(t.balanceBefore || 0).toLocaleString()}|BalanceAfter:Rs.${(t.balanceAfter || 0).toLocaleString()}|Reference:${t.referenceType || 'N/A'}|Description:${t.description || 'N/A'}`
        ).join('\n  ');
      }

      sections.push(`💰 CASH MANAGEMENT:
- Total Cash Balance: Rs. ${totalCash.toLocaleString()}
- Account Balances: ${accountDetails}
${transactionSummary}
- ALL CASH ACCOUNTS:
  ${accountFullDetails}
- ALL CASH TRANSACTIONS (search by transaction number, type, category, date):
  ${transactionDetails || 'No transactions'}`);
    }

    return sections.join('\n\n');
  }

  /**
   * Check if a message is asking about system data
   */
  isDataQuery(message: string): boolean {
    const dataKeywords = [
      // Sales & Revenue
      'sales', 'revenue', 'income', 'sold', 'selling', 'best selling', 'top selling',
      'vikunu', 'vikina', 'aadhayama', 'labha',
      // Stock & Inventory
      'stock', 'inventory', 'low stock', 'out of stock', 'available',
      'stock eka', 'thiyenawa', 'nethi',
      // Products
      'product', 'item', 'products', 'items', 'how many products',
      'product keeya', 'item keeya',
      // Customers
      'customer', 'customers', 'credit', 'outstanding', 'balance', 'owing',
      'customer kenekuge', 'credit balance',
      // Invoices
      'invoice', 'bill', 'invoices', 'bills', 'unpaid', 'pending',
      'invoice keeya', 'bill keeya',
      // Reports & Analysis
      'report', 'analysis', 'summary', 'statistics', 'stats', 'total', 'count',
      'report eka', 'analyze', 'analyse',
      // Time-based
      'today', 'yesterday', 'this month', 'last month', 'this week', 'this year',
      'ada', 'iye', 'mee masaye', 'giya masaye',
      // Services & Repairs
      'repair', 'repairs', 'service', 'job', 'jobs', 'pending repair',
      'repair keeya', 'job eka',
      // Profit & Margin
      'profit', 'margin', 'profit margin', 'earnings',
      'labha', 'margin eka',
      // Suppliers - Enhanced
      'supplier', 'suppliers', 'purchase', 'purchases', 'overdue', 'payment enna',
      'denata', 'ganna ona', 'contact', 'details', 'phone', 'email', 'address',
      'supplier ge', 'supplier eka', 'supplier kenek',
      // Warranty
      'warranty', 'warranties', 'expiring', 'claim',
      // GRN - Goods Received Notes - NEW
      'grn', 'goods received', 'received', 'delivery', 'deliveries',
      'grn eka', 'grn keeya', 'pending grn', 'inspecting', 'accepted', 'rejected',
      'grn status', 'awith', 'aawa', 'labuna', 'labuna de',
      // Cash Management - NEW
      'cash', 'drawer', 'expense', 'expenses', 'income', 'transaction',
      'cash eka', 'salli', 'kharcha', 'ganu denu', 'drawer balance',
      'business fund', 'petty cash', 'transfer',
      // Questions & Actions - Enhanced
      'how many', 'how much', 'what is', 'which', 'list', 'show', 'give me', 'find',
      'keeya', 'keeyada', 'mokakda', 'monawada', 'pennanna', 'denna', 'kauda', 'kawda',
      'thiyana', 'thiyena', 'inna', 'innawa', 'wela', 'details denna', 'info',
      // Specific company/person name patterns
      'hub', 'solutions', 'tech', 'zone', 'masters', 'elite', 'pro', 'kingdom', 'digital',
      // Common business terms
      'naya', 'owed', 'due', 'pay', 'payment', 'owes', 'debt', 'completed', 'status'
    ];

    const lowerMessage = message.toLowerCase();
    
    // Check for keywords
    const hasKeyword = dataKeywords.some(keyword => lowerMessage.includes(keyword));
    
    // Check for invoice/product ID patterns (e.g., 10260011, INV-001, etc.)
    const hasIdPattern = /\b\d{6,10}\b|\b(inv|pro|cus|job|grn|est|quo)[-_]?\d+\b/i.test(message);
    
    return hasKeyword || hasIdPattern;
  }
}

// Export singleton instance
export const geminiService = new GeminiService();
export type { ChatMessage };
