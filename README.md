# Journal AI - Your AI-powered Journaling Companion

<div align="center">
  <p><em>Reflect, grow, and thrive with AI-assisted journaling</em></p>
  
  [![Next.js](https://img.shields.io/badge/Next.js-13.4+-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
  [![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
</div>

## 📝 Introduction

Journal AI is a modern, AI-powered journaling application that helps users reflect on their thoughts and feelings while providing intelligent insights and reminders. The application uses natural language processing to analyze journal entries, offer personalized suggestions, and set meaningful reminders to help users develop healthy habits and improve their well-being.

With Journal AI, users can:
- Write and store journal entries in a secure, private environment
- Receive AI-powered analysis and insights based on their entries
- Set and manage reminders for self-care, mindfulness, and personal growth
- Track their journaling history and emotional patterns over time

## 🏗️ Project Structure

The application is organized into the following key directories:

### Core Directories
| Directory | Description |
|-----------|-------------|
| `app/` | Next.js App Router with page components |
| `components/` | Reusable UI components |
| `lib/` | Utility functions and providers |
| `public/` | Static assets |

### App Directory
| Subdirectory | Purpose |
|--------------|---------|
| `dashboard/` | Dashboard page |
| `history/` | Journal history page |
| `journal/` | Journal entry page |
| `login/` | Login page |
| `register/` | Registration page |
| `reminders/` | Reminders page |

### Components
| Subdirectory | Purpose |
|--------------|---------|
| `chat/` | Chat-related components |
| `ui/` | UI components (shadcn/ui) |

### Library
| File | Purpose |
|------|---------|
| `auth-provider.tsx` | Authentication provider |
| `notification-provider.tsx` | Notifications provider |
| `openai.ts` | OpenAI integration |
| `supabase-provider.tsx` | Supabase provider |
| `utils.ts` | Utility functions |

## 🛠️ Setup Instructions

### Prerequisites

- Node.js 18.x or later
- npm or yarn
- Supabase account (for database and authentication)
- OpenAI API key
- Supabase CLI (`npm install -g supabase`)

### Step 1: Supabase Setup

1. Create a new Supabase project

2. Set up the following tables in your Supabase database:

#### journal_entries
```sql
create table journal_entries (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  content text not null,
  processed boolean default false,
  created_at timestamp with time zone default now(),
  processed_at timestamptz,
  ai_cost numeric
);

-- Enable RLS
alter table journal_entries enable row level security;

-- Create policies
create policy "Users can create their own journal entries"
  on journal_entries for insert
  with check (auth.uid() = user_id);

create policy "Users can view their own journal entries"
  on journal_entries for select
  using (auth.uid() = user_id);

create policy "Users can update their own journal entries"
  on journal_entries for update
  using (auth.uid() = user_id);
```

#### suggestions
```sql
create table suggestions (
  id uuid default uuid_generate_v4() primary key,
  entry_id uuid references journal_entries not null,
  type text not null,
  response_text text not null,
  created_at timestamp with time zone default now()
);

-- Add index and cascading delete
create index on suggestions(entry_id);
alter table suggestions
  add constraint fk_journal_entries
  foreign key (entry_id) references journal_entries(id)
  on delete cascade;

-- Enable RLS
alter table suggestions enable row level security;

-- Create policies
create policy "Users can view suggestions for their entries"
  on suggestions for select
  using (auth.uid() = (select user_id from journal_entries where id = entry_id));

create policy "Users can create suggestions for their entries"
  on suggestions for insert
  with check (auth.uid() = (select user_id from journal_entries where id = entry_id));

create policy "Users can update suggestions for their entries"
  on suggestions for update
  using (auth.uid() = (select user_id from journal_entries where id = entry_id));
```

#### reminders
```sql
create table reminders (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  body text not null,
  time timestamp with time zone not null,
  status text default 'active',
  type text not null,
  notification_id text,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table reminders enable row level security;

-- Create policies
create policy "Users can create their own reminders"
  on reminders for insert
  with check (auth.uid() = user_id);

create policy "Users can view their own reminders"
  on reminders for select
  using (auth.uid() = user_id);

create policy "Users can update their own reminders"
  on reminders for update
  using (auth.uid() = user_id);
```

#### profiles
```sql
create table profiles (
  id uuid references auth.users primary key,
  email text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table profiles enable row level security;

-- Create policies
create policy "Users can view their own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);
```

### Step 2: Environment and Secrets Management

1. Set up OpenAI API key using Supabase CLI:

```bash
# Login to Supabase
supabase login

# Set your OpenAI API key securely (never store in Git)
supabase secrets set OPENAI_API_KEY="your_openai_key_here"
```

2. Create a local development environment file:

```bash
# Create a local secrets file for development
cp supabase/.env.local.example supabase/.env.local
echo "OPENAI_API_KEY=your_key" >> supabase/.env.local
```

3. Create a `.env.local` file in the project root with these variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_FUNCTIONS_URL=https://<project-ref>.functions.supabase.co
```

### Step 3: Edge Function Deployment

1. Prepare your edge function:

```
supabase/
├── functions/
│   ├── _shared/           # Shared utilities
│   │   ├── supabase.ts    # Supabase client
│   │   └── openai.ts      # OpenAI client
│   └── analyze-journal/
│       └── index.ts       # Main function
```

2. Deploy the edge function:

```bash
# For local development with live environment
supabase functions serve --env-file ./supabase/.env.local

# For production deployment
supabase functions deploy analyze-journal
```

4. Verify the function is deployed by checking the Functions tab in your Supabase dashboard.

### Step 4: Next.js Integration

1. Type-safe Supabase client in `lib/supabase.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

2. Add server actions for edge functions (Next.js 13+):

```typescript
// app/actions.ts
"use server";

export async function analyzeJournal(entryId: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_FUNCTIONS_URL}/analyze-journal`,
      { 
        method: "POST", 
        body: JSON.stringify({ entry_id: entryId }),
        headers: { "Content-Type": "application/json" } 
      }
    );
    
    // Basic retry logic for OpenAI rate limits
    if (res.status === 429) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return analyzeJournal(entryId);
    }
    
    return await res.json();
  } catch (error) {
    console.error("Error calling analyze-journal:", error);
    throw error;
  }
}
```

### Step 5: Install Dependencies

```bash
npm install
# or
yarn install
```

## 🚀 How to Run

### Development Mode

Start the development server:

```bash
npm run dev
# or
yarn dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser to access the application.

