# Backlog — Casse-Brique

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

## Ordre de développement v2 — Power-ups

| # | User Story | Statut |
|---|-----------|--------|
| US-09 | Système de power-ups — Infrastructure | ✅ Fait |
| US-10 | Power-ups vitesse balle (Rapide & Lente) | ✅ Fait |
| US-11 | Power-ups raquette (Large & Petite) | ✅ Fait |
| US-12 | Multi-balle | ✅ Fait |
| US-13 | Pénétration | ✅ Fait |
| US-14 | Colle | ✅ Fait |
| US-15 | +1 Vie | ✅ Fait |
| US-16 | Briques explosives | ✅ Fait |

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

---

## US-09 · Système de power-ups — Infrastructure

**En tant que** joueur,
**je veux** que certaines briques lâchent une capsule en tombant,
**afin de** pouvoir collecter des effets qui modifient temporairement le jeu.

**Dépendances :** US-04, US-05, US-06

### Acceptance Criteria

- AC-01 — À la destruction d'une brique, un tirage aléatoire détermine si une capsule apparaît (probabilité configurable via constante `POWERUP_DROP_CHANCE`, valeur par défaut 0.20).
- AC-02 — La capsule apparaît au centre de la brique détruite et tombe verticalement à vitesse constante (`POWERUP_FALL_SPEED`, constante séparée de la vitesse balle).
- AC-03 — La capsule est collectée quand son AABB chevauche celui de la raquette ; elle disparaît immédiatement à la collecte.
- AC-04 — Une capsule non collectée disparaît silencieusement quand elle sort du bas du canvas (pas de perte de vie).
- AC-05 — Chaque type de power-up a une couleur distincte clairement lisible sur fond sombre (les couleurs sont des constantes nommées).
- AC-06 — Quand un effet temporel est actif, le HUD affiche une barre de durée (ou label) qui diminue en temps réel. À expiration, le jeu revient à son état de base sans interruption.
- AC-07 — Plusieurs capsules peuvent coexister en chute simultanément sans bug de collision ou de disparition involontaire.
- AC-08 — La logique de collecte (AABB capsule × raquette) est extraite dans `game-core.js` comme fonction pure testable.
- AC-09 — L'état `'start'` et `'gameover'` vide toutes les capsules en vol et annule tous les effets actifs.

### Hors scope
- Les effets eux-mêmes (traités dans US-10 à US-13)
- Son de collecte

### Notes design
- Les capsules négatives DOIVENT être visuellement différenciables des capsules positives (bordure rouge ou forme différente).
- Si le joueur collecte un power-up du même type qu'un effet déjà actif, la durée est reset (pas de cumul).

---

## US-10 · Power-ups vitesse balle — Rapide & Lente

**En tant que** joueur,
**je veux** que certaines capsules accélèrent ou ralentissent la balle temporairement,
**afin de** vivre des phases de tension (rapide) ou de récupération (lente).

**Dépendances :** US-09

### Acceptance Criteria

- AC-01 — La capsule **Rapide** (couleur `#FF6B35`, label `▲`) multiplie `speedMag` par `SPEED_FAST_MULT` (constante, défaut `1.6`) pendant `SPEED_DURATION` ms (défaut 8 000 ms).
- AC-02 — La capsule **Lente** (couleur `#74B9FF`, label `▼`) multiplie `speedMag` par `SPEED_SLOW_MULT` (constante, défaut `0.55`) pendant `SPEED_DURATION` ms.
- AC-03 — La direction de la balle est conservée lors de l'application de l'effet (seule la magnitude change).
- AC-04 — À expiration, `speedMag` revient exactement à sa valeur de base (pas de dérive cumulative entre plusieurs collectes successives).
- AC-05 — L'effet s'applique immédiatement à la prochaine frame, pas au prochain rebond.
- AC-06 — Si un effet vitesse est déjà actif et qu'une nouvelle capsule du même type est collectée, `SPEED_DURATION` ms est **ajouté** au temps restant (pas de reset), plafonné à `SPEED_DURATION * 3` ms. La vitesse n'est pas re-multipliée. *(CR-01 : stacking de durée)*
- AC-07 — Le test unitaire `computeSpeedEffect(baseSpeed, multiplier)` vérifie que la magnitude résultante est `baseSpeed × multiplier` à ±0.001.

### Hors scope
- Effet visuel sur la balle (traînée, changement de couleur)

### Notes design
- `SPEED_SLOW_MULT = 0.55` est intentionnellement punitif. Ne pas descendre sous 0.4× (jeu soporifique).

---

## US-11 · Power-ups raquette — Large & Petite

**En tant que** joueur,
**je veux** que certaines capsules modifient la largeur de la raquette temporairement,
**afin d'** avoir des phases plus faciles (large) ou plus tendues (petite).

**Dépendances :** US-09

### Acceptance Criteria

- AC-01 — La capsule **Large** (couleur `#00B894`, label `◀▶`) multiplie `paddleWidth` par `PADDLE_WIDE_MULT` (constante, défaut `1.7`) pendant `PADDLE_SIZE_DURATION` ms (défaut 10 000 ms).
- AC-02 — La capsule **Petite** (couleur `#E17055`, label `▶◀`) multiplie `paddleWidth` par `PADDLE_SMALL_MULT` (constante, défaut `0.5`) pendant `PADDLE_SIZE_DURATION` ms.
- AC-03 — La raquette est recentrée sur sa position X courante lors du changement de taille (elle ne sort pas du canvas).
- AC-04 — Si la raquette élargie atteint un bord canvas, elle est clampée sans dépasser.
- AC-05 — À expiration, `paddleWidth` revient exactement à `PADDLE_WIDTH` de base.
- AC-06 — Collecter une capsule du même type qu'un effet déjà actif **ajoute** `PADDLE_SIZE_DURATION` ms au temps restant, plafonné à `PADDLE_SIZE_DURATION * 3` ms. La taille n'est pas re-multipliée. *(CR-01 : stacking de durée)*
- AC-07 — Collecter une capsule Petite pendant une Large active (ou vice-versa) annule l'effet précédent et applique le nouveau immédiatement.
- AC-08 — Le calcul de l'angle de rebond (`computePaddleBounce`) utilise la `paddleWidth` courante (pas la largeur de base).

### Hors scope
- Animation de transition sur la largeur (resize instantané accepté)

### Notes design
- `PADDLE_SMALL_MULT = 0.5` est le malus le plus impactant. Si trop frustrant, monter à 0.6.

---

## US-12 · Multi-balle

**En tant que** joueur,
**je veux** qu'une capsule spéciale clone la balle en plusieurs balles simultanées,
**afin de** vivre un moment de chaos satisfaisant qui détruit de nombreuses briques rapidement.

**Dépendances :** US-09

### Acceptance Criteria

