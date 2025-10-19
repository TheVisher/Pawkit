export interface NoteTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  content: string;
  tags: string[];
}

export const noteTemplates: NoteTemplate[] = [
  {
    id: 'meeting-notes',
    name: 'Meeting Notes',
    description: 'Template for capturing meeting discussions, decisions, and action items',
    category: 'Productivity',
    tags: ['meeting', 'productivity', 'notes'],
    content: `# Meeting Notes

**Date:** ${new Date().toLocaleDateString()}
**Attendees:** 
**Agenda:** 

## Discussion Points

### Topic 1
- 

### Topic 2
- 

## Decisions Made
- 

## Action Items
- [ ] 
- [ ] 
- [ ] 

## Next Steps
- 

## Related Notes
- [[Related Note 1]]
- [[Related Note 2]]

#meeting #productivity`
  },
  {
    id: 'project-planning',
    name: 'Project Planning',
    description: 'Template for planning and tracking project progress',
    category: 'Project Management',
    tags: ['project', 'planning', 'management'],
    content: `# Project: [Project Name]

**Status:** Planning
**Start Date:** ${new Date().toLocaleDateString()}
**Target Date:** 
**Owner:** 

## Project Overview
Brief description of the project goals and objectives.

## Objectives
- [ ] 
- [ ] 
- [ ] 

## Key Deliverables
- [ ] 
- [ ] 
- [ ] 

## Timeline
- **Week 1:** 
- **Week 2:** 
- **Week 3:** 
- **Week 4:** 

## Resources Needed
- 
- 
- 

## Risks & Mitigation
- **Risk:** 
  - **Mitigation:** 

## Related Projects
- [[Related Project 1]]
- [[Related Project 2]]

#project #planning #management`
  },
  {
    id: 'research-notes',
    name: 'Research Notes',
    description: 'Template for organizing research findings and insights',
    category: 'Research',
    tags: ['research', 'notes', 'analysis'],
    content: `# Research: [Topic]

**Research Date:** ${new Date().toLocaleDateString()}
**Source:** 
**Researcher:** 

## Research Question
What are we trying to understand or discover?

## Key Findings
- 
- 
- 

## Supporting Evidence
- 
- 
- 

## Analysis
What do these findings mean? How do they connect to our broader understanding?

## Implications
- 
- 
- 

## Questions for Further Research
- 
- 
- 

## Related Research
- [[Related Research 1]]
- [[Related Research 2]]

## References
- 
- 

#research #analysis #findings`
  },
  {
    id: 'daily-standup',
    name: 'Daily Standup',
    description: 'Template for daily standup meetings and progress tracking',
    category: 'Productivity',
    tags: ['standup', 'daily', 'progress'],
    content: `# Daily Standup - ${new Date().toLocaleDateString()}

## Yesterday
What did I accomplish yesterday?
- 
- 

## Today
What am I planning to work on today?
- [ ] 
- [ ] 
- [ ] 

## Blockers
What's preventing me from making progress?
- 
- 

## Notes
Any additional thoughts or updates:
- 

## Related Work
- [[Related Task 1]]
- [[Related Task 2]]

#standup #daily #progress`
  },
  {
    id: 'brainstorming',
    name: 'Brainstorming Session',
    description: 'Template for capturing ideas and creative thinking sessions',
    category: 'Creative',
    tags: ['brainstorming', 'ideas', 'creative'],
    content: `# Brainstorming: [Topic]

**Date:** ${new Date().toLocaleDateString()}
**Participants:** 
**Objective:** 

## Problem Statement
What problem are we trying to solve?

## Ideas Generated

### Category 1
- 
- 
- 

### Category 2
- 
- 
- 

### Category 3
- 
- 
- 

## Top Ideas
1. 
2. 
3. 

## Next Steps
- [ ] 
- [ ] 
- [ ] 

## Related Ideas
- [[Related Idea 1]]
- [[Related Idea 2]]

#brainstorming #ideas #creative`
  },
  {
    id: 'retrospective',
    name: 'Retrospective',
    description: 'Template for team retrospectives and process improvement',
    category: 'Team',
    tags: ['retrospective', 'team', 'improvement'],
    content: `# Retrospective - [Sprint/Period]

**Date:** ${new Date().toLocaleDateString()}
**Participants:** 
**Period:** 

## What Went Well
- 
- 
- 

## What Could Be Improved
- 
- 
- 

## Action Items
- [ ] 
- [ ] 
- [ ] 

## Team Feedback
- 
- 
- 

## Process Improvements
- 
- 
- 

## Related Notes
- [[Previous Retrospective]]
- [[Team Notes]]

#retrospective #team #improvement`
  }
];

export function getTemplatesByCategory(): Record<string, NoteTemplate[]> {
  return noteTemplates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, NoteTemplate[]>);
}

export function getTemplateById(id: string): NoteTemplate | undefined {
  return noteTemplates.find(template => template.id === id);
}
