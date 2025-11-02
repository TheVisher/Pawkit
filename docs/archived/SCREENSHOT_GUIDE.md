# Screenshot Guide for Landing Page

This guide will help you take professional screenshots of Pawkit's demo mode for the landing page.

## Prerequisites

1. Clear your demo data (if needed): Visit `/demo` and reset
2. The demo now has **50+ cards** with diverse content
3. **Nested Pawkits** to showcase organization
4. **Den items** to showcase encryption features

## Screenshots Needed

### 1. Library with Pawkits (library-view.png)
**What to capture**: Main library view showing the card grid with nested collections in the sidebar

**Steps**:
1. Go to `/demo`
2. Make sure you're on the Library view
3. Ensure left sidebar shows:
   - Nested Pawkits (Development → Frontend, Backend, Dev Tools)
   - Multiple top-level collections
4. Card grid should show:
   - Mix of cards with images
   - Different domains (YouTube, GitHub, etc.)
   - Pinned cards at the top
5. **Window size**: 1920x1080 for best quality
6. **Crop**: Include the full 3-panel layout (sidebar, content, right panel if visible)

**Screenshot**:
- Use browser's built-in screenshot tool (Cmd+Shift+4 on Mac, Windows+Shift+S on Windows)
- Or use browser DevTools → Cmd+Shift+P → "Capture screenshot"
- Save as: `/public/screenshots/library-view.png`

### 2. The Den (den-view.png)
**What to capture**: The encrypted private section

**Steps**:
1. Navigate to `/demo/den`
2. Ensure The Den is "unlocked" (you may need to click unlock if there's a modal)
3. Should show:
   - Den icon/header
   - 3 encrypted items (Financial Goals, Medical Records, Journal Entry)
   - Lock icons or encryption indicators
4. **Window size**: 1920x1080
5. **Crop**: Full view of Den interface with sidebar

**Screenshot**:
- Save as: `/public/screenshots/den-view.png`

### 3. Reader Mode (reader-view.png)
**What to capture**: Clean article reading experience

**Steps**:
1. From `/demo`, click on any article card that has `articleContent` (e.g., "The AI Revolution: What Comes Next")
2. The reader view should open
3. Make sure it shows:
   - Clean typography
   - Article title
   - Formatted content
   - Reader mode toggle/button visible
4. **Window size**: 1920x1080
5. **Crop**: Focus on the reader panel (can include sidebar for context)

**Screenshot**:
- Save as: `/public/screenshots/reader-view.png`

## Tips for Best Screenshots

### Appearance
- Use **dark mode** (matches landing page theme)
- Hide browser chrome if possible (press F11 for fullscreen, or use browser screenshot tools)
- Ensure consistent zoom level (100%)
- Clear any personal bookmarks or extensions from view

### Content
- Make sure cards have loaded images (wait 2-3 seconds)
- Show a good variety: pinned items, collections, different card types
- Avoid empty states - demo data should fill the view nicely

### Technical
- **Resolution**: At least 1920x1080
- **Format**: PNG (better quality than JPG)
- **File size**: Optimize images (use [TinyPNG](https://tinypng.com/) if needed)
- **Aspect ratio**: 16:9 for all screenshots

## Quick Screenshot Workflow

### Option 1: macOS Built-in
1. Press `Cmd + Shift + 4`
2. Press `Space` to capture window
3. Click on browser window
4. Find screenshot on Desktop
5. Move to `/public/screenshots/`

### Option 2: Browser DevTools (Best Quality)
1. Open DevTools (F12)
2. Press `Cmd + Shift + P` (Ctrl + Shift + P on Windows)
3. Type "screenshot"
4. Choose "Capture full size screenshot" or "Capture screenshot"
5. Save directly to `/public/screenshots/`

### Option 3: Browser Extension
- [Awesome Screenshot](https://www.awesomescreenshot.com/) (Chrome/Firefox)
- [Nimbus Screenshot](https://nimbusweb.me/screenshot.php) (Chrome/Firefox)

## After Taking Screenshots

1. Save all 3 screenshots to `/public/screenshots/`:
   - `library-view.png`
   - `den-view.png`
   - `reader-view.png`

2. Update `/app/page.tsx` with image paths:
```tsx
<ProofCard
  title="Library with Pawkits"
  description="Nested collections keep everything organized"
  imagePath="/screenshots/library-view.png"
/>
<ProofCard
  title="The Den"
  description="Your encrypted private space"
  imagePath="/screenshots/den-view.png"
/>
<ProofCard
  title="Reader Mode"
  description="Clean, distraction-free article view"
  imagePath="/screenshots/reader-view.png"
/>
```

3. Commit and push to see them on the landing page!

## Demo Data Overview

Your enhanced demo now includes:

- ✅ **50 cards** across different categories
- ✅ **10 collections** (5 top-level + 5 nested)
- ✅ **Nested Pawkits** under Development & Design
- ✅ **3 Den items** (encrypted private content)
- ✅ **Mix of content**: URLs, notes, articles with reader mode
- ✅ **Diverse domains**: YouTube, GitHub, Medium, NYT, etc.
- ✅ **Real-looking metadata**: Images, descriptions, tags, notes
- ✅ **Pinned items** to showcase that feature
- ✅ **Scheduled cards** to show calendar integration

## Need Help?

If you want me to:
1. Take the screenshots myself (using automation)
2. Adjust the demo data
3. Add/remove specific content

Just let me know! I can use Playwright to take perfect screenshots programmatically.
