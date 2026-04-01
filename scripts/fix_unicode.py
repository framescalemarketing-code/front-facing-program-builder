"""
Comprehensive Unicode Mojibake fixer.
Fixes files where UTF-8 content was misread as CP1252 (Windows-1252) and re-saved,
causing double or triple encoding of special characters.

Reversal approach:
  garbled_utf8_bytes -> decode UTF-8 -> encode CP1252 -> decode UTF-8 -> clean text

For triple-encoding, apply twice.
"""

import os
import re
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

EXTENSIONS = {'.ts', '.tsx', '.js', '.jsx', '.css', '.html', '.md'}

# Directories to skip
SKIP_DIRS = {'node_modules', 'dist', '.git', '.history'}

# Known exact byte→byte replacements (confirmed from analysis).
# Order matters: longer patterns first to avoid partial matches.
#
# Encoding pattern key:
#   Triple-encoded: original UTF-8 bytes → Latin-1 → UTF-8 → Latin-1 → UTF-8
#   Double-encoded: original UTF-8 bytes → CP1252 → UTF-8
#
# To find the double-encoded bytes for a character X (UTF-8: bb cc dd):
#   0xbb in CP1252 → Unicode char → UTF-8 bytes
#   0xcc in CP1252 → Unicode char → UTF-8 bytes
#   0xdd in CP1252 → Unicode char → UTF-8 bytes
#   Concatenate → file bytes
EXACT_REPLACEMENTS = [
    # ── Triple-encoded sequences ────────────────────────────────
    # em dash — (U+2014) triple via Latin-1
    (b'\xc3\x83\xc2\xa2\xc3\xa2\xe2\x80\x9a\xc2\xac\xc3\xa2\xe2\x82\xac\xc2\x9d', '—'.encode()),
    # box-drawing ─ (U+2500) triple via Latin-1
    (b'\xc3\x83\xc2\xa2\xc3\xa2\xe2\x82\xac\xc2\x9d\xc3\xa2\xe2\x80\x9a\xc2\xac', '─'.encode()),
    # U+FFFD used as em dash — triple
    (b'\xc3\x83\xc2\xaf\xc3\x82\xc2\xbf\xc3\x82\xc2\xbd', '—'.encode()),
    # right arrow → (U+2192) triple via CP1252
    (b'\xc3\x83\xc2\xa2\xc3\xa2\xe2\x82\xac\xc2\xa0\xc3\xa2\xe2\x82\xac\xe2\x84\xa2', '→'.encode()),
    # left arrow ← (U+2190) triple via CP1252
    (b'\xc3\x83\xc2\xa2\xc3\xa2\xe2\x82\xac\xc2\xa0\xc3\x82\xc2\x90', '←'.encode()),
    # en dash – (U+2013) triple via CP1252
    (b'\xc3\x83\xc2\xa2\xc3\xa2\xe2\x82\xac\xc2\x9d\xc3\xa2\xe2\x80\x9a\xc2\xac', '–'.encode()),
    # checkmark ✓ (U+2713) triple via CP1252
    (b'\xc3\x83\xc2\xa2\xc3\x85\xe2\x80\x9c\xc3\xa2\xe2\x82\xac\xc5\x93', '✓'.encode()),
    # ── Double-encoded sequences (UTF-8 bytes read as CP1252, re-saved as UTF-8) ─
    # Each original UTF-8 byte is remapped via CP1252 and re-encoded.
    # left arrow ← (E2 86 90): â† \x90 → file bytes c3a2 e280a0 c290
    (b'\xc3\xa2\xe2\x80\xa0\xc2\x90', '←'.encode()),
    # checkmark ✓ (E2 9C 93): âœ" → file bytes c3a2 c593 e2809c
    (b'\xc3\xa2\xc5\x93\xe2\x80\x9c', '✓'.encode()),
    # em dash — (E2 80 94): â€" → file bytes c3a2 e282ac e2809d
    (b'\xc3\xa2\xe2\x82\xac\xe2\x80\x9d', '—'.encode()),
    # box-drawing ─ (E2 94 80): â"€ → file bytes c3a2 e2809d e282ac
    (b'\xc3\xa2\xe2\x80\x9d\xe2\x82\xac', '─'.encode()),
    # en dash – (E2 80 93): â€" → file bytes c3a2 e282ac e2809c
    (b'\xc3\xa2\xe2\x82\xac\xe2\x80\x9c', '–'.encode()),
    # right arrow → (E2 86 92): â†' → file bytes c3a2 e280a0 e28099
    (b'\xc3\xa2\xe2\x80\xa0\xe2\x80\x99', '→'.encode()),
    # right single quote ' (E2 80 99): â€™ → file bytes c3a2 e282ac e284a2
    (b'\xc3\xa2\xe2\x82\xac\xe2\x84\xa2', "\u2019".encode()),
    # left single quote ' (E2 80 98): â€˜ → file bytes c3a2 e282ac cb9c
    (b'\xc3\xa2\xe2\x82\xac\xcb\x9c', "\u2018".encode()),
    # right double quote \u201d (E2 80 9D): already handled above as part of — pattern
    # left double quote \u201c (E2 80 9C): already handled above as part of – pattern
]


