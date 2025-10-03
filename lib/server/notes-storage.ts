import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";

const DEFAULT_NOTES_PATH = path.join(process.cwd(), "data", "notes");

export async function getNotesDirectory(): Promise<string> {
  // TODO: Get from settings/config in the future
  // For now, use default path
  const notesDir = process.env.NOTES_STORAGE_PATH || DEFAULT_NOTES_PATH;

  // Ensure directory exists
  if (!existsSync(notesDir)) {
    await fs.mkdir(notesDir, { recursive: true });
  }

  return notesDir;
}

export async function saveNoteToFile(noteId: string, content: string, format: "md" | "txt"): Promise<string> {
  const notesDir = await getNotesDirectory();
  const fileName = `${noteId}.${format}`;
  const filePath = path.join(notesDir, fileName);

  await fs.writeFile(filePath, content, "utf-8");

  return filePath;
}

export async function readNoteFromFile(noteId: string, format: "md" | "txt"): Promise<string | null> {
  const notesDir = await getNotesDirectory();
  const fileName = `${noteId}.${format}`;
  const filePath = path.join(notesDir, fileName);

  try {
    const content = await fs.readFile(filePath, "utf-8");
    return content;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function deleteNoteFile(noteId: string, format: "md" | "txt"): Promise<void> {
  const notesDir = await getNotesDirectory();
  const fileName = `${noteId}.${format}`;
  const filePath = path.join(notesDir, fileName);

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

export async function extractFirstH1OrFilename(content: string, noteId: string): Promise<string> {
  // Try to extract first H1 from markdown
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) {
    return h1Match[1].trim();
  }

  // Fallback to "Untitled Note"
  return "Untitled Note";
}

export async function extractExcerpt(content: string, maxLength: number = 150): Promise<string> {
  // Remove markdown headers
  let text = content.replace(/^#+\s+.+$/gm, "");

  // Remove markdown formatting
  text = text.replace(/[*_~`]/g, "");

  // Remove extra whitespace
  text = text.replace(/\s+/g, " ").trim();

  // Get first paragraph or maxLength characters
  const lines = text.split("\n");
  const firstParagraph = lines.find(line => line.trim().length > 0) || "";

  if (firstParagraph.length <= maxLength) {
    return firstParagraph;
  }

  return firstParagraph.substring(0, maxLength) + "...";
}

export async function extractFirstImage(content: string): Promise<string | null> {
  // Extract first markdown image
  const imageMatch = content.match(/!\[.*?\]\((.*?)\)/);
  if (imageMatch) {
    return imageMatch[1];
  }

  return null;
}
