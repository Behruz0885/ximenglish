import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

def create_10_slide_deck():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    FONT_FAMILY = "Segoe UI"

    # Color Palette: Deep Slate with semantic accents (Clean, no emojis)
    BG_DARK = RGBColor(11, 15, 25)        # #0B0F19
    CARD_BG = RGBColor(20, 27, 45)        # #141B2D
    CARD_BORDER = RGBColor(38, 50, 78)    # #26324E
    ACCENT_CYAN = RGBColor(56, 189, 248)  # #38BDF8
    ACCENT_GREEN = RGBColor(16, 185, 129) # #10B981
    ACCENT_PURPLE = RGBColor(168, 85, 247)# #A855F7
    ACCENT_RED = RGBColor(248, 113, 113)  # #F87171
    ACCENT_YELLOW = RGBColor(251, 191, 36)# #FBBF24
    TEXT_PRIMARY = RGBColor(248, 250, 252)
    TEXT_SECONDARY = RGBColor(148, 163, 184)
    TEXT_MUTED = RGBColor(100, 116, 139)

    def set_bg(slide):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
        bg.fill.solid()
        bg.fill.fore_color.rgb = BG_DARK
        bg.line.fill.background()
        return bg

    def add_card(slide, left, top, width, height, bg=CARD_BG, border=CARD_BORDER, border_pt=1.5):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(left), Inches(top), Inches(width), Inches(height))
        card.fill.solid()
        card.fill.fore_color.rgb = bg
        if border:
            card.line.color.rgb = border
            card.line.width = Pt(border_pt)
        else:
            card.line.fill.background()
        return card

    def add_header(slide, tag_text, title_text, tag_color=ACCENT_CYAN):
        box = slide.shapes.add_textbox(Inches(0.9), Inches(0.5), Inches(11.533), Inches(1.1))
        tf = box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

        p_tag = tf.paragraphs[0]
        p_tag.text = tag_text.upper()
        p_tag.font.name = FONT_FAMILY
        p_tag.font.size = Pt(11)
        p_tag.font.bold = True
        p_tag.font.color.rgb = tag_color
        p_tag.space_after = Pt(4)

        p_title = tf.add_paragraph()
        p_title.text = title_text
        p_title.font.name = FONT_FAMILY
        p_title.font.size = Pt(28)
        p_title.font.bold = True
        p_title.font.color.rgb = TEXT_PRIMARY

    def add_footer(slide, text, color=ACCENT_YELLOW):
        box = slide.shapes.add_textbox(Inches(0.9), Inches(6.5), Inches(11.533), Inches(0.5))
        tf = box.text_frame
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        p = tf.paragraphs[0]
        p.text = text
        p.font.name = FONT_FAMILY
        p.font.size = Pt(12)
        p.font.bold = True
        p.font.color.rgb = color
        p.alignment = PP_ALIGN.CENTER

    step_w = 3.6
    step_gap = 0.4

    # ==========================================================
    # SLIDE 1: TITLE SLIDE
    # ==========================================================
    s1 = prs.slides.add_slide(blank_layout)
    set_bg(s1)

    bar = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.9), Inches(1.2), Inches(1.0), Inches(0.06))
    bar.fill.solid()
    bar.fill.fore_color.rgb = ACCENT_GREEN
    bar.line.fill.background()

    tag_box = s1.shapes.add_textbox(Inches(0.9), Inches(1.4), Inches(6.0), Inches(0.4))
    tf = tag_box.text_frame
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.text = "MODERN WEALTH PLAYBOOK"
    p.font.name = FONT_FAMILY
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = ACCENT_GREEN

    t_box = s1.shapes.add_textbox(Inches(0.9), Inches(1.9), Inches(11.5), Inches(2.2))
    tf = t_box.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.text = "Stocks & Shares:"
    p.font.name = FONT_FAMILY
    p.font.size = Pt(48)
    p.font.bold = True
    p.font.color.rgb = TEXT_PRIMARY

    p2 = tf.add_paragraph()
    p2.text = "Beyond The Noise."
    p2.font.name = FONT_FAMILY
    p2.font.size = Pt(48)
    p2.font.bold = True
    p2.font.color.rgb = ACCENT_CYAN

    sub_box = s1.shapes.add_textbox(Inches(0.9), Inches(4.4), Inches(10.5), Inches(1.2))
    tf = sub_box.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.text = "How to transition from being an everyday consumer into a legal co-owner of the world's most profitable businesses."
    p.font.name = FONT_FAMILY
    p.font.size = Pt(18)
    p.font.color.rgb = TEXT_SECONDARY

    badge_box = s1.shapes.add_textbox(Inches(0.9), Inches(5.9), Inches(11.0), Inches(0.5))
    tf = badge_box.text_frame
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.text = "STRUCTURED GUIDE  •  PLAIN ENGLISH  •  ACTIONABLE FRAMEWORK"
    p.font.name = FONT_FAMILY
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = ACCENT_GREEN

    s1.notes_slide.notes_text_frame.text = (
        "Welcome everyone. Today we are breaking down stocks and shares in crystal-clear English. "
        "No corporate buzzwords, no gatekeeping. Just practical financial mechanics."
    )

    # ==========================================================
    # SLIDE 2: THE PIZZA ANALOGY (CORE FOUNDATION)
    # ==========================================================
    s2 = prs.slides.add_slide(blank_layout)
    set_bg(s2)
    add_header(s2, "Core Concept", "What is a Stock? Think of a Giant Pizza")

    add_card(s2, 0.9, 1.8, 5.6, 4.4, border=RGBColor(30, 80, 110))
    b1 = s2.shapes.add_textbox(Inches(1.2), Inches(2.05), Inches(5.0), Inches(3.9))
    tf = b1.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.text = "1. The Whole Pizza = The Company"
    p.font.name = FONT_FAMILY
    p.font.size = Pt(20)
    p.font.bold = True
    p.font.color.rgb = ACCENT_CYAN

    p_sub = tf.add_paragraph()
    p_sub.text = "Apple, Tesla, or Nike as an entire business"
    p_sub.font.name = FONT_FAMILY
    p_sub.font.size = Pt(12)
    p_sub.font.color.rgb = TEXT_MUTED
    p_sub.space_after = Pt(12)

    pizza_company_items = [
        "• A giant corporation is valued at billions or trillions of dollars.",
        "• No single everyday person has $3 Trillion to purchase the entire enterprise.",
        "• So the entire business is sliced into millions of tiny, equal portions called SHARES.",
        "• Each individual share represents an exact fraction of that total company."
    ]
    for txt in pizza_company_items:
        bp = tf.add_paragraph()
        bp.text = txt
        bp.font.name = FONT_FAMILY
        bp.font.size = Pt(13)
        bp.font.color.rgb = TEXT_SECONDARY
        bp.space_before = Pt(8)

    add_card(s2, 6.8, 1.8, 5.6, 4.4, border=RGBColor(25, 95, 65))
    b2 = s2.shapes.add_textbox(Inches(7.1), Inches(2.05), Inches(5.0), Inches(3.9))
    tf = b2.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.text = "2. One Slice = One Share You Own"
    p.font.name = FONT_FAMILY
    p.font.size = Pt(20)
    p.font.bold = True
    p.font.color.rgb = ACCENT_GREEN

    p_sub = tf.add_paragraph()
    p_sub.text = "Your certified legal co-ownership rights"
    p_sub.font.name = FONT_FAMILY
    p_sub.font.size = Pt(12)
    p_sub.font.color.rgb = TEXT_MUTED
    p_sub.space_after = Pt(12)

    pizza_share_items = [
        "• When you buy even 1 single share, you legally co-own that business.",
        "• When the company sells 100M devices worldwide, the entire pizza grows.",
        "• Because the whole pizza expands in value, your individual slice is worth more.",
        "• You do not clock in or attend meetings: thousands of employees work for you."
    ]
    for txt in pizza_share_items:
        bp = tf.add_paragraph()
        bp.text = txt
        bp.font.name = FONT_FAMILY
        bp.font.size = Pt(13)
        bp.font.color.rgb = TEXT_SECONDARY
        bp.space_before = Pt(8)

    add_footer(s2, "Bottom Line: You do not need to build a tech empire from scratch. You can just buy a slice of one.")
    s2.notes_slide.notes_text_frame.text = (
        "Explain the pizza analogy. Company = whole pizza, 1 share = 1 slice. "
        "Buying a share legally confers ownership. When the business expands, your slice appreciates in value."
    )

    # ==========================================================
    # SLIDE 3: CONSUMER VS OWNER
    # ==========================================================
    s3 = prs.slides.add_slide(blank_layout)
    set_bg(s3)
    add_header(s3, "Mindset Shift", "Consumer vs. Owner: Flipping The Script")

    add_card(s3, 0.9, 1.8, 5.6, 4.4, border=RGBColor(90, 40, 50))
    b1 = s3.shapes.add_textbox(Inches(1.2), Inches(2.05), Inches(5.0), Inches(3.9))
    tf = b1.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.text = "The Consumer Cycle"
    p.font.name = FONT_FAMILY
    p.font.size = Pt(20)
    p.font.bold = True
    p.font.color.rgb = ACCENT_RED

    p_sub = tf.add_paragraph()
    p_sub.text = "Spending on depreciating assets"
    p_sub.font.name = FONT_FAMILY
    p_sub.font.size = Pt(12)
    p_sub.font.color.rgb = TEXT_MUTED
    p_sub.space_after = Pt(12)

    c_items = [
        "• Spends $1,200 annually on new smartphone upgrades and retail gear.",
        "• Pays ongoing monthly subscription fees across multiple platforms.",
        "• Cash flows strictly outward to strengthen corporate balance sheets.",
        "• Outcome: 0% financial equity and declining physical resale value."
    ]
    for txt in c_items:
        bp = tf.add_paragraph()
        bp.text = txt
        bp.font.name = FONT_FAMILY
        bp.font.size = Pt(13)
        bp.font.color.rgb = TEXT_SECONDARY
        bp.space_before = Pt(8)

    add_card(s3, 6.8, 1.8, 5.6, 4.4, border=RGBColor(25, 90, 65))
    b2 = s3.shapes.add_textbox(Inches(7.1), Inches(2.05), Inches(5.0), Inches(3.9))
    tf = b2.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.text = "The Shareholder Advantage"
    p.font.name = FONT_FAMILY
    p.font.size = Pt(20)
    p.font.bold = True
    p.font.color.rgb = ACCENT_GREEN

    p_sub = tf.add_paragraph()
    p_sub.text = "Acquiring equity in operating cash flows"
    p_sub.font.name = FONT_FAMILY
    p_sub.font.size = Pt(12)
    p_sub.font.color.rgb = TEXT_MUTED
    p_sub.space_after = Pt(12)

    o_items = [
        "• Allocates capital into the very companies whose services they use daily.",
        "• When millions of customers purchase goods, corporate earnings rise.",
        "• Share valuations appreciate and quarterly dividends are distributed.",
        "• Outcome: Building compounding equity while management works for you."
    ]
    for txt in o_items:
        bp = tf.add_paragraph()
        bp.text = txt
        bp.font.name = FONT_FAMILY
        bp.font.size = Pt(13)
        bp.font.color.rgb = TEXT_SECONDARY
        bp.space_before = Pt(8)

    add_footer(s3, "Key Principle: You do not need to create a global conglomerate to profit from corporate success.")
    s3.notes_slide.notes_text_frame.text = (
        "Point out the financial contrast. Show that consumers trade money for depreciating items, "
        "while shareholders trade money for income-producing assets."
    )

    # ==========================================================
    # SLIDE 4: THREE CORE TERMS (VOCABULARY)
    # ==========================================================
    s4 = prs.slides.add_slide(blank_layout)
    set_bg(s4)
    add_header(s4, "Terminology", "Three Core Terms You Need To Master")

    terms = [
        ("A STOCK", "The Asset Category", ACCENT_CYAN, [
            "Definition:",
            "General ownership certificates in commercial companies.",
            "",
            "In Practice:",
            "\"I allocate 20% of monthly savings to the stock market.\"",
            "",
            "Category Level: Broad asset class."
        ]),
        ("A SHARE", "The Quantifiable Unit", ACCENT_GREEN, [
            "Definition:",
            "The exact countable slice of a single distinct enterprise.",
            "",
            "In Practice:",
            "\"I bought 4 shares of Microsoft at $410 per unit.\"",
            "",
            "Category Level: Specific individual unit."
        ]),
        ("THE MARKET", "The Exchange Platform", ACCENT_PURPLE, [
            "Definition:",
            "The clearinghouse (e.g., NYSE, NASDAQ) matching buyers & sellers.",
            "",
            "In Practice:",
            "\"Trading opens at 9:30 AM EST on international markets.\"",
            "",
            "Category Level: Transaction network."
        ])
    ]

    for i, (t_name, t_sub, col, lines) in enumerate(terms):
        cx = 0.9 + i * (step_w + step_gap)
        add_card(s4, cx, 1.8, step_w, 4.4)
        box = s4.shapes.add_textbox(Inches(cx + 0.3), Inches(2.1), Inches(step_w - 0.6), Inches(3.9))
        tf = box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

        p_t = tf.paragraphs[0]
        p_t.text = t_name
        p_t.font.name = FONT_FAMILY
        p_t.font.size = Pt(20)
        p_t.font.bold = True
        p_t.font.color.rgb = col
        p_t.alignment = PP_ALIGN.CENTER

        p_sub = tf.add_paragraph()
        p_sub.text = t_sub
        p_sub.font.name = FONT_FAMILY
        p_sub.font.size = Pt(12)
        p_sub.font.color.rgb = TEXT_MUTED
        p_sub.alignment = PP_ALIGN.CENTER
        p_sub.space_after = Pt(12)

        for l in lines:
            lp = tf.add_paragraph()
            lp.text = l
            lp.font.name = FONT_FAMILY
            lp.font.size = Pt(12)
            if "Definition:" in l or "In Practice:" in l:
                lp.font.color.rgb = TEXT_PRIMARY
                lp.font.bold = True
            elif "Category Level:" in l:
                lp.font.color.rgb = ACCENT_YELLOW
                lp.font.bold = True
            else:
                lp.font.color.rgb = TEXT_SECONDARY

    add_footer(s4, "Rule: You buy shares of an individual stock through the stock exchange network.")
    s4.notes_slide.notes_text_frame.text = (
        "Clarify that these terms are often mistakenly interchanged in casual conversation. "
        "Knowing the difference establishes credibility."
    )

    # ==========================================================
    # SLIDE 5: TWO ENGINES OF PROFIT (CAPITAL GAINS & DIVIDENDS)
    # ==========================================================
    s5 = prs.slides.add_slide(blank_layout)
    set_bg(s5)
    add_header(s5, "Cash Flow", "Two Ways You Actually Make Money")

    add_card(s5, 0.9, 1.8, 5.6, 4.4, border=RGBColor(30, 80, 110))
    b1 = s5.shapes.add_textbox(Inches(1.2), Inches(2.05), Inches(5.0), Inches(3.9))
    tf = b1.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.text = "1. Capital Gains (Buy Low, Sell High)"
    p.font.name = FONT_FAMILY
    p.font.size = Pt(19)
    p.font.bold = True
    p.font.color.rgb = ACCENT_CYAN

    p_sub = tf.add_paragraph()
    p_sub.text = "Value appreciation over time"
    p_sub.font.name = FONT_FAMILY
    p_sub.font.size = Pt(12)
    p_sub.font.color.rgb = TEXT_MUTED
    p_sub.space_after = Pt(10)

    cg_items = [
        "• You purchase 1 share of an expanding company at $50.",
        "• Company doubles revenue and releases innovative products.",
        "• Two years later, open-market demand pushes price to $135.",
        "• You sell the share and pocket +$85 (+170%) pure net profit!"
    ]
    for pt in cg_items:
        bp = tf.add_paragraph()
        bp.text = pt
        bp.font.name = FONT_FAMILY
        bp.font.size = Pt(13)
        bp.font.color.rgb = TEXT_SECONDARY
        bp.space_before = Pt(8)

    add_card(s5, 6.8, 1.8, 5.6, 4.4, border=RGBColor(25, 95, 65))
    b2 = s5.shapes.add_textbox(Inches(7.1), Inches(2.05), Inches(5.0), Inches(3.9))
    tf = b2.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.text = "2. Dividends (Direct Cash Payouts)"
    p.font.name = FONT_FAMILY
    p.font.size = Pt(19)
    p.font.bold = True
    p.font.color.rgb = ACCENT_GREEN

    p_sub = tf.add_paragraph()
    p_sub.text = "Passive cash flow distributed quarterly"
    p_sub.font.name = FONT_FAMILY
    p_sub.font.size = Pt(12)
    p_sub.font.color.rgb = TEXT_MUTED
    p_sub.space_after = Pt(10)

    div_items = [
        "• Profitable enterprises (Apple, Coca-Cola) share cash profits with owners.",
        "• Direct cash is deposited to your brokerage balance every 3 months.",
        "• Critical: You never have to sell your shares to receive this income.",
        "• DRIP Feature: Automatically reinvests dividends to purchase more shares!"
    ]
    for pt in div_items:
        bp = tf.add_paragraph()
        bp.text = pt
        bp.font.name = FONT_FAMILY
        bp.font.size = Pt(13)
        bp.font.color.rgb = TEXT_SECONDARY
        bp.space_before = Pt(8)

    add_footer(s5, "Summary: Capital gains grow your net worth; dividends provide recurring passive income.")
    s5.notes_slide.notes_text_frame.text = (
        "Explain both wealth engines: Capital appreciation (selling higher) and Dividends (quarterly profit payouts). "
        "Highlight how DRIP automates compounding."
    )

    # ==========================================================
    # SLIDE 6: SPECULATION VS INVESTING
    # ==========================================================
    s6 = prs.slides.add_slide(blank_layout)
    set_bg(s6)
    add_header(s6, "Risk Assessment", "Speculation vs. Long-Term Investing")

    add_card(s6, 0.9, 1.8, 5.6, 4.4, border=RGBColor(100, 40, 40))
    b1 = s6.shapes.add_textbox(Inches(1.2), Inches(2.05), Inches(5.0), Inches(3.9))
    tf = b1.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.text = "Short-Term Speculation"
    p.font.name = FONT_FAMILY
    p.font.size = Pt(20)
    p.font.bold = True
    p.font.color.rgb = ACCENT_RED

    spec_points = [
        "• Constantly monitoring 1-minute candlestick movements.",
        "• Chasing social media hype and unverified forum rumors.",
        "• High emotional volatility, elevated stress, and panic exits.",
        "• Statistical Fact: Over 90% of active retail day-traders lose capital.",
        "• Resembles a zero-sum wager rather than productive asset building."
    ]
    for pt in spec_points:
        bp = tf.add_paragraph()
        bp.text = pt
        bp.font.name = FONT_FAMILY
        bp.font.size = Pt(13)
        bp.font.color.rgb = TEXT_SECONDARY
        bp.space_before = Pt(8)

    add_card(s6, 6.8, 1.8, 5.6, 4.4, border=RGBColor(25, 95, 65))
    b2 = s6.shapes.add_textbox(Inches(7.1), Inches(2.05), Inches(5.0), Inches(3.9))
    tf = b2.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.text = "Systematic Investing"
    p.font.name = FONT_FAMILY
    p.font.size = Pt(20)
    p.font.bold = True
    p.font.color.rgb = ACCENT_GREEN

    inv_points = [
        "• Purchasing verified, profitable enterprises and broad market indexes.",
        "• Holding across multi-year cycles while the economy expands.",
        "• Low maintenance: Reviewing account allocations once per month.",
        "• Historical Fact: S&P 500 has never lost money over any 20-year rolling span.",
        "• Genuine wealth accumulated systematically without daily screen-watching."
    ]
    for pt in inv_points:
        bp = tf.add_paragraph()
        bp.text = pt
        bp.font.name = FONT_FAMILY
        bp.font.size = Pt(13)
        bp.font.color.rgb = TEXT_SECONDARY
        bp.space_before = Pt(8)

    add_footer(s6, "Warning: If someone guarantees overnight riches, their product is you.")
    s6.notes_slide.notes_text_frame.text = (
        "Make a clear distinction between gambling and true asset ownership. "
        "Show that systematic investing requires emotional discipline, not technical wizardry."
    )

    # ==========================================================
    # SLIDE 7: COMPOUND INTEREST (THE SNOWBALL)
    # ==========================================================
    s7 = prs.slides.add_slide(blank_layout)
    set_bg(s7)
    add_header(s7, "Mathematical Advantage", "Compound Interest: Time Outweighs Capital")

    add_card(s7, 0.9, 1.8, 4.2, 4.4, border=RGBColor(30, 80, 110))
    b1 = s7.shapes.add_textbox(Inches(1.1), Inches(2.2), Inches(3.8), Inches(3.6))
    tf = b1.text_frame
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.text = "~10%"
    p.font.name = FONT_FAMILY
    p.font.size = Pt(56)
    p.font.bold = True
    p.font.color.rgb = ACCENT_CYAN
    p.alignment = PP_ALIGN.CENTER

    p2 = tf.add_paragraph()
    p2.text = "Historical Annual Return"
    p2.font.name = FONT_FAMILY
    p2.font.size = Pt(16)
    p2.font.bold = True
    p2.font.color.rgb = TEXT_PRIMARY
    p2.alignment = PP_ALIGN.CENTER

    p3 = tf.add_paragraph()
    p3.text = "50-year benchmark track record of the US S&P 500 total return index."
    p3.font.name = FONT_FAMILY
    p3.font.size = Pt(12)
    p3.font.color.rgb = TEXT_MUTED
    p3.alignment = PP_ALIGN.CENTER
    p3.space_before = Pt(12)

    add_card(s7, 5.5, 1.8, 6.9, 4.4)
    b2 = s7.shapes.add_textbox(Inches(5.8), Inches(2.05), Inches(6.3), Inches(3.9))
    tf = b2.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.text = "The $100 / Month Compounding Trajectory"
    p.font.name = FONT_FAMILY
    p.font.size = Pt(20)
    p.font.bold = True
    p.font.color.rgb = ACCENT_GREEN

    calc_data = [
        ("Cash in Bank (0.5% return):", "$36,000 deposits yield ~$38,800 over 30 years.", TEXT_MUTED),
        ("Invested in S&P 500 (~10%):", "$36,000 deposits compound into $226,000+.", ACCENT_CYAN),
        ("Net Capital Multiplier:", "Over $190,000 created strictly from capital compound physics.", ACCENT_GREEN)
    ]
    for h, desc, c in calc_data:
        p_h = tf.add_paragraph()
        p_h.text = h
        p_h.font.name = FONT_FAMILY
        p_h.font.size = Pt(13)
        p_h.font.bold = True
        p_h.font.color.rgb = c
        p_h.space_before = Pt(10)

        p_d = tf.add_paragraph()
        p_d.text = desc
        p_d.font.name = FONT_FAMILY
        p_d.font.size = Pt(12)
        p_d.font.color.rgb = TEXT_SECONDARY

    add_footer(s7, "Takeaway: Starting 5 years earlier yields far greater wealth than attempting to contribute twice as much later.")
    s7.notes_slide.notes_text_frame.text = (
        "Emphasize the time value of money. Compounding is exponential: the curve accelerates dramatically in decades 2 and 3."
    )

    # ==========================================================
    # SLIDE 8: SINGLE STOCKS VS ETFS (DIVERSIFICATION)
    # ==========================================================
    s8 = prs.slides.add_slide(blank_layout)
    set_bg(s8)
    add_header(s8, "Risk Mitigation", "Portfolio Shield: Single Stocks vs. Index ETFs")

    add_card(s8, 0.9, 1.8, 5.6, 4.4)
    b1 = s8.shapes.add_textbox(Inches(1.2), Inches(2.05), Inches(5.0), Inches(3.9))
    tf = b1.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.text = "Single Company Stocks"
    p.font.name = FONT_FAMILY
    p.font.size = Pt(20)
    p.font.bold = True
    p.font.color.rgb = ACCENT_CYAN

    p_sub = tf.add_paragraph()
    p_sub.text = "Concentrated Corporate Exposure"
    p_sub.font.name = FONT_FAMILY
    p_sub.font.size = Pt(12)
    p_sub.font.color.rgb = TEXT_MUTED
    p_sub.space_after = Pt(10)

    s_items = [
        "• Unmitigated risk: Management mistakes can trigger catastrophic sell-offs.",
        "• Requires ongoing scrutiny of quarterly SEC regulatory and earnings filings.",
        "• Viable for high-conviction thematic satellite holdings.",
        "• Analogy: Staking an entire tournament outcome on one individual player."
    ]
    for it in s_items:
        bp = tf.add_paragraph()
        bp.text = it
        bp.font.name = FONT_FAMILY
        bp.font.size = Pt(13)
        bp.font.color.rgb = TEXT_SECONDARY
        bp.space_before = Pt(8)

    add_card(s8, 6.8, 1.8, 5.6, 4.4, border=RGBColor(25, 95, 65))
    b2 = s8.shapes.add_textbox(Inches(7.1), Inches(2.05), Inches(5.0), Inches(3.9))
    tf = b2.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.text = "Exchange Traded Funds (ETFs)"
    p.font.name = FONT_FAMILY
    p.font.size = Pt(20)
    p.font.bold = True
    p.font.color.rgb = ACCENT_GREEN

    p_sub = tf.add_paragraph()
    p_sub.text = "Broad Market Exposure (e.g., S&P 500 Index)"
    p_sub.font.name = FONT_FAMILY
    p_sub.font.size = Pt(12)
    p_sub.font.color.rgb = TEXT_MUTED
    p_sub.space_after = Pt(10)

    etf_items = [
        "• Complete diversification: Owning 500 top-tier enterprises simultaneously.",
        "• Underperforming companies are automatically purged and replaced.",
        "• Near-zero ongoing management overhead required.",
        "• Recommended by Warren Buffett as the optimal route for 99% of investors."
    ]
    for it in etf_items:
        bp = tf.add_paragraph()
        bp.text = it
        bp.font.name = FONT_FAMILY
        bp.font.size = Pt(13)
        bp.font.color.rgb = TEXT_SECONDARY
        bp.space_before = Pt(8)

    add_footer(s8, "Strategy: Establish a broad index core before deploying capital into individual corporate names.")
    s8.notes_slide.notes_text_frame.text = (
        "Explain that an ETF trades exactly like a stock on the open market, "
        "giving you institutional diversification with retail liquidity."
    )

    # ==========================================================
    # SLIDE 9: 3-STEP STARTER PACK
    # ==========================================================
    s9 = prs.slides.add_slide(blank_layout)
    set_bg(s9)
    add_header(s9, "Implementation", "Execution: The 3-Step Investment Engine")

    steps_s9 = [
        ("PHASE 01", "Select a Brokerage", ACCENT_CYAN, [
            "Open an account with a regulated, zero-commission financial institution.",
            "",
            "Platform criteria:",
            "• Zero account maintenance charges",
            "• Clean mobile interface & robust security",
            "• Support for fractional share ordering"
        ]),
        ("PHASE 02", "Fractional Shares", ACCENT_GREEN, [
            "Capital barriers no longer exist in modern markets.",
            "",
            "Fractional mechanics:",
            "• If one share trades at $400, you can allocate as little as $10.",
            "• Allows immediate portfolio construction on any budget."
        ]),
        ("PHASE 03", "Automate (DCA)", ACCENT_PURPLE, [
            "Dollar-Cost Averaging (DCA):",
            "• Schedule fixed monthly deposits coinciding with income dates.",
            "• Automatically acquires more units during market dips.",
            "• Removes emotional panic from the equation."
        ])
    ]

    for i, (p_tag, p_name, col, lines) in enumerate(steps_s9):
        cx = 0.9 + i * (step_w + step_gap)
        add_card(s9, cx, 1.8, step_w, 4.4)
        box = s9.shapes.add_textbox(Inches(cx + 0.3), Inches(2.1), Inches(step_w - 0.6), Inches(3.9))
        tf = box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

        p_t = tf.paragraphs[0]
        p_t.text = p_tag
        p_t.font.name = FONT_FAMILY
        p_t.font.size = Pt(11)
        p_t.font.bold = True
        p_t.font.color.rgb = col

        p_name_el = tf.add_paragraph()
        p_name_el.text = p_name
        p_name_el.font.name = FONT_FAMILY
        p_name_el.font.size = Pt(18)
        p_name_el.font.bold = True
        p_name_el.font.color.rgb = TEXT_PRIMARY
        p_name_el.space_after = Pt(10)

        for l in lines:
            lp = tf.add_paragraph()
            lp.text = l
            lp.font.name = FONT_FAMILY
            lp.font.size = Pt(12)
            if "Platform criteria:" in l or "Fractional mechanics:" in l or "Dollar-Cost Averaging" in l:
                lp.font.color.rgb = ACCENT_YELLOW
                lp.font.bold = True
            else:
                lp.font.color.rgb = TEXT_SECONDARY

    add_footer(s9, "Milestone: Consistency in contribution volume consistently surpasses market-timing genius.")
    s9.notes_slide.notes_text_frame.text = (
        "Reiterate that waiting for the 'perfect dip' usually costs more money than just setting up an automated monthly buy."
    )

    # ==========================================================
    # SLIDE 10: CORE PRINCIPLES & WRAP UP
    # ==========================================================
    s10 = prs.slides.add_slide(blank_layout)
    set_bg(s10)

    tag_bg = add_card(s10, 4.8, 0.9, 3.7, 0.42, border=ACCENT_GREEN)
    tag_box = s10.shapes.add_textbox(Inches(4.8), Inches(0.9), Inches(3.7), Inches(0.42))
    tf = tag_box.text_frame
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.text = "STRATEGIC PRINCIPLES"
    p.font.name = FONT_FAMILY
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = ACCENT_GREEN
    p.alignment = PP_ALIGN.CENTER

    main_box = s10.shapes.add_textbox(Inches(0.9), Inches(1.6), Inches(11.5), Inches(1.8))
    tf = main_box.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.text = "Start Early. Stay Rational.\nLet Compounding Work."
    p.font.name = FONT_FAMILY
    p.font.size = Pt(40)
    p.font.bold = True
    p.font.color.rgb = TEXT_PRIMARY
    p.alignment = PP_ALIGN.CENTER

    cards_summary = [
        ("01. Capital Reserve", "Never invest capital allocated for near-term obligations, rent, or emergencies. Maintain liquidity.", ACCENT_CYAN),
        ("02. Volatility Tolerance", "Price pullbacks are natural market breathers. Refrain from liquidating during standard corrections.", ACCENT_GREEN),
        ("03. Relentless Horizon", "Time in the market systematically outperforms market timing. Focus on business fundamentals.", ACCENT_PURPLE)
    ]
    for i, (st, desc, c) in enumerate(cards_summary):
        cx = 0.9 + i * (step_w + step_gap)
        add_card(s10, cx, 3.8, step_w, 2.1)
        box = s10.shapes.add_textbox(Inches(cx + 0.25), Inches(4.0), Inches(step_w - 0.5), Inches(1.7))
        tf = box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

        p = tf.paragraphs[0]
        p.text = st
        p.font.name = FONT_FAMILY
        p.font.size = Pt(15)
        p.font.bold = True
        p.font.color.rgb = c
        p.space_after = Pt(6)

        p2 = tf.add_paragraph()
        p2.text = desc
        p2.font.name = FONT_FAMILY
        p2.font.size = Pt(12)
        p2.font.color.rgb = TEXT_SECONDARY

    add_footer(s10, "Open Floor: Questions, Discussion & Portfolio Exploration.", color=ACCENT_CYAN)
    s10.notes_slide.notes_text_frame.text = (
        "Conclude with clarity. Reiterate that financial independence is not a sprint, but an endurance marathon. "
        "Invite the room to ask questions or discuss specific topics."
    )

    out_path = r"c:\English\stocks_and_shares_gen_z.pptx"
    prs.save(out_path)
    print(f"Perfect 10-Slide Deck generated at: {out_path}")

if __name__ == "__main__":
    create_10_slide_deck()
