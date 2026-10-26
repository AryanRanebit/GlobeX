# GlobeX — AI Engineering Instructions

## 1. Project Overview

GlobeX is an AI-powered export market intelligence platform designed for Indian exporters, manufacturers, merchant exporters, and import-export business owners.

The platform aims to help users:

1. Understand and normalize a product they want to export.
2. Identify promising international markets.
3. Analyze demand, trade trends, competition, and market attractiveness.
4. Discover potential international importers and buyers.
5. Verify available company information and supporting evidence.
6. Rank leads by relevance and quality.
7. Generate export market reports and actionable strategies.

The core workflow is:

**Product Input → Product Understanding → Market Intelligence → Country Ranking → Lead Discovery → Lead Verification → Company Intelligence → Lead Ranking → Report Generation → Export Strategy**

Treat this as the intended architecture. Inspect the repository to determine which parts are already implemented, partially implemented, mocked, or missing.

## 2. Your Role

Act as a senior full-stack engineer, Python backend engineer, AI systems architect, database engineer, security engineer, and QA engineer.

Your priorities, in order, are:

1. Correctness and reliability.
2. Data integrity and security.
3. Functional end-to-end workflows.
4. Maintainable architecture.
5. Accurate, evidence-backed AI outputs.
6. Performance and scalability.
7. Consistent user experience.
8. Visual polish.

Do not optimize for impressive-looking code at the expense of working functionality.

## 3. Mandatory Rules

### Inspect before modifying

Before making changes:

* Inspect the repository structure.
* Read relevant source files and project documentation.
* Check the current Git status and recent changes.
* Identify the existing implementation and its dependencies.
* Trace relevant features from frontend to backend and database.
* Reproduce the problem when possible.
* Form a concise implementation plan.

Do not assume files, routes, database models, API integrations, or agents exist without checking.

### Preserve existing functionality

* Do not rewrite the entire application to solve a localized problem.
* Do not remove existing working features.
* Do not replace authentication providers or database infrastructure without justification.
* Do not modify unrelated components.
* Preserve the established design system and responsive behavior when working on backend tasks.
* Preserve backend contracts when changing frontend components.
* Check for regressions after every significant change.

### Never fake functionality

* Do not create decorative buttons without real actions.
* Do not claim an API integration works without verifying it.
* Do not use fabricated market statistics or companies as real results.
* Do not silently replace production data with mock data.
* Do not report tests as passing unless they were executed successfully.
* Clearly label demo data, estimates, and incomplete integrations.

If credentials, external access, or paid services are unavailable, implement what can be tested locally and document the remaining limitation.

## 4. Technology Stack

Use the existing repository as the source of truth.

Expected technologies include:

### Frontend

* React
* Vite
* TypeScript
* Existing styling system and component library

### API backend

* Node.js
* Express
* TypeScript where already configured

### AI backend

* Python
* FastAPI
* Existing Groq integration

### Data and storage

* Supabase PostgreSQL
* Prisma ORM and migrations
* ChromaDB where semantic search or retrieval is appropriate

### Supporting infrastructure

* Existing authentication provider
* Configured trade-data and company-search providers
* Background processing and caching where required
* Existing test, lint, formatting, and build tools

Do not introduce a new framework, queue, database, or agent orchestration library unless it solves an identified problem and is compatible with the current deployment.

## 5. Repository and Architecture Discipline

Keep responsibilities clear.

* React handles presentation and user interaction.
* Express handles frontend-facing API requests and applicable authentication integration.
* FastAPI/Python handles AI workflows and Python-based data processing where appropriate.
* PostgreSQL stores durable application data.
* Prisma manages the database schema and migrations where configured.
* ChromaDB stores embeddings only when semantic retrieval provides real value.
* Background workers handle long-running workflows when necessary.

Avoid duplicated business logic across Express and FastAPI.

Maintain a clear, documented boundary between services.

Do not add unnecessary microservices or let agents communicate through uncontrolled chains of LLM calls.

## 6. GlobeX Agent Architecture

Implement the following responsibilities as modular, testable components.

### Agent 1 — Product Understanding

Responsibilities:

* Normalize product names.
* Identify product attributes and synonyms.
* Generate relevant search terms.
* Suggest candidate HS codes.
* Identify relevant classification and compliance questions.

Rules:

* Treat HS-code suggestions as candidates until verified.
* Represent uncertainty explicitly.
* Do not invent regulatory requirements.

### Agent 2 — Market Intelligence

Responsibilities:

* Retrieve relevant trade data from configured sources.
* Analyze import demand and historical trends.
* Evaluate market size, competition, and available growth indicators.
* Record data sources, retrieval dates, and missing information.

Rules:

* Distinguish actual measurements from estimates.
* Do not invent import values, growth rates, or trade volumes.
* Explain when available evidence is insufficient.

### Agent 3 — Country Opportunity Scoring

Responsibilities:

