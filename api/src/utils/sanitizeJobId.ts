export const sanitizeJobId = (jobId: string): string =>
    jobId.replace(/[^a-zA-Z0-9_-]/g, '_');
