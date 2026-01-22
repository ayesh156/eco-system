# AI Coding Agent Instructions for Echotech System

## ⚡ CRITICAL: Task Management & Length Limit Prevention

**IMPORTANT:** When given large/complex tasks, you MUST follow these rules to avoid "response hit the length limit" errors:

### Breaking Down Large Tasks:
1. **Never attempt to complete everything in one response** - Split into logical subtasks
2. **Prioritize working code over lengthy explanations** - Code first, explain briefly
3. **Create files incrementally** - One file at a time for large components
4. **Use efficient patterns** - Reuse existing code patterns from the codebase
5. **Stop and continue** - If a task is large, complete part of it and indicate what's next

### Creative Task Execution:
1. **Analyze the request** - Understand the full scope before starting
2. **Plan the approach** - Identify all files that need to be created/modified
3. **Execute in phases**:
   - Phase 1: Core structure (routes, navigation, basic page)
   - Phase 2: UI components and styling
   - Phase 3: Functionality and interactions
   - Phase 4: Polish and refinements
4. **Communicate progress** - Brief updates on what's done and what's next

### Example Task Breakdown:
```
Large Task: "Create a complete Estimates page with wizard, PDF export, email"

Split into:
1. First: Create basic Estimates page with list view
2. Then: Add filters and search functionality  
3. Then: Create Estimate form/wizard modal
4. Then: Add PDF export feature
5. Finally: Add email functionality
```

---

## 🌐 Language Understanding (Singlish/Sri Lankan English Support)

**IMPORTANT:** The user may provide instructions in **Singlish** (Sri Lankan English mix - a blend of Sinhala transliterated in English letters mixed with English words). You MUST:

1. **Understand Singlish instructions** and interpret them correctly in English
2. **Respond in clear English** regardless of input language
3. **Common Singlish patterns to recognize:**
   - "hadanna" = create/build/make
   - "danna" = put/add
   - "balanna" = look/check/see
   - "eka"/"ekak" = one/this/that thing
   - "wage" = like/similar to
   - "ekata" = to it/for it
   - "anuwa" = according to
   - "awashya" = necessary/needed
   - "mee" = this
   - "page eka" = this page
   - "component ekak" = a component
   - "work karanawa" = working/functioning
   - "error enawa" = getting error
   - "fix karanna" = fix it
   - "add karanna" = add it
   - "delete karanna" = delete it
   - "update karanna" = update it
   - "design eka" = the design
   - "theme eka" = the theme
   - "modal ekak" = a modal
   - "button ekak" = a button
   - "form ekak" = a form
   - "table ekak" = a table
   - "hondai" = good/nice
   - "hondatama" = properly/well
   - "wenas karanna" = change it
   - "thawa" = more/another
   - "puluwan" = can/possible
   - "behe" = cannot/not possible
   - "monawada" = what
   - "kohomada" = how
   - "aeyi" = why

---

## 🏆 Project Vision: World-Class Computer & Mobile Shop Management System

**Think like a world-best software engineer** when working on this project. Echotech System is designed to be a **premium, enterprise-grade computer and mobile shop management system**.

### 🌍 World-Class Features (Analyze & Implement):
Study and implement features from world-leading POS/Shop management systems:
- **Square POS** - Clean UI, quick checkout, inventory management
- **Lightspeed** - Advanced reporting, multi-location support
- **Vend** - Customer loyalty, product variants
- **ShopKeep** - Employee management, real-time analytics
- **Toast POS** - Order management, kitchen display systems

### 🇱🇰 Sri Lankan Business Adaptation:
Customize all features for Sri Lankan computer/mobile shop context:

1. **Currency & Pricing:**
   - Always use LKR (Rs.) format: `Rs. 150,000.00`
   - Support for price negotiations (common in SL shops)
   - Installment/Leasing options (very popular for electronics)

2. **Local Business Practices:**
   - **Warranty Cards** - Physical warranty card generation (Sri Lankan shops issue these)
   - **Trade-in/Exchange** - Used device trade-in system
   - **Repair Job Cards** - Detailed repair tracking (common in mobile shops)
   - **WhatsApp Integration** - Send invoices/updates via WhatsApp (widely used in SL)
   - **Cash/Card/Bank Transfer** - Multiple payment methods including bank deposits

