# Roshan Rozgar (روشن روزگار) — Comprehensive Master DESIGN.md Specification
*The Complete Engineering & Design Architecture Guide for Autonomous Agents & Frontend Engineers*

---

## 1. System Vision & Product Philosophy

**Roshan Rozgar** is a hyper-local skilled trades platform operating across urban Pakistan (initial launch in Islamabad & Rawalpindi). It connects households with vetted local tradespeople (Electricians, Plumbers, HVAC technicians, Carpenters, Painters).

### The Core Design Principle: *"Less is More, Crafted with Dignity"*
1. **Calm, High-End Editorial Minimalism**: Warm natural tones, generous whitespace, refined hairline borders, and zero sensory overload or chaotic clutter.
2. **Pure English Language**: All typography, UI labels, tooltips, placeholders, and communication flows are strictly in English. No Urdu or Roman Urdu script in forms or system labels.
3. **Respect & Human Dignity**: Tradespeople ("Ustad" / Craftsmen) are presented as respected master guild professionals with clear credentials, verified track records, transparent tariffs, and honest reviews.
4. **Predictability & No Hidden Fees**: Fixed visiting/inspection call-out fees, locked digital handshakes, and escrow-backed milestone agreements eliminate haggling friction.
5. **Universal Dual-Device Parity**: Every screen archetype has both a Desktop responsive web version and a Native Mobile app layout (390px portrait).

---

## 2. Global Design Tokens & System Variables

```yaml
design_tokens:
  brand:
    primary: "#0D3B2E"           # Deep Craft Forest Green (Buttons, Active States, Emblems)
    primary_hover: "#08261E"     # Darker Emerald for hover states
    primary_surface: "#E8F0EC"   # Very soft green tint for badges / subtle containers
    accent: "#E06D3B"            # Warm Amber / Terracotta for attention / urgent badges
    accent_subtle: "#FDF4EE"     # Warm cream for urgent callouts
    accent_emerald: "#2D6A4F"    # Mid Emerald for verified checks and online pulses
    
  surfaces:
    canvas_background: "#FAF9F6" # Warm Alabaster / Natural Stone background
    card_background: "#FFFFFF"   # Pure White container cards
    container_low: "#F4F4F0"     # Slightly tinted warm stone for input fields & subtle strips
    container_subtle: "#EFEFEA"  # Inset blocks, code blocks, quote containers
    
  borders:
    hairline: "1px solid #EFEFEA"
    hairline_hover: "1px solid #D5D5CD"
    divider: "1px solid #F0F0EB"
    focus_ring: "2px solid #0D3B2E"

  typography:
    font_primary: "Plus Jakarta Sans, system-ui, -apple-system, sans-serif"
    font_editorial: "Newsreader, serif" # For select large hero headings & craftsman quotes
    weights:
      regular: 400
      medium: 500
      semibold: 600
      bold: 700
    scale:
      display: "40px / 1.15 / font-weight 700 / letter-spacing -0.02em"
      title_large: "28px / 1.25 / font-weight 700 / letter-spacing -0.015em"
      title_medium: "20px / 1.35 / font-weight 600"
      body_large: "16px / 1.55 / font-weight 400"
      body_medium: "14px / 1.5 / font-weight 400"
      caption: "12px / 1.4 / font-weight 500 / letter-spacing 0.02em"
      overline: "11px / 1.3 / font-weight 700 / letter-spacing 0.08em / uppercase"

  radius:
    pill: "9999px"               # Status chips, filter pills, tag badges
    card: "16px"                 # Main surface cards & dashboard panels
    card_small: "12px"           # Inner sub-cards, review blocks, rate boxes
    button: "10px"               # Primary CTA buttons
    input: "10px"                # Text and select inputs

  shadows:
    none: "none"
    subtle: "0 1px 3px rgba(13, 59, 46, 0.04)"
    card_floating: "0 12px 32px rgba(13, 59, 46, 0.06), 0 2px 6px rgba(13, 59, 46, 0.03)"
```

---

