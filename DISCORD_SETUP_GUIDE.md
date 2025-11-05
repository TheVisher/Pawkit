# Discord Server Setup Guide for Pawkit

## Table of Contents
1. [Quick Start](#quick-start)
2. [Server Configuration](#server-configuration)
3. [Channel Structure](#channel-structure)
4. [Roles & Permissions](#roles-permissions)
5. [Bot Setup](#bot-setup)
6. [Moderation](#moderation)
7. [Community Templates](#community-templates)
8. [Growth & Engagement](#growth-engagement)

---

## Quick Start

### Step 1: Create Your Server

1. Open Discord (desktop app or web)
2. Click the **+** button in the server list (left sidebar)
3. Choose **"Create My Own"**
4. Select **"For a club or community"**
5. Name it: **Pawkit**
6. Upload server icon (your Pawkit logo from `public/images/logo.png`)
7. Click **"Create"**

---

## Server Configuration

### Step 2: Server Settings

**Go to: Server Settings → Overview**

**Server Name:** Pawkit
**Server Icon:** Upload logo
**Server Banner:** (Optional, Boost Level 2 required)
**Description:**
```
Official Discord for Pawkit — the local-first, privacy-focused bookmark manager.

Get help, share ideas, request features, and connect with other users.

🌐 Website: app.getpawkit.com
💻 GitHub: github.com/TheVisher/Pawkit
📖 Docs: [your docs link]
```

**Discovery:**
- [ ] Enable discovery (once you have 500+ members)
- [ ] Add tags: productivity, privacy, open source, bookmarks, tools

---

### Step 3: Verification Level

**Go to: Server Settings → Safety Setup**

**Verification Level:** Medium
- Requires verified email
- Must be registered for 5+ minutes
- Prevents spam while staying accessible

**Explicit Content Filter:** Scan media from all members

**DM Settings:**
- [x] Enable DMs from server members (for support)

---

### Step 4: Server Features

**Go to: Server Settings → Enable Community**

**Enable Community:** Yes

This unlocks:
- Announcement channels
- Rules screening
- Welcome screen
- Discovery
- Insights

**Configure:**
- [x] Rules channel (create #rules)
- [x] Community updates channel (create #announcements)

---

## Channel Structure

### Step 5: Delete Default Channels

Delete these default channels:
- ❌ #general (we'll create better ones)
- ❌ #off-topic

### Step 6: Create Category Structure

**Create these categories and channels:**

---

### 📢 WELCOME & INFO (Category)

**Channel 1: #welcome** (Read-only)
- **Type:** Text channel
- **Topic:** Welcome to Pawkit Discord!
- **Permissions:**
  - @everyone: Read Messages (✅), Send Messages (❌)
  - @Admin: All permissions

**Welcome Message:**
```
👋 **Welcome to Pawkit Discord!**

Pawkit is a local-first, privacy-focused bookmark manager with knowledge management features.

**Quick Links:**
🌐 Website: https://app.getpawkit.com
💻 GitHub: https://github.com/TheVisher/Pawkit
📚 Docs: [link]
🎥 Demo: [link]

**Getting Started:**
1. Read the #rules
2. Introduce yourself in #introductions
3. Get help in #support
4. Share ideas in #feature-requests

**Need help?** Ask in #support
**Have feedback?** Share in #feedback
**Want to chat?** Join #general

Let's build something great together! 🚀
```

---

**Channel 2: #rules** (Read-only)
- **Type:** Text channel
- **Permissions:**
  - @everyone: Read Messages (✅), Send Messages (❌)

**Rules Content:**
```
📜 **Server Rules**

**1. Be Respectful**
Treat everyone with kindness. No harassment, hate speech, or personal attacks.

**2. Stay On Topic**
Keep discussions relevant to Pawkit, bookmarking, PKM, privacy, or productivity.

**3. No Spam**
Don't spam messages, mentions, or channels. No advertising unrelated products.

**4. Ask in the Right Channel**
- Questions → #support
- Ideas → #feature-requests
- Bugs → #bug-reports
- Chat → #general

**5. Give Context**
When asking for help, provide details: what you tried, what went wrong, screenshots, etc.

**6. No Piracy or Illegal Content**
Don't share or request pirated software, hacks, or illegal content.

**7. Respect Privacy**
Don't share others' personal information without consent.

**8. Listen to Moderators**
Follow moderator instructions. Decisions are final.

**Consequences:**
- 1st offense: Warning
- 2nd offense: Temporary mute
- 3rd offense: Kick or ban

Questions? DM a moderator. ✅
```

---

**Channel 3: #announcements** (Read-only)
- **Type:** Announcement channel
- **Topic:** Official Pawkit updates, releases, and news
- **Permissions:**
  - @everyone: Read Messages (✅), Send Messages (❌)
  - @Admin: All permissions
- **Enable:** "Publish to other servers" (announcement feature)

---

**Channel 4: #introductions**
- **Type:** Text channel
- **Topic:** Introduce yourself! Tell us about your use case for Pawkit.
- **Slow Mode:** 30 seconds (prevents spam)

**Pinned Message:**
```
👋 **Introduce Yourself!**

Tell us:
- Your name or username
- How you found Pawkit
- What you'll use it for (research, content curation, etc.)
- Your favorite productivity tool

Example:
> Hey! I'm Alex. Found Pawkit on Product Hunt. I'll use it for research bookmarks and connecting ideas. Big Obsidian fan!

Welcome! 🎉
```

---

### 💬 COMMUNITY (Category)

**Channel 5: #general**
- **Type:** Text channel
- **Topic:** General discussion about Pawkit, bookmarking, PKM, productivity

---

**Channel 6: #off-topic**
- **Type:** Text channel
- **Topic:** Anything goes (within rules). Memes, life, whatever!

---

**Channel 7: #showcase**
- **Type:** Text channel
- **Topic:** Share your Pawkit setup, collections, workflows, or cool finds!

**Pinned Message:**
```
🎨 **Showcase Your Setup!**

Share:
- Screenshots of your Pawkit
- Your organization system
- Cool workflows
- Knowledge graphs
- Anything you're proud of!

Inspire others! ✨
```

---

**Channel 8: #feedback**
- **Type:** Text channel
- **Topic:** General feedback, suggestions, and thoughts on Pawkit

---

### 🛠️ SUPPORT (Category)

**Channel 9: #support**
- **Type:** Text channel (consider Forum channel for better organization)
- **Topic:** Ask questions, get help with Pawkit
- **Enable:** Create thread for each question (if Forum channel)

**Pinned Message:**
```
❓ **Need Help?**

When asking for help, include:
1. What you're trying to do
2. What you expected to happen
3. What actually happened
4. Browser and OS (Chrome on Windows, Firefox on Mac, etc.)
5. Screenshots (if applicable)

**Before asking:**
Check #faq and the docs: [link]

We're here to help! 🙏
```

---

**Channel 10: #faq** (Read-only)
- **Type:** Text channel
- **Permissions:**
  - @everyone: Read Messages (✅), Send Messages (❌)
  - @Admin: All permissions

**FAQ Content:**
```
❓ **Frequently Asked Questions**

**Q: Is Pawkit free?**
A: Yes! Completely free and open source (MIT license).

**Q: Where is my data stored?**
A: On YOUR device, in browser storage (IndexedDB). Optionally synced (encrypted) to our servers if you enable sync.

**Q: Does Pawkit work offline?**
A: Yes! 100% offline functionality. Sync is optional.

**Q: Which browsers are supported?**
A: Chrome, Firefox, Edge, Safari (desktop). Browser extension coming soon!

**Q: Is there a mobile app?**
A: Not yet, but it's on the roadmap for 2025!

**Q: How do I import bookmarks from [other tool]?**
A: Coming soon! For now, you can manually add or use browser bookmark import.

**Q: Is my data private?**
A: Yes. Local-first means your data stays on your device. Private collections use end-to-end encryption. We can't access them.

**Q: Can I self-host Pawkit?**
A: Yes! Check GitHub for deployment instructions.

**More questions?** Ask in #support!
```

---

**Channel 11: #bug-reports**
- **Type:** Forum channel (requires Community enabled)
- **Topic:** Report bugs here. Please include reproduction steps!

**Pinned Message Template:**
```
🐛 **Report a Bug**

Please include:
1. **Description**: What's wrong?
2. **Steps to reproduce**:
   - Step 1
   - Step 2
   - Result
3. **Expected behavior**: What should happen?
4. **Actual behavior**: What actually happens?
5. **Environment**: Browser, OS, Pawkit version
6. **Screenshots**: If applicable

**Example:**
> Bug: Can't delete bookmark
> Steps: Click card → Click delete → Nothing happens
> Expected: Bookmark deleted
> Actual: Nothing
> Environment: Chrome 120, Windows 11
> Screenshot: [attached]

Thanks for helping make Pawkit better! 🙏
```

---

**Channel 12: #feature-requests**
- **Type:** Forum channel
- **Topic:** Suggest new features or improvements

**Pinned Message:**
```
💡 **Request a Feature**

When suggesting a feature:
1. **Feature name**: Brief name
2. **Problem**: What problem does this solve?
3. **Solution**: How would it work?
4. **Use case**: When would you use this?
5. **Priority**: How important is this to you?

**Example:**
> Feature: Import from Pocket
> Problem: I have 500 bookmarks in Pocket
> Solution: One-click import button
> Use case: Migrating from Pocket to Pawkit
> Priority: High

We read every suggestion! 🚀
```

---

### 🔧 DEVELOPMENT (Category)

**Channel 13: #changelog**
- **Type:** Text channel (read-only)
- **Topic:** Release notes and updates
- **Permissions:**
  - @everyone: Read (✅), Send (❌)
  - @Admin: All permissions

**Post format:**
```
📦 **v1.2.0 Released**

**New Features:**
✨ Knowledge graph now shows note connections
✨ Calendar view supports recurring bookmarks
✨ Dark mode performance improvements

**Bug Fixes:**
🐛 Fixed search bug with special characters
🐛 Fixed sync issue on slow connections

**Download:** https://app.getpawkit.com
**Full notes:** [GitHub link]

Thanks for the feedback that made this release possible! 🙏
```

---

**Channel 14: #roadmap** (Read-only)
- **Type:** Text channel
- **Topic:** What's coming next for Pawkit
- **Permissions:**
  - @everyone: Read (✅), Send (❌), React (✅)

**Pinned Message:**
```
🗺️ **Pawkit Roadmap**

**In Progress:**
🚧 Firefox browser extension
🚧 Import from Pocket/Raindrop
🚧 Improved mobile web experience

**Next Up:**
📋 Chrome browser extension
📋 Google Calendar integration
📋 Advanced filtering/views

**Future:**
🔮 Mobile apps (iOS/Android)
🔮 Collaboration features
🔮 AI-powered tagging

**Want something else?** Request in #feature-requests!

React with ❤️ for features you want most!
```

---

**Channel 15: #github-updates** (Optional, automated)
- **Type:** Text channel
- **Topic:** Automated GitHub commits, PRs, issues
- **Bot:** GitHub bot integration

---

### 🎙️ VOICE (Category)

**Channel 16: General Voice**
- **Type:** Voice channel
- **User limit:** None
- **Bitrate:** 64 kbps (or higher if boosted)

**Channel 17: Office Hours** (Optional)
- **Type:** Voice channel
- **Topic:** Weekly Q&A with the creator (schedule in description)
- **User limit:** 25

---

## Roles & Permissions

### Step 7: Create Roles

**Go to: Server Settings → Roles → Create Role**

---

### Role 1: **Admin** (You and core team)
**Color:** Red (#FF0000)
**Permissions:**
- Administrator: ✅

**Assign to:** You, co-founders, trusted core team

---

### Role 2: **Moderator**
**Color:** Blue (#3498db)
**Permissions:**
- Manage Messages: ✅
- Kick Members: ✅
- Ban Members: ✅
- Manage Channels: ✅
- Timeout Members: ✅
- View Audit Log: ✅

**Assign to:** Trusted community members who help moderate

---

### Role 3: **Power User**
**Color:** Purple (#9b59b6)
**Permissions:**
- Default + ability to create events
- No special permissions, just recognition

**Assign to:** Active, helpful community members

**How to earn:**
- Active for 30+ days
- Helps others in #support
- Contributes quality feedback
- Positive community presence

---

### Role 4: **Beta Tester**
**Color:** Orange (#e67e22)
**Permissions:**
- Access to #beta-testing channel (optional private channel)

**Assign to:** Users in early access program

---

### Role 5: **Contributor**
**Color:** Green (#2ecc71)
**Permissions:**
- Default

**Assign to:** GitHub contributors (code, docs, design)

---

### Role 6: **Extension User** (Optional)
**Color:** Yellow (#f1c40f)
**Give to:** People using browser extension (when launched)
**Purpose:** Identify extension users for targeted support

---

### Role 7: **@everyone** (Default role)
**Permissions:**
- View Channels: ✅
- Send Messages: ✅
- Embed Links: ✅
- Attach Files: ✅
- Add Reactions: ✅
- Use External Emoji: ✅
- Read Message History: ✅
- Use Slash Commands: ✅

**Restricted:**
- Mention @everyone: ❌
- Manage Messages: ❌
- Manage Channels: ❌

---

### Step 8: Permission Overrides

**For #welcome, #rules, #announcements, #faq, #changelog, #roadmap:**
- @everyone: Send Messages: ❌ (read-only)

**For #bug-reports and #feature-requests:**
- Consider slowing mode (5-10 minutes) to prevent spam

---

## Bot Setup

### Step 9: Essential Bots

---

### Bot 1: **MEE6** (Automation & Moderation)

**What it does:**
- Auto-moderation (spam, caps, links)
- Welcome messages
- Auto-roles
- Leveling system (optional)

**Setup:**
1. Go to https://mee6.xyz/
2. Click "Add to Discord"
3. Select your Pawkit server
4. Authorize

**Configuration:**

**Moderation:**
- Enable auto-mod for:
  - Spam (5 messages in 5 seconds → timeout)
  - Excessive caps (80%+ caps → delete)
  - Invite links (unless from Admin)
  - Mass mentions (5+ mentions → timeout)

**Welcome Message:**
- Channel: #welcome
- Message:
```
Welcome to Pawkit, {user}! 👋

Check out #rules and introduce yourself in #introductions!

Need help? Ask in #support.
```

**Auto-Role:**
- Give @Member role to all new users (optional)

---

### Bot 2: **Dyno** (Alternative to MEE6)

**What it does:**
- Moderation
- Custom commands
- Auto-responders
- Announcements

**Setup:** https://dyno.gg/

**Use cases:**
- Auto-respond to common questions
- Scheduled announcements
- Moderation logging

---

### Bot 3: **Carl-bot** (Reaction Roles)

**What it does:**
- Self-assignable roles via reactions
- Advanced moderation
- Auto-posting from Reddit

**Setup:** https://carl.gg/

**Reaction Roles Example:**

Create a message in #welcome:
```
🎭 **Choose Your Roles!**

React to get notifications:
📢 @Announcements - Major updates & releases
🐛 @Bug Alerts - Bug fixes & patches
✨ @Feature Updates - New features
💬 @Events - Community events & Q&A

🔔 @Notifications - All updates
```

Users react with emoji to self-assign roles.

---

### Bot 4: **GitHub Integration** (Optional)

**What it does:**
- Posts GitHub commits, PRs, issues to #github-updates

**Setup:**
1. Invite GitHub bot: https://discord.com/application-directory/487431320314576896
2. Link your GitHub repo
3. Configure what events to post

---

### Bot 5: **Statbot** (Server Stats)

**What it does:**
- Voice channels showing live stats
  - "Members: 123"
  - "Online: 45"

**Setup:** https://statbot.net/

**Optional but cool for showcasing growth**

---

## Moderation

### Step 10: Moderation Tools

**Go to: Server Settings → AutoMod**

**Enable AutoMod Rules:**

**Rule 1: Block Spam**
- Trigger: 5+ messages in 5 seconds
- Action: Timeout 5 minutes
- Alert: Send to mod channel

**Rule 2: Block Invite Links**
- Trigger: Message contains discord.gg/
- Exception: Admin, Moderator roles
- Action: Delete message
- Alert: Send to mod channel

**Rule 3: Block Common Scams**
- Trigger: "free nitro", "steam gift", "@everyone"
- Action: Delete + timeout 10 minutes
- Alert: Send to mod channel

**Rule 4: Excessive Mentions**
- Trigger: 5+ mentions in one message
- Action: Delete message
- Alert: Send to mod channel

---

### Step 11: Create Mod Channel

**Private Channel: #mod-chat**
- **Permissions:**
  - @Admin: All
  - @Moderator: All
  - @everyone: Can't see

**Purpose:**
- Discuss moderation actions
- Coordinate responses
- Track problem users

---

### Step 12: Moderation Guidelines

**For mods/yourself:**

**Warning (First Offense):**
```
Hey @user, friendly reminder to [issue]. Please review #rules.

Let us know if you have questions! 🙏
```

**Timeout (Second Offense):**
```
@user, you've been timed out for [duration] for [reason].

We've warned about this before. Please respect the rules.
```

**Kick (Third Offense or Serious):**
```
@user has been kicked for repeated [rule violation].

Can rejoin if they commit to following rules.
```

**Ban (Extreme):**
- No message
- Reserve for spam bots, harassment, illegal content

**Document everything in #mod-chat**

---

## Community Templates

### Step 13: Server Templates

Discord lets you save your server as a template for others.

**To create template:**
1. Server Settings → Server Template
2. Create Template
3. Name: "Pawkit Community Server"
4. Description: "Template for local-first software communities"

**Optional:** Share publicly for other open-source projects

---

### Step 14: Welcome Screen

**Server Settings → Welcome Screen**

**Enable:** Yes

**Channels to highlight:**
- #rules
- #introductions
- #general
- #support
- #announcements

**Welcome Message:**
```
Welcome to Pawkit Discord! 🎉

Get help, share ideas, and connect with other users.

Start by reading #rules, then introduce yourself!
```

---

## Growth & Engagement

### Step 15: Invite Link

**Create permanent invite:**
1. Right-click #general → Invite People
2. Edit invite link
3. Set: Expire: Never, Max uses: Unlimited
4. Create link

**Share this link:**
- On your website (footer)
- In app (settings or help section)
- Reddit sidebar
- Twitter bio
- Email signature
- GitHub README

**Example:** `discord.gg/pawkit` (custom link requires 500+ members + boost)

---

### Step 16: Events

**Use Discord Events** for:
- Weekly office hours
- Monthly Q&A
- Feature launch parties
- Community game nights (optional)

**To create:**
1. Server Settings → Events → Create Event
2. Set date, time, channel
3. Add description
4. Publish

Members get notifications.

---

### Step 17: Engagement Tactics

**Daily/Weekly Activities:**

**Monday:** Pin a "Question of the Week" in #general
```
📌 **Question of the Week**

What's your dream bookmark manager feature?

Most creative answer gets Power User role! 🏆
```

**Wednesday:** Share a tip in #general
```
💡 **Wednesday Tip**

Did you know you can use `tag:work domain:youtube.com` to find all work-tagged YouTube videos?

Try it out! ⚡
```

**Friday:** Celebrate wins in #announcements
```
🎉 **Friday Wins**

This week:
- 50 new members! Welcome! 👋
- 10 bugs reported and fixed 🐛
- 25 feature requests logged 💡

Thanks for making Pawkit better!
```

**Monthly:** User spotlight
```
🌟 **User Spotlight: @username**

@username has been incredibly helpful in #support, helping 20+ users this month.

Check out their Pawkit setup: [screenshot]

Thanks for being awesome! 🙌
```

---

### Step 18: Engagement Metrics

**Track these (Server Settings → Insights):**
- New members per week
- Active members (sent message in last 7 days)
- Most active channels
- Peak activity times

**Adjust strategy based on data:**
- Post when most people are online
- Focus on channels with most activity
- Engage with active members

---

## Pro Tips

### Discord Markdown

**Bold:** `**text**`
**Italic:** `*text*`
**Underline:** `__text__`
**Strikethrough:** `~~text~~`
**Code:** `` `code` ``
**Code block:**
```
\```
multi-line code
\```
```
**Quote:** `> quote`
**Spoiler:** `||spoiler||`

---

### Emojis

**Upload custom emojis:**
1. Server Settings → Emoji
2. Upload Pawkit logo variations
3. Use in messages: `:pawkit:`

**Ideas:**
- `:pawkit:` - Logo
- `:pawkit_love:` - Logo with heart
- `:pawkit_bug:` - Bug icon
- `:pawkit_feature:` - Lightbulb icon

---

### Scheduled Posts

**Use bots (MEE6, Dyno, Carl-bot) to schedule:**
- Weekly roadmap updates
- Daily tips
- Monthly AMAs

Example: Auto-post in #announcements every Monday at 9am:
```
📅 **Weekly Roadmap Update**

This week we're working on:
- [Feature 1]
- [Bug fixes]

Check #roadmap for full details!
```

---

### Integrations

**Connect Discord to:**
- **GitHub:** Auto-post commits, PRs, issues
- **Twitter:** Auto-post tweets to channel
- **YouTube:** Notify when new video uploaded
- **Zapier:** Connect to anything

Example: When you tweet with #PawkitUpdate, auto-post to #announcements.

---

## Launch Checklist

Before sharing your Discord publicly:

- [ ] All channels created
- [ ] Roles configured
- [ ] Permissions set correctly
- [ ] Welcome message posted
- [ ] Rules posted
- [ ] FAQ posted
- [ ] Bots configured (MEE6 or alternative)
- [ ] AutoMod rules enabled
- [ ] Invite link created
- [ ] Welcome screen configured
- [ ] Server icon uploaded
- [ ] Server banner uploaded (if boosted)
- [ ] Announcement posted in #announcements
- [ ] First event scheduled (optional)

**Then:**
- [ ] Share invite on Reddit
- [ ] Share invite on Twitter
- [ ] Add to website footer
- [ ] Add to GitHub README
- [ ] Mention in email newsletter

---

## Growth Milestones

**50 members:**
- Celebrate in #announcements
- Thank early members

**100 members:**
- Create custom emoji
- Host first community event
- Give Power User roles to top contributors

**500 members:**
- Enable server discovery
- Claim custom invite URL (discord.gg/pawkit)
- Host monthly AMAs

**1000 members:**
- Consider adding more mods
- Create voice channels for events
- Launch community programs (ambassador, etc.)

---

## Troubleshooting

**Problem:** Server feels dead

**Solutions:**
- Post daily (questions, tips, updates)
- Respond quickly to every message
- Cross-post interesting discussions from Reddit
- Host events (Q&A, office hours)
- Reward active members with roles

---

**Problem:** Too much spam

**Solutions:**
- Enable AutoMod
- Increase verification level
- Add slow mode to channels
- Recruit moderators
- Use MEE6 spam protection

---

**Problem:** No one asking questions

**Solutions:**
- Ask questions yourself in #general
- Share tips in #support
- Post "Question of the Week"
- Invite specific users from Reddit/Twitter

---

## Resources

**Discord Resources:**
- Discord Server Setup Guide: https://discord.com/safety/360044103771-community-server-setup
- Discord Moderator Academy: https://discord.com/moderation
- Discord Community Wiki: https://www.reddit.com/r/discordapp/wiki/

**Bot Dashboards:**
- MEE6: https://mee6.xyz/
- Dyno: https://dyno.gg/
- Carl-bot: https://carl.gg/
- GitHub Bot: https://discord.com/application-directory/487431320314576896

**Templates:**
- Browse Discord server templates: https://discord.com/template

---

## Final Tips

1. **Be present:** Check Discord daily, respond quickly
2. **Set the tone:** Be friendly, welcoming, helpful
3. **Reward engagement:** Give roles to active members
4. **Listen:** Discord is direct feedback from your users
5. **Evolve:** Add/remove channels based on usage
6. **Automate:** Use bots to reduce manual work
7. **Cross-promote:** Link Discord ↔ Reddit ↔ Twitter ↔ Website

Your Discord is where your community lives. Make it welcoming, organized, and valuable.

Good luck! 🚀

---

*Last updated: 2025-01-05*
*Your community is your greatest asset. Nurture it.*
