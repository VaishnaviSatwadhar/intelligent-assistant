import { z } from "zod";
export * from "./generated/api";
export * from "./generated/types";

export const GenerateMediaBody = z.object({
  prompt: z.string(),
  type: z.enum(["image", "video", "audio"]),
  videoMode: z.enum(["text2video", "talking_photo"]).optional(),
  baseImage: z.string().optional(),
  audioData: z.string().optional(),
  voiceId: z.string().optional()
});
