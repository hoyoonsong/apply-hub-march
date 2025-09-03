import ProtectedRoute from "./ProtectedRoute";
export default function ProtectedOrgRoute({
  children,
}: {
  children: JSX.Element;
}) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
