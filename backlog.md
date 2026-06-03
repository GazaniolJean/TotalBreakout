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
| US-09 | Système de power-ups — Infrastructure | 🔲 À faire |
| US-10 | Power-ups vitesse balle (Rapide & Lente) | 🔲 À faire |
| US-11 | Power-ups raquette (Large & Petite) | 🔲 À faire |
| US-12 | Multi-balle | 🔲 À faire |
| US-13 | Pénétration | 🔲 À faire |
| US-14 | Colle | 🔲 À faire |
| US-15 | +1 Vie | 🔲 À faire |
| US-16 | Briques explosives | 🔲 À faire |

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

## Hors scope v2 — Candidats v3

- Niveaux multiples
- Briques multi-hit
- High score persistant (localStorage)
- Son et musique
- Animations de destruction des briques
- Classement en ligne
