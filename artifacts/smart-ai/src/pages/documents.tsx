import { useState, useRef } from "react";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useListDocuments,
  useAnalyzeDocument,
  useDeleteDocument,
  getListDocumentsQueryKey,
} from "@workspace/api-client-react";
import type { Document, DocumentAnalysisResult } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Upload,
  Trash2,
  Loader2,
  FileSearch,
  BookOpen,
  List,
  HelpCircle,
  Brain,
  X,
} from "lucide-react";

const ANALYSIS_TYPES = [
  { value: "summary", label: "Summary", icon: BookOpen, desc: "Get a concise summary" },
  { value: "keyPoints", label: "Key Points", icon: List, desc: "Extract key points" },
  { value: "qa", label: "Q&A", icon: HelpCircle, desc: "Generate Q&A pairs" },
  { value: "quiz", label: "Quiz", icon: Brain, desc: "Create a quiz" },
] as const;

export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [analysisResult, setAnalysisResult] = useState<DocumentAnalysisResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { data: documents, isLoading } = useListDocuments();
  const analyzeDocument = useAnalyzeDocument();
  const deleteDocument = useDeleteDocument();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Upload failed");
      }
      queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAnalyze = (analysisType: "summary" | "keyPoints" | "qa" | "quiz") => {
    if (!selectedDoc) return;
    setAnalysisResult(null);
    analyzeDocument.mutate(
      { id: selectedDoc.id, data: { analysisType } },
      { onSuccess: setAnalysisResult }
    );
  };

  const handleDelete = (id: number) => {
    deleteDocument.mutate(
      { id },
      {
        onSuccess: () => {
          if (selectedDoc?.id === id) setSelectedDoc(null);
          queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
        },
      }
    );
  };

  return (
    <AppLayout>
      <div className="h-full flex flex-col md:flex-row">
        {/* Left: document list */}
        <div className="w-full md:w-72 border-r border-border flex flex-col shrink-0">
          <div className="p-4 border-b border-border">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <FileText size={20} className="text-amber-400" />
              Documents
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Upload PDFs and text files for AI analysis
            </p>
          </div>

          <div className="p-3 border-b border-border">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              className="w-full gap-2"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Upload size={16} />
              )}
              {uploading ? "Uploading..." : "Upload File"}
            </Button>
            {uploadError && (
              <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                <X size={12} /> {uploadError}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2 text-center">
              PDF, TXT, MD — max 10MB
            </p>
          </div>

          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="p-3 space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : documents?.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                No documents yet. Upload one to get started.
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {documents?.map((doc: Document) => (
                  <div
                    key={doc.id}
                    onClick={() => {
                      setSelectedDoc(doc);
                      setAnalysisResult(null);
                    }}
                    className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                      selectedDoc?.id === doc.id
                        ? "bg-amber-500/20 border border-amber-500/30"
                        : "hover:bg-accent"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(doc.fileSize / 1024).toFixed(1)} KB · {doc.fileType}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(doc.id);
                      }}
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right: analysis panel */}
        <div className="flex-1 flex flex-col p-6 overflow-y-auto">
          {!selectedDoc ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                <FileSearch size={32} className="text-amber-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Select a Document</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Choose a document from the list to analyze it with AI
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">{selectedDoc.name}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {(selectedDoc.fileSize / 1024).toFixed(1)} KB · Uploaded{" "}
                    {new Date(selectedDoc.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="outline" className="text-amber-400 border-amber-500/30 shrink-0">
                  {selectedDoc.fileType}
                </Badge>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Analysis Options
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {ANALYSIS_TYPES.map(({ value, label, icon: Icon, desc }) => (
                    <Card
                      key={value}
                      className="cursor-pointer hover:border-amber-500/50 transition-colors group"
                      onClick={() => handleAnalyze(value)}
                    >
                      <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                        <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                          <Icon size={18} className="text-amber-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{label}</p>
                          <p className="text-xs text-muted-foreground">{desc}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {analyzeDocument.isPending && (
                <Card>
                  <CardContent className="p-6 flex items-center gap-3">
                    <Loader2 size={20} className="animate-spin text-amber-400" />
                    <span className="text-sm text-muted-foreground">
                      Analyzing document...
                    </span>
                  </CardContent>
                </Card>
              )}

              {analysisResult && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base capitalize">
                      {analysisResult.analysisType} Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {analysisResult.result}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
