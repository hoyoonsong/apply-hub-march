import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { ApplicationFileViewer } from "./ApplicationFileViewer";

interface AttachmentListProps {
  applicationId: string;
}

export function AttachmentList({ applicationId }: AttachmentListProps) {
  const [answers, setAnswers] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnswers = async () => {
      try {
        // Get the application data to extract file info from answers
        const { data: application, error } = await supabase
          .from("applications")
          .select("answers")
          .eq("id", applicationId)
          .single();

        if (error) {
          console.error("Error fetching application:", error);
          return;
        }

        setAnswers(application?.answers || {});
      } catch (error) {
        console.error("Error fetching attachments:", error);
      } finally {
        setLoading(false);
      }
    };

    if (applicationId) {
      fetchAnswers();
    }
  }, [applicationId]);

  if (loading) {
    return <div className="text-sm text-gray-500">Loading attachments...</div>;
  }

  if (!answers || Object.keys(answers).length === 0) {
    return <div className="text-sm text-gray-500">No attachments found.</div>;
  }

  return (
    <div className="space-y-3">
      <ApplicationFileViewer applicationAnswers={answers} />
    </div>
  );
}
