"""
Process brand photos from the marketing resources folders and create
web-optimized versions for the front-facing-program-builder site.

Photo mapping:
 - Jonald_Construction: construction worker portraits and scenes
 - Kevin_Lab: lab/science worker photos
 - OnSight Photoshoot: eyewear fitting, product, and office photos
"""
from PIL import Image
import os
import sys

# ── Paths ──────────────────────────────────────────────────────────
BRAND_ROOT = (
    "c:/Users/jonat/OneDrive - On-Sight Safety Optics, Inc/"
    "On-Sight Safety Optics, Inc_ - Shared Files/"
    "Marketing Resources/Photos"
)
JONALD = os.path.join(BRAND_ROOT, "Jonald_Construction")
KEVIN  = os.path.join(BRAND_ROOT, "Kevin_Lab")
ONSIGHT = os.path.join(BRAND_ROOT, "OnSight Photoshoot")

OUTPUT = (
    "c:/Users/jonat/OneDrive/Documents/GitHub/"
    "front-facing-program-builder/public/images"
)

# JPEG quality for output
QUALITY = 82

def crop_center(img: Image.Image, target_ratio: float) -> Image.Image:
    """Crop image to target aspect ratio from center."""
    w, h = img.size
    current_ratio = w / h

    if current_ratio > target_ratio:
        # Too wide → crop width
        new_w = int(h * target_ratio)
        left = (w - new_w) // 2
        return img.crop((left, 0, left + new_w, h))
    else:
        # Too tall → crop height
        new_h = int(w / target_ratio)
        top = (h - new_h) // 2
        return img.crop((0, top, w, top + new_h))

def process(src_path: str, out_name: str, max_width: int, aspect: tuple[int, int] | None = None):
    """Load, optionally crop to aspect, resize to max_width, save as JPEG."""
    print(f"  {os.path.basename(src_path)} → {out_name}")
    img = Image.open(src_path)

    # Handle EXIF orientation
    try:
        from PIL import ImageOps
        img = ImageOps.exif_transpose(img)
    except Exception:
        pass

    # Convert to RGB if needed (e.g., RGBA or palette)
    if img.mode != "RGB":
        img = img.convert("RGB")

    # Crop to target aspect ratio if specified
    if aspect:
        target_ratio = aspect[0] / aspect[1]
        img = crop_center(img, target_ratio)

    # Resize to max_width, maintaining aspect
    w, h = img.size
    if w > max_width:
        scale = max_width / w
        img = img.resize((max_width, int(h * scale)), Image.LANCZOS)

    out_path = os.path.join(OUTPUT, out_name)
    img.save(out_path, "JPEG", quality=QUALITY, optimize=True)
    sz = os.path.getsize(out_path) / 1024
    print(f"    → {img.size[0]}x{img.size[1]}, {sz:.0f}KB")

# ── Photo assignments ──────────────────────────────────────────────
# Step sidebar images: 16:9, shown at ~500px wide on desktop sidebar
#   → output at 1200px wide for 2x retina

print("Processing step images (16:9)...")
STEP_MAP = {
    # step-01: Contact info → professional construction worker portrait (landscape)
    "step-01-company.jpg":       (JONALD, "DSC00435.jpg"),
    # step-02: Work type → active construction scene
    "step-02-work-type.jpg":     (JONALD, "DSC03529.jpg"),
    # step-03: Team size → multiple workers / wider scene
    "step-03-team-size.jpg":     (JONALD, "DSC03533.jpg"),
    # step-04: Locations → construction site environment
    "step-04-locations.jpg":     (JONALD, "DSC03525.jpg"),
    # step-05: Exposures → lab worker with safety gear
    "step-05-exposures.jpg":     (KEVIN, "IMG_0166_240Res.jpg"),
    # step-06: Current setup → construction worker with equipment closeup
    "step-06-current-setup.jpg": (JONALD, "DSC00436.jpg"),
    # step-07: Program posture → confident worker stance
    "step-07-program-posture.jpg": (JONALD, "DSC03534.jpg"),
}

for out_name, (folder, filename) in STEP_MAP.items():
    process(os.path.join(folder, filename), out_name, max_width=1200, aspect=(16, 9))

# Intro hero image: displayed as h-40 w-full banner, landscape
print("\nProcessing intro hero image...")
process(
    os.path.join(JONALD, "DSC00438.jpg"),
    "intro-program-builder.jpg",
    max_width=1400,
    aspect=(16, 9),
)

# Congratulations page images
print("\nProcessing congratulations images...")

# congrats-specialist-handoff: 4:3 aspect, hero alongside heading
process(
    os.path.join(JONALD, "DSC03526.jpg"),
    "congrats-specialist-handoff.jpg",
    max_width=800,
    aspect=(4, 3),
)

# congrats-specialist-review: h-36 w-full banner between step badges
process(
    os.path.join(JONALD, "DSC00420.jpg"),
    "congrats-specialist-review.jpg",
    max_width=1000,
    aspect=(16, 9),
)

# congrats-team: 3:2 sidebar image
process(
    os.path.join(JONALD, "DSC03530.jpg"),
    "congrats-team.jpg",
    max_width=800,
    aspect=(3, 2),
)

# Footer images: h-28 small landscape banners
print("\nProcessing footer images...")
process(
    os.path.join(JONALD, "DSC00421.jpg"),
    "footer-workforce.jpg",
    max_width=800,
    aspect=(16, 9),
)
process(
    os.path.join(KEVIN, "Kevin1.jpg"),
    "footer-specialist.jpg",
    max_width=800,
    aspect=(16, 9),
)

print("\n✓ All images processed successfully!")
