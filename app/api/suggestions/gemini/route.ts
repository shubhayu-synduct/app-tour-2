import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { logger } from '@/lib/logger';

// Server-side only API key (no NEXT_PUBLIC_ prefix)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY is not configured on server-side');
  console.error('Available env vars:', Object.keys(process.env).filter(key => key.includes('GEMINI')));
}

let ai: GoogleGenAI | null = null;
try {
  ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;
} catch (initError) {
  console.error('Failed to initialize GoogleGenAI:', initError);
}

export async function POST(request: NextRequest) {
  try {
    if (!ai) {
      return NextResponse.json(
        { error: 'Gemini API is not configured' },
        { status: 500 }
      );
    }

    const { query, previousQueries = [] } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }

    // Validate query length
    if (query.length > 1000) {
      return NextResponse.json(
        { error: 'Query too long' },
        { status: 400 }
      );
    }

    const prompt = `You are an autocomplete system for medical search queries. Given the partial query: "${query}", suggest 3 complete medical terms or phrases that start with or contain this text.

Previous queries to avoid duplicating: ${previousQueries.join(', ')}

Focus on:
- Medical conditions, diseases, treatments, medications, symptoms
- Complete the partial input naturally (e.g., "treatment of" → "treatment of hypertension", "treatment of diabetes", "treatment of asthma")
- Provide specific, commonly searched medical terms
- Make suggestions that a healthcare professional would typically search for

IMPORTANT: Return ONLY a valid JSON array of exactly 3 strings. No markdown formatting, no code blocks, no additional text, no explanations. Just the raw JSON array.

Example format: ["treatment of hypertension", "treatment of diabetes", "treatment of asthma"]

Each suggestion should be a complete medical search term or phrase.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });
    
    if (!response.candidates || response.candidates.length === 0) {
      throw new Error('No candidates in response');
    }
    
    const text = response.candidates[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      );
    }

    // Clean the response text by removing markdown code blocks and extra formatting
    let cleanText = text.trim();
    
    // Remove markdown code blocks if present
    cleanText = cleanText.replace(/```json\s*/, '').replace(/```\s*$/, '');
    cleanText = cleanText.replace(/```\s*/, '').replace(/```\s*$/, '');
    
    // Remove any leading/trailing whitespace
    cleanText = cleanText.trim();
    
    try {
      const suggestions = JSON.parse(cleanText);
      
      if (!Array.isArray(suggestions)) {
        throw new Error('Response is not an array');
      }
      
      // Ensure we have exactly 3 suggestions and they are strings
      const validSuggestions = suggestions
        .filter(s => typeof s === 'string' && s.trim().length > 0)
        .slice(0, 3);
      
      if (validSuggestions.length === 0) {
        throw new Error('No valid suggestions found');
      }
      
      // Pad with generic suggestions if needed
       while (validSuggestions.length < 3) {
         if (query.toLowerCase().includes('treatment')) {
           validSuggestions.push(`${query} hypertension`);
         } else if (query.toLowerCase().includes('symptom')) {
           validSuggestions.push(`${query}s of diabetes`);
         } else {
           validSuggestions.push(`${query} management`);
         }
       }

      return NextResponse.json({ suggestions: validSuggestions });
    } catch (parseError) {
      logger.error('Failed to parse AI response:', { text: cleanText, error: parseError });
      
      // Return fallback suggestions based on query type
       let fallbackSuggestions;
       if (query.toLowerCase().includes('treatment')) {
         fallbackSuggestions = [
           `${query} hypertension`,
           `${query} diabetes`,
           `${query} asthma`
         ];
       } else if (query.toLowerCase().includes('symptom')) {
         fallbackSuggestions = [
           `${query}s of hypertension`,
           `${query}s of diabetes`,
           `${query}s of heart disease`
         ];
       } else {
         fallbackSuggestions = [
           `${query} management`,
           `${query} guidelines`,
           `${query} diagnosis`
         ];
       }
      
      return NextResponse.json({ suggestions: fallbackSuggestions });
    }
  } catch (error) {
    console.error('Error generating AI suggestions:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      apiKeyExists: !!GEMINI_API_KEY,
      aiInitialized: !!ai
    });
    return NextResponse.json(
      { 
        error: 'Failed to generate suggestions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}