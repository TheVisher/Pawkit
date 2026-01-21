# Pawkit Marketing & Launch Strategy

> **90-Day plan for launch and growth**
> **See also**: [ROADMAP.md](./ROADMAP.md) for product priorities

---

## Table of Contents

1. [Launch Timeline](#launch-timeline)
2. [Marketing Channels](#marketing-channels)
3. [Content Strategy](#content-strategy)
4. [Asset Creation](#asset-creation)
5. [Discord Community](#discord-community)
6. [Goals & Metrics](#goals--metrics)

---

## Launch Timeline

### Week 1-2: Foundation

- [ ] Set up social accounts (Twitter, Discord, Reddit)
- [ ] Create demo video (30 seconds)
- [ ] Take polished screenshots (CleanShot X)
- [ ] Write "Why I Built Pawkit" blog post
- [ ] Prepare Product Hunt assets

### Week 3-4: Launch

- [ ] Hacker News "Show HN" post
- [ ] Product Hunt launch
- [ ] Reddit posts (r/selfhosted, r/privacy, r/SideProject)
- [ ] Dev.to article
- [ ] Personal network outreach

### Week 5-8: Momentum

- [ ] 2 blog posts (technical deep-dives)
- [ ] Submit to directory sites (AlternativeTo, etc.)
- [ ] Consistent social posting (3x/week)
- [ ] Engage with comments and feedback
- [ ] First user testimonials

### Week 9-12: Growth

- [ ] Micro-influencer outreach (productivity YouTubers)
- [ ] iOS App launch push (TestFlight → App Store)
- [ ] Guest blog posts / podcasts
- [ ] Case studies from early users
- [ ] Refine based on analytics

---

## Marketing Channels

### Hacker News

**Why**: Perfect demographic - developers, privacy-conscious, knowledge workers.

**Show HN Post Template**:
```
Show HN: Pawkit - Local-first bookmarking with BYOS (Bring Your Own Storage)

Hey HN, I've been building Pawkit for the past year. It's a bookmarking and
note-taking app where your data stays on your device (IndexedDB) and syncs
to your own cloud storage (Filen, Google Drive, Dropbox).

Key features:
- Local-first: Works offline, instant UI
- BYOS: You own your data, we never see it
- Reader mode: Distraction-free article reading
- Calendar: Schedule content for later
- MCP integration: Bring your own Claude

Stack: Next.js, Supabase (auth only), Dexie.js, Tiptap

Live: https://pawkit.app
GitHub: [if open source]

Would love feedback from the community!
```

**Best posting times**: Tuesday-Thursday, 9am-11am EST

### Product Hunt

**Checklist**:
- [ ] Hunter lined up (or self-launch)
- [ ] Maker comment prepared
- [ ] 5+ screenshots in gallery
- [ ] 30-second demo GIF
- [ ] Tagline: "Your internet in your Pawkit"
- [ ] First comment ready to post

### Reddit

**Target Subreddits**:
| Subreddit | Angle |
|-----------|-------|
| r/selfhosted | BYOS, privacy, local-first |
| r/privacy | No tracking, user-owned data |
| r/SideProject | Indie dev story |
| r/webdev | Technical deep-dive |
| r/productivity | Knowledge management |
| r/ObsidianMD | Wiki-links, markdown, PKM |

**Rules**:
- Don't spam - contribute first, then share
- Be transparent about being the creator
- Respond to every comment

### Twitter/X

**Content Mix**:
- 40% Product updates / features
- 30% Behind-the-scenes / building in public
- 20% Industry insights / opinions
- 10% Personal / engagement

**Hashtags**: #buildinpublic #indiedev #localfirst #productivity

### Dev.to / Hashnode

**Article Ideas**:
1. "Building a Local-First App with Dexie.js and Supabase"
2. "Why I Chose BYOS (Bring Your Own Storage)"
3. "Sync Conflicts in Local-First Apps: Lessons Learned"
4. "MCP Integration: Letting Users Bring Their Own AI"

---

## Content Strategy

### Blog Posts

**Priority Articles**:

1. **"Why I Built Pawkit"** (Launch week)
   - Personal story
   - Problem being solved
   - Vision for the product

2. **"Building Local-First with Dexie.js"** (Week 2)
   - Technical deep-dive
   - Code examples
   - Lessons learned

3. **"The Case for BYOS"** (Week 4)
   - Privacy angle
   - Cost savings
   - User ownership

4. **"Sync is Hard: Conflict Resolution"** (Week 6)
   - Technical challenges
   - Solutions implemented
   - Before/after examples

### Video Content

**Demo Video (30 seconds)**:
- Hook: "Tired of losing bookmarks?"
- Show: Quick save, organize, find
- CTA: "Try Pawkit free"

**Feature GIFs (< 5 seconds each)**:
- Save a bookmark
- Reader mode
- Calendar scheduling
- Search with operators

---

## Asset Creation

### Screenshots

**Tool**: CleanShot X ($29/year) or macOS built-in

**Shots Needed**:
1. Library view (masonry grid)
2. Reader mode (clean article)
3. Calendar (month view with events)
4. Omnibar (quick add)
5. Mobile app (iPhone mockup)

**Tips**:
- Use sample data that looks real
- Consistent window size (1280x800)
- Hide personal/sensitive info

### Demo Video

**Tool**: QuickTime (free) or Loom

**Script** (30 seconds):
```
[0-5s]  "Save anything from the web..."
[5-15s] Show: Extension click, save animation
[15-20s] "Organize with Pawkits and tags..."
[20-25s] Show: Drag to collection, add tag
[25-30s] "Your data, your storage. Try Pawkit."
```

**Polish** (optional):
- DaVinci Resolve (free) for zoom effects
- Gifski for GIF conversion

### Feature GIFs

**Requirements**:
- Under 5MB (Twitter limit)
- 5-10 seconds max
- Clear focus on one action

**Tools**:
- Gifski (macOS) - Best quality
- LICEcap - Cross-platform
- CloudApp - Easy sharing

### Product Hunt Gallery

**5 Images**:
1. Hero shot - Main library view
2. Feature 1 - Reader mode
3. Feature 2 - Calendar
4. Feature 3 - Mobile app
5. Feature 4 - Extension in action

---

## Discord Community

### Server Structure

```
INFORMATION
├── #welcome - Rules, links, getting started
├── #announcements - Updates, releases
└── #faq - Common questions

COMMUNITY
├── #general - Main chat
├── #feature-requests - User ideas
├── #help - Support questions
└── #showcase - User setups, workflows

DEVELOPMENT
├── #changelog - Release notes
├── #beta-testing - Early access
└── #bug-reports - Issue tracking
```

### Roles

| Role | Access | How to Get |
|------|--------|------------|
| @Member | Community channels | Join server |
| @Beta Tester | Beta channel, early features | Apply in #beta-testing |
| @Contributor | Dev channels | Submit PR or significant feedback |
| @Team | All channels | Pawkit team |

### Engagement Strategy

**Weekly Events**:
- **Feature Friday**: Preview upcoming features
- **Feedback Session**: Monthly AMA
- **Showcase**: Users share their workflows

**Rewards**:
- Beta Tester role → Early mobile access
- Contributor role → Name in credits
- Active members → Priority support

### Growth Tactics

- [ ] Link in app sidebar footer
- [ ] Link in Twitter bio
- [ ] Link in GitHub README
- [ ] Invite on signup confirmation email
- [ ] Mention in blog posts

**Goal**: 50-100 active members in 3 months

---

## Goals & Metrics

### 90-Day Goals

| Metric | Target |
|--------|--------|
| Website visitors | 2,000-5,000 (launch spike) |
| Signups | 500-1,000 |
| Active users (weekly) | 100-200 |
| Discord members | 50-100 |
| Product Hunt upvotes | Top 10 of the day |

### Tracking

**Analytics** (choose one):
- Plausible (~$9/mo) - Simple, privacy-friendly
- PostHog (free tier) - Full product analytics

**Key Events to Track**:
- Signup completed
- First card saved
- Extension installed
- Mobile app opened
- Feature used (calendar, reader, etc.)

---

## Deferred / Not Planned

| Item | Reason |
|------|--------|
| Paid ads | Organic first, ads later if needed |
| Influencer sponsorships | Too expensive for launch |
| Podcast tour | Time-intensive, save for growth phase |
| PR agency | DIY is sufficient for indie launch |

---

*Last Updated: December 29, 2025*
