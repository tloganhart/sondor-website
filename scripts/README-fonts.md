# Regenerating the font files

Requires Python with `fonttools` and `brotli`. Source packages are devDependencies of `@sondor/design`.

```python
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
src = 'node_modules/@fontsource-variable/'
out = 'packages/design/src/fonts/'
def inst(path, dest, axes):
    f = TTFont(path); f = instancer.instantiateVariableFont(f, axes); f.flavor = 'woff2'; f.save(dest)
inst(src + 'newsreader/files/newsreader-latin-opsz-normal.woff2', out + 'newsreader-400.woff2', {'wght': 400, 'opsz': 36})
inst(src + 'newsreader/files/newsreader-latin-opsz-normal.woff2', out + 'newsreader-500.woff2', {'wght': 500, 'opsz': 36})
inst(src + 'newsreader/files/newsreader-latin-opsz-italic.woff2', out + 'newsreader-400-italic.woff2', {'wght': 400, 'opsz': 36})
# Hanken Grotesk: copy hanken-grotesk-latin-wght-{normal,italic}.woff2 as-is.
```