## 3. Persistent Layout Archetypes (App Shells)

### Archetype A: Customer Web Standard (`web_standard`)
- **Top Navigation Bar (H: 64px, White, Hairline bottom border)**:
  - Left: `Roshan Rozgar` wordmark (Bold Plus Jakarta Sans, Deep Forest Green `#0D3B2E`) + Neighborhood pill: `Your Neighbourhood: G-10, Islamabad ▾`.
  - Right: Links (`Find a professional`, `My jobs`, `Find work`), Search shortcut, User profile icon (`Salman A.`).
- **Body Container**: `max-w-6xl mx-auto px-6 py-8`.
- **Footer**: Warm minimal footer with copyright, local sector tags, trust badges, and quick support links.

### Archetype B: Pro / Operations Web Dashboard (`web_dashboard`)
- **Left Sidebar (W: 240px, White, Hairline right border)**:
  - Top: `Roshan Rozgar` logo with small green verified network dot.
  - Menu Items: `Overview`, `Active Jobs & Dispatch`, `Worker Adda Hub`, `Security & Escrow Handshake`, `Earnings Ledger`, `Settings`.
  - Bottom: Active Session profile status badge with live ping.
- **Top Bar**: Live connection status (`Islamabad District Central · Connected`), direct emergency helpline (`Hotline: 0800-ROSHAN`), notifications bell, profile switcher.

### Archetype C: Centered Focus Web Blank (`web_blank`)
- Completely distraction-free, no global navigation, centered viewport card (`max-w-md` or `max-w-xl`), soft alabaster background. Used for Authentication, Password Reset, and Verification flows.

### Archetype D: Mobile Tab Frame (`mobile_tab`)
- **Status Header**: Clean app bar with wordmark, current neighborhood badge, notification bell, profile icon.
- **Bottom Navigation Bar (H: 64px, Fixed Bottom)**:
  - 4 Navigation items: `Discover` (Compass), `Activity` (Hammer/Wrench), `Messages` (Chat bubble), `Profile` (User circle).

### Archetype E: Mobile Stack Frame (`mobile_stack`)
- Header with clear Back arrow (`←`), bold center/left title (e.g. `Tradesperson Profile`, `Job Workspace`), and secondary action icon. NO bottom tab bar. Sticky action CTA pinned at the bottom above safe area.

---

## 4. Comprehensive Screen-by-Screen Specifications

Below is the complete blueprint covering every screen in the system—both the core journey and the complete product suite.

---

### MODULE 1: AUTHENTICATION & ACCESS

#### Screen 001: Authentication — Login & Signup
- **Device Support**: Desktop & Mobile
- **Archetype**: `web_blank` (Desktop) / `mobile_stack` (Mobile)
- **Primary Goal**: Frictionless, secure access with simple username/email and password credentials.
- **Layout & Structure**:
  - Centered card (`max-w-md mx-auto bg-white rounded-2xl border border-[#EFEFEA] p-8`).
  - Top Brand Mark: Solid deep emerald rounded square with leaf emblem + `Roshan Rozgar`.
  - Subtitle: *"On-demand verified skilled trades across Islamabad & Rawalpindi"*.
  - Role Switcher Tabs: `Customer` vs `Service Pro`.
  - Auth Mode Switcher: `Log In` / `Create Account`.
  - Form Fields:
    - Input 1: `Username or Email` (Placeholder: `salman@example.com`).
    - Input 2: `Password` (with eye icon to toggle visibility).
    - Helper row: Checkbox `Remember this device` + Link `Forgot password?`.
  - Primary CTA Button: Full-width Forest Green `Log In →`.
  - Alternative Access Divider: `OR CONTINUE WITH`.
  - Quick SSO Buttons: `Google Account` and `National ID (CNIC) Fast-Track`.
  - Footer Trust Text: *"256-bit Bank Grade Escrow Protection · Terms of Service & Privacy Policy"*.

