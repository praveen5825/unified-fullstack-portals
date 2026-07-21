# CCRAS Unified Portal — Project Status Report

This document outlines the complete scope of work, architecture, and features that have been successfully developed and integrated into the CCRAS Unified Portal to date.

## 1. Authentication & Security
- **JWT-Based Auth**: Implemented secure JSON Web Token authentication using Django SimpleJWT.
- **Dynamic User Profiles**: The frontend correctly fetches the logged-in user's profile (`/accounts/me/`) on application boot.
- **UI Integration**: The Sidebar and Topbar dynamically display the active user's initials and username, fully replacing hardcoded "Admin" labels.

## 2. Advanced Duplicate & Plagiarism Detection Engine
The core business logic of the portal has been fully implemented.
- **PDF Processing**: Automatic extraction of text from uploaded `.pdf` documents.
- **Hashing & Similarity**: Text hashing and NLP-based semantic comparison to detect content overlap.
- **Review Workflow**: Proposals are flagged with similarity scores (e.g., 40% warning, 70% danger). Reviewers can mark proposals as `Cleared` or `Flagged`.
- **Compare Viewer**: A dedicated UI side-by-side comparison screen to visually review overlapping paragraphs between two proposals.

## 3. Global Full-Text & Boolean Search
A powerful, sub-millisecond search engine built directly into PostgreSQL.
- **Search Vector Indexing**: Added `SearchVectorField` and `GinIndex` to the database. A Django signal automatically updates the index whenever a proposal is saved.
- **Boolean Engine**: Integrated Postgres `websearch_to_tsquery` to support advanced operators:
  - `AND` (e.g., `ayurveda AND cancer`)
  - `OR` (e.g., `cancer OR diabetes`)
  - `NOT` (e.g., `ayurveda NOT synthetic`)
  - Exact phrase matching using `"quotes"`.
- **Global Search UI (`/search`)**: A dedicated interface allowing users to search across Titles, Student Names, College Names, and Full Synopsis Text. Includes result snippet highlighting and filtering by Scheme/Status.

## 4. Advanced Analytics Dashboard
A comprehensive data visualization command center (`/analytics`) utilizing `echarts-for-react`.
- **Zero N+1 Queries**: Backend API uses efficient Django ORM aggregations (`.annotate(Count())`) to process data rapidly.
- **Visualizations Built**:
  - **KPI Cards**: Total Proposals, Flagged Duplicates, Cleared Duplicates.
  - **Year-wise Submissions**: Stacked bar chart showing trends by Scheme across years.
  - **State-wise Volume**: Horizontal bar chart ranking states by submission volume.
  - **Research Area Breakdown**: Donut chart detailing category distribution.
  - **Academic Session Trends**: Line chart showing growth over time.
  - **Duplicate Review Funnel**: Funnel/bar hybrid visualizing review outcomes.

## 5. UI/UX Architecture & Layouts
- **Responsive Layout**: Sidebar navigation and Topbar utilizing modern design principles (glassmorphism, soft shadows, dark/light theme tokens).
- **Dashboard Separation**: Cleaned up architectural separation between the Operational Dashboard (recent tables, quick actions) and the Strategic Analytics Dashboard (heavy charts).

## 6. Bulk Import Interface
- **UI Built (`/bulk-import`)**: Created a dedicated drag-and-drop file upload screen.
- **Workflow Optimized**: Instead of forcing users to add a "Scheme" column in Excel, the UI features a prominent "Select Target Scheme" toggle, applying the chosen scheme to all rows in the uploaded file automatically.
- **Data Validation Guide**: A clear, color-coded table explains exactly which columns are Required (Spark ID, Student Name, Title) vs Optional.

---

### 🚀 Next Steps Pending
1. **Bulk Upload Backend**: Write the Django API logic to parse the uploaded `.xlsx/.csv` file, validate the rows, and bulk create the `ResearchProposal` records.
2. **Bulk Upload Frontend**: Connect the "Browse Files" button in the Bulk Import UI to the new backend API endpoint.
