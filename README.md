# protof.pl

Oficjalna strona internetowa firmy **Protof** — **Solutions Driven by The Future**.

## Struktura plików
- `index.html` — Główny plik strony wizytówki
- `style.css` — Nowoczesny arkusz stylów (Dark Mode, Glassmorphism, RWD)
- `script.js` — Interaktywny silnik tła Canvas, obsługa formularza i schowka
- `favicon.svg` — Logo wektorowe Protof
- `CNAME` — Konfiguracja domeny własnej dla GitHub Pages (`protof.pl`)

## Publikacja przez GitHub Pages
1. Dodaj ten folder do **GitHub Desktop** i utwórz repozytorium (np. `protof.pl` lub `twoj-login.github.io`).
2. Wyślij zmiany (Commit & Push) na GitHub.
3. W ustawieniach repozytorium (**Settings -> Pages**):
   - Źródło: gałąź `main` / `/root`
   - Custom domain: `protof.pl`
   - Zaznacz **Enforce HTTPS**
4. W panelu domen **seohost.pl**:
   - Skonfiguruj rekordy **A** kierujące na adresy IP GitHub Pages:
     - `185.199.108.153`
     - `185.199.109.153`
     - `185.199.110.153`
     - `185.199.111.153`
   - Opcjonalnie rekord **CNAME** dla subdomeny `www`: `twoj-login.github.io`
