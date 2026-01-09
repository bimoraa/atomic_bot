#!/bin/bash
# Fix all import paths based on directory depth

cd /Users/hillaryabigail/Documents/maxime_/src

# Find all TypeScript files and fix paths based on their location
find . -name "*.ts" | while read file; do
  depth=$(echo "$file" | tr -cd '/' | wc -c)
  
  case "$file" in
    ./index.ts)
      # Root level: ./
      sed -i '' -e 's|from "./types/|from "./shared/types/|g' \
                -e 's|from "./utils"|from "./shared/utils"|g' \
                -e 's|from "./handlers/|from "./core/handlers/|g' \
                -e 's|from "./events/|from "./core/handlers/|g' \
                -e 's|from "./server"|from "./core/client/server"|g' \
                -e 's|from "./services/afk"|from "./infrastructure/cache/afk"|g' \
                -e 's|from "./services/anti_spam"|from "./infrastructure/cache/anti_spam"|g' \
                -e 's|from "./services/snipe"|from "./infrastructure/cache/snipe"|g' \
                -e 's|from "./services/message_counter"|from "./infrastructure/cache/message_counter"|g' \
                -e 's|from "./services/luarmor"|from "./infrastructure/api/luarmor"|g' \
                -e 's|from "./services/service_provider_cache"|from "./infrastructure/api/service_provider_cache"|g' \
                -e 's|from "./services/|from "./shared/database/|g' \
                -e 's|from "./commands/tools/|from "./modules/|g' "$file"
      ;;
    ./core/handlers/*.ts)
      # core/handlers/xxx.ts -> depth 2
      sed -i '' -e 's|from "\.\./index"|from "../.."|g' \
                -e 's|from "\.\./shared/|from "../../shared/|g' \
                -e 's|from "\.\./modules/|from "../../modules/|g' \
                -e 's|from "\.\./infrastructure/|from "../../infrastructure/|g' "$file"
      ;;
    ./core/handlers/*/*.ts)
      # core/handlers/xxx/yyy.ts -> depth 3
      sed -i '' -e 's|from "\.\./\.\./\.\./index"|from "../../.."|g' \
                -e 's|from "\.\./\.\./shared/|from "../../../shared/|g' \
                -e 's|from "\.\./\.\./modules/|from "../../../modules/|g' \
                -e 's|from "\.\./\.\./infrastructure/|from "../../../infrastructure/|g' "$file"
      ;;
    ./core/handlers/*/*/*.ts)
      # core/handlers/xxx/yyy/zzz.ts -> depth 4
      sed -i '' -e 's|from "\.\./\.\./\.\./\.\./shared/|from "../../../../shared/|g' \
                -e 's|from "\.\./\.\./\.\./\.\./infrastructure/|from "../../../../infrastructure/|g' \
                -e 's|from "\.\./\.\./\.\./\.\./modules/|from "../../../../modules/|g' "$file"
      ;;
    ./modules/*.ts)
      # modules/xxx.ts -> depth 1
      sed -i '' -e 's|from "\.\./shared/|from "../shared/|g' \
                -e 's|from "\.\./core/|from "../core/|g" \
                -e 's|from "\.\./infrastructure/|from "../infrastructure/|g' "$file"
      ;;
    ./modules/*/*.ts)
      # modules/xxx/yyy.ts -> depth 2
      sed -i '' -e 's|from "\.\./\.\./shared/|from "../../shared/|g' \
                -e 's|from "\.\./\.\./core/|from "../../core/|g' \
                -e 's|from "\.\./\.\./infrastructure/|from "../../infrastructure/|g' "$file"
      ;;
    ./modules/*/*/*.ts)
      # modules/xxx/yyy/zzz.ts -> depth 3
      sed -i '' -e 's|from "\.\./\.\./\.\./shared/|from "../../../shared/|g' \
                -e 's|from "\.\./\.\./\.\./core/|from "../../../core/|g' \
                -e 's|from "\.\./\.\./\.\./infrastructure/|from "../../../infrastructure/|g' "$file"
      ;;
    ./infrastructure/*/*.ts)
      # infrastructure/xxx/yyy.ts -> depth 2
      sed -i '' -e 's|from "\.\./\.\./shared/|from "../../shared/|g' "$file"
      ;;
    ./shared/*/*.ts)
      # shared/xxx/yyy.ts -> depth 2
      sed -i '' -e 's|from "\.\./infrastructure/|from "../../infrastructure/|g' \
                -e 's|from "\.\./\.\./infrastructure/|from "../../infrastructure/|g' "$file"
      ;;
    esac
done

echo "Path fixes completed!"