3. **Tax & Compliance:**
   - Support for Sri Lankan tax calculations
   - Invoice formats compliant with local requirements

4. **Local Inventory Needs:**
   - IMEI tracking for mobile phones
   - Serial number tracking for computers/laptops
   - Barcode/QR code support
   - Low stock alerts with supplier info

5. **Customer Management:**
   - NIC (National ID) storage for warranty claims
   - Credit sales tracking (common practice)
   - Customer loyalty programs

6. **Reporting for SL Business:**
   - Daily sales summary
   - Profit margin reports
   - Outstanding credit reports
   - Warranty expiry reports

---

## 📁 Project Architecture

### Technology Stack
- **React 18+** with TypeScript (strict mode)
- **Vite** for lightning-fast development
- **Tailwind CSS** for utility-first styling
- **Radix UI** for accessible primitives
- **React Router v6** for navigation
- **TanStack Query** for data management
- **Lucide React** for beautiful icons

### Directory Structure
```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Base UI primitives (Button, Card, Input, etc.)
│   ├── modals/          # Modal dialogs for CRUD operations
│   ├── AdminLayout.tsx  # Main layout with sidebar navigation
│   └── Printable*.tsx   # Print-ready document components
├── pages/               # Route-based page components
├── contexts/            # React Context providers (Theme, etc.)
├── hooks/               # Custom React hooks
├── lib/                 # Utility functions
├── data/                # Mock data and type definitions
└── assets/              # Static assets (images, fonts)
```

---

## 🎨 Design System & Theme

### Theme Implementation
The system supports **light/dark mode** via `ThemeContext`. Always implement both themes:

```tsx
// Always use theme-aware styling
const { theme } = useTheme();

// Dark mode classes
className={`${theme === 'dark' 
  ? 'bg-slate-900 text-white border-slate-700' 
  : 'bg-white text-slate-900 border-slate-200'
}`}
```

### Color Palette
```
Primary Accent: emerald-500 (#10b981) - Main brand color
Secondary Accent: blue-500 (#3b82f6) - Secondary actions
Success: green-500 (#22c55e)
Warning: amber-500 (#f59e0b)
Error: red-500 (#ef4444)
Info: sky-500 (#0ea5e9)

Dark Mode Background Gradient:
- from-slate-900 via-slate-900 to-slate-950
- Cards: bg-slate-800/50 with border-slate-700/50

Light Mode:
- Background: slate-50 to white
- Cards: bg-white with border-slate-200
```

### Modern UI Patterns (MUST FOLLOW)

#### 1. Card Component Style
```tsx
<div className={`relative overflow-hidden rounded-2xl border p-6 ${
  theme === 'dark' 
    ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50' 
    : 'bg-white border-slate-200 shadow-sm'
}`}>
  {/* Glassmorphism blur effect */}
  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/20 to-blue-500/10 rounded-full blur-3xl" />
  <div className="relative">
    {/* Content here */}
  </div>
</div>
```

#### 2. Button Styles
```tsx
// Primary gradient button
<button className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-xl font-medium shadow-lg hover:shadow-emerald-500/25 transition-all">

// Secondary button (dark mode)
<button className={`px-4 py-2 rounded-xl border transition-all ${
  theme === 'dark'
    ? 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50 text-slate-300'
    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
}`}>

// Icon button
<button className={`p-2.5 rounded-xl border transition-all ${
  theme === 'dark' 
    ? 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50 text-slate-400' 
    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
}`}>
```

#### 3. Input Fields
```tsx
<input className={`w-full px-4 py-2.5 rounded-xl border transition-all ${
  theme === 'dark'
    ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20'
    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
}`} />
```

