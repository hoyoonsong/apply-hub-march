import React from "react";
import { linkifyText, LinkifyOptions } from "../utils/linkify";

export interface AutoLinkTextProps {
  /** The text to render with auto-detected links */
  text: string;
  /** CSS class name to apply to the container */
  className?: string;
  /** CSS class name to apply to links */
  linkClassName?: string;
  /** Target attribute for links (e.g., '_blank' for new tab) */
  target?: string;
  /** Whether to preserve whitespace and line breaks */
  preserveWhitespace?: boolean;
}

/**
 * Component that automatically detects URLs in text and converts them to clickable links
 */
export default function AutoLinkText({
  text,
  className = "",
  linkClassName = "text-blue-600 hover:text-blue-800 underline",
  target = "_blank",
  preserveWhitespace = false,
}: AutoLinkTextProps) {
  if (!text) return null;

  const parts = linkifyText(text);

  return (
    <span
      className={`${className} break-words`}
      style={preserveWhitespace ? { whiteSpace: "pre-line" } : undefined}
    >
      {parts.map((part, index) => {
        if (part.type === "link" && part.href) {
          return (
            <a
              key={index}
              href={part.href}
              target={target}
              rel={target === "_blank" ? "noopener noreferrer" : undefined}
              className={`${linkClassName} break-all`}
              style={{ wordBreak: "break-all" }}
            >
              {part.content}
            </a>
          );
        }
        return <React.Fragment key={index}>{part.content}</React.Fragment>;
      })}
    </span>
  );
}

