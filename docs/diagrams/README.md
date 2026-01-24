# FastBulma Documentation Diagrams

This directory contains visual diagrams created to illustrate key FastBulma concepts.

## Mermaid Diagrams (PNG files)

### 01-css-variable-inheritance-flow.png

**Purpose**: Explains the core CSS Variable Bridge Pattern
**Shows**:

- How developers add Bulma classes to FAST components
- How CSS variables are set and penetrate Shadow DOM boundaries
- How FAST components read those variables internally
  **Use Case**: Understanding the fundamental architecture

### 02-system-architecture.png

**Purpose**: High-level system architecture overview
**Shows**:

- Application Layer (user's HTML)
- FastBulma Integration Layer (CSS variable mapping + JavaScript adapter)
- Bulma CSS Layer (layout utilities)
- FAST Components Layer (Shadow DOM widgets)
  **Use Case**: Onboarding developers to the architecture

### 03-migration-path-decision-tree.png

**Purpose**: Decision tree for choosing migration strategy
**Shows**:

- Three migration levels (Drop-in, Gradual, Full Adoption)
- Project size considerations
- Migration goals and tasks
  **Use Case**: Helping users plan their Bulma → FastBulma migration

## Excalidraw Mockups

The following mockups are available in the Excalidraw canvas (via Excalidraw MCP server):

### Component Comparison

**Shows**: Side-by-side comparison of Bulma vs FastBulma buttons
**Highlights**:

- Same visual appearance
- Different HTML (native `<button>` vs `<fast-button>`)
- Code examples for both
  **Use Case**: Demonstrates "drop-in replacement" value proposition

### Shadow DOM Visualization

**Shows**: Visual cutaway of how CSS variables penetrate Shadow DOM
**Components**:

- External Page DOM
- FAST Component with Shadow Root
- CSS Variables panel
- Step-by-step flow (1-2-3-4)
  **Use Case**: Making the technical concept tangible

### Theme Gallery

**Shows**: All 5 pre-built themes with actual colors
**Themes**:

- Default (Light) - White background, purple primary
- Dark Mode - Dark background, lighter purple
- Solarized Light - Warm, eye-friendly palette
- Dracula - Dark purple theme with neon accents
- Nord - Cool, arctic color scheme
  **Use Case**: Visual proof of theming capabilities

## Using These Diagrams

### In Documentation

```markdown
![CSS Variable Inheritance](diagrams/01-css-variable-inheritance-flow.png)
```

### In Presentations

All diagrams are high-resolution PNGs suitable for:

- Slide decks
- Technical documentation
- Marketing materials
- Training materials

### For Further Editing

The Excalidraw source files can be accessed via:

1. Open Excalidraw (desktop app or web)
1. Connect to the MCP server
1. Access the FastBulma canvas
1. Edit and export as needed

## Creating New Diagrams

When creating new diagrams:

1. Use Mermaid for architectural flows and decision trees
1. Use Excalidraw for visual mockups and comparisons
1. Save to this directory with descriptive names
1. Update this README with the new diagram's purpose

## Diagram Maintenance

- **Keep diagrams simple**: Focus on one concept per diagram
- **Use consistent colors**: Match FastBulma brand colors (purple #7957d5)
- **Label everything**: Assume viewers may be new to the project
- **Update when architecture changes**: Keep diagrams in sync with code
- **Version control**: All diagrams are tracked in Git
