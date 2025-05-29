export type StatusType = 'processing' | 'searching' | 'summarizing' | 'formatting' | 'complete';

const statusMessages: Record<StatusType, string> = {
  processing: "Analyzing your Query",
  searching: "Gathering Sources",
  summarizing: "Generating Precision Answer",
  formatting: "Formatting your Answer",
  complete: "Done"
};

export function getStatusMessage(status: StatusType): string {
  return statusMessages[status] || "Processing your request...";
}