#### 4. Table Design
```tsx
// Table container
<div className={`rounded-2xl border overflow-hidden ${
  theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'
}`}>
  <table className="w-full">
    <thead className={`${
      theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'
    }`}>
      <tr>
        <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${
          theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
        }`}>Column</th>
      </tr>
    </thead>
    <tbody className={`divide-y ${
      theme === 'dark' ? 'divide-slate-700/50' : 'divide-slate-200'
    }`}>
      <tr className={`transition-colors ${
        theme === 'dark' ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'
      }`}>
        <td className={`px-6 py-4 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
          Content
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

#### 5. Modal Design
```tsx
<Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent className={`max-w-2xl ${
    theme === 'dark' 
      ? 'bg-slate-900 border-slate-700/50' 
      : 'bg-white border-slate-200'
  }`}>
    <DialogHeader>
      <DialogTitle className={`text-xl font-semibold ${
        theme === 'dark' ? 'text-white' : 'text-slate-900'
      }`}>
        Modal Title
      </DialogTitle>
    </DialogHeader>
    {/* Modal content */}
  </DialogContent>
</Dialog>
```

#### 6. Status Badges
```tsx
// Status badge with gradient background
<span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
  status === 'active'
    ? 'bg-gradient-to-r from-emerald-500/10 to-green-500/10 text-emerald-400 border border-emerald-500/20'
    : status === 'pending'
    ? 'bg-gradient-to-r from-amber-500/10 to-yellow-500/10 text-amber-400 border border-amber-500/20'
    : 'bg-gradient-to-r from-red-500/10 to-rose-500/10 text-red-400 border border-red-500/20'
}`}>
  <span className="w-1.5 h-1.5 rounded-full bg-current" />
  {status}
</span>
```

#### 7. Page Header Pattern
```tsx
<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
  <div>
    <h1 className={`text-2xl lg:text-3xl font-bold ${
      theme === 'dark' ? 'text-white' : 'text-slate-900'
    }`}>
      Page Title
    </h1>
    <p className={`mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
      Page description goes here
    </p>
  </div>
  <div className="flex items-center gap-3">
    {/* Action buttons */}
  </div>
</div>
```

---

## 📝 Component Creation Guidelines

### When Creating New Components:

1. **Always use TypeScript** with proper interfaces:
```tsx
interface ComponentProps {
  title: string;
  items: ItemType[];
  onAction: (id: string) => void;
  isLoading?: boolean;
}

export const Component: React.FC<ComponentProps> = ({ title, items, onAction, isLoading = false }) => {
  const { theme } = useTheme();
  // ...
};
```

2. **Always import and use theme**:
```tsx
import { useTheme } from '../contexts/ThemeContext';
```

3. **Use Lucide icons**:
```tsx
import { Package, Search, Plus, Edit, Trash2 } from 'lucide-react';
```

4. **Implement responsive design**:
```tsx
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6"
```

5. **Add smooth transitions**:
```tsx
className="transition-all duration-300 ease-in-out"
```

### Modal Component Template:
```tsx
import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { X } from 'lucide-react';

interface ModalNameProps {
  isOpen: boolean;
  onClose: () => void;
  // Add other props
}

export const ModalName: React.FC<ModalNameProps> = ({ isOpen, onClose }) => {
  const { theme } = useTheme();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-2xl ${
        theme === 'dark' ? 'bg-slate-900 border-slate-700/50' : 'bg-white'
      }`}>
        <DialogHeader>
          <DialogTitle className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>
            Title
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Content */}
        </div>

        <div className={`flex justify-end gap-3 pt-4 border-t ${
          theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'
        }`}>
          <button onClick={onClose} className={`px-4 py-2 rounded-xl ${
            theme === 'dark' 
              ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' 
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}>
            Cancel
          </button>
          <button className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-xl">
            Save
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
```

### Page Component Template:
```tsx
import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Search, Plus, Filter } from 'lucide-react';

