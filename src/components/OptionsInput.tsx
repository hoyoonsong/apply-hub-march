import React, { useState, useEffect } from "react";

interface OptionsInputProps {
  options: string[];
  onChange: (options: string[]) => void;
  disabled?: boolean;
  className?: string;
}

export default function OptionsInput({
  options,
  onChange,
  disabled = false,
  className = "",
}: OptionsInputProps) {
  const [localOptions, setLocalOptions] = useState<string[]>(options);

  useEffect(() => {
    setLocalOptions(options);
  }, [options]);

  const addOption = () => {
    const newOptions = [...localOptions, ""];
    setLocalOptions(newOptions);
    onChange(newOptions);
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...localOptions];
    newOptions[index] = value;
    setLocalOptions(newOptions);
    onChange(newOptions.filter((opt) => opt.trim() !== ""));
  };

  const removeOption = (index: number) => {
    const newOptions = localOptions.filter((_, i) => i !== index);
    setLocalOptions(newOptions);
    onChange(newOptions);
  };

  return (
    <div
      className={`w-full mt-2 p-3 bg-gray-50 rounded-md border ${className}`}
    >
      <div className="text-sm font-medium text-gray-700 mb-3">Options:</div>
      <div className="space-y-2">
        {localOptions.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="text"
              value={option}
              onChange={(e) => updateOption(index, e.target.value)}
              placeholder={`Option ${index + 1}`}
              className="flex-1 border rounded px-3 py-2 disabled:opacity-50 disabled:bg-gray-100"
              disabled={disabled}
            />
            <button
              type="button"
              onClick={() => removeOption(index)}
              disabled={disabled}
              className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed px-2 py-1"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addOption}
          disabled={disabled}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          <span className="text-lg">+</span>
          Add Option
        </button>
      </div>
    </div>
  );
}
