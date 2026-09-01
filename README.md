# Should I Evolve This Pokémon?

A small static website that answers one question for any of the first 721
Pokémon (Gen 1–6 base forms): *should I evolve this Pokémon?*

Pick a Pokémon, and the site compares its base stats against its next
evolution (or evolutions, for branching cases like Eevee) and gives a
stat-driven verdict.

## How it works

- `data/pokemon.json` is generated from the supplied `pokemon.csv`
  (see "Data notes" below).
- `script.js` loads that JSON, builds a name search, and — once you pick a
  Pokémon — looks up anything that evolves from it (`evolvesFrom` field) and
  compares total base stats (BST) and per-stat deltas.
- No build step, no framework, no backend: just HTML/CSS/JS, so it can be
  served directly by GitHub Pages.
- Artwork is pulled at runtime from the public PokeAPI sprites CDN
  (`raw.githubusercontent.com/PokeAPI/sprites`), keyed by the Pokémon's
  national Pokédex id, with a fallback sprite if the artwork is missing.

## Data notes / scope decisions

The original CSV has 811 rows because it includes alternate forms (e.g.
`deoxys-attack`, `wormadam-sandy`) as separate rows sharing a `species_id`
with their base form. For a cleaner one-Pokémon-per-entry experience, this
site keeps only rows where `id == species_id` (721 entries, Gen 1–6). That's
a deliberate scope cut, not missing data — worth mentioning if asked.

The verdict is based purely on base stat totals from the CSV. The dataset
doesn't include evolution *methods* (level, stone, trade, friendship, etc.)
or move learnsets, so the site doesn't claim to know *how* to evolve a
Pokémon or whether you'd lose access to early-level moves by evolving — only
what happens to its stats if it does.

## Running it locally

No install needed — it's static files. From this folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

(Opening `index.html` directly with `file://` will *not* work, because the
browser blocks the `fetch()` call that loads `data/pokemon.json` — you need
a local server, same as above.)

## Deploying to GitHub Pages

1. Create a new **public** GitHub repository (e.g. `pokemon-evolve-advisor`).
2. Push these files to the repository root (`index.html`, `style.css`,
   `script.js`, `data/pokemon.json`, this `README.md`):

   ```bash
   git init
   git add .
   git commit -m "Initial site"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```

3. On GitHub: go to the repo's **Settings → Pages**.
4. Under "Build and deployment", set **Source** to `Deploy from a branch`,
   branch `main`, folder `/ (root)`, then **Save**.
5. Wait a minute or two, then your site will be live at:
   `https://<your-username>.github.io/<your-repo>/`

That URL is what you submit as the "live website" link, together with the
repository URL.

## Regenerating the data (optional)

If you ever need to regenerate `data/pokemon.json` from a fresh
`pokemon.csv`, this is the extraction logic used:

```python
import csv, json

with open('pokemon.csv', newline='', encoding='utf-8') as f:
    rows = list(csv.DictReader(f))

base = [r for r in rows if r['id'] == r['species_id']]

def clean(v):
    return None if v == 'NA' else v

out = []
for r in base:
    out.append({
        'id': int(r['id']),
        'name': r['pokemon'],
        'types': [t for t in [clean(r['type_1']), clean(r['type_2'])] if t],
        'stats': {
            'hp': int(r['hp']), 'attack': int(r['attack']),
            'defense': int(r['defense']), 'special_attack': int(r['special_attack']),
            'special_defense': int(r['special_defense']), 'speed': int(r['speed']),
        },
        'generation': int(r['generation_id']),
        'evolvesFrom': int(r['evolves_from_species_id']) if clean(r['evolves_from_species_id']) else None,
        'evolutionChain': int(r['evolution_chain_id']),
        'color': clean(r['color_1']) or '#888888',
    })

json.dump(out, open('data/pokemon.json', 'w'), separators=(',', ':'))
```
