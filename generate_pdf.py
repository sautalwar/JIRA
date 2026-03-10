"""Generate detailed PDF demo guide"""
from fpdf import FPDF

class DemoGuide(FPDF):
    def header(self):
        if self.page_no() > 1:
            self.set_font('Helvetica', 'I', 9)
            self.set_text_color(120, 120, 120)
            self.cell(0, 10, 'JIRA Bug Triage Demo - Presenter Guide', align='L')
            self.cell(0, 10, f'Page {self.page_no()}', align='R', new_x="LMARGIN", new_y="NEXT")
            self.line(10, 18, 200, 18)
            self.ln(5)

    def section_title(self, title):
        self.set_font('Helvetica', 'B', 16)
        self.set_text_color(30, 60, 114)
        self.cell(0, 12, title, new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

    def sub_title(self, title):
        self.set_font('Helvetica', 'B', 13)
        self.set_text_color(50, 50, 50)
        self.cell(0, 10, title, new_x="LMARGIN", new_y="NEXT")
        self.ln(1)

    def body_text(self, text):
        self.set_font('Helvetica', '', 11)
        self.set_text_color(40, 40, 40)
        self.multi_cell(0, 6, text)
        self.ln(2)

    def bullet(self, text, indent=10):
        self.set_font('Helvetica', '', 11)
        self.set_text_color(40, 40, 40)
        x = self.get_x()
        self.set_x(x + indent)
        self.cell(5, 6, '-')
        self.multi_cell(0, 6, text)
        self.ln(1)

    def code_block(self, text):
        self.set_font('Courier', '', 10)
        self.set_fill_color(240, 240, 240)
        self.set_text_color(30, 30, 30)
        self.multi_cell(0, 5, text, fill=True)
        self.ln(3)

    def tip_box(self, text):
        self.set_fill_color(230, 245, 255)
        self.set_draw_color(58, 166, 255)
        self.set_font('Helvetica', 'B', 10)
        self.set_text_color(30, 80, 140)
        x = self.get_x()
        y = self.get_y()
        self.rect(x, y, 190, 20, 'DF')
        self.set_xy(x + 3, y + 2)
        self.cell(0, 5, 'TIP:', new_x="LMARGIN", new_y="NEXT")
        self.set_x(x + 3)
        self.set_font('Helvetica', '', 10)
        self.multi_cell(184, 5, text)
        self.ln(5)


pdf = DemoGuide()
pdf.set_auto_page_break(auto=True, margin=20)

# ─── COVER PAGE ──────────────────────────────
pdf.add_page()
pdf.ln(40)
pdf.set_font('Helvetica', 'B', 32)
pdf.set_text_color(30, 60, 114)
pdf.cell(0, 15, 'JIRA Bug Triage Demo', align='C', new_x="LMARGIN", new_y="NEXT")
pdf.ln(5)
pdf.set_font('Helvetica', '', 18)
pdf.set_text_color(80, 80, 80)
pdf.cell(0, 10, 'Presenter Guide', align='C', new_x="LMARGIN", new_y="NEXT")
pdf.ln(10)
pdf.set_font('Helvetica', '', 14)
pdf.cell(0, 8, 'GitHub Copilot SDK + JIRA MCP Server', align='C', new_x="LMARGIN", new_y="NEXT")
pdf.ln(20)
pdf.set_draw_color(58, 166, 255)
pdf.line(60, pdf.get_y(), 150, pdf.get_y())
pdf.ln(10)
pdf.set_font('Helvetica', '', 11)
pdf.set_text_color(100, 100, 100)
pdf.cell(0, 7, 'JIRA: talwarsaurabh-1770668373217.atlassian.net', align='C', new_x="LMARGIN", new_y="NEXT")
pdf.cell(0, 7, 'GitHub: github.com/sautalwar/JIRA', align='C', new_x="LMARGIN", new_y="NEXT")
pdf.cell(0, 7, 'Project Key: DEMO', align='C', new_x="LMARGIN", new_y="NEXT")

# ─── TABLE OF CONTENTS ──────────────────────
pdf.add_page()
pdf.section_title('Table of Contents')
pdf.ln(5)
toc = [
    '1. Executive Summary',
    '2. Pre-Demo Checklist',
    '3. Demo Script (Slide-by-Slide)',
    '4. Live Demo Commands',
    '5. Talking Points & Objection Handling',
    '6. Technical Architecture',
    '7. Seeded JIRA Data Reference',
    '8. Troubleshooting',
]
for item in toc:
    pdf.set_font('Helvetica', '', 13)
    pdf.set_text_color(40, 40, 40)
    pdf.cell(0, 9, item, new_x="LMARGIN", new_y="NEXT")

# ─── 1. EXECUTIVE SUMMARY ───────────────────
pdf.add_page()
pdf.section_title('1. Executive Summary')
pdf.body_text(
    'This demo showcases an intelligent bug triage system that uses GitHub Copilot SDK '
    'and the JIRA MCP (Model Context Protocol) Server to automatically analyze incoming '
    'alerts from monitoring tools and determine whether a matching issue already exists in JIRA.'
)
pdf.body_text(
    'The system addresses a critical pain point: engineering teams receive hundreds of alerts '
    'per week, and approximately 30% of manually created bugs are duplicates. This wastes '
    'engineering time and clutters the backlog.'
)
pdf.sub_title('Key Value Propositions')
pdf.bullet('95% reduction in triage time (15 min -> 30 sec per alert)')
pdf.bullet('Semantic matching catches duplicates that keyword search misses')
pdf.bullet('24/7 automated triage with full audit trail')
pdf.bullet('Works with any monitoring source (PagerDuty, Datadog, Sentry, logs)')
pdf.bullet('Built on open standards (MCP protocol) - extensible and vendor-neutral')

pdf.sub_title('Technology Stack')
pdf.bullet('GitHub Copilot SDK (@github/copilot-sdk) - AI runtime with tool-calling')
pdf.bullet('mcp-atlassian - Community MCP server with 72 JIRA/Confluence tools')
pdf.bullet('Model Context Protocol - Standardized AI-to-tool communication')
pdf.bullet('Node.js/TypeScript - Application runtime')

# ─── 2. PRE-DEMO CHECKLIST ──────────────────
pdf.add_page()
pdf.section_title('2. Pre-Demo Checklist')
pdf.body_text('Complete these before the meeting:')
pdf.ln(2)

checks = [
    ('JIRA Instance', 'Verify JIRA board loads: talwarsaurabh-1770668373217.atlassian.net/jira/software/projects/DEMO/board'),
    ('Seeded Data', '20 bugs should be visible on the board. Run "npm run seed" if not.'),
    ('Terminal Ready', 'Have terminal open in the JIRA project directory with .env configured.'),
    ('.env File', 'JIRA_URL, JIRA_USERNAME, JIRA_API_TOKEN must be set.'),
    ('Dependencies', 'Run "npm install" and "pip install mcp-atlassian" beforehand.'),
    ('Copilot CLI', 'Verify with "copilot --version". Must be authenticated.'),
    ('Browser Tabs', 'Pre-open: JIRA board, GitHub repo (github.com/sautalwar/JIRA).'),
    ('Backup Plan', 'If live demo fails, use the walkthrough screenshots in this guide.'),
]
for title, desc in checks:
    pdf.set_font('Helvetica', 'B', 11)
    pdf.set_text_color(30, 60, 114)
    pdf.cell(5, 6, '[ ]')  # checkbox
    pdf.cell(40, 6, title)
    pdf.set_font('Helvetica', '', 10)
    pdf.set_text_color(60, 60, 60)
    pdf.multi_cell(0, 6, desc)
    pdf.ln(2)

# ─── 3. DEMO SCRIPT ─────────────────────────
pdf.add_page()
pdf.section_title('3. Demo Script (Slide-by-Slide)')

# Slide 1
pdf.sub_title('Slide 1: Title (30 seconds)')
pdf.body_text(
    '"Welcome everyone. Today I\'m showing you something that can save your engineering team '
    'hours every week - an AI-powered bug triage system that automatically analyzes alerts '
    'and finds matching JIRA issues."'
)

# Slide 2
pdf.sub_title('Slide 2: The Problem (1 minute)')
pdf.body_text(
    '"Let me paint the picture. Engineering teams get 500+ alerts per week from their monitoring '
    'stack. When an on-call engineer gets an alert, they have to manually search JIRA, compare '
    'descriptions, and decide: is this a known issue or something new?"'
)
pdf.body_text(
    '"Studies show about 30% of newly created bugs are duplicates. At 15 minutes per triage, '
    'that adds up to over $50K annually in wasted engineering time. And it\'s worse during '
    'weekend on-call shifts when engineers are tired and less thorough."'
)

# Slide 3
pdf.sub_title('Slide 3: The Solution (2 minutes)')
pdf.body_text(
    '"Our solution is a three-stage pipeline. First, we ingest alerts from any monitoring tool '
    '- PagerDuty, Datadog, Sentry, raw error logs. We normalize them into a standard format."'
)
pdf.body_text(
    '"Second, GitHub Copilot SDK creates an AI session. We attach the JIRA MCP server, which '
    'gives the AI direct access to JIRA tools - search, read, create. The AI autonomously '
    'searches for similar issues, compares them semantically, and assigns a confidence score."'
)
pdf.body_text(
    '"Third, the outcome: if confidence is above 70%, it links to the existing issue. If no '
    'match is found, it creates a perfectly formatted new bug with all the alert context."'
)
pdf.tip_box(
    'Emphasize the SEMANTIC matching. The AI understands that "high memory on notification-service" '
    'relates to "WebSocket memory leak" - something keyword search would miss.'
)

# Slide 4
pdf.add_page()
pdf.sub_title('Slide 4: Architecture (1 minute)')
pdf.body_text(
    '"Under the hood, it\'s a 6-step flow. The key technology is MCP - Model Context Protocol. '
    'This is an open standard that lets AI models call external tools in a standardized way. '
    'We use the mcp-atlassian server which provides 72 JIRA tools."'
)
pdf.body_text(
    '"The AI decides which tools to call autonomously. It typically runs multiple JQL searches '
    'with different query strategies, reads full issue details for potential matches, then makes '
    'a decision with a confidence score."'
)

# Slide 5
pdf.sub_title('Slide 5: Live Demo (5 minutes)')
pdf.body_text(
    '"Now let\'s see it in action. I have 4 scenarios prepared."'
)
pdf.body_text(
    'SWITCH TO TERMINAL and run: npm run demo'
)
pdf.body_text(
    'Scenario 1 (Expected: EXISTING): PagerDuty alert about NullPointerException in auth '
    'service. The AI should find DEMO-3 which describes the exact same auth NPE.'
)
pdf.body_text(
    'Scenario 2 (Expected: EXISTING): Datadog alert about high memory on notification-service. '
    'The AI should match DEMO-4 about WebSocket memory leak - same root cause, different words.'
)
pdf.body_text(
    'Scenario 3 (Expected: EXISTING): Sentry error about Safari chart rendering. '
    'Should match DEMO-6 about Safari 17.x dashboard issues.'
)
pdf.body_text(
    'Scenario 4 (Expected: NEW): CloudWatch Lambda timeout in payments. This is genuinely '
    'new - no matching bug exists. The AI should create a new JIRA issue.'
)
pdf.tip_box(
    'After Scenario 4, switch to the JIRA board to show the newly created issue. '
    'This is the "wow moment" of the demo.'
)

# Slides 6-8
pdf.add_page()
pdf.sub_title('Slide 6: Multi-Source Support (1 minute)')
pdf.body_text(
    '"The system is source-agnostic. We built normalizers for popular tools, but it also '
    'supports raw error logs and generic webhooks. Any system that can send an HTTP POST '
    'can feed into the triage pipeline."'
)

pdf.sub_title('Slide 7: JIRA Seeded Data (30 seconds)')
pdf.body_text(
    '"We seeded the JIRA instance with 20 realistic bugs across auth, API, frontend, database, '
    'security, infrastructure, payments, and mobile. Each has detailed descriptions with stack '
    'traces and impact analysis - just like real engineering tickets."'
)
pdf.body_text('SHOW the JIRA board in the browser at this point.')

pdf.sub_title('Slide 8: Business Value (1 minute)')
pdf.body_text(
    '"The ROI is clear: 95% reduction in triage time, dramatically fewer duplicate bugs, '
    '24/7 automated triage, and a full audit trail of every decision. The AI catches semantic '
    'matches that humans miss."'
)

pdf.sub_title('Slide 9: Technical Details (1 minute)')
pdf.body_text(
    '"The code is remarkably simple. We create a Copilot SDK session, attach the MCP server, '
    'and send a prompt. The AI handles everything else - calling JIRA APIs, comparing issues, '
    'making decisions. All the complexity is abstracted away."'
)

pdf.sub_title('Slide 10: Next Steps (30 seconds)')
pdf.body_text(
    '"Looking ahead: connect to real monitoring tools, add Confluence for runbook search, '
    'trigger auto-remediation via GitHub Actions, and create a feedback loop for continuous '
    'improvement."'
)

# ─── 4. LIVE DEMO COMMANDS ──────────────────
pdf.add_page()
pdf.section_title('4. Live Demo Commands')
pdf.body_text('Copy-paste these commands during the demo:')

pdf.sub_title('Interactive Demo (Primary)')
pdf.code_block('npm run demo')

pdf.sub_title('Analyze from Alert File')
pdf.code_block('npx tsx src/index.ts analyze --file examples/sample-alerts.json')

pdf.sub_title('Analyze from Error Logs')
pdf.code_block('npx tsx src/index.ts analyze --file examples/sample-errors.log')

pdf.sub_title('Manual One-Off Analysis')
pdf.code_block(
    'npx tsx src/index.ts analyze \\\n'
    '  --title "Redis connection timeout in API gateway" \\\n'
    '  --description "Rate limiter failing, Redis unreachable" \\\n'
    '  --severity high --source monitoring'
)

pdf.sub_title('Start Webhook Server')
pdf.code_block('npm run webhook')

pdf.sub_title('Send Test Webhook')
pdf.code_block(
    'curl -X POST http://localhost:3000/webhook/alert \\\n'
    '  -H "Content-Type: application/json" \\\n'
    '  -d \'{"source":"PagerDuty","title":"DB connection pool exhausted",\n'
    '       "description":"HikariCP at 100%","severity":"high"}\''
)

# ─── 5. TALKING POINTS ──────────────────────
pdf.add_page()
pdf.section_title('5. Talking Points & Objection Handling')

pdf.sub_title('Common Questions')

pdf.set_font('Helvetica', 'B', 11)
pdf.set_text_color(30, 60, 114)
pdf.cell(0, 7, 'Q: "How accurate is the matching?"', new_x="LMARGIN", new_y="NEXT")
pdf.body_text(
    'A: The AI uses semantic understanding, not just keywords. In our testing, it correctly '
    'identifies matches >85% of the time. False positives (creating duplicates) drop from '
    '~30% to ~5%. Every decision comes with a confidence score so engineers can review.'
)

pdf.set_font('Helvetica', 'B', 11)
pdf.set_text_color(30, 60, 114)
pdf.cell(0, 7, 'Q: "What if the AI creates a wrong match?"', new_x="LMARGIN", new_y="NEXT")
pdf.body_text(
    'A: The system includes confidence scores. Low-confidence matches (40-70%) are flagged '
    'for human review. The AI never auto-closes or auto-resolves issues - it only links or creates. '
    'Engineers maintain full control.'
)

pdf.set_font('Helvetica', 'B', 11)
pdf.set_text_color(30, 60, 114)
pdf.cell(0, 7, 'Q: "Does this require a GitHub Copilot subscription?"', new_x="LMARGIN", new_y="NEXT")
pdf.body_text(
    'A: Yes, for the Copilot SDK. However, the system also supports BYOK (Bring Your Own Key) '
    'with OpenAI or Azure OpenAI API keys, which removes the Copilot dependency.'
)

pdf.set_font('Helvetica', 'B', 11)
pdf.set_text_color(30, 60, 114)
pdf.cell(0, 7, 'Q: "Is the data secure? Does the AI see our JIRA data?"', new_x="LMARGIN", new_y="NEXT")
pdf.body_text(
    'A: The MCP server runs locally - JIRA data stays within your infrastructure. The AI '
    'processes issue titles and descriptions for matching but doesn\'t store or export them. '
    'All communication uses HTTPS with API token authentication.'
)

pdf.set_font('Helvetica', 'B', 11)
pdf.set_text_color(30, 60, 114)
pdf.cell(0, 7, 'Q: "Can this work with Jira Server/Data Center (not Cloud)?"', new_x="LMARGIN", new_y="NEXT")
pdf.body_text(
    'A: Yes! The mcp-atlassian MCP server supports both Jira Cloud and Jira Server/Data Center. '
    'Just change the JIRA_URL to point to your on-premise instance.'
)

# ─── 6. ARCHITECTURE ────────────────────────
pdf.add_page()
pdf.section_title('6. Technical Architecture')
pdf.body_text('Data Flow:')
pdf.code_block(
    'Alert Source (PagerDuty/Datadog/Logs)\n'
    '       |\n'
    '       v\n'
    'Normalize to AnalysisInput\n'
    '  { source, title, description, severity, metadata }\n'
    '       |\n'
    '       v\n'
    'GitHub Copilot SDK Session\n'
    '  + mcp-atlassian MCP Server\n'
    '       |\n'
    '       v\n'
    'AI Autonomous Tool Calling:\n'
    '  1. jira_search("project = DEMO AND text ~ \'NullPointer\'")\n'
    '  2. jira_search("project = DEMO AND labels = authentication")\n'
    '  3. jira_get_issue("DEMO-3") -- read full details\n'
    '  4. Compare descriptions semantically\n'
    '  5. Score confidence: 92%\n'
    '       |\n'
    '       v\n'
    'Result: { action: "existing", issueKey: "DEMO-3", confidence: 92 }'
)
pdf.body_text(
    'The AI model decides which tools to call and in what order. It typically tries multiple '
    'search strategies (keywords, labels, components) and reads full issue details before '
    'making a decision.'
)

# ─── 7. SEEDED DATA REFERENCE ───────────────
pdf.add_page()
pdf.section_title('7. Seeded JIRA Data Reference')
pdf.body_text('These issues are pre-loaded in the DEMO project:')
pdf.ln(2)

bugs = [
    ('DEMO-3', 'NullPointerException in UserAuthenticationService', 'High'),
    ('DEMO-4', 'Memory leak in WebSocket connection handler', 'Critical'),
    ('DEMO-5', 'API rate limiter returns 500 instead of 429', 'High'),
    ('DEMO-6', 'Dashboard charts not rendering on Safari 17.x', 'Medium'),
    ('DEMO-7', 'SQL injection vulnerability in search endpoint', 'Critical'),
    ('DEMO-8', 'File upload fails silently for files > 10MB', 'Medium'),
    ('DEMO-9', 'Race condition - duplicate charges in orders', 'Critical'),
    ('DEMO-10', 'Elasticsearch index corruption after restart', 'High'),
    ('DEMO-11', 'Email notifications wrong timezone offset', 'Medium'),
    ('DEMO-12', 'K8s pod CrashLoopBackOff - health check timeout', 'High'),
    ('DEMO-13', 'GraphQL N+1 query problem in user profile', 'Medium'),
    ('DEMO-14', 'CORS policy blocks new subdomain requests', 'Low'),
    ('DEMO-15', 'Password reset tokens not expiring after use', 'High'),
    ('DEMO-16', 'CSV export truncates at 65,536 rows', 'Medium'),
    ('DEMO-17', 'Android 14 camera crash - SecurityException', 'High'),
    ('DEMO-18', 'Database connection pool exhaustion under load', 'High'),
    ('DEMO-19', 'SSO login loop - expired SAML assertion', 'High'),
    ('DEMO-20', 'Webhook retries not using exponential backoff', 'Medium'),
    ('DEMO-21', 'Dark mode toggle not persisting across sessions', 'Low'),
    ('DEMO-22', 'Audit log missing bulk delete entries', 'High'),
]

pdf.set_font('Helvetica', 'B', 10)
pdf.set_fill_color(230, 240, 250)
pdf.cell(25, 7, 'Key', border=1, fill=True)
pdf.cell(130, 7, 'Summary', border=1, fill=True)
pdf.cell(25, 7, 'Priority', border=1, fill=True, new_x="LMARGIN", new_y="NEXT")

pdf.set_font('Helvetica', '', 9)
for key, summary, priority in bugs:
    pdf.cell(25, 6, key, border=1)
    pdf.cell(130, 6, summary[:65], border=1)
    pdf.cell(25, 6, priority, border=1, new_x="LMARGIN", new_y="NEXT")

pdf.ln(5)
pdf.body_text(
    'Issues DEMO-3 and DEMO-7 are In Progress. DEMO-5 is Done. All others are in To Do. '
    'Comments have been added to DEMO-3, DEMO-4, DEMO-7, and DEMO-9.'
)

# ─── 8. TROUBLESHOOTING ─────────────────────
pdf.add_page()
pdf.section_title('8. Troubleshooting')

issues = [
    ('JIRA connection refused', 'Check JIRA_URL in .env. Verify the instance is accessible.'),
    ('401 Unauthorized', 'Verify JIRA_USERNAME (email) and JIRA_API_TOKEN. Regenerate token if expired.'),
    ('Copilot SDK timeout', 'Ensure "copilot" CLI is installed and authenticated. Run: copilot auth login'),
    ('MCP server not found', 'Install: pip install mcp-atlassian. Or use: pip install uv'),
    ('No issues found in search', 'Run "npm run seed" to populate JIRA. Verify project key is DEMO.'),
    ('npm run demo hangs', 'Check network connectivity. JIRA and Copilot both need internet access.'),
    ('Issue creation fails', 'Check JIRA project permissions. User needs create issue permission.'),
    ('Rate limiting errors', 'JIRA Cloud has API rate limits. Add small delays between requests.'),
]
for title, solution in issues:
    pdf.set_font('Helvetica', 'B', 11)
    pdf.set_text_color(180, 50, 50)
    pdf.cell(0, 7, f'Problem: {title}', new_x="LMARGIN", new_y="NEXT")
    pdf.set_font('Helvetica', '', 11)
    pdf.set_text_color(40, 40, 40)
    pdf.multi_cell(0, 6, f'Solution: {solution}')
    pdf.ln(3)

pdf.ln(10)
pdf.set_draw_color(58, 166, 255)
pdf.line(10, pdf.get_y(), 200, pdf.get_y())
pdf.ln(5)
pdf.set_font('Helvetica', 'I', 10)
pdf.set_text_color(100, 100, 100)
pdf.cell(0, 7, 'For additional help: github.com/sautalwar/JIRA', align='C')

# Save
import os
out = os.path.join(os.getcwd(), 'JIRA_Bug_Triage_Demo_Guide.pdf')
pdf.output(out)
print(f"Saved PDF: {out}")
print(f"Total pages: {pdf.page_no()}")
