"use client"

// API base URL for DrInfo summary service
//  const DRINFO_API_URL = "https://synduct-aisummary.drinfo.ai/chat/stream";
//const DRINFO_API_URL = "http://localhost:8000/chat/stream";
const DRINFO_API_URL = "https://ai-summary-stage.duckdns.org/chat/stream";
// const DRINFO_API_URL = "https://synduct-aisummary.drinfo.ai/chat/stream";
export interface Citation {
  title: string;
  url: string;
  year?: string | number;
  authors?: string[];
  source_type?: string;
  journal?: string;
  doi?: string;
  drug_citation_type?: string;
}

export interface DrInfoSummaryData {
  short_summary?: string;
  processed_content?: string;
  citations?: Record<string, Citation>;
  thread_id?: string;
}

export interface StreamingResponse {
  status: string;
  session_id?: string;
  message?: string;
  data?: string | DrInfoSummaryData;
}

interface DrInfoSummaryOptions {
  sessionId?: string;
  userId?: string;
  parent_thread_id?: string;  // Changed from is_follow_up to parent_thread_id
  mode?: string;
  country?: string;
}

/**
 * Fetches medical information from the AI info summary API with streaming support
 */
export async function fetchDrInfoSummary(
  query: string,
  onChunk: (chunk: string) => void,
  onStatus: (status: string, message?: string) => void,
  onComplete: (data: DrInfoSummaryData) => void,
  options?: DrInfoSummaryOptions
): Promise<void> {
  console.log("[API] Initiating API request for query:", query);
  
  let hasCalledComplete = false;
  
  try {
    console.log("[API] About to send fetch request to:", DRINFO_API_URL);
    const response = await fetch(DRINFO_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "text/event-stream"
      },
      body: JSON.stringify({
        query,
        userId: options?.userId || "anonymous_user",
        session_id: options?.sessionId || undefined,
        language: "English",
        country: options?.country || "US",
        parent_thread_id: options?.parent_thread_id || null,  // Use Firebase thread-based approach
        mode: options?.mode || "study"  // Add mode parameter with default fallback
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API] Request failed with status ${response.status}:`, errorText);
      throw new Error(`API request failed with status ${response.status}`);
    }

    console.log("[API] Response received, status:", response.status);
    
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Failed to get response reader");
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let fullResponse: DrInfoSummaryData = {};
    let chunkCount = 0;
    let hasReceivedContent = false;
    let contentReceived = ""; // Track all content received

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log("[API] Stream complete, received", chunkCount, "chunks");
        break;
      }
      
      buffer += decoder.decode(value, { stream: true });
      
      // Process completed chunks (lines starting with "data: ")
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep the last incomplete line in the buffer
      
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const jsonStr = line.substring(6);
          try {
            chunkCount++;
            const chunk = JSON.parse(jsonStr);
            
                         // Handle status updates and streaming  
             if (chunk.type === "status" || chunk.status === "processing" || chunk.status === "summarizing" || chunk.status === "formatting response" || chunk.status === "analyzing" || chunk.status === "searching" || chunk.status === "generating" || chunk.status === "formatting") {
               console.log(`[API] Status update: ${chunk.status}`, chunk.message);
               onStatus(chunk.status, chunk.message || chunk.data);
             } else if ((chunk.status === "chunk" && typeof chunk.data === "string") || (chunk.type === "content" && typeof chunk.data === "string")) {
               // Streaming content chunks - handle both legacy and LangChain formats
               console.log("[API] Streaming chunk received:", chunk.data?.substring(0, 50) + "...");
               hasReceivedContent = true;
               contentReceived += chunk.data;
               onChunk(chunk.data);
               // Small additional delay in frontend for smoother visual streaming
               await new Promise(resolve => setTimeout(resolve, 20));
             } else if (chunk.status === "complete" && chunk.data && typeof chunk.data === "object") {
               // Complete response with citations
               console.log("[API] Received complete response", chunk.data);
               const completeData = chunk.data as DrInfoSummaryData;
               console.log('[API] Received completeData:', completeData);
               console.log('[API] Thread ID in complete data:', completeData.thread_id);
               if (!hasCalledComplete) {
                 hasCalledComplete = true;
                 onComplete(completeData);
               }
             } else if (chunk.type === "session_id" && chunk.session_id) {
               // Session ID received for follow-up questions
               console.log("[API] Session ID:", chunk.session_id);
               // Store session ID for follow-up questions
             } else if (chunk.status === "error" || chunk.type === "error") {
               // Error handling
               const errorMsg = chunk.data || chunk.error || "Unknown error";
               console.error("[API] Error from server:", errorMsg);
               throw new Error(errorMsg);
             } else {
               // Log unhandled chunks for debugging
               console.log("[API] Unhandled chunk:", chunk);
             }
          } catch (error) {
            console.error("[API] Error parsing streaming response:", error, "Raw data:", jsonStr);
          }
        }
      }
    }
  } catch (error) {
    console.error("[API] Error in fetchDrInfoSummary:", error);
    
    // Ensure we always return something even on error
    if (!hasCalledComplete) {
      onComplete({
        short_summary: "An error occurred while processing your request. Please try again.",
        processed_content: "Error: " + (error instanceof Error ? error.message : String(error)),
        citations: {}
      });
    }
  }
}

/**
 * Sends a follow-up question to the AI info summary API
 */
export async function sendFollowUpQuestion(
  followUpQuestion: string,
  onChunk: (chunk: string) => void,
  onStatus: (status: string, message?: string) => void,
  onComplete: (data: DrInfoSummaryData) => void,
  sessionId: string,
  userId: string,
  parentThreadId?: string,
  mode?: string
): Promise<void> {
  console.log("Sending follow-up question:", followUpQuestion);
  
  try {
    await fetchDrInfoSummary(
      followUpQuestion,
      onChunk,
      onStatus,
      onComplete,
      { parent_thread_id: parentThreadId, sessionId, userId, mode }
    );
  } catch (error) {
    console.error("Error sending follow-up question:", error);
    throw error;
  }
}
