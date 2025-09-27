import React from "react";
import { Link } from "react-router-dom";
import UserInfo from "./UserInfo";

interface DashboardHeaderProps {
  title?: string;
  showTabs?: boolean;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  tabs?: { name: string; label: string }[];
}

export default function DashboardHeader({
  title,
  showTabs = false,
  activeTab,
  onTabChange,
  tabs = [],
}: DashboardHeaderProps) {
  return (
    <nav className="bg-white shadow-sm relative">
      {/* Logo positioned absolutely at top-left corner with responsive sizing */}
      <div className="absolute top-2 left-2 sm:top-2 sm:left-4 z-10">
        <Link to="/" className="flex items-center">
          <img
            src="/Omnipply.png"
            alt="Omnipply Logo"
            className="h-24 w-auto sm:h-32 md:h-40"
          />
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 md:px-8 py-6 sm:py-12 md:py-16">
        {/* Main header row - logo, tabs (desktop), user info */}
        <div className="flex items-center justify-between">
          {/* Responsive spacer for logo */}
          <div className="w-16 sm:w-28 md:w-40"></div>

          {/* Center - Tabs with responsive positioning (hidden on mobile) */}
          {showTabs && tabs.length > 0 && (
            <div className="hidden md:flex absolute left-1/2 transform -translate-x-1/2 gap-4 lg:gap-5">
              {tabs.map((tab) => (
                <button
                  key={tab.name}
                  className={`font-bold py-2.5 px-5 lg:py-3 lg:px-6 rounded-lg transition-all duration-200 text-sm lg:text-base ${
                    activeTab === tab.name
                      ? "bg-blue-600 text-white shadow-lg"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                  onClick={() => onTabChange?.(tab.name)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Right side - User info */}
          <div className="flex items-start pt-4 md:items-center md:pt-0">
            <UserInfo />
          </div>
        </div>

        {/* Mobile tabs row - shown only on mobile */}
        {showTabs && tabs.length > 0 && (
          <div className="md:hidden flex justify-center mt-12 gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.name}
                className={`font-bold py-1.5 px-2 rounded-md transition-all duration-200 text-xs ${
                  activeTab === tab.name
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
                onClick={() => onTabChange?.(tab.name)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
