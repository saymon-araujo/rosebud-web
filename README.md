# Journal AI - Your AI-powered Journaling Companion

<div align="center">
  <img src="/public/logo.png" alt="Journal AI Logo" width="200" />
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

\`\`\`
journal-ai/
├── app/                    # Next.js App Router
│   ├── dashboard/          # Dashboard page
│   ├── history/            # Journal history page
│   ├── journal/            # Journal entry page
│   ├── login/              # Login page
│   ├── register/           # Registration page
│   ├── reminders/          # Reminders page
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home page (redirects to dashboard/login)
├── components/             # Reusable UI components
│   ├── chat/               # Chat-related components
│   │   ├── chat-bubble.tsx # Chat message components
│   │   └── time-picker.tsx # Time picker component
│   ├── theme-provider.tsx  # Theme provider component
│   └── ui/                 # UI components (shadcn/ui)
├── context/                # React context providers
│   ├── AuthContext.js      # Authentication context
│   └── SupabaseContext.js  # Supabase client context
├── lib/                    # Utility functions and providers
│   ├── auth-provider.tsx   # Authentication provider
│   ├── notification-provider.tsx # Notifications provider
│   ├── openai.ts           # OpenAI integration
│   ├── supabase-provider.tsx # Supabase provider
│   ├── supabase.ts         # Supabase client
│   └── utils.ts            # Utility functions
├── public/                 # Static assets
├── styles/                 # Additional styles
├── next.config.mjs         # Next.js configuration
├── postcss.config.mjs      # PostCSS configuration
├── tailwind.config.ts      # Tailwind CSS configuration
└── package.json            # Project dependencies
\`\`\`

## 🛠️ Setup Instructions

### Prerequisites

- Node.js 18.x or later
- npm or yarn
- Supabase account (for database and authentication)

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

\`\`\`
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_JWT_SECRET=your_supabase_jwt_secret
\`\`\`

### Database Setup

1. Create a new Supabase project
2. Set up the following tables in your Supabase database:

#### journal_entries
\`\`\`sql
create table journal_entries (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  content text not null,
  processed boolean default false,
  created_at timestamp with time zone default now()
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
\`\`\`

#### suggestions
\`\`\`sql
create table suggestions (
  id uuid default uuid_generate_v4() primary key,
  entry_id uuid references journal_entries not null,
  type text not null,
  response_text text not null,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table suggestions enable row level security;

-- Create policies
create policy "Users can view suggestions for their entries"
  on suggestions for select
  using (auth.uid() = (select user_id from journal_entries where id = entry_id));

create policy "Users can create suggestions for their entries"
  on suggestions for insert
  with check (auth.uid() = (select user_id from journal_entries where id = entry_id));
\`\`\`

#### reminders
\`\`\`sql
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
\`\`\`

#### profiles
\`\`\`sql
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
\`\`\`

### Install Dependencies

\`\`\`bash
npm install
# or
yarn install
\`\`\`

## 🚀 How to Run

### Development Mode

\`\`\`bash
npm run dev
# or
yarn dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### Production Build

\`\`\`bash
npm run build
npm start
# or
yarn build
yarn start
\`\`\`

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

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Lucide Icons](https://lucide.dev/)

---

<div align="center">
  <p>Made with ❤️ by Saymon Araújo</p>
</div>
