import React, { createContext, useContext, useState, ReactNode } from "react";
import { useParams } from "react-router-dom";
import { getOrgBySlug } from "../lib/orgs";

interface OrgAdminModalContextType {
  showCreateModal: () => void;
  showAdvertiseModal: () => void;
  closeCreateModal: () => void;
  closeAdvertiseModal: () => void;
  isCreateModalOpen: boolean;
  isAdvertiseModalOpen: boolean;
  orgId: string | null;
  orgName: string | null;
  orgSlug: string | null;
}

const OrgAdminModalContext = createContext<OrgAdminModalContextType | null>(
  null
);

export function OrgAdminModalProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAdvertiseModalOpen, setIsAdvertiseModalOpen] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);

  // Load org data when slug changes
  React.useEffect(() => {
    if (!orgSlug) return;

    let mounted = true;

    async function loadOrg() {
      try {
        const org = await getOrgBySlug(orgSlug);
        if (!mounted) return;

        if (org) {
          setOrgId(org.id);
          setOrgName(org.name);
        }
      } catch (err) {
        console.error("Error loading org for modals:", err);
      }
    }

    loadOrg();

    return () => {
      mounted = false;
    };
  }, [orgSlug]);

  const showCreateModal = () => setIsCreateModalOpen(true);
  const closeCreateModal = () => setIsCreateModalOpen(false);
  const showAdvertiseModal = () => setIsAdvertiseModalOpen(true);
  const closeAdvertiseModal = () => setIsAdvertiseModalOpen(false);

  return (
    <OrgAdminModalContext.Provider
      value={{
        showCreateModal,
        showAdvertiseModal,
        closeCreateModal,
        closeAdvertiseModal,
        isCreateModalOpen,
        isAdvertiseModalOpen,
        orgId,
        orgName,
        orgSlug: orgSlug || null,
      }}
    >
      {children}
    </OrgAdminModalContext.Provider>
  );
}

export function useOrgAdminModals() {
  const context = useContext(OrgAdminModalContext);
  if (!context) {
    throw new Error(
      "useOrgAdminModals must be used within OrgAdminModalProvider"
    );
  }
  return context;
}

