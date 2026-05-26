# Backlog — Casse-Brique v1 (MVP)

Stack : HTML5 Canvas · JavaScript ES6+ vanilla · CSS3 · fichier unique `index.html`  
Contraintes : solo dev · pas de backend · mobile-friendly · 60 FPS cible

---

## Ordre de développement v1

| # | User Story | Statut |
|---|-----------|--------|
| US-01 | Rendu de base | ✅ Fait |
| US-02 | Physique de la balle | ✅ Fait |
| US-03 | Contrôle de la raquette | ✅ Fait |
| US-04 | Destruction des briques | ✅ Fait |
| US-05 | Vies & Game Over | ✅ Fait |
| US-06 | Score | ✅ Fait |
| US-07 | Condition de victoire | ✅ Fait |
| US-08 | Écran de démarrage | ✅ Fait |

---

## US-01 · Rendu de base

**En tant que** joueur, **je veux** voir un canvas avec un fond sombre, une balle, une raquette et une grille de briques **afin de** reconnaître immédiatement un casse-brique.

### Acceptance Criteria

- AC-01 : Un seul `<canvas>` centré dans la page, fond de page sombre, zéro scrollbar sur desktop 1920×1080
- AC-02 : Taille canvas 800×600 px. Sur mobile (largeur < 600px) : scaling CSS uniquement (`max-width: 100%`, ratio 4:3), coordonnées internes inchangées
- AC-03 : Boucle via `requestAnimationFrame`, `clearRect` chaque frame, aucun `setInterval`/`setTimeout` pour le rendu
- AC-04 : Balle cercle plein rayon 8px, blanc, position initiale centre horizontal y≈420
- AC-05 : Raquette rectangle 100×12px, centrée horizontalement, y=560
- AC-06 : Grille 10 colonnes × 5 rangées, briques 70×20px, marge 4px H et V, début à y=60, 5 couleurs par rangée (rouge→orange→jaune→vert→bleu), grille dans les bounds du canvas
- AC-07 : 60 FPS stables, aucune erreur console
- AC-08 : Constantes regroupées en haut (`CANVAS_WIDTH`, `BALL_RADIUS`, `PADDLE_WIDTH`, `BRICK_ROWS`…), fonctions `draw()` et `update()` séparées dès le départ

---

## US-02 · Physique de la balle

**En tant que** joueur, **je veux** que la balle se déplace et rebondisse de façon cohérente sur les murs et la raquette **afin de** pouvoir anticiper sa trajectoire.

### Acceptance Criteria

- AC-01 : Vitesse initiale `vx = 4`, `vy = -4` (constantes `BALL_SPEED_X`, `BALL_SPEED_Y`), frame-rate indépendante via `deltaTime` (cap 50ms)
- AC-02 : Rebond bord gauche/droit : `vx = -vx`, correction de position si overlap. La balle ne sort jamais horizontalement
- AC-03 : Rebond bord haut : `vy = -vy`, correction de position si overlap
- AC-04 : Rebond raquette avec angle variable — `hitPosition = (ballX - paddleX) / PADDLE_WIDTH` (0.0→1.0), `vx = (hitPosition - 0.5) * 2 * MAX_BOUNCE_ANGLE`, renormalisation pour conserver la magnitude. Déclenché uniquement si `vy > 0`
- AC-05 : Sortie par le bas : flag `ballLost = true`, reset de la balle au centre
- AC-06 : `update(deltaTime)` contient toute la logique, `draw()` ne modifie aucune variable de jeu
- AC-07 : Commentaire anti-tunneling en place (AABB suffisant à vitesse actuelle ~5.66px/frame, raycast requis si vitesse > `min(BRICK_HEIGHT, BALL_RADIUS*2)`)

---

## US-03 · Contrôle de la raquette

**En tant que** joueur, **je veux** déplacer la raquette avec le clavier ET le tactile **afin de** jouer aussi bien sur desktop que mobile.

### Acceptance Criteria

- AC-01 : `Q` → gauche, `D` → droite (AZERTY français), constantes `KEY_LEFT = 'q'`, `KEY_RIGHT = 'd'`
- AC-02 : Flèches `←` / `→` supportées en alternative
- AC-03 : Appui maintenu = mouvement continu via objet `keys {}`, `keydown`/`keyup`, vitesse `PADDLE_SPEED = 6` scalée par `deltaTime`
- AC-04 : `paddleX` borné `[0, CANVAS_WIDTH - PADDLE_WIDTH]` dans `update()` uniquement, jamais dans les event handlers
- AC-05 : Touch — `touchstart` mémorise `touchStartX` + `paddleStartX`, `touchmove` calcule `paddleX = paddleStartX + deltaX` avec `preventDefault()`, `{ passive: false }` pour bloquer le scroll
- AC-06 : Aucune régression US-01/02, zéro erreur console