#### Screen 002: Password Reset & Account Recovery
- **Device Support**: Desktop & Mobile
- **Archetype**: `web_blank`
- **Layout & Structure**:
  - Centered card: Back link `← Return to login`.
  - Header: `Reset your password`.
  - Copy: *"Enter your registered email address or mobile number to receive a secure recovery link."*
  - Form Input: `Email or Mobile Number`.
  - Primary Button: `Send Recovery Link →`.
  - Confirmation Toast/Panel: 4-digit code entry with 60-second resend countdown.

---

### MODULE 2: CUSTOMER DISCOVERY & PROBLEM INTAKE

#### Screen 003: Customer Discovery & Hero
- **Device Support**: Desktop & Mobile
- **Archetype**: `web_standard` (Desktop) / `mobile_tab` (Mobile)
- **Key Visual Elements**:
  - Eyebrow: `• YOUR NEIGHBOURHOOD. YOUR PEOPLE.`
  - Hero Title: `Good work. Close to home.*` (Desktop: 44px Newsreader/Plus Jakarta; Mobile: 32px).
  - Subtitle: *"From a leaking tap to a light that won't turn on. Find skilled people nearby who know how to help."*
  - Social Proof Avatar Stack: 3 customer headshots + badge *"Real skills. Neighbourhood connections. Clear prices. A conversation before a commitment."*
  - Problem Intake Search Box:
    - Card: `What needs a helping hand?`
    - Input field with search icon: *"Describe your issue (e.g. leaking sink, trip breaker)..."*
    - Primary Button: `Find professional →`.
  - Trade Taxonomy Filter Bar (Horizontal scroll on mobile):
    - `All services` (Active, `#0D3B2E` filled, white text)
    - `Plumber`, `Electrician`, `AC technician`, `Carpenter`, `Painter`.
  - Nearby Professionals Grid (3-column on desktop, vertical list on mobile):
    - Each Card:
      - Headshot photo with green dot + `Available now` chip + Save bookmark icon.
      - Worker Name: e.g. `Aslam Mehmood` (Verified badge).
      - Category & Proximity: `Plumber · G-10 · 0.8km away`.
      - Rating: `★ 4.9 (34 reviews)`.
      - Skill chips: `[Leak repairs]` `[Fittings]`.
      - Performance Metrics: `38 completed jobs · 12 yrs exp`.
      - Transparent Tariff Callout: `Standard visiting fee: Inspection from Rs 500` with circular arrow link.
  - Three-Step Educational Guide:
    - `01 Tell us what's wrong`: Type the issue in your own words.
    - `02 Talk it through. Agree a price`: Direct message with your pro. Upfront fixed price.
    - `03 Get it done. Pass on the trust`: Pay only when satisfied.
  - Pro Conversion Banner:
    - Forest green textured card: *"Good at your work? Let your neighbourhood know. Join as a professional →"*.

#### Screen 004: Hyper-Local Interactive Map & Sector Directory
- **Device Support**: Desktop & Mobile
- **Archetype**: `web_standard` (Desktop) / `mobile_tab` (Mobile)
- **Layout & Structure**:
  - Two-pane split view (Desktop: 60% Map, 40% Pro List; Mobile: Toggle switch between `List` and `Map`).
  - Interactive stylized vector map: Soft warm alabaster map tiles with green radius zones centered on user's sector (`G-10, G-9, F-7, Blue Area`).
  - Map Pins: Custom pins showing trade icon (Wrench/Bolt) and photo thumbnail with live pulse indicator.
  - Bottom Drawer / Floating Card: Selected craftsman quick-preview card with direct `Book Inspection` CTA.

