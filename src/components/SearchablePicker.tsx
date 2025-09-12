import React, { useState, useEffect, useRef } from "react";

interface SearchablePickerProps {
  value?: string;
  onChange: (id: string) => void;
  placeholder?: string;
  options: Array<{ id: string; label: string; description?: string }>;
  loading?: boolean;
  error?: string | null;
  className?: string;
}

export default function SearchablePicker({
  value,
  onChange,
  placeholder = "Search and select...",
  options,
  loading = false,
  error = null,
  className = "",
}: SearchablePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredOptions, setFilteredOptions] = useState(options);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter options based on search term
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredOptions(options);
    } else {
      const filtered = options.filter(
        (option) =>
          option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (option.description &&
            option.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredOptions(filtered);
    }
  }, [searchTerm, options]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const selectedOption = options.find((option) => option.id === value);

  const handleSelect = (option: { id: string; label: string }) => {
    onChange(option.id);
    setIsOpen(false);
    setSearchTerm("");
  };

  if (loading) {
    return (
      <div className={`border rounded px-3 py-2 flex-1 min-w-0 ${className}`}>
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`border rounded px-3 py-2 flex-1 min-w-0 border-red-300 ${className}`}
      >
        <div className="text-red-500 text-sm">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className={`relative flex-1 min-w-0 ${className}`} ref={dropdownRef}>
      <div
        className="border rounded px-3 py-2 cursor-pointer hover:border-gray-400 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedOption ? (
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{selectedOption.label}</div>
              {selectedOption.description && (
                <div className="text-xs text-gray-500">
                  {selectedOption.description}
                </div>
              )}
            </div>
            <svg
              className={`w-4 h-4 text-gray-400 transform transition-transform ${
                isOpen ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        ) : (
          <div className="text-gray-500">{placeholder}</div>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          <div className="p-2 border-b">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                {searchTerm ? "No results found" : "No options available"}
              </div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.id}
                  className="px-3 py-3 cursor-pointer hover:bg-gray-100 text-sm"
                  onClick={() => handleSelect(option)}
                >
                  <div className="font-medium">{option.label}</div>
                  {option.description && (
                    <div className="text-xs text-gray-500">
                      {option.description}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
