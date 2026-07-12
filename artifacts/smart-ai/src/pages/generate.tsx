import { useState, useRef, useEffect } from "react";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wand2, Image as ImageIcon, Video, Loader2, X, Download, Upload, Mic, Music } from "lucide-react";
import { useGenerateMedia } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@clerk/react";

export default function GeneratePage() {
  const [prompt, setPrompt] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video" | "audio">("image");
  const [videoMode, setVideoMode] = useState<"text2video" | "talking_photo">("text2video");
  const [voiceId, setVoiceId] = useState<string>("EXAVITQu4vr4xnSDxMaL"); // Default to Sarah (Female)
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const [isListening, setIsListening] = useState(false);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { toast } = useToast();
  const { getToken } = useAuth();
  const generateMutation = useGenerateMedia();

  const clearSilenceTimeout = () => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
  };

  const resetSilenceTimeout = () => {
    clearSilenceTimeout();
    silenceTimeoutRef.current = setTimeout(() => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        setIsListening(false);
        toast({ title: "Microphone turned off", description: "Stopped listening due to 10 seconds of silence." });
      }
    }, 10000);
  };
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        
        recognitionRef.current.onresult = (event: any) => {
          resetSilenceTimeout(); // Reset the 10-second timer whenever speech is detected
          let currentTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              setPrompt((prev) => {
                const newPrompt = prev + (prev.endsWith(" ") || prev === "" ? "" : " ") + transcript;
                return newPrompt;
              });
            }
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsListening(false);
          clearSilenceTimeout();
        };
        
        recognitionRef.current.onend = () => {
          setIsListening(false);
          clearSilenceTimeout();
        };
      }
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      clearSilenceTimeout();
    } else {
      if (!recognitionRef.current) {
        toast({ title: "Not Supported", description: "Speech recognition is not supported in your browser.", variant: "destructive" });
        return;
      }
      recognitionRef.current.start();
      setIsListening(true);
      resetSilenceTimeout();
    }
  };
  
  // Hooks and mutation already defined above

  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const token = await getToken();
    
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });
    
    if (!res.ok) throw new Error("Upload failed");
    const data = await res.json();
    return data.url;
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || generateMutation.isPending || isUploading) return;
    setGeneratedUrl(null);
    
    try {
      let baseImageUrl = undefined;
      let audioDataUrl = undefined;
      
      if (mediaType === "video" && videoMode === "talking_photo") {
        if (!imageFile) {
          toast({ title: "Image Required", description: "Please upload an image for the talking photo.", variant: "destructive" });
          return;
        }
        setIsUploading(true);
        baseImageUrl = await handleUpload(imageFile);
        if (audioFile) {
          audioDataUrl = await handleUpload(audioFile);
        }
        setIsUploading(false);
      }
      
      generateMutation.mutate({
        data: {
          prompt: prompt.trim(),
          type: mediaType,
          ...(mediaType === "video" ? { videoMode } : {}),
          ...(mediaType === "audio" ? { voiceId } : {}),
          baseImage: baseImageUrl,
          audioData: audioDataUrl
        }
      }, {
        onSuccess: (res) => {
          setGeneratedUrl(res.url);
        },
        onError: () => {
          toast({
            title: "Generation Failed",
            description: "An error occurred while generating media. Please try again.",
            variant: "destructive"
          });
        }
      });
    } catch (e) {
      setIsUploading(false);
      toast({
        title: "Upload Failed",
        description: "Failed to upload files.",
        variant: "destructive"
      });
    }
  };

  const handleTabChange = (value: string) => {
    setMediaType(value as "image" | "video" | "audio");
    setGeneratedUrl(null);
  };

  return (
    <AppLayout>
      <div className="h-full flex flex-col max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
            <Wand2 size={22} className="text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Media Generation</h1>
            <p className="text-sm text-muted-foreground">
              Generate images, video, and audio using AI
            </p>
          </div>
        </div>

        <Tabs value={mediaType} onValueChange={handleTabChange} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="image" className="flex items-center gap-2">
              <ImageIcon size={16} />
              Image
            </TabsTrigger>
            <TabsTrigger value="video" className="flex items-center gap-2">
              <Video size={16} />
              Video
            </TabsTrigger>
            <TabsTrigger value="audio" className="flex items-center gap-2">
              <Music size={16} />
              Audio
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="image" className="flex-1 flex flex-col m-0 min-h-0">
            <div className="flex-1 flex flex-col bg-card border border-border rounded-xl p-4 gap-4">
              <div className="flex-1 bg-black/10 rounded-lg border border-border/50 flex flex-col items-center justify-center overflow-hidden relative min-h-[300px]">
                {generateMutation.isPending ? (
                  <div className="flex flex-col items-center text-muted-foreground">
                    <Loader2 size={32} className="animate-spin mb-3 text-orange-400" />
                    <p>Generating your image...</p>
                  </div>
                ) : generatedUrl ? (
                  <div className="relative w-full h-full flex items-center justify-center group p-4">
                    <img src={generatedUrl} alt="Generated" className="w-full h-full max-h-[450px] object-contain rounded-md drop-shadow-lg" />
                    <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full" onClick={() => window.open(generatedUrl, "_blank")}>
                        <Download size={16} />
                      </Button>
                      <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full" onClick={() => setGeneratedUrl(null)}>
                        <X size={16} />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-muted-foreground">
                    <ImageIcon size={48} className="mb-3 opacity-20" />
                    <p>Enter a prompt below to generate an image</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="video" className="flex-1 flex flex-col m-0 min-h-0">
            <div className="flex-1 flex flex-col bg-card border border-border rounded-xl p-4 gap-4">
              
              <Tabs value={videoMode} onValueChange={(v) => setVideoMode(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-2">
                  <TabsTrigger value="text2video">Text to Video</TabsTrigger>
                  <TabsTrigger value="talking_photo">Talking Photo (Image + Voice)</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex-1 bg-black/10 rounded-lg border border-border/50 flex flex-col items-center justify-center overflow-hidden relative min-h-[300px]">
                {generateMutation.isPending || isUploading ? (
                  <div className="flex flex-col items-center text-muted-foreground p-8">
                    <Loader2 size={32} className="animate-spin mb-3 text-orange-400" />
                    <p>{isUploading ? "Uploading files..." : "Generating your video..."}</p>
                    <p className="text-xs opacity-50 mt-1">This usually takes a bit longer</p>
                  </div>
                ) : generatedUrl ? (
                  <div className="relative w-full h-full flex items-center justify-center group p-4">
                    <video src={generatedUrl} controls autoPlay loop className="w-full h-full max-h-[450px] object-contain rounded-md drop-shadow-lg" />
                    <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full" onClick={() => window.open(generatedUrl, "_blank")}>
                        <Download size={16} />
                      </Button>
                      <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full" onClick={() => setGeneratedUrl(null)}>
                        <X size={16} />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-muted-foreground p-8 text-center">
                    <Video size={48} className="mb-3 opacity-20" />
                    {videoMode === "talking_photo" ? (
                      <div className="w-full max-w-sm flex flex-col gap-3">
                        <p className="mb-2">Upload a photo and audio for lip-sync</p>
                        
                        <div className="flex items-center gap-2">
                          <Button variant="outline" className="flex-1 flex gap-2" onClick={() => imageInputRef.current?.click()}>
                            <ImageIcon size={16} /> {imageFile ? imageFile.name : "Select Image"}
                          </Button>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button variant="outline" className="flex-1 flex gap-2" onClick={() => audioInputRef.current?.click()}>
                            <Mic size={16} /> {audioFile ? audioFile.name : "Select Audio (Optional)"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p>Enter a prompt below to generate a short video</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="audio" className="flex-1 flex flex-col m-0 min-h-0">
            <div className="flex-1 flex flex-col bg-card border border-border rounded-xl p-4 gap-4">
              <Tabs value={voiceId} onValueChange={setVoiceId} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-2">
                  <TabsTrigger value="EXAVITQu4vr4xnSDxMaL">Female Voice (Sarah)</TabsTrigger>
                  <TabsTrigger value="pNInz6obpgDQGcFmaJgB">Male Voice (Adam)</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex-1 bg-black/10 rounded-lg border border-border/50 flex flex-col items-center justify-center overflow-hidden relative min-h-[300px]">
                {generateMutation.isPending ? (
                  <div className="flex flex-col items-center text-muted-foreground">
                    <Loader2 size={32} className="animate-spin mb-3 text-orange-400" />
                    <p>Generating your audio with ElevenLabs...</p>
                  </div>
                ) : generatedUrl ? (
                  <div className="relative w-full h-full flex flex-col items-center justify-center group p-8 max-w-sm mx-auto text-center">
                    <Music size={48} className="mb-6 text-orange-500 animate-pulse" />
                    <audio src={generatedUrl} controls autoPlay className="w-full drop-shadow-lg mb-4" />
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => {
                        const link = document.createElement('a');
                        link.href = generatedUrl;
                        link.download = `voice_${Date.now()}.mp3`;
                        link.click();
                      }}>
                        <Download size={16} className="mr-2" /> Download MP3
                      </Button>
                      <Button variant="ghost" onClick={() => setGeneratedUrl(null)}>
                        Clear
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-muted-foreground p-8 text-center max-w-sm">
                    <Music size={48} className="mb-3 opacity-20" />
                    <p>Type the text you want the AI to speak using ElevenLabs ultra-realistic voices.</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Hidden File Inputs */}
          <input type="file" accept="image/*" className="hidden" ref={imageInputRef} onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
          <input type="file" accept="audio/*" className="hidden" ref={audioInputRef} onChange={(e) => setAudioFile(e.target.files?.[0] || null)} />

          {/* Input Area */}
          <div className="mt-6 flex gap-3">
            <div className="relative flex-1">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={mediaType === "video" && videoMode === "talking_photo" 
                  ? "Describe what they should say (or leave blank if uploading audio)..." 
                  : mediaType === "audio"
                  ? "Type the text you want the AI to speak out loud..."
                  : `Describe the ${mediaType} you want to generate...`}
                className="resize-none min-h-[96px] max-h-36 w-full rounded-xl bg-card border-border pb-12"
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
              />
              <div className="absolute bottom-2 left-2 flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground" onClick={() => imageInputRef.current?.click()} title="Upload Image">
                  <ImageIcon size={18} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={`h-8 w-8 rounded-full transition-colors ${isListening ? 'text-red-500 bg-red-500/10 animate-pulse' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={toggleListening} 
                  title={isListening ? "Stop listening" : "Dictate Prompt"}
                >
                  <Mic size={18} />
                </Button>
                {(imageFile || audioFile) && (
                  <div className="flex items-center gap-2 ml-2">
                    {imageFile && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-md max-w-[120px] truncate flex items-center gap-1">
                        <ImageIcon size={12} /> {imageFile.name}
                      </span>
                    )}
                    {audioFile && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-md max-w-[120px] truncate flex items-center gap-1">
                        <Mic size={12} /> {audioFile.name}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={(!prompt.trim() && !(mediaType === 'video' && videoMode === 'talking_photo')) || generateMutation.isPending || isUploading}
              size="icon"
              className="h-[56px] w-[56px] shrink-0 rounded-xl bg-orange-600 hover:bg-orange-700 text-white"
            >
              {generateMutation.isPending || isUploading ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <Wand2 size={24} />
              )}
            </Button>
          </div>
        </Tabs>
      </div>
    </AppLayout>
  );
}
