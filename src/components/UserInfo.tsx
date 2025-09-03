import React from "react";
import { useAuth } from "../auth/AuthProvider";
import SignOutButton from "./SignOutButton";

export default function UserInfo() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="flex items-center gap-4">
      <div className="text-right">
        <p className="text-xs text-gray-500">Welcome back,</p>
        <p className="text-sm font-semibold text-gray-800">{user.email}</p>
      </div>
      <SignOutButton />
    </div>
  );
}
