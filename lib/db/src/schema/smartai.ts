import { pgTable, serial, text, timestamp, boolean, integer, varchar, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const userProfilesTable = pgTable("user_profiles", {
  userId: varchar("user_id").primaryKey().references(() => usersTable.id, { onDelete: "cascade" }),
  displayName: text("display_name"),
  preferredLanguage: varchar("preferred_language", { length: 5 }).notNull().default("en"),
  theme: varchar("theme", { length: 10 }).notNull().default("system"),
  preferredModel: varchar("preferred_model", { length: 100 }).notNull().default("llama3.2"),
  voiceEnabled: boolean("voice_enabled").notNull().default(false),
  bio: text("bio"),
  aiProvider: varchar("ai_provider", { length: 20 }).notNull().default("ollama"),
  openaiApiKey: text("openai_api_key"),
  anthropicApiKey: text("anthropic_api_key"),
  geminiApiKey: text("gemini_api_key"),
  huggingFaceApiKey: text("hugging_face_api_key"),
  elevenLabsApiKey: text("eleven_labs_api_key"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const conversationsTable = pgTable("conversations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  mode: varchar("mode", { length: 20 }).notNull().default("general"),
  bookmarked: boolean("bookmarked").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversationsTable.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(),
  content: text("content").notNull(),
  metadata: text("metadata"),
  attachments: jsonb("attachments"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const documentsTable = pgTable("documents", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  fileType: varchar("file_type", { length: 20 }).notNull(),
  fileSize: integer("file_size").notNull(),
  content: text("content").notNull().default(""),
  analyzed: boolean("analyzed").notNull().default(false),
  summary: text("summary"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bookmarksTable = pgTable("bookmarks", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: varchar("category", { length: 50 }).notNull().default("general"),
  sourceConversationId: integer("source_conversation_id").references(() => conversationsTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserProfile = typeof userProfilesTable.$inferSelect;
export type InsertUserProfile = typeof userProfilesTable.$inferInsert;
export type Conversation = typeof conversationsTable.$inferSelect;
export type InsertConversation = typeof conversationsTable.$inferInsert;
export type Message = typeof messagesTable.$inferSelect;
export type InsertMessage = typeof messagesTable.$inferInsert;
export type Document = typeof documentsTable.$inferSelect;
export type InsertDocument = typeof documentsTable.$inferInsert;
export type Bookmark = typeof bookmarksTable.$inferSelect;
export type InsertBookmark = typeof bookmarksTable.$inferInsert;