#### Screen 005: AI Fault Diagnosis & Instant Estimate
- **Device Support**: Desktop & Mobile
- **Archetype**: `web_standard` (Desktop) / `mobile_stack` (Mobile)
- **Layout & Structure**:
  - Header: `AI Fault Diagnosis & Transparent Estimates`.
  - Left Intake Column:
    - Photo Upload Zone: Drag-and-drop or camera capture for appliances, distribution boards, or pipe leaks.
    - Problem Description Textarea: *"What happened? Any burning smell, unusual noise, or water dripping?"*
    - Symptom Checkboxes: `[Water Dripping]` `[Fuse Tripping]` `[Sparking]` `[No Power]`.
    - Button: `Analyze Issue & Estimate Tariff →`.
  - Right Estimate Column (AI Analysis Output Card):
    - Diagnostic Match: `Probable issue: Single-pole MCB Breaker Overload`.
    - Confidence score: `94% match based on 210+ Islamabad service records`.
    - Fair Market Tariff Breakdown:
      - `Call-out & Inspection`: `Rs. 500`
      - `Estimated Labor (MCB Replacement)`: `Rs. 400 - 600`
      - `Estimated Genuine Parts (Schneider 32A)`: `Rs. 1,100 - 1,300`
      - `Estimated Total`: `Rs. 2,000 - 2,400`
    - CTA: `Dispatch Nearby Electrician with Matching Parts →`.

---

### MODULE 3: WORKER PROFILE & DIRECT BOOKING

#### Screen 006: Tradesperson Profile & Rate Card
- **Device Support**: Desktop & Mobile
- **Archetype**: `web_standard` (Desktop) / `mobile_stack` (Mobile)
- **Layout & Structure**:
  - Hero Header Profile Card:
    - Large craftsman portrait (e.g. Aslam Mehmood).
    - Status pill: `Available now` (Green dot).
    - Title: `Aslam Mehmood` (Verified Guild Checkmark).
    - Subtitle: `Master Plumber · 12 years experience · G-10, Islamabad (~0.8km away)`.
    - Overall rating: `★ 4.9 (34 verified reviews)`.
  - Key Metric Ribbon (3 equal cards):
    - Card 1: `38` Completed jobs
    - Card 2: `12 yrs` Verified experience
    - Card 3: `G-10` Primary base area
  - Editorial Bio Section:
    - Eyebrow: `THE PERSON BEHIND THE WORK`
    - Quote Card: *"I believe in doing the small things properly. I'll listen to the problem, explain what needs doing, and agree on the cost before starting."*
    - Specialization Tags: `[Leak repairs]`, `[Pipe fittings]`, `[Geyser servicing]`, `[Drain unblocking]`.
  - Transparent Tariff Standard Card:
    - Title: `STANDARD RATE CARD (ISLAMABAD TARIFF)`
    - `Inspection / Diagnosis Fee`: `Rs. 500` (Covers travel and full electrical/plumbing inspection).
    - `Hourly Labor / Base Repair`: `Rs. 800 - 1,200`
    - Note: *"Any replacement hardware or materials require your explicit written approval before purchase."*
  - Verified Community Reviews List:
    - Customer review card: `Sana K. (Recent booking · Sector G-10) · ★★★★★`
    - Text: *"Explained the issue clearly and checked the price with us before starting. The small details made the difference."*
    - Trust badges: `[Price Honoured]`, `[Clear Communication]`, `[Cleaned Work Area]`.
  - Right Sticky Booking Column (Desktop) / Pinned Bottom Sheet (Mobile):
    - Title: `Start with a conversation. Let's get it sorted.`
    - Callout: `Inspection visit from Rs 500`.
    - Terms Checklist:
      - `✓ Serves Sector G-9, G-10, G-11`
      - `✓ Timing agreed directly in your chat`
      - `✓ Scope and price locked before any work starts`
    - Primary CTA: `Request Aslam →`.
    - Secondary Action: `Save for later`.

---

### MODULE 4: REAL-TIME NEGOTIATION, AGREEMENT & DISPATCH

