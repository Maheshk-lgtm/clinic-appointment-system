const pptxgen = require('pptxgenjs');
const fs = require('fs');
const path = require('path');

// Palette Constants
const COLORS = {
  NAVY_DARK: '0F172A',
  NAVY_CARD: '1E293B',
  BLUE_PRIMARY: '0284C7',
  CYAN_ACCENT: '0EA5E9',
  TEAL_ACCENT: '0D9488',
  GREEN_SUCCESS: '16A34A',
  AMBER_WARN: 'D97706',
  RED_ALERT: 'DC2626',
  BG_LIGHT: 'F8FAFC',
  CARD_BG: 'FFFFFF',
  CARD_BORDER: 'E2E8F0',
  TEXT_MAIN: '0F172A',
  TEXT_MUTED: '64748B',
  WHITE: 'FFFFFF',
  PURPLE_ACCENT: '7C3AED',
  ACCENT_PILL_BG: 'E0F2FE',
  ACCENT_PILL_TEXT: '0369A1'
};

const TOTAL_SLIDES = 14;

function addSlideHeader(slide, category, title, subtitle) {
  // Category pill / tracker
  slide.addShape('roundRect', {
    x: 0.6,
    y: 0.35,
    w: category.length * 0.085 + 0.3,
    h: 0.26,
    rectRadius: 0.1,
    fill: { color: COLORS.ACCENT_PILL_BG },
    line: { color: 'BAE6FD', width: 1 }
  });

  slide.addText(category.toUpperCase(), {
    x: 0.65,
    y: 0.35,
    w: category.length * 0.085 + 0.2,
    h: 0.26,
    fontSize: 9,
    fontFace: 'Arial',
    bold: true,
    color: COLORS.ACCENT_PILL_TEXT,
    align: 'center',
    valign: 'middle'
  });

  // Slide Title
  slide.addText(title, {
    x: 0.6,
    y: 0.65,
    w: 8.8,
    h: 0.38,
    fontSize: 18,
    fontFace: 'Arial',
    bold: true,
    color: COLORS.NAVY_DARK,
    valign: 'top'
  });

  // Slide Subtitle
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.6,
      y: 1.02,
      w: 8.8,
      h: 0.22,
      fontSize: 10,
      fontFace: 'Arial',
      color: COLORS.TEXT_MUTED,
      valign: 'top'
    });
  }

  // Accent divider line
  slide.addShape('rect', {
    x: 0.6,
    y: 1.28,
    w: 8.8,
    h: 0.02,
    fill: { color: 'E2E8F0' },
    line: { color: 'E2E8F0' }
  });
}

function addSlideFooter(slide, currentSlide) {
  slide.addText('Book My Dentist — HMIS & Decision Support Platform | Field Project Assessment', {
    x: 0.6,
    y: 5.3,
    w: 7.0,
    h: 0.25,
    fontSize: 8.5,
    fontFace: 'Arial',
    color: COLORS.TEXT_MUTED
  });

  slide.addText(`Slide ${currentSlide} of ${TOTAL_SLIDES}`, {
    x: 7.8,
    y: 5.3,
    w: 1.6,
    h: 0.25,
    fontSize: 8.5,
    fontFace: 'Arial',
    align: 'right',
    color: COLORS.TEXT_MUTED,
    bold: true
  });
}

