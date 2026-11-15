"""Generate high-resolution official Project Poster for VNRVJIET Incubation Application."""
import os
from reportlab.lib import colors
from reportlab.lib.pagesizes import A3, landscape
from reportlab.lib.units import inch, cm
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

OUTPUT_PDF = r"C:\AI Workspace\01 Projects\dt_lab\artifacts\PATHPATCH_OFFICIAL_PROJECT_POSTER.pdf"

def build_poster():
    doc = SimpleDocTemplate(
        OUTPUT_PDF,
        pagesize=landscape(A3),
        leftMargin=0.4 * inch,
        rightMargin=0.4 * inch,
        topMargin=0.4 * inch,
        bottomMargin=0.4 * inch,
    )

    styles = getSampleStyleSheet()

    # Colors
    c_bg = colors.HexColor("#090D16")
    c_card_bg = colors.HexColor("#0F172A")
    c_indigo = colors.HexColor("#6366F1")
    c_cyan = colors.HexColor("#38BDF8")
    c_emerald = colors.HexColor("#34D399")
    c_amber = colors.HexColor("#FBBF24")
    c_rose = colors.HexColor("#F43F5E")
    c_text_bright = colors.HexColor("#F8FAFC")
    c_text_muted = colors.HexColor("#94A3B8")
    c_border = colors.HexColor("#334155")

    # Typography styles
    style_inst = ParagraphStyle(
        'InstituteHeader',
        fontName='Helvetica-Bold',
        fontSize=10,
        textColor=c_cyan,
        leading=13,
        alignment=0,
        textTransform='uppercase',
    )
    style_badge = ParagraphStyle(
        'BadgePill',
        fontName='Helvetica-Bold',
        fontSize=10,
        textColor=colors.HexColor("#A5B4FC"),
        leading=13,
        alignment=2,
    )
    style_title = ParagraphStyle(
        'MainTitle',
        fontName='Helvetica-Bold',
        fontSize=24,
        textColor=c_text_bright,
        leading=28,
    )
    style_subtitle = ParagraphStyle(
        'SubTitle',
        fontName='Helvetica',
        fontSize=12,
        textColor=c_text_muted,
        leading=16,
    )
    style_card_title = ParagraphStyle(
        'CardTitle',
        fontName='Helvetica-Bold',
        fontSize=12,
        textColor=c_cyan,
        leading=15,
        spaceAfter=6,
    )
    style_card_body = ParagraphStyle(
        'CardBody',
        fontName='Helvetica',
        fontSize=9.5,
        textColor=colors.HexColor("#E2E8F0"),
        leading=13.5,
    )
    style_card_bullet = ParagraphStyle(
        'CardBullet',
        fontName='Helvetica',
        fontSize=9,
        textColor=colors.HexColor("#CBD5E1"),
        leading=12.5,
        leftIndent=8,
    )
    style_stat_num = ParagraphStyle(
        'StatNum',
        fontName='Helvetica-Bold',
        fontSize=13,
        textColor=c_cyan,
        leading=15,
        alignment=1,
    )
    style_stat_lbl = ParagraphStyle(
        'StatLbl',
        fontName='Helvetica-Bold',
        fontSize=7.5,
        textColor=c_text_muted,
        leading=9,
        alignment=1,
    )

    story = []

    # 1. HEADER ROW TABLE
    header_left = [
        Paragraph("VNR VIGNANA JYOTHI INSTITUTE OF ENGINEERING & TECHNOLOGY", style_inst),
        Paragraph("PathPatch Universal DT Lab", style_title),
        Paragraph("Cross-Disciplinary Digital Twin Prototyping Platform & Semiconductor Hardware-in-the-Loop Simulator", style_subtitle),
    ]
    header_right = [
        Paragraph("INCUBATION COHORT APPLICATION 2026-27", style_badge),
        Spacer(1, 4),
        Paragraph("<b>Live Prototype:</b> <font color='#38BDF8'>https://path-patch.vercel.app</font>", ParagraphStyle('HRightUrl', fontName='Helvetica', fontSize=10, textColor=c_text_bright, alignment=2, leading=14)),
        Paragraph("<b>ECE · CSE · Mechanical · Civil</b>", ParagraphStyle('HRightDept', fontName='Helvetica-Bold', fontSize=9, textColor=c_emerald, alignment=2, leading=13)),
    ]

    header_table = Table([[header_left, header_right]], colWidths=[10.5 * inch, 5.5 * inch])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LINEBELOW', (0,0), (-1,-1), 1.5, c_indigo),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 10))

    # Helper function to generate a panel card
    def make_card(title_html, body_html, bullets, stats, color_theme):
        card_content = []
        card_content.append(Paragraph(title_html, ParagraphStyle('CT', parent=style_card_title, textColor=color_theme)))
        card_content.append(Paragraph(body_html, style_card_body))
        card_content.append(Spacer(1, 4))
        for b in bullets:
            card_content.append(Paragraph(f"• <b>{b[0]}</b>: {b[1]}", style_card_bullet))
        
        if stats:
            card_content.append(Spacer(1, 8))
            stat_cells = []
            for num, lbl in stats:
                stat_cells.append([
                    Paragraph(num, ParagraphStyle('SN', parent=style_stat_num, textColor=color_theme)),
                    Paragraph(lbl, style_stat_lbl)
                ])
            stat_cols = [1.6 * inch] * len(stats)
            stat_tbl = Table([stat_cells], colWidths=stat_cols)
            stat_tbl.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#1E293B")),
                ('BOX', (0,0), (-1,-1), 0.5, c_border),
                ('INNERGRID', (0,0), (-1,-1), 0.5, c_border),
                ('TOPPADDING', (0,0), (-1,-1), 4),
                ('BOTTOMPADDING', (0,0), (-1,-1), 4),
                ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ]))
            card_content.append(stat_tbl)
        
        card_wrapper = Table([[card_content]], colWidths=[5.15 * inch])
        card_wrapper.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), c_card_bg),
            ('BOX', (0,0), (-1,-1), 1, c_border),
            ('LINEABOVE', (0,0), (-1,-1), 2.5, color_theme),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('LEFTPADDING', (0,0), (-1,-1), 10),
            ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ]))
        return card_wrapper

    # 2. PANEL CONTENT (Row 1)
    # Card 1: Problem
    card1 = make_card(
        "🚨 1. The Core Problem: Hardware Fear & Silos",
        "<b>The Engineering Chasm:</b> Millions of engineering students memorize circuit equations on blackboards without hands-on intuition.",
        [
            ("Burnt Hardware Trauma", "Swapping power pins blows LM741 chips; fear of docked marks stops students from experimenting."),
            ("Software Silo Crisis", "Colleges pay ₹26L+ for isolated desktop tools (Multisim, ANSYS, STAAD) locked to 20 lab seats."),
            ("Missing Flight Simulator", "Aviation mandates 500 simulator crash hours before flying; engineering labs expect zero errors on Day 1."),
        ],
        [("₹26 Lakhs", "Siloed Tool Cost"), ("85,000", "Chip Engineer Deficit"), ("95%", "Colleges Locked Out")],
        c_rose
    )

    # Card 2: Digital Twin Simulation
    card2 = make_card(
        "⚡ 2. Universal Digital Twin Physics Engine",
        "<b>100% Web-Native Browser Physics:</b> Zero local installation; executes instantaneously via WebAssembly & WebGL on standard $150 laptops.",
        [
            ("Circuits Studio (/ece)", "Modified Nodal Analysis (MNA), 60 FPS oscilloscope, and 10Hz-1MHz logarithmic Bode analyzer."),
            ("Structural Studios (/truss, /beam)", "2D Direct Stiffness [K]{u}={F} with automated Euler buckling flags; Euler-Bernoulli SFD/BMD."),
            ("Systems Studio (/cs)", "3D WebGL Code Nebula with real-time OSV.dev and NVD CVE vulnerability dependency sync."),
        ],
        [("60 FPS", "Real-Time Canvas"), ("Zero", "GPU Reqs"), ("4 Studios", "ECE/CSE/Civil/Mech")],
        c_indigo
    )

    # Card 3: Fly-By-Wire HIL
    card3 = make_card(
        "🔌 3. Hardware-in-the-Loop & Fly-By-Wire",
        "<b>The Physical Bridge:</b> Bringing commercial flight envelope protection to physical engineering breadboards.",
        [
            ("Smart Interposer Cartridge", "Sub-₹155 cartridge powered by WCH CH32V003 48MHz RISC-V coprocessor (chip cost: ₹13.80 / $0.16)."),
            ("Active Fault Interception", "15ms sub-threshold continuity scan; electronic disconnect trips in < 800 ns on reverse polarity."),
            ("WebSerial HTML5 Telemetry", "Bidirectional streaming sync between physical breadboard voltages and the digital twin at 115200 baud."),
        ],
        [("₹155.20", "Cartridge BOM"), ("< 800 ns", "Fault Trip Speed"), ("115.2k", "WebSerial Baud")],
        c_cyan
    )

    # 3. PANEL CONTENT (Row 2)
    # Card 4: Semiconductor Pipeline
    card4 = make_card(
        "🏭 4. Semiconductor Foundry Pipeline (ISM)",
        "<b>$10 Billion National Tailwind:</b> Directly solving India's 85,000 chip design engineer shortage for Tata Dholera & Micron fabs.",
        [
            ("Breadboard to GDSII", "Compiles breadboard circuits into synthesizable Verilog modules and DRC-clean SPICE netlists."),
            ("Tiny Tapeout ASIC Shuttles", "Multiplexes student silicon onto SkyWater 130nm & IHP 130nm open PDK shuttles for ₹15,000/slot."),
            ("Post-Silicon ATE Verification", "Plug physical manufactured microchip into USB-C; verify Simulation vs Breadboard vs Silicon."),
        ],
        [("SkyWater 130nm", "Open PDK Flow"), ("Tiny Tapeout", "MPW Shuttles"), ("₹600 Crore", "Domestic TAM")],
        c_amber
    )

    # Card 5: MCP Personal Agent & Attendance
    card5 = make_card(
        "🤖 5. MCP Personal Agent & Daily Campus OS",
        "<b>All-Day Academic Companion:</b> Open Model Context Protocol (MCP) server with deterministic AST guardrails.",
        [
            ("75% Attendance Buffer Engine", "Syncs with EduPrime CAMS-ERP; calculates Safe Bunks B_safe = ⌊(A - 0.75T)/0.75⌋ and recovery streaks."),
            ("Multimodal Subject Hub", "Blackboard photo OCR, 65-slide PPT de-bloater to 1-page formula cards, 9:00 PM 3-min habit micro-quizzes."),
            ("Master Socratic Co-Pilot", "4-layer AST guardrails forbid answer leakage; guides students through troubleshooting mathematical proofs."),
        ],
        [("100% Socratic", "Zero Answer Leak"), ("Daily Habit", "8 AM / 9 PM OS"), ("CAMS-ERP", "Auto-Sync")],
        colors.HexColor("#C084FC")
    )

    # Card 6: AICTE Grants & Accreditation
    card6 = make_card(
        "🏛️ 6. AICTE Grant Absorption & Accreditation",
        "<b>Zero College Operational Expense:</b> Classified as a 3-Year Capital Asset under GFR 2017 Rule 130 & Ind AS 38.",
        [
            ("AICTE IDEA Lab Grant Absorption", "Absorbs ₹4.20 Lakhs from institutional capital grants, saving colleges ₹21,04,400 (81% savings)."),
            ("1-Click NBA & NAAC Evidence", "Auto-generates tabular CO-PO attainment matrices for NBA SAR Criterion 3 & 6 and NAAC 2.3.1."),
            ("Ready Procurement Dossier", "Turnkey GFR 166 PAC Justification & GeM Custom Bid non-negotiable technical evaluation specs."),
        ],
        [("₹21.04 Lakhs", "Grant Funds Saved"), ("120 Hours", "Faculty Work Saved"), ("NBA 3 & 6", "Auto Compliance")],
        c_emerald
    )

    # 4. ASSEMBLE GRID
    row1_table = Table([[card1, card2, card3]], colWidths=[5.3 * inch, 5.3 * inch, 5.3 * inch])
    row1_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(row1_table)

    row2_table = Table([[card4, card5, card6]], colWidths=[5.3 * inch, 5.3 * inch, 5.3 * inch])
    row2_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(row2_table)
    story.append(Spacer(1, 6))

    # 5. FOOTER TABLE
    footer_cells = [
        [
            Paragraph("<b>PROJECT:</b> PathPatch Universal DT Lab", ParagraphStyle('F1', fontName='Helvetica', fontSize=9, textColor=c_text_bright)),
            Paragraph("<b>INSTITUTION:</b> VNR Vignana Jyothi Institute of Engg & Tech", ParagraphStyle('F2', fontName='Helvetica', fontSize=9, textColor=c_text_bright)),
            Paragraph("<b>COMMITMENT:</b> 2-Month Incubation (Dec & Jan)", ParagraphStyle('F3', fontName='Helvetica', fontSize=9, textColor=c_emerald)),
            Paragraph("<b>LIVE URL:</b> https://path-patch.vercel.app", ParagraphStyle('F4', fontName='Helvetica-Bold', fontSize=9, textColor=c_cyan, alignment=2)),
        ]
    ]
    footer_table = Table(footer_cells, colWidths=[3.5 * inch, 4.5 * inch, 3.5 * inch, 4.5 * inch])
    footer_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#0F172A")),
        ('BOX', (0,0), (-1,-1), 1, c_border),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(footer_table)

    def draw_bg(canvas, doc):
        canvas.saveState()
        canvas.setFillColor(c_bg)
        canvas.rect(0, 0, doc.pagesize[0], doc.pagesize[1], fill=True, stroke=False)
        canvas.restoreState()

    doc.build(story, onFirstPage=draw_bg)
    print("Poster generated successfully at:", OUTPUT_PDF)

if __name__ == "__main__":
    build_poster()
