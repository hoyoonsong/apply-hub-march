/**
 * Detects URLs in text and splits them into parts for rendering
 */

export interface LinkifyOptions {
  /** CSS class name to apply to links */
  linkClassName?: string;
  /** Target attribute for links (e.g., '_blank' for new tab) */
  target?: string;
  /** Whether to add rel="noopener noreferrer" for security */
  safeExternal?: boolean;
}

export interface TextPart {
  type: 'text' | 'link';
  content: string;
  href?: string;
}

/**
 * Detects URLs in a string and returns an array of parts (text and links)
 * 
 * Supports:
 * - http:// and https:// URLs
 * - www. URLs (automatically adds https://)
 * - Domain names with common TLDs
 * 
 * @param text - The text to process
 * @returns Array of text parts with type information
 */
export function linkifyText(text: string): TextPart[] {
  // URL regex pattern - matches http://, https://, and www. URLs
  // Also matches URLs with common TLDs
  const urlPattern =
    /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}(?::[0-9]+)?(?:\/[^\s<>"']*)?)/gi;

  const parts: TextPart[] = [];
  let lastIndex = 0;
  let match;

  // Reset regex lastIndex
  urlPattern.lastIndex = 0;

  while ((match = urlPattern.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex, match.index),
      });
    }

    // Process the URL
    let url = match[0];
    let href = url;

    // If it's a www. URL or domain without protocol, add https://
    if (!/^https?:\/\//i.test(url)) {
      // Check if it looks like a domain
      if (/^www\./i.test(url) || /^[a-zA-Z0-9]/.test(url)) {
        href = `https://${url}`;
      }
    }

    // Create link part
    parts.push({
      type: 'link',
      content: url,
      href,
    });

    lastIndex = urlPattern.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.substring(lastIndex),
    });
  }

  // If no URLs were found, return the original text as a single text part
  if (parts.length === 0) {
    return [{ type: 'text', content: text }];
  }

  return parts;
}

