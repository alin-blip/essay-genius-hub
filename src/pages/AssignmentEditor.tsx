import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, ArrowLeft, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const AssignmentEditor = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) return;
    supabase
      .from("assignments")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          navigate("/dashboard");
          return;
        }
        setAssignment(data);
        setLoading(false);
      });
  }, [user, id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/20">
      <nav className="border-b bg-background sticky top-0 z-50">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-accent" />
            <span className="text-lg font-bold text-primary">AssignmentPro</span>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard</Link>
          </Button>
        </div>
      </nav>

      <div className="container py-8 max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{assignment.title}</h1>
          <p className="text-muted-foreground">{assignment.module_name} · {assignment.word_count?.toLocaleString()} words</p>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4 text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span className="text-sm font-medium">Generated Content</span>
            </div>
            <div className="prose prose-sm max-w-none">
              {assignment.generated_content?.split("\n").map((line: string, i: number) => {
                if (line.startsWith("## ")) return <h2 key={i} className="text-lg font-bold text-foreground mt-6 mb-2">{line.replace("## ", "")}</h2>;
                if (line.startsWith("### ")) return <h3 key={i} className="text-base font-semibold text-foreground mt-4 mb-1">{line.replace("### ", "")}</h3>;
                if (line.trim() === "") return <br key={i} />;
                return <p key={i} className="text-foreground leading-relaxed mb-2">{line}</p>;
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AssignmentEditor;