---

## US-04 · Destruction des briques

**En tant que** joueur, **je veux** que la balle détruise les briques au contact **afin de** progresser vers la victoire.

### Acceptance Criteria

- AC-01 : Collision balle/brique détectée par AABB
- AC-02 : Axe de collision déterminé par la profondeur de chevauchement minimum (horizontal vs vertical)
- AC-03 : Brique détruite : `bricks[r][c] = false`, disparaît du rendu immédiatement
- AC-04 : Balle rebondit selon l'axe de collision avec correction de position
- AC-05 : Au plus une brique traitée par frame (`break outer` sur les deux boucles imbriquées)
- AC-06 : Pas de tunneling à vitesse nominale (documenté en commentaire)

---

## US-05 · Vies & Game Over

**En tant que** joueur, **je veux** avoir 3 vies et un écran Game Over **afin de** ressentir de l'enjeu.

### Acceptance Criteria

- AC-01 : Constante `MAX_LIVES = 3`, variable `lives` décrémentée sur `ballLost`. Reset balle + raquette si `lives > 0`
- AC-02 : Machine à états : `'start' | 'playing' | 'gameover' | 'victory'`. `update()` ne s'exécute que si `gameState === 'playing'`
- AC-03 : À `lives === 0` : `gameState = 'gameover'`
- AC-04 : Vies affichées dans le HUD DOM (hors canvas) via `●`.repeat(lives)`, alignées à droite
- AC-05 : Overlay Game Over : fond semi-transparent noir, "GAME OVER" (48px rouge), score, instruction replay
- AC-06 : Restart sur Espace ou tap — appelle `resetGame()` qui remet vies, score, briques, balle, raquette à zéro sans `location.reload()`

---

## US-06 · Score

**En tant que** joueur, **je veux** voir mon score augmenter à chaque brique détruite **afin d'** avoir un objectif chiffré.

### Acceptance Criteria

- AC-01 : Points variables par rangée — `ROW_POINTS = [50, 40, 30, 20, 10]` (rangée du haut = plus de points)
- AC-02 : `score += ROW_POINTS[r]` dans `update()` à la destruction de chaque brique
- AC-03 : Score affiché dans le HUD DOM à gauche (en face des vies), mis à jour via `updateHUD()` en temps réel
- AC-04 : Score inclus dans les overlays Game Over et Victory
- AC-05 : Score remis à 0 dans `resetGame()`

---

## US-07 · Condition de victoire

**En tant que** joueur, **je veux** un écran de victoire quand toutes les briques sont détruites **afin de** savoir que j'ai gagné.

### Acceptance Criteria

- AC-01 : Après chaque destruction, vérifier `bricks.every(row => row.every(cell => !cell))`. Si vrai → `gameState = 'victory'`
- AC-02 : Overlay Victory : fond semi-transparent vert, "YOU WIN !" (48px vert `#2ecc71`), score final, instruction replay
- AC-03 : Restart sur Espace ou tap identique au Game Over (réutilise les mêmes listeners)
- AC-04 : Transition fluide, pas de flash ni de freeze

---

## US-08 · Écran de démarrage

**En tant que** joueur, **je veux** un écran d'accueil avec les contrôles expliqués **afin de** comprendre comment jouer sans chercher.

### Acceptance Criteria

- AC-01 : `gameState = 'start'` au chargement, balle et raquette visibles mais immobiles
- AC-02 : Overlay de démarrage : fond semi-transparent, titre "BREAKOUT", sous-titre, section contrôles (Q/D, flèches, souris, mobile), instruction de démarrage en jaune
- AC-03 : Démarrage sur n'importe quelle touche (hors F1-F12 et touches mortes), clic souris ou tap → `gameState = 'playing'`
- AC-04 : Pas d'appel à `resetGame()` au démarrage initial — l'état de jeu est déjà propre au chargement
- AC-05 : Aucune régression sur US-01 à US-07

---

## Hors scope v1 — Candidats v2

- Niveaux multiples
- Power-ups (balle rapide, raquette large, multi-balle…)
- Briques multi-hit
- High score persistant (localStorage)
- Son et musique
- Animations de destruction des briques
- Classement en ligne