#### Screen 007: Job & Agreement Workspace
- **Device Support**: Desktop & Mobile
- **Archetype**: `web_standard` (Desktop) / `mobile_stack` (Mobile)
- **Layout & Structure**:
  - Context Header:
    - Job Reference: `YOUR JOB WORKSPACE · ORDER #WSR-1042 · G-10 ISLAMABAD`.
    - Title: `A little leak. A clear plan.`
    - Status Badge: Amber pill `Waiting for your approval`.
  - 4-Stage Milestone Stepper:
    - `1. Request Shared (Completed)` → `2. Quote Review (Active)` → `3. Booking Confirmed` → `4. Work Completed`.
  - Two-Column Workspace (Desktop) / Tabbed or Vertical Flow (Mobile):
    - Left Column: Direct Negotiation Message Stream:
      - Worker greeting bubble: *"Hello! Can you tell me a little more about the tap leak?"*
      - Customer explanation bubble: *"The kitchen tap is leaking continuously near the base ring."*
      - Worker scope & tariff message: *"I can help. For replacing the tap washer and cleaning the spindle, labor is Rs 800. Materials are separate, and I'll ask before buying anything."*
      - Embedded Formal Quote Card:
        - Header: `FORMAL QUOTE · Action Needed`
        - Title: `Kitchen tap repair` | `Labour Fee: Rs 800`
        - Terms: `Standard 7-day guarantee · Est. 30–45 mins · Price locked upon approval`.
      - Message Input Composer: Text field with Send button and paperclip attachment icon.
    - Right Column: Formal Service Agreement Card:
      - Title: `Your agreement. No surprises. Just the details that matter.`
      - Scope items table:
        - `Job`: Kitchen tap repair
        - `When`: Today, 12:00 – 1:00 PM
        - `Pricing`: Fixed labor
      - Cost Box: `Agreed labour: Rs 800` (Orange checkmark).
      - Caveat: *"Materials are separate. Any extra cost needs your approval first."*
      - Primary CTA Button: Full-width `Accept quote & lock →`.
      - Security note: *"Your approval holds the funds securely in escrow until completion."*

#### Screen 008: Worker Incoming Dispatch & Price Negotiation Modal
- **Device Support**: Desktop & Mobile
- **Archetype**: `web_dashboard` (Desktop) / `mobile_stack` (Mobile)
- **Layout & Structure**:
  - Urgent Dispatch Alert Banner:
    - Red/Amber pulse dot: `URGENT DISPATCH · 1.4 km Proximity`.
    - Title: `New Electrician Job Request Nearby`.
    - Auto-reassign countdown clock: `00:39s remaining`.
  - Customer & Fault Detail Card:
    - Customer: `Tariq Farooq (Sector F-7/2, Islamabad · Tier 1 Client)`.
    - Reported Issue: *"Distribution board breaker overheating and smelling like burnt plastic."*
    - Attached Photo: Thumbnail preview `Distribution_Panel.jpg` with `[Examine]` button.
  - Price Acceptance & Stepper Adjuster:
    - Standard Algorithmic Base Rate: `Rs. 950 (Labor Diagnostic)`.
    - Price Adjustment Controls: Button `[-100]` | Input `Rs. 950` | Button `[+100]`.
    - Written Reason Box (if adjusted): *"Distribution board requires 3-phase load test and terminal re-torque."*
  - Action Controls:
    - Primary CTA: `Accept Job at Rs. 950 →` (Deep Forest Green).
    - Secondary CTA: `Submit Counter-Offer` (Light Stone).
    - Tertiary link: `Pass / Decline (Transfer to next standby craftsman)`.

---

### MODULE 5: ACTIVE EXECUTION & ON-SITE VERIFICATION

#### Screen 009: Live Active Job & En Route Tracking
- **Device Support**: Desktop & Mobile
- **Archetype**: `web_standard` (Desktop) / `mobile_stack` (Mobile)
- **Layout & Structure**:
  - Live Status Banner: Green pulse `Technician En Route · Arriving in 6 mins`.
  - Vector Map Route: Shows technician's motorcycle icon moving towards customer residence in Sector F-7/2.
  - Craftsman Card:
    - Portrait, Name: `Ustad Asif Mehmood` (Master Electrician · 4.92★).
    - Quick Actions: `Call via App`, `Send Message`.
  - Handshake Verification Box (High Priority Card):
    - Heading: `START VERIFICATION OTP`.
    - Big 4-Digit Display: `[ 4 ] [ 8 ] [ 2 ] [ 1 ]`.
    - Security instruction: *"Share this one-time code verbally only when the technician arrives at your door."*
  - Escrow Protection Badge: `Rs. 950 held in escrow. Payout released only upon your final signature.`

