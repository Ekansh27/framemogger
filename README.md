# Visual Dominance Analyzer

> **See who commands the room** — AI-powered visual dominance analysis in seconds

**HackIllinois 2026 Project** | [Live Demo](https://hack-illinois-2026.vercel.app)

An AI-powered web application that analyzes images to determine visual dominance using advanced computer vision and machine learning. Upload an image or capture one with your webcam, and get instant insights into spatial presence, posture, facial intensity, and attention capture.

## ✨ Features

### 🎯 Multi-Signal Analysis
- **Spatial Presence**: Measures frame area occupied by each person
- **Posture**: Analyzes body orientation and positioning
- **Facial Intensity**: Evaluates gaze direction and expression
- **Attention Capture**: Determines compositional visual pull

### 📸 Flexible Image Input
- **Drag & Drop Upload**: Upload images from your device
- **Live Webcam Capture**: Take photos directly with your camera
- Automatic face detection and bounding box visualization

### 🧠 AI-Powered Insights
- Real-time facial detection using **TensorFlow.js** and **face-api.js**
- Body pose analysis with **BodyPix**
- Advanced image analysis powered by **Claude AI**
- Detailed explanations and scoring breakdowns

### 🎙️ Voice Consultation
- Interactive voice agent powered by **ElevenLabs Conversational AI**
- Real-time context injection with analysis results
- Natural conversation about your image analysis

### 📊 Visual Results
- Radar chart comparisons
- Per-signal score breakdowns
- Strengths and improvement suggestions
- Shareable results cards

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Computer Vision**: 
  - TensorFlow.js
  - face-api.js
  - BodyPix (pose detection)
  - BlazeFace
- **AI Services**:
  - Anthropic Claude API (image analysis)
  - ElevenLabs (voice agent)
- **Deployment**: Vercel
- **UI Components**: Recharts, Lucide Icons

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- ElevenLabs API key
- Anthropic API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/vedanshgupta500/HackIllinois_2026.git
cd HackIllinois_2026
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the root directory:
```env
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
npm run build
npm start
```

## 📖 Usage

1. **Upload an Image**: 
   - Drag and drop an image, or
   - Switch to camera mode and capture a photo

2. **Label Faces**: 
   - Detected faces will be highlighted
   - Enter names for each person

3. **Analyze**: 
   - Click "Analyze" to start the AI analysis
   - Watch the scanning overlay as the system processes your image

4. **View Results**:
   - Review the dominance scores across all signals
   - Explore radar charts and detailed breakdowns
   - Read AI-generated explanations

5. **Voice Consultation** (Optional):
   - Click "Ask AI About Results" to start a voice conversation
   - Discuss the analysis with the ElevenLabs voice agent

## 🌐 Live Demo

Check out the live application: **[hack-illinois-2026.vercel.app](https://hack-illinois-2026.vercel.app)**

## 🏗️ Project Structure

```
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   │   ├── analyze/       # Claude analysis endpoint
│   │   ├── agent/         # ElevenLabs context injection
│   │   └── stats/         # Scan counter
│   ├── analyze/           # Analysis page
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── processing/        # Loading & scanning UI
│   ├── results/           # Results display components
│   ├── steps/             # Multi-step flow components
│   ├── ui/                # Reusable UI components
│   └── upload/            # Image upload components
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions
│   ├── analyze.ts         # Claude integration
│   ├── faceDetection.ts   # Face detection logic
│   ├── bodyScanning.ts    # BodyPix integration
│   └── elevenlabsContext.ts # Voice agent context
└── types/                 # TypeScript type definitions
```

## 🎓 Built At HackIllinois 2026

This project was created during the HackIllinois hackathon in February 2026.

## 📝 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- HackIllinois organizers and sponsors
- ElevenLabs for voice AI capabilities
- Anthropic for Claude AI
- TensorFlow.js and face-api.js communities
