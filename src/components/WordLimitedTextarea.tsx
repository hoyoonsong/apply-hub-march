import React, { useState, useEffect } from "react";
import {
  countWords,
  validateWordLimit,
  getWordCountText,
  truncateToWordLimit,
} from "../utils/wordCount";
import AutoLinkText from "./AutoLinkText";

interface WordLimitedTextareaProps {
  value: string;
  onChange: (value: string) => void;
  maxWords?: number;
  placeholder?: string;
  className?: string;
  rows?: number;
  disabled?: boolean;
  required?: boolean;
  label?: string;
}

export default function WordLimitedTextarea({
  value,
  onChange,
  maxWords = 100,
  placeholder = "",
  className = "",
  rows = 4,
  disabled = false,
  required = false,
  label = "",
}: WordLimitedTextareaProps) {
  const [localValue, setLocalValue] = useState(value);
  const [isOverLimit, setIsOverLimit] = useState(false);

  // Update local value when prop changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Check if over limit
  useEffect(() => {
    setIsOverLimit(!validateWordLimit(localValue, maxWords));
  }, [localValue, maxWords]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;

    // If over limit, truncate to word boundary
    if (!validateWordLimit(newValue, maxWords)) {
      const truncated = truncateToWordLimit(newValue, maxWords);
      setLocalValue(truncated);
      onChange(truncated);
    } else {
      setLocalValue(newValue);
      onChange(newValue);
    }
  };

  const wordCount = countWords(localValue);
  const isAtLimit = wordCount >= maxWords;

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-xs md:text-sm font-medium text-gray-700">
          <AutoLinkText text={label} />
          {required && " *"}
        </label>
      )}
      <textarea
        className={`w-full rounded-md border px-3 py-2 md:px-4 md:py-3 text-sm md:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
          isOverLimit
            ? "border-red-300 bg-red-50"
            : isAtLimit
            ? "border-yellow-300 bg-yellow-50"
            : "border-gray-300"
        } ${disabled ? "opacity-70 bg-gray-100" : ""} ${className}`}
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
      />
      <div className="flex justify-between items-center text-xs">
        <div
          className={`${
            isOverLimit
              ? "text-red-600"
              : isAtLimit
              ? "text-yellow-600"
              : "text-gray-500"
          }`}
        >
          {getWordCountText(localValue, maxWords)}
        </div>
        {isOverLimit && (
          <div className="text-red-600 font-medium">Over word limit</div>
        )}
        {isAtLimit && !isOverLimit && (
          <div className="text-yellow-600 font-medium">At word limit</div>
        )}
      </div>
    </div>
  );
}
