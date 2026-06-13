# EthioHelp AI 🇪🇹

EthioHelp AI is an AI-powered, multilingual Information Assistant designed specifically to help the Ethiopian community navigate government services, educational enrollment, healthcare procedures, and business registrations. 

Powered by **Google Gemini**, **MongoDB Atlas Vector Search**, and a robust RAG (Retrieval-Augmented Generation) pipeline, EthioHelp AI guarantees that users get highly accurate, step-by-step, sourced information in their native language.

## ✨ Features

- **Advanced RAG Pipeline**: Information is retrieved strictly from an verified knowledge base. The architecture guarantees clean prompts by processing inputs in English to maximize Gemini's reasoning capabilities before translating the response.
- **Multilingual Support**: First-class support for English, Amharic, and Arabic. The UI fully supports RTL (Right-to-Left) layouts.
- **Conversational Memory**: A sliding window of recent messages combined with an AI-generated summary of older conversation history ensures deep context retention across long chat sessions.
- **Role-Based Access Control**:
  - **Admins**: Can access an admin panel to upload PDFs and text documents. The system automatically chunks the documents and generates embeddings.
  - **Users**: Secure JWT authentication and automated email verification using Google App Passwords.
  - **Guests**: Can interact with the platform within rate limits.
- **Interactive UI**: Real-time response streaming, markdown formatting, syntax highlighting, and responsive dark/light modes.
- **Rate Limiting**: Protects backend resources by capping non-authenticated users at 2 questions and authenticated users at 10 questions every 3 hours, tracked securely.

## 🛠️ Technology Stack

**Frontend**
- [Next.js](https://nextjs.org/) (App Router)
- [React](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/) + [Shadcn UI](https://ui.shadcn.com/)
- Lucide React (Icons)
- React Markdown (Formatting)

**Backend**
- [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/)
- [MongoDB](https://www.mongodb.com/) + Mongoose (Database & Atlas Vector Search)
- [@google/genai](https://www.npmjs.com/package/@google/genai) (Google Gemini Flash & Embedding Models)
- JWT (Authentication)
- Nodemailer (Email Verification)
- Multer (File Uploads)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas cluster (with Vector Search configured)
- Google Gemini API Key
- Gmail App Password (for the email verification system)

### 1. Clone the repository
```bash
git clone https://github.com/moh-sad/ethio-help-ai.git
cd ethio-help-ai
```

### 2. Setup the Backend
Navigate to the server directory and install dependencies:
```bash
cd server
pnpm install
```

Create a `.env` file in the `/server` directory:
```env
PORT=8000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/ethiohelp
JWT_SECRET=your_super_secret_jwt_key
GEMINI_API_KEY=your_google_gemini_api_key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

Start the backend development server:
```bash
pnpm run dev
```

### 3. Setup the Frontend
Navigate to the client directory and install dependencies:
```bash
cd ../client
pnpm install
```

Create a `.env.local` file in the `/client` directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start the frontend development server:
```bash
pnpm run dev
```

### 4. Configure MongoDB Atlas Vector Search
You must create a Search Index in your MongoDB Atlas cluster on the `documents` collection with the following JSON configuration to enable semantic search:
```json
{
  "mappings": {
    "dynamic": true,
    "fields": {
      "embedding": {
        "dimensions": 768,
        "similarity": "cosine",
        "type": "knnVector"
      }
    }
  }
}
```

## 📜 Architecture Diagram
1. User submits a query in Amharic/Arabic/English.
2. The query is intercepted and translated into English.
3. The English query is converted into a 768-dimensional vector embedding using `gemini-embedding-2`.
4. MongoDB Atlas retrieves the top $K$ relevant document chunks.
5. The conversation history is combined with the chunks into a unified prompt.
6. `gemini-2.5-flash` generates an authoritative response in English.
7. The response is translated back into the user's selected language and streamed chunk-by-chunk to the UI.

## 🤝 Contributing
Contributions are welcome! Please fork the repository and create a pull request with your suggested improvements.

## 📄 License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
