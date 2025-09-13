import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

interface AttachmentDebugProps {
  applicationId: string;
}

export function AttachmentDebug({ applicationId }: AttachmentDebugProps) {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDebugInfo = async () => {
      try {
        // Get attachments
        const { data: attachments, error: attachmentsError } = await supabase
          .from("application_attachments")
          .select("*")
          .eq("application_id", applicationId);

        // Get application data
        const { data: application, error: applicationError } = await supabase
          .from("applications")
          .select("*")
          .eq("id", applicationId)
          .single();

        setDebugInfo({
          applicationId,
          attachments: attachments || [],
          attachmentsError,
          application,
          applicationError,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        setDebugInfo({
          applicationId,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      } finally {
        setLoading(false);
      }
    };

    if (applicationId) {
      fetchDebugInfo();
    }
  }, [applicationId]);

  if (loading) {
    return <div className="text-sm text-gray-500">Loading debug info...</div>;
  }

  return (
    <div className="bg-gray-100 p-4 rounded-lg text-xs font-mono">
      <h4 className="font-bold mb-2">Debug Info</h4>
      <pre className="whitespace-pre-wrap overflow-auto">
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
    </div>
  );
}
