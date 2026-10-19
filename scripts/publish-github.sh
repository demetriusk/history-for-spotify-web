#!/bin/sh
# Run from a normal terminal after reviewing the public files.
set -eu
cd "$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)"
repo='demetriusk/history-for-spotify-web'

python3 scripts/build.py
python3 scripts/check.py
node --check extension/history.js
node --check extension/popup.js

login=$(gh api user --jq .login)
if [ "$login" != 'demetriusk' ]; then
  echo 'GitHub must be signed in as demetriusk.' >&2
  exit 1
fi
account_id=$(gh api user --jq .id)
if [ ! -d .git ]; then
  git init -b main
fi
git config user.name demetriusk
git config user.email "${account_id}+demetriusk@users.noreply.github.com"
if git remote get-url origin >/dev/null 2>&1; then
  remote=$(git remote get-url origin)
  case "$remote" in
    "https://github.com/$repo"|"https://github.com/$repo.git"|"git@github.com:$repo.git") ;;
    *) echo 'Existing origin points to another repository. No files were pushed.' >&2; exit 1 ;;
  esac
fi

git add .gitignore .github README.md PRIVACY.md LICENSE CONTRIBUTING.md SECURITY.md package.json \
  spotify-queue-history.user.js 'Spotify Web - Queue History-0.1.0.txt' extension scripts tests assets store docs
if ! git diff --cached --quiet; then
  git commit -m 'Add toolbar history popup and update extension copy'
fi
if gh repo view "$repo" --json nameWithOwner >/dev/null 2>&1; then
  visibility=$(gh repo view "$repo" --json visibility --jq .visibility)
  if [ "$visibility" != 'PUBLIC' ]; then
    echo 'A private repository already uses this name. No files were pushed or made public.' >&2
    exit 1
  fi
else
  gh repo create "$repo" --public --description 'Local listening history for Spotify’s web player. Search tracks, copy links, and queue them again.'
fi
if ! git remote get-url origin >/dev/null 2>&1; then
  git remote add origin "https://github.com/$repo.git"
fi
git -c 'credential.helper=!gh auth git-credential' push -u origin HEAD:main
if ! gh release view v0.3.2 --repo "$repo" >/dev/null 2>&1; then
  gh release create v0.3.2 dist/history-for-spotify-web-0.3.2.zip --repo "$repo" \
    --title 'History for Spotify Web 0.3.2' --notes-file docs/RELEASE-NOTES.md
fi
printf 'Repository: https://github.com/%s\n' "$repo"
