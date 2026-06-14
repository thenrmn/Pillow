#!/usr/bin/env python3
"""Generate a Reel cover image using only PIL/Pillow."""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os
import math

# Canvas dimensions
W, H = 1080, 1920

# Colors
BG_COLOR = "#F5F0EB"
DARK_TEXT = "#1A1A1A"
BROWN_COPPER = "#8B5E3C"
GOLD_AMBER = "#C8922A"
RECEIPT_BG = "#FFFFFF"
STAR_COLOR = "#F4A430"
BARCODE_COLOR = "#222222"


def load_font(size, bold=False):
    """Try to load a system font, fall back to default."""
    paths = []
    if bold:
        paths = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        ]
    else:
        paths = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        ]
    for path in paths:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


def apply_italic_shear(img_rgba, shear=0.22):
    """Apply a horizontal shear to simulate italic text."""
    w, h = img_rgba.size
    new_w = w + int(h * shear)
    result = Image.new("RGBA", (new_w, h), (0, 0, 0, 0))
    for y in range(h):
        offset = int((h - y) * shear)
        row = img_rgba.crop((0, y, w, y + 1))
        result.paste(row, (offset, y))
    return result


def draw_italic_text(canvas, text, font, color, x, y, shear=0.22):
    """Draw italic text using shear transform on a temp image."""
    bbox = font.getbbox(text)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    pad = 30
    tmp = Image.new("RGBA", (tw + pad * 2, th + pad * 2), (0, 0, 0, 0))
    tmp_draw = ImageDraw.Draw(tmp)
    tmp_draw.text((pad - bbox[0], pad - bbox[1]), text, font=font, fill=color)
    sheared = apply_italic_shear(tmp, shear)
    canvas.paste(sheared, (x - pad, y - pad), sheared)


