"use client";

import { useMemo, Suspense, useEffect } from "react";
import { NotesView } from "@/components/notes/notes-view";
import { usePanelStore } from "@/lib/hooks/use-panel-store";
import { CardModel, CollectionNode } from "@/lib/types";

// Fake notes with rich markdown content
const FAKE_NOTES: CardModel[] = [
  {
    id: "note-1",
    type: "md-note",
    url: "",
    title: "Project Ideas - Q1 2025",
    notes: null,
    content: `# Project Ideas - Q1 2025

## High Priority

### 1. Personal Knowledge Base
- Build using Next.js + MDX
- Features: bidirectional links, graph view, tags
- Inspiration: Obsidian, Notion
- Timeline: 4-6 weeks

### 2. AI Writing Assistant
- Use OpenAI API
- Features: outline generation, tone adjustment, grammar checking
- Monetization: freemium model
- Timeline: 2-3 weeks

## Medium Priority

### 3. Fitness Tracker Dashboard
- Track workouts, nutrition, sleep
- Data visualization with charts
- Export to CSV
- Timeline: 3-4 weeks

### 4. Recipe Management App
- Save recipes with photos
- Meal planning calendar
- Shopping list generator
- Timeline: 3 weeks

## Backlog

- Habit tracking with streaks
- Reading list with notes and highlights
- Budget tracker with categories
- Language learning flashcards

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com)
- [Vercel AI SDK](https://sdk.vercel.ai)
`,
    status: "READY",
    tags: ["projects", "planning", "ideas"],
    collections: [],
    domain: null,
    image: null,
    description: null,
    metadata: {},
    articleContent: null,
    pinned: true,
    deleted: false,
    deletedAt: null,
    inDen: false,
    encryptedContent: null,
    scheduledDate: null,
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "note-2",
    type: "md-note",
    url: "",
    title: "Meeting Notes - Product Roadmap Discussion",
    notes: null,
    content: `# Product Roadmap Discussion
*Date: ${new Date().toLocaleDateString()}*

## Attendees
- Sarah (Product)
- Mike (Engineering)
- Alex (Design)

## Key Decisions

### Q1 Priorities
1. ✅ Ship mobile responsive design
2. ⏳ Implement dark mode
3. 📋 Add collaboration features

### Feature Requests from Users
- [ ] Bulk import/export
- [ ] Custom themes
- [ ] API access
- [ ] Browser extension

### Technical Debt
- Upgrade to React 19
- Migrate from REST to GraphQL
- Implement proper error tracking
- Add end-to-end tests

## Action Items
- [ ] Sarah: Create user stories for collab features
- [ ] Mike: Estimate technical debt items
- [ ] Alex: Mockups for dark mode by Friday

## Notes

The team agreed that dark mode is our highest priority for Q1. Users have been requesting it for months, and it will significantly improve the user experience.

For collaboration features, we'll start with basic sharing and commenting, then iterate based on feedback.
`,
    status: "READY",
    tags: ["meetings", "work", "roadmap"],
    collections: [],
    domain: null,
    image: null,
    description: null,
    metadata: {},
    articleContent: null,
    pinned: false,
    deleted: false,
    deletedAt: null,
    inDen: false,
    encryptedContent: null,
    scheduledDate: null,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "note-3",
    type: "md-note",
    url: "",
    title: "Book Notes: Atomic Habits",
    notes: null,
    content: `# Atomic Habits by James Clear

## Core Concepts

### The Four Laws of Behavior Change

1. **Make it Obvious** - Design your environment
2. **Make it Attractive** - Bundle it with something you enjoy
3. **Make it Easy** - Reduce friction
4. **Make it Satisfying** - Give yourself immediate rewards

### Key Insights

> "You do not rise to the level of your goals. You fall to the level of your systems."

- Focus on systems, not goals
- 1% improvement daily = 37x better in a year
- Environment matters more than motivation
- Identity-based habits stick better than outcome-based

### The Habit Loop

1. Cue → 2. Craving → 3. Response → 4. Reward

### Actionable Takeaways

- **Habit Stacking**: After [CURRENT HABIT], I will [NEW HABIT]
- **Implementation Intention**: I will [BEHAVIOR] at [TIME] in [LOCATION]
- **Environment Design**: Make good habits obvious, bad habits invisible

## My Applications

- Morning routine: Wake up → Make bed → Meditate → Coffee → Journal
- Exercise: Gym clothes laid out night before
- Reading: Book on nightstand, phone in other room
- Writing: Close all tabs except writing app at 9am

## Favorite Quotes

- "Every action is a vote for the type of person you wish to become"
- "The most effective way to change your habits is to focus not on what you want to achieve, but on who you wish to become"
- "Habits are the compound interest of self-improvement"

## Rating: ⭐⭐⭐⭐⭐

This book completely changed how I think about habits and behavior change. Highly recommend!
`,
    status: "READY",
    tags: ["books", "notes", "productivity", "habits"],
    collections: [],
    domain: null,
    image: null,
    description: null,
    metadata: {},
    articleContent: null,
    pinned: true,
    deleted: false,
    deletedAt: null,
    inDen: false,
    encryptedContent: null,
    scheduledDate: null,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "note-4",
    type: "md-note",
    url: "",
    title: "Learning Web Development - Study Plan",
    notes: null,
    content: `# Web Development Study Plan

## Month 1-2: Fundamentals

### HTML & CSS
- [x] HTML semantics and accessibility
- [x] CSS Grid and Flexbox
- [x] Responsive design principles
- [ ] CSS animations and transitions

### JavaScript Basics
- [x] Variables, functions, scope
- [x] Arrays and objects
- [x] DOM manipulation
- [ ] Async/await and Promises
- [ ] ES6+ features

## Month 3-4: React & Modern Frontend

### React Fundamentals
- [ ] Components and Props
- [ ] State and Lifecycle
- [ ] Hooks (useState, useEffect, useContext)
- [ ] React Router
- [ ] Form handling

### Tools & Ecosystem
- [ ] npm and package management
- [ ] Git and GitHub
- [ ] Vite or Create React App
- [ ] ESLint and Prettier

## Month 5-6: Full Stack

### Backend Basics
- [ ] Node.js fundamentals
- [ ] Express.js
- [ ] RESTful APIs
- [ ] Database (PostgreSQL or MongoDB)

### Deployment
- [ ] Vercel or Netlify
- [ ] Environment variables
- [ ] CI/CD basics

## Resources

**Courses:**
- freeCodeCamp - Free, comprehensive
- The Odin Project - Project-based learning
- Frontend Masters - Advanced topics

**Practice:**
- CodePen - Quick experiments
- Frontend Mentor - Real design challenges
- Build your own projects!

## Current Progress

📚 Currently on: JavaScript Promises
⏰ Study time: 2 hours/day
🎯 Goal: Build a full-stack app by month 6
`,
    status: "READY",
    tags: ["learning", "web-dev", "study-plan"],
    collections: [],
    domain: null,
    image: null,
    description: null,
    metadata: {},
    articleContent: null,
    pinned: false,
    deleted: false,
    deletedAt: null,
    inDen: false,
    encryptedContent: null,
    scheduledDate: null,
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "note-5",
    type: "md-note",
    url: "",
    title: "Recipe: Grandma's Chocolate Chip Cookies",
    notes: null,
    content: `# Grandma's Chocolate Chip Cookies

## Ingredients

### Dry Ingredients
- 2¼ cups all-purpose flour
- 1 tsp baking soda
- 1 tsp salt

### Wet Ingredients
- 1 cup (2 sticks) butter, softened
- ¾ cup granulated sugar
- ¾ cup packed brown sugar
- 2 large eggs
- 2 tsp vanilla extract

### Mix-ins
- 2 cups chocolate chips (mix of dark and semi-sweet)
- Optional: 1 cup chopped walnuts

## Instructions

1. **Preheat** oven to 375°F (190°C)

2. **Mix dry ingredients** in medium bowl: flour, baking soda, salt

3. **Cream butter and sugars** in large bowl until light and fluffy (3-4 minutes)

4. **Add eggs one at a time**, beating well after each. Add vanilla.

5. **Gradually blend in flour mixture** until just combined

6. **Fold in chocolate chips** (and walnuts if using)

7. **Drop rounded tablespoons** onto ungreased cookie sheets

8. **Bake 9-11 minutes** or until golden brown. Centers will look slightly underdone.

9. **Cool on baking sheet** for 2 minutes, then transfer to wire rack

## Grandma's Secret Tips

- Use **room temperature butter** for best texture
- Don't overbake! Cookies continue cooking after removing from oven
- For chewier cookies, use more brown sugar
- For crispier cookies, use more granulated sugar
- Chill dough for 30 minutes for thicker cookies

## Notes

These are the cookies Grandma made every Christmas. The secret is the mix of dark and semi-sweet chocolate chips!

Batch size: ~48 cookies
Prep time: 15 min
Bake time: 11 min per batch
Perfect with: Cold milk 🥛
`,
    status: "READY",
    tags: ["recipes", "baking", "desserts", "family"],
    collections: [],
    domain: null,
    image: null,
    description: null,
    metadata: {},
    articleContent: null,
    pinned: false,
    deleted: false,
    deletedAt: null,
    inDen: false,
    encryptedContent: null,
    scheduledDate: null,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "note-6",
    type: "md-note",
    url: "",
    title: "Japan Trip Planning - Spring 2025",
    notes: null,
    content: `# Japan Trip - Spring 2025

## Itinerary Overview

**Duration:** 14 days
**Season:** Cherry blossom season (late March - early April)
**Budget:** ~$3,500 per person

## Cities

### Tokyo (5 days)
- Shibuya Crossing
- Senso-ji Temple
- TeamLab Borderless
- Tsukiji Outer Market
- Akihabara
- Harajuku
- Day trip to Mt. Fuji

### Kyoto (4 days)
- Fushimi Inari Shrine
- Arashiyama Bamboo Grove
- Kinkaku-ji (Golden Pavilion)
- Nishiki Market
- Gion district
- Day trip to Nara

### Osaka (3 days)
- Osaka Castle
- Dotonbori
- Universal Studios Japan
- Day trip to Hiroshima

### Hakone (2 days)
- Hot springs (onsen)
- Views of Mt. Fuji
- Open-air museum

## Bookings

- [ ] Flights (book by December)
- [ ] JR Pass (7-day)
- [ ] Hotels
  - [ ] Tokyo: Shibuya area
  - [ ] Kyoto: Near station
  - [ ] Osaka: Namba area
  - [ ] Hakone: Ryokan with onsen
- [ ] TeamLab tickets
- [ ] Universal Studios tickets

## Essentials

### Before Trip
- Get JR Pass
- Download offline maps
- Rent pocket WiFi
- Get IC card (Suica/Pasmo)

### Pack
- Comfortable walking shoes
- Light jacket
- Backpack for day trips
- Portable charger
- Cash (many places cash-only)

## Food to Try

- Ramen (different styles in each city)
- Sushi (Tsukiji market)
- Okonomiyaki (Osaka)
- Kaiseki (Kyoto)
- Street food in Dotonbori
- Matcha everything

## Budget Breakdown

- Flights: $800
- JR Pass: $280
- Hotels: $1,200
- Food: $700
- Activities: $400
- Shopping: $120

**Total:** ~$3,500

## Tips from Reddit

- Get to temples early to avoid crowds
- Don't walk and eat
- Learn basic phrases
- Train stations can be confusing - allow extra time
- Cherry blossom timing is unpredictable!
`,
    status: "READY",
    tags: ["travel", "japan", "planning", "vacation"],
    collections: [],
    domain: null,
    image: null,
    description: null,
    metadata: {},
    articleContent: null,
    pinned: false,
    deleted: false,
    deletedAt: null,
    inDen: false,
    encryptedContent: null,
    scheduledDate: null,
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const FAKE_COLLECTIONS: CollectionNode[] = [];

function NotesPageContent() {
  const setContentType = usePanelStore((state) => state.setContentType);

  // Memoize the fake notes
  const notes = useMemo(() => FAKE_NOTES, []);
  const collections = useMemo(() => FAKE_COLLECTIONS, []);

  // Set the right panel content to show notes controls
  useEffect(() => {
    setContentType("notes-controls");
  }, [setContentType]);

  return (
    <NotesView
      initialCards={notes}
      collectionsTree={collections}
      query={undefined}
    />
  );
}

export default function DemoNotesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NotesPageContent />
    </Suspense>
  );
}
