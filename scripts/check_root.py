import sys
raw = open('recommendProgram.ts', 'rb').read()
text = raw.decode('utf-8', errors='replace')

# Find chars that can't be encoded in CP1252
unencodable = set()
for i, ch in enumerate(text):
    try:
        ch.encode('cp1252')
    except (UnicodeEncodeError, UnicodeDecodeError):
        if ch not in unencodable:
            unencodable.add(ch)
            ctx = text[max(0,i-10):i+10]
            print(f'Unencodable: {ch!r} = U+{ord(ch):04X} at pos {i}, ctx: {ctx!r}')
        if len(unencodable) > 20:
            break

print(f'\nTotal unique unencodable chars: {len(unencodable)}')
