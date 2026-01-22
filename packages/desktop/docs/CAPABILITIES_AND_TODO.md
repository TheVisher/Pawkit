# Pawkit Desktop App Capabilities & Todo

This document outlines the expanded capabilities unlocked by the Tauri desktop application and serves as a roadmap for future features.

##  File & Storage
*Since we have access to the local file system, we can manage heavy assets directly.*

- [ ] **File Uploads**: Support for PDFs, images, videos, and audio files. Store locally and sync metadata/access tokens to server.
- [ ] **Watch Folders**: Designate specific folders for auto-import. Dropping a file there adds it to Pawkit.
- [ ] **Local Backups**: One-click export of the entire library (cards + files) to a local folder.
- [ ] **Importers**: Native readers for Notion exports, Pocket exports, and browser bookmark files.

##  Capture & Input
*Rich input methods beyond just text and URLs.*

- [ ] **Screenshot Capture**: Global hotkey to capture a screen region directly into a new card.
- [ ] **Screen Recording**: Capture short video clips for bug reports, demos, or memories.
- [ ] **Audio Recording**: Native voice memos and quick audio notes.
- [ ] **Webcam Capture**: Quick photo notes or video diary entries.

##  Processing & AI
*Leverage the user's local hardware for privacy-preserving intelligence.*

- [ ] **Local OCR**: Extract text from saved images and PDFs for searchability.
- [ ] **Local Transcription**: Use local Whisper models to transcribe audio/video notes.
- [ ] **Local AI Categorization**: Run small, efficient models (SLMs) for auto-tagging content.
- [ ] **PDF Text Extraction**: Enable full-text search within stored documents.

##  OS Integration
*Deep integration into the operating system workflow.*

- [ ] **System Tray**: Quick access menu, sync status indicator, and "mini-capture" window.
- [ ] **Protocol Handler**: Register `pawkit://add?url=...` to allow saving from anywhere (scripts, other apps).
- [ ] **Context Menu**: Add "Save to Pawkit" to Finder/Explorer right-click menus.
- [ ] **File Associations**: Make Pawkit the default handler for `.webloc` or custom file types.
- [ ] **System Search**: Integrate with Spotlight (macOS) / Alfred / Raycast.
- [ ] **Native Notifications**: Richer, more reliable notifications than web push.
- [ ] **Auto-Start**: Option to launch silently on login for background syncing.

##  Advanced
*Power user features.*

- [ ] **Browser Integration**: Companion extension that communicates directly with the desktop app.
- [ ] **Clipboard Monitoring**: (Opt-in) Auto-detect copied URLs and offer to save them.
- [ ] **Local Full-Text Search**: Implement SQLite FTS (or similar) for instant, offline-capable search across all content.
