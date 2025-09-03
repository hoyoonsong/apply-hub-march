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
            src="/Apply-Hub.png"
            alt="Apply Hub Logo"
            className="h-24 w-auto sm:h-32 md:h-40"
          />
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12 md:py-16">
        <div className="flex items-center justify-between">
          {/* Responsive spacer for logo */}
          <div className="w-20 sm:w-28 md:w-40"></div>

          {/* Center - Tabs with responsive positioning */}
          {showTabs && tabs.length > 0 && (
            <div className="absolute left-1/2 transform -translate-x-1/2 flex gap-3 sm:gap-4 md:gap-5">
              {tabs.map((tab) => (
                <button
                  key={tab.name}
                  className={`font-bold py-2 px-4 sm:py-2.5 sm:px-5 md:py-3 md:px-6 rounded-lg transition-all duration-200 text-sm sm:text-base ${
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
          <div className="flex items-center">
            <UserInfo />
          </div>
        </div>
      </div>
    </nav>
  );
}
