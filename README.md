## Ce qui a été refactorisé

**1. Déplacement de la logique métier hors du contrôleur**

Le contrôleur contenait toute la logique des types de produits mélangée avec les appels base de données et les conditions. Maintenant il appelle juste le service et le laisse tout gérer.

**2. Single Responsibility Principle (SRP)**

Création de méthodes séparées dans ProductService pour chaque type de produit:

- `processProductOrder()` : point d'entrée principal
- `processNormalProduct()` : gère les produits NORMAL
- `processSeasonalProduct()` : gère les produits SEASONAL
- `processExpirableProduct()` : gère les produits EXPIRABLE
- `decrementStock()` : code dupliqué extrait

Chaque méthode fait une chose et la fait bien.

**3. Meilleur nommage**

Changement des noms courts en noms significatifs:

- `db` vers `database`
- `ps` vers `productService`
- `ns` vers `notificationService`
- `p` vers `product`

**4. Nettoyage du code**

- Suppression de `console.log`
- Suppression des variables inutilisées
- Ajout de constantes de temps (ONE_DAY) au lieu de nombres magiques
- Simplification du check env prod sur drizzle.plugin.ts

### Tests ajoutés

**Tests unitaires** (src/services/impl/product.service.spec.ts):

- Produits NORMAL: décrémenter le stock quand disponible
- Produits NORMAL: notifier le délai quand en rupture de stock
- Produits NORMAL: ne rien faire quand leadTime est 0
- Produits SEASONAL: décrémenter le stock quand en saison
- Produits SEASONAL: notifier rupture de stock quand hors saison
- Produits EXPIRABLE: décrémenter le stock quand non expiré
- Produits EXPIRABLE: notifier expiration et mettre available à 0 quand expiré

Tous les tests suivent le pattern GIVEN/WHEN/THEN et couvrent les cas métier de la spec.

**Test d'intégration** je n'ai pas eu le temps de travailler dessus et de le corriger.

---

### Consignes JS:

- Si probleme de version pnpm, utiliser `corepack enable pnpm` qui devrait automatiquement utiliser la bonne version
- Ne pas modifier les classes qui ont un commentaire: `// WARN: Should not be changed during the exercise
`
- Pour lancer les tests: `pnpm test`
  - integration only in watch mode `pnpm test:integration`
  - unit only in watch mode `pnpm test:unit`