- AC-01 — La capsule **Multi-balle** (couleur `#FDCB6E`, label `✦`) crée `MULTIBALL_COUNT - 1` balles supplémentaires (constante `MULTIBALL_COUNT`, défaut `3`) au point de la balle principale au moment de la collecte.
- AC-02 — Les balles clonées partent à des angles symétriques ±`MULTIBALL_SPREAD_DEG` degrés (constante, défaut `20°`) par rapport à la balle principale, toutes à `speedMag` courant.
- AC-03 — Chaque balle se comporte indépendamment : collisions murs, raquette, briques, toutes calculées séparément.
- AC-04 — Une brique ne peut être détruite que par une seule balle par frame (pas de double-destruction si deux balles arrivent simultanément sur la même brique).
- AC-05 — Quand une balle sort par le bas, elle est simplement supprimée du tableau de balles actives. La vie n'est perdue que quand toutes les balles sont sorties.
- AC-06 — Collecter un second power-up Multi-balle ajoute `MULTIBALL_COUNT - 1` balles supplémentaires (sans dépasser `MAX_BALLS = 10`).
- AC-07 — Si une seule balle reste active après que les autres sont sorties par le bas, le jeu continue normalement sans reset de position.
- AC-08 — L'état `'gameover'` et `resetGame()` ramènent le jeu à une seule balle.
- AC-09 — La fonction `spawnExtraBalls(ball, count, spreadDeg, speedMag)` dans `game-core.js` retourne un tableau de `count - 1` nouveaux objets balle, testable unitairement.

### Hors scope
- Effets visuels de split
- Multi-balle permanent

### Notes design
- AC-04 est critique : la double-destruction sur une même frame est le bug le plus courant sur ce type de feature.

---

## US-13 · Pénétration

**En tant que** joueur,
**je veux** qu'une capsule donne à la balle la capacité de traverser plusieurs briques avant de rebondir,
**afin de** déclencher des destructions en chaîne spectaculaires.

**Dépendances :** US-09

### Acceptance Criteria

- AC-01 — La capsule **Pénétration** (couleur `#A29BFE`, label `⬡`) donne à la balle un compteur `penetration` égal à `PENETRATION_COUNT` (constante, défaut `3`) pendant `PENETRATION_DURATION` ms (défaut 7 000 ms).
- AC-02 — Quand `penetration > 0`, la balle détruit la brique touchée et ne rebondit pas ; `penetration` est décrémenté de 1. La trajectoire rectiligne est conservée.
- AC-03 — Quand `penetration === 0`, la balle rebondit normalement sur la brique suivante (comportement standard).
- AC-04 — La pénétration ne s'applique pas aux murs ni à la raquette — rebond normal dans tous les cas.
- AC-05 — Si plusieurs balles sont actives (US-12), chaque balle a son propre compteur `penetration` indépendant.
- AC-06 — À expiration de `PENETRATION_DURATION`, `penetration` tombe à 0 ; la balle redevient normale sans interruption de trajectoire.
- AC-07 — Si la balle traverse plusieurs briques dans la même frame, toutes les briques chevauchées sont détruites et le score est incrémenté pour chacune.
- AC-08 — La fonction `computeBrickCollisionPenetrating(...)` dans `game-core.js` retourne `{ vx, vy, x, y, destroyedBricks: [{row, col}], remainingPenetration }` et est testable unitairement.
- AC-09 — Une brique déjà détruite (`false`) n'est pas comptabilisée dans la pénétration.

### Hors scope
- Effet visuel de traînée colorée pendant la pénétration
- Pénétration sur la raquette ou les murs

### Notes design
- AC-08 implique un refactoring de `computeBrickCollision` ou une nouvelle fonction parallèle — ne pas casser les 40 tests existants.
- Commencer à `PENETRATION_COUNT = 2` et ajuster au playtest.

---

---

## US-14 · Colle

**En tant que** joueur,
**je veux** qu'une capsule fasse coller la balle à la raquette au prochain rebond,
**afin de** pouvoir viser précisément avant de relâcher.

**Dépendances :** US-09

### Acceptance Criteria

- AC-01 — La capsule **Colle** (couleur `#FD79A8`, label `●`) active l'état `sticky = true` sur la balle courante ; en mode multi-balle (US-12), elle s'applique uniquement à la première balle qui touche la raquette.
- AC-02 — Quand `sticky = true` et que la balle touche la raquette, la balle est gelée en position `paddleY - ballRadius`, centrée sur le point d'impact, et suit horizontalement le mouvement de la raquette frame par frame.
- AC-03 — La balle collée est relâchée sur pression d'une touche de jeu (Espace, Q, D, flèche, clic ou tap) avec la même vélocité qu'un rebond normal calculé par `computePaddleBounce` à la position de relâchement.
- AC-04 — L'effet **Colle** est à usage unique : après le premier collage-relâchement, `sticky` repasse à `false` même si `STICKY_DURATION` ms ne sont pas écoulées. La capsule ne permet qu'un seul arrêt.
- AC-05 — Si le joueur ne relâche pas la balle avant `STICKY_DURATION` ms (constante, défaut `5 000` ms), la balle est relâchée automatiquement avec la vélocité calculée à l'angle courant de la raquette.
- AC-06 — Pendant que la balle est collée, les autres mécaniques continuent (capsules en chute, autres balles actives en US-12).
- AC-07 — `sticky = false` lors d'un `resetGame()` ou passage en `'gameover'`.
- AC-08 — La logique de collage-position (`stickyBallX(paddleX, paddleWidth, hitOffset)`) est extraite dans `game-core.js` comme fonction pure testable.

### Hors scope
- Animation visuelle de "tremblottement" de la balle collée
- Colle applicable aux balles clonées (hors première balle touchant la raquette)

### Notes design
- C'est le power-up avec le plus fort **skill expression** du lot : un joueur expert visera les briques restantes précisément. Ne pas le rendre trop fréquent (`POWERUP_DROP_CHANCE` global suffit à le diluer).
- AC-03 : le joueur ne doit pas avoir à appuyer sur une touche dédiée — réutiliser les touches de mouvement évite de l'apprendre.

---

## US-15 · +1 Vie

**En tant que** joueur,
**je veux** qu'une capsule rare me redonne une vie,
**afin de** ressentir un moment de soulagement et de rester dans la partie plus longtemps.

**Dépendances :** US-09

### Acceptance Criteria

