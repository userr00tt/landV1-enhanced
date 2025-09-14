# Telegram Mini App - AI Chat

A complete Telegram Mini App (WebApp) for AI chat experience with OpenAI integration, user authentication, quota management, and Telegram Stars payments.

## Features

- 🤖 **AI Chat**: Powered by OpenAI GPT with streaming responses
- 🔐 **Secure Authentication**: Telegram WebApp initData verification
- 💰 **Telegram Stars Payments**: Upgrade plans and purchase tokens
- 📊 **Usage Tracking**: Per-user daily token limits and quotas
- 🎨 **Modern UI**: React + TypeScript + shadcn/ui + TailwindCSS
- 🛡️ **Production Security**: CSP, CORS, rate limiting, input validation
- 📱 **Responsive Design**: Works on mobile and desktop
- 🌙 **Theme Support**: Automatic light/dark mode from Telegram

## Tech Stack

### Frontend
- React 18 + TypeScript + Vite
- shadcn/ui components + TailwindCSS
- Framer Motion animations
- Axios for API calls
- Telegram WebApp SDK

### Backend
- Node.js 20+ + Express + TypeScript
- Prisma ORM + SQLite database
- OpenAI API integration
- JWT authentication
- Comprehensive security middleware

## Quick Start

### Prerequisites
- Node.js 20+
- npm or yarn
- Telegram Bot Token
- OpenAI API Key

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd telegram-mini-app

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 2. Environment Setup

#### Backend (.env)
```bash
cd server
cp .env.example .env
```

Edit `server/.env`:
```env
# Server Configuration
PORT=8000
ORIGIN=http://localhost:5173

# Telegram Bot Configuration
BOT_TOKEN=your_telegram_bot_token_here
WEBHOOK_SECRET=your_webhook_secret_here

# JWT Configuration
JWT_SECRET=your_jwt_secret_here

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4
MODEL_MAX_OUTPUT_TOKENS=700
MODEL_PRICE_INPUT=0.00001
MODEL_PRICE_OUTPUT=0.00003

# Usage Limits
FREE_DAILY_TOKENS=1000
PAID_DAILY_TOKENS=10000

# Database
DATABASE_URL=file:./dev.db
```

#### Frontend (.env)
```bash
cd client
echo "VITE_API_URL=http://localhost:8000" > .env
```

### 3. Database Setup

```bash
cd server
npm run db:generate
npm run db:push
```

### 4. Start Development Servers

#### Terminal 1 - Backend
```bash
cd server
npm run dev
```

#### Terminal 2 - Frontend
```bash
cd client
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000

## Telegram Bot Setup

### 1. Create a Bot
1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Use `/newbot` command and follow instructions
3. Save the bot token for your `.env` file

### 2. Set Up WebApp
1. Use `/newapp` command with BotFather
2. Provide your bot name
3. Set the WebApp URL to your deployed frontend URL
4. Upload an icon (512x512 PNG)

### 3. Configure Webhook (for payments)
```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-backend-url.com/api/payments/webhook",
    "secret_token": "your_webhook_secret"
  }'
```

## Project Structure

```
telegram-mini-app/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── hooks/          # React hooks
│   │   ├── services/       # API services
│   │   ├── types/          # TypeScript types
│   │   └── lib/            # Utilities
│   └── public/
├── server/                 # Express backend
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Express middleware
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Utilities
│   │   └── types/          # TypeScript types
│   └── prisma/             # Database schema
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Authenticate with Telegram initData

### Chat
- `POST /api/chat/chat` - Send message and get AI response (streaming)

### User
- `GET /api/user/usage` - Get current usage and limits
- `GET /api/user/messages` - Get chat history

### Payments
- `POST /api/payments/create-invoice` - Create Telegram Stars invoice
- `POST /api/payments/webhook` - Handle payment confirmations

## Security Features

- **Telegram WebApp Verification**: HMAC validation of initData
- **JWT Authentication**: Short-lived tokens (5 minutes)
- **Rate Limiting**: Per-IP and per-user limits
- **Input Validation**: Zod schema validation
- **CORS Protection**: Restricted to allowed origins
- **CSP Headers**: Strict Content Security Policy
- **Error Handling**: Safe error responses without stack traces

## Usage Limits & Payments

### Free Plan
- 1,000 tokens per day
- Basic features

### Paid Plans (Telegram Stars)
- 100 Stars = 5,000 extra tokens
- 250 Stars = 15,000 extra tokens (Most Popular)
- 500 Stars = 35,000 extra tokens (Best Value)

## Development

### Available Scripts

#### Backend
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:studio    # Open Prisma Studio
```

#### Frontend
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Testing Outside Telegram

The app includes a development mode that works outside Telegram:
- Mock user data for testing
- Simulated payment flows
- All UI components functional

## Deployment

### Backend (Fly.io example)
```bash
cd server
npm run build
fly deploy
```

### Frontend (Vercel/Netlify example)
```bash
cd client
npm run build
# Deploy the dist/ folder
```

### Environment Variables for Production
Update your production environment with:
- Real Telegram bot token
- Production OpenAI API key
- Secure JWT secret
- Production database URL
- Correct CORS origins

## Troubleshooting

### Common Issues

1. **Authentication fails**
   - Check BOT_TOKEN is correct
   - Verify initData is being sent properly
   - Check server logs for HMAC validation errors

2. **OpenAI API errors**
   - Verify OPENAI_API_KEY is valid
   - Check API quota and billing
   - Monitor rate limits

3. **Database issues**
   - Run `npm run db:push` to sync schema
   - Check DATABASE_URL format
   - Verify file permissions for SQLite

4. **CORS errors**
   - Update ORIGIN in backend .env
   - Check frontend VITE_API_URL

### Logs
- Backend logs: Check console output from `npm run dev`
- Frontend logs: Check browser developer console
- Database logs: Use `npm run db:studio` to inspect data

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check this README
2. Review the code comments
3. Check Telegram Bot API documentation
4. Review OpenAI API documentation
