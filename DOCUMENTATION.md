# Documentation – outil de ticketing (binôme 11)

## Présentation

Cet outil s'adresse aux utilisateurs qui déclarent un incident informatique.
Ils créent un ticket, retrouvent leurs tickets et voient ceux qui sont en retard.
Il s'appuie sur le socle Mantis-lite : API PHP, base SQLite, interface Vue 3 et Bootstrap 5.

## Fonctionnalités

### F1 – Création de ticket
1. Cliquez sur **Nouveau ticket** (menu ou bouton de la liste). L'écran `#/nouveau` s'ouvre.
2. Choisissez le projet, puis la catégorie. Les catégories dépendent du projet.
3. Choisissez la priorité. L'échéance prévue s'affiche à côté.
4. Saisissez le résumé (128 caractères au maximum) et la description. Ces deux champs sont obligatoires, comme le projet.
5. Cliquez sur **Créer le ticket**. Le ticket apparaît en tête de la liste au statut « Nouveau ».

Si un champ obligatoire manque, le message d'erreur de l'API s'affiche au-dessus du formulaire.

### F2 – Filtres et recherche
1. Sur la liste (`#/`), tapez un mot dans **Recherche**. La liste se filtre sur le résumé.
2. Choisissez un **projet** et/ou un **statut** dans les listes déroulantes.
3. Cliquez sur **Réinitialiser** pour retrouver la liste complète.

Les filtres se combinent. Si rien ne correspond, la liste affiche « Aucun ticket ne correspond. »

### F3 – Échéances et retards (SLA)
- À la création, chaque ticket reçoit une échéance selon sa priorité :

  | Priorité | Délai |
  |---|---|
  | Immédiate | 1 h |
  | Urgente | 4 h |
  | Élevée | 1 jour |
  | Normale | 3 jours |
  | Basse | 7 jours |

- La colonne **Échéance** de la liste affiche la date limite.
- Un badge rouge **En retard** signale un ticket non résolu dont l'échéance est dépassée.
- L'interrupteur **En retard seulement** n'affiche que ces tickets.

## API

| Méthode | Chemin | Rôle |
|---|---|---|
| GET | `/api/meta` | Listes de valeurs, projets, catégories, utilisateurs |
| GET | `/api/tickets` | Liste filtrée : `project_id`, `status`, `handler_id`, `q`, **`overdue=1`** (ajouté) |
| POST | `/api/tickets` | Création. **Calcule l'échéance selon la priorité** si `due_date` est absent (ajouté) |
| GET | `/api/tickets/{id}` | Fiche complète |
| PATCH | `/api/tickets/{id}` | Modification partielle |
| DELETE | `/api/tickets/{id}` | Suppression |
| POST | `/api/tickets/{id}/notes` | Ajout d'une note |

Les erreurs ont le format `{"erreur": "..."}` avec le code HTTP adapté (422, 404…).
Les délais SLA sont définis dans la constante `SLA_DELAIS` de `src/api.php`.

## Lancer le projet

| Système | Serveur | Tests |
|---|---|---|
| Windows (Git Bash) | `outils/php/php.exe outils/serveur.php` | `outils/php/php.exe outils/tests/smoke.php` |
| macOS / Linux | `php outils/serveur.php` | `php outils/tests/smoke.php` |

Ouvrez ensuite http://127.0.0.1:8000.
Pour repartir des données de démonstration, supprimez `data/mantis.sqlite`. La base se recrée au prochain appel.

## Tests

La commande de tests de fumée exécute **31 tests** sur une base temporaire.
Neuf tests couvrent les règles ajoutées : échéance par défaut pour chaque priorité, échéance fournie conservée, filtre `overdue`.

## Limites connues

- L'échéance affichée dans le formulaire est indicative. Le serveur fixe l'échéance réelle.
- Les délais SLA ne sont pas paramétrables.
- Pas de fiche ticket détaillée, de notes, d'affectation ni de changement de statut dans l'interface.
- Pas de tableau de bord, de kanban ni d'export CSV.
- Pas d'authentification : l'utilisateur est fixé par le socle.
- La recherche porte uniquement sur le résumé.