- AC-01 — La capsule **+1 Vie** (couleur `#55EFC4`, label `♥`) a une probabilité de drop distincte et plus faible que les autres power-ups, configurable via la constante `EXTRA_LIFE_DROP_CHANCE` (défaut `0.05`, indépendant de `POWERUP_DROP_CHANCE`).
- AC-02 — À la collecte, `lives` est incrémenté de 1 dans la limite de `MAX_LIVES` (défaut `3`) ; si `lives === MAX_LIVES`, la capsule est collectée visuellement mais n'a aucun effet (pas de lives > max).
- AC-03 — Le HUD (`●` répétés) se met à jour immédiatement à la collecte.
- AC-04 — La capsule **+1 Vie** n'a pas de durée ni de barre de progression dans le HUD — effet instantané et permanent jusqu'à la fin de la partie.
- AC-05 — La capsule est bien supprimée du tableau des capsules actives après collecte (pas de double-collecte).
- AC-06 — `lives` est remis à `MAX_LIVES` initial lors de `resetGame()` (comportement inchangé par rapport à US-05).

### Hors scope
- Animation spéciale à la collecte (flash, son)
- Dépasser `MAX_LIVES` (pas de cap étendu)

### Notes design
- `EXTRA_LIFE_DROP_CHANCE = 0.05` signifie environ 1 capsule vie pour 20 briques détruites — suffisamment rare pour que la collecte soit un événement, pas un mécanisme de farm.
- La limite à `MAX_LIVES` est importante pour l'équilibre : sans elle, un joueur patient pourrait accumuler des vies indéfiniment.

---

## US-16 · Briques explosives

**En tant que** joueur,
**je veux** que certaines briques explosent à leur destruction et entraînent les briques adjacentes,
**afin de** vivre des moments de destructions en chaîne spectaculaires.

**Dépendances :** US-04

### Acceptance Criteria

- AC-01 — À la génération de la grille, chaque brique a une probabilité `EXPLOSIVE_BRICK_CHANCE` (constante, défaut `0.08`) d'être marquée comme explosive ; ce marquage est stocké dans un tableau parallèle `brickTypes[r][c]` (`'normal'` ou `'explosive'`).
- AC-02 — Une brique explosive est rendue avec un marqueur visuel distinctif : un `✸` centré ou une bordure orange vif `#E67E22`, clairement différenciable des couleurs de rangée.
- AC-03 — Quand une brique explosive est détruite (par la balle, par pénétration ou par une autre explosion), elle déclenche la destruction immédiate de toutes les briques encore actives (`true`) dans un rayon de 1 case (8 voisins en AABB), y compris les briques explosives voisines (réaction en chaîne).
- AC-04 — La réaction en chaîne est résolue dans la même frame via une file (BFS ou stack), sans récursion illimitée ; elle s'arrête naturellement quand plus aucune brique explosive voisine n'est active.
- AC-05 — Chaque brique détruite par explosion rapporte ses points (`ROW_POINTS[r]`) au score.
- AC-06 — La balle **ne rebondit pas** sur une explosion indirecte (seule la brique initialement touchée par la balle applique le rebond standard).
- AC-07 — `brickTypes` est remis à zéro et régénéré lors de `resetGame()`.
- AC-08 — La fonction `computeExplosionChain(bricks, brickTypes, startRow, startCol, rows, cols)` dans `game-core.js` retourne `[{row, col}]` (liste de toutes les briques détruites par la chaîne, hors brique initiale), sans muter les tableaux passés en argument. Elle est testable unitairement.
- AC-09 — Aucune régression sur les US-04, US-06, US-07 : victoire toujours détectée correctement même si toutes les briques sont détruites par une seule chaîne explosive.

