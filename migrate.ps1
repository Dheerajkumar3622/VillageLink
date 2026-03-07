Move-Item -Path "types.ts" -Destination "shared\src\" -Force
Move-Item -Path "constants.ts" -Destination "shared\src\" -Force

Move-Item -Path "seed_real_data.js" -Destination "database\scripts\" -Force
Move-Item -Path "check_db.js" -Destination "database\scripts\" -Force
Move-Item -Path "test-db.js" -Destination "database\scripts\" -Force
Move-Item -Path "test-db-connection.js" -Destination "database\scripts\" -Force

Move-Item -Path "server.js" -Destination "backend\src\" -Force
Move-Item -Path "services" -Destination "backend\src\" -Force
Move-Item -Path "microservices" -Destination "backend\src\" -Force
Move-Item -Path "transportService.ts" -Destination "backend\src\" -Force
Move-Item -Path "graphService.ts" -Destination "backend\src\" -Force
Move-Item -Path "offlineService.ts" -Destination "backend\src\" -Force

Move-Item -Path "components" -Destination "frontend\" -Force
Move-Item -Path "src\*" -Destination "frontend\src\" -Force
Remove-Item -Path "src" -Force
Move-Item -Path "public" -Destination "frontend\" -Force
Move-Item -Path "android" -Destination "frontend\" -Force
Move-Item -Path "index.html" -Destination "frontend\" -Force
Move-Item -Path "index.css" -Destination "frontend\" -Force
Move-Item -Path "index.tsx" -Destination "frontend\" -Force
Move-Item -Path "vite.config.ts" -Destination "frontend\" -Force
Move-Item -Path "capacitor.config.ts" -Destination "frontend\" -Force
Move-Item -Path "tailwind.config.js" -Destination "frontend\" -Force
Move-Item -Path "postcss.config.js" -Destination "frontend\" -Force