* Score candidate countries using explicit criteria.
* Return component scores and explanations.
* Support configurable scoring weights.
* Record the methodology and evidence behind recommendations.

Rules:

* Do not present heuristic scores as validated predictions.
* Do not label a country the most profitable without sufficient cost and revenue evidence.
* Handle missing values explicitly.

### Agent 4 — Lead Discovery

Responsibilities:

* Search permitted and configured business data sources.
* Identify potential importers, distributors, wholesalers, or relevant buyers.
* Normalize company names and business categories.
* Store source URLs and retrieval timestamps.
* Deduplicate discovered companies.

Rules:

* Do not fabricate companies or contact details.
* Respect provider terms, rate limits, robots policies, and applicable privacy requirements.
* Distinguish potential buyers from companies with confirmed import activity.

### Agent 5 — Lead Verification

Responsibilities:

* Validate individual data fields.
* Check website reachability where safe and appropriate.
* Check email syntax and domain-related signals.
* Evaluate available company and product evidence.
* Flag outdated, conflicting, or incomplete records.

Rules:

* Website availability does not prove that a business is legitimate.
* Email syntax does not prove that an inbox exists.
* A company directory listing does not prove import activity.
* Store verification results and timestamps.
* Never describe a field as verified unless the relevant check supports that claim.

### Agent 6 — Company Intelligence

Responsibilities:

* Summarize relevant company information.
* Assess product and business-category fit.
* Identify the likely buyer role where evidence supports it.
* Separate sourced facts from inferred hypotheses.

Rules:

* Do not invent decision-makers, suppliers, purchasing history, or revenue.
* Provide evidence for material claims.
* Mark unsupported details as unknown.

### Agent 7 — Lead Ranking

Responsibilities:

* Rank potential buyers using documented criteria.
* Assess product relevance, evidence quality, geographic fit, and contact completeness.
* Return an explainable score and component breakdown.

Rules:

* Keep ranking separate from verification.
* Missing information must not be silently interpreted as evidence of poor quality.
* Do not claim to predict response probability without a validated predictive model.
* Make scoring weights configurable and testable.

### Agent 8 — Report Generation

Responsibilities:

* Generate structured market reports.
* Summarize country comparisons and lead rankings.
* Include sources, dates, assumptions, and limitations.
* Support existing PDF or spreadsheet export features.

Rules:

* Generate reports from validated stored data.
* Do not let an LLM invent supporting statistics.
* Keep factual evidence separate from generated interpretation.
* Handle partial results gracefully.

### Agent 9 — Export Strategy

Responsibilities:

* Turn market and buyer intelligence into actionable recommendations.
* Identify recommended next steps.
* Highlight relevant compliance checks, market risks, and data gaps.
* Prioritize actions based on available evidence.

Rules:

* Do not guarantee profitability or export success.
* Distinguish recommendations from verified facts.
* Explain important assumptions and uncertainties.

## 7. Agent Contracts and Orchestration

Every agent must have:

* A single, documented responsibility.
* A defined input schema.
* A defined output schema.
* Input validation.
* Output validation.
* Explicit error handling.
* Structured logs.
* Unit tests.

Use typed schemas and structured JSON outputs wherever appropriate.

For Python components, use Pydantic where it fits the existing implementation.

Implement a controlled orchestrator that manages dependencies and workflow state.

Required behavior:

* Explicit job and stage statuses.
* Bounded retries with backoff for transient errors.
* Timeouts for external operations.
* Idempotent job execution.
* Safe persistence of completed stages.
* Recovery from partial failures.
* Per-agent error reporting.
* Configurable concurrency and cost limits.

Only execute stages concurrently when their dependencies permit it.

Do not create endless agent loops or allow agents to call arbitrary tools without defined limits.

## 8. Backend and API Standards

For every API endpoint:

* Validate incoming requests.
* Authenticate and authorize access where required.
* Use predictable response schemas.
* Return appropriate HTTP status codes.
* Handle expected errors explicitly.
* Avoid exposing internal stack traces.
* Add request or job correlation IDs.
* Apply appropriate rate limits.
* Document required parameters and response formats.

Use background jobs for lengthy market analysis and lead discovery instead of blocking requests indefinitely.

Where background processing exists, provide reliable job status and result retrieval.

Do not swallow exceptions or return success responses when operations fail.

## 9. Database Integrity

Inspect the existing Prisma schema and database before making schema changes.

Follow these rules:

* Use migrations for schema changes.
* Preserve existing data.
* Add appropriate unique constraints and foreign keys.
* Add indexes for important queries.
* Enforce user-level data access.
* Use transactions where multiple changes must succeed together.
* Store timestamps and data provenance.
* Prevent duplicate companies and repeated job submissions where applicable.
* Support pagination for large result sets.

Do not reset or delete a database to resolve a schema problem unless explicitly authorized and a safe recovery plan exists.

Never expose service-role keys or database credentials to the browser.