def reverse_cp1252_once(text: str) -> str | None:
    """
    Reverse one level of CP1252 mojibake: encode as CP1252, then decode as UTF-8.
    For CP1252-unmappable control chars (U+0081, U+008D, U+008F, U+0090, U+009D)
    falls back to Latin-1 byte passthrough, since those came from raw byte copying.
    Returns None if the resulting bytes are not valid UTF-8.
    """
    # CP1252 undefined slots; pass their codepoints straight through as Latin-1 bytes
    CP1252_PASSTHROUGH = {0x81, 0x8D, 0x8F, 0x90, 0x9D}

    result_bytes = bytearray()
    for ch in text:
        cp = ord(ch)
        if cp in CP1252_PASSTHROUGH:
            result_bytes.append(cp)  # raw byte passthrough
        elif cp <= 0xFF:
            try:
                result_bytes.extend(ch.encode('cp1252'))
            except UnicodeEncodeError:
                result_bytes.extend(ch.encode('latin-1', errors='replace'))
        else:
            try:
                result_bytes.extend(ch.encode('cp1252'))
            except UnicodeEncodeError:
                return None  # genuinely unmappable non-Latin char → abort

    try:
        return result_bytes.decode('utf-8')
    except UnicodeDecodeError:
        return None


def has_mojibake(text: str) -> bool:
    """Check if text has Mojibake indicators."""
    # Triple-encoded: starts with Ã (U+00C3) or Â (U+00C2)
    if re.search(r'[\u00c3][\u00a2-\u00bf]|[\u00c2][\u00a2-\u00bf]{2,}', text):
        return True
    # Double-encoded: â (U+00E2) followed by CP1252-remapped chars like †(U+2020),
    # œ (U+0153), €(U+20AC), "(U+201C-D), '(U+2018-9), etc.
    if re.search(r'\u00e2[\u2020\u0153\u201c\u201d\u2018\u2019\u20ac\u2122\u02dc\u2026]', text):
        return True
    return False


def fix_file(path: str, dry_run: bool = False) -> tuple[int, int]:
    """
    Fix a single file. Returns (replacements_made, bytes_saved).
    """
    try:
        raw = open(path, 'rb').read()
    except Exception as e:
        print(f"  ERROR reading {path}: {e}")
        return 0, 0

    original_raw = raw

    # Apply exact byte replacements first (longest sequences first to avoid partial matches)
    replacements = 0
    for old_bytes, new_bytes in EXACT_REPLACEMENTS:
        count = raw.count(old_bytes)
        if count > 0:
            raw = raw.replace(old_bytes, new_bytes)
            replacements += count

    # Now handle remaining garbled chars via progressive CP1252 reversal
    # Decode as UTF-8 and check for garbled patterns
    try:
        text = raw.decode('utf-8', errors='replace')
        original_text = text

        # Apply up to 3 levels of CP1252 reversal, but only on suspicious ranges
        # We use a targeted approach: find garbled runs and reverse them
        MOJIBAKE_PATTERN = re.compile(
            r'[\u00c3][\u00a2-\u00bf]'
            r'|[\u00c2][\u00a2-\u00bf]{2,}'
            r'|\u00e2[\u2020\u0153\u201c\u201d\u2018\u2019\u20ac\u2122\u02dc\u2026]'
        )

        for _pass in range(3):
            if not has_mojibake(text):
                break
            new_text = reverse_cp1252_once(text)
            if new_text is None:
                break
            # Only accept if it reduced garbling (fewer suspicious chars)
            old_count = len(MOJIBAKE_PATTERN.findall(text))
            new_count = len(MOJIBAKE_PATTERN.findall(new_text))
            if new_count < old_count:
                text = new_text
            else:
                break

        if text != original_text:
            # Re-encode back to bytes
            new_raw = text.encode('utf-8')
            raw = new_raw
            replacements += len(MOJIBAKE_PATTERN.findall(original_text)) - len(MOJIBAKE_PATTERN.findall(text))
    except Exception as e:
        print(f"  ERROR processing text in {path}: {e}")

    if raw != original_raw:
        bytes_saved = len(original_raw) - len(raw)
        if not dry_run:
            open(path, 'wb').write(raw)
        return replacements, bytes_saved

    return 0, 0


def main():
    dry_run = '--dry-run' in sys.argv
    total_files = 0
    total_replacements = 0
    total_bytes = 0

    for root, dirs, files in os.walk(REPO):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for fname in files:
            if any(fname.endswith(ext) for ext in EXTENSIONS):
                fpath = os.path.join(root, fname)
                reps, saved = fix_file(fpath, dry_run)
                if reps > 0:
                    rel = os.path.relpath(fpath, REPO)
                    action = 'Would fix' if dry_run else 'Fixed'
                    print(f"{action}: {rel} ({reps} sequences, -{saved} bytes)")
                    total_files += 1
                    total_replacements += reps
                    total_bytes += saved

    print(f"\n{'[DRY RUN] ' if dry_run else ''}Total: {total_files} files, "
          f"{total_replacements} sequences, {total_bytes} bytes saved")


if __name__ == '__main__':
    main()