### Production Build

Build and run the production version:

```bash
# Build the application
npm run build
# or
yarn build

# Start the production server
npm start
# or
yarn start
```

## ✨ Features

### 📓 Journaling
- **Rich Text Editor**: Write journal entries with a clean, distraction-free interface
- **Auto-save**: Entries are automatically saved as you type
- **History View**: Browse and search through past journal entries

### 🤖 AI Analysis
- **Sentiment Analysis**: AI analyzes the emotional tone of your entries
- **Personalized Insights**: Receive tailored suggestions based on your journal content
- **Pattern Recognition**: The AI identifies recurring themes and patterns in your writing

### ⏰ Smart Reminders
- **Contextual Reminders**: AI suggests reminders based on your journal content
- **Flexible Scheduling**: Set reminders for specific times or intervals
- **Browser Notifications**: Receive notifications even when the app isn't open
- **Reminder Management**: View, complete, and delete reminders

### 📊 Dashboard
- **Entry Statistics**: Track your journaling streak and total entries
- **Active Reminders**: View upcoming reminders
- **Quick Access**: Easily start a new journal entry or view history

### 🔒 Security & Privacy
- **Secure Authentication**: Email/password authentication via Supabase
- **Row-Level Security**: Database security rules ensure users can only access their own data
- **Private by Design**: Your journal entries are private and secure

## 💻 Technologies Used

### Frontend
- **Next.js**: React framework for server-rendered applications
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: High-quality UI components built with Radix UI and Tailwind
- **Lucide Icons**: Beautiful, consistent icons

### Backend & Infrastructure
- **Supabase**: Backend-as-a-Service for database, authentication, and storage
- **PostgreSQL**: Relational database for data storage
- **Row-Level Security**: Database security policies
- **Edge Functions**: Serverless functions for AI processing

### AI & Machine Learning
- **Natural Language Processing**: For analyzing journal entries
- **Sentiment Analysis**: To understand emotional content
- **Contextual Suggestions**: AI-generated recommendations

## 🧠 AI Integration

Journal AI uses advanced natural language processing to analyze journal entries and provide personalized insights. The AI can:

1. Identify emotional states and patterns
2. Recognize topics of interest or concern
3. Suggest appropriate reminders based on content
4. Provide thoughtful responses to user entries

The AI processing happens securely via Supabase Edge Functions, ensuring user data remains private.

## 🔄 Browser Notifications

The application uses the Web Notifications API to deliver reminders even when the user isn't actively using the app. Notifications are:

- Permission-based (users must opt-in)
- Scheduled based on user preferences
- Actionable (users can complete reminders directly from notifications)
- Stored locally for offline functionality

## 📱 Responsive Design

Journal AI is fully responsive and works seamlessly across:
- Desktop browsers
- Tablets
- Mobile devices

The UI adapts to different screen sizes while maintaining functionality and usability.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgements

- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Lucide Icons](https://lucide.dev/)


<br>
<br>

---

Made by Saymon Araújo
<div>
 <p> Feel free to get in touch, it will be a pleasure to chat.</p>
  <a href="https://www.linkedin.com/in/saymon-araujo/" target="_blank"><img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" target="_blank"></a>
  <a href="mailto:saymonbrandon@gmail.com?subject=Hello%20Saymon,%20From%20Github"><img src="https://img.shields.io/badge/gmail-%23D14836.svg?&style=for-the-badge&logo=gmail&logoColor=white" /></a>
  <a href="https://t.me/saymon_araujo_dev"><img src="https://img.shields.io/badge/Telegram-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white" /></a>&nbsp;&nbsp;&nbsp;&nbsp;
</div>
