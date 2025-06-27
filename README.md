from PIL import Image, ImageDraw, ImageFont
import matplotlib.pyplot as plt

# Helper to create a logo sketch
def create_logo(text_main, text_sub, style, decorative_element):
    img = Image.new('RGB', (800, 400), color='white')
    d = ImageDraw.Draw(img)
    
    # Fonts (placeholders for now)
    try:
        main_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf", 48)
        sub_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 24)
    except IOError:
        main_font = ImageFont.load_default()
        sub_font = ImageFont.load_default()
    
    # Text positions
    d.text((50, 50), text_main, font=main_font, fill="black")
    d.text((50, 120), text_sub, font=sub_font, fill="gray")
    d.text((50, 300), f"Style: {style}", font=sub_font, fill="darkblue")
    d.text((50, 330), f"Element: {decorative_element}", font=sub_font, fill="darkgreen")

    return img

# Generate logos
logo1 = create_logo("Maison Éclat Petit", "Elegant Bloom", "Zərif serif yazı + uşaq izləri", "Golden Ratio çiçək və ayaq izi")
logo2 = create_logo("MÉP", "Luxe Monogram", "Monoqram + serif/sans-serif", "Qızılı dairəvi çərçivə")
logo3 = create_logo("Maison Éclat Petit", "Playful Prestige", "Əl yazısı 'Petit' + pastel", "Ulduz və ay motivləri")

# Display all
logo1.show()
logo2.show()
logo3.show()
