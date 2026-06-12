/**
 * Centralized Admin Configuration
 * Used to verify if a user has admin privileges across the app.
 */
export const isAdminUser = (email?: string | null, userId?: string | null): boolean => {
  if (!email && !userId) return false;

  const adminEmails: string[] = [
    "brighttoughson@gmail.com",
    "twitterbirdplus@gmail.com"
  ];
  
  const adminDomains = [
    "@mytroski.go"
  ];

  const adminUserIds = [
    "user_2lI3YI5A8y5q7N5b7z8x9c0v1b2" // from original implementation
  ];

  // Check strict email match
  if (email && adminEmails.includes(email.toLowerCase())) return true;
  
  // Check "admin" substring (from original implementation)
  if (email && email.toLowerCase().includes("admin")) return true;

  // Check domains
  if (email && adminDomains.some(domain => email.toLowerCase().endsWith(domain))) return true;

  // Check exact User ID
  if (userId && adminUserIds.includes(userId)) return true;

  return false;
};