### Hors scope
- Animation d'explosion (flash de particules, onde de choc)
- Briques explosives dans les niveaux futurs (niveau unique pour l'instant)
- Son d'explosion

### Notes design
- `EXPLOSIVE_BRICK_CHANCE = 0.08` sur une grille 10×5 = ~4 briques explosives en moyenne. Suffisant pour voir des chaînes sans rendre le jeu trivial.
- AC-04 est le point de risque technique : la récursion naïve peut provoquer un stack overflow sur une grande chaîne. Imposer BFS dès le départ.
- US-16 est indépendante des power-ups (US-09 à US-15) — elle peut être développée en parallèle ou avant.

---

---

## Ordre de développement v3 — Scoring & Mobile

| # | User Story | Statut |
|---|-----------|--------|
| US-17 | Multiplicateur temporel de score | ✅ Fait |
| US-18 | Multiplicateur de combo | ✅ Fait |
| US-19 | Bonus de précision (niveau sans mort) | ✅ Fait |
| US-20 | Bonus de score pour les vies supplémentaires | ✅ Fait |
| US-21 | Boutons directionnels mobile | ✅ Fait |

---

## US-17 · Multiplicateur temporel de score

**En tant que** joueur expérimenté, **je veux** que le score par brique soit plus élevé en début de niveau **afin d'** être récompensé pour jouer vite et efficacement.

**Dépendances :** US-06

### Acceptance Criteria

- AC-01 — Le multiplicateur suit trois phases dans le niveau : 0–2 min → décroissance linéaire de ×3.0 à ×1.0 ; 2–3 min → plateau à ×1.0 ; 3–4 min → décroissance linéaire de ×1.0 à ×0.1 ; au-delà → plancher à ×0.1.
- AC-02 — Le timer de niveau (`levelStartTime`) est initialisé lazily à la première frame `playing`, évitant de compter le temps passé sur l'écran start.
- AC-03 — `levelStartTime` est remis à 0 dans `resetFullState()` et réinitialisé à `Date.now()` dès la reprise du jeu.
- AC-04 — Le multiplicateur est calculé par la fonction pure `computeTimeMultiplier(elapsedMs)` dans `game-core.js`, testable unitairement.
- AC-05 — Le multiplicateur courant est affiché en haut à droite du canvas (ex. `TIME ×2.4`) avec un code couleur : or ≥ 2.5, orange ≥ 1.5, gris sinon.
- AC-06 — Le score final appliqué est `Math.round(basePoints × timeMult × comboMult × livesMult)` (voir US-18 et US-20 pour les autres facteurs).

### Hors scope
- Timer affiché dans le HUD DOM
- Accélération de la balle liée au timer

---

## US-18 · Multiplicateur de combo

**En tant que** joueur expérimenté, **je veux** que mon combo augmente chaque fois que je renvoie la balle après avoir cassé au moins une brique **afin d'** être récompensé pour enchaîner les rebonds productifs sans rater.

**Dépendances :** US-06

### Acceptance Criteria

- AC-01 — Le combo (`comboCount`) est incrémenté de 1 à chaque rebond raquette si au moins une brique a été détruite depuis le dernier rebond raquette.
- AC-02 — Si aucune brique n'a été détruite depuis le dernier rebond raquette, `comboCount` revient à 0.
- AC-03 — `brickHitSinceLastPaddle` est un flag booléen mis à `true` à chaque destruction de brique et remis à `false` à chaque rebond raquette (après la mise à jour du combo).
- AC-04 — Le multiplicateur de combo est `1 + comboCount × 0.1` (combo 0 → ×1.0, combo 5 → ×1.5, combo 10 → ×2.0…), calculé par `computeComboMultiplier(comboCount)` dans `game-core.js`.
- AC-05 — `comboCount` est remis à 0 sur perte de vie et sur `resetFullState()`.
- AC-06 — Le combo est affiché dans le HUD DOM au centre (ex. `COMBO 5  ×1.5`) et disparaît (opacité 0) quand `comboCount === 0`.
- AC-07 — Le combo est également affiché en bas à droite du canvas en bleu (`#74B9FF`) uniquement quand `comboCount > 0`.

### Hors scope
- Cap sur le combo
- Animation visuelle de "combo break"

---

## US-19 · Bonus de précision (niveau sans mort)

**En tant que** joueur expérimenté, **je veux** recevoir un bonus de points si je termine le niveau sans perdre de vie **afin d'** être récompensé pour un jeu parfait.

**Dépendances :** US-07

### Acceptance Criteria

- AC-01 — Si `livesLostThisLevel === 0` au moment de la victoire, `PRECISION_BONUS` (constante, défaut `500`) est ajouté au score avant d'afficher l'overlay.
- AC-02 — `livesLostThisLevel` est un compteur incrémenté dans `handleLifeLost()`, remis à 0 dans `resetFullState()`.
- AC-03 — Le bonus n'est pas annoncé séparément dans l'overlay (il est inclus dans le score affiché). Pas d'UI dédiée pour cette version.
- AC-04 — Aucune régression sur la condition de victoire (US-07) : le score est incrémenté avant `state.gameState = 'victory'`.

### Hors scope
- Message "PERFECT" dans l'overlay de victoire
- Bonus différent selon le nombre de vies restantes

---

## US-20 · Bonus de score pour les vies supplémentaires

**En tant que** joueur, **je veux** que chaque vie accumulée au-delà de 3 augmente les points gagnés par brique **afin d'** avoir une raison de collecter des +1 Vie même quand je suis déjà au maximum.

**Dépendances :** US-06, US-15

### Acceptance Criteria

- AC-01 — Pour chaque vie au-delà de 3, le multiplicateur de score par brique est augmenté de +1 : `livesMult = 1 + max(0, lives - 3)`. Exemples : 3 vies → ×1, 4 vies → ×2, 5 vies → ×3.
- AC-02 — Ce multiplicateur est appliqué en temps réel au moment de la destruction de chaque brique (pas recalculé rétroactivement).
- AC-03 — Le multiplicateur vies est combiné avec les autres (US-17, US-18) dans la formule : `Math.round(basePoints × timeMult × comboMult × livesMult)`.
- AC-04 — Aucun affichage dédié dans le HUD pour ce multiplicateur (les vies extra sont déjà visibles via le `+N` dans le HUD US-05 CR).

### Hors scope
- Plafond sur `livesMult`
- Indicateur visuel du bonus de vies

---

## US-21 · Boutons directionnels mobile

**En tant que** joueur mobile, **je veux** des boutons gauche et droite appuyables sous le canvas **afin de** contrôler la raquette sans avoir à faire un geste de glissement.

**Dépendances :** US-03

### Acceptance Criteria

- AC-01 — Deux boutons `#btnLeft` (◀) et `#btnRight` (▶) sont affichés sous le canvas, chacun occupant 50 % de la largeur disponible.
- AC-02 — Les boutons sont visibles **uniquement sur les écrans tactiles** (`@media (pointer: coarse)`). Sur desktop, ils restent masqués.
- AC-03 — Maintenir un bouton appuyé déplace la raquette en continu au même `PADDLE_SPEED` que les touches clavier (via le même objet `keys`).
- AC-04 — Sur relâchement (mouseup, touchend, touchcancel, mouseleave), le mouvement s'arrête immédiatement.
- AC-05 — Un appui sur un bouton depuis l'état `'start'` démarre la partie. Depuis `'gameover'` ou `'victory'`, il déclenche `resetGame()`. Depuis `'playing'` avec une balle collée, il relâche la balle.
- AC-06 — Les boutons utilisent `touch-action: none` et `e.preventDefault()` pour empêcher le scroll de la page pendant le jeu.
- AC-07 — La logique de wiring est centralisée dans `initInput()` ; aucune référence aux boutons dans les autres modules.

### Hors scope
- Bouton "tir" ou "pause"
- Joystick virtuel
- Affichage sur desktop

---

---

## Hors scope v3 — Candidats v4

- Niveaux multiples
- Briques multi-hit
- High score persistant (localStorage)
- Son et musique (SFX uniquement)
- Animations de destruction des briques
- Classement en ligne

---

---

## Ordre de développement v4 — Scoring & Polish

| # | User Story | Statut |
|---|-----------|--------|
| US-22 | High score retro (initiales + localStorage) | ✅ Fait |
| US-23 | Briques multi-hit (×2 et ×3) | ✅ Fait |
| US-24 | Niveaux multiples (3 layouts fixes) | ✅ Fait |
| US-25 | Animations de destruction des briques | ✅ Fait |
| US-26 | SFX — Effets sonores | ❌ Rejeté |

---

## US-22 · High score retro (initiales + localStorage)

**En tant que** joueur, **je veux** voir mon score apparaître dans un tableau des meilleurs scores style arcade **afin de** me mesurer à mes performances passées et ressentir la fierté d'un bon run.

**Dépendances :** US-05, US-06, US-24

### Acceptance Criteria

- AC-01 — Le tableau contient les 10 meilleurs scores, persistés dans `localStorage` sous la clé `breakout_highscores`. Chaque entrée est `{ initials: string, score: number, level: number }`.
- AC-02 — À la fin d'une partie (game over ou victory), si le score est dans le top 10, l'écran de saisie des initiales s'affiche avant l'overlay habituel.
- AC-03 — La saisie des initiales est composée de 3 champs de lettres A–Z navigables : Q/D ou flèches gauche/droite pour changer de champ actif, flèches haut/bas pour incrémenter/décrémenter la lettre, Espace ou Entrée pour valider. Sur mobile, des boutons ◀ ▶ ▲ ▼ et VALIDER sont affichés.
- AC-04 — Le champ actif est mis en évidence par un curseur clignotant (style rétro, 500ms on/off). Les deux autres champs sont affichés en grisé.
- AC-05 — Le tableau des scores est affiché en overlay retro : fond noir opaque, police monospace, texte vert `#00FF41`, titre `▸ HIGH SCORES ◂` centré, colonnes `RANK · INITIALS · SCORE · LVL` avec alignement fixe.
- AC-06 — Le tableau est accessible depuis l'écran de démarrage via la touche `H` ou un label `[H] HIGH SCORES` affiché dans l'overlay start. Un appui supplémentaire (Espace, Entrée, tap) ferme le tableau et revient à l'écran de démarrage.
- AC-07 — Si aucun score n'est enregistré, les 10 entrées affichent `AAA` · `---` · `LV1` comme placeholder.
- AC-08 — La nouvelle entrée est mise en surbrillance dans le tableau (texte jaune `#FFD700`) lors de son premier affichage.
- AC-09 — La fonction `insertHighScore(scores, entry)` dans `game-core.js` retourne un nouveau tableau trié sans muter l'original, testable unitairement.
- AC-10 — `resetGame()` ne remet pas à zéro les high scores (persistance inter-parties).

### Hors scope
- Classement en ligne
- Timestamps ou dates d'entrée
- Suppression manuelle des scores

### Notes design
- Les initiales en 3 lettres sont le standard arcade depuis 1978 (Space Invaders). Ne pas proposer une saisie texte libre — ça casse l'ambiance rétro.
- `level: number` dans l'entrée est requis dès maintenant car US-24 (niveaux multiples) le rend pertinent.

---

## US-23 · Briques multi-hit (×2 et ×3)

**En tant que** joueur, **je veux** que certaines briques nécessitent plusieurs coups pour être détruites **afin de** rencontrer des obstacles plus tenaces qui diversifient le gameplay.

**Dépendances :** US-04, US-16

### Acceptance Criteria

- AC-01 — Le schéma de `brickTypes[r][c]` est étendu en `{ type: 'normal'|'explosive'|'multihit', hitsLeft: number, maxHits: number }`. Les briques normales ont `hitsLeft: 1, maxHits: 1`. Ce changement est rétrocompatible avec US-16.
- AC-02 — Deux variantes existent : **Résistante** (`maxHits: 2`) et **Blindée** (`maxHits: 3`). Leurs probabilités d'apparition sont `MULTIHIT2_CHANCE` (défaut `0.10`) et `MULTIHIT3_CHANCE` (défaut `0.05`), indépendantes de `EXPLOSIVE_BRICK_CHANCE`.
- AC-03 — Chaque hit décrémente `hitsLeft` de 1. La brique n'est détruite (retirée de la grille) que quand `hitsLeft === 0`. La balle rebondit normalement à chaque hit intermédiaire.
- AC-04 — Retour visuel progressif sur la brique selon `hitsLeft / maxHits` : à 2/3 vie → couleur de rangée normale ; à 1/3 vie → teinte grisée (`rgba(blanc, 0.4)` superposée) + deux lignes de craquelure diagonales dessinées sur la brique. Aucune librairie externe.
- AC-05 — Le score (`ROW_POINTS[r]`) n'est accordé qu'à la destruction complète (`hitsLeft === 0`), pas aux hits intermédiaires.
- AC-06 — Le power-up **Pénétration** (US-13) : chaque brique multi-hit traversée consomme 1 charge de pénétration ET décrémente `hitsLeft` de 1. La brique n'est détruite que si `hitsLeft === 0`.
- AC-07 — Les briques multi-hit adjacentes à une brique explosive (US-16) sont **détruites immédiatement** par l'explosion (pas de réduction de `hitsLeft`), pour préserver le caractère spectaculaire des chaînes.
- AC-08 — La fonction `applyHitToBrick(brickState)` dans `game-core.js` retourne `{ newHitsLeft, destroyed: boolean }` sans muter l'objet passé, testable unitairement.
- AC-09 — Les briques multi-hit peuvent coexister avec les briques explosives dans la même grille sans conflit de rendu ni de logique.
- AC-10 — `brickTypes` est régénéré lors de `resetGame()` (comportement inchangé par rapport à US-16).

### Hors scope
- Briques indestructibles (×∞)
- Animation de crack progressive (apparition instantanée au changement d'état)
- Son de rebond différent sur une brique multi-hit

### Notes design
- AC-07 est un choix de design délibéré : si l'explosion devait respecter les HP, les chaînes perdent leur caractère "dévastateur". À réévaluer au playtest.
- `MULTIHIT3_CHANCE = 0.05` sur une grille 10×5 = ~2-3 briques blindées en moyenne. Suffisant pour être remarquable sans frustrer.

---

## US-24 · Niveaux multiples (3 layouts fixes)

**En tant que** joueur, **je veux** progresser à travers 3 niveaux de difficulté croissante **afin de** vivre une montée en tension et avoir un objectif de progression clair.

**Dépendances :** US-07, US-22, US-23

### Acceptance Criteria

- AC-01 — Chaque niveau est défini par une structure déclarative `LEVEL_CONFIG` (tableau de 3 objets) dans `constants.js` : `{ name: string, ballSpeedMult: number, explosive_chance: number, multihit2_chance: number, multihit3_chance: number, layout: null|Array }`. `layout: null` signifie grille générée procéduralement avec les chances configurées ; un tableau explicite impose un layout fixe.
- AC-02 — Paramètres des 3 niveaux par défaut :
  - Niveau 1 : `ballSpeedMult: 1.0`, `explosive: 0.08`, `multihit2: 0.10`, `multihit3: 0.00` — identique à la v3.
  - Niveau 2 : `ballSpeedMult: 1.15`, `explosive: 0.12`, `multihit2: 0.15`, `multihit3: 0.05`.
  - Niveau 3 : `ballSpeedMult: 1.30`, `explosive: 0.15`, `multihit2: 0.20`, `multihit3: 0.12`.
- AC-03 — À la victoire d'un niveau (toutes les briques détruites), si un niveau suivant existe : overlay `LEVEL COMPLETE` (2 secondes, fond vert semi-transparent), puis transition vers le niveau suivant. La balle, la raquette et le score sont réinitialisés à leur état de début de niveau (score cumulatif préservé, vies préservées).
- AC-04 — Le score est **cumulatif** sur toute la session. `levelStartScore` est mémorisé au début de chaque niveau pour permettre l'affichage du score du niveau seul dans l'overlay `LEVEL COMPLETE`.
- AC-05 — Après le niveau 3, l'overlay `YOU WIN !` final affiche le score cumulatif total. C'est à ce moment que le high score est évalué (US-22).
- AC-06 — Le HUD affiche le numéro de niveau courant (ex. `LV 2`) dans le DOM, en face du score.
- AC-07 — `resetGame()` revient au niveau 1 avec score remis à 0.
- AC-08 — `levelStartTime` (US-17) est réinitialisé à chaque début de niveau, pas seulement en début de partie.
- AC-09 — La fonction `buildLevelGrid(config)` dans `game-core.js` retourne `{ bricks, brickTypes }` à partir d'un `LEVEL_CONFIG` entry, testable unitairement. Elle remplace la logique de génération inline actuelle.

### Hors scope
- Niveaux procéduraux infinis
- Éditeur de niveaux (candidat v5)
- Cinématiques entre niveaux

### Notes design
- AC-01 : `layout: null` pour les 3 niveaux par défaut — le layout fixe est réservé à l'éditeur v5. Les chances configurables suffisent à donner une personnalité à chaque niveau.
- AC-08 est critique : sans reset du timer, le multiplicateur temporel (US-17) serait injustement pénalisant au niveau 3.

---

## US-25 · Animations de destruction des briques

**En tant que** joueur, **je veux** que les briques explosent visuellement à leur destruction **afin de** ressentir un retour satisfaisant à chaque coup.

**Dépendances :** US-04, US-16

### Acceptance Criteria

- AC-01 — À la destruction d'une brique, 6 particules sont émises depuis son centre dans des directions uniformément réparties (360° / 6) avec une légère dispersion aléatoire (±15°).
- AC-02 — Chaque particule est un carré 4×4px de la couleur de la brique détruite. Elle a une vitesse initiale `PARTICLE_SPEED` (constante, défaut `3px/frame`), une décélération `PARTICLE_FRICTION` (défaut `0.92` multiplicateur par frame), une durée de vie `PARTICLE_LIFETIME` (défaut `400ms`). Opacité décroissante linéairement de 1.0 à 0.
- AC-03 — Les particules sont stockées dans `state.particles[]`. `update(deltaTime)` met à jour positions et durées de vie ; `draw()` rend les particules après les briques et avant le HUD.
- AC-04 — Pour les destructions en chaîne explosive (US-16), un **flash blanc** (`rgba(255,255,255,0.6)`) est affiché 1 frame sur la zone de la brique détruite indirectement, sans émettre de particules (performances).
- AC-05 — Le nombre maximal de particules actives simultanément est plafonné à `MAX_PARTICLES = 200`. Si la limite est atteinte, les nouvelles particules écrasent les plus anciennes (ring buffer).
- AC-06 — Les particules sont purement visuelles : elles n'ont aucune interaction avec la balle, la raquette ou d'autres briques.
- AC-07 — `state.particles` est vidé lors de `resetGame()` et lors des transitions de niveau (US-24).
- AC-08 — Aucune régression sur les 60 FPS cibles à densité normale de destruction (mesurable via `performance.now()` dans la boucle de jeu).

### Hors scope
- Particules sur les rebonds mur/raquette
- Particules de tailles ou formes différentes selon le type de brique
- Traînée de particules sur la balle

### Notes design
- `PARTICLE_FRICTION = 0.92` donne ~12 frames de mouvement perceptible avant quasi-arrêt — suffisant pour être satisfaisant sans encombrer l'écran.
- AC-04 : émettre 6 particules × N briques détruites par explosion serait trop coûteux visuellement et en perf. Le flash est le bon compromis.

---

## US-26 · SFX — Effets sonores

> ❌ **Rejeté** — décision produit : pas de son ajouté pour le moment. Story conservée pour référence ; à réévaluer dans une version ultérieure si besoin.

**En tant que** joueur, **je veux** entendre des effets sonores à chaque action clé du jeu **afin de** renforcer le retour sensoriel et l'ambiance arcade.

**Dépendances :** US-02, US-04, US-09, US-05

### Acceptance Criteria

- AC-01 — Tous les sons sont synthétisés via **Web Audio API** (`AudioContext`), sans fichiers audio externes.
- AC-02 — Sons implémentés :

  | Événement | Forme d'onde | Fréq. / Durée | Notes |
  |---|---|---|---|
  | Rebond mur | carré | 440Hz / 40ms | Bip court et sec |
  | Rebond raquette | carré | 520Hz / 40ms | Légèrement plus aigu |
  | Destruction brique | triangle | 800→200Hz sweep / 80ms | Descente rapide |
  | Collecte power-up | sinus | 600→900Hz sweep / 120ms | Montée joyeuse |
  | Perte de vie | sinus | 200Hz / 300ms + envelope | Son grave avec fadeout |
  | Explosion (chaîne) | bruit blanc | 80ms | Court burst |
  | Game Over | triangle | mélodie descendante 3 notes / 600ms | C5→A4→F4 |
  | Victory | triangle | mélodie ascendante 3 notes / 600ms | C5→E5→G5 |

- AC-03 — L'`AudioContext` est créé à la première interaction utilisateur (keydown, click, touch) pour respecter la politique autoplay des navigateurs. Avant cette interaction, les appels à `playSound()` sont ignorés silencieusement.
- AC-04 — Un bouton mute `🔊` / `🔇` est affiché dans le HUD DOM (coin supérieur droit). La touche `M` bascule également le mute. L'état est persisté dans `localStorage` sous `breakout_muted`.
- AC-05 — `playSound(name)` est la seule API publique du module son (`src/audio.js`). Elle ne lève aucune exception si `AudioContext` n'est pas disponible (fallback silencieux).
- AC-06 — Le module `audio.js` est initialisé dans `main.js` via `initAudio()` ; aucun autre module n'importe `AudioContext` directement.
- AC-07 — Sur les navigateurs sans Web Audio API, le jeu fonctionne normalement sans son (pas d'erreur bloquante).

### Hors scope
- Musique de fond (trop complexe, risque de nuire à l'expérience sans soin particulier)
- Sons différents par type de brique ou par power-up individuel
- Réglage du volume (on/off suffit)

### Notes design
- AC-03 est non négociable : Chrome bloque les `AudioContext` créés avant interaction. L'ignorer cause une erreur silencieuse qui fait croire que l'audio fonctionne alors qu'il ne produit rien.
- Les formes d'onde "carré" et "triangle" sont délibérées : elles sonnent 8-bit et renforcent l'ambiance rétro sans effort de design sonore.

---

---

## Hors scope v4 — Candidats v5

### Éditeur de niveaux

Permettre aux joueurs de créer et partager leurs propres niveaux directement dans le navigateur.

**Prérequis techniques à préparer dès la v4 :**
- Les niveaux doivent être définis dans une structure déclarative (ex. JSON) et non hard-codés — l'éditeur produit ce même format
- `brickTypes[r][c]` doit utiliser un schéma extensible dès v4 (`{ type, hits }`) pour éviter un refactoring en v5

**Scope envisagé :**
- Grille cliquable pour placer / effacer des briques
- Sélecteur de type : normale, multi-hit (×2, ×3), explosive
- Export / import JSON via localStorage ou copier-coller
- Bouton "Tester ce niveau" qui charge la grille directement en partie

**Hors scope v5 :**
- Classement en ligne des niveaux partagés (nécessite un backend)
- Éditeur de power-ups ou de paramètres physiques

---

## Ordre de développement v5 — Éditeur de niveaux

**Objectif :** permettre aux joueurs de créer, sauvegarder et rejouer leurs propres niveaux directement dans le navigateur, en réutilisant `buildLevelGrid()` (US-24) qui supporte déjà les layouts fixes via les codes `N` / `E` / `2` / `3` / `null`.

| # | User Story | Statut |
|---|-----------|--------|
| US-27 | Éditeur — accès, état et navigation | ⬜ À faire |
| US-28 | Grille d'édition interactive (placer / effacer) | ⬜ À faire |
| US-29 | Palette de types de briques | ⬜ À faire |
| US-30 | Métadonnées & validation du niveau | ⬜ À faire |
| US-31 | Tester le niveau depuis l'éditeur | ⬜ À faire |
| US-32 | Sauvegarde locale & bibliothèque de niveaux | ⬜ À faire |
| US-33 | Export / Import JSON | ⬜ À faire |
| US-34 | Jouer ses niveaux personnalisés | ⬜ À faire |

---

## US-27 · Éditeur — accès, état et navigation

**En tant que** joueur, **je veux** ouvrir un éditeur de niveaux depuis le menu **afin de** créer mes propres grilles sans quitter le jeu.

**Dépendances :** US-08, US-24

### Acceptance Criteria

- AC-01 — Un nouvel état `'editor'` est ajouté à la machine d'états du jeu. Il est mutuellement exclusif avec `'playing'`, `'start'`, etc.
- AC-02 — L'écran de démarrage affiche un label `[E] ÉDITEUR` et la touche `E` ouvre l'éditeur. Sur mobile, un bouton `ÉDITEUR` est affiché sur l'écran start.
- AC-03 — L'état de l'éditeur est porté par `state.editor = { grid, toolType, levelName, dirty }` où `grid[r][c]` est un code de layout (`null` | `'N'` | `'E'` | `'2'` | `'3'`), dimensions `BRICK_ROWS × BRICK_COLS`.
- AC-04 — À l'ouverture, `state.editor.grid` est initialisée vide (toutes cellules `null`), sauf si un niveau est en cours d'édition (chargé depuis la bibliothèque, US-32).
- AC-05 — Un bouton / touche `Échap` (ou `[M] MENU`) revient à l'écran de démarrage. Si `dirty === true` (modifs non sauvegardées), une confirmation est demandée avant de quitter.
- AC-06 — La boucle de jeu (`update`) n'exécute aucune physique de balle en état `'editor'` ; seul le rendu et les interactions d'édition sont actifs.
- AC-07 — Le HUD de jeu (score, vies, combo) est masqué en mode éditeur ; un bandeau d'édition le remplace (nom du niveau + outil actif).

### Hors scope
- Édition collaborative ou multi-utilisateur
- Annuler / refaire (undo/redo) — candidat à une story dédiée

### Notes design
- Réutiliser le schéma de codes de `brickFromLayoutCode()` (game-core.js) garantit que la grille produite par l'éditeur est directement consommable par `buildLevelGrid()` sans conversion.

---

## US-28 · Grille d'édition interactive (placer / effacer)

**En tant que** créateur, **je veux** cliquer sur la grille pour placer ou effacer des briques **afin de** dessiner la disposition de mon niveau.

**Dépendances :** US-27

### Acceptance Criteria

- AC-01 — La grille `BRICK_ROWS × BRICK_COLS` est rendue sur le canvas aux mêmes positions que les briques en jeu (`BRICK_OFFSET_X/Y`, `BRICK_WIDTH/HEIGHT`, `BRICK_GAP`), avec un quadrillage léger sur les cellules vides.
- AC-02 — Un clic gauche sur une cellule vide y place une brique du type d'outil actif (US-29). Un clic sur une cellule occupée par le même type l'efface (toggle).
- AC-03 — Le glisser-déposer (clic maintenu + déplacement) peint en continu sur les cellules survolées, sans repasser deux fois sur la même cellule dans un même geste.
- AC-04 — La cellule survolée par la souris est mise en évidence (contour) avec un aperçu translucide de la brique qui serait posée.
- AC-05 — Le support tactile permet de peindre au doigt (tap + glissé), avec `touch-action: none` pour éviter le scroll.
- AC-06 — Toute modification de la grille passe `state.editor.dirty = true`.
- AC-07 — La conversion coordonnées écran → indices `(row, col)` gère le scaling CSS du canvas (comme `mousemove` en jeu).

### Hors scope
- Sélection rectangulaire / copier-coller de zones
- Remplissage par seau (flood fill)

### Notes design
- AC-03 (dédoublonnage par geste) évite l'effet « clignotement » où un glissé sur une cellule la pose puis l'efface en boucle.

---

## US-29 · Palette de types de briques

**En tant que** créateur, **je veux** choisir le type de brique à placer **afin de** composer des niveaux variés.

**Dépendances :** US-28, US-23

### Acceptance Criteria

- AC-01 — Une palette affiche les outils : `Normale`, `Résistante ×2`, `Blindée ×3`, `Explosive`, et `Gomme`. Chaque outil utilise le même rendu visuel que la brique correspondante en jeu (couleur de rangée, marqueur explosif `✸`, label de hits).
- AC-02 — L'outil actif est mis en évidence (contour / fond). Par défaut `Normale` est sélectionné à l'ouverture.
- AC-03 — Sélectionner un outil met à jour `state.editor.toolType` (`'N'` | `'2'` | `'3'` | `'E'` | `null` pour la gomme).
- AC-04 — Des raccourcis clavier sélectionnent les outils : `1`=Normale, `2`=×2, `3`=×3, `4`=Explosive, `0`/`G`=Gomme.
- AC-05 — La gomme (`null`) efface la cellule cliquée quel que soit son type.
- AC-06 — La palette est accessible et lisible sur mobile (boutons assez grands, `@media (pointer: coarse)`).

### Hors scope
- Types de briques inédits non présents en jeu
- Outil « pipette » (récupérer le type d'une cellule existante)

### Notes design
- La couleur d'une brique en jeu dépend de sa **rangée** (`ROW_COLORS[r]`), pas de son type. Dans l'éditeur, conserver ce comportement : le type définit l'icône/marqueur, la rangée définit la couleur.

---

## US-30 · Métadonnées & validation du niveau

**En tant que** créateur, **je veux** nommer mon niveau et savoir s'il est jouable **afin d'**éviter de sauvegarder un niveau vide ou impossible.

**Dépendances :** US-28

### Acceptance Criteria

- AC-01 — Un champ permet de saisir / modifier `state.editor.levelName` (1 à 24 caractères). Nom par défaut : `Sans titre`.
- AC-02 — La fonction `validateEditorGrid(grid)` (dans `game-core.js`, pure et testable) retourne `{ valid: boolean, reason: string|null }`.
- AC-03 — Règles de validation : au moins 1 brique placée (`reason: 'empty'`) ; le nom n'est pas vide (`reason: 'noname'`).
- AC-04 — Les actions `Tester` (US-31), `Sauvegarder` (US-32) et `Exporter` (US-33) sont désactivées tant que `valid === false`, avec un message expliquant la raison.
- AC-05 — Un compteur affiche le nombre de briques placées et la répartition par type.

### Hors scope
- Vérification de la « solvabilité » réelle du niveau (qu'il soit terminable) — hors de portée sans simulation
- Limite maximale de briques

### Notes design
- `validateEditorGrid` est volontairement minimale : on empêche les cas absurdes (vide, sans nom) sans bloquer la créativité. La solvabilité reste de la responsabilité du créateur.

---

## US-31 · Tester le niveau depuis l'éditeur

**En tant que** créateur, **je veux** jouer mon niveau en un clic **afin de** vérifier qu'il est amusant avant de le sauvegarder.

**Dépendances :** US-28, US-24

### Acceptance Criteria

- AC-01 — Un bouton `▶ TESTER` (touche `T`) lance une partie sur la grille en cours d'édition, uniquement si la grille est valide (US-30).
- AC-02 — La partie de test est construite via `buildLevelGrid({ layout: state.editor.grid, ... })` avec les chances procédurales à 0 (le layout fixe fait foi). Vitesse balle : `ballSpeedMult: 1.0`.
- AC-03 — En fin de partie de test (victoire, game over) ou via `Échap`, le jeu **revient à l'éditeur** avec la grille intacte — et non à l'écran de démarrage.
- AC-04 — Le score / high score n'est **pas** enregistré pour une partie de test (les niveaux custom ne polluent pas le leaderboard officiel).
- AC-05 — Un indicateur visuel (`MODE TEST`) est affiché pendant la partie de test pour la distinguer d'une partie normale.

### Hors scope
- Statistiques de test (temps, nombre de coups)
- Rejouer automatiquement en boucle

### Notes design
- Mémoriser l'état d'origine (`'editor'`) dans une variable type `returnState` pour que la fin de partie sache où revenir. Évite de dupliquer la logique de transition.

---

## US-32 · Sauvegarde locale & bibliothèque de niveaux

**En tant que** créateur, **je veux** sauvegarder mes niveaux et les retrouver plus tard **afin de** constituer ma collection.

**Dépendances :** US-30, US-22

### Acceptance Criteria

- AC-01 — Les niveaux sont persistés dans `localStorage` sous la clé `breakout_custom_levels`, sous forme d'un tableau d'objets `{ id: string, name: string, grid: Array, createdAt: number, updatedAt: number }`.
- AC-02 — `Sauvegarder` enregistre le niveau courant : création si nouveau (`id` généré), mise à jour si édition d'un niveau existant. `dirty` repasse à `false`.
- AC-03 — Une bibliothèque (accessible depuis l'éditeur et l'écran start) liste les niveaux sauvegardés : nom, date, nombre de briques.
- AC-04 — Depuis la bibliothèque : `Charger` ouvre le niveau dans l'éditeur, `Renommer` change le nom, `Supprimer` retire le niveau (avec confirmation).
- AC-05 — Les fonctions de persistance (`loadCustomLevels`, `saveCustomLevels`, `upsertCustomLevel`, `deleteCustomLevel`) gèrent silencieusement l'indisponibilité de `localStorage` (navigation privée) sans planter.
- AC-06 — `upsertCustomLevel(levels, entry)` est pure et testable (retourne un nouveau tableau, ne mute pas l'entrée).
- AC-07 — Si la bibliothèque est vide, un message invite à créer un premier niveau.

### Hors scope
- Dossiers / tags / recherche dans la bibliothèque
- Synchronisation cloud (nécessite un backend)
- Limite de quota explicite (au-delà de la limite naturelle de localStorage)

### Notes design
- Réutiliser le pattern de `highscore.js` (try/catch autour de `localStorage`, fallback silencieux) pour la cohérence.
- `id` : un timestamp + suffixe aléatoire suffit ; pas besoin d'UUID complet.

---

## US-33 · Export / Import JSON

**En tant que** créateur, **je veux** exporter et importer un niveau en JSON **afin de** le sauvegarder hors du navigateur ou le partager avec un autre joueur.

**Dépendances :** US-32

### Acceptance Criteria

- AC-01 — `Exporter` produit un fichier `.json` téléchargeable contenant `{ name, grid, version: 1 }`. Le nom de fichier dérive du nom du niveau (assaini).
- AC-02 — Un bouton `Copier` met le JSON du niveau dans le presse-papier (alternative au téléchargement).
- AC-03 — `Importer` accepte un fichier `.json` (input file) **ou** un collage de texte JSON, et charge le niveau dans l'éditeur.
- AC-04 — `parseLevelJSON(text)` (pure, testable) valide le schéma : présence de `name` et `grid`, dimensions correctes, codes de cellule valides (`null` | `'N'` | `'E'` | `'2'` | `'3'`). Retourne `{ ok, level, error }`.
- AC-05 — Un import invalide (JSON malformé, mauvais schéma, dimensions incorrectes) affiche un message d'erreur clair sans corrompre l'éditeur en cours.
- AC-06 — Un niveau importé n'est **pas** automatiquement sauvegardé : il s'ouvre dans l'éditeur, l'utilisateur décide de le sauvegarder (US-32).
- AC-07 — Le champ `version` permet une future évolution de format sans casser les imports anciens.

### Hors scope
- Codes courts partageables (encodage compact type base64) — possible évolution
- Import de plusieurs niveaux en une fois (batch)

### Notes design
- Valider les dimensions à l'import est critique : `buildLevelGrid` dérive `rows/cols` du layout, mais le reste du moteur suppose `BRICK_ROWS × BRICK_COLS`. Rejeter les grilles non conformes.

---

## US-34 · Jouer ses niveaux personnalisés

**En tant que** joueur, **je veux** lancer un niveau que j'ai créé depuis le menu **afin de** y jouer comme un niveau normal.

**Dépendances :** US-32, US-24

### Acceptance Criteria

- AC-01 — Depuis l'écran de démarrage (ou la bibliothèque), sélectionner un niveau custom lance une vraie partie sur ce niveau.
- AC-02 — La partie réutilise toute la boucle de jeu existante : balle, raquette, power-ups, multiplicateurs de score, vies.
- AC-03 — Le niveau custom est un **niveau unique** (pas de progression multi-niveaux US-24) : la victoire affiche `YOU WIN !`, le game over affiche `GAME OVER`, puis retour à la bibliothèque.
- AC-04 — Le HUD affiche le nom du niveau custom à la place de `LV N`.
- AC-05 — Le high score officiel n'est pas impacté par les parties sur niveaux custom (leaderboard séparé ou désactivé pour le custom — à trancher au design).
- AC-06 — Si le niveau a été supprimé entre-temps, un message d'erreur renvoie à la bibliothèque sans planter.

### Hors scope
- Enchaînement de plusieurs niveaux custom en « campagne »
- Leaderboard par niveau custom

### Notes design
- AC-05 : garder le leaderboard officiel propre est important pour la crédibilité des scores. Un leaderboard local par niveau custom est un candidat d'évolution, pas un prérequis.

---
