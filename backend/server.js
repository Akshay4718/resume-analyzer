const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const pdfParse = require('pdf-parse'); // ✅ Works with pdf-parse@1.1.1
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ===== Middleware =====
app.use(cors());
app.use(express.json());

// ===== Multer Setup for File Uploads =====
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'text/plain'];
    const fileName = file.originalname.toLowerCase();

    if (
      allowedTypes.includes(file.mimetype) ||
      fileName.endsWith('.pdf') ||
      fileName.endsWith('.txt')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and TXT files are allowed'));
    }
  },
});

// ===== Gemini AI Setup =====
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ===== Extract Text Function =====
async function extractText(file) {
  const fileName = file.originalname.toLowerCase();

  // Handle PDFs
  if (file.mimetype === 'application/pdf' || fileName.endsWith('.pdf')) {
    try {
      const data = await pdfParse(file.buffer);
      if (!data.text || data.text.trim().length === 0) {
        throw new Error('No readable text found in PDF (possibly scanned image)');
      }
      return data.text;
    } catch (error) {
      console.error('PDF parsing error:', error);
      throw new Error('Failed to parse PDF file');
    }
  }

  // Handle text files
  return file.buffer.toString('utf-8');
}

// ===== Analyze Resume Endpoint =====
app.post('/api/analyze', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const resumeText = await extractText(req.file);

    if (!resumeText || resumeText.trim().length === 0) {
      return res.status(400).json({ error: 'Could not extract text from file' });
    }

    // Get Gemini model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });


    // AI Prompt
    const prompt = `Analyze the following resume and provide detailed feedback in JSON format with these sections:
    1. overall_score (0-100)
    2. strengths (array of 3-5 key strengths)
    3. weaknesses (array of 3-5 areas for improvement)
    4. suggestions (array of 3-5 specific actionable suggestions)
    5. keywords_missing (array of important industry keywords that could be added)
    6. summary (brief overall assessment in 2-3 sentences)

    Resume content:
    ${resumeText}

    Return ONLY valid JSON, no additional text.`;

    // Send prompt to Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse Gemini's response safely
    let analysis;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
    } catch (jsonError) {
      console.error('Error parsing Gemini JSON:', jsonError, '\nResponse text:', text);
      return res.status(500).json({ error: 'AI returned invalid JSON format' });
    }

    // Send final response
    res.json({ success: true, analysis });

  } catch (error) {
    console.error('Error analyzing resume:', error);
    res.status(500).json({
      error: 'Failed to analyze resume',
      details: error.message,
    });
  }
});

// ===== Health Check Endpoint =====
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// ===== Start Server =====
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
