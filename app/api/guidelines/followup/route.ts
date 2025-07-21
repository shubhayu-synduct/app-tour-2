import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// The URL for the external guidelines followup API
const GUIDELINES_API_URL = 'https://synduct-guidelines.drinfo.ai/followup';
// const GUIDELINES_API_URL = 'http://localhost:8001/followup';

export async function POST(request: NextRequest) {
  try {
    const { title, guidelines_index, question } = await request.json();
    
    if (!title || guidelines_index === undefined || !question) {
      return NextResponse.json(
        { error: 'Title, guidelines_index, and question are required' },
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
        guidelines_index,
        question
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return NextResponse.json(
        { error: errorData?.detail || 'Failed to get answer' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    logger.error('Error in followup route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}