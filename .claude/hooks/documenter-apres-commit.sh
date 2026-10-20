#!/usr/bin/env bash
# Après un `git commit` réussi sur une branche equipe-*, demande à Claude de lancer /documenter.
# Claude Code exécute ce hook après chaque commande Bash réussie (voir .claude/settings.json, PostToolUse).
# Le hook ne lance pas le skill lui-même : il renvoie une consigne à Claude (additionalContext).

entree=$(cat)

# Extrait le champ "command" du JSON reçu sur l'entrée standard.
commande=$(printf '%s' "$entree" | sed -nE 's/.*"command"[[:space:]]*:[[:space:]]*"(([^"\\]|\\.)*)".*/\1/p')

# Seulement une vraie commande `git commit`
printf '%s' "$commande" | grep -Eq '(^|[;&|[:space:]])git[[:space:]]+commit([[:space:]]|$)' || exit 0

depot="${CLAUDE_PROJECT_DIR:-.}"

# Seulement les branches d'équipe (equipe-*)
case "$(git -C "$depot" symbolic-ref --short -q HEAD 2>/dev/null)" in equipe-*) ;; *) exit 0 ;; esac

# Pas de boucle : le commit de /documenter ne touche que DOCUMENTATION.md
fichiers=$(git -C "$depot" show --name-only --format= HEAD 2>/dev/null)
[ "$fichiers" = "DOCUMENTATION.md" ] && exit 0
[ -z "$fichiers" ] && exit 0

cat <<'JSON'
{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"Un nouveau commit vient d'être fait sur la branche d'équipe. Lance maintenant le skill /documenter (outil Skill, skill « documenter ») pour mettre à jour DOCUMENTATION.md, puis reprends la tâche en cours."}}
JSON
exit 0