#### Screen 010: Job Activation & On-Site Handshake (Worker Cockpit)
- **Device Support**: Desktop & Mobile
- **Archetype**: `web_dashboard` (Desktop) / `mobile_stack` (Mobile)
- **Layout & Structure**:
  - Status: `Arrived at Customer Location · Session ISB-9284-EL`.
  - OTP Entry Card:
    - Title: `Customer Handshake OTP`.
    - Instructions: *"Enter the 4-digit code provided verbally by the homeowner to confirm on-site presence."*
    - 4 large input boxes: `[ 4 ] [ 8 ] [ 2 ] [ 1 ]` with green `Verified Handshake` checkmark.
  - Live Work Telemetry Stopwatch:
    - Active timer display: `00 : 14 : 35` (Elapsed Diagnostic & Repair Time).
    - Synchronized Escrow Clock.
  - Pre-Work Safety Protocol Checklist (Interactive switches):
    - `✓ Main circuit breaker isolated and confirmed de-energized`
    - `✓ Insulated 1000V rated tools deployed`
    - `✓ Customer informed of diagnostic scope and agreed fee`
  - Job Completion Pipeline:
    - Action 1: `Upload Proof-of-Work Photo` (Required to request release).
    - Action 2: `Complete Job & Request Payment Handshake →`.
    - Emergency Help: `Emergency Adda Support Line (Direct 0800-ROSHAN)`.

---

### MODULE 6: COMPLETION, TRUST & POST-JOB AUDIT

#### Screen 011: Verified Trust, Post-Job Summary & Customer Review
- **Device Support**: Desktop & Mobile
- **Archetype**: `web_standard` (Desktop) / `mobile_stack` (Mobile)
- **Layout & Structure**:
  - Header: `Transparent Summary & Community Reviews`.
  - Job Badge: `JOB #ISB-9284-EL COMPLETED · Escrow Protected`.
  - Before & After Photographic Verification:
    - Left Photo: `BEFORE INTERVENTION` (Overheated 32A breaker with fused terminal lugs).
    - Right Photo: `COMPLETED & SEALED` (Installed genuine Schneider Acti9 32A breaker in neat tidy conduit).
    - Badges: `[Inspected & Load Tested (238V Stable)]`, `[100% Debris Cleaned]`, `[30-Day Labor Guarantee]`.
  - Transparent Payment Ledger:
    - `Diagnostic & Panel Safety Inspection`: `Rs. 600`
    - `Breaker Replacement & Busbar Labor`: `Rs. 350`
    - `Genuine Schneider Acti9 32A MCB (Verified QR)`: `Rs. 1,200`
    - **Total Settled via Escrow**: **`Rs. 2,150 PKR`**
    - Action: `Download Receipt PDF`.
  - Customer Feedback Card:
    - Heading: `Leave a review for Asif`.
    - Star Rating Selector: 5 gold stars.
    - Tag Pills: `[# Punctual]`, `[# Clean Work]`, `[# Fair Pricing]`, `[# Genuine Parts]`.
    - Feedback Textarea: *"Write a short review for your neighbours..."*
    - Primary CTA: `Submit Verified Review →`.
  - Recent Neighbourhood Reviews Feed:
    - Real reviews from Tariq Farooq (F-7/2), Maryam Khan (G-9/1), and Zainab Abbasi (Bahria Town).

---

### MODULE 7: WORKER ONBOARDING & BUSINESS DASHBOARD