export const PageName: React.FC = () => {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-6 pb-8">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className={`text-2xl lg:text-3xl font-bold ${
            theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>
            Page Title
          </h1>
          <p className={`mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Manage your items here
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-xl font-medium shadow-lg hover:shadow-emerald-500/25 transition-all">
          <Plus className="w-5 h-5" />
          Add New
        </button>
      </div>

      {/* Search & Filters */}
      <div className={`rounded-2xl border p-4 ${
        theme === 'dark' 
          ? 'bg-slate-800/30 border-slate-700/50' 
          : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
              theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
            }`} />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${
                theme === 'dark'
                  ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500'
                  : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* Cards or content */}
      </div>
    </div>
  );
};
```

---

## 💰 Currency Formatting (Sri Lankan Rupees)

Always use LKR formatting for monetary values:
```tsx
const formatCurrency = (amount: number): string => {
  return `Rs. ${amount.toLocaleString('en-LK')}`;
};

// Usage
<span>{formatCurrency(150000)}</span> // Rs. 150,000
```

---

## 🔄 State Management Patterns

### Local State
```tsx
const [items, setItems] = useState<ItemType[]>([]);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
```

### Form State
```tsx
const [formData, setFormData] = useState({
  name: '',
  email: '',
  phone: '',
});

const handleChange = (field: string, value: string) => {
  setFormData(prev => ({ ...prev, [field]: value }));
};
```

### Modal State
```tsx
const [isModalOpen, setIsModalOpen] = useState(false);
const [selectedItem, setSelectedItem] = useState<ItemType | null>(null);

const openEditModal = (item: ItemType) => {
  setSelectedItem(item);
  setIsModalOpen(true);
};
```

---

## 📱 Responsive Design Rules

1. **Mobile-first approach**
2. **Breakpoints:**
   - `sm:` 640px
   - `md:` 768px
   - `lg:` 1024px
   - `xl:` 1280px
   - `2xl:` 1536px

3. **Common patterns:**
```tsx
// Grid layouts
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"

// Flex direction
className="flex flex-col lg:flex-row"

// Spacing
className="gap-4 lg:gap-6"

// Text sizes
className="text-lg lg:text-xl"

// Padding
className="p-4 lg:p-6"
```

---

## ✅ Code Quality Checklist

Before submitting any code, ensure:

- [ ] TypeScript types/interfaces are properly defined
- [ ] Both dark and light themes are implemented
- [ ] Components are responsive (mobile-friendly)
- [ ] Smooth transitions/animations are added
- [ ] Icons use Lucide React
- [ ] Currency uses LKR format (Rs.)
- [ ] Error states are handled
- [ ] Loading states are implemented
- [ ] Accessibility (a11y) is considered
- [ ] Code follows existing patterns in the codebase

---

## 🚫 Things to AVOID

1. **Never use inline styles** - Use Tailwind classes
2. **Never hardcode colors** - Use theme-aware classes
3. **Never ignore TypeScript errors** - Fix them properly
4. **Never skip responsive design** - Test all breakpoints
5. **Never use px units in Tailwind** - Use the spacing scale
6. **Never forget dark mode** - Always implement both themes
7. **Never use alert()** - Use proper modal dialogs
8. **Never use console.log in production** - Remove debug logs

---

## 📚 Reference Files

When creating new components, reference these existing files for patterns:

- **Page Layout:** `src/pages/Dashboard.tsx`, `src/pages/Products.tsx`
- **Modals:** `src/components/modals/InvoiceWizardModal.tsx`
- **UI Components:** `src/components/ui/button.tsx`, `src/components/ui/card.tsx`
- **Theme Usage:** `src/contexts/ThemeContext.tsx`
- **Layout:** `src/components/AdminLayout.tsx`

---

## 🆘 Getting Help

If instructions are unclear or you need more context:
1. Ask for clarification in English
2. Reference similar existing components
3. Follow the established patterns strictly
4. When in doubt, prioritize user experience and visual consistency

---

## 🤖 AUTO-UPDATE AI ASSISTANT (MANDATORY)

**CRITICAL INSTRUCTION:** When creating or modifying ANY section/feature in the system, you MUST update the `AIAssistant.tsx` component to ensure the AI can analyze and respond to queries about that section. This is a **NON-NEGOTIABLE** requirement.

### When to Update AIAssistant:
1. **New Page/Section Created** - Add data import and mapping
2. **New Data Type Added to mockData.ts** - Import and include in systemData
3. **Existing Section Enhanced** - Update the data mapping to include new fields
4. **New Feature with Queryable Data** - Ensure AI can access and analyze it

### Step-by-Step Update Process:

#### Step 1: Import the Data
Add the new mock data import at the top of `AIAssistant.tsx`:
```tsx
import { 
  mockProducts, 
  mockCustomers,
  // ... existing imports
  mockNewFeature  // ← Add new data import
} from '../data/mockData';
```

#### Step 2: Add to systemData Object
In the `handleSendMessage` function, add the new data to the `systemData` object with ALL relevant fields:
```tsx
const systemData = {
  // ... existing data
  newFeature: mockNewFeature.map(item => ({
    id: item.id,
    name: item.name,
    // Include ALL fields that might be useful for AI analysis
    // Include calculated fields, status, dates, amounts, relationships
    status: item.status,
    createdAt: item.createdAt,
    // etc.
  })),
};
```

#### Step 3: Update Welcome Message (Optional but Recommended)
If the new section is significant, add it to the welcome message capabilities list:
```tsx
content: `Ayubowan! 🙏 Welcome to ECOTEC AI Assistant!

🔥 **Real-Time Data Access Enabled!**
I can analyze your **actual system data** including:
• 📦 Products, Stock & Inventory
• 👥 Customers & Credit Balances
• 📄 Invoices & Sales Data
// ... existing items
• 🆕 New Feature Data  // ← Add new section

**Try asking:**
// ... existing examples
• "New feature query example?"  // ← Add example query
`
```

#### Step 4: Update geminiService.ts (If Needed)
If the new section requires special query detection, update `isDataQuery()` method in `geminiService.ts`:
```tsx
isDataQuery(message: string): boolean {
  const dataKeywords = [
    // ... existing keywords
    'newfeature', 'new feature', // ← Add keywords
  ];
  // ...
}
```

### Data Mapping Guidelines:

**INCLUDE in systemData:**
- ✅ All ID fields (for specific lookups)
- ✅ All name/title fields (for search)
- ✅ All status fields (for filtering)
- ✅ All date fields (for time-based queries)
- ✅ All amount/price fields (for financial analysis)
- ✅ All relationship fields (customerId, supplierId, etc.)
- ✅ Nested items arrays (invoice items, GRN items, etc.)
- ✅ Calculated totals and balances

**Field Mapping Example:**
```tsx
// For a new "Quotations" section:
quotations: mockQuotations.map(q => ({
  id: q.id,
  quotationNumber: q.quotationNumber,
  customerId: q.customerId,
  customerName: q.customerName,
  customerPhone: q.customerPhone,
  subtotal: q.subtotal,
  discount: q.discount,
  tax: q.tax,
  total: q.total,
  validUntil: q.validUntil,
  status: q.status, // 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
  createdAt: q.createdAt,
  notes: q.notes,
  items: q.items?.map(item => ({
    productId: item.productId,
    productName: item.productName,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    total: item.total
  }))
})),
```

### Common Query Patterns AI Should Handle:
After updating, the AI should be able to answer queries like:
- "Show me [section] with status [status]"
- "How many [items] today/this week/this month?"
- "What's the total [amount] for [section]?"
- "[Section] eke details denna" (Singlish)
- "List all [items] for customer [name]"
- "Pending [section] monawada?" (Singlish)

### Verification Checklist:
After updating AIAssistant, verify:
- [ ] Data is imported correctly
- [ ] All useful fields are mapped in systemData
- [ ] Nested items/arrays are included
- [ ] Welcome message updated (if significant feature)
- [ ] Test by asking AI about the new section
- [ ] AI can filter, search, and analyze the new data

### Example Complete Update:
When adding an "Estimates" section:

1. **mockData.ts** - Create mock data with full structure
2. **AIAssistant.tsx** - Import and map in systemData:
```tsx
estimates: mockEstimates.map(e => ({
  id: e.id,
  estimateNumber: e.estimateNumber,
  customerId: e.customerId,
  customerName: e.customerName,
  status: e.status,
  subtotal: e.subtotal,
  total: e.total,
  validUntil: e.validUntil,
  createdAt: e.createdAt,
  items: e.items?.map(i => ({...}))
})),
```
3. **Welcome Message** - Add: `• 📝 Estimates & Quotations`
4. **Example Query** - Add: `• "Pending estimates monawada?"`

---

**Remember:** You are building a **premium, world-class** computer shop management system. Every component should look professional, modern, and polished. Think like a senior software engineer at a top tech company!