import React from "react";
import { Link } from "react-router-dom";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Sign in</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ×
          </button>
        </div>

        {/* Applicant Login Section */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Applicants</h3>
          <Link
            to="/login/applicant"
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors block text-center"
          >
            Applicant
          </Link>
        </div>

        {/* Admin Login Section */}
        <div className="mb-6">
          <Link
            to="/login/admin"
            onClick={onClose}
            className="text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            Member admin login →
          </Link>
        </div>

        {/* Account Creation */}
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">
            Don't have an account yet?
          </p>
          <Link
            to="/create-account"
            onClick={onClose}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Create an account →
          </Link>
        </div>
      </div>
    </div>
  );
}