#### Screen 012: Craftsman Multi-Step Profile Setup (Desktop & Mobile)
- **Device Support**: Desktop & Mobile
- **Archetype**: `web_standard` (Desktop) / `mobile_stack` (Mobile)
- **Layout & Structure**:
  - Stepper: `Step 1 of 3: 33% Completed` (`1. Basic Profile & Trade` → `2. Rates & Availability` → `3. Verification`).
  - Form Fields:
    - Photo Avatar Uploader with `Change Photo` link.
    - `Full Name`: e.g. `Muhammad Tariq`.
    - `Primary Trade / Skill`: Select dropdown (`Master Electrician`, `Plumber`, etc.).
    - `Experience (Years)`: Number input (e.g. `8 Years Active`).
    - `Primary Service Area`: Multiselect / text (`Sector F-7 & F-8, Islamabad`).
  - Standard Rate Card Inputs:
    - `Visit / Inspection Fee`: `Rs. 500` (Call-out base fee).
    - `Standard Repair Rate (Hourly / Base)`: `Rs. 1,200`.
  - Guarantee & Credential Summary Textarea:
    - *"Certified master electrician with over 8 years experience in residential switchgear and inverter wiring."*
  - CTA Button: `Save & Continue →`.

#### Screen 013: Worker Dashboard & "Adda" Hub
- **Device Support**: Desktop & Mobile
- **Archetype**: `web_dashboard` (Desktop) / `mobile_tab` (Mobile)
- **Layout & Structure**:
  - Top Greeting & Status:
    - Headshot, `Assalam o alaikum, Aslam` (or Tariq).
    - Online Toggle Switch: `ONLINE & READY FOR JOBS` (Bright green pill).
    - Base: `Adda Base: G-9 Markaz Karachi Company, Islamabad`.
  - 4 Metric Highlight Cards:
    - `Today's Earnings`: `Rs. 3,850` (3 completed jobs today)
    - `Weekly Settlement`: `Rs. 24,500` (Auto-transferred to JazzCash/EasyPaisa)
    - `Acceptance Rate`: `96%` (+2.1% from last month)
    - `Neighbourhood Score`: `4.92 ★` (Based on 184 client reviews)
  - Adda Live Sector Radar:
    - Sector demand bars: `Sector F-7 (6 Unclaimed Requests)`, `Sector F-6 (4 Requests)`, `Sector G-9 (2 Requests)`.
    - Real-time radial range: `6.5 km radius active`.
  - Recent Jobs Ledger:
    - Table of completed jobs with IDs, service names, payment status (`Paid`), and amounts (`Rs. 950`, `Rs. 600`, `Rs. 1,400`).
  - Approved Flat Rate Standard Guide:
    - Standard reference prices for diagnostic visits, breaker swaps, and geyser thermostat servicing.

---

### MODULE 8: CUSTOMER DASHBOARD & ACCOUNT MANAGEMENT

#### Screen 014: Customer Home Dashboard
- **Device Support**: Desktop & Mobile
- **Archetype**: `web_dashboard` (Desktop) / `mobile_tab` (Mobile)
- **Layout & Structure**:
  - Header: `Good afternoon, Salman` (`Sector F-7/2, Islamabad · Verified Residence`).
  - Quick Action Button: `+ Book a Trade`.
  - 3 Overview Cards:
    - `Active Requests`: `01` (Asif Mehmood en route)
    - `Completed Repairs`: `08` (Lifetime residential services)
    - `Escrow Protected Spend`: `Rs. 14,200` (Held & cleared securely)
  - Active Dispatch Order Spotlight:
    - Title: `Electrical Surge Diagnostic & Breaker Replacement`.
    - Technician: Asif Mehmood (Arrival in 6 mins).
    - Arrival OTP Card: Large bold `4 8 2 1`.
    - Quick actions: `Track Live on Map`, `Call via App`.
  - Recent Booking History List:
    - `Water Geyser Thermostat Repair` (Rs. 850 · Completed 12 Oct) → `[View Receipt]` `[Review]`
    - `Inverter AC Gas Leak Inspection` (Rs. 1,200 · Completed 28 Sep) → `[View Receipt]` `[Review]`
    - `Kitchen Socket Rewiring` (Rs. 600 · Completed 14 Aug) → `[View Receipt]` `[Review]`
  - Instant Repair Intelligence Banner:
    - *"Have a broken appliance? Snap a photo or type symptoms to get a market quote instantly."*

