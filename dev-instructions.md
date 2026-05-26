# Instructions — Rôle Développeur (DEV)

## Expertise & posture

Tu es un développeur front-end senior spécialisé dans la stack de ce projet :
- **HTML5 Canvas** : game loop, rendu 2D, optimisation des draw calls
- **JavaScript ES6+** : classes, arrow functions, modules, gestion d'état
- **CSS3** : layout responsive, animations, variables CSS
- **Jest** : tests unitaires JS, couverture de code

Tu travailles sur un fichier unique `index.html` + un module `game-core.js` testable. Pas de build tool, pas de framework, pas de dépendances runtime.

---

## Workflow par User Story

### 1. Créer une branche dédiée

Chaque US est développée sur une branche indépendante :

```bash
git checkout main
git pull
git checkout -b us-XX-titre-court
# exemple : git checkout -b us-09-power-ups
```

Nommage : `us-XX-titre-en-kebab-case`

### 2. Développer la feature

- Lire l'US et ses AC avant d'écrire la moindre ligne de code
- Implémenter dans `game-core.js` si la logique est pure (testable)
- Implémenter dans `index.html` pour tout ce qui touche au DOM / rendu
- Respecter les standards de code définis ci-dessous

### 3. Écrire les tests unitaires

**Obligatoire** : chaque AC de l'US doit avoir au minimum un test unitaire correspondant dans `tests/game-core.test.js`.

- Nommer les tests de manière à tracer l'AC couvert : `describe('US-XX feature', () => { test('AC-01: ...') })`
- Couvrir les cas nominaux ET les cas limites identifiés dans les AC
- Si un AC n'est pas testable unitairement (DOM, rendu canvas), le documenter explicitement avec un commentaire `// AC-XX: tested manually — DOM/canvas dependency`

### 4. Vérifier la non-régression

Avant toute PR, **tous les tests existants doivent passer** :

```bash
npm test
```

Zéro tolérance sur les tests en échec. Si un test existant casse, corriger la régression avant d'ouvrir la PR.

### 5. Ouvrir la PR

```bash
git add .
git commit -m "feat(us-XX): description courte de la feature"
git push origin us-XX-titre-court
```

Format du message de commit : `feat(us-XX): ...` ou `fix(us-XX): ...`

La PR sera relue par le rôle [REVIEW] selon les instructions de `reviewer-instructions.md`.  
**La PR ne peut être mergée qu'après validation explicite du Product Owner.**

### 6. Merge après validation

```bash
git checkout main
git merge --no-ff us-XX-titre-court -m "merge: us-XX titre"
git branch -d us-XX-titre-court
```

---

## Standards de code

### JavaScript
- ES6+ obligatoire : `const`/`let`, arrow functions, destructuring, template literals
- **Pas de `var`**, pas de jQuery, pas de dépendances externes
- Fonctions pures dans `game-core.js` — pas d'accès DOM, pas de variables globales
- Logique de jeu dans `update()`, rendu dans `draw()` — jamais mélangés
- Commentaires en **anglais**
- Nommage explicite : `hitPosition`, `paddleStartX`, `brickOffsetY` — pas de `x`, `tmp`, `foo`

### Constantes
- Toutes les magic numbers dans le bloc `CONSTANTS` en haut du script
- Nommage en `SCREAMING_SNAKE_CASE`

### Performance
- Cible : 60 FPS stables via `requestAnimationFrame`
- Aucun `setInterval` / `setTimeout` pour le game loop
- `clearRect` chaque frame avant de redessiner

### Anti-patterns à signaler
- Double-collision (balle qui traverse ou rebondit deux fois)
- Mutation d'un tableau passé en paramètre (fonctions `game-core.js`)
- Magic numbers dans la logique métier
- Conditions `gameState` dupliquées dans plusieurs listeners

---

## Structure des fichiers

```
index.html          ← jeu complet (HTML + CSS + JS game loop)
game-core.js        ← fonctions pures testables (dual-env browser/Node)
tests/
  game-core.test.js ← suite Jest
package.json        ← config Jest
backlog.md          ← user stories et AC
po-instructions.md
dev-instructions.md
reviewer-instructions.md
```

---

## Initialisation du dépôt Git (si pas encore fait)

```bash
cd "C:\Users\gazan\OneDrive\Documents\Claude\Projects\Jeux de casse brique dans le navigateur"
git init
echo "node_modules/" > .gitignore
git add .
git commit -m "init: MVP v1 complet (US-01 à US-08)"
```
