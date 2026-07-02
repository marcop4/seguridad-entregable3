// In-memory map for tracking the LATEST valid session per user
// Key: userId, Value: Session Data
export const activeSessionsMap = new Map<string, { 
    sessionId: string; 
    browser: string; 
    ip: string; 
    startedAt: string; 
}>();

export const revokedSessionsSet = new Set<string>();