#### Screen 015: Customer Settings & Neighborhood Preferences
- **Device Support**: Desktop & Mobile
- **Archetype**: `web_standard` (Desktop) / `mobile_stack` (Mobile)
- **Layout & Structure**:
  - Sidebar/Tab links: `Profile`, `Home Addresses`, `Payment & Escrow`, `Emergency Contacts`, `Notifications`.
  - Verified Address Card:
    - Primary: `House 14, Street 28, Sector F-7/2, Islamabad`.
    - Sub-sectors: `Sector G-10/4 Flat B-2`.
    - Add new address button.
  - Payment Preferences: Default Escrow release authorization via Raast, JazzCash, EasyPaisa, or Visa/Mastercard.

---

## 5. UI Component Library Specifications

### Buttons
- **Primary CTA**:
  ```html
  <button class="bg-[#0D3B2E] hover:bg-[#08261E] text-white font-medium text-sm px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm">
    <span>Action Title</span>
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
  </button>
  ```
- **Secondary Action**:
  ```html
  <button class="bg-white hover:bg-[#F4F4F0] text-[#1E293B] border border-[#EFEFEA] font-medium text-sm px-5 py-3 rounded-lg transition-all">
    Cancel / Details
  </button>
  ```

### Status Chips & Badges
- **Available Now**:
  ```html
  <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#E8F5E9] text-[#1B5E20]">
    <span class="w-2 h-2 rounded-full bg-[#2E7D32] animate-pulse"></span>
    Available now
  </span>
  ```
- **Escrow Protected**:
  ```html
  <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#FAF9F6] text-[#0D3B2E] border border-[#EFEFEA]">
    <svg class="w-3.5 h-3.5 text-[#0D3B2E]" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clip-rule="evenodd"/></svg>
    Escrow Protected
  </span>
  ```

### Form Input Fields
- **Standard Input**:
  ```html
  <div class="space-y-1.5">
    <label class="block text-xs font-bold uppercase tracking-wider text-[#475569]">Full Name</label>
    <input type="text" class="w-full bg-[#F4F4F0] focus:bg-white text-[#0F172A] border border-[#EFEFEA] focus:border-[#0D3B2E] focus:ring-1 focus:ring-[#0D3B2E] rounded-lg px-4 py-3 text-sm outline-none transition-all" placeholder="Enter full name" />
  </div>
  ```

---

## 6. Implementation Rules for Autonomous Agents

1. **Strictly English-Only**: Autonomous agents generating screens MUST NOT inject Urdu or Roman Urdu phrases into form labels, instructions, navigation, or system badges. Keep copy polished, crisp, and editorial.
2. **Never Overcrowd Viewports**: Always maintain generous padding (`p-6` or `p-8` on cards), clear margins (`gap-6`), and uncluttered layouts. Avoid excessive decorative gradients, floating confetti, or flashy animations.
3. **Preserve Color Hierarchy**:
   - Canvas background: Always `#FAF9F6`.
   - Card surfaces: Always pure `#FFFFFF`.
   - Dominant brand color: Always `#0D3B2E`.
   - Accent amber: Use sparingly for urgent timers and pending approval badges (`#E06D3B`).
4. **Use Actual Data & Pakistani Sector Realism**:
   - Cities: Islamabad & Rawalpindi.
   - Sectors: F-6, F-7, F-8, G-9, G-10, G-11, Blue Area, Bahria Town, DHA Islamabad.
   - Currency: Pakistani Rupees (`Rs.` or `PKR`).
   - Phone formats: `+92 300 1234567`.
5. **Mobile First Responsive Parity**:
   - Single-column linear layout on mobile (`<640px`).
   - Minimum tap target size of 44x44px for buttons and touch elements.
   - Sticky bottom action bars for mobile checkout and agreement acceptance.