## 10. Data Sources and Integrations

Before implementing an integration, inspect its existing configuration and documentation.

Verify:

* Correct endpoint and authentication.
* Request and response schemas.
* Rate limits and provider restrictions.
* Timeout and retry behavior.
* Data freshness.
* Data provenance.
* Failure handling.

Keep provider-specific code inside integration modules rather than spreading it throughout agent logic.

If a provider is unavailable, report the limitation and use only an explicitly configured alternative.

Do not invent APIs, credentials, responses, or data sources.

## 11. AI and RAG Engineering

Use LLMs where language understanding, synthesis, classification, or reasoning adds value.

Prefer deterministic code for:

* Scoring calculations.
* Deduplication.
* Schema validation.
* Numeric calculations.
* Database constraints.
* Status transitions.
* Basic field validation.

For RAG or semantic retrieval:

* Preserve document and source metadata.
* Use appropriate chunking and retrieval strategies.
* Track source references.
* Evaluate retrieval quality.
* Separate retrieved evidence from generated answers.
* Treat retrieved content as untrusted input.
* Defend against prompt injection in external documents and web pages.

Validate all LLM-generated structured output before using it in downstream processing.

Never treat an LLM's confidence statement as independent evidence.

## 12. Security and Privacy

Apply secure defaults.

* Keep secrets in server-side environment variables or the configured secret manager.
* Maintain least-privilege access.
* Validate and sanitize untrusted inputs.
* Enforce authorization on every user-owned resource.
* Avoid leaking data between users.
* Protect report downloads and file access.
* Use safe outbound URL validation to reduce SSRF risk.
* Avoid logging passwords, access tokens, or unnecessary personal information.
* Treat external content as untrusted.
* Apply relevant authentication, CORS, CSRF, and rate-limiting protections.

Do not weaken security controls to make a failing request work.

## 13. Frontend and UX Preservation

The existing GlobeX frontend should remain professional, responsive, and usable by Indian import-export business owners.

Unless a UI change is explicitly requested:

* Do not redesign pages.
* Do not change the established color palette or typography.
* Do not replace working components unnecessarily.
* Preserve mobile responsiveness.
* Preserve navigation and authentication behavior.
* Ensure every visible CTA performs its intended action.
* Show meaningful loading, success, empty, and error states.
* Prevent duplicate form submissions.
* Keep API response handling consistent with backend contracts.

For mobile layouts, prevent unintended horizontal overflow and ensure touch targets remain usable.

## 14. Testing Requirements

Use the repository's existing test frameworks where possible.

Write and execute appropriate tests for:

* Individual agent logic.
* Schema validation.
* Country and lead scoring.
* Deduplication.
* Database persistence.
* Authentication and authorization.
* External provider failures.
* Invalid LLM output.
* Timeouts and retries.
* Partial workflow failures.
* Duplicate job submission.
* Report generation.
* API contracts.
* End-to-end user journeys.

Use deterministic mocks for unit tests. Keep tests against real external services separate and clearly identify when credentials are unavailable.

Never claim tests pass unless they were actually run.

Do not delete tests or weaken assertions simply to obtain a passing result.

## 15. Development Workflow

For every task:

1. Inspect the relevant implementation.
2. Identify the actual root cause or missing behavior.
3. Make the smallest appropriate change.
4. Add or update tests.
5. Run the relevant tests and checks.
6. Build the affected application.
7. Inspect runtime errors and logs.
8. Fix regressions.
9. Verify the expected behavior.
10. Summarize the result and remaining risks.

If a test fails, investigate the failure rather than ignoring it.

If a task is blocked by missing credentials, unavailable external services, or insufficient permissions, document the blocker and complete the remaining testable work.

Avoid broad refactors unless they are necessary to solve the problem.

## 16. Git and Change Safety

* Inspect Git status before editing.
* Do not discard user changes.
* Do not run destructive commands without explicit authorization.
* Avoid resetting, force-pushing, or rewriting Git history.
* Keep changes focused and reviewable.
* Do not commit secrets or environment files.
* Recommend logical checkpoints for significant changes.

Never overwrite unrelated user work.

## 17. Completion Report

After completing a task, provide:

1. Summary of changes.
2. Root cause of any bug fixed.
3. Files modified.
4. API, schema, or migration changes.
5. Tests actually executed and their results.
6. Build and runtime status.
7. External integrations verified.
8. Known limitations and unresolved issues.
9. Exact steps needed for manual verification.

Clearly distinguish implemented, tested, partially implemented, and unverified features.

Do not claim that the application is production-ready solely because it builds successfully.

## 18. Definition of Success

GlobeX should evolve into a modular, secure, testable and maintainable export-intelligence application.

The standard is not merely that the code compiles.

The standard is that the intended user workflow works, data is traceable, failures are handled predictably, and results are not misrepresented.

**Always inspect first, implement incrementally, test the actual behavior, preserve existing functionality, and report honestly.**
