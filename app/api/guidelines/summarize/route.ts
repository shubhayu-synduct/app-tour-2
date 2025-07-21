import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// The URL for the external guidelines API
const GUIDELINES_API_URL = 'https://synduct-guidelines.drinfo.ai/summarize';
// const GUIDELINES_API_URL = 'http://localhost:8001/summarize';

export async function POST(request: NextRequest) {
  try {
    const { title, guidelines_index } = await request.json();
    
    if (!title || guidelines_index === undefined) {
      return NextResponse.json(
        { error: 'Title and guidelines_index are required' },
        { status: 400 }
      );
    }
    
    const response = await fetch(GUIDELINES_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        guidelines_index
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return NextResponse.json(
        { error: errorData?.detail || 'Failed to summarize guideline' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    logger.error('Error in summarize route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}