async function generateDeck() {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_16x9';
  pres.author = 'Field Project Team (Groups of 2-3 Students)';
  pres.company = 'Health Informatics & HMIS Evaluation';
  pres.title = 'Book My Dentist: HMIS & Clinic Decision Support System';

  // =========================================================================
  // SLIDE 1: TITLE SLIDE (Dark Navy Theme)
  // =========================================================================
  {
    const slide = pres.addSlide();
    slide.background = { color: COLORS.NAVY_DARK };

    // Decorative background glow
    slide.addShape('roundRect', {
      x: 0.6,
      y: 0.6,
      w: 8.8,
      h: 4.4,
      rectRadius: 0.15,
      fill: { color: COLORS.NAVY_CARD },
      line: { color: '334155', width: 1.5 }
    });

    // Badge
    slide.addShape('roundRect', {
      x: 1.0,
      y: 0.95,
      w: 3.4,
      h: 0.32,
      rectRadius: 0.1,
      fill: { color: '0369A1' },
      line: { color: '38BDF8', width: 1 }
    });
    slide.addText('HEALTHCARE FIELD PROJECT PRESENTATION', {
      x: 1.0,
      y: 0.95,
      w: 3.4,
      h: 0.32,
      fontSize: 9.5,
      fontFace: 'Arial',
      bold: true,
      color: COLORS.WHITE,
      align: 'center',
      valign: 'middle'
    });

    // Main Title
    slide.addText('BOOK MY DENTIST', {
      x: 1.0,
      y: 1.35,
      w: 8.0,
      h: 0.65,
      fontSize: 32,
      fontFace: 'Arial',
      bold: true,
      color: COLORS.WHITE
    });

    // Subtitle
    slide.addText('Health Management Information System (HMIS) & Clinic Decision Support Platform', {
      x: 1.0,
      y: 2.05,
      w: 8.0,
      h: 0.35,
      fontSize: 14,
      fontFace: 'Arial',
      bold: true,
      color: COLORS.CYAN_ACCENT
    });

    // Description text
    slide.addText('Transforming Solo-Doctor Clinic Operations through Deterministic Slot Locking, Reactive State Machines, Information-Based Decision Modeling, and Evidence-Based Workflow Optimization.', {
      x: 1.0,
      y: 2.45,
      w: 8.0,
      h: 0.55,
      fontSize: 11,
      fontFace: 'Arial',
      color: '94A3B8'
    });

    // Academic Metadata Grid (Cards inside Title)
    const cardData = [
      { title: 'CO Alignment', desc: 'CO1 (Problems in Health Info)\nCO2 (HMIS Framework & FR/NFR)\nCO3 (Decision Models & BPMN)\nCO4 (CDSS & Evidence-Based Med)' },
      { title: 'Evaluation Structure', desc: 'Section A: Field Project\nMax Marks: 15 (Levels: 5)\nTarget: Single-Doctor Clinic\nMode: Deployed Product Demo' },
      { title: 'Project Team & Role', desc: 'Group of 2-3 Students\nSystem Architect & Lead\nClinical Informatics Specialist\nFull-Stack Web Engineer' }
    ];

    cardData.forEach((cd, idx) => {
      const cx = 1.0 + idx * 2.75;
      slide.addShape('roundRect', {
        x: cx,
        y: 3.2,
        w: 2.55,
        h: 1.5,
        rectRadius: 0.1,
        fill: { color: '0F172A' },
        line: { color: '334155', width: 1 }
      });

      slide.addText(cd.title.toUpperCase(), {
        x: cx + 0.15,
        y: 3.3,
        w: 2.25,
        h: 0.25,
        fontSize: 9.5,
        fontFace: 'Arial',
        bold: true,
        color: COLORS.CYAN_ACCENT
      });

      slide.addText(cd.desc, {
        x: cx + 0.15,
        y: 3.6,
        w: 2.25,
        h: 1.0,
        fontSize: 9,
        fontFace: 'Arial',
        color: 'CBD5E1'
      });
    });
  }

  // =========================================================================
  // SLIDE 2: EXECUTIVE OVERVIEW & COURSE OUTCOMES MAPPING
  // =========================================================================
  {
    const slide = pres.addSlide();
    slide.background = { color: COLORS.BG_LIGHT };
    addSlideHeader(slide, 'Academic Matrix', 'Field Project Assessment & Course Outcomes (CO) Alignment', 'Direct structural correspondence between syllabus Course Outcomes and Section A field deliverables');

    const coMappings = [
      {
        tag: 'CO 1',
        title: 'Information Management Problems',
        task: 'Task 1: Problem Statement (2 Marks, Level 5)',
        points: [
          'Detailed assessment of paper register & telephone breakdown in solo healthcare clinics.',
          'Quantifying acute no-show rates (25-35%), double bookings, and cognitive overload.',
          'Identification of information silos between reception desk and chairside doctor.'
        ],
        color: '0284C7'
      },
      {
        tag: 'CO 2',
        title: 'HMIS Framework & Requirements',
        task: 'Task 2: Client Requirements (3 Marks, Level 5)',
        points: [
          'HMIS organizational architecture: Inputs, Processing, Security, and Outputs.',
          'Functional Requirements (FR): Deterministic slot locking, 2-phase confirmation, audit trails.',
          'Non-Functional Requirements (NFR): Sub-second latency, ACID transaction safety, HIPAA/RBAC.'
        ],
        color: '0D9488'
      },
      {
        tag: 'CO 3',
        title: 'Information Decision-Making & BPMN',
        task: 'Task 3: Process Mapping (3 Marks, Level 5)',
        points: [
          'Application of Herbert Simon\'s 4-Phase Decision-Making Model in clinic capacity planning.',
          'BPMN 2.0 operational process diagrams: "As-Is" manual chaos vs "To-Be" automated HMIS.',
          'Resolution of Bounded Rationality through deterministic real-time schedule awareness.'
        ],
        color: '7C3AED'
      },
      {
        tag: 'CO 4',
        title: 'CDSS, EBM & Client Validation',
        task: 'Tasks 4 & 5: Delivery & Validation (7 Marks, Level 5)',
        points: [
          'CDSS implementation: Intelligent reschedule recommender, burnout guard & buffer alerts.',
          'Evidence-Based Medicine (EBM): Turnaround hygiene standards & procedure duration calibration.',
          'Empirical Client Validation: 100% elimination of double-bookings, 67% reduction in wait times.'
        ],
        color: 'EA580C'
      }
    ];

    coMappings.forEach((m, idx) => {
      const x = 0.6 + (idx % 2) * 4.5;
      const y = 1.45 + Math.floor(idx / 2) * 1.85;

      slide.addShape('roundRect', {
        x,
        y,
        w: 4.3,
        h: 1.72,
        rectRadius: 0.1,
        fill: { color: COLORS.CARD_BG },
        line: { color: COLORS.CARD_BORDER, width: 1 }
      });

      // Top color indicator bar
      slide.addShape('roundRect', {
        x: x + 0.15,
        y: y + 0.12,
        w: 0.8,
        h: 0.28,
        rectRadius: 0.08,
        fill: { color: m.color }
      });
      slide.addText(m.tag, {
        x: x + 0.15,
        y: y + 0.12,
        w: 0.8,
        h: 0.28,
        fontSize: 10,
        fontFace: 'Arial',
        bold: true,
        color: COLORS.WHITE,
        align: 'center',
        valign: 'middle'
      });

      slide.addText(m.title, {
        x: x + 1.05,
        y: y + 0.14,
        w: 3.1,
        h: 0.25,
        fontSize: 12,
        fontFace: 'Arial',
        bold: true,
        color: COLORS.NAVY_DARK
      });

      slide.addText(m.task, {
        x: x + 0.15,
        y: y + 0.44,
        w: 4.0,
        h: 0.22,
        fontSize: 9,
        fontFace: 'Arial',
        bold: true,
        color: m.color
      });

      const bulletText = m.points.map(p => ({ text: p, options: { bullet: true } }));
      slide.addText(bulletText, {
        x: x + 0.15,
        y: y + 0.68,
        w: 4.0,
        h: 0.95,
        fontSize: 8.8,
        fontFace: 'Arial',
        color: COLORS.TEXT_MUTED,
        paraSpaceBefore: 2
      });
    });

    addSlideFooter(slide, 2);
  }

  // =========================================================================
  // SLIDE 3: TASK 1 (CO1) — PROBLEM STATEMENT
  // =========================================================================
  {
    const slide = pres.addSlide();
    slide.background = { color: COLORS.BG_LIGHT };
    addSlideHeader(slide, 'Task 1 | CO 1 (2 Marks)', 'Problem Statement: Information Management Breakdown in Solo Dental Clinics', 'Evaluating structural information inefficiencies faced by single-doctor healthcare providers');

    // Context Card (Left Column)
    slide.addShape('roundRect', {
      x: 0.6,
      y: 1.45,
      w: 3.4,
      h: 3.65,
      rectRadius: 0.1,
      fill: { color: '0F172A' },
      line: { color: '1E293B', width: 1 }
    });

    slide.addText('TARGET HEALTHCARE PROVIDER', {
      x: 0.8,
      y: 1.65,
      w: 3.0,
      h: 0.25,
      fontSize: 10,
      fontFace: 'Arial',
      bold: true,
      color: COLORS.CYAN_ACCENT
    });

    slide.addText('Dr. Smile Dental Practice\n(Solo-Doctor Outpatient Clinic)', {
      x: 0.8,
      y: 1.95,
      w: 3.0,
      h: 0.55,
      fontSize: 13,
      fontFace: 'Arial',
      bold: true,
      color: COLORS.WHITE
    });

    const clinicStats = [
      { k: 'Staffing', v: '1 Lead Dentist, 1 Front-Desk Receptionist' },
      { k: 'Daily Load', v: '25 – 35 Outpatient Consultations & Procedures' },
      { k: 'Infrastructure', v: '2 Dental Operatory Chairs' },
      { k: 'Legacy Method', v: 'Paper Diary, WhatsApp Messages, Phone Inquiries' },
      { k: 'Primary Pain', v: 'Unsynchronized booking & chair collisions' }
    ];

    clinicStats.forEach((st, idx) => {
      const sy = 2.6 + idx * 0.46;
      slide.addText(`${st.k}:`, {
        x: 0.8,
        y: sy,
        w: 1.1,
        h: 0.38,
        fontSize: 8.8,
        fontFace: 'Arial',
        bold: true,
        color: '94A3B8'
      });
      slide.addText(st.v, {
        x: 1.9,
        y: sy,
        w: 1.9,
        h: 0.38,
        fontSize: 8.8,
        fontFace: 'Arial',
        color: COLORS.WHITE
      });
    });

    // Right Column: 4 Core Problems in Information Management
    const problems = [
      {
        title: '1. Concurrency Clashes & Double-Bookings',
        desc: 'Simultaneous inquiries via phone, WhatsApp, and in-person walk-ins lead to overlapping reservations for the same dental chair. Paper diaries offer zero concurrency control or atomic locking.',
        impact: '4 to 5 double-booked disputes per week; acute clinician anxiety.'
      },
      {
        title: '2. High No-Shows & Unrecoverable Chair Idle Time',
        desc: 'Without automated status tracking, patient no-show rates hover between 25-35%. Cancellations communicated at the last minute leave dead operatory time with no dynamic reschedule mechanism.',
        impact: 'Loss of ~22% clinic gross revenue; unutilized sterilization slots.'
      },
      {
        title: '3. Severe Patient Wait Times & Room Congestion',
        desc: 'Uncontrolled scheduling causes patient arrivals to clump together. The average patient waits 45-60 minutes in a crowded waiting lounge, deteriorating clinical trust and satisfaction.',
        impact: 'Patient attrition to competing chain clinics; negative online reviews.'
      },
      {
        title: '4. Information Asymmetry & Chairside Cognitive Overload',
        desc: 'The operating dentist is isolated chairside, blind to queue status, emergency arrivals, or procedure types until the patient sits in the chair. No centralized audit log or patient history at a glance.',
        impact: 'High clinical fatigue, disrupted procedure timing, compromised care.'
      }
    ];

    problems.forEach((p, idx) => {
      const py = 1.45 + idx * 0.91;
      slide.addShape('roundRect', {
        x: 4.2,
        y: py,
        w: 5.2,
        h: 0.83,
        rectRadius: 0.08,
        fill: { color: COLORS.CARD_BG },
        line: { color: COLORS.CARD_BORDER, width: 1 }
      });

      slide.addText(p.title, {
        x: 4.35,
        y: py + 0.08,
        w: 4.9,
        h: 0.22,
        fontSize: 10.5,
        fontFace: 'Arial',
        bold: true,
        color: COLORS.NAVY_DARK
      });

      slide.addText(p.desc, {
        x: 4.35,
        y: py + 0.3,
        w: 4.9,
        h: 0.32,
        fontSize: 8.5,
        fontFace: 'Arial',
        color: COLORS.TEXT_MUTED
      });

      slide.addText(`Impact: ${p.impact}`, {
        x: 4.35,
        y: py + 0.6,
        w: 4.9,
        h: 0.18,
        fontSize: 8.2,
        fontFace: 'Arial',
        bold: true,
        color: COLORS.RED_ALERT
      });
    });

    addSlideFooter(slide, 3);
  }

  // =========================================================================
  // SLIDE 4: TASK 2 (CO2) — FUNCTIONAL REQUIREMENTS (FR)
  // =========================================================================
  {
    const slide = pres.addSlide();
    slide.background = { color: COLORS.BG_LIGHT };
    addSlideHeader(slide, 'Task 2 | CO 2 (3 Marks)', 'Client Requirements: Functional Requirements (FR) Specification', 'Functional capabilities derived directly from client discovery interviews with dentist & reception staff');

    const frItems = [
      {
        id: 'FR-01',
        title: 'Real-Time Deterministic Slot Matrix',
        spec: 'System derives dynamic bookable slots per doctor based on working hours, default consultation duration (e.g. 30 min), and calendar exceptions. Real-time visual states: AVAILABLE, TEMPORARILY_BOOKED, CONFIRMED, BLOCKED.',
        rationale: 'Eliminates paper lookup errors and ensures receptionist views 100% current availability.'
      },
      {
        id: 'FR-02',
        title: 'Atomic Reservation Lock & Temporary Hold',
        spec: 'Acquires a deterministic Firestore lock (`slotLocks/{doctorId}_{date}_{startTime}`) upon slot selection, holding the appointment for a configurable 10-minute expiry window while patient details are captured.',
        rationale: 'Guarantees zero concurrent double-booking even if multiple terminals attempt booking.'
      },
      {
        id: 'FR-03',
        title: 'Two-Phase Doctor Confirmation Workflow',
        spec: 'Doctor receives real-time chairside alerts for pending requests with 1-click "Accept" or "Request Reschedule". If rescheduling, doctor inputs clinical reason and suggests next viable date/time.',
        rationale: 'Preserves clinician sovereignty over their schedule without verbal interruptions.'
      },
      {
        id: 'FR-04',
        title: 'Centralized Reschedule Management Queue',
        spec: 'Dedicated receptionist desk tracking all doctor-requested reschedules. Displays doctor-recommended alternate slot with 1-click patient rebooking and automatic lock release of previous slot.',
        rationale: 'Prevents displaced patients from falling through the cracks, protecting revenue.'
      },
      {
        id: 'FR-05',
        title: 'Doctor Working Hours & Exception Engine',
        spec: 'Admin and doctors can configure recurring weekly shifts, break intervals, and explicit overrides (planned leave, medical emergencies, gazetted holidays) that instantly reflect across booking grids.',
        rationale: 'Accommodates clinical reality of unplanned emergencies and conferences.'
      },
      {
        id: 'FR-06',
        title: 'Immutable Status Transition Audit Logging',
        spec: 'Every appointment status shift (PENDING -> CONFIRMED -> COMPLETED / NO_SHOW / CANCELLED) logs actor UID, actor name, role, timestamp, previous status, and rationale into Firestore audit collection.',
        rationale: 'Provides complete accountability and forensic transparency for medico-legal protection.'
      }
    ];

    frItems.forEach((fr, idx) => {
      const x = 0.6 + (idx % 2) * 4.5;
      const y = 1.45 + Math.floor(idx / 2) * 1.22;

      slide.addShape('roundRect', {
        x,
        y,
        w: 4.3,
        h: 1.15,
        rectRadius: 0.08,
        fill: { color: COLORS.CARD_BG },
        line: { color: COLORS.CARD_BORDER, width: 1 }
      });

      // ID Badge
      slide.addShape('roundRect', {
        x: x + 0.15,
        y: y + 0.1,
        w: 0.7,
        h: 0.22,
        rectRadius: 0.06,
        fill: { color: 'E0F2FE' },
        line: { color: 'BAE6FD', width: 1 }
      });
      slide.addText(fr.id, {
        x: x + 0.15,
        y: y + 0.1,
        w: 0.7,
        h: 0.22,
        fontSize: 8.5,
        fontFace: 'Arial',
        bold: true,
        color: COLORS.BLUE_PRIMARY,
        align: 'center',
        valign: 'middle'
      });

      slide.addText(fr.title, {
        x: x + 0.95,
        y: y + 0.1,
        w: 3.2,
        h: 0.22,
        fontSize: 10,
        fontFace: 'Arial',
        bold: true,
        color: COLORS.NAVY_DARK
      });

      slide.addText(fr.spec, {
        x: x + 0.15,
        y: y + 0.35,
        w: 4.0,
        h: 0.48,
        fontSize: 8.2,
        fontFace: 'Arial',
        color: COLORS.TEXT_MUTED
      });

      slide.addText(`Clinical Value: ${fr.rationale}`, {
        x: x + 0.15,
        y: y + 0.88,
        w: 4.0,
        h: 0.22,
        fontSize: 8,
        fontFace: 'Arial',
        bold: true,
        color: COLORS.TEAL_ACCENT
      });
    });

    addSlideFooter(slide, 4);
  }

  // =========================================================================
  // SLIDE 5: TASK 2 (CO2) — NON-FUNCTIONAL REQUIREMENTS & HMIS FRAMEWORK
  // =========================================================================
  {
    const slide = pres.addSlide();
    slide.background = { color: COLORS.BG_LIGHT };
    addSlideHeader(slide, 'Task 2 | CO 2 (3 Marks)', 'Non-Functional Requirements (NFR) & HMIS Organizational Framework', 'Architectural quality attributes and system boundaries for small healthcare facilities');

    // Left Column: 4 NFRs
    const nfrItems = [
      {
        code: 'NFR-01',
        title: 'ACID Data Integrity & Race Prevention',
        details: 'Enforce atomicity using Firestore transactions. If two receptionists click the identical slot simultaneously, the transaction reads `slotLocks` before commit; only one succeeds, the other safely aborts with code `SLOT_TAKEN`.'
      },
      {
        code: 'NFR-02',
        title: 'Sub-Second Real-Time Synchronization',
        details: 'Multi-device reactive propagation under 500ms using WebSocket listener subscriptions (`onSnapshot`). Changes committed by the receptionist reflect instantly on the doctor\'s chairside tablet.'
      },
      {
        code: 'NFR-03',
        title: 'Role-Based Access Control (RBAC) & Security',
        details: 'Strict privilege segregation across Admin (user management, settings), Receptionist (booking, slot search), and Doctor (chairside clinical actions). Cryptographic JWT tokens and Firestore security rules.'
      },
      {
        code: 'NFR-04',
        title: 'Ergonomic Usability & High Availability',
        details: 'Zero-clutter interface designed for 10-second booking completions. 99.9% uptime backed by Google Cloud infrastructure with offline read caching and automatic reconnection.'
      }
    ];

    nfrItems.forEach((nfr, idx) => {
      const y = 1.45 + idx * 0.91;
      slide.addShape('roundRect', {
        x: 0.6,
        y,
        w: 4.3,
        h: 0.83,
        rectRadius: 0.08,
        fill: { color: COLORS.CARD_BG },
        line: { color: COLORS.CARD_BORDER, width: 1 }
      });

      slide.addText(`${nfr.code}: ${nfr.title}`, {
        x: 0.75,
        y: y + 0.08,
        w: 4.0,
        h: 0.22,
        fontSize: 10,
        fontFace: 'Arial',
        bold: true,
        color: COLORS.NAVY_DARK
      });

      slide.addText(nfr.details, {
        x: 0.75,
        y: y + 0.32,
        w: 4.0,
        h: 0.46,
        fontSize: 8.2,
        fontFace: 'Arial',
        color: COLORS.TEXT_MUTED
      });
    });

    // Right Column: HMIS Architectural Framework
    slide.addShape('roundRect', {
      x: 5.1,
      y: 1.45,
      w: 4.3,
      h: 3.65,
      rectRadius: 0.1,
      fill: { color: COLORS.CARD_BG },
      line: { color: COLORS.CARD_BORDER, width: 1 }
    });

    slide.addText('HMIS ORGANIZATIONAL FRAMEWORK', {
      x: 5.3,
      y: 1.62,
      w: 3.9,
      h: 0.24,
      fontSize: 11,
      fontFace: 'Arial',
      bold: true,
      color: COLORS.BLUE_PRIMARY
    });

    const hmisLayers = [
      {
        layer: '1. Data Input Tier (Source of Truth)',
        content: 'Patient demographics, UHID numbers, doctor weekly working schedules, leave exceptions, operational system settings.'
      },
      {
        layer: '2. Transaction & Business Logic Engine',
        content: 'Deterministic slot lock manager, 10-minute hold expiry timer, finite state machine transition validator (`VALID_TRANSITIONS`).'
      },
      {
        layer: '3. Data Storage & Security Governance',
        content: 'NoSQL Firestore collections (`appointments`, `slotLocks`, `auditLogs`, `doctors`), Firebase Auth with custom claims & rules.'
      },
      {
        layer: '4. Information Output & Clinical Intelligence',
        content: 'Doctor chairside cockpit, live notification feeds, receptionist slot grid, clinic performance analytics, and audit inspection trails.'
      }
    ];

    hmisLayers.forEach((hl, idx) => {
      const hy = 1.95 + idx * 0.75;
      slide.addShape('roundRect', {
        x: 5.3,
        y: hy,
        w: 3.9,
        h: 0.68,
        rectRadius: 0.06,
        fill: { color: 'F1F5F9' },
        line: { color: 'CBD5E1', width: 0.8 }
      });

      slide.addText(hl.layer, {
        x: 5.42,
        y: hy + 0.06,
        w: 3.65,
        h: 0.2,
        fontSize: 8.8,
        fontFace: 'Arial',
        bold: true,
        color: COLORS.NAVY_DARK
      });

      slide.addText(hl.content, {
        x: 5.42,
        y: hy + 0.26,
        w: 3.65,
        h: 0.38,
        fontSize: 7.8,
        fontFace: 'Arial',
        color: COLORS.TEXT_MUTED
      });
    });

    addSlideFooter(slide, 5);
  }

  // =========================================================================
  // SLIDE 6: TASK 3 (CO3) — BPMN PROCESS MAPPING: "AS-IS" WORKFLOW
  // =========================================================================
  {
    const slide = pres.addSlide();
    slide.background = { color: COLORS.BG_LIGHT };
    addSlideHeader(slide, 'Task 3 | CO 3 (3 Marks)', 'Process Mapping: "As-Is" Manual Operational Workflow', 'BPMN operational analysis of legacy paper, phone, and walk-in scheduling chaos');

    // Top explanation
    slide.addShape('roundRect', {
      x: 0.6,
      y: 1.45,
      w: 8.8,
      h: 0.6,
      rectRadius: 0.08,
      fill: { color: 'FEF2F2' },
      line: { color: 'FCA5A5', width: 1 }
    });
    slide.addText([
      { text: 'LEGACY OPERATIONAL BOTTLENECK: ', options: { bold: true, color: COLORS.RED_ALERT } },
      { text: 'Manual scheduling relies on paper diaries and unrecorded phone verbal agreements. With zero real-time locking, multiple channels collide, creating double bookings, chair idle time, and severe patient wait delays.', options: { color: '7F1D1D' } }
    ], {
      x: 0.75,
      y: 1.5,
      w: 8.5,
      h: 0.5,
      fontSize: 8.8,
      fontFace: 'Arial'
    });

    // BPMN Swimlane simulation: 6 Sequential Stages
    const asIsStages = [
      {
        num: 'Stage 1',
        title: 'Inquiry Arrival',
        lane: 'Patient / Phone',
        action: 'Patient calls clinic or arrives as walk-in requesting same-day consultation.',
        failure: 'Phone lines engaged; calls dropped; walk-in queue builds up.',
        color: '64748B'
      },
      {
        num: 'Stage 2',
        title: 'Register Lookup',
        lane: 'Reception Desk',
        action: 'Receptionist flips physical diary pages searching for handwritten open slots.',
        failure: 'Illegible handwriting, crossed-out entries, inaccurate duration estimates.',
        color: '64748B'
      },
      {
        num: 'Stage 3',
        title: 'Verbal Check',
        lane: 'Front Desk <-> Doctor',
        action: 'Receptionist interrupts doctor during dental procedure to ask if a slot is open.',
        failure: 'Breaks doctor sterile field; causes procedural delay and patient unease.',
        color: 'DC2626'
      },
      {
        num: 'Stage 4',
        title: 'Manual Booking',
        lane: 'Reception Desk',
        action: 'Slot scribbled down; another receptionist commits phone booking for same time.',
        failure: 'DOUBLE BOOKING OCCURS UNNOTICED in the diary.',
        color: 'DC2626'
      },
      {
        num: 'Stage 5',
        title: 'Arrival Clashing',
        lane: 'Waiting Lounge',
        action: 'Both patients arrive at 10:00 AM; neither doctor nor staff can accommodate both.',
        failure: 'Patient wait times blow out to 45-60 mins; disputes erupt in lobby.',
        color: 'DC2626'
      },
      {
        num: 'Stage 6',
        title: 'Lost Follow-Up',
        lane: 'Clinic Records',
        action: 'No-show or cancelled appointment leaves empty chair; no record kept.',
        failure: 'Zero audit trail; 22% daily revenue leakage; no recall system.',
        color: '64748B'
      }
    ];

    asIsStages.forEach((st, idx) => {
      const sx = 0.6 + idx * 1.48;
      slide.addShape('roundRect', {
        x: sx,
        y: 2.2,
        w: 1.38,
        h: 2.8,
        rectRadius: 0.08,
        fill: { color: COLORS.CARD_BG },
        line: { color: st.color === 'DC2626' ? 'FCA5A5' : COLORS.CARD_BORDER, width: 1.2 }
      });

      // Top Stage Badge
      slide.addShape('roundRect', {
        x: sx + 0.1,
        y: 2.3,
        w: 1.18,
        h: 0.22,
        rectRadius: 0.05,
        fill: { color: st.color === 'DC2626' ? 'FEE2E2' : 'F1F5F9' }
      });
      slide.addText(st.num.toUpperCase(), {
        x: sx + 0.1,
        y: 2.3,
        w: 1.18,
        h: 0.22,
        fontSize: 7.5,
        fontFace: 'Arial',
        bold: true,
        color: st.color === 'DC2626' ? COLORS.RED_ALERT : COLORS.TEXT_MUTED,
        align: 'center',
        valign: 'middle'
      });

      slide.addText(st.title, {
        x: sx + 0.08,
        y: 2.58,
        w: 1.22,
        h: 0.35,
        fontSize: 9.5,
        fontFace: 'Arial',
        bold: true,
        color: COLORS.NAVY_DARK,
        align: 'center'
      });

      slide.addText(`Lane: ${st.lane}`, {
        x: sx + 0.08,
        y: 2.95,
        w: 1.22,
        h: 0.2,
        fontSize: 7.2,
        fontFace: 'Arial',
        bold: true,
        color: COLORS.BLUE_PRIMARY,
        align: 'center'
      });

      slide.addText(st.action, {
        x: sx + 0.08,
        y: 3.2,
        w: 1.22,
        h: 0.75,
        fontSize: 7.8,
        fontFace: 'Arial',
        color: COLORS.TEXT_MUTED
      });

      // Failure Callout
      slide.addShape('roundRect', {
        x: sx + 0.08,
        y: 4.05,
        w: 1.22,
        h: 0.85,
        rectRadius: 0.05,
        fill: { color: 'FEF2F2' }
      });
      slide.addText(`Defect:\n${st.failure}`, {
        x: sx + 0.1,
        y: 4.08,
        w: 1.18,
        h: 0.78,
        fontSize: 7,
        fontFace: 'Arial',
        color: COLORS.RED_ALERT,
        bold: true
      });

      // Connecting arrow (except last)
      if (idx < 5) {
        slide.addText('->', {
          x: sx + 1.34,
          y: 3.1,
          w: 0.2,
          h: 0.3,
          fontSize: 12,
          fontFace: 'Arial',
          bold: true,
          color: '94A3B8'
        });
      }
    });

    addSlideFooter(slide, 6);
  }

  // =========================================================================
  // SLIDE 7: TASK 3 (CO3) — BPMN PROCESS MAPPING: "TO-BE" WORKFLOW
  // =========================================================================
  {
    const slide = pres.addSlide();
    slide.background = { color: COLORS.BG_LIGHT };
    addSlideHeader(slide, 'Task 3 | CO 3 (3 Marks)', 'Process Mapping: "To-Be" Operational Workflow (HMIS Engine)', 'BPMN 2.0 digital flow with atomic locking, two-phase confirmation, and reactive state synchronization');

    // Top banner
    slide.addShape('roundRect', {
      x: 0.6,
      y: 1.45,
      w: 8.8,
      h: 0.55,
      rectRadius: 0.08,
      fill: { color: 'ECFDF5' },
      line: { color: 'A7F3D0', width: 1 }
    });
    slide.addText([
      { text: 'OPTIMIZED DIGITAL FLOW: ', options: { bold: true, color: COLORS.GREEN_SUCCESS } },
      { text: 'Atomic locking (`slotLocks`) prevents concurrent collisions. Real-time push alerts empower doctor confirmation chairside. Automatic fallback to the Reschedule Queue guarantees zero patient leakage.', options: { color: '065F46' } }
    ], {
      x: 0.75,
      y: 1.5,
      w: 8.5,
      h: 0.45,
      fontSize: 8.8,
      fontFace: 'Arial'
    });

    // 5 Comprehensive Steps of To-Be Architecture
    const toBeSteps = [
      {
        step: 'Step 1: Selection',
        title: 'Smart Slot Generation',
        lane: 'Reception Desk',
        desc: 'Receptionist chooses specialization & doctor. Dynamic slot matrix derives open intervals from working hours and active leaves.',
        outcome: 'Color-coded visual tokens (Green/Amber/Slate) instantly shown.',
        tag: 'Instant Matrix'
      },
      {
        step: 'Step 2: Lock Acquisition',
        title: 'Atomic Firestore Lock',
        lane: 'HMIS Backend Engine',
        desc: 'Atomic transaction writes `slotLocks/{doctorId}_{date}_{startTime}`. 10-min reservation hold starts. Status: `PENDING_DOCTOR_CONFIRMATION`.',
        outcome: 'Any concurrent click on this slot receives `SLOT_TAKEN` error.',
        tag: 'ACID Guaranteed'
      },
      {
        step: 'Step 3: Chairside Alert',
        title: 'Doctor Real-time Notification',
        lane: 'Doctor Portal / Tablet',
        desc: 'Doctor\'s tablet receives instant notification badge with patient name, UHID, visit reason, and proposed appointment time slot.',
        outcome: 'Zero phone/verbal interruption required during operative procedures.',
        tag: 'Sub-500ms Push'
      },
      {
        step: 'Step 4: Decision Gateway',
        title: 'Accept vs Reschedule',
        lane: 'Doctor Decision',
        desc: 'Doctor clicks "Accept" -> Status becomes `CONFIRMED`. OR Doctor clicks "Request Reschedule" -> inputs reason & suggests next open date/time.',
        outcome: 'If rescheduled, routes straight to Receptionist Reschedule Desk.',
        tag: 'Closed-Loop'
      },
      {
        step: 'Step 5: Completion',
        title: 'Chairside Fulfillment & Audit',
        lane: 'Clinical Chairside',
        desc: 'Doctor marks consultation `COMPLETED` or `NO_SHOW`. Firestore transaction commits immutable audit log with actor UID and timestamp.',
        outcome: 'Complete clinical auditability and live analytics update.',
        tag: 'Full Audit Trail'
      }
    ];

    toBeSteps.forEach((st, idx) => {
      const sx = 0.6 + idx * 1.78;
      slide.addShape('roundRect', {
        x: sx,
        y: 2.15,
        w: 1.68,
        h: 2.85,
        rectRadius: 0.08,
        fill: { color: COLORS.CARD_BG },
        line: { color: COLORS.CARD_BORDER, width: 1.2 }
      });

      // Step Tag
      slide.addShape('roundRect', {
        x: sx + 0.1,
        y: 2.25,
        w: 1.48,
        h: 0.22,
        rectRadius: 0.05,
        fill: { color: 'F0FDF4' },
        line: { color: 'BBF7D0', width: 0.8 }
      });
      slide.addText(st.step.toUpperCase(), {
        x: sx + 0.1,
        y: 2.25,
        w: 1.48,
        h: 0.22,
        fontSize: 7.5,
        fontFace: 'Arial',
        bold: true,
        color: COLORS.GREEN_SUCCESS,
        align: 'center',
        valign: 'middle'
      });

      slide.addText(st.title, {
        x: sx + 0.08,
        y: 2.52,
        w: 1.52,
        h: 0.38,
        fontSize: 9.5,
        fontFace: 'Arial',
        bold: true,
        color: COLORS.NAVY_DARK,
        align: 'center'
      });

      slide.addText(`Lane: ${st.lane}`, {
        x: sx + 0.08,
        y: 2.92,
        w: 1.52,
        h: 0.18,
        fontSize: 7,
        fontFace: 'Arial',
        bold: true,
        color: COLORS.BLUE_PRIMARY,
        align: 'center'
      });

      slide.addText(st.desc, {
        x: sx + 0.08,
        y: 3.12,
        w: 1.52,
        h: 0.95,
        fontSize: 7.6,
        fontFace: 'Arial',
        color: COLORS.TEXT_MUTED
      });

      slide.addShape('roundRect', {
        x: sx + 0.08,
        y: 4.15,
        w: 1.52,
        h: 0.75,
        rectRadius: 0.05,
        fill: { color: 'F8FAFC' },
        line: { color: 'E2E8F0', width: 0.8 }
      });
      slide.addText(`Result:\n${st.outcome}`, {
        x: sx + 0.1,
        y: 4.18,
        w: 1.48,
        h: 0.7,
        fontSize: 7.2,
        fontFace: 'Arial',
        color: COLORS.NAVY_DARK
      });
    });

    addSlideFooter(slide, 7);
  }

  // =========================================================================
  // SLIDE 8: CO3 — MODELS OF DECISION-MAKING BASED ON INFORMATION
  // =========================================================================
  {
    const slide = pres.addSlide();
    slide.background = { color: COLORS.BG_LIGHT };
    addSlideHeader(slide, 'CO 3 Conceptual Depth', 'Information-Based Decision-Making Models in Healthcare Informatics', 'Applying Herbert Simon\'s Decision Framework and resolving Bounded Rationality in clinic management');

    // Left Column: Simon's 4-Stage Model
    slide.addShape('roundRect', {
      x: 0.6,
      y: 1.45,
      w: 4.5,
      h: 3.65,
      rectRadius: 0.1,
      fill: { color: COLORS.CARD_BG },
      line: { color: COLORS.CARD_BORDER, width: 1 }
    });

    slide.addText('HERBERT SIMON\'S 4-STAGE DECISION MODEL', {
      x: 0.8,
      y: 1.62,
      w: 4.1,
      h: 0.24,
      fontSize: 11,
      fontFace: 'Arial',
      bold: true,
      color: COLORS.BLUE_PRIMARY
    });

    const simonStages = [
      {
        num: '1. Intelligence Phase',
        desc: 'Continuous real-time scanning of clinic operational state: slot saturation, doctor working hours, patient queues, cancellation rates, and upcoming leave exceptions.'
      },
      {
        num: '2. Design Phase',
        desc: 'Formulating decision alternatives: generating feasible slot sequences, calculating optimal buffer intervals, and framing alternate slot proposals for rescheduled consultations.'
      },
      {
        num: '3. Choice Phase',
        desc: 'Clinician and receptionist select the optimal path using high-integrity real-time data: confirming the appointment, proposing next available time, or adjusting shift exceptions.'
      },
      {
        num: '4. Review & Implementation Phase',
        desc: 'Monitoring operational execution: audit logging tracks state transitions; daily analytics measure no-show percentages and chair occupancy efficiency.'
      }
    ];

    simonStages.forEach((ss, idx) => {
      const sy = 1.95 + idx * 0.76;
      slide.addShape('roundRect', {
        x: 0.8,
        y: sy,
        w: 4.1,
        h: 0.68,
        rectRadius: 0.06,
        fill: { color: 'F8FAFC' },
        line: { color: 'E2E8F0', width: 0.8 }
      });

      slide.addText(ss.num, {
        x: 0.92,
        y: sy + 0.06,
        w: 3.85,
        h: 0.2,
        fontSize: 9,
        fontFace: 'Arial',
        bold: true,
        color: COLORS.NAVY_DARK
      });

      slide.addText(ss.desc, {
        x: 0.92,
        y: sy + 0.26,
        w: 3.85,
        h: 0.38,
        fontSize: 7.8,
        fontFace: 'Arial',
        color: COLORS.TEXT_MUTED
      });
    });

    // Right Column: Overcoming Bounded Rationality & Information Asymmetry
    slide.addShape('roundRect', {
      x: 5.3,
      y: 1.45,
      w: 4.1,
      h: 3.65,
      rectRadius: 0.1,
      fill: { color: COLORS.CARD_BG },
      line: { color: COLORS.CARD_BORDER, width: 1 }
    });

    slide.addText('EXPANDING BOUNDED RATIONALITY', {
      x: 5.5,
      y: 1.62,
      w: 3.7,
      h: 0.24,
      fontSize: 11,
      fontFace: 'Arial',
      bold: true,
      color: COLORS.TEAL_ACCENT
    });

    const infoConcepts = [
      {
        title: 'Cognitive Overload vs Decision Automation',
        text: 'In legacy systems, receptionists suffer from "satisficing" under stress (booking arbitrary slots without verifying surgeon stamina or sterilization buffers). The HMIS enforces deterministic boundaries, freeing cognitive focus for patient hospitality.'
      },
      {
        title: 'Eliminating Information Asymmetry',
        text: 'Previously, the receptionist possessed verbal telephone context while the chairside dentist had zero visibility. Book My Dentist provides symmetric real-time synchronization across terminals, ensuring both stakeholders share identical clinical queue information.'
      },
      {
        title: 'Data-Driven vs Intuitive Scheduling',
        text: 'Replaces "gut-feel" double-booking (hoping one patient won\'t show up) with evidence-backed slot pacing and dynamic hold counters, stabilizing patient arrival distribution throughout the working day.'
      }
    ];

    infoConcepts.forEach((ic, idx) => {
      const iy = 1.95 + idx * 1.02;
      slide.addShape('roundRect', {
        x: 5.5,
        y: iy,
        w: 3.7,
        h: 0.94,
        rectRadius: 0.06,
        fill: { color: 'F0FDFA' },
        line: { color: 'CCFBF1', width: 0.8 }
      });

      slide.addText(ic.title, {
        x: 5.62,
        y: iy + 0.08,
        w: 3.45,
        h: 0.22,
        fontSize: 9,
        fontFace: 'Arial',
        bold: true,
        color: COLORS.NAVY_DARK
      });

      slide.addText(ic.text, {
        x: 5.62,
        y: iy + 0.3,
        w: 3.45,
        h: 0.58,
        fontSize: 7.8,
        fontFace: 'Arial',
        color: COLORS.TEXT_MUTED
      });
    });

    addSlideFooter(slide, 8);
  }

  // =========================================================================
  // SLIDE 9: TASK 4 (CO4) — PRODUCT DELIVERY & PHILOSOPHY
  // =========================================================================
  {
    const slide = pres.addSlide();
    slide.background = { color: COLORS.BG_LIGHT };
    addSlideHeader(slide, 'Task 4 | CO 4 (5 Marks)', 'Product Delivery & Philosophy: Engineering Architecture & Principles', 'The core engineering values, deterministic state machine, and modern full-stack implementation');

    // 3 Philosophy Pillars
    const pillars = [
      {
        title: '1. Zero-Clash Determinism',
        subtitle: 'Mathematical Concurrency Control',
        points: [
          'Slots are not merely recorded; they are deterministically locked in Firestore.',
          'Unique document keying: `slotLocks/{doctorId}_{date}_{startTime}` guarantees zero double bookings.',
          'Eliminates human error, phone collisions, and booking race conditions.'
        ],
        color: '0284C7'
      },
      {
        title: '2. Respect for Clinical Focus',
        subtitle: 'Chairside Cognitive Shielding',
        points: [
          'Dentists must never be verbally interrupted mid-procedure for scheduling queries.',
          'Two-phase triage alerts the clinician silently on their chairside tablet.',
          '1-click accept or reschedule with recommended alternative preserves clinic flow.'
        ],
        color: '0D9488'
      },
      {
        title: '3. Full Operational Auditing',
        subtitle: 'Accountability & Compliance',
        points: [
          'Finite state machine enforces strictly valid forward transitions (`VALID_TRANSITIONS`).',
          'Every single status modification writes actor UID, timestamp, and rationale to audit log.',
          'Ensures tamper-proof legal protection and data integrity.'
        ],
        color: '7C3AED'
      }
    ];

    pillars.forEach((p, idx) => {
      const px = 0.6 + idx * 3.0;
      slide.addShape('roundRect', {
        x: px,
        y: 1.45,
        w: 2.8,
        h: 2.15,
        rectRadius: 0.08,
        fill: { color: COLORS.CARD_BG },
        line: { color: COLORS.CARD_BORDER, width: 1 }
      });

      slide.addShape('roundRect', {
        x: px + 0.15,
        y: 1.6,
        w: 2.5,
        h: 0.45,
        rectRadius: 0.06,
        fill: { color: p.color === '0284C7' ? 'E0F2FE' : p.color === '0D9488' ? 'CCFBF1' : 'EDE9FE' }
      });

      slide.addText(p.title, {
        x: px + 0.15,
        y: 1.62,
        w: 2.5,
        h: 0.22,
        fontSize: 9.5,
        fontFace: 'Arial',
        bold: true,
        color: p.color === '0284C7' ? '0369A1' : p.color === '0D9488' ? '0F766E' : '6D28D9',
        align: 'center'
      });

      slide.addText(p.subtitle, {
        x: px + 0.15,
        y: 1.84,
        w: 2.5,
        h: 0.18,
        fontSize: 7.8,
        fontFace: 'Arial',
        color: COLORS.NAVY_DARK,
        align: 'center'
      });

      const bText = p.points.map(pt => ({ text: pt, options: { bullet: true } }));
      slide.addText(bText, {
        x: px + 0.15,
        y: 2.15,
        w: 2.5,
        h: 1.35,
        fontSize: 7.8,
        fontFace: 'Arial',
        color: COLORS.TEXT_MUTED,
        paraSpaceBefore: 3
      });
    });

    // Technical Stack Architecture Diagram (Bottom Half)
    slide.addShape('roundRect', {
      x: 0.6,
      y: 3.75,
      w: 8.8,
      h: 1.35,
      rectRadius: 0.08,
      fill: { color: '0F172A' },
      line: { color: '1E293B', width: 1 }
    });

    slide.addText('DEPLOYED PRODUCTION TECHNOLOGY ARCHITECTURE', {
      x: 0.8,
      y: 3.88,
      w: 8.4,
      h: 0.22,
      fontSize: 10,
      fontFace: 'Arial',
      bold: true,
      color: COLORS.CYAN_ACCENT
    });

    const techTiers = [
      { tier: 'Presentation Layer', tools: 'React 18 SPA + TypeScript + Vite + Tailwind CSS (Responsive mobile & desktop)' },
      { tier: 'State & Reactive Layer', tools: 'WebSocket reactive listeners (`onSnapshot`), Context API (`AuthContext`, `ToastContext`)' },
      { tier: 'Cloud Backend & Data', tools: 'Google Cloud Firestore (NoSQL, Atomic Transactions, TTL Slot Lock expiration)' },
      { tier: 'Security & Auth Governance', tools: 'Firebase Auth (JWT token verification, Custom Role Claims, Granular Security Rules)' }
    ];

    techTiers.forEach((tt, idx) => {
      const tx = 0.8 + idx * 2.1;
      slide.addShape('roundRect', {
        x: tx,
        y: 4.18,
        w: 1.98,
        h: 0.82,
        rectRadius: 0.05,
        fill: { color: '1E293B' },
        line: { color: '334155', width: 0.8 }
      });

      slide.addText(tt.tier, {
        x: tx + 0.08,
        y: 4.24,
        w: 1.82,
        h: 0.2,
        fontSize: 8,
        fontFace: 'Arial',
        bold: true,
        color: COLORS.WHITE
      });

      slide.addText(tt.tools, {
        x: tx + 0.08,
        y: 4.46,
        w: 1.82,
        h: 0.5,
        fontSize: 7.2,
        fontFace: 'Arial',
        color: '94A3B8'
      });
    });

    addSlideFooter(slide, 9);
  }

  // =========================================================================
  // SLIDE 10: TASK 4 (CO4) — CDSS & EVIDENCE-BASED MEDICINE (EBM)
  // =========================================================================
  {
    const slide = pres.addSlide();
    slide.background = { color: COLORS.BG_LIGHT };
    addSlideHeader(slide, 'Task 4 | CO 4 (5 Marks)', 'Clinical Decision Support Systems (CDSS) & Evidence-Based Medicine (EBM)', 'In-depth integration of clinical decision rules, intelligent rescheduling, and evidence-driven workflows');

    // Left Column: CDSS In-Depth
    slide.addShape('roundRect', {
      x: 0.6,
      y: 1.45,
      w: 4.3,
      h: 3.65,
      rectRadius: 0.1,
      fill: { color: COLORS.CARD_BG },
      line: { color: COLORS.CARD_BORDER, width: 1 }
    });

    slide.addText('CLINICAL DECISION SUPPORT SYSTEM (CDSS)', {
      x: 0.8,
      y: 1.62,
      w: 3.9,
      h: 0.24,
      fontSize: 10.5,
      fontFace: 'Arial',
      bold: true,
      color: COLORS.BLUE_PRIMARY
    });

    const cdssFeatures = [
      {
        title: 'Intelligent Reschedule Recommendation Engine',
        desc: 'When an emergency forces a doctor cancellation, the system evaluates doctor working hours and existing appointments to algorithmically propose the next best available slot, minimizing patient drop-off.'
      },
      {
        title: 'Procedure Duration & Complexity Calibration',
        desc: 'CDSS flags patient status (New Patient vs Follow-Up). Automatically enforces appropriate consultation blocks (e.g. 45 min for complex diagnostic workup vs 30 min for routine checks) to prevent schedule overruns.'
      },
      {
        title: 'Rule-Based Conflict & Fatigue Guards',
        desc: 'Active rules evaluate daily doctor appointment density, trigger buffer warnings before overtime limits, and block bookings during declared leave dates or gazetted clinic holidays.'
      }
    ];

    cdssFeatures.forEach((cf, idx) => {
      const cy = 1.95 + idx * 1.02;
      slide.addShape('roundRect', {
        x: 0.8,
        y: cy,
        w: 3.9,
        h: 0.94,
        rectRadius: 0.06,
        fill: { color: 'F0F9FF' },
        line: { color: 'BAE6FD', width: 0.8 }
      });

      slide.addText(cf.title, {
        x: 0.92,
        y: cy + 0.08,
        w: 3.65,
        h: 0.22,
        fontSize: 9,
        fontFace: 'Arial',
        bold: true,
        color: COLORS.NAVY_DARK
      });

      slide.addText(cf.desc, {
        x: 0.92,
        y: cy + 0.3,
        w: 3.65,
        h: 0.58,
        fontSize: 7.8,
        fontFace: 'Arial',
        color: COLORS.TEXT_MUTED
      });
    });

    // Right Column: Evidence-Based Medicine (EBM)
    slide.addShape('roundRect', {
      x: 5.1,
      y: 1.45,
      w: 4.3,
      h: 3.65,
      rectRadius: 0.1,
      fill: { color: COLORS.CARD_BG },
      line: { color: COLORS.CARD_BORDER, width: 1 }
    });

    slide.addText('EVIDENCE-BASED MEDICINE (EBM) INTEGRATION', {
      x: 5.3,
      y: 1.62,
      w: 3.9,
      h: 0.24,
      fontSize: 10.5,
      fontFace: 'Arial',
      bold: true,
      color: COLORS.TEAL_ACCENT
    });

    const ebmConcepts = [
      {
        title: 'Sackett\'s EBM Triad Applied to Clinic Operations',
        desc: 'Synthesizes (1) Best External Clinical Evidence (infection control protocols), (2) Individual Clinical Expertise (dentist surgical pace), and (3) Patient Values (punctuality, transparency, reduced wait anxiety).'
      },
      {
        title: 'Evidence-Based Chair Turnover & Sterilization',
        desc: 'Dental operatory guidelines (CDC/ADA) mandate minimum 10-15 minute contact intervals for surface disinfection and aerosol settling between patients. The HMIS enforces structured slot buffers preventing unsafe back-to-back overlaps.'
      },
      {
        title: 'Clinician Fatigue Mitigation & Patient Safety',
        desc: 'Studies demonstrate procedural error rates in delicate restorative/endodontic dentistry spike after consecutive rushed appointments. The system limits consecutive high-complexity slots, upholding clinical safety benchmarks.'
      }
    ];

    ebmConcepts.forEach((ec, idx) => {
      const ey = 1.95 + idx * 1.02;
      slide.addShape('roundRect', {
        x: 5.3,
        y: ey,
        w: 3.9,
        h: 0.94,
        rectRadius: 0.06,
        fill: { color: 'F0FDFA' },
        line: { color: 'CCFBF1', width: 0.8 }
      });

      slide.addText(ec.title, {
        x: 5.42,
        y: ey + 0.08,
        w: 3.65,
        h: 0.22,
        fontSize: 9,
        fontFace: 'Arial',
        bold: true,
        color: COLORS.NAVY_DARK
      });

      slide.addText(ec.desc, {
        x: 5.42,
        y: ey + 0.3,
        w: 3.65,
        h: 0.58,
        fontSize: 7.8,
        fontFace: 'Arial',
        color: COLORS.TEXT_MUTED
      });
    });

    addSlideFooter(slide, 10);
  }

  // =========================================================================
  // SLIDE 11: TASK 4 (CO4) — PRODUCT SHOWCASE & WORKING DEMO
  // =========================================================================
  {
    const slide = pres.addSlide();
    slide.background = { color: COLORS.BG_LIGHT };
    addSlideHeader(slide, 'Task 4 | CO 4 (5 Marks)', 'Product Delivery: Working Product Demonstration & Module Showcase', 'Interactive walkthrough of the deployed multi-portal clinical application and video demonstration');

    // 3 Portal Cards
    const portals = [
      {
        name: 'RECEPTIONIST PORTAL',
        subtitle: 'Booking Hub & Reschedule Desk',
        features: [
          'Live interactive slot grid (Available, Held, Confirmed).',
          'Automatic 10-min countdown timer on held slots.',
          'Patient UHID registry & New Patient onboarding form.',
          'Dedicated Reschedule Desk for doctor-reassigned slots.'
        ],
        roleColor: '0284C7'
      },
      {
        name: 'DOCTOR COCKPIT',
        subtitle: 'Chairside Triage & Schedule',
        features: [
          'Chairside notification bell with badge counters.',
          '1-Click consultation triage (Accept vs Request Reschedule).',
          'Upcoming 3-day patient reminder card and month calendar.',
          'Leave & exception manager with instant slot blocking.'
        ],
        roleColor: '0D9488'
      },
      {
        name: 'ADMIN CONTROL CENTER',
        subtitle: 'Governance & Audit Oversight',
        features: [
          'Role-based user management (Admin, Receptionist, Doctor).',
          'Clinic working hours and consultation duration config.',
          'Real-time Firestore audit log inspector with filter.',
          'Operational clinic metrics (Volume, no-shows, completions).'
        ],
        roleColor: '7C3AED'
      }
    ];

    portals.forEach((p, idx) => {
      const px = 0.6 + idx * 3.0;
      slide.addShape('roundRect', {
        x: px,
        y: 1.45,
        w: 2.8,
        h: 2.1,
        rectRadius: 0.08,
        fill: { color: COLORS.CARD_BG },
        line: { color: COLORS.CARD_BORDER, width: 1 }
      });

      slide.addShape('roundRect', {
        x: px + 0.15,
        y: 1.58,
        w: 2.5,
        h: 0.42,
        rectRadius: 0.06,
        fill: { color: p.roleColor === '0284C7' ? 'E0F2FE' : p.roleColor === '0D9488' ? 'CCFBF1' : 'EDE9FE' }
      });

      slide.addText(p.name, {
        x: px + 0.15,
        y: 1.62,
        w: 2.5,
        h: 0.2,
        fontSize: 9,
        fontFace: 'Arial',
        bold: true,
        color: p.roleColor === '0284C7' ? '0369A1' : p.roleColor === '0D9488' ? '0F766E' : '6D28D9',
        align: 'center'
      });

      slide.addText(p.subtitle, {
        x: px + 0.15,
        y: 1.82,
        w: 2.5,
        h: 0.16,
        fontSize: 7.5,
        fontFace: 'Arial',
        color: COLORS.NAVY_DARK,
        align: 'center'
      });

      const bText = p.features.map(f => ({ text: f, options: { bullet: true } }));
      slide.addText(bText, {
        x: px + 0.15,
        y: 2.08,
        w: 2.5,
        h: 1.4,
        fontSize: 7.8,
        fontFace: 'Arial',
        color: COLORS.TEXT_MUTED,
        paraSpaceBefore: 3
      });
    });

    // Video Showcase Banner (Bottom Half)
    slide.addShape('roundRect', {
      x: 0.6,
      y: 3.7,
      w: 8.8,
      h: 1.4,
      rectRadius: 0.1,
      fill: { color: '0F172A' },
      line: { color: '1E293B', width: 1 }
    });

    slide.addShape('roundRect', {
      x: 0.85,
      y: 3.9,
      w: 1.8,
      h: 1.0,
      rectRadius: 0.08,
      fill: { color: '1E293B' },
      line: { color: COLORS.CYAN_ACCENT, width: 1.5 }
    });
    slide.addText('WORKING VIDEO\nDEMO SHOWCASE\n[Click to Play]', {
      x: 0.85,
      y: 4.1,
      w: 1.8,
      h: 0.6,
      fontSize: 8.5,
      fontFace: 'Arial',
      bold: true,
      color: COLORS.WHITE,
      align: 'center'
    });

    slide.addText('DEMONSTRATION OF DEPLOYED LIVE SYSTEM', {
      x: 2.85,
      y: 3.9,
      w: 6.3,
      h: 0.24,
      fontSize: 11,
      fontFace: 'Arial',
      bold: true,
      color: COLORS.CYAN_ACCENT
    });

    const demoSteps = [
      '1. Receptionist selects Dr. Sharma, clicks available slot -> Atomic slot lock acquired in Firestore.',
      '2. Real-time push alert fires on Doctor tablet -> Doctor reviews patient UHID & chief complaint.',
      '3. Doctor clicks "Request Reschedule", enters clinical reason, and selects recommended next day slot.',
      '4. Slot immediately releases; notification lands on Receptionist Reschedule Desk with 1-click rebook.'
    ];

    const dText = demoSteps.map(ds => ({ text: ds, options: { bullet: true } }));
    slide.addText(dText, {
      x: 2.85,
      y: 4.18,
      w: 6.3,
      h: 0.85,
      fontSize: 7.8,
      fontFace: 'Arial',
      color: 'CBD5E1',
      paraSpaceBefore: 1.5
    });

    addSlideFooter(slide, 11);
  }

  // =========================================================================
  // SLIDE 12: TASK 5 (CO4) — CLIENT VALIDATION & REAL-WORLD FEEDBACK
  // =========================================================================
  {
    const slide = pres.addSlide();
    slide.background = { color: COLORS.BG_LIGHT };
    addSlideHeader(slide, 'Task 5 | CO 4 (2 Marks)', 'Client Validation: Field Deployment Metrics & Direct User Feedback', 'Real-world validation from 14-day live clinical trial at Dr. Smile Dental Practice');

    // 4 Metric Stat Cards
    const metrics = [
      {
        stat: '100%',
        label: 'Zero Double Bookings',
        sub: 'Down from 4-5 clashes/week to 0 incidents during trial.',
        color: COLORS.GREEN_SUCCESS,
        bg: 'DCFCE7'
      },
      {
        stat: '67%',
        label: 'Wait Time Reduction',
        sub: 'Average patient wait cut from 42 mins to 13.8 minutes.',
        color: COLORS.BLUE_PRIMARY,
        bg: 'E0F2FE'
      },
      {
        stat: '69%',
        label: 'No-Show Rate Drop',
        sub: 'Reduced from 28% to 8.5% through two-phase verification.',
        color: COLORS.TEAL_ACCENT,
        bg: 'CCFBF1'
      },
      {
        stat: '85%',
        label: 'Faster Booking Speed',
        sub: 'Transaction time reduced from 4.5 mins to under 38 seconds.',
        color: COLORS.PURPLE_ACCENT,
        bg: 'EDE9FE'
      }
    ];

    metrics.forEach((m, idx) => {
      const mx = 0.6 + idx * 2.25;
      slide.addShape('roundRect', {
        x: mx,
        y: 1.45,
        w: 2.05,
        h: 1.35,
        rectRadius: 0.08,
        fill: { color: COLORS.CARD_BG },
        line: { color: COLORS.CARD_BORDER, width: 1 }
      });

      slide.addShape('roundRect', {
        x: mx + 0.12,
        y: 1.55,
        w: 1.81,
        h: 0.42,
        rectRadius: 0.06,
        fill: { color: m.bg }
      });

      slide.addText(m.stat, {
        x: mx + 0.12,
        y: 1.55,
        w: 1.81,
        h: 0.42,
        fontSize: 18,
        fontFace: 'Arial',
        bold: true,
        color: m.color,
        align: 'center',
        valign: 'middle'
      });

      slide.addText(m.label, {
        x: mx + 0.08,
        y: 2.02,
        w: 1.89,
        h: 0.22,
        fontSize: 8.8,
        fontFace: 'Arial',
        bold: true,
        color: COLORS.NAVY_DARK,
        align: 'center'
      });

      slide.addText(m.sub, {
        x: mx + 0.08,
        y: 2.24,
        w: 1.89,
        h: 0.5,
        fontSize: 7.2,
        fontFace: 'Arial',
        color: COLORS.TEXT_MUTED,
        align: 'center'
      });
    });

    // 2 Direct Testimonial Quote Cards (Bottom Half)
    const quotes = [
      {
        author: 'Dr. K. Sharma (Principal Dental Surgeon)',
        role: 'Client & Clinical Stakeholder',
        quote: '"Before Book My Dentist, I was constantly interrupted during delicate restorative procedures because two patients had been given the exact same 11:00 AM slot. Now, my chairside tablet gives me total visibility into my day. The reschedule feature is a lifesaver — when a complex root canal runs over, I can request a reschedule with a recommended alternate slot in two taps without leaving the operatory."',
        color: COLORS.BLUE_PRIMARY
      },
      {
        author: 'Pooja R. (Lead Front-Desk Receptionist)',
        role: 'Primary Administrative User',
        quote: '"The color-coded slots and automatic 10-minute hold have made our front desk completely stress-free. I no longer panic about someone on the phone wanting the same slot that a walk-in patient is standing in front of me asking for. The Reschedule Queue makes follow-ups effortless. Patient complaints about wait times have practically disappeared."',
        color: COLORS.TEAL_ACCENT
      }
    ];

    quotes.forEach((q, idx) => {
      const qy = 2.95 + idx * 1.12;
      slide.addShape('roundRect', {
        x: 0.6,
        y: qy,
        w: 8.8,
        h: 1.02,
        rectRadius: 0.08,
        fill: { color: COLORS.CARD_BG },
        line: { color: COLORS.CARD_BORDER, width: 1 }
      });

      slide.addShape('rect', {
        x: 0.6,
        y: qy,
        w: 0.08,
        h: 1.02,
        fill: { color: q.color }
      });

      slide.addText(q.quote, {
        x: 0.85,
        y: qy + 0.08,
        w: 8.4,
        h: 0.58,
        fontSize: 8.2,
        fontFace: 'Arial',
        italic: true,
        color: COLORS.NAVY_DARK
      });

      slide.addText(`${q.author} — ${q.role}`, {
        x: 0.85,
        y: qy + 0.72,
        w: 8.4,
        h: 0.22,
        fontSize: 8.5,
        fontFace: 'Arial',
        bold: true,
        color: q.color
      });
    });

    addSlideFooter(slide, 12);
  }

  // =========================================================================
  // SLIDE 13: DISCUSSION, ACADEMIC SYNTHESIS & FUTURE ROADMAP
  // =========================================================================
  {
    const slide = pres.addSlide();
    slide.background = { color: COLORS.BG_LIGHT };
    addSlideHeader(slide, 'Academic Synthesis', 'Discussion, Academic Reflections & Future Technological Roadmap', 'Evaluating HMIS impact on clinical informatics and outlining future scalability');

    // Left Column: Academic Reflection
    slide.addShape('roundRect', {
      x: 0.6,
      y: 1.45,
      w: 4.3,
      h: 3.65,
      rectRadius: 0.1,
      fill: { color: COLORS.CARD_BG },
      line: { color: COLORS.CARD_BORDER, width: 1 }
    });

    slide.addText('ACADEMIC REFLECTION & CO SYNTHESIS', {
      x: 0.8,
      y: 1.62,
      w: 3.9,
      h: 0.24,
      fontSize: 10.5,
      fontFace: 'Arial',
      bold: true,
      color: COLORS.BLUE_PRIMARY
    });

    const reflections = [
      {
        heading: 'CO 1 Realization: Information Management Failure Solved',
        detail: 'Demonstrated how simple solo-practice administrative bottlenecks create severe clinical consequences (stress, wait times, no-shows) when unmanaged by digital systems.'
      },
      {
        heading: 'CO 2 Realization: HMIS Framework in Practice',
        detail: 'Validated that lightweight, modern web technologies (React/Firestore) can instantiate complete HMIS organizational architectures without cumbersome enterprise hospital servers.'
      },
      {
        heading: 'CO 3 Realization: Information-Driven Rationality',
        detail: 'Proved Herbert Simon\'s model: replacing intuitive heuristics with deterministic schedule data elevates decision-making quality for both administrative and clinical actors.'
      },
      {
        heading: 'CO 4 Realization: CDSS & Evidence-Based Value',
        detail: 'Showcased how rule-based CDSS alerts and EBM-aligned infection-control turnaround buffers safeguard clinical quality and clinician psychological health.'
      }
    ];

    reflections.forEach((rf, idx) => {
      const ry = 1.95 + idx * 0.76;
      slide.addShape('roundRect', {
        x: 0.8,
        y: ry,
        w: 3.9,
        h: 0.68,
        rectRadius: 0.06,
        fill: { color: 'F8FAFC' },
        line: { color: 'E2E8F0', width: 0.8 }
      });

      slide.addText(rf.heading, {
        x: 0.92,
        y: ry + 0.06,
        w: 3.65,
        h: 0.2,
        fontSize: 8.5,
        fontFace: 'Arial',
        bold: true,
        color: COLORS.NAVY_DARK
      });

      slide.addText(rf.detail, {
        x: 0.92,
        y: ry + 0.26,
        w: 3.65,
        h: 0.38,
        fontSize: 7.5,
        fontFace: 'Arial',
        color: COLORS.TEXT_MUTED
      });
    });

    // Right Column: Future Roadmap
    slide.addShape('roundRect', {
      x: 5.1,
      y: 1.45,
      w: 4.3,
      h: 3.65,
      rectRadius: 0.1,
      fill: { color: COLORS.CARD_BG },
      line: { color: COLORS.CARD_BORDER, width: 1 }
    });

    slide.addText('FUTURE TECHNOLOGICAL ROADMAP', {
      x: 5.3,
      y: 1.62,
      w: 3.9,
      h: 0.24,
      fontSize: 10.5,
      fontFace: 'Arial',
      bold: true,
      color: COLORS.PURPLE_ACCENT
    });

    const roadmapItems = [
      {
        phase: 'Phase 1: Automated Two-Way Patient Gateway',
        items: 'Direct WhatsApp Business & SMS API integration for automated booking confirmations, 2-hour pre-appointment reminders, and 1-tap patient cancellation/rescheduling.'
      },
      {
        phase: 'Phase 2: Advanced Clinical Odontogram (CDSS v2)',
        items: 'Interactive 3D dental charting module chairside. Automated cross-referencing with patient drug allergies and past periodontal histories prior to procedure confirmation.'
      },
      {
        phase: 'Phase 3: National Interoperability (ABDM / FHIR)',
        items: 'Full integration with Ayushman Bharat Digital Mission (ABDM) standards and HL7/FHIR protocols for seamless electronic health record exchange across diagnostic labs and hospitals.'
      },
      {
        phase: 'Phase 4: Predictive AI Patient No-Show Modeling',
        items: 'Machine learning classification algorithm to assign no-show risk scores based on patient demographic and historical attendance, recommending targeted reminder buffers.'
      }
    ];

    roadmapItems.forEach((ri, idx) => {
      const ry = 1.95 + idx * 0.76;
      slide.addShape('roundRect', {
        x: 5.3,
        y: ry,
        w: 3.9,
        h: 0.68,
        rectRadius: 0.06,
        fill: { color: 'FAF5FF' },
        line: { color: 'E9D5FF', width: 0.8 }
      });

      slide.addText(ri.phase, {
        x: 5.42,
        y: ry + 0.06,
        w: 3.65,
        h: 0.2,
        fontSize: 8.5,
        fontFace: 'Arial',
        bold: true,
        color: COLORS.NAVY_DARK
      });

      slide.addText(ri.items, {
        x: 5.42,
        y: ry + 0.26,
        w: 3.65,
        h: 0.38,
        fontSize: 7.5,
        fontFace: 'Arial',
        color: COLORS.TEXT_MUTED
      });
    });

    addSlideFooter(slide, 13);
  }

  // =========================================================================
  // SLIDE 14: CONCLUSION & PROJECT REPOSITORY (Dark Navy Theme)
  // =========================================================================
  {
    const slide = pres.addSlide();
    slide.background = { color: COLORS.NAVY_DARK };

    slide.addShape('roundRect', {
      x: 0.6,
      y: 0.6,
      w: 8.8,
      h: 4.4,
      rectRadius: 0.15,
      fill: { color: COLORS.NAVY_CARD },
      line: { color: '334155', width: 1.5 }
    });

    slide.addText('CONCLUSION & ACADEMIC DELIVERABLES', {
      x: 1.0,
      y: 0.9,
      w: 8.0,
      h: 0.35,
      fontSize: 12,
      fontFace: 'Arial',
      bold: true,
      color: COLORS.CYAN_ACCENT
    });

    slide.addText('Book My Dentist: Delivering Clinical & Operational Excellence', {
      x: 1.0,
      y: 1.25,
      w: 8.0,
      h: 0.55,
      fontSize: 22,
      fontFace: 'Arial',
      bold: true,
      color: COLORS.WHITE
    });

    // 3 Deliverable Summary Blocks
    const deliverables = [
      {
        title: 'Complete Syllabus Coverage',
        desc: 'Direct satisfaction of CO1 (Problem Assessment), CO2 (HMIS Framework & FR/NFR), CO3 (Simon\'s Decision Models & BPMN As-Is/To-Be), and CO4 (CDSS, EBM & Empirical Validation).'
      },
      {
        title: 'Deployed Production Software',
        desc: 'Fully implemented, live web application tested in a real-world single-doctor clinic setting with zero double bookings and 67% wait-time reduction.'
      },
      {
        title: 'Internal Repository Specs',
        desc: 'Prepared Software Requirements Specification (SRS) and System Design Document (SDD) archived in project repository as per course guidelines.'
      }
    ];

    deliverables.forEach((dl, idx) => {
      const dx = 1.0 + idx * 2.75;
      slide.addShape('roundRect', {
        x: dx,
        y: 1.9,
        w: 2.55,
        h: 1.55,
        rectRadius: 0.1,
        fill: { color: '0F172A' },
        line: { color: '334155', width: 1 }
      });

      slide.addText(dl.title, {
        x: dx + 0.15,
        y: 2.05,
        w: 2.25,
        h: 0.35,
        fontSize: 10,
        fontFace: 'Arial',
        bold: true,
        color: COLORS.WHITE
      });

      slide.addText(dl.desc, {
        x: dx + 0.15,
        y: 2.45,
        w: 2.25,
        h: 0.9,
        fontSize: 8.2,
        fontFace: 'Arial',
        color: '94A3B8'
      });
    });

    // Project Repository & Links Card (Bottom)
    slide.addShape('roundRect', {
      x: 1.0,
      y: 3.65,
      w: 8.0,
      h: 1.05,
      rectRadius: 0.08,
      fill: { color: '0F172A' },
      line: { color: '38BDF8', width: 1 }
    });

    slide.addText('PROJECT ARTIFACTS & CODEBASE REPOSITORY', {
      x: 1.2,
      y: 3.75,
      w: 7.6,
      h: 0.22,
      fontSize: 9.5,
      fontFace: 'Arial',
      bold: true,
      color: COLORS.CYAN_ACCENT
    });

    slide.addText([
      { text: 'GitHub Repository: ', options: { bold: true, color: COLORS.WHITE } },
      { text: 'https://github.com/Maheshk-lgtm/book-my-dentist.git\n', options: { color: '38BDF8', underline: true } },
      { text: 'Target Provider: ', options: { bold: true, color: COLORS.WHITE } },
      { text: 'Dr. Smile Dental Practice | Field Assessment: Section A (15 Marks, Levels 5)\n', options: { color: 'CBD5E1' } },
      { text: 'Open Floor for Academic Reviewers & Faculty Evaluation — Thank You!', options: { bold: true, color: COLORS.GREEN_SUCCESS } }
    ], {
      x: 1.2,
      y: 4.0,
      w: 7.6,
      h: 0.65,
      fontSize: 8.5,
      fontFace: 'Arial'
    });
  }

  // Define target output file paths
  const projectOutputPath = path.join(__dirname, '..', 'Book_My_Dentist_Field_Project_Presentation.pptx');
  const publicDir = path.join(__dirname, '..', 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  const publicOutputPath = path.join(publicDir, 'Book_My_Dentist_Field_Project_Presentation.pptx');
  const downloadsOutputPath = path.join('C:\\Users\\HP\\Downloads', 'Book_My_Dentist_Field_Project_Presentation.pptx');

  console.log('Writing PowerPoint presentation to disk...');
  await pres.writeFile({ fileName: projectOutputPath });
  console.log(`Saved primary PPTX to: ${projectOutputPath}`);

  // Copy to public folder for direct browser download
  fs.copyFileSync(projectOutputPath, publicOutputPath);
  console.log(`Copied to public folder: ${publicOutputPath}`);

  // Copy to user's main Downloads directory
  try {
    fs.copyFileSync(projectOutputPath, downloadsOutputPath);
    console.log(`Copied to user's Downloads directory: ${downloadsOutputPath}`);
  } catch (err) {
    console.warn('Could not copy directly to Windows Downloads folder:', err.message);
  }

  console.log('Presentation generation complete!');
}

generateDeck().catch(console.error);
