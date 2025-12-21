# Feature Integration Requirements

When building ANY new feature in Pawkit V2, ensure it's wired to these integration points.

---

## Quick Reference

| Feature Type | Omnibar Search | ⌘K Command | + Menu | Kit Tool |
|--------------|----------------|------------|--------|----------|
| New content type | ✓ | ✓ | ✓ | ✓ |
| View/filter | ✓ | ✓ | - | ✓ |
| Settings/config | - | ✓ | - | Maybe |
| UI component | - | - | - | - |

---

## 1. Omnibar Integration

Every feature should be accessible via the omnibar where appropriate:

### Search Results
- Can users find this via search? (cards, notes, pawkits, tags, etc.)
- Add to search index/results in `src/lib/search/`

### Command Palette (⌘K)
- Add relevant commands to `src/lib/commands/`
- Format: `{ id, label, icon, action, keywords, shortcut? }`

### Quick Actions (+ Menu)
- If feature creates content, add to + dropdown
- Format: `{ id, label, icon, action }`

---

## 2. Kit AI Integration (Future)

Prepare features to be Kit-accessible:

### Kit Tools
- Define tool in `src/lib/kit/tools/`
- Include: name, description, parameters, execute function
- Example: `createBookmark`, `searchCards`, `addToCollection`

### Kit Context
- What data should Kit be able to read?
- Add to Kit's context provider in `src/lib/kit/context/`

---

## 3. MCP Integration (Future)

For external AI access via Model Context Protocol:

### MCP Tool Definitions
- Mirror Kit tools as MCP-compatible definitions
- Location: `src/lib/mcp/tools/`

---

## Checklist Template

When completing a feature, verify:

- [ ] Searchable via omnibar? (if applicable)
- [ ] Added to ⌘K commands? (if applicable)
- [ ] Added to + menu? (if creates content)
- [ ] Kit tool defined? (if actionable)
- [ ] Kit context updated? (if provides data)
- [ ] MCP tool mirrored? (if Kit tool exists)

Not every feature needs all integrations - use judgment.

---

**Last Updated**: December 20, 2025
