import { useAuth } from "../auth/AuthProvider";
import SignOutButton from "./SignOutButton";

export default function UserInfo() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="flex items-center gap-2 md:gap-4">
      <div className="text-right">
        <p className="hidden md:block text-xs text-gray-500">Welcome back,</p>
        <p className="hidden md:block text-sm font-semibold text-gray-800">
          {user.email}
        </p>
      </div>
      <SignOutButton />
    </div>
  );
}
