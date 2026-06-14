from PIL import Image, ImageDraw, ImageFont
import math

W, H = 1080, 1920
bg_color = (245, 240, 235)
img = Image.new("RGB", (W, H), bg_color)
draw = ImageDraw.Draw(img)

def get_font(size, bold=False, italic=False):
    paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSerif.ttf",
    ]
    for p in paths:
        try:
            return ImageFont.truetype(p, size)
        except:
            pass
    return ImageFont.load_default()

def get_sans(size, bold=False):
    paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for p in paths:
        try:
            return ImageFont.truetype(p, size)
        except:
            pass
    return ImageFont.load_default()

def centered_text(draw, y, text, font, color):
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    draw.text(((W - tw) // 2, y), text, font=font, fill=color)
    return bbox[3] - bbox[1]

# ── TOP SECTION ──────────────────────────────────────────────
y = 72
# Rating number
f = get_sans(36, bold=True)
centered_text(draw, y, "4.8/5", f, (60, 50, 40))
y += 52

# Stars
star_color = (50, 40, 30)
star_empty = (200, 190, 180)
star_size = 38
star_gap = 10
stars_total_w = 5 * star_size + 4 * star_gap
sx = (W - stars_total_w) // 2

def draw_star(draw, cx, cy, r, fill):
    pts = []
    for i in range(10):
        angle = math.radians(-90 + i * 36)
        rad = r if i % 2 == 0 else r * 0.4
        pts.append((cx + rad * math.cos(angle), cy + rad * math.sin(angle)))
    draw.polygon(pts, fill=fill)

for i in range(5):
    cx = sx + i * (star_size + star_gap) + star_size // 2
    cy = y + star_size // 2
    if i < 4:
        draw_star(draw, cx, cy, star_size // 2, star_color)
    else:
        # half star: draw empty then half filled
        draw_star(draw, cx, cy, star_size // 2, star_empty)
        # clip left half
        half = Image.new("RGB", (star_size, star_size), bg_color)
        hdraw = ImageDraw.Draw(half)
        draw_star(hdraw, star_size // 2, star_size // 2, star_size // 2, star_color)
        mask = Image.new("L", (star_size, star_size), 0)
        mdraw = ImageDraw.Draw(mask)
        mdraw.rectangle([0, 0, star_size // 2, star_size], fill=255)
        img.paste(half, (cx - star_size // 2, cy - star_size // 2), mask)

y += star_size + 12

f_sub = get_sans(28)
centered_text(draw, y, "Loved By +300 Shoppers", f_sub, (120, 110, 100))
y += 50

# ── HEADLINE ─────────────────────────────────────────────────
f_big = get_font(130, bold=True)
centered_text(draw, y, "Same essence", f_big, (35, 28, 22))
y += 148

f_italic = get_font(118)
centered_text(draw, y, "Different receipt.", f_italic, (139, 94, 60))
y += 150

# ── RECEIPTS ─────────────────────────────────────────────────
RECEIPT_W = 420
RECEIPT_H = 660
SLOT_H = 38
gap = 40
left_x = (W - 2 * RECEIPT_W - gap) // 2
right_x = left_x + RECEIPT_W + gap
receipt_y = y + 30

def draw_slot(draw, x, y, w):
    # silver bar
    for dy in range(SLOT_H):
        t = dy / SLOT_H
        gray = int(160 + 60 * (1 - abs(t - 0.5) * 2))
        draw.rectangle([x, y + dy, x + w, y + dy + 1], fill=(gray, gray, gray))
    draw.rectangle([x, y, x + w, y + SLOT_H], outline=(100, 100, 100), width=2)

def draw_receipt(draw, img, rx, ry, rw, rh, product_name, brand, price, desc):
    # shadow
    shadow_offset = 8
    draw.rectangle([rx + shadow_offset, ry + SLOT_H + shadow_offset,
                    rx + rw + shadow_offset, ry + rh + shadow_offset],
                   fill=(200, 195, 190))
    # white receipt body
    draw.rectangle([rx, ry + SLOT_H, rx + rw, ry + rh], fill=(255, 255, 255))
    # border
    draw.rectangle([rx, ry + SLOT_H, rx + rw, ry + rh], outline=(220, 215, 210), width=1)

    # zigzag bottom
    zig_y = ry + rh
    zig_size = 10
    n_zigs = rw // zig_size
    pts = [(rx, zig_y)]
    for i in range(n_zigs):
        px = rx + i * zig_size
        pts.append((px + zig_size // 2, zig_y - zig_size // 2))
        pts.append((px + zig_size, zig_y))
    pts.append((rx + rw, zig_y))
    pts.append((rx + rw, zig_y + 20))
    pts.append((rx, zig_y + 20))
    draw.polygon(pts, fill=(255, 255, 255))

    inner_x = rx + 24
    inner_w = rw - 48
    cy = ry + SLOT_H + 30

    # Brand name
    fb = get_sans(42, bold=True)
    bbox = draw.textbbox((0, 0), brand, font=fb)
    bw = bbox[2] - bbox[0]
    draw.text((rx + (rw - bw) // 2, cy), brand, font=fb, fill=(20, 18, 15))
    cy += 52

    # Product name
    fp = get_sans(28)
    bbox = draw.textbbox((0, 0), product_name, font=fp)
    pw = bbox[2] - bbox[0]
    draw.text((rx + (rw - pw) // 2, cy), product_name, font=fp, fill=(80, 70, 60))
    cy += 42

    # Divider
    draw.line([inner_x, cy, inner_x + inner_w, cy], fill=(180, 175, 170), width=1)
    cy += 16

    # Simple bottle illustration
    bottle_cx = rx + rw // 2
    bottle_top = cy
    bottle_h = 140

    if "SK-II" in brand:
        # Elegant square bottle (Pitera style) - red/amber
        bw2, bh2 = 70, 110
        bx = bottle_cx - bw2 // 2
        by = bottle_top
        # cap
        draw.rectangle([bx + 15, by, bx + bw2 - 15, by + 22], fill=(180, 140, 40))
        # body gradient simulation
        for dy in range(bh2):
            t = dy / bh2
            r = int(180 - 30 * t)
            g = int(40 + 10 * t)
            b = int(40)
            draw.rectangle([bx, by + 22 + dy, bx + bw2, by + 22 + dy + 1], fill=(r, g, b))
        draw.rectangle([bx, by + 22, bx + bw2, by + 22 + bh2], outline=(120, 80, 20), width=2)
        # label area
        draw.rectangle([bx + 8, by + 50, bx + bw2 - 8, by + 100], fill=(255, 240, 210, 180))
        fl = get_sans(13)
        draw.text((bx + 12, by + 54), "SK-II", font=fl, fill=(80, 50, 10))
        draw.text((bx + 8, by + 70), "PITERA™", font=fl, fill=(80, 50, 10))
        cy += bh2 + 30
    else:
        # Clear/white bottle (COSRX style)
        bw2, bh2 = 60, 120
        bx = bottle_cx - bw2 // 2
        by = bottle_top
        # cap
        draw.rectangle([bx + 10, by, bx + bw2 - 10, by + 20], fill=(30, 30, 30))
        # body
        for dy in range(bh2):
            t = dy / bh2
            gv = int(248 - 8 * t)
            draw.rectangle([bx, by + 20 + dy, bx + bw2, by + 20 + dy + 1], fill=(gv, gv, gv))
        draw.rectangle([bx, by + 20, bx + bw2, by + 20 + bh2], outline=(180, 180, 180), width=2)
        # number "1" label
        fn = get_sans(36, bold=True)
        draw.text((bx + 18, by + 38), "1", font=fn, fill=(40, 40, 40))
        fl = get_sans(11)
        draw.text((bx + 8, by + 80), "Galactomyces", font=fl, fill=(80, 80, 80))
        cy += bh2 + 30

    # Divider
    draw.line([inner_x, cy, inner_x + inner_w, cy], fill=(180, 175, 170), width=2)
    draw.line([inner_x, cy + 4, inner_x + inner_w, cy + 4], fill=(180, 175, 170), width=2)
    cy += 18

    # Price
    fp2 = get_font(88, bold=True)
    bbox = draw.textbbox((0, 0), price, font=fp2)
    pw2 = bbox[2] - bbox[0]
    draw.text((rx + (rw - pw2) // 2, cy), price, font=fp2, fill=(15, 12, 8))
    cy += 100

    # Description small text
    fdesc = get_sans(17)
    words = desc.split()
    lines = []
    line = ""
    max_chars = 40
    for w in words:
        if len(line) + len(w) + 1 <= max_chars:
            line = (line + " " + w).strip()
        else:
            lines.append(line)
            line = w
    if line:
        lines.append(line)
    for ln in lines[:3]:
        bbox = draw.textbbox((0, 0), ln, font=fdesc)
        lw = bbox[2] - bbox[0]
        draw.text((rx + (rw - lw) // 2, cy), ln, font=fdesc, fill=(120, 115, 110))
        cy += 22
    cy += 10

    # Barcode
    barcode_x = inner_x
    barcode_w = inner_w
    barcode_h = 52
    bar_y = cy
    import random
    random.seed(42 if "SK" in brand else 77)
    bx2 = barcode_x
    while bx2 < barcode_x + barcode_w:
        bar_w = random.randint(1, 4)
        if random.random() > 0.5:
            draw.rectangle([bx2, bar_y, bx2 + bar_w, bar_y + barcode_h], fill=(20, 18, 15))
        bx2 += bar_w + random.randint(0, 2)
    cy += barcode_h + 14

    # Thank you
    ft = get_sans(22, bold=True)
    bbox = draw.textbbox((0, 0), "THANK YOU!", font=ft)
    tw2 = bbox[2] - bbox[0]
    draw.text((rx + (rw - tw2) // 2, cy), "THANK YOU!", font=ft, fill=(60, 55, 50))

# Draw slots
draw_slot(draw, left_x, receipt_y, RECEIPT_W)
draw_slot(draw, right_x, receipt_y, RECEIPT_W)

# Draw receipts
draw_receipt(draw, img, left_x, receipt_y, RECEIPT_W, RECEIPT_H,
             "Pitera Essence", "SK-II", "$99",
             "Fermented yeast extract. Brightens, smooths and refines skin texture.")

draw_receipt(draw, img, right_x, receipt_y, RECEIPT_W, RECEIPT_H,
             "Galactomyces 95", "COSRX", "$17",
             "Fermented yeast extract. Brightens, smooths and refines skin texture.")

img.save("/home/user/Pillow/reel_cover.png", quality=95)
print("Saved reel_cover.png")
