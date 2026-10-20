# Spécifications – binôme 11

## Contexte
Les utilisateurs qui déclarent un incident ont besoin d'un outil simple pour créer un ticket, retrouver leurs tickets et voir s'ils sont en retard. L'outil s'appuie sur le socle Mantis-lite (liste de tickets existante).

## Fonctionnalités retenues

### F1 – Création de ticket (formulaire)
- Besoin : déclarer un incident via un formulaire en français depuis l'application.
- Critères d'acceptation :
  - [x] Le formulaire demande projet, catégorie, priorité, résumé et description, avec des champs obligatoires signalés.
  - [x] Un résumé ou une description vide affiche le message d'erreur renvoyé par l'API.
  - [x] Après validation, le ticket apparaît en tête de la liste avec le statut « Nouveau ».
- API : API existante, `POST /api/tickets` et `GET /api/meta` (projets, catégories, priorités).

### F2 – Filtres et recherche
- Besoin : retrouver rapidement un ticket dans la liste.
- Critères d'acceptation :
  - [ ] Une zone de recherche filtre la liste sur le résumé.
  - [ ] Des listes déroulantes filtrent par projet et par statut.
  - [ ] Un bouton « Réinitialiser » rétablit la liste complète.
- API : API existante, `GET /api/tickets` (paramètres `q`, `project_id`, `status`).

### F3 – Échéances et retards (SLA)
- Besoin : voir l'échéance de chaque ticket et repérer ceux en retard.
- Critères d'acceptation :
  - [ ] Un ticket créé reçoit une échéance selon sa priorité (Urgente : 4 h, Élevée : 1 jour, Normale : 3 jours, Basse : 7 jours).
  - [ ] La liste affiche l'échéance, et un badge rouge « En retard » apparaît pour les tickets non résolus dont l'échéance est dépassée.
  - [ ] Un filtre « En retard » n'affiche que ces tickets.
- API : modification minimale.
  - `ticket_create` calcule `due_date` selon la priorité quand il n'est pas fourni (le champ `due_date` existe déjà).
  - `GET /api/tickets` : nouveau filtre `overdue=1` (`due_date < maintenant` et `status < STATUS_RESOLVED`).
  - Un test de fumée pour chaque nouvelle règle.

## Hors périmètre
- Tableau de bord (compteurs), kanban, export CSV.
- Fiche ticket détaillée et ajout de notes.
- Affectation et changement de statut depuis l'interface.
- Authentification (l'utilisateur est fixé par le socle).
- Notifications et délais SLA paramétrables.

## Écrans
Maquette : `public/maquette.html`.

| Écran | Adresse | Existant / nouveau | Fonctionnalité | Route d'API |
|---|---|---|---|---|
| Liste des tickets (filtres, colonne Échéance, badge « En retard », bouton « Nouveau ticket ») | `#/` | Existant, modifié | F2, F3 | `GET /api/tickets` (`q`, `project_id`, `status`, `overdue`) |
| Nouveau ticket (formulaire, échéance indicative selon la priorité) | `#/nouveau` | Nouveau | F1, F3 | `GET /api/meta`, `POST /api/tickets` |
