import { NextRequest, NextResponse } from 'next/server';
import { POST as geminiHandler } from './gemini/route';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, previousQueries = [] } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }

    // Create a new request object for the Gemini handler
    const geminiRequest = new Request(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify({ query, previousQueries })
    });

    // Call the Gemini handler directly instead of making HTTP request
    const geminiResponse = await geminiHandler(geminiRequest as NextRequest);
    
    // Return the response from Gemini handler
    return geminiResponse;
  } catch (error) {
    console.error('Error in suggestions route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}