import React from "react";
import { GoogleLoginButton, GoogleSignupButton } from "./GoogleButtons";

export default function LoginModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-3 text-xl font-semibold">Welcome to Apply Hub</h2>
        <GoogleSignupButton />
        <div className="my-2 text-center text-xs text-gray-500">or</div>
        <GoogleLoginButton />
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded p-1 text-gray-400 hover:bg-gray-100"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
