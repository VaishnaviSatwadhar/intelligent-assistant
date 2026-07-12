const fs = require("fs");
const path = require("path");

function patchFile(fileName, isCareer) {
  const filePath = path.join(__dirname, "smart-ai/src/pages", fileName);
  let content = fs.readFileSync(filePath, "utf8");

  // 1. Add Lucide icons
  content = content.replace(
    '  Sparkles,\n} from "lucide-react";',
    '  Sparkles,\n  Mic,\n  MicOff,\n  Image as ImageIcon,\n  X,\n} from "lucide-react";'
  );

  // 2. Update Message interface
  content = content.replace(
    'interface Message {\n  role: "user" | "assistant";\n  content: string;\n}',
    'interface Message {\n  role: "user" | "assistant";\n  content: string;\n  attachments?: string[];\n}'
  );

  // 3. Add state variables inside component
  const stateTarget = `  const [input, setInput] = useState("");`;
  const stateReplacement = `  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);`;
  content = content.replace(stateTarget, stateReplacement);

  // 4. Add useRef to imports
  if (!content.includes('useRef')) {
    content = content.replace('import { useState } from "react";', 'import { useState, useRef } from "react";');
  }

  // 5. Add handleMic and handleFile
  const handleSendTarget = `  const handleSend = async (text?: string) => {`;
  const handleMicAndFile = `  const handleMicClick = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = ${isCareer ? '"en-US"' : 'language === "en" ? "en-US" : language === "hi" ? "hi-IN" : "mr-IN"'};

    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join("");
      setInput(prev => prev ? prev + " " + transcript : transcript);
    };
    recognition.onerror = (event: any) => {
      console.error(event.error);
      setIsRecording(false);
    };
    recognition.onend = () => setIsRecording(false);
    
    recognition.start();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };
`;
  content = content.replace(handleSendTarget, handleMicAndFile + "\n" + handleSendTarget);

  // 6. Update handleSend body
  const sendTarget = `  const handleSend = async (text?: string) => {
    const content = text ?? input.trim();
    if (!content || sendMessage.isPending) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content }]);

    sendMessage.mutate(
      { data: { content, mode: ${isCareer ? '"career"' : '"learning", language: language as "en" | "hi" | "mr"'} } },`;
  
  const sendReplacement = `  const handleSend = async (text?: string) => {
    const content = text ?? input.trim();
    if ((!content && attachments.length === 0) || sendMessage.isPending || isUploading) return;
    
    setIsUploading(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of attachments) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (!res.ok) throw new Error("Upload failed");
        const data = await res.json();
        uploadedUrls.push(data.url);
      }
      
      setInput("");
      setAttachments([]);
      setMessages((prev) => [...prev, { role: "user", content, attachments: uploadedUrls }]);

      sendMessage.mutate(
        { data: { content, mode: ${isCareer ? '"career"' : '"learning", language: language as "en" | "hi" | "mr"'}, attachments: uploadedUrls.length > 0 ? uploadedUrls : undefined } },`;
  
  content = content.replace(sendTarget, sendReplacement);

  const onSuccessTarget = `          ]);
        },
      }
    );
  };`;
  const onSuccessReplacement = `          ]);
        },
      }
    );
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };`;
  content = content.replace(onSuccessTarget, onSuccessReplacement);

  // 7. Update UI Input area
  // input area in both starts with:
  //         {/* Input */}
  //         <div className="flex gap-3 mt-auto">
  //           <Textarea
  
  const inputAreaTarget = `        {/* Input */}
        <div className="flex gap-3 mt-auto">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your ${isCareer ? 'career coach' : 'tutor'} anything..."
            className="resize-none"`;
  
  const inputAreaReplacement = `        {/* Input */}
        <div className="bg-background relative z-10 flex flex-col gap-2 mt-auto p-4 border border-border rounded-xl">
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {attachments.map((file, idx) => (
                <div key={idx} className="relative inline-flex items-center bg-muted/50 rounded-md p-1 pr-2 border border-border">
                  {file.type.startsWith("image/") ? (
                    <div className="w-8 h-8 rounded shrink-0 overflow-hidden bg-background mr-2 flex items-center justify-center">
                      <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded shrink-0 flex items-center justify-center bg-background mr-2 text-xs font-medium text-muted-foreground">
                      VID
                    </div>
                  )}
                  <span className="text-xs truncate max-w-[150px] mr-2">{file.name}</span>
                  <button onClick={() => removeAttachment(idx)} className="text-muted-foreground hover:text-foreground bg-background rounded-full p-0.5">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-3 items-end">
            <div className="flex gap-2">
              <Button
                variant={isRecording ? "destructive" : "secondary"}
                size="icon"
                className="h-[48px] w-[48px] shrink-0 rounded-xl transition-all"
                onClick={handleMicClick}
                title="Voice Input"
              >
                {isRecording ? <MicOff size={20} className="animate-pulse" /> : <Mic size={20} />}
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="h-[48px] w-[48px] shrink-0 rounded-xl transition-all"
                onClick={() => fileInputRef.current?.click()}
                title="Upload Image/Video"
              >
                <ImageIcon size={20} />
              </Button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*,video/*" 
                multiple 
                onChange={handleFileChange} 
              />
            </div>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask your ${isCareer ? 'career coach' : 'tutor'} anything..."
              className="resize-none min-h-[48px] max-h-36 flex-1 rounded-xl bg-card border-border"`;
              
  content = content.replace(inputAreaTarget, inputAreaReplacement);
  
  const sendButtonTarget = `          <Button
            onClick={() => handleSend()}
            disabled={!input.trim() || sendMessage.isPending}
            size="icon"
            className="h-14 w-14 ${isCareer ? 'bg-purple-600 hover:bg-purple-700' : 'bg-green-600 hover:bg-green-700'} shrink-0"
          >
            {sendMessage.isPending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </Button>
        </div>`;
        
  const sendButtonReplacement = `          <Button
            onClick={() => handleSend()}
            disabled={(!input.trim() && attachments.length === 0) || sendMessage.isPending || isUploading}
            size="icon"
            className="h-[48px] w-[48px] shrink-0 mt-auto rounded-xl ${isCareer ? 'bg-purple-600 hover:bg-purple-700' : 'bg-green-600 hover:bg-green-700'} text-primary-foreground"
          >
            {(sendMessage.isPending || isUploading) ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </Button>
        </div>
        </div>`;
        
  content = content.replace(sendButtonTarget, sendButtonReplacement);

  // 8. Update messages rendering to show attachments
  const renderTarget = `                  <div
                    className={\`rounded-2xl px-4 py-3 max-w-[75%] text-sm leading-relaxed whitespace-pre-wrap \${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-card border border-border rounded-tl-sm"
                    }\`}
                  >
                    {msg.content}
                  </div>`;
  const renderReplacement = `                  <div
                    className={\`rounded-2xl px-4 py-3 max-w-[75%] text-sm leading-relaxed whitespace-pre-wrap flex flex-col gap-2 \${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-card border border-border rounded-tl-sm"
                    }\`}
                  >
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-1">
                        {msg.attachments.map((url, i) => (
                          <div key={i} className="max-w-[200px] max-h-[200px] overflow-hidden rounded-lg bg-black/10 border border-black/10">
                            {url.match(/\\.(mp4|webm|ogg)$/i) ? (
                              <video src={url} controls className="w-full h-full object-contain" />
                            ) : (
                              <img src={url} alt="attachment" className="w-full h-full object-cover" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {msg.content}
                  </div>`;
  content = content.replace(renderTarget, renderReplacement);

  fs.writeFileSync(filePath, content);
  console.log("Patched " + fileName);
}

patchFile("learn.tsx", false);
patchFile("career.tsx", true);