def draw_bottle_skii(draw, cx, top_y, height=185):
    """Draw SK-II Pitera Essence bottle silhouette in gold/amber tones."""
    bottle_w = 62
    neck_w = 24
    neck_h = 42
    cap_w = 32
    cap_h = 20

    bx = cx - bottle_w // 2
    by = top_y

    # Shadow
    draw.rounded_rectangle(
        [bx + 5, by + neck_h + 5, bx + bottle_w + 5, by + height + 5],
        radius=10, fill=(0, 0, 0, 35)
    )

    # Body gradient (left to right bands)
    for i in range(bottle_w):
        ratio = i / bottle_w
        r = int(0xC0 + (0xE0 - 0xC0) * (0.5 - abs(ratio - 0.5)))
        g = int(0x88 + (0xAA - 0x88) * (0.5 - abs(ratio - 0.5)))
        b = int(0x25 + (0x40 - 0x25) * (0.5 - abs(ratio - 0.5)))
        draw.line(
            [(bx + i, by + neck_h + 12), (bx + i, by + height - 10)],
            fill=(max(0,min(255,r)), max(0,min(255,g)), max(0,min(255,b))), width=1
        )

    # Body outline
    draw.rounded_rectangle(
        [bx, by + neck_h, bx + bottle_w, by + height],
        radius=10, outline="#7A4E15", width=2
    )

    # Shoulder
    shoulder_pts = [
        (cx - neck_w // 2, by + neck_h),
        (cx + neck_w // 2, by + neck_h),
        (bx + bottle_w, by + neck_h + 12),
        (bx, by + neck_h + 12),
    ]
    draw.polygon(shoulder_pts, fill="#C8922A", outline="#7A4E15")

    # Neck
    draw.rectangle(
        [cx - neck_w // 2, by + cap_h, cx + neck_w // 2, by + neck_h],
        fill="#C8922A", outline="#7A4E15", width=2
    )

    # Cap
    draw.rounded_rectangle(
        [cx - cap_w // 2, by, cx + cap_w // 2, by + cap_h],
        radius=5, fill="#5A3A10", outline="#3A2008", width=1
    )

    # Label area on body
    label_top = by + neck_h + 28
    label_bot = by + height - 28
    label_l = bx + 9
    label_r = bx + bottle_w - 9
    draw.rectangle([label_l, label_top, label_r, label_bot], fill="#FFF8E7", outline="#C8922A", width=1)

    # Highlight
    draw.line([(bx + 10, by + neck_h + 18), (bx + 10, by + height - 18)], fill="#E8D090", width=3)


def draw_bottle_cosrx(draw, cx, top_y, height=185):
    """Draw COSRX Galactomyces bottle silhouette in clear/white tones."""
    bottle_w = 56
    neck_w = 20
    neck_h = 55
    cap_w = 28
    cap_h = 18
    pump_h = 28

    bx = cx - bottle_w // 2
    by = top_y

    # Shadow
    draw.rounded_rectangle(
        [bx + 5, by + 5, bx + bottle_w + 5, by + height + 5],
        radius=8, fill=(0, 0, 0, 25)
    )

    # Body gradient
    for i in range(bottle_w):
        ratio = i / bottle_w
        val = int(228 + 22 * (0.5 - abs(ratio - 0.5)))
        draw.line(
            [(bx + i, by + neck_h + 5), (bx + i, by + height - 5)],
            fill=(val, val, val), width=1
        )

    draw.rounded_rectangle(
        [bx, by + neck_h, bx + bottle_w, by + height],
        radius=8, outline="#AAAAAA", width=2
    )

    # Neck
    draw.rectangle(
        [cx - neck_w // 2, by + pump_h + cap_h, cx + neck_w // 2, by + neck_h],
        fill="#F0F0F0", outline="#AAAAAA", width=1
    )

    # Pump head
    draw.rounded_rectangle(
        [cx - cap_w // 2, by + pump_h, cx + cap_w // 2, by + pump_h + cap_h],
        radius=4, fill="#CCCCCC", outline="#999999", width=1
    )

    # Pump tube
    draw.line([(cx, by + 2), (cx, by + pump_h)], fill="#BBBBBB", width=4)
    draw.ellipse([cx - 5, by - 4, cx + 5, by + 6], fill="#CCCCCC", outline="#999999")

    # Label
    label_top = by + neck_h + 22
    label_bot = by + height - 22
    label_l = bx + 7
    label_r = bx + bottle_w - 7
    draw.rectangle([label_l, label_top, label_r, label_bot], fill="#FFFFFF", outline="#CCCCCC", width=1)

    # Highlight
    draw.line([(bx + 9, by + neck_h + 12), (bx + 9, by + height - 12)], fill="#FFFFFF", width=4)


def draw_barcode(draw, x, y, width):
    """Draw barcode lines."""
    bar_area_w = width - 30
    start_x = x + 15
    num_bars = 38
    pos = start_x
    bar_unit = bar_area_w / (num_bars * 1.7)
    for i in range(num_bars):
        if i % 5 == 0:
            bw = bar_unit * 1.9
        elif i % 4 == 0:
            bw = bar_unit * 0.7
        elif i % 3 == 0:
            bw = bar_unit * 1.3
        else:
            bw = bar_unit * 1.1
        bw = max(1.0, bw)
        bh = 30 if i % 6 == 0 else (25 if i % 3 == 0 else 28)
        draw.rectangle([pos, y, pos + bw, y + bh], fill=BARCODE_COLOR)
        pos += bw * 2.0
        if pos > start_x + bar_area_w:
            break


def draw_zigzag_bottom(x, y, width, amplitude=9, segments=22):
    """Return points for a zigzag torn edge polygon."""
    pts = [(x, y)]
    seg_w = width / segments
    for i in range(segments + 1):
        px = x + i * seg_w
        py = y + (amplitude if i % 2 == 0 else -amplitude)
        pts.append((px, py))
    pts.append((x + width, y + amplitude + 15))
    pts.append((x + width, y + amplitude + 30))
    pts.append((x, y + amplitude + 30))
    return pts


def draw_receipt(canvas, x, y, width, height, brand_name, product_name,
                 price, description, bottle_fn):
    """Draw a receipt card with ATM slot."""
    draw = ImageDraw.Draw(canvas)

    # --- Drop shadow ---
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    sh_draw = ImageDraw.Draw(shadow)
    sh_draw.rounded_rectangle(
        [x + 9, y + 9, x + width + 9, y + height + 9],
        radius=10, fill=(0, 0, 0, 55)
    )
    shadow_blur = shadow.filter(ImageFilter.GaussianBlur(radius=10))
    canvas.paste(shadow_blur, (0, 0), shadow_blur)
    draw = ImageDraw.Draw(canvas)

    # --- ATM Slot bar ---
    slot_h = 30
    slot_y = y - slot_h + 6
    for i in range(slot_h):
        ratio = i / slot_h
        if ratio < 0.25:
            val = int(160 + 80 * (ratio / 0.25))
        elif ratio < 0.6:
            val = int(240 - 15 * ((ratio - 0.25) / 0.35))
        else:
            val = int(225 - 50 * ((ratio - 0.6) / 0.4))
        draw.line(
            [(x - 12, slot_y + i), (x + width + 12, slot_y + i)],
            fill=(val, val, val), width=1
        )
    slit_y = slot_y + slot_h // 2 - 3
    draw.rectangle([x + 18, slit_y, x + width - 18, slit_y + 7], fill="#2A2A2A")
    draw.rounded_rectangle(
        [x - 12, slot_y, x + width + 12, slot_y + slot_h],
        radius=5, outline="#555555", width=1
    )

    # --- Receipt white body ---
    zigzag_y = y + height - 32
    zig_pts = draw_zigzag_bottom(x, zigzag_y, width)

    receipt_layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    rl_draw = ImageDraw.Draw(receipt_layer)
    rl_draw.rectangle([x, y, x + width, y + height + 30], fill=(255, 255, 255, 255))
    # Cut out zigzag
    rl_draw.polygon(zig_pts, fill=(0, 0, 0, 0))
    canvas.paste(receipt_layer, (0, 0), receipt_layer)
    draw = ImageDraw.Draw(canvas)

    cx = x + width // 2

    # Top dashed separator
    dash_y = y + 14
    for dx in range(x + 18, x + width - 18, 9):
        draw.line([(dx, dash_y), (dx + 4, dash_y)], fill="#DDDDDD", width=1)

    # Brand name
    brand_font = load_font(44, bold=True)
    bb = brand_font.getbbox(brand_name)
    bw = bb[2] - bb[0]
    draw.text((cx - bw // 2, y + 24), brand_name, font=brand_font, fill=DARK_TEXT)

    # Product name
    prod_font = load_font(18)
    pb = prod_font.getbbox(product_name)
    pw = pb[2] - pb[0]
    draw.text((cx - pw // 2, y + 74), product_name, font=prod_font, fill="#555555")

    # Divider
    div_y = y + 102
    draw.line([(x + 22, div_y), (x + width - 22, div_y)], fill="#EEEEEE", width=1)

    # Bottle
    bottle_top = y + 114
    bottle_h = 185
    bottle_fn(draw, cx, bottle_top, bottle_h)

    # Price
    price_font = load_font(58, bold=True)
    pb2 = price_font.getbbox(price)
    pw2 = pb2[2] - pb2[0]
    price_y = bottle_top + bottle_h + 12
    draw.text((cx - pw2 // 2, price_y), price, font=price_font, fill=DARK_TEXT)

    # Divider
    div2_y = price_y + 72
    draw.line([(x + 22, div2_y), (x + width - 22, div2_y)], fill="#EEEEEE", width=1)

    # Description text (wrapped)
    desc_font = load_font(13)
    desc_y = div2_y + 10
    max_chars = int((width - 44) / 6.5)
    words = description.split()
    lines_desc = []
    current = ""
    for w in words:
        if len(current) + len(w) + 1 <= max_chars:
            current = (current + " " + w).strip()
        else:
            if current:
                lines_desc.append(current)
            current = w
    if current:
        lines_desc.append(current)
    for line in lines_desc[:3]:
        lb = desc_font.getbbox(line)
        lw = lb[2] - lb[0]
        draw.text((cx - lw // 2, desc_y), line, font=desc_font, fill="#777777")
        desc_y += 19

    # Barcode
    bc_y = desc_y + 12
    draw_barcode(draw, x, bc_y, width)

    # Barcode digits
    bc_num_font = load_font(11)
    bc_num = "4 71234 56789 0"
    bnb = bc_num_font.getbbox(bc_num)
    bnw = bnb[2] - bnb[0]
    draw.text((cx - bnw // 2, bc_y + 33), bc_num, font=bc_num_font, fill="#555555")

    # Thank you
    ty_font = load_font(19, bold=True)
    ty_text = "THANK YOU!"
    tyb = ty_font.getbbox(ty_text)
    tyw = tyb[2] - tyb[0]
    ty_y = bc_y + 56
    draw.text((cx - tyw // 2, ty_y), ty_text, font=ty_font, fill="#888888")

    # Bottom dashed separator
    bdash_y = ty_y + 30
    for dx in range(x + 18, x + width - 18, 9):
        draw.line([(dx, bdash_y), (dx + 4, bdash_y)], fill="#DDDDDD", width=1)

    # Zigzag outline
    draw.line(zig_pts, fill="#E8E8E8", width=2)


def main():
    img = Image.new("RGBA", (W, H), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # Subtle background horizontal lines texture
    for ly in range(0, H, 38):
        draw.line([(0, ly), (W, ly)], fill=(0, 0, 0, 7), width=1)

    # =============================================
    # TOP SECTION: Rating score + stars + tagline
    # =============================================
    score_font = load_font(34, bold=True)
    score_text = "4.8 / 5"
    sb = score_font.getbbox(score_text)
    sw = sb[2] - sb[0]
    score_y = 88
    draw.text((W // 2 - sw // 2, score_y), score_text, font=score_font, fill=DARK_TEXT)

    # Stars row
    star_font = load_font(38)
    star_size = 38
    gap = 7
    total_star_w = 5 * star_size + 4 * gap
    sx_start = W // 2 - total_star_w // 2
    star_y = score_y + 52

    for i in range(4):
        draw.text((sx_start + i * (star_size + gap), star_y), "★", font=star_font, fill=STAR_COLOR)

    # Half star at index 4
    hsx = sx_start + 4 * (star_size + gap)
    draw.text((hsx, star_y), "★", font=star_font, fill="#DDDDDD")
    half_tmp = Image.new("RGBA", (star_size + 22, star_size + 12), (0, 0, 0, 0))
    half_draw = ImageDraw.Draw(half_tmp)
    half_draw.text((0, 0), "★", font=star_font, fill=STAR_COLOR)
    half_crop = half_tmp.crop((0, 0, (star_size + 22) // 2, star_size + 12))
    img.paste(half_crop, (hsx, star_y), half_crop)

    draw = ImageDraw.Draw(img)

    # "Loved by" text
    loved_font = load_font(22)
    loved_text = "Loved By +300 Shoppers"
    lb = loved_font.getbbox(loved_text)
    lw = lb[2] - lb[0]
    loved_y = star_y + star_size + 14
    draw.text((W // 2 - lw // 2, loved_y), loved_text, font=loved_font, fill="#666666")

    # Decorative divider
    line_y = loved_y + 42
    draw.line([(W // 2 - 90, line_y), (W // 2 + 90, line_y)], fill="#CCCCCC", width=1)

    # =============================================
    # HEADLINE
    # =============================================
    headline_y = line_y + 26

    h1_font = load_font(110, bold=True)
    h1_text = "Same essence"
    h1b = h1_font.getbbox(h1_text)
    h1w = h1b[2] - h1b[0]
    if h1w > W - 50:
        h1_font = load_font(90, bold=True)
        h1b = h1_font.getbbox(h1_text)
        h1w = h1b[2] - h1b[0]
    draw.text((W // 2 - h1w // 2, headline_y), h1_text, font=h1_font, fill=DARK_TEXT)
    h1h = h1b[3] - h1b[1]

    h2_y = headline_y + h1h + 10
    h2_font = load_font(96, bold=False)
    h2_text = "Different receipt."
    h2b = h2_font.getbbox(h2_text)
    h2w = h2b[2] - h2b[0]
    if h2w > W - 50:
        h2_font = load_font(78, bold=False)
        h2b = h2_font.getbbox(h2_text)
        h2w = h2b[2] - h2b[0]

    draw_italic_text(img, h2_text, h2_font, BROWN_COPPER, W // 2 - h2w // 2 - 20, h2_y)
    h2h = h2b[3] - h2b[1]

    draw = ImageDraw.Draw(img)

    # =============================================
    # RECEIPT CARDS
    # =============================================
    RECEIPT_W = 422
    RECEIPT_H = 700
    GAP = 28
    TOTAL_W = RECEIPT_W * 2 + GAP
    rx_start = (W - TOTAL_W) // 2

    receipt_top = h2_y + h2h + 65
    if receipt_top + RECEIPT_H > H - 50:
        receipt_top = H - RECEIPT_H - 50

    description = "Fermented yeast extract. Brightens, smooths, and refines skin texture."

    draw_receipt(
        canvas=img,
        x=rx_start,
        y=receipt_top,
        width=RECEIPT_W,
        height=RECEIPT_H,
        brand_name="SK-II",
        product_name="Pitera Essence",
        price="$99",
        description=description,
        bottle_fn=draw_bottle_skii,
    )

    draw_receipt(
        canvas=img,
        x=rx_start + RECEIPT_W + GAP,
        y=receipt_top,
        width=RECEIPT_W,
        height=RECEIPT_H,
        brand_name="COSRX",
        product_name="Galactomyces 95",
        price="$17",
        description=description,
        bottle_fn=draw_bottle_cosrx,
    )

    draw = ImageDraw.Draw(img)

    # Bottom tagline
    bottom_y = receipt_top + RECEIPT_H + 25
    if bottom_y + 35 < H:
        bot_font = load_font(21)
        bot_text = "Same results. Smarter spending."
        bb2 = bot_font.getbbox(bot_text)
        bw2 = bb2[2] - bb2[0]
        draw.text((W // 2 - bw2 // 2, bottom_y), bot_text, font=bot_font, fill="#999999")

    # Save
    out = img.convert("RGB")
    out_path = "/home/user/Pillow/reel_cover.png"
    out.save(out_path, "PNG", optimize=True)
    print(f"Saved: {out_path}")
    size = os.path.getsize(out_path)
    print(f"File size: {size:,} bytes ({size / 1024:.1f} KB)")


if __name__ == "__main__":
    main()
