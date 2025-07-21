import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// The URL for the external guidelines search API
const GUIDELINES_API_URL = 'https://synduct-guidelines.drinfo.ai/search';
// const GUIDELINES_API_URL = 'http://localhost:8001/search';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    logger.apiLog('Search request body:', body);
    
    // Forward the request to the actual API
    const response = await fetch(GUIDELINES_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        query: body.query,
        limit: 5,
        country: body.country || "None",
        filters: {
          start_year: 0,
          end_year: 0,
          country: body.country || "None",
          abstract_only: false
        }
      })
    });
    
    // Check if the response is successful
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      logger.error('API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        errorData
      });
      return NextResponse.json(
        { error: errorData?.detail || `API request failed with status: ${response.status}` },
        { status: response.status }
      );
    }
    
    // Parse the response data
    const data = await response.json();
    logger.apiLog('API Response:', data);
    
    // Transform the nested response into a flat array
    const transformedData = Object.values(data).flat().map((item: any) => {
      // Safely create a date string from the year
      const year = parseInt(item.year) || new Date().getFullYear();
      const dateStr = new Date(year, 0, 1).toISOString();
      
      return {
        id: item.guidelines_index,
        title: item.title,
        description: `${item.society ? item.society + ' - ' : ''}${item.year} ${item.country} Guidelines`,
        category: item.bucket || 'International',
        last_updated: dateStr,
        url: item.URL || item.link,
        publisher: item.publisher,
        language: item.language,
        pdf_saved: item.pdf_saved,
        society: item.society,
        year: item.year,
      };
    });
    
    return NextResponse.json(transformedData);
    
  } catch (apiError: any) {
    logger.error('Guidelines API error:', {
      message: apiError.message,
      stack: apiError.stack,
      cause: apiError.cause
    });
    
    // Return appropriate error response based on the type of error
    if (apiError instanceof SyntaxError) {
      // JSON parsing error
      return NextResponse.json(
        { error: 'Failed to parse API response' }, 
        { status: 500 }
      );
    } else if (apiError.code === 'ECONNREFUSED' || apiError.code === 'ENOTFOUND') {
      // Network connectivity errors
      return NextResponse.json(
        { error: 'Unable to connect to guidelines service. Please check your network connection.' },
        { status: 503 }
      );
    } else {
      // Other errors
      return NextResponse.json(
        { error: 'Failed to connect to guidelines API service' },
        { status: 503 }
      );
    }
  }
}