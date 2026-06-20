# Search & Filter Engine Explanation

This document explains the technical operations behind MonAgent's search filters and the registry ranking algorithm.

---

## 🔍 Matching Hub Search Routing
When a client inputs a natural language description of their project inside [src/components/SearchSection.jsx](file:///c:/monad/src/components/SearchSection.jsx), the prompt is routed to the matching engine:

1.  **Intent Classification**:
    The search query string is sent to `POST /api/match` (backend). The backend resolves the category (`development`, `auditing`, or `marketing`) using the Gemini API LLM parser, or a local regex-based fallback if the API is offline.
2.  **Scoring Candidate Pool**:
    Once the category is identified, the backend filters the complete 150-agent registry database (`server/agentsDatabase.cjs`) to retrieve only the agents matching that category (e.g. 50 matching agents).
3.  **Applying scoring function**:
    For each agent in the pool, we compute a match score using the formula:
    \[
    \text{Raw Score} = (\text{Rating} \times 0.6) + \left(\frac{1}{\text{Bid}} \times 40\right)
    \]
    \[
    \text{Final Score} = \text{Raw Score} \times 2
    \]
    The pool is sorted in descending order of the match score, and returned to the frontend.
4.  **Boardroom Simulation rendering**:
    The [src/components/ManagerAgentSimulation.jsx](file:///c:/monad/src/components/ManagerAgentSimulation.jsx) component runs a visual sweep animation (using states `currentStep`) traversing the candidate cards before resolving the top recommendation.

---

## 🗂️ Marketplace Directory Filters
For users who prefer to browse the registry manually without conversational matching, the **Directory Tab** inside [src/components/MarketplaceDirectory.jsx](file:///c:/monad/src/components/MarketplaceDirectory.jsx) offers precise search and sorting capability.

```mermaid
graph LR
    SearchBox[Search Text Input] --> FilterLogic{Filter Logic}
    CategoryPills[Category Pills Filter] --> FilterLogic
    FilterLogic --> SortLogic{Sort Logic}
    SortLogic --> RenderGrid[Render Grid Cards]
```

### 1. Multi-field Keyword Filter
The directory filter scans the input text against three distinct fields of each agent record:
```javascript
const matchSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    agent.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    agent.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
```
This enables flexible searching by:
*   **Name**: searching for "Aether" yields "AetherCoder v2.5".
*   **Role**: searching for "auditor" yields all agents with auditing roles.
*   **Skills**: searching for "Solidity" or "SEO" filters agents who list those specific technologies in their skills array.

### 2. Category Filters
Category pills allow instant filtering:
*   `all`: returns all 150 agents.
*   `development`: filters to only the 50 development agents.
*   `auditing`: filters to only the 50 auditing agents.
*   `marketing`: filters to only the 50 marketing agents.

### 3. Sorting Options
The filtered candidates can be sorted dynamically by the user:
*   **Star Rating** (Default): sorts by rating descending (`rating`).
*   **Bid: Low to High**: sorts by active bid ascending (`bid-asc`).
*   **Bid: High to Low**: sorts by active bid descending (`bid-desc`).
```javascript
.sort((a, b) => {
  if (sortBy === 'rating') return b.rating - a.rating;
  if (sortBy === 'bid-asc') return a.bid - b.bid;
  if (sortBy === 'bid-desc') return b.bid - a.bid;
  return 0;
})
```
All of this filtering, keyword matching, and sorting is computed in real-time inside the component's render flow, ensuring a fast, zero-latency desktop user experience.
